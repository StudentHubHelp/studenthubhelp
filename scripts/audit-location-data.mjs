import { readFile } from 'node:fs/promises';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
const PAGE_SIZE = 500;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Set SUPABASE_URL and SUPABASE_ANON_KEY before running this read-only audit.');
}

const aliases = JSON.parse(await readFile(new URL('../data/city-aliases.json', import.meta.url), 'utf8'));
const TABLES = [
  { type: 'hostel', table: 'hostels' },
  { type: 'tiffin', table: 'tiffins' },
  { type: 'library', table: 'libraries' },
  { type: 'cafe', table: 'cafes' },
  { type: 'bookstore', table: 'bookstores' }
];

function normalize(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

const cityMap = new Map();
for (const city of aliases.canonicalCities) {
  for (const value of [city.name, ...(city.seoAliases || []), ...(city.searchAliases || [])]) {
    cityMap.set(normalize(value), city);
  }
}

function canonicalCity(value) {
  const match = cityMap.get(normalize(value));
  return match ? match.name : String(value ?? '').trim();
}

const CITY_GEO_CHECKS = [
  { slug: 'sikar', lat: 27.6094, lng: 75.1398, radiusKm: 65 },
  { slug: 'kota', lat: 25.2138, lng: 75.8648, radiusKm: 65 },
  { slug: 'jaipur', lat: 26.9124, lng: 75.7873, radiusKm: 65 },
  { slug: 'jhunjhunu', lat: 28.1289, lng: 75.3990, radiusKm: 45 },
  { slug: 'delhi', lat: 28.6139, lng: 77.2090, radiusKm: 75 },
  { slug: 'gurugram', lat: 28.4595, lng: 77.0266, radiusKm: 55 },
  { slug: 'bengaluru', lat: 12.9716, lng: 77.5946, radiusKm: 65 },
  { slug: 'chennai', lat: 13.0827, lng: 80.2707, radiusKm: 65 },
  { slug: 'patna', lat: 25.5941, lng: 85.1376, radiusKm: 55 },
  { slug: 'pune', lat: 18.5204, lng: 73.8567, radiusKm: 65 },
  { slug: 'coimbatore', lat: 11.0168, lng: 76.9558, radiusKm: 55 },
  { slug: 'mangaluru', lat: 12.9141, lng: 74.8560, radiusKm: 45 },
  { slug: 'mysuru', lat: 12.2958, lng: 76.6394, radiusKm: 45 },
  { slug: 'hubballi', lat: 15.3647, lng: 75.1240, radiusKm: 45 },
  { slug: 'vadodara', lat: 22.3072, lng: 73.1812, radiusKm: 55 },
  { slug: 'ahmedabad', lat: 23.0225, lng: 72.5714, radiusKm: 65 },
  { slug: 'hyderabad', lat: 17.3850, lng: 78.4867, radiusKm: 65 }
];

function distanceKm(a, b) {
  const rad = value => value * Math.PI / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2
    + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

async function fetchAll(table) {
  const rows = [];
  for (let offset = 0; offset < 50000; offset += PAGE_SIZE) {
    const url = new URL(SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/' + table);
    url.searchParams.set('select', '*');
    url.searchParams.set('status', 'eq.active');
    const response = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: 'Bearer ' + SUPABASE_KEY,
        Range: offset + '-' + (offset + PAGE_SIZE - 1),
        'Range-Unit': 'items',
        Prefer: 'count=exact'
      }
    });
    if (!response.ok) {
      throw new Error(table + ': HTTP ' + response.status + ' ' + (await response.text()).slice(0, 300));
    }
    const batch = await response.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }
  return rows;
}

const issues = [];
const summary = {};
const cityVariants = new Map();
const slugCounts = new Map();

