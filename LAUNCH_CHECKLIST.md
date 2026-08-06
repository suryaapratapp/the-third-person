# ThirdPerson AI — Launch Checklist

_Replaces `THIRD_PERSON_LAUNCH_AUDIT.md` (2026-07-13). Every blocker in that
audit has shipped, so it described a codebase that no longer exists. Current as
of 2026-08-06._

---

## What the July audit flagged, and where it landed

| # | July blocker | Status |
|---|---|---|
| 1 | Refresh wiped the report; no `/reports/:id` deep link | ✅ Reports persist and deep-link |
| 2 | Timeline was generic/hardcoded | ✅ Strict schema, 3–6 real phases with evidence quotes |
| 3 | Personality didn't accumulate — overwritten each run | ✅ `upsertMergedPersonality` merges across reports |
| 4 | Default model was the cheapest tier | ✅ Tiered: `gpt-5-nano` for chunks, `gpt-5-mini` for synthesis |
| 5 | Flags lacked guaranteed evidence + confidence | ✅ Both required by the strict JSON schema |
| 6 | ~11 orphaned components | ✅ Removed |

Not from that audit, but shipped since: Razorpay payments end to end,
relationship-type lenses, local metrics (effort, emoji, activity), the zodiac
layer, mobile-first navigation, the coach mascot, the sci-fi theme, build-time
prerendering, and per-route SEO.

---

## 🔴 Blockers — must be done before promoting

- [ ] **Transactional email.** Auth uses email+password signup with no SMTP
      provider configured, so confirmations and password resets go through
      Supabase's built-in sender, which is rate-limited to a handful per hour
      and documented as not-for-production. Past that, mail silently stops.
      Fix: point Supabase Auth at Resend/SES/Brevo.
- [ ] **SPF, DKIM and DMARC** on the sending domain. Three DNS TXT records,
      free. Without them the mail that does send lands in spam.
- [ ] **Razorpay live keys.** Still on test credentials. Needs KYC — allow
      several days. Then swap the Supabase secrets and re-verify the webhook
      signature path.
- [ ] **One real paid transaction on production**, start to finish: credit
      lands, webhook fires, report generates.
- [ ] **Grievance Officer** published with contact details (India IT Rules).
      Currently absent from the footer and privacy page.
- [ ] **Legal review** — DPDP Act consent language, and specifically the
      third-party problem: the other person in an uploaded chat never
      consented. Budget ₹15,000–40,000 for a lawyer and a CA.

## 🟠 Hardening — before meaningful traffic

- [ ] **Error monitoring.** `ErrorBoundary` catches but reports nowhere, so
      failures are invisible unless a user complains. Sentry free tier covers it.
- [ ] **Rate limit the expensive endpoints.** Credits gate abuse, but a signup
      loop can still burn OpenAI spend.
- [x] **`claimPayAsYouGoPack` removed — and the hole behind it closed.** The
      dead wrapper was never the problem. `claim_test_credit_pack` was still
      granted to `authenticated`, and while it refused `free_starter`, it
      happily granted `clarity_pack` (5 reports + 25 chats) and
      `deep_clarity_pack` (10 reports + 50 chats) to any signed-in user via a
      one-line browser-console call. Signup is free, so this was repeatable
      with a fresh email. Execute is now revoked from `authenticated`
      (migration `20260806180000`); `service_role` keeps it, so test credits
      can still be granted deliberately from the SQL editor. One pre-existing
      claim (2 unused credits) was found — consistent with your own testing,
      not abuse.
- [ ] **Delete the throwaway test account** `paytest.claude@thirdperson.test`.
- [ ] **Confirm Supabase point-in-time recovery** is enabled. Paid reports are
      irreplaceable user data.
- [ ] **Verify Supabase Auth redirect allowlist** includes `/reports/*` — OAuth
      returns users to the private URL they originally requested.

## 🔎 SEO — mostly shipped, finish the loop

- [x] Build-time prerendering, self-referencing canonicals, per-route metadata
- [x] Article + BreadcrumbList JSON-LD; real 1200×630 OG image
- [x] Generated sitemap + robots on the canonical host
- [x] Crawlable internal links (`RouteLink`), related posts, article CTA
- [x] Apex → www is now a 308 permanent redirect, deep paths preserved
- [x] Real 404 page; unknown URLs no longer render the homepage
- [ ] **Google Search Console** — verify the domain property, submit
      `sitemap.xml`, then URL-inspect one blog post and request indexing.
      This starts the recrawl clock; recovery realistically takes 2–6 weeks.
- [ ] **Bing Webmaster Tools** — import from Search Console. Feeds ChatGPT search.
- [ ] Per-post OG images (extend `scripts/prerender.mjs`)

## 🧪 Verification still owed

- [ ] **Walk the signed-in flows on a real device.** The wizard has been
      verified at 375px via `VITE_PREVIEW_UNLOCK`, but with a stubbed user —
      no real analysis has been run end to end on a phone.
- [ ] **Confirm every private route returns 200** after the `/app-shell`
      fallback fix: `/auth`, `/analysis/new`, `/reports`, `/reports/:id`,
      `/reports/:id/coach`, `/profile`, `/personality-card` — direct load
      **and** hard refresh.

## 🟡 Product backlog — after launch

- [ ] Onboarding for the empty state (a new paid user sees blank pages)
- [ ] Real testimonials — ten fabricated ones were removed; presenting invented
      reviews as genuine is illegal under Indian consumer law
- [ ] Shareable result cards (cheapest growth loop, needs per-post OG work)
- [ ] Re-analysis over time — turns a one-off purchase into a returning one
- [ ] Matchmaking waitlist capture on `/vision`
- [ ] Content simplification for Privacy, Terms, Company, FAQs
- [ ] Unify the logo lockup on the report and Know Yourself pages

## 📱 Mobile — read before building iOS

India is roughly **95% Android**; iOS is ~4–5% of the installed base. Apple
also mandates In-App Purchase for digital goods, so Razorpay cannot be used
in-app and Apple takes 30% (15% under the Small Business Program) — on a ₹249
report that is ₹37–75, plus the loss of UPI.

Order: **PWA → Android TWA ($25 one-time) → iOS only once revenue justifies
Apple's cut.**
