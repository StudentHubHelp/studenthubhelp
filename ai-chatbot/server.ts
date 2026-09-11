import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { DEFAULT_BOT_CONFIG } from './src/data/defaultConfig.ts';
import { BotConfig, LeadRecord, PropertyRecommendation, SentimentType, StudentBudgetPlan, ComparisonMatrix } from './src/types.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory runtime state for Leads and Config (can be modified live from UI)
let currentConfig: BotConfig = { ...DEFAULT_BOT_CONFIG };
let crmLeads: LeadRecord[] = [];

// Lazy Gemini client helper
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Regex to extract contact info
function extractLeadFromText(text: string): { name?: string; phone?: string; email?: string } {
  const phoneMatch = text.match(/(?:\+91[\-\s]?)?[6-9]\d{9}\b/);
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  
  // Try to find name if user says "mera naam X h" or "my name is X"
  let nameMatch = text.match(/(?:mera naam|my name is|naam|name)\s+([A-Za-z\u0900-\u097F]+(?:\s+[A-Za-z\u0900-\u097F]+)?)/i);
  let name = nameMatch ? nameMatch[1].trim() : undefined;

  return {
    phone: phoneMatch ? phoneMatch[0].replace(/\s+/g, '') : undefined,
    email: emailMatch ? emailMatch[0] : undefined,
    name,
  };
}

// Live Supabase property access. The server only exposes active public listings.
const PROPERTY_TABLES = [
  { table: 'hostels', type: 'hostel' },
  { table: 'tiffins', type: 'tiffin' },
  { table: 'libraries', type: 'library' },
  { table: 'cafes', type: 'cafe' },
  { table: 'bookstores', type: 'bookstore' }
] as const;

type LivePropertyRow = Record<string, any> & {
  id: string | number;
  name?: string;
  category?: string;
  area?: string;
  address?: string;
  phone?: string;
  whatsapp?: string;
  city?: string;
  rating?: string | number;
  image?: string;
  images?: string;
  verified?: boolean;
  status?: string;
  slug?: string;
  google_maps_url?: string;
  price?: number | string;
  monthly_fee?: number | string;
  monthly_rent?: number | string;
};

let livePropertiesCache: { data: PropertyRecommendation[]; expiresAt: number } | null = null;

function getSupabaseRestConfig() {
  const url = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || '';
  return { url, key };
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return undefined;
  const match = value.replace(/,/g, '').match(/\d+(?:\.\d+)?/);
  if (!match) return undefined;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : undefined;
}

function firstImage(row: LivePropertyRow): string | undefined {
  if (row.image) return String(row.image);
  if (row.images) {
    const first = String(row.images).split(/[,\n|]/).map(v => v.trim()).find(Boolean);
    return first || undefined;
  }
  return undefined;
}

function normalizeLiveProperty(row: LivePropertyRow, type: PropertyRecommendation['type'], table: string): PropertyRecommendation {
  const numericRating = toNumber(row.rating);
  const numericPrice = toNumber(row.price ?? row.monthly_fee ?? row.monthly_rent);
  const slug = String(row.slug || row.id);
  const detailsType = type;
  const textFields = [
    row.category, row.address, row.facilities, row.description, row.type,
    row.food_type, row.room_sharing, row.room_types, row.nearby_coaching,
    row.service_area, row.meal_type, row.plan_type, row.library_type,
    row.cuisine, row.price_range, row.classes, row.competitive_books,
    row.stationery, row.jain_food, row.home_delivery, row.wifi, row.ac,
    row.parking, row.open_24_hours, row.separate_cabin, row.girls_section,
    row.boys_section, row.power_backup, row.cctv, row.exam_books,
    row.school_books, row.college_books, row.ncert_books, row.description
  ].filter(v => v !== null && v !== undefined).map(String);

  return {
    id: String(row.id),
    name: String(row.name || `${type} listing`),
    type,
    area: String(row.area || row.service_area || ''),
    city: String(row.city || ''),
    price: numericPrice !== undefined ? `₹${numericPrice.toLocaleString('en-IN')}` : undefined,
    rating: numericRating,
    badge: row.verified === true ? 'Verified listing' : undefined,
    phone: row.phone || row.whatsapp ? String(row.phone || row.whatsapp) : undefined,
    image: firstImage(row),
    highlights: textFields.slice(0, 6),
    link: `property-details.html?type=${encodeURIComponent(detailsType)}&slug=${encodeURIComponent(slug)}`,
    mapsUrl: row.google_maps_url ? String(row.google_maps_url) : undefined,
    landmark: row.address ? String(row.address) : undefined,
    matchReason: `Live active listing from ${table}.`
  };
}

