# StudentHubHelp AI Office

This is an isolated static app directory intended for a separate Cloudflare Pages project using the same GitHub repository.

## Hosting plan
- Repository: `StudentHubHelp/studenthubhelp`
- Cloudflare Pages project root directory: `office`
- Production hostname: `office.studenthubhelp.in`
- Build command: none
- Build output directory: `/` (the project root is already `office`)

Do not change the root `CNAME` or the existing website deployment. The root website continues to use its existing hosting.

## Authentication and security
- Supabase Auth password sign-in.
- TOTP authenticator enrollment/challenge.
- Office dashboard requires AAL2.
- `office-auth-check` validates the JWT through Supabase Auth, checks AAL2, then checks the active owner allowlist.
- The browser only uses the Supabase publishable key. Never put a service-role key or Gemini secret in this directory.
- `office-control-api` validates the user session and AAL2 before forwarding a fixed allowlisted action to the server-only `office_control_api` database RPC.
- The RPC is SECURITY DEFINER with an empty search_path. EXECUTE is revoked from PUBLIC, anon and authenticated, and granted only to service_role. It independently checks the active owner allowlist.

## Phase 4 — AI Control Center & Task Queue
- Owner dashboard metrics and nine-role team directory are loaded from the database.
- Owner can create tasks with a title, optional description and priority.
- Owner can pause, resume or cancel queued tasks and inspect task activity logs.
- Task records use the existing `office.office_tasks` and `office.office_task_logs` tables. No duplicate task tables were added.
- No AI employee is activated and no task worker executes queued work in Phase 4. This is an owner-managed queue foundation only.
- AI requests, Gemini calls, listing writes, publishing and production deployments are not triggered by task creation or status changes.
- Approval workflows remain a later phase.

## Database migration
- `supabase/migrations/20261124073428_office_phase_4_control_api.sql` records the restricted server-side RPC.

## Deployment
- Cloudflare Pages project root remains `office`.
- The production branch is currently configured separately. Merge/repoint only after the Phase 4 preview has been tested.


## Phase 5 — Gemini integration and Free Tier quota guard
- Gemini calls go through the Supabase Edge Function `office-gemini-gateway`; the browser never receives the Gemini API key.
- The only allowlisted model is `gemini-2.5-flash-lite` from the existing Office setting. No model fallback, paid route, Google Search grounding, or external tools are enabled.
- Every generation request requires an AAL2 session, active Owner allowlist, an Edge Function secret named `GEMINI_API_KEY`, explicit Free Tier confirmation, the global quota guard, and positive RPM/TPM/RPD application caps.
- Quota reservations are serialized with a database advisory lock and enforce rolling one-minute RPM/TPM caps plus a UTC daily request cap. Each completed/failed provider attempt is recorded in `office.office_ai_usage`; prompts and generated content are not written to logs.
- The gateway is enabled in Free Tier-only mode. Current app caps: 10 RPM, 200,000 TPM, 100 RPD and 1,024 output tokens. Paid billing mode is blocked; calls require the authenticated Owner AAL2 session and quota reservation.
- Add the API key only in Supabase Dashboard → Edge Functions → Secrets as `GEMINI_API_KEY`; never commit it or paste it into chat. Supabase documents Edge Function secrets here: https://supabase.com/docs/guides/functions/secrets.
- Exact RPM, TPM and RPD values must be read from this Google AI Studio project's Dashboard → Rate limits. They are project/model-specific and can change; do not copy generic values into app caps.
- Migration: `supabase/migrations/20261124074103_office_phase_5_gemini_quota_guard.sql`.


## Phase 6 — General Manager
- Owner can request a proposal-only plan for a queued task. The General Manager receives the task text and the eight registered role descriptions/capabilities, then proposes up to eight role-mapped steps.
- The plan is validated server-side and again by the database before it is saved under `office.office_tasks.result_payload.general_manager_plan`.
- Plans are proposals only. No child tasks are created, no AI employee is activated, and no external action, listing edit, message, social post or deployment is executed.
- Every plan requires Owner approval; the formal approval workflow is Phase 9.
- Eligible employee prompts are sent to the Google Gemini Free Tier through the quota gateway. Evidence-critical daily/count/QC tasks remain deterministic. Do not put student personal data, phone numbers, emails, credentials, OTPs or secrets into task text. Google states that Free Tier submitted content may be used to improve its products.
- General Manager endpoint: `office-general-manager`. It validates Supabase session, AAL2 and active Owner status; only service_role can execute the backing RPCs.
- Migration: `supabase/migrations/20261124074440_office_phase_6_general_manager_planning.sql`.


