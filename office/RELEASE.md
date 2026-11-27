# StudentHubHelp AI Office — Phase 12 Release Runbook

## Current release-candidate state (2026-11-24)
- Cloudflare Pages project: `studenthubhelp-office`
- Repository: `StudentHubHelp/studenthubhelp`
- Pages root directory: `office`
- Build command/output directory: blank (static site)
- Current production branch: `feature/office-phase-3`
- Release candidate preview branch: `feature/office-phase-12`
- Preview URL: https://feature-office-phase-12.studenthubhelp-office.pages.dev
- The release candidate build/deploy completed successfully.
- Current Pages custom domains: only `studenthubhelp-office.pages.dev`; `office.studenthubhelp.in` is not attached yet.
- The Cloudflare zone `studenthubhelp.in` is active, but no Pages custom-domain binding has been created.
- Production branch and root StudentHubHelp website have not been changed.

## Go-live blockers
1. Complete the consolidated browser acceptance test across login/MFA, dashboard, task queue, GM plans, employee drafts, approvals, integrations, quota panel, reports, logout and mobile responsiveness.
2. If live Gemini planning is required, configure `GEMINI_API_KEY` as a Supabase Edge Function secret, verify the exact AI Studio project/model Free Tier RPM/TPM/RPD, set conservative app caps below those provider limits, then explicitly set the Owner Free Tier confirmation. Do not enable billing or paid fallback.
3. Add runtime secrets only when the relevant integration is ready:
   - `OFFICE_GITHUB_TOKEN` — least-privilege repository permissions
   - `CLOUDFLARE_API_TOKEN` — scoped to the Office Pages project
   - `BREVO_API_KEY` — API key, not just the sender identity
   - `META_INSTAGRAM_ACCESS_TOKEN` — Meta Graph API permissions
   - `OPENSEO_API_KEY` — Office runtime credential
4. Validate each provider connection and scope before changing its registry state from `needs_secret` / `not_connected`.
5. Keep all integration catalog `execution_enabled=false` until Phase 10 executor policies and per-action tests are complete.
6. Confirm the final Owner approval and rollback plan before cutover.

## Production cutover sequence
1. Freeze the release-candidate commit SHA and record the latest applied Supabase migration version.
2. Run `office/tests/phase11-security-assertions.sql` and the full browser acceptance checklist.
3. Review the Phase 12 PR and merge the tested release candidate into the intended Office production branch.
4. In Cloudflare Pages, change the **Office project's** production branch from `feature/office-phase-3` to the approved release branch only after the test pass. Do not change the separate root `studenthubhelp` Pages project.
5. Add `office.studenthubhelp.in` to the Pages project's Custom Domains. Confirm Cloudflare DNS target and TLS certificate activation before sharing the domain.
6. Verify production login, TOTP AAL2, owner allowlist, task queue, approval center and safe locked Gemini status.
7. Monitor Edge Function logs, Pages deployment status and Supabase security events.

## Rollback
- Keep the previous production branch/commit `feature/office-phase-3` available.
- If the release fails, restore the Office Pages project's production branch to `feature/office-phase-3` and redeploy the previous production commit.
- Do not roll back or alter the root StudentHubHelp website project.
- Do not drop Office database tables or reverse migrations automatically; database rollback must be planned separately after checking persisted records.

## Security rules
- Never paste API keys, service-role keys, TOTP secrets, QR codes or recovery codes into chat or GitHub.
- Put provider credentials only in Supabase Edge Function Secrets.
- Never expose service-role keys or Gemini keys to browser code.
- Never enable paid Gemini fallback, external action execution, or approval bypass.
- Every production write, send, publish or deploy remains Owner-approved and audited.
