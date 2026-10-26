import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const BASE_URL = (process.env.BASE_URL || 'https://studenthubhelp.in').replace(/\/+$/, '');
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://idurlccrarznnnqixxsd.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;
if (!SUPABASE_KEY) throw new Error('Missing SUPABASE_KEY / SUPABASE_ANON_KEY.');

const CATEGORIES = [
  { table: 'hostels', type: 'hostel' },
  { table: 'tiffins', type: 'tiffin' },
  { table: 'libraries', type: 'library' },
  { table: 'cafes', type: 'cafe' },
  { table: 'bookstores', type: 'bookstore' }
];

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

async function fetchAll(table) {
  const rows = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
    url.searchParams.set('select', '*');
    url.searchParams.set('order', 'id.asc');
    const response = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Range: `${offset}-${offset + pageSize - 1}`,
        'Range-Unit': 'items',
        Prefer: 'count=exact'
      }
    });
    if (!response.ok) throw new Error(`Supabase read failed for ${table}: HTTP ${response.status} ${(await response.text()).slice(0, 400)}`);
    const batch = await response.json();
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }
  return rows;
}

function buildHtml({ type, slug, name, city, address, description }) {
  const canonical = `${BASE_URL}/properties/${type}/${encodeURIComponent(slug)}/`;
  const title = `${name || 'Property Details'} | StudentHubHelp`;
  const desc = String(description || [name, address, city].filter(Boolean).join(' — ') || 'View property details on StudentHubHelp.')
    .replace(/\s+/g, ' ').trim().slice(0, 155);
  const target = `${BASE_URL}/property-details.html?type=${encodeURIComponent(type)}&slug=${encodeURIComponent(slug)}`;
  return `<!doctype html>
<html lang="en-IN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(desc)}">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="${escapeHtml(canonical)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="StudentHubHelp">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(desc)}">
<meta property="og:url" content="${escapeHtml(canonical)}">
<meta name="twitter:card" content="summary">
<base href="/">
<script>
(function(){
  // Keep the clean /properties/<type>/<slug>/ URL in the address bar.
  // Load the shared details app in-place rather than redirecting through a query URL.
  var canonical = ${JSON.stringify(canonical)};
  history.replaceState({}, '', canonical + location.hash);
  fetch('/property-details.html', {cache:'no-cache'})
    .then(function(response){ if(!response.ok) throw new Error('Details app unavailable'); return response.text(); })
    .then(function(html){ document.open(); document.write(html); document.close(); })
    .catch(function(){ document.body.innerHTML = '<main><h1>Property Details</h1><p>Property details are temporarily unavailable.</p><a href="/">Return to StudentHubHelp</a></main>'; });
})();
</script>
</head>
<body>
<main><h1>${escapeHtml(name || 'Property Details')}</h1><p>${escapeHtml(address || [city, type].filter(Boolean).join(' · '))}</p><p>Opening full property details… <a href="${escapeHtml(target)}">Continue</a></p></main>
</body>
</html>
`;
}

function buildLegacyRedirectHtml(oldPath, targetType, targetSlug) {
  const canonical = `${BASE_URL}/properties/${targetType}/${encodeURIComponent(targetSlug)}/`;
  return `<!doctype html>
<html lang="en-IN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,follow">
<link rel="canonical" href="${escapeHtml(canonical)}">
<title>Property moved | StudentHubHelp</title>
<script>
(function(){
  var target = ${JSON.stringify(canonical)};
  location.replace(target);
})();
</script>
</head>
<body><p>This property has moved. <a href="${escapeHtml(canonical)}">Open the current property page</a>.</p></body>
</html>
`;
}

async function main() {
  const redirectsPath = path.join(ROOT, 'property-url-redirects.json');
  let redirects = {};
  try { redirects = JSON.parse(await readFile(redirectsPath, 'utf8')); } catch {}
  const seen = new Set();
  const counts = {};
  let generated = 0;

  for (const { table, type } of CATEGORIES) {
    const records = await fetchAll(table);
    counts[type] = records.length;
    console.log(`${table}: fetched ${records.length}`);
    for (const row of records) {
      const slug = String(row.slug || '').trim();
      if (!slug) throw new Error(`Missing slug in ${table}, id=${row.id}; refusing to publish incomplete property paths.`);
      const key = `${type}/${slug}`;
      if (seen.has(key)) throw new Error(`Duplicate static property URL: ${key}`);
      seen.add(key);
      const dir = path.join(ROOT, 'properties', type, slug);
      await mkdir(dir, { recursive: true });
      const name = row.name || row.service_name || row.title || 'Property Details';
      const html = buildHtml({
        type, slug, name,
        city: row.city,
        address: row.address,
        description: row.description || row.about || row.details
      });
      await writeFile(path.join(dir, 'index.html'), html, 'utf8');
      generated++;
    }
  }

  // Publish real static redirect pages for legacy clean URLs. This avoids sending old
  // property links through the site's 404.html fallback and preserves the new canonical URL.
  let legacyRedirectPages = 0;
  for (const [oldPath, redirect] of Object.entries(redirects)) {
    if (!redirect || !redirect.type || !redirect.slug) continue;
    const parts = String(oldPath).split('/').filter(Boolean);
    if (parts.length !== 3 || parts[0] !== 'properties') continue;
    const oldType = parts[1];
    const oldSlug = parts[2];
    const targetKey = `${redirect.type}/${redirect.slug}`;
    if (!CATEGORIES.some((category) => category.type === redirect.type)) continue;
    if (oldType === redirect.type && oldSlug === redirect.slug) continue;
    // Never overwrite a currently valid canonical property page.
    if (seen.has(`${oldType}/${oldSlug}`)) continue;
    const oldDir = path.join(ROOT, 'properties', oldType, oldSlug);
    await mkdir(oldDir, { recursive: true });
    await writeFile(
      path.join(oldDir, 'index.html'),
      buildLegacyRedirectHtml(oldPath, redirect.type, redirect.slug),
      'utf8'
    );
    legacyRedirectPages++;
  }
  console.log(`Generated ${legacyRedirectPages} legacy property redirect pages.`);

  // Keep the historical redirect map intact; only verify it can still be parsed.
  if (!redirects || typeof redirects !== 'object' || Array.isArray(redirects)) {
    throw new Error('property-url-redirects.json has an invalid format.');
  }
  const report = { generatedAt: new Date().toISOString(), total: generated, byCategory: counts };
  await writeFile(path.join(ROOT, 'property-pages-manifest.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
  if (generated < 600) throw new Error(`Expected around 625 property pages; only generated ${generated}. No publish should proceed.`);
  console.log(`Generated ${generated} real static index.html pages.`);
  console.log(JSON.stringify(report));
}

main().catch((error) => { console.error(error); process.exit(1); });