## Phase 7 — Eight specialized AI employees
- Eight role-specific draft agents are configured: Data & Listing Manager, Data Collection Executive, Customer Support Executive, Technical Support Engineer, Data Analyst & Reporting Manager, Social Media Manager, SEO & Marketing Manager and Quality Control Manager.
- Each agent can only prepare a draft for a role that the General Manager assigned in a saved plan step. The database independently checks the task, role and step match.
- Drafts are stored under `office.office_tasks.result_payload.employee_drafts` and shown beneath the matching GM plan step.
- All agents remain `planned`; they do not gain production/database/API permissions from this phase.
- No employee can send messages, change listings, scrape websites, publish Instagram content, edit production code, deploy or approve work.
- The common output contract requires Owner approval and records a proposal-only draft. Phase 8 integrations and Phase 9 approvals are still separate.
- Role boundaries: `office/agents/role-boundaries.md`.
- Edge Function: `office-employee-agent`.
- Migration: `supabase/migrations/20261124074749_office_phase_7_specialized_employee_agents.sql`.


## Phase 8 — Tool/API integration registry
- Added a private integration registry for Supabase, Gemini, GitHub, Cloudflare, Brevo, Instagram/Meta and OpenSEO.
- Registry shows connection status, allowed scope labels, access mode and whether the named Edge Function secret is present. It never returns secret values.
- Added a per-provider action catalog for read-only, draft-only and approval-required capabilities.
- All external execution flags remain `false`. The integration hub can only create a pending approval proposal for eligible write actions, tied to an existing queued task; it never calls the provider.
- ChatGPT connectors are separate from the Office runtime. GitHub, Brevo and OpenSEO app connections do not automatically provide Office Edge Function credentials.
- Brevo sender identity is not an API credential. The Office runtime needs `BREVO_API_KEY`.
- Integration setup notes: `office/integrations/README.md`.
- Edge Function: `office-integration-hub`.
- Migration: `supabase/migrations/20261124075121_office_phase_8_integration_registry.sql`.


## Phase 9 — Owner approval center
- Dashboard includes a pending/approved/rejected/all approval review queue.
- Only the active Owner with an AAL2 session can approve or reject. Rejection requires a reason; expired requests cannot be approved.
- Decisions are recorded in the existing `office.office_approvals` table and task/integration event logs.
- Approval is a decision record only. Approving does not execute a send, publish, listing edit, code change, PR, or deployment.
- Phase 10 executor must separately recheck approval state, provider credentials, action allowlist and idempotency before any permitted external action.
- Policy: `office/approvals/README.md`.
- Edge Function: `office-approval-center`.
- Migration: `supabase/migrations/20261124075406_office_phase_9_owner_approval_center.sql`.


## Phase 10 — Premium dashboard and reporting
- Expanded the dashboard with six task KPIs, Owner approvals, integrations, Gemini quota guard, seven-day AI usage, employee/task status breakdowns and recent activity.
- Gemini quota panel shows only readiness flags, usage/caps and a boolean secret-presence indicator; no secret values are exposed.
- Report endpoint returns aggregate-only operational metrics and no student-level data.
- Responsive layouts adapt from six desktop KPIs to stacked tablet/mobile cards.
- Edge Function: `office-report-center`.
- Report docs: `office/reports/README.md`.
- Migration: `supabase/migrations/20261124075647_office_phase_10_dashboard_reporting.sql`.


## Phase 11 — Security & test assertions
- Added a non-destructive SQL assertion suite for Office schema grants, RLS, SECURITY DEFINER RPC grants/search_path, employee activation state, integration execution flags and Gemini Free Tier quota safeguards.
- Hardened `office-auth-check` to also require the JWT subject to match the user returned by Supabase Auth.
- Full audit notes: `office/security/phase11-audit.md`.
- SQL assertions: `office/tests/phase11-security-assertions.sql`.
- Existing website/Admin SECURITY DEFINER warnings and global Auth settings are documented but deliberately not changed as part of this isolated Office scope.


