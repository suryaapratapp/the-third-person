# ThirdPerson AI

Upload or paste a real chat history with someone and get a private relationship intelligence report — sentiment, communication style, red and green flags, a personality card, zodiac compatibility, and an ongoing AI Relationship Guide chat.

## Stack

- React 19 + Vite (client-rendered SPA, hand-rolled router in `src/state/RouterContext.jsx`)
- Supabase: Postgres, Auth, Storage, and Deno Edge Functions (`supabase/functions/`)
- OpenAI, called only from Edge Functions (never from the browser) for the paid tier
- Puter.js, called directly from the browser, for the ~2 free analyses per account
- hCaptcha on sign-up/sign-in

## Local development

```bash
npm install
cp .env.example .env.local   # fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_HCAPTCHA_SITE_KEY
npm run dev
```

## Scripts

- `npm run dev` — start the Vite dev server
- `npm run build` — production build
- `npm run preview` — preview a production build locally
- `npm run lint` — ESLint
- `npm test` — run the unit test suite (Vitest)

## Backend deploys

Frontend changes deploy via the normal Vercel git integration. Database and Edge Function changes do **not** ship with `git push` — they need the Supabase CLI:

```bash
supabase link --project-ref <project-ref>
supabase db push                 # applies new files in supabase/migrations/
supabase functions deploy generate-relationship-report
supabase functions deploy ai-bestie-chat
supabase functions deploy generate-personality-card
```

Edge Function secrets (set via `supabase secrets set` or the dashboard): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, and optionally `ALLOWED_ORIGINS` (comma-separated list — defaults to `https://thethirdperson.ai,https://www.thethirdperson.ai` plus `*.vercel.app` and localhost).

## Notes

- Payment processing (Razorpay) is not yet integrated — the Pricing page checkout is intentionally a placeholder until that lands.
- `src/lib/puter*.js` is live code for the free tier, not dead legacy — see the Privacy Policy's "Free-tier analysis processing" section for what that means for data handling.
