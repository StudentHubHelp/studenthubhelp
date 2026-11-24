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
- The gateway is deployed but remains fail-closed: `gemini_gateway_enabled=false`, `gemini_free_tier_confirmed=false`, and the project-specific caps are unset. No Gemini API request can run until the Free Tier limits are confirmed and the owner enables it.
- Add the API key only in Supabase Dashboard → Edge Functions → Secrets as `GEMINI_API_KEY`; never commit it or paste it into chat. Supabase documents Edge Function secrets here: https://supabase.com/docs/guides/functions/secrets.
- Exact RPM, TPM and RPD values must be read from this Google AI Studio project's Dashboard → Rate limits. They are project/model-specific and can change; do not copy generic values into app caps.
- Migration: `supabase/migrations/20261124074103_office_phase_5_gemini_quota_guard.sql`.


## Phase 6 — General Manager
- Owner can request a proposal-only plan for a queued task. The General Manager receives the task text and the eight registered role descriptions/capabilities, then proposes up to eight role-mapped steps.
- The plan is validated server-side and again by the database before it is saved under `office.office_tasks.result_payload.general_manager_plan`.
- Plans are proposals only. No child tasks are created, no AI employee is activated, and no external action, listing edit, message, social post or deployment is executed.
- Every plan requires Owner approval; the formal approval workflow is Phase 9.
- Task content is sent to the Google Gemini Free Tier only after Phase 5 gateway/quota gates are enabled. Do not put student personal data, phone numbers, emails, credentials, OTPs or secrets into task text. Google states that Free Tier submitted content may be used to improve its products.
- General Manager endpoint: `office-general-manager`. It validates Supabase session, AAL2 and active Owner status; only service_role can execute the backing RPCs.
- Migration: `supabase/migrations/20261124074350_office_phase_6_general_manager_planning.sql`.