## Phase 12 — Release candidate and production cutover
- Phase 12 release runbook: `office/RELEASE.md`.
- Cloudflare preview deployment is successful at `https://feature-office-phase-12.studenthubhelp-office.pages.dev`.
- The Office Pages project still uses `feature/office-phase-3` as its production branch. No production branch change has been made.
- The Pages custom-domain list currently contains only `studenthubhelp-office.pages.dev`; `office.studenthubhelp.in` is not yet attached.
- Final go-live is intentionally held until the consolidated acceptance tests, provider-secret setup (if needed), custom-domain binding and explicit Owner cutover approval are complete.


## Phase status
See `office/PHASES.md` for the consolidated 12-phase status, hard safety gates and remaining production launch steps.


## Current employee and integration operating mode (2026-11-26)
- Gemini is enabled through the Owner-authenticated quota gateway in Free Tier-only mode. The dashboard integration hub validates the gateway readiness and secret presence; employee prompts never receive the API key.
- Evidence-critical daily activity, exact-count and consolidated-QA tasks remain deterministic so model wording cannot alter evidence counts or QC verdicts. Other eligible specialist tasks may use quota-guarded Gemini generation.
- DCE combines relevant first-party StudentHubHelp pages with at most one Tavily Basic search per task, only after checking that the account is on the Free/Researcher plan and pay-as-you-go is disabled. If this cannot be verified, external search is blocked and the report states the limitation. No advanced search, raw-content extraction or crawling.
- Brevo, Gemini and Tavily have runtime credentials configured. Brevo and Gemini are validated by the integration overview; Tavily validates account plan/usage. Brevo campaign sends remain proposal-only and execution-disabled.
- Supabase remains connected through Owner-checked server-side RPCs.
- Google Maps Places API key is present, but Places remains disabled until billing/request limits are reviewed and the integration is validated. No billable test request was made.
- Cloudflare, GitHub, Gmail, Instagram/Meta and OpenSEO are marked needs_secret because their required runtime credentials are missing. ChatGPT's connected GitHub/Cloudflare/Gmail tools do not automatically expose tokens to Office Edge Functions.
- All consequential external actions remain disabled. Email send, Instagram publish, code PR, Cloudflare deploy and SEO metadata publishing require explicit Owner approval and are not executed by employee drafts.
- Employee output is still proposal-only. No listing edits, database mutations, outbound email, social publishing, code merges or production deploys are performed automatically.

## Owner-triggered employee workflow runner

The General Manager supports bounded, role-specific planning with quota-guarded Gemini where eligible and deterministic routing for evidence-critical tasks. After the Owner creates a queued task and saves a proposal-only GM plan, the Owner can use **Generate all employee drafts** to run each planned employee sequentially through the existing Employee Agent. The runner stops on the first failed step and reports which drafts were saved. It does not change the task's business status, modify public listings, send email, publish content, create deployments, or execute production changes. All outputs remain drafts requiring Owner review.

QC only waits for fresh DCE research evidence when the task actually requires public research/citations. For listing, analytics, login, and technical tasks, QC reviews the preceding employee drafts directly.

The dashboard explicitly identifies search-query telemetry as unavailable until a future search-event instrumentation change. Property detail views must never be described as searches.


## Automatic General Manager task workflow
- When the authenticated Owner creates a task from the dashboard, the browser immediately calls the General Manager to create and validate the proposal-only plan, then invokes the existing sequential employee runner without requiring a second click.
- The workflow runs only with the active Owner's AAL2 session. If a step fails, the task remains queued, completed drafts remain available, and the dashboard reports the failure so the Owner can review and retry.
- When every planned employee draft is saved, the task card displays a deterministic General Manager final report assembled from the saved employee summaries, including the QC summary when present.
- When the Owner opens the dashboard, queued tasks with a saved safe GM plan and no employee drafts are automatically resumed. Two previously protected task keys remain excluded. New tasks created after this change are automatically delegated and run.
- All prior boundaries remain: employee drafts only; no listing writes, account changes, outbound messages, publishing, code commits, merges or deployments.
