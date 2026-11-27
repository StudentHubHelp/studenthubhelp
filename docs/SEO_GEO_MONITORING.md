# StudentHubHelp SEO + GEO Monitoring

## Baseline snapshot

Source: Google Search Console, Search type: Web, India, 28-day window 2026-10-28 to 2026-11-24.

| Metric | Baseline |
|---|---:|
| Clicks | 43 |
| Impressions | 3,997 |
| CTR | 1.08% |
| Average position | 9.9 |

Representative discovery queries included student hostels in Delhi, Patna and Vadodara, libraries near the searcher, District Library Velachery, and boys hostels on Sikar's Piprali Road. These are baseline examples, not ranking guarantees.

## Technical audit

- A first live-site audit crawled 50 pages from a sitemap containing approximately 746 URLs; this is a sample, not a full crawl.
- A follow-up audit has been started with a 1,000-page crawl limit. Its findings must be reviewed before claiming the live site is fully clean.
- The audit and GSC baseline above describe the production site before the SEO/GEO branch is merged.

## GEO visibility tracking

Prepared a 15-prompt neutral query set across:
1. Hostels and PG accommodation.
2. Tiffin/mess, libraries, cafes and bookstores.
3. Coaching, college, station and landmark discovery.

Proposed engines: ChatGPT, Gemini, Google AI Overviews and Google AI Mode.

OpenSEO estimated weekly tracking at approximately $0.12 per check / $0.48 per month for this 15-prompt, four-engine configuration. The tracker is not activated until the owner approves recurring checks. Claude and Perplexity are excluded from the low-cost initial configuration.

## Weekly review checklist

- Compare the last 28 days of clicks, impressions, CTR and average position against the previous 28 days in Google Search Console.
- Review query and landing-page changes for each category and city.
- Check sitemap health, canonical URLs, indexability, redirects and newly generated city/category/landmark pages.
- Review high-impression, low-CTR queries and improve titles/descriptions only where the page content supports the change.
- Review listing-coordinate anomalies and avoid using unverified coordinates for distance claims.
- Once approved and enabled, compare AI mentions/citations by prompt and engine; keep neutral prompts unchanged between reporting periods.
- Record deployments, indexing requests and material content changes with dates.

## Guardrails

- Do not generate pages for cities, areas or landmarks without sufficient active listing data.
- Do not invent reviews, ratings, prices, amenities, exact distances or verification claims.
- Keep StudentHubHelp's public listing data as the source of truth.
- Do not change Supabase tables, RLS, policies or admin permissions as part of SEO work without explicit approval.
- Review production results after deployment; branch CI passing does not mean Google has indexed the new pages.

## Initial neutral prompt set

### Hostels and PGs
1. What are the best hostels and PGs for students in Delhi?
2. Where can students find boys hostels near coaching institutes in Sikar?
3. How do I compare student hostels and PG accommodation in Kota?
4. Where can students find affordable PG accommodation in Patna?
5. How can I find a hostel near a specific college or coaching institute in India?

### Study and daily services
6. Where can students find libraries and study spaces near colleges in Bengaluru?
7. How can students find libraries near coaching institutes in Chennai?
8. Where can students find tiffin and mess services near coaching areas in Sikar?
9. Which cafes near colleges are suitable for studying and Wi-Fi?
10. Where can students find bookstores and stationery shops near universities?

### Landmark and local discovery
11. How can students find hostels, libraries and food services near a coaching institute?
12. What websites help students discover local hostels, PGs and daily services in Indian cities?
13. How can I search for student accommodation near a railway station or bus stand?
14. What should students check before choosing a hostel near a coaching centre?
15. How can students find student services by city, locality and landmark?

## Mobile Lighthouse baseline (production, 2026-11-27)

The Lighthouse-enabled sample tested four pages in total; mobile results were available for the homepage and one property detail page. This is a sample, not a full-site performance audit.

| Page | Performance | Accessibility | Best practices | SEO | LCP | CLS |
|---|---:|---:|---:|---:|---:|---:|
| Homepage | 89 | 93 | 100 | 100 | 3.21 s | 0.009 |
| Property detail sample | 55 | 96 | 100 | 100 | 11.97 s | 0.394 |

High-impact findings included oversized logo delivery on the property detail page, image delivery/cache lifetime opportunities, render-blocking CSS and Google Fonts, and homepage contrast/touch-target issues. The property page's visible header logo now uses the existing optimized WebP asset in the SEO/GEO branch; homepage contrast and review-dot touch targets have also been improved. These changes require a post-deployment Lighthouse rerun before their impact can be claimed.

The audit observed `/mobile.css` as a render-blocking stylesheet; the file exists in the repository, so this audit did not establish a 404 for it.

## Branch validation snapshot (2026-11-27)

- 607 verified active listing records were used as the source for the latest location-page generation.
- 84 generated SEO landing pages are published across 11 city hubs, 29 category pages, 26 locality pages and 18 coaching/landmark pages.
- XML sitemap validation found 746 unique URLs: 620 property URLs and 126 other page URLs.
- 208 locality alias paths now have GitHub Pages-compatible static redirect stubs with an immediate meta refresh, canonical target and JavaScript fallback. The accompanying 416 slash/no-slash rules in `_redirects` are retained for Cloudflare Pages compatibility. **GitHub Pages does not apply `_redirects` as HTTP 301 rules**, so these current stubs are client-side/HTML redirects, not server-side 301 responses.
- Sitemap validation also verifies each redirect stub and its destination.
- Search, nearby-search and sitemap-generation workflows passed; the GitHub Pages build for the generated sitemap commit is being finalized.
- Google indexing and AI citations remain unverified until crawlers revisit the deployed URLs.