async function fetchLiveProperties(forceRefresh = false): Promise<PropertyRecommendation[]> {
  if (!forceRefresh && livePropertiesCache && livePropertiesCache.expiresAt > Date.now()) {
    return livePropertiesCache.data;
  }

  const { url, key } = getSupabaseRestConfig();
  if (!url || !key) {
    throw new Error('Supabase environment is not configured.');
  }

  const all: PropertyRecommendation[] = [];
  for (const source of PROPERTY_TABLES) {
    let offset = 0;
    const pageSize = 1000;
    while (true) {
      const endpoint = `${url}/rest/v1/${source.table}?select=*&status=eq.active&limit=${pageSize}&offset=${offset}`;
      const response = await fetch(endpoint, {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`
        }
      });
      if (!response.ok) {
        throw new Error(`Supabase ${source.table} request failed (${response.status}).`);
      }
      const rows = await response.json() as LivePropertyRow[];
      all.push(...rows.map(row => normalizeLiveProperty(row, source.type, source.table)));
      if (rows.length < pageSize) break;
      offset += pageSize;
    }
  }

  livePropertiesCache = { data: all, expiresAt: Date.now() + 30_000 };
  return all;
}

function parsePropertyPrice(property?: PropertyRecommendation): number | undefined {
  return toNumber(property?.price);
}

function chooseCheapest(list: PropertyRecommendation[], type: PropertyRecommendation['type'], city?: string) {
  return list
    .filter(p => p.type === type)
    .filter(p => !city || !p.city || p.city.toLowerCase().includes(city.toLowerCase()))
    .map(p => ({ p, n: parsePropertyPrice(p) }))
    .filter(x => x.n !== undefined)
    .sort((a, b) => (a.n! - b.n!))[0]?.p;
}

function generateBudgetPlan(targetBudget: number, city: string, _userMsg: string, properties: PropertyRecommendation[]): StudentBudgetPlan {
  const hostel = chooseCheapest(properties, 'hostel', city) || chooseCheapest(properties, 'hostel');
  const tiffin = chooseCheapest(properties, 'tiffin', city) || chooseCheapest(properties, 'tiffin');
  const library = chooseCheapest(properties, 'library', city) || chooseCheapest(properties, 'library');

  const rent = parsePropertyPrice(hostel) ?? 0;
  const food = parsePropertyPrice(tiffin) ?? 0;
  const libraryFee = parsePropertyPrice(library) ?? 0;
  const committed = rent + food + libraryFee;
  const remaining = Math.max(0, targetBudget - committed);
  const stationery = Math.round(remaining * 0.45);
  const misc = remaining - stationery;
  const totalEstimated = committed + stationery + misc;
  const diff = targetBudget - totalEstimated;

  const items = [
    { category: 'rent' as const, label: hostel ? `${hostel.name} — ${hostel.price || 'price not listed'}` : 'Active hostel matching your city', amount: rent, note: hostel ? `${hostel.area}${hostel.city ? `, ${hostel.city}` : ''}` : 'No priced active hostel found.' },
    { category: 'food' as const, label: tiffin ? `${tiffin.name} — ${tiffin.price || 'price not listed'}` : 'Active tiffin service matching your city', amount: food, note: tiffin ? `${tiffin.area}${tiffin.city ? `, ${tiffin.city}` : ''}` : 'No priced active tiffin found.' },
    { category: 'library' as const, label: library ? `${library.name} — ${library.price || 'price not listed'}` : 'Active library matching your city', amount: libraryFee, note: library ? `${library.area}${library.city ? `, ${library.city}` : ''}` : 'No priced active library found.' },
    { category: 'stationery' as const, label: 'Remaining budget allocation', amount: stationery, note: 'Flexible allocation from the remaining target budget; not a property price.' },
    { category: 'misc' as const, label: 'Remaining budget allocation', amount: misc, note: 'Flexible allocation from the remaining target budget; not a property price.' }
  ];

  return {
    targetBudget,
    city: city || 'Not specified',
    livingType: 'custom',
    items,
    totalEstimated,
    savingsOrOverrun: diff,
    status: diff > 300 ? 'under_budget' : diff < -300 ? 'over_budget' : 'balanced',
    savingsTips: [
      hostel ? `Compare active hostel listings before deciding: ${hostel.name} is currently one of the lowest priced matching records.` : 'No priced active hostel was found for this city.',
      tiffin ? `Compare active tiffin listings and meal plans before subscribing: ${tiffin.name} is one available low-price match.` : 'No priced active tiffin was found for this city.',
      library ? `Compare active library listings before booking: ${library.name} is one available low-price match.` : 'No priced active library was found for this city.'
    ],
    recommendedCombo: [hostel?.name, tiffin?.name, library?.name].filter(Boolean).join(' + ') || undefined
  };
}

function generateComparisonMatrix(_topic: string, city: string, userMsg: string, properties: PropertyRecommendation[]): ComparisonMatrix | undefined {
  const lower = userMsg.toLowerCase();
  const candidates = properties
    .filter(p => p.type === 'hostel')
    .filter(p => !city || !p.city || p.city.toLowerCase().includes(city.toLowerCase()))
    .map(p => ({ p, n: parsePropertyPrice(p) ?? Number.POSITIVE_INFINITY }))
    .sort((a, b) => (b.p.rating ?? 0) - (a.p.rating ?? 0) || a.n - b.n)
    .slice(0, 2)
    .map(x => x.p);

  const requestedNames = properties.filter(p => lower.includes(p.name.toLowerCase())).slice(0, 2);
  const items = requestedNames.length >= 2 ? requestedNames : candidates;
  if (items.length < 2) return undefined;

  const mapped = items.map((p, index) => ({
    id: p.id,
    name: p.name,
    category: p.type,
    priceMonthly: p.price || 'Price not listed',
    numericPrice: parsePropertyPrice(p),
    location: [p.area, p.city].filter(Boolean).join(', ') || 'Location not listed',
    rating: p.rating,
    badge: p.badge || `Option ${index + 1}`,
    features: {
      foodMess: p.highlights?.find(h => /food|mess|meal/i.test(h)),
      distanceToCoaching: p.highlights?.find(h => /near|distance|coaching|college/i.test(h)),
      roomType: p.highlights?.find(h => /room|sharing|single|double/i.test(h)),
      wifiSecurity: p.highlights?.find(h => /wifi|security|cctv|warden/i.test(h)),
      powerBackup: p.highlights?.find(h => /power|backup|electric/i.test(h))
    },
    pros: p.highlights?.slice(0, 3) || [],
    cons: [],
    bestFor: 'Based on the information currently present in the active listing.',
    phone: p.phone,
    mapsUrl: p.mapsUrl
  }));

  const prices = mapped.map(i => i.numericPrice).filter((n): n is number => n !== undefined);
  const winner = mapped.slice().sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || (a.numericPrice ?? Infinity) - (b.numericPrice ?? Infinity))[0];
  const cheaper = prices.length === 2 ? Math.abs(prices[0] - prices[1]) : undefined;

  return {
    title: `${mapped[0].name} vs ${mapped[1].name}`,
    summary: 'Side-by-side comparison based only on currently active StudentHubHelp listings.',
    items: mapped,
    winnerId: winner?.id,
    winnerReason: winner ? `${winner.name} ranks higher using the available active-listing rating and price information.` : undefined,
    costDifferenceText: cheaper !== undefined ? `Price difference: ₹${cheaper.toLocaleString('en-IN')}` : undefined
  };
}

// Smart fail-safe engine. It never invents a property; all recommendations come from live active listings.
function generateSmartFallback(
  userMsg: string,
  history: Array<{ role: string; text: string }> = [],
  preferredTopic?: string,
  liveProperties: PropertyRecommendation[] = []
) {
  const lower = (userMsg + ' ' + (preferredTopic || '')).toLowerCase();
  const extracted = extractLeadFromText(userMsg);
  const historyText = history.map(h => h.text).join(' ').toLowerCase();

  let intent = 'General Inquiry';
  let primaryTopic = 'Student Services Discovery';
  let topicDirectAnswer = 'I can help you find active StudentHubHelp listings for hostels, tiffins, libraries, cafes and bookstores.';
  let topicPriorityReason = 'Fallback response based on the user request.';
  let userNeedSummary = 'User is exploring student services.';
  let sentiment: SentimentType = 'curious';
  let recommendedCategory: 'hostel' | 'tiffin' | 'library' | 'cafe' | 'bookstore' | 'none' = 'none';
  let targetCity = '';
  let budgetPlan: StudentBudgetPlan | undefined;
  let comparisonMatrix: ComparisonMatrix | undefined;

  if (lower.includes('kota') || lower.includes('talwandi')) targetCity = 'Kota';
  else if (lower.includes('delhi') || lower.includes('mukherjee')) targetCity = 'Delhi';
  else if (lower.includes('jaipur')) targetCity = 'Jaipur';
  else if (lower.includes('sikar') || lower.includes('piprali') || historyText.includes('sikar')) targetCity = 'Sikar';

  if (/budget|planner|kharcha|calculate|hisab|expenses|cost of living|\b[4-9]\d{3}\b|\b1\d{4}\b|\b2\d{4}\b/i.test(userMsg)) {
    recommendedCategory = 'hostel';
    intent = 'Budget Planning & Cost Breakdown';
    primaryTopic = 'Student Monthly Budget Planner';
    topicDirectAnswer = 'I can build a budget using currently active priced listings, without inventing property prices.';
    topicPriorityReason = 'The user asked for a budget or cost calculation.';
    userNeedSummary = `Student is planning monthly expenses${targetCity ? ` in ${targetCity}` : ''}.`;
    const budgetMatch = userMsg.match(/\b(4\d{3}|5\d{3}|6\d{3}|7\d{3}|8\d{3}|9\d{3}|1\d{4}|2\d{4})\b/);
    const targetBudget = budgetMatch ? parseInt(budgetMatch[0], 10) : 8000;
    budgetPlan = generateBudgetPlan(targetBudget, targetCity, userMsg, liveProperties);
  } else if (/compare|vs|versus|antar|difference|dono me|kaunsa best|konsa lu|konsa accha|comparison/i.test(lower)) {
    recommendedCategory = 'hostel';
    intent = 'Property Comparison';
    primaryTopic = 'Live Property Comparison';
    topicDirectAnswer = 'I can compare active listings using the information currently stored for those listings.';
    topicPriorityReason = 'The user requested a comparison.';
    userNeedSummary = `User wants to compare active options${targetCity ? ` in ${targetCity}` : ''}.`;
    comparisonMatrix = generateComparisonMatrix(primaryTopic, targetCity, userMsg, liveProperties);
  } else if (/tiffin|mess|khana|food|jain|diet/i.test(lower)) {
    recommendedCategory = 'tiffin';
    intent = 'Tiffin & Food Inquiry';
    primaryTopic = 'Tiffin & Meal Services';
    topicDirectAnswer = 'I can show active tiffin listings and their available meal information.';
    userNeedSummary = `User is looking for tiffin or food services${targetCity ? ` in ${targetCity}` : ''}.`;
  } else if (/library|study|reading|seat|peace/i.test(lower)) {
    recommendedCategory = 'library';
    intent = 'Library & Study Inquiry';
    primaryTopic = 'Study Library Discovery';
    topicDirectAnswer = 'I can show active library listings and their available facilities and pricing.';
    userNeedSummary = `User is looking for a library or study space${targetCity ? ` in ${targetCity}` : ''}.`;
  } else if (/cafe|coffee|restaurant|hangout/i.test(lower)) {
    recommendedCategory = 'cafe';
    intent = 'Cafe Inquiry';
    primaryTopic = 'Student Cafe Discovery';
    topicDirectAnswer = 'I can show active cafe listings and the details currently stored for them.';
    userNeedSummary = `User is looking for a cafe${targetCity ? ` in ${targetCity}` : ''}.`;
  } else if (/bookstore|book store|books|stationery|notes/i.test(lower)) {
    recommendedCategory = 'bookstore';
    intent = 'Bookstore Inquiry';
    primaryTopic = 'Bookstore & Study Material Discovery';
    topicDirectAnswer = 'I can show active bookstore listings and the study-material services currently stored for them.';
    userNeedSummary = `User is looking for a bookstore${targetCity ? ` in ${targetCity}` : ''}.`;
  } else if (/hostel|pg|room|stay|accommodation|girls|boys|warden|safety/i.test(lower)) {
    recommendedCategory = 'hostel';
    intent = 'Hostel / PG Inquiry';
    primaryTopic = 'Active Hostel & PG Discovery';
    topicDirectAnswer = 'I can show active hostel listings and match them by city, area, budget and available details.';
    userNeedSummary = `Student is looking for accommodation${targetCity ? ` in ${targetCity}` : ''}.`;
  }

  const matched = liveProperties.filter(p => !recommendedCategory || recommendedCategory === 'none' || p.type === recommendedCategory);
  const locationMatched = targetCity ? matched.filter(p => p.city.toLowerCase().includes(targetCity.toLowerCase())) : matched;
  const available = locationMatched.length ? locationMatched : matched;
  const names = available.slice(0, 3).map(p => p.name).join(', ');

  let reply = `${topicDirectAnswer}\n\n`;
  reply += available.length
    ? `I found ${available.length} active matching listing${available.length === 1 ? '' : 's'}. Top matches: ${names}.`
    : 'I could not find an active listing matching that request right now.';

  if (extracted.phone || extracted.email) {
    reply += '\n\nI have captured the contact detail you provided for follow-up.';
  }

  return {
    reply,
    intent,
    primaryTopic,
    topicDirectAnswer,
    topicPriorityReason,
    userNeedSummary,
    sentiment,
    suggestedFollowUps: [
      recommendedCategory !== 'none' ? `Show more ${recommendedCategory} listings` : 'Find a hostel',
      targetCity ? `Search active listings in ${targetCity}` : 'Search by city',
      'Set a budget',
      'Compare active options'
    ],
    capturedLead: (extracted.phone || extracted.email) ? {
      name: extracted.name || 'Student Visitor',
      phone: extracted.phone,
      email: extracted.email,
      detectedNeed: userNeedSummary,
      city: targetCity || undefined
    } : null,
    recommendedCategory,
    targetCity,
    budgetPlan,
    comparisonMatrix,
    isFallback: true
  };
}

// Find matching properties from live Supabase active listings with topic-first ranking
async function getRecommendations(
  category?: string,
  city?: string,
  budget?: number,
  primaryTopic?: string,
  userQuery?: string
): Promise<PropertyRecommendation[]> {
  const list = await fetchLiveProperties();
  const searchKeywords = `${primaryTopic || ''} ${userQuery || ''} ${city || ''} ${category || ''}`.toLowerCase();

  const scored = list.map(p => {
    let score = 0;
    const pText = `${p.name} ${p.area} ${p.city} ${p.type} ${p.landmark || ''} ${p.highlights?.join(' ') || ''}`.toLowerCase();
    if (category && category !== 'none' && p.type === category) score += 60;
    if (city && p.city.toLowerCase().includes(city.toLowerCase())) score += 40;
    if (city && p.area.toLowerCase().includes(city.toLowerCase())) score += 25;
    if (searchKeywords.split(/\s+/).filter(Boolean).some(k => k.length > 2 && pText.includes(k))) score += 8;
    if (/girls|ladki|female|women|warden|safety/i.test(searchKeywords) && /girl|female|women|warden|cctv|security/i.test(pText)) score += 45;
    if (/jain|satvik/i.test(searchKeywords) && /jain|satvik/i.test(pText)) score += 45;
    if (/wifi|ac|air.?condition|power|backup/i.test(searchKeywords) && /wifi|ac|power|backup/i.test(pText)) score += 15;
    const price = parsePropertyPrice(p);
    if (budget !== undefined && price !== undefined) score += price <= budget ? 30 : -10;
    return { property: p, score };
  });

  return scored
    .sort((a, b) => b.score - a.score || (b.property.rating ?? 0) - (a.property.rating ?? 0))
    .slice(0, 6)
    .map(s => s.property);
}

// API Routes
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    aiReady: !!getGeminiClient(),
    leadsCount: crmLeads.length
  });
});

app.get('/api/config', (req: Request, res: Response) => {
  res.json(currentConfig);
});

app.post('/api/config', (req: Request, res: Response) => {
  try {
    currentConfig = { ...currentConfig, ...req.body };
    res.json({ success: true, config: currentConfig });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/properties', async (req: Request, res: Response) => {
  try {
    const all = await fetchLiveProperties();
    const type = String(req.query.type || '').toLowerCase();
    const city = String(req.query.city || '').toLowerCase();
    const filtered = all.filter(p => (!type || type === 'all' || p.type === type) && (!city || city === 'all' || p.city.toLowerCase().includes(city)));
    res.json(req.query.all === 'true' ? filtered : filtered.slice(0, 20));
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to load active properties.' });
  }
});

app.get('/api/leads', (req: Request, res: Response) => {
  res.json(crmLeads);
});

app.post('/api/leads', (req: Request, res: Response) => {
  try {
    const { id, name, phone, email, city, detectedNeed, status, notes } = req.body;
    
    // Check if updating existing lead
    const existingIndex = crmLeads.findIndex(l => l.id === id);
    if (existingIndex !== -1) {
      crmLeads[existingIndex] = {
        ...crmLeads[existingIndex],
        status: status || crmLeads[existingIndex].status,
        notes: notes !== undefined ? notes : crmLeads[existingIndex].notes,
        name: name || crmLeads[existingIndex].name,
        phone: phone || crmLeads[existingIndex].phone,
        email: email || crmLeads[existingIndex].email,
        city: city || crmLeads[existingIndex].city,
        detectedNeed: detectedNeed || crmLeads[existingIndex].detectedNeed
      };
      return res.json({ success: true, lead: crmLeads[existingIndex] });
    }

    // Creating new lead
    const newLead: LeadRecord = {
      id: id || `lead-${Date.now()}`,
      name: name || "Student Visitor",
      phone: phone || "",
      email,
      city: city || "Sikar",
      detectedNeed: detectedNeed || "Inquired via AI Chatbot",
      timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      status: status || "new",
      notes: notes || "Captured directly by AI Assistant."
    };

    crmLeads.unshift(newLead);
    res.json({ success: true, lead: newLead });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/leads/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  crmLeads = crmLeads.filter(l => l.id !== id);
  res.json({ success: true, remaining: crmLeads.length });
});

// Primary AI Chat Endpoint with Structured JSON Schema & Smart Fallback
app.post('/api/chat', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { message, history = [], configOverride = {}, preferredTopic } = req.body;

  if (!message || typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({ error: 'Message cannot be empty.' });
  }

  const activeConfig = { ...currentConfig, ...configOverride };
  const ai = getGeminiClient();

  // If no Gemini client, run instant smart fallback
  if (!ai) {
    const liveProperties = await fetchLiveProperties();
    const fallback = generateSmartFallback(message, history, preferredTopic, liveProperties);
    const latencyMs = Date.now() - startTime;
    
    // Auto-save lead if detected in fallback
    if (fallback.capturedLead && fallback.capturedLead.phone) {
      saveLeadToCRM(fallback.capturedLead, fallback.intent, fallback.sentiment, fallback.primaryTopic);
    }

    const recs = await getRecommendations(fallback.recommendedCategory, fallback.targetCity, undefined, fallback.primaryTopic, message);

    return res.json({
      ...fallback,
      recommendations: recs,
      latencyMs
    });
  }

  try {
    const liveProperties = await fetchLiveProperties();
    const liveContext = (['hostel','tiffin','library','cafe','bookstore'] as const).flatMap(type => liveProperties.filter(p => p.type === type).slice(0, 25)).map(p => ({ id: p.id, name: p.name, type: p.type, area: p.area, city: p.city, price: p.price, rating: p.rating, verified: p.badge === 'Verified listing' })).map(p => JSON.stringify(p)).join('\n');
    const systemPrompt = `
You are the Ultra Top-Level AI Assistant for "${activeConfig.websiteName}" (${activeConfig.tagline}).
Tone: ${activeConfig.botTone.toUpperCase()} (Respectful, Warm, Empathetic, Highly Knowledgeable, Accurate, Student-friendly).

WEBSITE KNOWLEDGE BASE:
${activeConfig.customKnowledge}
Primary Locations: ${activeConfig.primaryLocation}
Director / Founder: ${activeConfig.directorName} (Phone: ${activeConfig.directorPhone}, Email: ${activeConfig.directorEmail}).

CRITICAL DIRECTIVE - "TOPIC FIRST PRIORITY":
Whatever topic, locality, service or question the student asks about (e.g. hostel, girls hostel safety, tiffin, Jain food, area, library, budget or support contact):
1. YOU MUST GIVE THAT TOPIC ABSOLUTE FIRST PRIORITY.
2. The very first sentence of your reply MUST directly answer and resolve the user's specific requested topic with crisp, exact facts, rates, and verified locations.
3. NEVER begin with generic pleasantries, robotic intros or filler text before giving the core answer. Always prioritize their requested subject FIRST.
4. Maintain context across turns: If the user previously asked about Piprali road and now asks "khana kaisa rehta h?", immediately prioritize "Mess and Food quality in Piprali road hostels".
5. Ground your answers in real geographical locations and landmarks (e.g. "Piprali Road near GCI/Matrix Academy", "Talwandi Sector A near Allen Samarth", "Mukherjee Nagar near Batra Cinema").

SPECIAL INSTRUCTIONS:
1. Multi-lingual NLP:
   - If user speaks in Hinglish (Roman Hindi/Urdu, e.g. "mujhe 6000 me boys hostel chahiye", "khana kaisa rehta h", "seat booking ka process kya h"), respond in natural, friendly Hinglish with respectful tone ("Ji bilkul", "Namaste!").
   - If user writes in Devanagari Hindi, respond in Hindi.
   - If user writes in English, respond in polished English.
   - Always retain the same language style and respectful Indian tone.

2. Lead Extraction (Automatic CRM Lead Capture):
   - Watch the conversation carefully for any phone number (10-digit Indian mobile e.g. 98XXXXXXXX, +91-XXXXX), email address, or user name ("Mera naam Rohit hai", "Call me at 9829104523").
   - Whenever you detect contact information, populate the "capturedLead" object with { name, email, phone, detectedNeed, city }. Do NOT force a boring form. Acknowledge their contact details gracefully in the reply ("Aapka number note kar liya gaya hai, Director Satpal Swami ji ki team aapse sampark karegi").

3. Structured Output:
   - You MUST output adhering to the provided JSON Schema.
   - Reply must be informative, concise, formatted with markdown bullets where appropriate.
   - Provide 2 to 4 clickable suggested follow-up chips that logically guide the student forward.
   - Diagnose the intent, primaryTopic, topicDirectAnswer, topicPriorityReason, user need summary, and user sentiment accurately.

4. Student Monthly Budget Planner:
   - When a student inquires about monthly budget, expenses, room rent + tiffin costs, or financial calculation, break down: Sharing/Single Room Rent, Daily Tiffin/Mess, 24/7 AC Study Library, Books/Stationery, and Misc/Pocket Money. Give clear money-saving tips.

5. Advance Multi-Option Comparison:
   - When a student asks to compare hostels, areas, or living options, directly compare only information present in the supplied active listings.

LIVE ACTIVE LISTINGS CONTEXT (source of truth for property facts):
${liveContext}

CRITICAL DATA SAFETY:
- Property facts must come only from the live active listings context or the structured recommendations returned by the server.
- Never invent a property, price, rating, phone, address, facility, availability or verification status.
- If a property is not present in the live context, do not claim facts about it.
- If there is insufficient live data, say that the information is not currently available.
`;

    // Format conversation history for Gemini
    const contents: any[] = [];
    if (Array.isArray(history)) {
      for (const turn of history.slice(-6)) {
        if (turn.text && turn.text.trim()) {
          contents.push({
            role: turn.role === 'user' ? 'user' : 'model',
            parts: [{ text: turn.text }]
          });
        }
      }
    }
    contents.push({
      role: 'user',
      parts: [{ text: preferredTopic ? `[Priority Focus: ${preferredTopic}] ${message}` : message }]
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Gemini API timeout after 6 seconds')), 6000);
    });

    const apiPromise = ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: {
              type: Type.STRING,
              description: 'Formatted and friendly response in the user requested language (Hinglish/Hindi/English) giving immediate first priority to the topic asked.'
            },
            primaryTopic: {
              type: Type.STRING,
              description: 'Exact core topic prioritized by the user (e.g. hostel search, tiffin rates, library search, girls hostel safety, budget search, or support contact).'
            },
            topicDirectAnswer: {
              type: Type.STRING,
              description: 'A 1-sentence high-impact direct answer for that topic.'
            },
            topicPriorityReason: {
              type: Type.STRING,
              description: 'Why this topic was given first priority based on the user prompt.'
            },
            intent: {
              type: Type.STRING,
              description: 'The real intent of the user (e.g. Hostel Inquiry, Tiffin Service, Pricing, Library Seat, Booking, Support, Owner Claim).'
            },
            userNeedSummary: {
              type: Type.STRING,
              description: 'Exact diagnosed core requirement of the user.'
            },
            sentiment: {
              type: Type.STRING,
              description: 'Sentiment of the user: positive, curious, frustrated, urgent, or neutral.'
            },
            suggestedFollowUps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '2 to 4 click-ready short question chips that lead the student to their goal.'
            },
            capturedLead: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                email: { type: Type.STRING },
                phone: { type: Type.STRING },
                detectedNeed: { type: Type.STRING },
                city: { type: Type.STRING }
              },
              description: 'Automatically extracted student contact info if mentioned in message.'
            },
            recommendedCategory: {
              type: Type.STRING,
              description: 'Category to recommend: hostel, tiffin, library, cafe, bookstore, or none.'
            },
            targetCity: {
              type: Type.STRING,
              description: 'Target city mentioned or inferred (e.g. Sikar, Kota, Delhi, Jaipur).'
            },
            maxBudget: {
              type: Type.NUMBER,
              description: 'Max budget mentioned by the student if any (e.g. 6000).'
            }
          },
          required: ['reply', 'primaryTopic', 'topicDirectAnswer', 'intent', 'userNeedSummary', 'sentiment', 'suggestedFollowUps']
        }
      }
    });

    const response = (await Promise.race([apiPromise, timeoutPromise])) as any;
    const latencyMs = Date.now() - startTime;

    const parsed = JSON.parse(response.text?.trim() || '{}');
    
    // Also perform local regex check on user message in case LLM missed a phone number
    const localLead = extractLeadFromText(message);
    let finalLead = parsed.capturedLead || null;
    if (localLead.phone || localLead.email) {
      finalLead = {
        name: finalLead?.name || localLead.name || "Student Visitor",
        phone: finalLead?.phone || localLead.phone,
        email: finalLead?.email || localLead.email,
        detectedNeed: finalLead?.detectedNeed || parsed.userNeedSummary || `${parsed.primaryTopic || 'Direct inquiry'}`,
        city: finalLead?.city || parsed.targetCity || "Sikar"
      };
    }

    // Auto-save lead to server CRM with topic
    if (finalLead && (finalLead.phone || finalLead.email)) {
      saveLeadToCRM(finalLead, parsed.intent, parsed.sentiment, parsed.primaryTopic);
    }

    // Match recommendations with topic-first ranking
    const recs = await getRecommendations(
      parsed.recommendedCategory || 'none',
      parsed.targetCity,
      parsed.maxBudget,
      parsed.primaryTopic,
      message
    );

    // Check if query or topic is budget or compare related
    const isBudgetQuery = /budget|planner|kharcha|hisab|plan|expenses|cost of living|\b(4\d{3}|5\d{3}|6\d{3}|7\d{3}|8\d{3}|9\d{3}|1\d{4}|2\d{4})\b/i.test(message + ' ' + (parsed.primaryTopic || ''));
    const isCompareQuery = /compare|vs|versus|antar|difference|dono me|kaunsa best|konsa lu|konsa accha|comparison/i.test(message + ' ' + (parsed.primaryTopic || ''));

    const budgetPlan = isBudgetQuery ? (parsed.budgetPlan || generateBudgetPlan(parsed.maxBudget || 8000, parsed.targetCity || '', message, liveProperties)) : undefined;
    const comparisonMatrix = isCompareQuery ? (parsed.comparisonMatrix || generateComparisonMatrix(parsed.primaryTopic || 'Comparison', parsed.targetCity || '', message, liveProperties)) : undefined;

    res.json({
      reply: parsed.reply || "Aapka message mil gaya. Main StudentHubHelp se related saari jankari de sakta hoon.",
      primaryTopic: parsed.primaryTopic || "Student Accommodation & Services",
      topicDirectAnswer: parsed.topicDirectAnswer || "Verified zero-brokerage student housing, tiffin, and library services.",
      topicPriorityReason: parsed.topicPriorityReason || "Immediate topic direct answer provided.",
      intent: parsed.intent || "General Inquiry",
      userNeedSummary: parsed.userNeedSummary || "Exploring student facilities",
      sentiment: parsed.sentiment || "curious",
      suggestedFollowUps: Array.isArray(parsed.suggestedFollowUps) && parsed.suggestedFollowUps.length > 0
        ? parsed.suggestedFollowUps
        : ["Best Hostels in Sikar", "Monthly Tiffin Price", "Director Se Baat Karein"],
      capturedLead: finalLead,
      recommendations: recs,
      budgetPlan,
      comparisonMatrix,
      isFallback: false,
      latencyMs
    });

  } catch (err: any) {
    console.warn("Gemini API call failed or timed out, executing smart fallback:", err?.message || err);
    const liveProperties = await fetchLiveProperties();
    const fallback = generateSmartFallback(message, history, preferredTopic, liveProperties);
    const latencyMs = Date.now() - startTime;

    if (fallback.capturedLead && fallback.capturedLead.phone) {
      saveLeadToCRM(fallback.capturedLead, fallback.intent, fallback.sentiment, fallback.primaryTopic);
    }

    const recs = await getRecommendations(fallback.recommendedCategory, fallback.targetCity, undefined, fallback.primaryTopic, message);

    res.json({
      ...fallback,
      recommendations: recs,
      latencyMs
    });
  }
});

function saveLeadToCRM(lead: any, intent?: string, sentiment?: SentimentType, primaryTopic?: string) {
  if (!lead.phone && !lead.email) return;

  const existing = crmLeads.find(l => (lead.phone && l.phone === lead.phone) || (lead.email && l.email === lead.email));
  if (existing) {
    existing.detectedNeed = lead.detectedNeed || existing.detectedNeed;
    existing.city = lead.city || existing.city;
    if (primaryTopic) existing.primaryTopic = primaryTopic;
    if (lead.name && lead.name !== 'Student Visitor') existing.name = lead.name;
    return;
  }

  const newLead: LeadRecord = {
    id: `lead-${Date.now()}`,
    name: lead.name || "Student Visitor",
    phone: lead.phone || "",
    email: lead.email,
    city: lead.city || "Sikar",
    detectedNeed: lead.detectedNeed || "Captured via Chatbot conversation",
    timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    status: 'new',
    intent: intent || 'Direct Contact',
    sentiment: sentiment || 'curious',
    primaryTopic: primaryTopic || 'General Inquiry',
    notes: 'Auto-captured from live chat conversation with topic prioritization.'
  };

  crmLeads.unshift(newLead);
}

// Serve standalone widget script for 1-click embedding on WordPress / external sites
app.get('/widget.js', (req: Request, res: Response) => {
  res.sendFile(path.join(process.cwd(), 'public', 'widget.js'));
});

// Vite & Static file handling
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[StudentHubHelp AI Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