for (const meta of TABLES) {
  const rows = await fetchAll(meta.table);
  const counts = {
    total: rows.length,
    verified: 0,
    missingCity: 0,
    missingArea: 0,
    missingSlug: 0,
    missingAddress: 0,
    missingDescription: 0,
    missingCoordinates: 0,
    invalidCoordinates: 0,
    suspiciousCityCoordinates: 0,
    missingLandmark: 0,
    placeholderLandmark: 0
  };

  for (const row of rows) {
    const city = String(row.city ?? '').trim();
    const area = String(row.area ?? '').trim();
    const slug = String(row.slug ?? '').trim();
    const description = String(row.description ?? '').trim();
    const landmarkText = [row.nearby_coaching, row.landmark].map(value => String(value ?? '').trim()).filter(Boolean).join(' | ');
    const lat = Number(row.latitude);
    const lng = Number(row.longitude);
    const hasCoords = row.latitude !== null && row.latitude !== undefined && row.longitude !== null && row.longitude !== undefined;
    const cityName = canonicalCity(city);
    const cityKey = normalize(cityName);

    if (row.verified === true) counts.verified++;
    if (!city) counts.missingCity++;
    if (!area) counts.missingArea++;
    if (!slug) counts.missingSlug++;
    if (!String(row.address ?? '').trim()) counts.missingAddress++;
    if (!description) counts.missingDescription++;
    if (!landmarkText) counts.missingLandmark++;
    if (/coming soon|tbd|to be updated|not available/i.test(landmarkText)) counts.placeholderLandmark++;

    const addIssue = (code, detail, extra = {}) => issues.push({
      code,
      category: meta.type,
      listingId: String(row.id ?? row.property_id ?? ''),
      name: String(row.name ?? row.service_name ?? row.title ?? ''),
      city,
      canonicalCity: cityName,
      area,
      slug,
      detail,
      ...extra
    });

    if (!hasCoords) {
      counts.missingCoordinates++;
      addIssue('missing_coordinates', 'Latitude or longitude is missing.');
    } else if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      counts.invalidCoordinates++;
      addIssue('invalid_coordinates', 'Coordinates are outside valid latitude/longitude ranges.', { latitude: row.latitude, longitude: row.longitude });
    } else {
      const check = CITY_GEO_CHECKS.find(item => item.slug === cityKey);
      if (check) {
        const distance = distanceKm({ lat: check.lat, lng: check.lng }, { lat, lng });
        if (distance > check.radiusKm) {
          counts.suspiciousCityCoordinates++;
          addIssue('review_city_coordinate_mismatch', 'Coordinate is outside the broad city review radius; verify manually before using for nearby distances.', {
            latitude: lat,
            longitude: lng,
            distanceFromCityCentreKm: Number(distance.toFixed(1))
          });
        }
      }
    }

    if (!landmarkText) {
      addIssue('missing_landmark_data', 'No nearby coaching or landmark text is stored.');
    } else if (/coming soon|tbd|to be updated|not available/i.test(landmarkText)) {
      addIssue('placeholder_landmark', 'Landmark field contains placeholder text and is not usable as a verified landmark.', { landmarkText });
    }

    if (city) {
      const variantKey = normalize(city);
      const item = cityVariants.get(variantKey) || { raw: city, canonical: cityName, listings: 0, variants: new Set() };
      item.listings++;
      item.variants.add(city);
      cityVariants.set(variantKey, item);
    }

    if (slug) {
      const key = meta.type + '/' + slug.toLowerCase();
      slugCounts.set(key, (slugCounts.get(key) || 0) + 1);
    }
  }

  summary[meta.type] = counts;
}

for (const [key, count] of slugCounts) {
  if (count > 1) issues.push({ code: 'duplicate_slug', key, count, detail: 'More than one active row uses the same category slug.' });
}

const total = Object.values(summary).reduce((sum, item) => sum + item.total, 0);
const report = {
  generatedAt: new Date().toISOString(),
  readOnly: true,
  totalActiveListings: total,
  categorySummary: summary,
  cityVariants: [...cityVariants.values()].map(item => ({
    raw: item.raw,
    canonical: item.canonical,
    listings: item.listings,
    variants: [...item.variants]
  })),
  issueCounts: issues.reduce((acc, issue) => {
    acc[issue.code] = (acc[issue.code] || 0) + 1;
    return acc;
  }, {}),
  issues
};

console.log(JSON.stringify(report, null, 2));
