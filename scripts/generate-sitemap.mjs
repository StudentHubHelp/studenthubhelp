import { execFileSync } from 'node:child_process';
import { readFile, readdir, unlink, writeFile } from 'node:fs/promises';

const BASE = (process.env.BASE_URL || 'https://studenthubhelp.in/').replace(/\/+$/, '') + '/';
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
  if (name === 'index.html') return BASE;
  if (name.endsWith('/index.html')) {
    return new URL(name.slice(0, -'index.html'.length), BASE).href;
  }
  return new URL(name, BASE).href;
}

async function fetchRows(table) {
  const rows = [];
  const pageSize = 1000;
  for (let offset = 0; offset < 50000; offset += pageSize) {
    const url = new URL(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${table}`);
    url.searchParams.set('select', 'id,property_id,slug,status,updated_at,created_at,name,area,city,address');
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
const rootFiles = (await readdir('.', { recursive: true })).filter(name => name.toLowerCase().endsWith('.html')).sort();

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
      properties.set(loc, { loc, lastmod, type, name: row.name, area: row.area, city: row.city, address: row.address });
    }
  }
}

const propertyEntries = [...properties.values()].sort((a, b) => a.loc.localeCompare(b.loc));

async function writePropertyIndex(entries) {
  const groups = new Map();
  for (const entry of entries) {
    const list = groups.get(entry.type) || [];
    list.push(entry);
    groups.set(entry.type, list);
  }
  const labels = {
    hostel: 'Hostels & PGs',
    tiffin: 'Tiffin & Mess Services',
    library: 'Libraries & Study Spaces',
    cafe: 'Cafes',
    bookstore: 'Bookstores & Stationery'
  };
  const sections = [...groups.entries()].map(([type, list]) => {
    const links = list.map(row => {
      const name = esc(row.name || 'Student property');
      const location = [row.area, row.city].filter(Boolean).map(esc).join(', ');
      return `<li><a href="${esc(row.loc)}">${name}</a>${location ? ` <span>— ${location}</span>` : ''}</li>`;
    }).join('');
    return `<section><h2>${labels[type] || type}</h2><ul>${links}</ul></section>`;
  }).join('');
  const html = `<!doctype html>
<html lang="en-IN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>StudentHubHelp Property Directory | Hostels, PGs, Cafes, Libraries, Tiffins & Bookstores</title>
<meta name="description" content="Browse active StudentHubHelp listings for hostels, PGs, tiffin services, libraries, cafes and bookstores across India.">
<meta name="robots" content="index,follow">
<link rel="canonical" href="${BASE}property-index.html">
<style>body{font-family:Arial,sans-serif;max-width:1100px;margin:auto;padding:24px;line-height:1.6;color:#172033}h1{line-height:1.2}section{margin:28px 0}ul{columns:2;gap:32px;padding-left:22px}li{margin:6px 0}a{color:#3158c9;text-decoration:none}a:hover{text-decoration:underline}span{color:#68758a;font-size:.92em}@media(max-width:700px){ul{columns:1}}</style>
</head>
<body>
<main>
<h1>StudentHubHelp Property Directory</h1>
<p>Active student-focused hostels, PGs, tiffin services, libraries, cafes and bookstores listed on StudentHubHelp. Each listing links to its dedicated property details URL.</p>
${sections}
</main>
</body>
</html>
`;
  await writeFile('property-index.html', html, 'utf8');
}

await writePropertyIndex(propertyEntries);
const propertyIndexLastmod = propertyEntries.reduce((latest, row) => row.lastmod && (!latest || row.lastmod > latest) ? row.lastmod : latest, null);

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

pages.set(pageUrl('property-index.html'), propertyIndexLastmod);
const pageEntries = [...pages.entries()].map(([loc, lastmod]) => ({ loc, lastmod })).sort((a, b) => a.loc.localeCompare(b.loc));
await writeUrlset('sitemap-pages.xml', pageEntries);

const sitemapEntries = ['sitemap-pages.xml', ...propertyFiles];
const indexBody = sitemapEntries.map(name => `  <sitemap><loc>${esc(new URL(name, BASE).href)}</loc></sitemap>`).join('\n');
const indexXml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="${NS}">\n${indexBody}\n</sitemapindex>\n`;
await writeFile('sitemap.xml', indexXml, 'utf8');

console.log(`Generated sitemap index: pages=${pageEntries.length}, properties=${propertyEntries.length}, files=${sitemapEntries.length}.`);
