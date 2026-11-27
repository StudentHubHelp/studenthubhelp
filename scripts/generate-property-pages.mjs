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

function firstImageUrl(record) {
  const keys = ['images', 'image_urls', 'gallery_images', 'gallery', 'photos', 'image', 'image_url', 'photo_url', 'property_images'];
  function find(value) {
    if (value == null || value === '') return '';
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = find(item);
        if (found) return found;
      }
      return '';
    }
    if (typeof value === 'object') return find(value.url || value.image_url || value.src || value.path || value.publicUrl);
    if (typeof value !== 'string') return '';
    const raw = value.trim();
    if (!raw) return '';
    try {
      const parsed = JSON.parse(raw);
      if (parsed !== raw) return find(parsed);
    } catch {}
    const parts = raw.split(/\r?\n|,\s*(?=https?:\/\/)/i);
    for (const part of parts) {
      const candidate = part.trim().replace(/^['"]|['"]$/g, '');
      try {
        const parsed = new URL(candidate);
        if (parsed.protocol === 'https:') return parsed.href;
      } catch {}
    }
    return '';
  }
  for (const key of keys) {
    const found = find(record?.[key]);
    if (found) return found;
  }
  return '';
}

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
function buildHtml({ type, slug, name, city, area, address, description, detailsTemplate, heroImage }) {
  const canonical = `${BASE_URL}/properties/${type}/${encodeURIComponent(slug)}/`;
  const categoryLabel = ({
    hostel: 'Hostel / PG',
    tiffin: 'Tiffin / Mess',
    library: 'Library',
    cafe: 'Cafe',
    bookstore: 'Bookstore'
  })[type] || 'Student service';
  const categoryUrl = ({
    hostel: '/pg-finder.html',
    tiffin: '/tiffin-finder.html',
    library: '/library-finder.html',
    cafe: '/cafe-finder.html',
    bookstore: '/bookstore-finder.html'
  })[type] || '/property-index.html';
  const propertyName = String(name || 'Property Details').replace(/\s+/g, ' ').trim();
  const titleLocation = [area, city].filter(Boolean).map(value => String(value).trim()).filter(Boolean).join(', ');
  const makeTitle = (suffixParts) => {
    const suffix = suffixParts.filter(Boolean).join(' | ');
    const maxNameLength = 60 - suffix.length - 3;
    if (maxNameLength < 8) return '';
    let shortName = propertyName;
    if (shortName.length > maxNameLength) {
      const visibleLength = Math.max(1, maxNameLength - 1);
      const candidate = shortName.slice(0, visibleLength).trimEnd();
      const wordSafe = candidate.replace(/\s+\S*$/, '').trim();
      shortName = `${wordSafe.length >= candidate.length * 0.65 ? wordSafe : candidate}…`;
    }
    return `${shortName} | ${suffix}`;
  };
  const titleSuffixCandidates = [
    [titleLocation, categoryLabel, 'StudentHubHelp'],
    [titleLocation, 'StudentHubHelp'],
    [city, categoryLabel, 'StudentHubHelp'],
    [city, 'StudentHubHelp'],
    [categoryLabel, 'StudentHubHelp'],
    ['StudentHubHelp']
  ];
  const fullNameTitle = titleSuffixCandidates.map(parts => {
    const suffix = parts.filter(Boolean).join(' | ');
    return propertyName.length + suffix.length + 3 <= 60 ? `${propertyName} | ${suffix}` : '';
  }).find(Boolean);
  const title = fullNameTitle || titleSuffixCandidates.map(makeTitle).find(Boolean) || 'StudentHubHelp';

  const locationText = [address, area, city].filter(Boolean).map(value => String(value).trim()).filter(Boolean).join(' · ');
  const sourceDescription = String(description || '').replace(/\s+/g, ' ').trim();
  const fallbackDescription = `${propertyName} ${categoryLabel} listing${locationText ? ` in ${locationText}` : ''}.`;
  const desc = `${sourceDescription || fallbackDescription} View available listing details on StudentHubHelp.`
    .replace(/\s+/g, ' ').trim().slice(0, 160);

  // Match the category-specific entity types already used by the live property-details app.
  const entityType = ({
    hostel: 'LodgingBusiness',
    tiffin: 'FoodEstablishment',
    library: 'Library',
    cafe: 'CafeOrCoffeeShop',
    bookstore: 'BookStore'
  })[type] || 'Thing';
  const entity = {
    '@type': (address || area || city) ? entityType : 'Thing',
    name: propertyName,
    description: desc,
    url: canonical
  };
  if (address || area || city) {
    entity.address = {
      '@type': 'PostalAddress',
      ...(address ? { streetAddress: String(address) } : {}),
      ...(city ? { addressLocality: String(city) } : {}),
      addressCountry: 'IN'
    };
  }
  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description: desc,
    url: canonical,
    mainEntity: entity
  }).replace(/</g, '\\u003c');
  const heroPreload = heroImage
    ? '<link rel="preload" as="image" href="' + escapeHtml(heroImage) + '" fetchpriority="high">\n'
    : '';

  const fallbackHtml = `<section class="card" id="seo-property-fallback" aria-label="Property information">
  <div class="section-kicker">STUDENTHUBHELP LISTING</div>
  <h2>${escapeHtml(propertyName)}</h2>
  <p><strong>Category:</strong> ${escapeHtml(categoryLabel)}</p>
  ${locationText ? `<p><strong>Location:</strong> ${escapeHtml(locationText)}</p>` : ''}
  <p>${escapeHtml(desc)}</p>
  <nav aria-label="Related StudentHubHelp pages">
    <a href="${categoryUrl}">Browse ${escapeHtml(categoryLabel)} listings</a> ·
    <a href="/property-index.html">Browse all student properties</a> ·
    <a href="/">StudentHubHelp home</a>
  </nav>
</section>`;

  const loadingSkeleton = `<div class="property-skeleton" role="status" aria-label="Loading property details">
  <section class="skeleton-hero">
    <div class="skeleton-gallery"><div class="skeleton-block skeleton-main-photo"></div><div class="skeleton-side"><div class="skeleton-block"></div><div class="skeleton-block"></div><div class="skeleton-block"></div><div class="skeleton-block"></div></div></div>
    <div class="skeleton-info">
      <div class="skeleton-title-row"><div class="skeleton-title-copy"><div class="skeleton-block skeleton-kicker"></div><h1 class="property-title skeleton-title-text">${escapeHtml(propertyName)}</h1><p class="skeleton-line-text">${escapeHtml([area, city].filter(Boolean).join(', '))}</p></div><div class="skeleton-block skeleton-verified"></div></div>
      <div class="skeleton-trust"><div class="skeleton-block"></div><div class="skeleton-block"></div><div class="skeleton-block"></div></div>
      <div class="skeleton-actions"><div class="skeleton-block"></div><div class="skeleton-block"></div><div class="skeleton-block"></div><div class="skeleton-block"></div></div>
    </div>
  </section>
  <div class="skeleton-content">
    <main class="skeleton-main">
      <section class="skeleton-card"><div class="skeleton-block skeleton-section-kicker"></div><div class="skeleton-block skeleton-section-title"></div><div class="skeleton-facts"><div class="skeleton-block"></div><div class="skeleton-block"></div><div class="skeleton-block"></div><div class="skeleton-block"></div><div class="skeleton-block"></div><div class="skeleton-block"></div></div></section>
      <section class="skeleton-card"><div class="skeleton-block skeleton-section-kicker"></div><div class="skeleton-block skeleton-section-title"></div><div class="skeleton-highlight-grid"><div class="skeleton-block"></div><div class="skeleton-block"></div><div class="skeleton-block"></div><div class="skeleton-block"></div></div></section>
      <section class="skeleton-card"><div class="skeleton-block skeleton-section-kicker"></div><div class="skeleton-block skeleton-section-title"></div><div class="skeleton-facts"><div class="skeleton-block"></div><div class="skeleton-block"></div><div class="skeleton-block"></div><div class="skeleton-block"></div></div></section>
      <section class="skeleton-card"><div class="skeleton-block skeleton-section-kicker"></div><div class="skeleton-block skeleton-section-title"></div><div class="skeleton-paragraph"><div class="skeleton-block"></div><div class="skeleton-block"></div><div class="skeleton-block"></div></div></section>
      <section class="skeleton-card skeleton-long-card"><div class="skeleton-block skeleton-section-kicker"></div><div class="skeleton-block skeleton-section-title"></div><div class="skeleton-facts"><div class="skeleton-block"></div><div class="skeleton-block"></div><div class="skeleton-block"></div><div class="skeleton-block"></div></div></section>
    </main>
    <aside class="skeleton-sidebar">
      <section class="skeleton-card"><div class="skeleton-block skeleton-section-kicker"></div><div class="skeleton-block skeleton-section-title"></div><div class="skeleton-block skeleton-status-pill"></div><div class="skeleton-sidebar-lines"><div class="skeleton-block"></div><div class="skeleton-block"></div><div class="skeleton-block"></div><div class="skeleton-block"></div><div class="skeleton-block"></div></div><div class="skeleton-block skeleton-sidebar-note"></div></section>
      <section class="skeleton-card"><div class="skeleton-block skeleton-section-kicker"></div><div class="skeleton-block skeleton-section-title"></div><div class="skeleton-block skeleton-contact-line"></div><div class="skeleton-block skeleton-contact-line"></div></section>
    </aside>
  </div>
  <span class="skeleton-status">Loading property details…</span>
</div>`;
  // Remove inherited favicon tags (including the old purple-N SVG) before rendering.
  const cleanTemplate = detailsTemplate
    // Property pages live at nested URLs: keep only the root-absolute mobile stylesheet.
    .replace(/<link\b(?=[^>]*\bhref\s*=\s*["']mobile\.css(?:\?[^"']*)?["'])[^>]*>\s*/gi, '')
    .replace(/<link\b(?=[^>]*\brel\s*=\s*["'](?:icon|shortcut icon|alternate icon)["'])[^>]*>\s*/gi, '')
    .replace(/<link\b(?=[^>]*\brel\s*=\s*["']apple-touch-icon["'])[^>]*>\s*/gi, '')
    .replace(/<meta\b(?=[^>]*\bproperty\s*=\s*["']og:image:secure_url["'])[^>]*>\s*/gi, '')
    .replace(/<meta\b(?=[^>]*\bproperty\s*=\s*["']og:image:alt["'])[^>]*>\s*/gi, '');
  const withJsClass = cleanTemplate.replace(/<html([^>]*)>/i, (_match, attributes) =>
    '<html' + attributes + ' class="js">');
  const renderedTemplate = withJsClass.replace(/<head([^>]*)>/i, (_match, attributes) =>
    '<head' + attributes + '>\n' +
    '<link rel="icon" type="image/png" href="/logo.png">\n' +
    '<link rel="shortcut icon" type="image/png" href="/logo.png">\n' +
    '<link rel="apple-touch-icon" href="/logo.png">\n' +
    '<meta property="og:image:secure_url" content="https://studenthubhelp.in/logo.png">\n' +
    '<meta property="og:image:alt" content="StudentHubHelp logo">\\n' + heroPreload);
  return renderedTemplate
    .replace(/<!--PROPERTY_APP_START-->[\s\S]*?<!--PROPERTY_APP_END-->/i, `<!--PROPERTY_APP_START--><div id="app" aria-busy="true">${loadingSkeleton}</div><section class="seo-fallback-content" aria-hidden="true" aria-label="Property information">${fallbackHtml}</section><!--PROPERTY_APP_END-->`)
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`)
    .replace(/<meta id="metaDescription" name="description" content="[^"]*">/i, `<meta id="metaDescription" name="description" content="${escapeHtml(desc)}">`)
    // Clean property URLs must be indexable in the first HTML response; do not rely on JS to remove noindex.
    .replace(/<meta\b(?=[^>]*\bname\s*=\s*["']robots["'])[^>]*>/i, '<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">')
    .replace(/<meta id="ogTitle" property="og:title" content="[^"]*">/i, `<meta id="ogTitle" property="og:title" content="${escapeHtml(title)}">`)
    .replace(/<meta id="ogDescription" property="og:description" content="[^"]*">/i, `<meta id="ogDescription" property="og:description" content="${escapeHtml(desc)}">`)
    .replace(/<meta id="ogUrl" property="og:url" content="[^"]*">/i, `<meta id="ogUrl" property="og:url" content="${escapeHtml(canonical)}">`)
    // Keep the public site logo as the server-rendered social preview image. Social
    // crawlers often do not execute JavaScript, so these tags must be correct in HTML.
    .replace(/<meta id="ogImage" property="og:image" content="[^"]*">/i, '<meta id="ogImage" property="og:image" content="https://studenthubhelp.in/logo.png">')
    .replace(/<meta id="twitterImage" name="twitter:image" content="[^"]*">/i, '<meta id="twitterImage" name="twitter:image" content="https://studenthubhelp.in/logo.png">')
    .replace(/<meta id="twitterTitle" name="twitter:title" content="[^"]*">/i, `<meta id="twitterTitle" name="twitter:title" content="${escapeHtml(title)}">`)
    .replace(/<meta id="twitterDescription" name="twitter:description" content="[^"]*">/i, `<meta id="twitterDescription" name="twitter:description" content="${escapeHtml(desc)}">`)
    .replace(/<script type="application\/ld\+json" id="baseSchema">[\s\S]*?<\/script>/i, `<script type="application/ld+json" id="baseSchema">\n${schema}\n</script>`)
    .replace(/<link id="canonicalLink" rel="canonical" href="[^"]*">/i, `<link id="canonicalLink" rel="canonical" href="${escapeHtml(canonical)}">`);
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
<meta http-equiv="refresh" content="0;url=${escapeHtml(canonical)}">
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
  const recordKeys = new Set();
  const redirectedSources = new Set();
  const generatedUrls = [];
  const redirectedUrls = [];
  const counts = Object.fromEntries(CATEGORIES.map(({ type }) => [type, 0]));
  let generated = 0;
  const detailsTemplate = await readFile(path.join(ROOT, 'property-details.html'), 'utf8');

  for (const { table, type } of CATEGORIES) {
    const records = await fetchAll(table);
    console.log(`${table}: fetched ${records.length}`);
    for (const row of records) {
      const slug = String(row.slug || '').trim();
      if (!slug) throw new Error(`Missing slug in ${table}, id=${row.id}; refusing to publish incomplete property paths.`);
      const key = `${type}/${slug}`;
      if (recordKeys.has(key)) throw new Error(`Duplicate static property URL: ${key}`);
      recordKeys.add(key);

      // A URL explicitly mapped to another canonical slug must never be emitted as
      // a second indexable property page, even when the legacy row is still active.
      const mappedRedirect = redirects[`/properties/${type}/${slug}/`];
      if (mappedRedirect && mappedRedirect.type && mappedRedirect.slug) {
        const targetKey = `${mappedRedirect.type}/${mappedRedirect.slug}`;
        if (targetKey !== key) {
          redirectedSources.add(key);
          continue;
        }
      }

      seen.add(key);
      const dir = path.join(ROOT, 'properties', type, slug);
      await mkdir(dir, { recursive: true });
      const name = row.service_name || row.name || row.title || 'Property Details';
      const html = buildHtml({
        type, slug, name,
        city: row.city,
        area: row.area,
        address: row.address,
        description: row.description || row.about || row.details,
        detailsTemplate,
        heroImage: firstImageUrl(row)
      });
      if (/document\s*\.\s*(?:write|open)\s*\(/i.test(html)) {
        throw new Error(`Unsafe document.write/document.open found in generated page: ${key}`);
      }
      await writeFile(path.join(dir, 'index.html'), html, 'utf8');
      generated++;
      counts[type]++;
      generatedUrls.push(`${BASE_URL}/properties/${type}/${encodeURIComponent(slug)}/`);
    }
  }

  // Every active legacy source must point to a current generated canonical target.
  for (const sourceKey of redirectedSources) {
    const [sourceType, sourceSlug] = sourceKey.split('/');
    const redirect = redirects[`/properties/${sourceType}/${sourceSlug}/`];
    const targetKey = `${redirect.type}/${redirect.slug}`;
    if (!seen.has(targetKey)) {
      throw new Error(`Active legacy property ${sourceKey} maps to a missing canonical target: ${targetKey}`);
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
    const sourceKey = `${oldType}/${oldSlug}`;
    // Do not create a redirect to a canonical page that is no longer active.
    if (!seen.has(targetKey)) continue;
    if (seen.has(sourceKey)) continue;
    const oldDir = path.join(ROOT, 'properties', oldType, oldSlug);
    await mkdir(oldDir, { recursive: true });
    await writeFile(
      path.join(oldDir, 'index.html'),
      buildLegacyRedirectHtml(oldPath, redirect.type, redirect.slug),
      'utf8'
    );
    legacyRedirectPages++;
    redirectedUrls.push({
      from: `${BASE_URL}${oldPath}`,
      to: `${BASE_URL}/properties/${redirect.type}/${encodeURIComponent(redirect.slug)}/`
    });
  }
  console.log(`Generated ${legacyRedirectPages} legacy property redirect pages.`);

  // Keep the historical redirect map intact; only verify it can still be parsed.
  if (!redirects || typeof redirects !== 'object' || Array.isArray(redirects)) {
    throw new Error('property-url-redirects.json has an invalid format.');
  }
  generatedUrls.sort();
  redirectedUrls.sort((a, b) => a.from.localeCompare(b.from));
  const report = {
    generatedAt: new Date().toISOString(),
    total: generated,
    byCategory: counts,
    generatedUrls,
    redirectedUrls
  };
  await writeFile(path.join(ROOT, 'property-pages-manifest.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
  if (generated < 600) throw new Error(`Expected around 625 property pages; only generated ${generated}. No publish should proceed.`);
  console.log(`Generated ${generated} real static index.html pages.`);
  console.log(JSON.stringify(report));
}

main().catch((error) => { console.error(error); process.exit(1); });
