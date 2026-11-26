## GM daily website activity reporting

Daily website activity requests, including Hinglish instructions such as "aaj website me kya hua", are routed to exactly three roles: DLM for property additions/updates/removal evidence, DAR for booking records and the Hindi Owner summary, and QC for an independent re-query and validation.

The report uses an explicit date from the task when supplied; otherwise it anchors the Asia/Kolkata calendar day to the task's creation timestamp so a queued task does not silently roll into the next day. Queries use exact-count pagination across canonical listing tables plus the PG legacy table. It reads only non-sensitive booking fields. created_at is used for new listings; updated_at is a row-touch signal, not proof of which fields changed. The PG legacy table has no updated_at column. Removal counts are based on available audit events; no matching event is explicitly not treated as proof of zero removals. Missing source data is labelled unavailable, never zero.

This workflow is read-only against public website data and keeps all results as drafts requiring Owner review. No property, booking, authentication, public website, RLS, policy or database schema changes are made.
