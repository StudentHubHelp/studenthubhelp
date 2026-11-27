# Office Integration Registry — Phase 8

## Runtime connection states
- Supabase: connected for the Office's private database/RPC layer.
- Gemini: needs the `GEMINI_API_KEY` secret and Phase 5 Free Tier gates.
- GitHub: needs `OFFICE_GITHUB_TOKEN` with least-privilege repository scopes.
- Cloudflare: needs `CLOUDFLARE_API_TOKEN` scoped to the Office Pages project.
- Brevo: needs `BREVO_API_KEY`; sender identity alone is not an API connection.
- Instagram/Meta: not connected; needs a valid Meta Graph API token and publishing permissions.
- OpenSEO: ChatGPT connector access does not automatically give the Office runtime an API credential; needs `OPENSEO_API_KEY`.

## Safety model
- Secret values are stored only as Supabase Edge Function secrets, never in Git, browser code or `office.office_settings`.
- The registry stores secret *names* only.
- The action catalog describes read-only, draft-only and approval-required capabilities.
- `execution_enabled=false` for every catalog action in Phase 8. No external integration action is executed.
- The integration hub can create a pending approval record for selected write actions, linked to an existing queued Office task. It records a proposal and does not execute it.
- Approval UI and execution after approval are Phase 9/10 work.
- ChatGPT app connectors (GitHub, Brevo, OpenSEO, etc.) are separate from the Office runtime; they do not automatically transfer credentials to Supabase Edge Functions.
