// SEO/GEO: schema generation is content-only; no visible page layout is changed.
// Property schema is emitted by js/property-seo-upgrade.js and checked in that source file.
// The main-branch workflow owns insertion of the site graph and AEO JSON-LD blocks.
// Trigger the main-branch SEO indexing workflow after its HTML closing-tag validator was corrected.
import { readdir, readFile, writeFile } from 'node:fs/promises';

const BASE = (process.env.BASE_URL || 'https://studenthubhelp.in/').replace(/\/+$/, '') + '/';
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
    .replace(/&#39;|&apos;|&#x27;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
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
  const isHub = name === 'student-cities.html';
  const isCityPage = /^(sikar|bengaluru|chennai|kota|delhi|patna|jhunjhunu|pune|gurugram|coimbatore|jaipur|lucknow|ahmedabad|hyderabad)\.html$/i.test(name);
  const pageType = finder || isHub || isCityPage ? 'CollectionPage' : 'WebPage';
  const serviceId = finder ? BASE + '#' + name.replace(/-finder\.html$/, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '-service' : null;

  const nodes = [];
  if (isHub) {
    nodes.push({
      '@type': 'Organization',
      '@id': ORG_ID,
      name: 'StudentHubHelp',
      url: BASE,
      logo: { '@type': 'ImageObject', url: BASE + 'logo.png' },
      areaServed: { '@type': 'Country', name: 'India' },
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: 'support@studenthubhelp.in',
        areaServed: 'IN',
        availableLanguage: ['en', 'hi']
      },
      sameAs: ['https://www.instagram.com/studenthubhelp/']
    });
    nodes.push({
      '@type': 'WebSite',
      '@id': SITE_ID,
      url: BASE,
      name: 'StudentHubHelp',
      publisher: { '@id': ORG_ID },
      inLanguage: 'en-IN',
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: BASE + 'global-search.html?q={search_term_string}'
        },
        'query-input': 'required name=search_term_string'
      }
    });
  }

  const pageNode = {
    '@type': pageType,
    '@id': url + '#webpage',
    url,
    name: title,
    description,
    inLanguage: 'en-IN',
    isPartOf: { '@id': SITE_ID },
    publisher: { '@id': ORG_ID },
    breadcrumb: { '@id': url + '#breadcrumb' }
  };
  if (isHub) pageNode.mainEntity = { '@id': url + '#cities' };
  nodes.push(pageNode);

  const crumbNav = html.match(/<nav\b[^>]*(?:aria-label=["']Breadcrumb["']|class=["'][^"']*breadcrumb[^"']*)[^>]*>([\s\S]*?)<\/nav>/i);
  const crumbItems = [];
  if (crumbNav) {
    for (const match of crumbNav[1].matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
      try {
        crumbItems.push({
          '@type': 'ListItem',
          position: crumbItems.length + 1,
          name: cleanText(match[2]),
          item: new URL(match[1], BASE).href
        });
      } catch {}
    }
    const current = crumbNav[1].match(/<(?:span|strong)[^>]*aria-current=["']page["'][^>]*>([\s\S]*?)<\/(?:span|strong)>/i);
    if (current) {
      crumbItems.push({
        '@type': 'ListItem',
        position: crumbItems.length + 1,
        name: cleanText(current[1]),
        item: url
      });
    }
  }
  if (!crumbItems.length) {
    if (isCityPage) {
      const citySlug = name.replace(/\.html$/i, '');
      const cityName = citySlug.charAt(0).toUpperCase() + citySlug.slice(1);
      crumbItems.push(
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
        { '@type': 'ListItem', position: 2, name: 'Student Cities', item: BASE + 'student-cities.html' },
        { '@type': 'ListItem', position: 3, name: cityName, item: url }
      );
    } else {
      crumbItems.push(
        { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
        { '@type': 'ListItem', position: 2, name: title.replace(/\s*[|•].*$/, '').trim() || title, item: url }
      );
    }
  }
  nodes.push({
    '@type': 'BreadcrumbList',
    '@id': url + '#breadcrumb',
    itemListElement: crumbItems
  });

  if (isHub) {
    const cityCards = [...html.matchAll(/<article\b[^>]*class=["'][^"']*city-card[^"']*["'][^>]*>([\s\S]*?)<\/article>/gi)];
    const cityItems = cityCards.map((match, index) => {
      const block = match[1];
      const link = block.match(/<h3\b[^>]*>[\s\S]*?<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i)
        || block.match(/<a\b[^>]*href=["']([^"']+\.html)["'][^>]*>([\s\S]*?)<\/a>/i);
      if (!link) return null;
      try {
        return {
          '@type': 'ListItem',
          position: index + 1,
          item: {
            '@type': 'WebPage',
            name: cleanText(link[2]) || cleanText(block.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/i)?.[1]),
            url: new URL(link[1], BASE).href
          }
        };
      } catch {
        return null;
      }
    }).filter(Boolean);
    if (cityItems.length) {
      nodes.push({
        '@type': 'ItemList',
        '@id': url + '#cities',
        name: 'StudentHubHelp city guide pages',
        numberOfItems: cityItems.length,
        itemListElement: cityItems
      });
    }
  } else if (isCityPage) {
    const listingCards = [...html.matchAll(/<article\b[^>]*class=["'][^"']*listing-card[^"']*["'][^>]*>([\s\S]*?)<\/article>/gi)];
    const listingItems = listingCards.map((match, index) => {
      const block = match[1];
      if (/<span\b[^>]*class=["'][^"']*status[^"']*["'][^>]*>\s*External\s*<\/span>/i.test(block)) return null;
      const name = cleanText(block.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/i)?.[1]);
      const link = block.match(/<a\b[^>]*class=["'][^"']*detail-link[^"']*["'][^>]*href=["']([^"']+)["']/i)
        || block.match(/<a\b[^>]*href=["']([^"']*properties\/[^"']+)["']/i);
      if (!name || !link) return null;
      try {
        return {
          '@type': 'ListItem',
          position: index + 1,
          item: {
            '@type': 'Thing',
            name,
            url: new URL(link[1], BASE).href
          }
        };
      } catch {
        return null;
      }
    }).filter(Boolean);
    if (listingItems.length) {
      const itemListId = url + '#listings';
      pageNode.mainEntity = { '@id': itemListId };
      nodes.push({
        '@type': 'ItemList',
        '@id': itemListId,
        name: 'Selected StudentHubHelp listings in ' + title.replace(/\s*[|•].*$/, '').trim(),
        description: 'Selected static listing cards shown on this city guide; this is not the complete city inventory.',
        numberOfItems: listingItems.length,
        itemListElement: listingItems
      });
    }
  }

  if (finder) {
    pageNode.about = { '@id': serviceId };
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

  const details = [...html.matchAll(/<details\b[^>]*>([\s\S]*?)<\/details>/gi)];
  const hasFaqHeading = /frequently\s+asked\s+questions|\bFAQs?\b/i.test(cleanText(html));
  if (details.length && hasFaqHeading) {
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
        '@id': url + '#faq',
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
