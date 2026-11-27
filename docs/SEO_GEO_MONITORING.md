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
