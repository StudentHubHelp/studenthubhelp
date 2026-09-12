export type SentimentType = 'positive' | 'curious' | 'frustrated' | 'urgent' | 'neutral';

export type LeadStatus = 'new' | 'contacted' | 'converted';

export interface PropertyRecommendation {
  id: string;
  name: string;
  type: 'hostel' | 'tiffin' | 'library' | 'cafe' | 'bookstore';
  area: string;
  city: string;
  price?: string;
  rating?: number;
  badge?: string;
  phone?: string;
  image?: string;
  highlights?: string[];
  link?: string;
  mapsUrl?: string;
  landmark?: string;
  matchReason?: string;
}

export interface CapturedLead {
  name?: string;
  email?: string;
  phone?: string;
  detectedNeed?: string;
  city?: string;
}

export interface BudgetBreakdownItem {
  category: 'rent' | 'food' | 'library' | 'stationery' | 'misc';
  label: string;
  amount: number;
  note?: string;
}

export interface StudentBudgetPlan {
  targetBudget: number;
  city: string;
  livingType?: 'hostel_mess' | 'pg_tiffin' | 'sharing_room' | 'custom';
  items: BudgetBreakdownItem[];
  totalEstimated: number;
  savingsOrOverrun: number;
  status: 'under_budget' | 'balanced' | 'over_budget';
  savingsTips: string[];
  recommendedCombo?: string;
}

export interface ComparisonItem {
  id: string;
  name: string;
  category: string;
  priceMonthly: string;
  numericPrice?: number;
  location: string;
  rating?: number;
  badge?: string;
  features?: {
    foodMess?: string;
    distanceToCoaching?: string;
    roomType?: string;
    wifiSecurity?: string;
    powerBackup?: string;
  };
  pros: string[];
  cons: string[];
  bestFor: string;
  phone?: string;
  mapsUrl?: string;
}

export interface ComparisonMatrix {
  title: string;
  summary: string;
  items: ComparisonItem[];
  winnerId?: string;
  winnerReason?: string;
  costDifferenceText?: string;
}

export interface ChatDiagnosis {
  intent: string;
  primaryTopic?: string;
  topicDirectAnswer?: string;
  topicPriorityReason?: string;
  userNeedSummary: string;
  sentiment: SentimentType;
  suggestedFollowUps: string[];
  capturedLead?: CapturedLead | null;
  recommendedCategory?: 'hostel' | 'tiffin' | 'library' | 'cafe' | 'bookstore' | 'none';
  targetCity?: string;
  maxBudget?: number;
  recommendations?: PropertyRecommendation[];
  budgetPlan?: StudentBudgetPlan;
  comparisonMatrix?: ComparisonMatrix;
  isFallback?: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  recommendedProperties?: any[];
  budgetPlan?: any;
  comparisonMatrix?: any;
  diagnosis?: ChatDiagnosis;
  feedback?: 'up' | 'down' | null;
}

export interface LeadRecord {
  id: string;
  name: string;
  phone: string;
  email?: string;
  city?: string;
  detectedNeed: string;
  timestamp: string;
  status: LeadStatus;
  notes?: string;
  intent?: string;
  sentiment?: SentimentType;
  primaryTopic?: string;
}

export interface BotConfig {
  websiteName: string;
  tagline: string;
  industry: string;
  primaryLocation: string;
  directorName: string;
  directorPhone: string;
  directorEmail: string;
  botTone: 'friendly' | 'professional' | 'empathetic' | 'sales_driven';
  enableTTS: boolean;
  enableSTT: boolean;
  welcomeMessage: string;
  customKnowledge: string;
  services: Array<{
    name: string;
    desc: string;
    pricing: string;
  }>;
}

export interface ChatApiRequest {
  message: string;
  history?: Array<{
    role: 'user' | 'model';
    text: string;
  }>;
  configOverride?: Partial<BotConfig>;
  preferredTopic?: string;
  sessionId?: string;
}

export interface ChatApiResponse {
  reply: string;
  intent: string;
  primaryTopic?: string;
  topicDirectAnswer?: string;
  topicPriorityReason?: string;
  userNeedSummary: string;
  sentiment: SentimentType;
  suggestedFollowUps: string[];
  capturedLead?: CapturedLead | null;
  recommendations?: PropertyRecommendation[];
  budgetPlan?: StudentBudgetPlan;
  comparisonMatrix?: ComparisonMatrix;
  isFallback?: boolean;
  latencyMs?: number;
  recommendedProperties?: any[];
  recommendedCategory?: string;
  targetCity?: string;
  grounded?: boolean;
  liveActivePropertyCount?: number;
  searchMode?: 'hybrid_lexical_trigram_ai_rerank' | string;
  sessionId?: string;
}