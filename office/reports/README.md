# Phase 10 — Office Dashboard

- Owner dashboard combines task KPIs, General Manager plans, employee draft outputs, approvals, integration readiness, Gemini quota guard and aggregate operational reports.
- Reports are aggregate-only: task statuses, employee status counts, provider usage, token totals, estimated costs, daily usage and recent task event messages.
- No student-level listing data or private contact information is included in reports.
- Gemini quota status is read through the server-side gateway status action; the browser never receives the Gemini key.
- Reports API requires a validated Supabase session, AAL2 and active Owner check; the backing report RPC is service_role-only.
- Responsive layout uses six desktop KPIs, stacked mobile cards, quota controls, seven-day usage bars and activity history.
- Phase 10 remains observational; it does not execute integrations or start task workers.
