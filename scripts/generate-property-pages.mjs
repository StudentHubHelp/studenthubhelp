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

// Always regenerate canonical property pages from the shared details app; do not retain legacy redirect shells.
function buildHtml({ type, slug, name, city, address, description, detailsTemplate }) {
  const canonical = `${BASE_URL}/properties/${type}/${encodeURIComponent(slug)}/`;
  const title = `${name || 'Property Details'} | StudentHubHelp`;
  const desc = String(description || [name, address, city].filter(Boolean).join(' — ') || 'View property details on StudentHubHelp.')
    .replace(/\s+/g, ' ').trim().slice(0, 155);

  // Render the real property-details app at the clean URL. property-details.html
  // already resolves category + slug from the pathname, so an intermediate redirect
  // shell is unnecessary. Generated pages should render this app directly, without document.write.
  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    url: canonical
  }).replace(/</g, '\\u003c');

  // Remove inherited favicon tags (including the old purple-N SVG) before rendering.
  const cleanTemplate = detailsTemplate
    .replace(/<link\b(?=[^>]*\brel\s*=\s*["'](?:icon|shortcut icon|alternate icon)["'])[^>]*>\s*/gi, '')
    .replace(/<link\b(?=[^>]*\brel\s*=\s*["']apple-touch-icon["'])[^>]*>\s*/gi, '');
  const renderedTemplate = cleanTemplate.replace(/<head([^>]*)>/i, (_match, attributes) =>
    '<head' + attributes + '>\n' +
    '<link rel="icon" type="image/png" href="/logo.png">\n' +
    '<link rel="shortcut icon" type="image/png" href="/logo.png">\n' +
    '<link rel="apple-touch-icon" href="/logo.png">\n' +
    '<meta property="og:image:secure_url" content="https://studenthubhelp.in/logo.png">\n' +
    '<meta property="og:image:alt" content="StudentHubHelp logo">');
  return renderedTemplate
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`)
    .replace(/<meta id="metaDescription" name="description" content="[^"]*">/i, `<meta id="metaDescription" name="description" content="${escapeHtml(desc)}">`)
    .replace(/<meta id="ogTitle" property="og:title" content="[^"]*">/i, `<meta id="ogTitle" property="og:title" content="${escapeHtml(title)}">`)
    .replace(/<meta id="ogDescription" property="og:description" content="[^"]*">/i, `<meta id="ogDescription" property="og:description" content="${escapeHtml(desc)}">`)
    .replace(/<meta id="ogUrl" property="og:url" content="[^"]*">/i, `<meta id="ogUrl" property="og:url" content="${escapeHtml(canonical)}">`)
    // Keep the public site logo as the server-rendered social preview image. Social
    // crawlers often do not execute JavaScript, so these tags must be correct in HTML.
    .replace(/<meta id="ogImage" property="og:image" content="[^"]*">/i, '<meta id="ogImage" property="og:image" content="https://studenthubhelp.in/logo.png">')
    .replace(/<meta id="twitterImage" name="twitter:image" content="[^"]*">/i, '<meta id="twitterImage" name="twitter:image" content="https://studenthubhelp.in/logo.png">')
    .replace(/<meta id="twitterTitle" name="twitter:title" content="[^"]*">/i, `<meta id="twitterTitle" name="twitter:title" content="${escapeHtml(title)}">`)
    .replace(/<meta id="twitterDescription" name="twitter:description" content="[^"]*">/i, `<meta id="twitterDescription" name="twitter:description" content="${escapeHtml(desc)}">`)
    .replace(/<script id="propertySchema" type="application\/ld\+json">[\s\S]*?<\/script>/i, `<script id="propertySchema" type="application/ld+json">\n${schema}\n</script>`)
    .replace(/<title>[^<]*<\/title>/i, (tag) => tag + `\n<link id="canonicalLink" rel="canonical" href="${escapeHtml(canonical)}">`);
}
function buildLegacyRedirectHtml(oldPath, targetType, targetSlug) {
  const canonical = `${BASE_URL}/properties/${targetType}/${encodeURIComponent(targetSlug)}/`;
  return `<!doctype html>
<html lang="en-IN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,follow">
<link rel="icon" type="image/png" href="/logo.png?v=site-icon-20261026">
<link rel="apple-touch-icon" href="/logo.png?v=site-icon-20261026">
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
  const detailsTemplate = await readFile(path.join(ROOT, 'property-details.html'), 'utf8');

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
        description: row.description || row.about || row.details,
        detailsTemplate
      });
      if (/document\s*\.\s*(?:write|open)\s*\(/i.test(html)) {
        throw new Error(`Unsafe document.write/document.open found in generated page: ${key}`);
      }
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
