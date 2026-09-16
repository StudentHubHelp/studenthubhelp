import { readdir, readFile, writeFile } from 'node:fs/promises';

const BASE = (process.env.BASE_URL || 'https://studenthubhelp.github.io/studenthubhelp/').replace(/\/+$/, '') + '/';
const SITE_ID = `${BASE}#website`;
const ORG_ID = `${BASE}#organization`;

const excluded = new Set([
  'auth.html', 'property-details.html', 'global-search.html', '404.html', 'add-listing.html',
  'owner-dashboard.html', 'student-dashboard.html', 'partner-dashboard.html'
]);

const finderMap = {
  'pg-finder.html': { name: 'Hostel and PG Finder', service: 'Hostel and PG discovery for students' },
  'tiffin-finder.html': { name: 'Tiffin and Mess Finder', service: 'Tiffin and mess discovery for students' },
  'library-finder.html': { name: 'Library Finder', service: 'Library and study-space discovery for students' },
  'cafe-finder.html': { name: 'Cafe Finder', service: 'Student-friendly cafe discovery' },
  'bookstore-finder.html': { name: 'Bookstore Finder', service: 'Bookstore and study-supplies discovery' }
};

function attr(text, name) {
  const re = new RegExp(`<[^>]+(?:name|property)=["']${name}["'][^>]*content=["']([^"']*)["']|<[^>]+content=["']([^"']*)["'][^>]*(?:name|property)=["']${name}["']`, 'i');
  const m = text.match(re);
  return (m?.[1] || m?.[2] || '').replace(/\s+/g, ' ').trim();
}

function canonical(text, name) {
  const m = text.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i) || text.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["'][^>]*>/i);
  if (m?.[1]) return m[1].trim();
  return name === 'index.html' ? BASE : new URL(name, BASE).href;
}

function cleanText(value) {
  return String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasNoindex(text) {
  return /<meta\b[^>]*(?:name|http-equiv)=["'](?:robots|googlebot|googlebot-news)["'][^>]*content=["'][^"']*\bnoindex\b/i.test(text)
    || /<meta\b[^>]*content=["'][^"']*\bnoindex\b[^"']*["'][^>]*(?:name|http-equiv)=["'](?:robots|googlebot|googlebot-news)["']/i.test(text);
}

function escapeJson(value) {
  return JSON.stringify(value, null, 2);
}

function buildSchema(name, html) {
  const url = canonical(html, name);
  const title = cleanText(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]) || 'StudentHubHelp';
  const description = attr(html, 'description') || title;
  const finder = finderMap[name];
  const pageType = finder ? 'CollectionPage' : 'WebPage';
  const serviceId = finder
    ? `${BASE}#${name.replace(/-finder\.html$/, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-service`
    : null;

  const nodes = [
    {
      '@type': pageType,
      '@id': `${url}#webpage`,
      url,
      name: title,
      description,
      inLanguage: 'en-IN',
      isPartOf: { '@id': SITE_ID },
      publisher: { '@id': ORG_ID }
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${url}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'StudentHubHelp', item: BASE },
        { '@type': 'ListItem', position: 2, name: title.replace(/\s*[|•].*$/, '').trim() || title, item: url }
      ]
    }
  ];

  if (finder) {
    nodes[0].about = { '@id': serviceId };
    nodes.push({
      '@type': 'Service',
      '@id': serviceId,
      name: finder.name,
      serviceType: finder.service,
      provider: { '@id': ORG_ID },
      areaServed: { '@type': 'Country', name: 'India' },
      audience: { '@type': 'Audience', audienceType: 'Students and parents' },
      availableChannel: { '@type': 'ServiceChannel', serviceUrl: url }
    });
  }

  const details = [...html.matchAll(/<details\b[^>]*>[\s\S]*?<\/details>/gi)];
  const hasFaqHeading = /frequently\s+asked\s+questions|\bFAQs?\b/i.test(cleanText(html));
  if (details.length && hasFaqHeading && /guide|safety/i.test(name)) {
    const questions = [];
    for (const match of details.slice(0, 20)) {
      const block = match[0];
      const question = cleanText(block.match(/<summary\b[^>]*>([\s\S]*?)<\/summary>/i)?.[1]);
      const answer = cleanText(block.replace(/<summary\b[^>]*>[\s\S]*?<\/summary>/i, ''));
      if (question && answer) {
        questions.push({
          '@type': 'Question',
          name: question,
          acceptedAnswer: { '@type': 'Answer', text: answer }
        });
      }
    }
    if (questions.length) {
      nodes.push({
        '@type': 'FAQPage',
        '@id': `${url}#faq`,
        url,
        mainEntity: questions
      });
    }
  }

  return {
    '@context': 'https://schema.org',
    '@graph': nodes
  };
}

for (const name of await readdir('.')) {
  if (!name.toLowerCase().endsWith('.html') || excluded.has(name)) continue;
  const path = name;
  let html = await readFile(path, 'utf8');
  if (hasNoindex(html)) continue;

  const schema = `<script id="studenthubhelp-aeo-schema" type="application/ld+json">\n${escapeJson(buildSchema(name, html))}\n</script>\n`;
  const marker = /<script id="studenthubhelp-aeo-schema" type="application\/ld\+json">[\s\S]*?<\/script>\s*/i;
  if (marker.test(html)) html = html.replace(marker, schema);
  else if (/<\/head>/i.test(html)) html = html.replace(/<\/head>/i, `${schema}</head>`);
  else continue;

  await writeFile(path, html, 'utf8');
}

console.log('Advanced SEO/AEO schema layer generated for indexable root HTML pages.');
