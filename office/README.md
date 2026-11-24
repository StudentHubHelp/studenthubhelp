# StudentHubHelp AI Office (Phase 3)

This is an isolated static app directory intended for a separate Cloudflare Pages project using the same GitHub repository.

## Hosting plan
- Repository: `StudentHubHelp/studenthubhelp`
- Cloudflare Pages project root directory: `office`
- Production hostname: `office.studenthubhelp.in`
- Build command: none
- Build output directory: `/` (the project root is already `office`)

Do not change the root `CNAME` or the existing GitHub Pages deployment. The root website continues to use its existing hosting.

## Authentication
- Supabase Auth password sign-in.
- TOTP authenticator enrollment/challenge.
- Office dashboard requires AAL2.
- Server-side Edge Function `office-auth-check` validates the JWT through Supabase Auth, checks AAL2, then checks the active owner allowlist.
- The browser only uses the Supabase publishable key. Never put a service-role key or Gemini secret in this directory.

## Phase 3 limitations
The owner must enroll an authenticator on first successful password sign-in. The Office dashboard is a secure shell; task queue, agents, and reporting are later phases. Configure the Cloudflare Pages project and DNS separately before announcing the subdomain live.
