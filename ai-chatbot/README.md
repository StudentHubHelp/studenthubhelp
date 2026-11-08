# StudentHubHelp AI Chatbot

StudentHubHelp's public chatbot is served by the Supabase Edge Function and reads active listings from the category-specific Supabase tables.

## Production request path

- Public website embed: `widget.js` -> `/functions/v1/studenthubhelp-chat`
- React chatbot: `ai-chatbot/src/components/ChatWidget.tsx` -> the same Edge Function
- Edge Function: authoritative runtime config, rate limits, deterministic listing search, and optional Gemini response enhancement
- Supabase: `hostels`, `tiffins`, `libraries`, `cafes`, and `bookstores`

Both browser clients use the same production endpoint. Do not point either client at the legacy Express `/api/chat` route.

## Database and security

- Only rows with `status = 'active'` are eligible for public recommendations.
- The Edge Function uses the private `chatbot_rate_limits` table through the `consume_chatbot_rate_limit` security-definer RPC. Apply the checked-in migration before deploying the Edge Function version that calls it.
- Keep the Supabase service-role key server-side only. Browser clients use the public/publishable key.
- The chatbot fails closed when its admin config is missing/unavailable. If Cloudflare's client-IP header is absent, it falls back to lower-threshold session/user-agent and explicitly untrusted proxy keys; this fallback is weaker than a verified edge IP and must be checked in staging.

## Environment

For the Edge Function, configure the Supabase URL/key and Gemini key as Supabase Function secrets. The React build accepts `VITE_CHAT_API_URL` and `VITE_SUPABASE_ANON_KEY`; the default chat URL is the production Edge Function.

## Legacy Express preview

`server.ts` and its `/api/*` routes are a legacy local preview harness, not the production source of truth. Its config and lead arrays are in-memory and reset when the process restarts. Do not deploy those endpoints as a public production API or use them for authoritative chatbot settings, leads, or property data.

Run the React UI locally with `npm run dev`. To intentionally start the isolated legacy Express preview, use `npm run dev:legacy-server`. The production build is static Vite output only; it does not bundle `server.ts` or the legacy `/api/*` routes.

```bash
npm install
npm run dev
# Optional legacy preview only:
npm run dev:legacy-server
```
