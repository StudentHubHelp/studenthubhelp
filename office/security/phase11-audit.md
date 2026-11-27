# Phase 11 — Security & Test Audit

## Office-specific checks
- All 12 `office` tables have RLS enabled.
- `anon` and `authenticated` have no `office` schema USAGE and no direct SELECT/INSERT/UPDATE/DELETE privileges on Office tables.
- All `public.office_*` RPCs are SECURITY DEFINER with `search_path=""`; EXECUTE is granted only to `service_role`.
- All nine employee records remain `planned`.
- All integration action catalog rows have `execution_enabled=false`.
- Gemini gateway is disabled, Free Tier confirmation is false, and daily/RPM/TPM caps are unset. The quota reserve RPC is expected to fail closed with `gemini_gateway_disabled`.
- Owner auth check validates the Supabase session via `/auth/v1/user`, checks JWT subject matches the returned user, requires `aal2`, then checks the active Owner allowlist through the service-role-only RPC.
- All Office Edge Functions perform in-function session, AAL2 and Owner validation. They are deployed with platform JWT verification disabled to permit CORS preflight; the function itself validates the bearer token before doing work.
- All external integration actions remain proposal-only. Approval never executes the action.

## Existing project-wide Supabase advisor findings — outside Office scope
These are pre-existing project-level findings and were not changed because they may affect the live StudentHubHelp website/Admin flows:
1. 14 SECURITY DEFINER functions in the public website schema are executable by `authenticated` (examples include admin listing/claim RPCs). Their function bodies and internal authorization checks need a separate read-only audit before any permission change.
   - Supabase guidance: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
2. Leaked password protection is disabled for Supabase Auth. This is a global authentication setting and was not changed during Office work.
   - Supabase guidance: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
3. `pg_trgm` is installed in the public schema. Not changed.
   - Supabase guidance: https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public
4. The advisor reports RLS-enabled tables without policies. For the Office schema, this is intentional defense-in-depth: the schema is not usable by anon/authenticated and direct table privileges are revoked. Similar warnings on other schemas are outside this Office scope.
   - Supabase guidance: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy

## Test procedure
- Run `office/tests/phase11-security-assertions.sql` in the Supabase SQL Editor as a database administrator.
- The script is non-destructive. The Gemini negative check must fail before inserting any quota reservation.
- Full browser tests for login/MFA, task creation, GM planning, employee drafts, approval review, integration status and mobile responsiveness are consolidated for the final phase test pass.
- Do not enable Gemini or external integrations merely to make a test pass. Configure real Free Tier caps and credentials only after the Owner verifies the provider projects and scopes.
