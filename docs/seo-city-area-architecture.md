# Ahmedabad and Hyderabad area-guide architecture

Updated: 2026-11-28

## URL hierarchy
- City roots remain the existing canonical pages: `/ahmedabad.html` and `/hyderabad.html`.
- Evidence-led locality guides use `/{city}/areas/{area}/`.
- Existing listing-driven SEO folders such as `/{city}/{category}/` and `/{city}/{area}/` remain separate and continue to require the configured active-listing threshold.
- Area guides do not create category/area combinations while the city has no published listings.

## Candidate guide set
Ahmedabad: Navrangpura, Vastrapur, Paldi, Thaltej, Vaishnodevi Circle / SG Highway.
Hyderabad: Gachibowli, Kukatpally, Ameerpet & S.R. Nagar (combined), Madhapur, Dilsukhnagar / Malakpet (combined), Mehdipatnam.

## Evidence and listing policy
- Every guide links to its supporting source URL and states exactly what the evidence establishes.
- Official institution addresses establish an institutional destination only; they do not establish nearby rental stock, vacancy, rent, commute time or student density.
- Historical area-cluster research is contextual only, not current supply data.
- Only active published StudentHubHelp listings can appear in listing-driven pages. No placeholder cards, invented prices, counts or travel distances are permitted.

## Indexability gate
All generated area guides currently use `noindex,follow` and self-referencing canonicals. They are intentionally excluded from XML sitemaps. A human editorial review must confirm original, current and sufficiently useful locality-specific content before any guide is changed to indexable. Thin or duplicate pages remain noindex or are not generated.

## Shared city navigation
All 14 existing city pages link to all 14 canonical city roots in their footer. Ahmedabad and Hyderabad city area cards link to their evidence-led area guides.

## Out of scope
No homepage, global/mobile CSS, Supabase schema/RLS/policies, admin dashboard, chatbot, login/email, or unrelated listing-page changes.
