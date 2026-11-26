# Advanced AI Office Employees — A–F Upgrade

This upgrade is isolated to office/. It does not modify the public website, public listing rows, booking data, Supabase schema, RLS or existing authorization policies.

## Phase A — Read-only audit
Status: completed in the preceding audit.
- Confirmed the eight specialist roles and General Manager.
- Found deterministic employee templates, limited read-only context, a DCE provider hard block, keyword-driven GM routing and queued task records whose lifecycle is intentionally separate from draft generation.
- Confirmed that the Gemini gateway is fail-closed and that external integration execution is disabled.

## Phase B — Specialist intelligence
Status: code implemented; live Gemini verification pending.
- Added shared role-specific instructions for all eight specialist employees and the General Manager.
- Employee drafts and GM plans can use Gemini only through the existing Owner-authenticated office-gemini-gateway.
- The helper checks gateway readiness and secret presence before generation. It does not contain or expose provider credentials.
- Strict JSON contracts, role allowlists, owner-approval requirements and proposal-only boundaries remain enforced.
- Invalid model output falls back to the deterministic draft/plan.
- The dashboard labels whether a saved employee draft used Gemini Free Tier or deterministic fallback.
- Evidence-critical daily activity, exact-count and consolidated-QA tasks stay deterministic so machine-readable evidence is not rewritten by a model.
- QC model output cannot promote a verdict above the deterministic evidence verdict.

## Phase C — Read-only tools and evidence
Status: partially implemented; provider-dependent research remains gated.
- DLM now paginates across all five canonical listing tables, up to 10,000 rows per category, and reports exact scan coverage, missing-field counts and duplicate candidates.
- DLM excludes phone, email, owner identity and other contact fields from its review payload.
- DCE can make at most one Tavily Basic search per task when TAVILY_API_KEY is configured (up to five snippets); advanced search, raw extraction and crawling are disabled. Relevant first-party pages are added separately. Missing key/provider errors fall back to first-party-only evidence. Tavily account billing/credit plan remains an external account setting.
- Other specialists use only the bounded public repository/site and read-only Supabase evidence currently supplied to their workflows.

## Phase D — GM management
Status: code implemented; live AI planning verification pending.
- GM can use Gemini for Hindi/Hinglish task interpretation and ordered role planning when the gateway is ready.
- Every generated plan is validated against registered role keys.
- Plans that request external actions are rejected.
- Mandatory daily activity and consolidated QA role assignments are enforced by deterministic rules.
- Deterministic planning remains the fallback when Gemini is disabled, unavailable, over quota or returns invalid output.
- Task status is not falsely marked completed merely because drafts were generated; owner review remains required.

## Phase E — Independent QC
Status: safeguards implemented; end-to-end acceptance testing pending.
- QC receives prior drafts and task-specific evidence.
- Evidence-critical count and daily activity checks continue to run independent deterministic queries.
- Gemini can add analytical review for eligible tasks, but cannot upgrade a deterministic FAIL/INCONCLUSIVE/qualified verdict to a stronger PASS.
- QC remains a reviewer, not a release approver or executor.

## Phase F — Verification and acceptance
Status: automated contract tests added; not yet fully executed.
- Added Deno tests for role-specific instructions, prompt-injection boundaries, output contracts, GM role/action restrictions, Gemini gateway readiness and Tavily Basic source validation.
- These tests must be run in a Deno-capable environment before deployment.
- Live acceptance still requires an authenticated Owner AAL2 session, a configured Gemini API secret, gateway enablement, quota-status confirmation and real task scenarios across all eight roles.
- No production Edge Function deployment or production cutover is performed by this branch.

## Gemini Free Tier budget
The Owner supplied an AI Studio screenshot showing Google limits of 15 RPM, 250,000 TPM and 500 RPD. The Office application caps are lower: 8 RPM, 200,000 TPM and 100 RPD, with 1,024 output tokens. The gateway currently remains disabled until the Owner explicitly enables it after confirming the key and quota status. No paid fallback is permitted.

## Remaining blockers before calling A–F complete
1. Run the Deno tests and type-check the Edge Functions.
2. Confirm the Gemini secret is present without exposing its value; then test gateway status under the Owner's AAL2 session.
3. Enable the gateway only after readiness checks pass, then run representative employee tasks and verify usage/caps.
4. Decide whether a free research provider is available and approved for DCE; until then, research scope remains first-party only.
5. Run the browser acceptance suite and verify all nine roles, dashboard labels, retries, failure paths and Owner-review gates.
6. Deploy only after the above tests pass and review the exact Office-only diff.

A phase is not considered complete merely because code exists. It is complete only after the corresponding tests and live acceptance checks pass.
