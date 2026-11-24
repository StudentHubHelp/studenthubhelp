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
