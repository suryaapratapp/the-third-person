# ThirdPerson AI

Upload or paste a real chat history with someone and get a private relationship
intelligence report — timeline phases, evidence-backed red and green flags,
communication style, a personality card, a zodiac layer, and an ongoing AI
Relationship Coach that answers from the generated report.

## Requirements

Node **22.12 or newer** (`.nvmrc`, enforced by `engines` + `engine-strict`).
Vercel reads the same `engines` field, so local, CI and deploy stay aligned.

## Stack

- React 19 + Vite — client-rendered SPA with a hand-rolled router
  (`src/state/RouterContext.jsx`), **plus a build-time prerender step** (below)
- Supabase — Postgres, Auth, and Deno Edge Functions (`supabase/functions/`)
- OpenAI, called only from Edge Functions, never from the browser
- Razorpay for payments (orders, signature verification, webhook)
- hCaptcha on sign-up / sign-in

## Local development

```bash
npm install
cp .env.example .env.local   # fill in the VITE_* values
npm run dev
```

### Previewing the signed-in screens

Most of the product sits behind auth, which makes those screens awkward to
check for layout regressions. `VITE_PREVIEW_UNLOCK=1 npm run dev` stubs a
signed-in user so the gated routes render.

It cannot reach production: `import.meta.env.DEV` is statically `false` in a
build, so the branch is dead-code-eliminated. It also carries no Supabase
session, so data calls still fail and pages show their empty states — it proves
layout, never behaviour.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | `vite build` **then `scripts/prerender.mjs`** |
| `npm run prerender` | Re-run prerendering against an existing `dist/` |
| `npm run preview` | Serve a production build locally |
| `npm run lint` | ESLint |
| `npm test` | Vitest |

## Prerendering and SEO

This is an SPA, so the server would otherwise ship one empty
`<div id="root">` for every URL. `scripts/prerender.mjs` runs after
`vite build` and writes a real HTML file per public route with a
self-referencing canonical, per-route title/description/OG tags, and
Article + BreadcrumbList JSON-LD. Blog posts also get their full article text
baked in, serialised from the same `blogContent.js` data `BlogPostPage`
renders — so crawlers and readers get identical content.

Things worth knowing before you touch it:

- **`src/lib/seo.js` is the single source of truth** for per-route metadata.
  The prerender script imports `seoMetaFor` from it, so the two cannot drift.
- **`SITE_ORIGIN` in `seo.js` sets the canonical host.** It is a hardcoded
  constant, not `window.location.origin`, so preview deploys do not emit
  canonicals pointing at themselves. Change that one line if the primary
  domain ever moves.
- **`index.html` contains marker comments** (`<!--seo:start-->`,
  `<!--app-html-->`, `<!--seo:jsonld-->`). The build fails loudly if they go
  missing. Don't hand-edit the tags between the seo markers.
- **Internal links must be `RouteLink`, not `<button onClick={navigate}>`.**
  Crawlers follow `href`; a button has none, so a button-based nav is invisible
  in the rendered link graph.
- `sitemap.xml` and `robots.txt` are **generated at build time** — new blog
  posts appear automatically. Don't hand-edit them in `public/`.

### Routing on Vercel

`vercel.json` sets `cleanUrls: true` and rewrites unmatched paths to
**`/app-shell`**, a generated no-body, no-canonical, `noindex` shell. Two
traps this avoids:

- Rewriting to `/index.html` **breaks every private route.** With `cleanUrls`,
  `/index.html` is a 308 redirect, so the rewrite resolves to nothing and
  Vercel returns 404 — which once took `/auth`, `/analysis/new` and all
  `/reports/:id` links offline.
- Rewriting to `/index` would serve the homepage's prerendered body and
  `canonical: /` for every mistyped URL.

## Backend deploys

Frontend changes deploy through the Vercel git integration. Database and Edge
Function changes do **not** ship with `git push`:

```bash
supabase link --project-ref <project-ref>
supabase db push                 # applies supabase/migrations/
supabase functions deploy generate-relationship-report
supabase functions deploy generate-personality-card
supabase functions deploy ai-bestie-chat
supabase functions deploy create-razorpay-order
supabase functions deploy verify-razorpay-payment
supabase functions deploy razorpay-webhook
```

Edge Function secrets: `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `RAZORPAY_KEY_ID`,
`RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, optionally
`THIRDPERSON_REPORT_SYSTEM_PROMPT` and `ALLOWED_ORIGINS`.

## Notes

- **There is no free tier.** Every Relationship Report is paid. `claimPayAsYouGoPack`
  in `src/lib/creditsService.js` is a leftover of the removed free tier and is
  no longer called from the UI — see `LAUNCH_CHECKLIST.md`.
- Reports are analysed by software, not read by staff. Sensitive details are
  stripped before anything reaches the AI provider — see the Privacy Policy.
- Current pre-launch status and remaining work: **`LAUNCH_CHECKLIST.md`**.
