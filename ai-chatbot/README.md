# StudentHubHelp AI Chatbot

Production-oriented StudentHubHelp AI chatbot based on Gemini 3.8 Flash and live Supabase data.

## Data rule

Property recommendations are loaded from the StudentHubHelp public property tables:

- `hostels`
- `tiffins`
- `libraries`
- `cafes`
- `bookstores`

Only rows whose `status` is `active` are exposed to the chatbot. No property records, prices, ratings, contacts or recommendations are hardcoded as demo data.

## Environment

Set:

- `GEMINI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `APP_URL` (optional)

The Supabase key is used server-side for public active-listing reads. Never expose a service-role key in browser code.

## Local run

```bash
npm install
npm run dev
```

## Production architecture

GitHub Pages / public website -> embedded `public/widget.js` -> deployed Node/Express API -> Gemini + Supabase.

The current project is prepared as the chatbot application. Public-site embedding and the admin AI section should be integrated after the live backend deployment endpoint is chosen.
