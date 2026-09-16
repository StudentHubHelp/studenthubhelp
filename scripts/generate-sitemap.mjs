import { execFileSync } from 'node:child_process';
import { readFile, readdir, unlink, writeFile } from 'node:fs/promises';

const BASE = (process.env.BASE_URL || 'https://studenthubhelp.github.io/studenthubhelp/').replace(/\/+$/, '') + '/';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
const TABLES = {
  hostel: 'hostels',
  tiffin: 'tiffins',
  library: 'libraries',
  cafe: 'cafes',
  bookstore: 'bookstores'
};
const NS = 'http://www.sitemaps.org/schemas/sitemap/0.9';
const CHUNK_SIZE = 45000;

if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Missing Supabase public API configuration.');

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function validDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function recordUrl(type, row) {
  const slug = String(row.slug ?? '').trim();
  const id = String(row.id ?? '').trim() || String(row.property_id ?? '').trim();
  if (!slug && !id) return null;
  const url = new URL('property-details.html', BASE);
  url.searchParams.set('type', type);
  url.searchParams.set(slug ? 'slug' : 'id', slug || id);
  return url.href;
}

function pageUrl(name) {
  return name === 'index.html' ? BASE : new URL(name, BASE).href;
}

async function fetchRows(table) {
  const rows = [];
  const pageSize = 1000;
  for (let offset = 0; offset < 50000; offset += pageSize) {
    const url = new URL(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${table}`);
    url.searchParams.set('select', 'id,property_id,slug,status,updated_at,created_at');
    url.searchParams.set('status', 'eq.active');
    url.searchParams.set('offset', String(offset));
    url.searchParams.set('limit', String(pageSize));
    const res = await fetch(url, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
    if (!res.ok) throw new Error(`${table}: HTTP ${res.status} ${await res.text()}`);
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }
  return rows;
}

function hasNoindex(html) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  return tags.some(tag => {
    const name = tag.match(/\b(?:name|http-equiv)\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
    const content = tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i)?.[1]?.toLowerCase() || '';
    return (name === 'robots' || name === 'googlebot' || name === 'googlebot-news') && /\bnoindex\b/.test(content);
  });
}

function gitLastModified(path) {
  try {
    const value = execFileSync('git', ['log', '-1', '--format=%cI', '--', path], { encoding: 'utf8' }).trim();
    return validDate(value);
  } catch {
    return null;
  }
}

async function writeUrlset(filename, entries) {
  const body = entries.map(({ loc, lastmod }) =>
    `  <url><loc>${esc(loc)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`
  ).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="${NS}">\n${body}\n</urlset>\n`;
  await writeFile(filename, xml, 'utf8');
}

const explicitExcluded = new Set([
  'auth.html', 'property-details.html', 'global-search.html', '404.html', 'add-listing.html',
  'owner-dashboard.html', 'student-dashboard.html', 'partner-dashboard.html'
]);
const pages = new Map();
const rootFiles = (await readdir('.')).filter(name => name.toLowerCase().endsWith('.html')).sort();

for (const name of rootFiles) {
  if (explicitExcluded.has(name) || /^google[a-z0-9_-]*\.html$/i.test(name)) continue;
  const html = await readFile(name, 'utf8');
  if (hasNoindex(html)) continue;
  pages.set(pageUrl(name), gitLastModified(name));
}

const finderPages = ['pg-finder.html', 'tiffin-finder.html', 'library-finder.html', 'cafe-finder.html', 'bookstore-finder.html'];
for (const name of finderPages) {
  if (!pages.has(pageUrl(name))) pages.set(pageUrl(name), gitLastModified(name));
}

const properties = new Map();
for (const [type, table] of Object.entries(TABLES)) {
  for (const row of await fetchRows(table)) {
    const loc = recordUrl(type, row);
    if (!loc) continue;
    const lastmod = validDate(row.updated_at || row.created_at);
    const current = properties.get(loc);
    if (!current || (lastmod && (!current.lastmod || lastmod > current.lastmod))) {
      properties.set(loc, { loc, lastmod });
    }
  }
}

const propertyEntries = [...properties.values()].sort((a, b) => a.loc.localeCompare(b.loc));
const propertyFiles = [];
for (let i = 0; i < propertyEntries.length; i += CHUNK_SIZE) {
  const chunk = propertyEntries.slice(i, i + CHUNK_SIZE);
  const filename = propertyEntries.length <= CHUNK_SIZE ? 'sitemap-properties.xml' : `sitemap-properties-${Math.floor(i / CHUNK_SIZE) + 1}.xml`;
  await writeUrlset(filename, chunk);
  propertyFiles.push(filename);
}
if (!propertyFiles.length) {
  await writeUrlset('sitemap-properties.xml', []);
  propertyFiles.push('sitemap-properties.xml');
}

const expected = new Set(propertyFiles);
for (const name of await readdir('.')) {
  if (/^sitemap-properties(?:-\d+)?\.xml$/.test(name) && !expected.has(name)) await unlink(name);
}

const pageEntries = [...pages.entries()].map(([loc, lastmod]) => ({ loc, lastmod })).sort((a, b) => a.loc.localeCompare(b.loc));
await writeUrlset('sitemap-pages.xml', pageEntries);

const sitemapEntries = ['sitemap-pages.xml', ...propertyFiles];
const indexBody = sitemapEntries.map(name => `  <sitemap><loc>${esc(new URL(name, BASE).href)}</loc></sitemap>`).join('\n');
const indexXml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="${NS}">\n${indexBody}\n</sitemapindex>\n`;
await writeFile('sitemap.xml', indexXml, 'utf8');

console.log(`Generated sitemap index: pages=${pageEntries.length}, properties=${propertyEntries.length}, files=${sitemapEntries.length}.`);
