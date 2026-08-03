# Third Person AI — Product, UX, Technical & AI Audit + Launch Plan

_Audit date: 2026-07-13. Grounded in the actual codebase (Vite + React 19 SPA, Supabase backend, OpenAI + Puter LLM providers). File references are clickable in the editor._

---

## 0. TL;DR — what to fix before tomorrow

The product is **much further along than a typical pre-launch app**. Upload/parsing, sensitive-data protection, prompt-injection defense, credit/reservation logic, RLS, and the paid analysis pipeline are all real and working. The visual report is rich.

But five things directly undercut the product vision and one is an outright launch blocker:

| # | Problem | Severity | Where |
|---|---------|----------|-------|
| 1 | **A page refresh on the report screen wipes the report.** Report lives only in in-memory React context; there is no `/reports/:id` deep link. | 🔴 Launch blocker | [App.jsx:45](src/App.jsx), [AnalysisContext.jsx:20](src/state/AnalysisContext.jsx), [ResultPage.jsx:170](src/pages/ResultPage.jsx) |
| 2 | **The timeline — the #1 product priority — is essentially generic/hardcoded.** The LLM output schema types `timeline` as an empty array with no phase structure, so the UI falls back to canned labels ("Soft beginning", "Flirty rise"…). | 🔴 Critical | [index.ts:330](supabase/functions/generate-relationship-report/index.ts), [ResultPage.jsx:400-413](src/pages/ResultPage.jsx) |
| 3 | **Personality "evolution" doesn't actually accumulate.** `user_personality` is overwritten each run; the People Map shows only the first-matching card per world. | 🟠 Critical for vision | [index.ts:719](supabase/functions/generate-relationship-report/index.ts), [PersonalityCardPage.jsx:123](src/pages/PersonalityCardPage.jsx) |
| 4 | **Default model is `gpt-5-nano`**, which is the cheapest tier — the biggest single lever on "not generic, insightful" output quality. | 🟠 Important | [index.ts:303](supabase/functions/generate-relationship-report/index.ts) |
| 5 | **Flags/insights lack a guaranteed evidence quote + confidence structure** in the schema, so "evidence-backed" is inconsistent. | 🟠 Important | schema at [index.ts:306](supabase/functions/generate-relationship-report/index.ts) |
| 6 | **~11 orphaned components** duplicate logic that `ResultPage` inlines — dead weight and a refactor trap. | 🟡 Cleanup | see §1.6 |

If you only do six things before launch, do the six above. Everything else in this document is either already fine or a post-launch improvement.

---

## 1. Current-State Audit

### 1.1 What already works well (do not touch)

- **Chat parsing** ([conversationPreprocessor.js](src/lib/conversationPreprocessor.js)) — handles WhatsApp bracket/dash formats + ISO, multi-line message stitching, system-line stripping, day/night classification, Hindi/Hinglish detection, reply-gap analysis, per-sender stats, monthly breakdown, and a graceful "no timestamps" fallback. This is genuinely good.
- **Upload safety** ([UploadOrPasteChat.jsx](src/components/UploadOrPasteChat.jsx), [fileSafetyScanner.js](src/lib/fileSafetyScanner.js)) — extension/MIME allowlist, ZIP extraction with per-entry size caps and `__MACOSX` filtering, 10 MB limit, best-candidate selection.
- **Privacy pipeline** — [sensitiveDataFilter.js](src/lib/sensitiveDataFilter.js) + [promptInjectionFilter.js](src/lib/promptInjectionFilter.js), both with unit tests ([src/lib/__tests__](src/lib/__tests__)). Chats are wrapped as untrusted data and the system prompt explicitly refuses embedded instructions ([promptBuilder.ts:84](supabase/functions/_shared/promptBuilder.ts)).
- **Prompt architecture** ([promptBuilder.ts](supabase/functions/_shared/promptBuilder.ts)) — clean system/developer/user separation, relationship-specific focus lists, language/tone control, safety block, and per-relationship-type framing. This is a strong foundation.
- **Credit safety** — `reserveCredit` / `refundCredit` with refund-on-failure ([index.ts:629,648](supabase/functions/generate-relationship-report/index.ts)); atomic reservation fixed a real past exploit (see comment at [generate-personality-card/index.ts:142](supabase/functions/generate-personality-card/index.ts)).
- **Long-chat chunking** ([analysisPipeline.js](src/lib/analysisPipeline.js)) — three routes (`single_compressed` / `chunked_synthesis` / `long_async_ready`) by token estimate, chronological chunk summaries synthesized server-side ([index.ts:163](supabase/functions/generate-relationship-report/index.ts)). Architecturally sound.
- **RLS** — every user table has own-row select/insert/update/delete policies; storage objects are user-scoped ([initial migration:222-366](supabase/migrations/20260512154000_initial_backend_auth.sql), hardened in [20260513042000](supabase/migrations/20260513042000_harden_rls_and_indexes.sql)).

### 1.2 What is incomplete

- **Report re-open / persistence.** Reports save to `relationship_reports` fine, but the only way to view a full report is to push it into `AnalysisContext.flow` and navigate to `/analysis/result` ([ReportsPage.jsx:45](src/pages/ReportsPage.jsx)). There is **no URL that renders a saved report by id**. Refresh, deep-link, share, or "open in new tab" all fail → empty state ([ResultPage.jsx:223](src/pages/ResultPage.jsx)).
- **Timeline as a first-class object.** No structured phase model anywhere. `timeline: []` in the schema, no `turningPoints` schema, and the UI invents phase titles when the LLM returns nothing usable.
- **Understand Yourself persistence on the client.** The edge function *does* persist to `understand_yourself_profiles` ([generate-personality-card/index.ts:170](supabase/functions/generate-personality-card/index.ts)) — good — but the page also writes localStorage-only via `saveLocalUnderstandYourselfProfile` ([PersonalityCardPage.jsx:375](src/pages/PersonalityCardPage.jsx)); redundant and device-local.
- **Personality accumulation.** `previousPersonalityCard` is passed into the prompt, but storage overwrites `user_personality` wholesale each run and never diffs/merges structurally. `personalityDelta` is generated ([schema:459](supabase/functions/generate-relationship-report/index.ts)) but never stored or displayed.

### 1.3 What is confusing

- **Two AI providers with different schemas.** Paid = OpenAI edge function. Free = **client-side Puter** ([puterAnalysisService.js](src/lib/puterAnalysisService.js), 512 lines; [puterFreeAiService.js](src/lib/puterFreeAiService.js)) with a Safari pop-up sign-in dance ([ReviewAnalysisStep.jsx:152-203](src/components/ReviewAnalysisStep.jsx)). Two code paths, two quality bars, one of which runs the model in the user's browser. High maintenance and inconsistent output.
- **`mergeAnalysisFallback`** ([ReviewAnalysisStep.jsx:25](src/components/ReviewAnalysisStep.jsx)) + **`compactReportForExistingUi`** ([index.ts:185](supabase/functions/generate-relationship-report/index.ts)) both remap a very wide, loosely-typed AI object into a legacy UI shape. Two overlapping adapters make the true output contract hard to reason about.
- **Personality worlds.** Cards are stored per `(user_id, report_id)` ([relationshipCardToDbRecord](src/lib/supabaseDataService.js)), but the People Map keys by *world* and uses `cards.find` (first match) ([PersonalityCardPage.jsx:123](src/pages/PersonalityCardPage.jsx)). Multiple partner chats → multiple partner cards → only one shows, silently.

### 1.4 What feels generic / low quality

- **Timeline** (already covered) — canned phase names are the most "generic" surface in the app and it's the flagship feature.
- **Hardcoded fallback copy everywhere.** `safe(...)` fallbacks like "This connection has signals worth reading gently" ([ResultPage.jsx:367](src/pages/ResultPage.jsx)) fire whenever a field is thin — which with `gpt-5-nano` is often. The report can look complete while being mostly template.
- **Sticky notes / storyboard** synthesize from whatever exists and pad with emoji-labeled placeholders ([ResultPage.jsx:449,676](src/pages/ResultPage.jsx)).

### 1.5 What is technically fragile

- **In-memory-only report state** (§1.2) — the single biggest fragility.
- **`gpt-5-nano` JSON reliability.** There's a one-shot JSON-repair retry ([index.ts:76](supabase/functions/generate-relationship-report/index.ts)) — good — but no model fallback, and the whole report is one giant JSON blob, so any hard failure loses everything and refunds the credit.
- **Chunk summarization runs sequentially** ([index.ts:178](supabase/functions/generate-relationship-report/index.ts)) — for `long_async_ready` (up to 40 chunks) this is N sequential OpenAI calls inside one edge invocation → latency + timeout risk.
- **Client-trusted `runtimeContext`.** The report record's `person_name`/`relationship_type` come from the request body / model output; fine for a personal tool, but worth pinning to server-derived values.

### 1.6 What should be removed / simplified

**Orphaned components** (zero imports — `ResultPage`/`PersonalityCardPage` inline everything):
`TimelineChart`, `ZodiacCompatibilityCard`, `SentimentStoryboard`, `PersonalitySnapshot`, `ConversationRecap`, `RedGreenFlags`, `CommunicationStyleSignals`, `DayNightDynamics`, `WordCloudChips`, `ScoreCard`, `MetricCard`. Delete or actually adopt them (adopting `TimelineChart` is part of the Fix-2 plan below).

Also: `relationshipAnalysisEngine.js` is only the local fallback draft; keep it but rename to make its role obvious. Consider retiring the Puter free path for launch (feature-flag it off) rather than maintaining two engines.

### 1.7 What could block launch

Only **Fix #1 (report persistence)** is a true blocker — a user who refreshes loses a paid report. Everything else is quality/vision. But shipping the flagship timeline in its current generic form is a reputational risk given the positioning.

---

## 2. Launch-Critical Issues (bucketed)

### 🔴 Critical — must fix before launch
1. **Report persistence + deep link.** Add `/reports/:id` route → `fetchRelationshipReportById` → render `ResultPage` from fetched data (not context). [App.jsx](src/App.jsx), [ResultPage.jsx](src/pages/ResultPage.jsx), [supabaseDataService.js:83](src/lib/supabaseDataService.js).
2. **Structured timeline** (schema + prompt + component). See §4 and §6.
3. **Upgrade the report model** off `gpt-5-nano` (set `OPENAI_REPORT_MODEL`). See §4.11.

### 🟠 Important — fix this week, not strictly blocking
4. **Evidence-backed flags/insights schema** (quote + confidence per item). §4.3.
5. **Personality accumulation** — store `personalityDelta`, merge instead of overwrite, one card per world. §4.5.
6. **Empty/error/loading states audit** — replace silent template fallbacks with honest "not enough evidence" affordances where evidence is genuinely thin. §5.
7. **Mobile timeline** — the horizontal `min-w-[920px]` scroll ([ResultPage.jsx:398](src/pages/ResultPage.jsx)) is the weakest mobile surface. §5.6.
8. **Data controls** — add "Delete this report" and "Delete my data" (RLS delete policies already exist; only UI is missing). §1.1 / ProfilePage.

### 🟡 Post-launch improvements
- Remove orphaned components (§1.6).
- Collapse the two AI engines into one (retire/flag Puter).
- Parallelize chunk summarization.
- Add model fallback chain + partial-result recovery.
- Cross-relationship comparison view.
- Progress visualization ("your profile is X% mapped").

### 🔵 Future matchmaking infrastructure
- Trait vectorization + `pgvector`, a normalized trait table, and a consent/visibility model. §4 (schemas) and §6 (phase 4).

---

## 3. Recommended Product Structure (ideal flow)

The current flow is close. Recommended target:

```
Landing (/)  ──►  Auth (/auth)  ──►  New Analysis (/analysis/new)
                                        1. Relationship type   ← move FIRST (drives focus + tone)
                                        2. Platform
                                        3. Person details (+ optional DOB)
                                        4. Upload / paste  (live parse preview)
                                        5. Review & validate (participants, date range, msg count, confidence)
                                             │
                                             ▼
                              Generating (structured progress by route)
                                             │
                                             ▼
        Results dashboard (/reports/:id)  ◄── deep-linkable, refresh-safe
            ├─ Summary + score cards
            ├─ TIMELINE (phases, turning points, effort/tone per phase)   ← hero
            ├─ Communication balance / effort / reciprocity charts
            ├─ Evidence-backed insight cards (expandable receipts + confidence)
            ├─ Red / green / mixed signals
            └─ Next best move
                                             │
                     ┌───────────────────────┼───────────────────────┐
                     ▼                        ▼                       ▼
        Personality update            AI Coach (/reports/:chain/coach)   Saved analyses (/reports)
        (relationship card)                                          (chains, compare over time)
                     │
                     ▼
        Understand Yourself (/personality-card)
            People Map (per world) + evolving overall profile + progress meter
                     │
                     ▼
        [FUTURE] Compatibility & Matchmaking (/matches)
```

Two concrete changes vs today:
- **Relationship type before platform.** It's the strongest driver of focus/tone ([relationshipFocus](supabase/functions/_shared/promptBuilder.ts)); ask it first.
- **Results at `/reports/:id`, not `/analysis/result`.** `/analysis/new` should redirect to the created report's URL on success.

---

## 4. AI Analysis Architecture

The bones are good. The upgrades are: (a) make the timeline a real object, (b) make evidence + confidence mandatory, (c) make personality genuinely cumulative, (d) raise the model.

### 4.1 Prompt architecture (keep, extend)
Keep the system/developer/user split in [promptBuilder.ts](supabase/functions/_shared/promptBuilder.ts). Add a dedicated **timeline segmentation instruction** and a **mandatory-evidence instruction** to `developerInstructions`.

### 4.2 Structured timeline (the key change)
Replace `timeline: []` with an explicit, required schema. Give the model the parser's `monthlyBreakdown`, `dailyNightBreakdown`, `importantMoments`, and `replyGaps` (already computed in [conversationPreprocessor.js](src/lib/conversationPreprocessor.js)) as the segmentation substrate.

```jsonc
"timeline": {
  "phases": [
    {
      "id": "phase-1",
      "label": "Fast, curious start",           // model-written, NOT canned
      "periodRange": "May 2024 – Jun 2024",
      "emotionalTone": "warm, high-energy",
      "initiator": "You" ,                        // who drove effort
      "effortBalance": 62,                        // 0-100, you vs them
      "whatHappened": "…",
      "whatWentRight": "…",
      "whatWentWrong": "…",
      "youMightNotHaveNoticed": "…",
      "turningPoint": { "quote": "…", "why": "…" } | null,
      "affectedNextPhaseBy": "…",
      "confidence": "Strong Pattern | Repeated Pattern | Early Signal | Not Enough Evidence",
      "evidenceQuotes": ["…", "…"]
    }
  ],
  "overallArc": "…"      // one-line shape of the whole relationship
}
```
Rule in the prompt: **3–6 phases derived from real message clusters; never fewer than 2; if evidence is thin, say so in `confidence` and keep phases few.** Then the UI renders phases directly instead of falling back to hardcoded labels.

### 4.3 Evidence extraction (make it mandatory)
Type every flag/insight the same way so "evidence-backed" is guaranteed, not hoped for:
```jsonc
{ "label": "", "explanation": "", "whyItMatters": "",
  "evidenceQuote": "", "confidence": "", "reflectionQuestion": "" }
```
Currently `redFlags: []` / `greenFlags: []` are untyped ([index.ts:321](supabase/functions/generate-relationship-report/index.ts)); the UI already *reads* `flag.whyItMatters`, `flag.reflectionQuestion` ([ResultPage.jsx:538](src/pages/ResultPage.jsx)) but the model isn't required to provide them. Type them; require `evidenceQuote` pulled from the actual chat.

### 4.4 Confidence scoring
Confidence labels exist (`Early Signal | Repeated Pattern | Strong Pattern | Not Enough Evidence`). Two changes: (1) attach confidence to **every** insight object, not just the personality card; (2) **surface it in the UI** as a small chip on each card so thin insights read as tentative rather than authoritative.

### 4.5 Personality updates — make evolution real
- Store `personalityDelta` (already generated at [schema:459](supabase/functions/generate-relationship-report/index.ts)) into a new `personality_history` table (append-only), so "how the user is changing over time" is answerable.
- Change `user_personality` write from wholesale overwrite ([index.ts:719](supabase/functions/generate-relationship-report/index.ts)) to a **merge**: preserve stable traits, strengthen repeated ones, only replace on higher confidence — which is exactly what the prompt already instructs ([promptBuilder.ts:213](supabase/functions/_shared/promptBuilder.ts)) but the storage layer ignores.
- People Map: query the **latest card per world** (window function or client `reduce` by `updatedAt`), not `find` first-match ([PersonalityCardPage.jsx:123](src/pages/PersonalityCardPage.jsx)).

### 4.6 Contradiction handling
When a new analysis contradicts a stored trait, don't silently overwrite. Prompt the model to emit `contradictsPrevious: [{ trait, oldSignal, newSignal, resolution }]` and show it in Understand Yourself as "this changed" — which is itself a compelling, sticky feature.

### 4.7 Relationship-specific vs global traits
Already modeled correctly conceptually: `relationship_personality_cards` = per-world; `understand_yourself_profiles` = global aggregate from concise summaries ([generate-personality-card](supabase/functions/generate-personality-card/index.ts)). Keep. Just make aggregation cumulative (§4.5) and label each global insight `relationshipSpecific | global`.

### 4.8 Long-chat chunking & aggregation
Sound. Two upgrades: run `summarizeChunk` calls with bounded concurrency (`Promise.all` in batches of ~4) instead of sequential ([index.ts:178](supabase/functions/generate-relationship-report/index.ts)); and persist chunk summaries so re-analysis / coach chat can reuse them (they're already put in `retrievalReadyMemory`).

### 4.9 Reducing hallucination / preventing generic output
- Raise the model (§4.11) — biggest lever.
- Require `evidenceQuote` on every insight (§4.3); a claim without a quote is a signal to soften or drop.
- Lower temperature for the *final synthesis* pass (currently 0.55 at [index.ts:520](supabase/functions/generate-relationship-report/index.ts)); 0.3–0.4 reduces invented detail. Keep chunk summaries at 0.35 (already good).
- Keep the "Not enough evidence yet" instruction but **reward** it — instruct the model that saying so is correct behavior, not a failure.

### 4.10 Handling insufficient evidence
`warningFlags` already computed for small samples / low parse confidence / <2 participants ([conversationPreprocessor.js:359](src/lib/conversationPreprocessor.js)). Surface them in the report header as an honest banner ("Short sample — treat as directional"), and pass them into the prompt so the model calibrates. Today they're computed but not shown.

### 4.11 Cost & model strategy
```
OPENAI_REPORT_MODEL default gpt-5-nano  →  recommend a mid/large model for final synthesis,
keep a nano/mini for chunk summaries (they're extractive, cheap, and numerous).
```
Two-tier: cheap model for the many chunk-summary calls, strong model for the single final synthesis. This keeps cost near-flat while sharply improving the output users actually read.

### 4.12 Fallback & retry
Add a model fallback chain (primary → secondary) around `fetchOpenAiText`, and consider splitting the mega-JSON into 2 calls (report core; personality) so one failure doesn't nuke the whole thing. The credit is already refunded on failure — keep that.

---

## 5. UX & Visual Improvements

The report is already card-based and premium-looking (glass cards, recharts, radar, donuts). The gaps are structural, not stylistic.

1. **Timeline as the hero.** Vertical, scrollable phase rail on mobile; horizontal on desktop. Each phase = expandable card (tone, initiator, effort bar, what-went-right/wrong, turning-point receipt, confidence chip). Adopt/rework the orphaned [TimelineChart.jsx](src/components/TimelineChart.jsx) for the trend sparkline behind it. **Kill the hardcoded phase-name fallback** ([ResultPage.jsx:409](src/pages/ResultPage.jsx)).
2. **Insight cards with expandable evidence.** Collapsed = conclusion + confidence chip. Expanded = why + the actual quote + reflection question. Applies to flags, mixed signals, communication patterns.
3. **Confidence indicators** on every card (small pill: Strong / Repeated / Early / Thin).
4. **Communication balance / effort / reciprocity.** You already compute `senderStats`, `replyGaps`, `dailyNightBreakdown`. Turn effort balance into a clear "who initiates / who replies faster" split, not just a donut.
5. **Emotional tone trend** across phases (line), fed by the structured timeline rather than synthesized.
6. **Mobile.** Audit the `min-w-[920px]` timeline ([ResultPage.jsx:398](src/pages/ResultPage.jsx)) and wide grids; make the timeline a vertical stack under `sm`. Everything else is largely responsive already.
7. **Understand Yourself progress.** A "profile completeness" meter (worlds mapped / total) and a "what changed since last analysis" strip (from `personalityDelta`, §4.5) to create return-visit pull.
8. **Cross-relationship comparison** (post-launch): small multiples of the same trait across worlds.

---

## 6. Implementation Plan (ordered, with acceptance criteria)

### Day 1 — launch-critical (do in this order)

**Task 1 — Deep-linkable, refresh-safe reports** 🔴
- Files: [App.jsx](src/App.jsx) (add `/reports/:id` route), [ResultPage.jsx](src/pages/ResultPage.jsx) (accept an `id`, fetch via [fetchRelationshipReportById](src/lib/supabaseDataService.js:83) when context is empty, keep context as fast-path), [ReportsPage.jsx:45](src/pages/ReportsPage.jsx) + [ReviewAnalysisStep.jsx:149](src/components/ReviewAnalysisStep.jsx) (navigate to `/reports/:id` on success).
- Depends on: nothing.
- Test: generate a report → copy URL → hard refresh → report renders identically. Open in a new tab. Open an old report from `/reports`.
- **Acceptance:** no path shows the empty state when a valid report id exists; refresh never loses a report.

**Task 2 — Structured timeline (schema + prompt + UI)** 🔴
- Files: schema `requiredOutputSchema.relationshipReport.timeline` → object per §4.2 ([index.ts:330](supabase/functions/generate-relationship-report/index.ts)); add segmentation instruction in [promptBuilder.ts:151](supabase/functions/_shared/promptBuilder.ts); pass `monthlyBreakdown`/`replyGaps`/`importantMoments` (already in the summary) as segmentation substrate; new `Timeline` render in [ResultPage.jsx:396](src/pages/ResultPage.jsx) reading `timeline.phases`; remove hardcoded labels at :409/:451.
- Depends on: Task 1 (so you can re-open while iterating).
- Test: run 3 real chats (short romantic, long friend, sparse family). Verify 2–6 phases, real labels, per-phase tone/effort/turning point, and honest confidence on the sparse one.
- **Acceptance:** zero canned phase names appear; each phase cites at least one real quote or explicitly says evidence is thin.

**Task 3 — Raise the synthesis model** 🔴 (config-only)
- Set `OPENAI_REPORT_MODEL` to a mid/large model for final synthesis; keep nano/mini for `summarizeChunk` ([index.ts:152](supabase/functions/generate-relationship-report/index.ts)). Drop final-synthesis temperature to ~0.4 ([index.ts:520](supabase/functions/generate-relationship-report/index.ts)).
- Test: A/B the same chat old vs new model; confirm specificity (named behaviors, quotes) improves and JSON still parses.
- **Acceptance:** report reads specific, not templated, on a mid-length real chat.

### Day 1–2 — important

**Task 4 — Evidence + confidence on every insight** 🟠
- Type flags/mixed-signals/insights per §4.3 in the schema; require `evidenceQuote`; render a confidence chip + expandable evidence in [ResultPage.jsx](src/pages/ResultPage.jsx) flag/mixed-signal cards.
- **Acceptance:** every rendered flag shows either a real quote or a visible "limited evidence" state.

**Task 5 — Real personality accumulation** 🟠
- New `personality_history` table (append `personalityDelta`); change `user_personality` upsert to merge, not overwrite ([index.ts:719](supabase/functions/generate-relationship-report/index.ts)); People Map → latest-per-world ([PersonalityCardPage.jsx:123](src/pages/PersonalityCardPage.jsx)); add "what changed" strip.
- **Acceptance:** two analyses in the same world visibly refine (not replace) the card; the second report shows a delta.

**Task 6 — Honest states + mobile timeline** 🟠
- Surface `warningFlags` as a header banner ([ResultPage.jsx:322](src/pages/ResultPage.jsx)); make the timeline vertical under `sm`; replace the most template-y `safe()` fallbacks with genuine empty affordances.
- **Acceptance:** a 6-message chat clearly reads as "directional, small sample," not as a confident full report; timeline usable one-handed on a phone.

**Task 7 — Data controls** 🟠
- Add "Delete report" on [ReportsPage.jsx](src/pages/ReportsPage.jsx) and "Delete all my data" on [ProfilePage.jsx](src/pages/ProfilePage.jsx) (delete RLS policies already exist).
- **Acceptance:** a user can delete a single report and wipe their account data from the UI.

### Post-launch (in priority order)
8. Remove orphaned components (§1.6) — 30 min, low risk.
9. Feature-flag off the Puter free path; unify on the edge function.
10. Parallelize chunk summarization; add model fallback chain + split mega-JSON.
11. Cross-relationship comparison + profile-completeness meter.

### Future — matchmaking (architecture now, feature later)
- Add `pgvector`; a `personality_vectors(user_id, vector, dimensions jsonb, visibility)` table; derive vectors from `understand_yourself_profiles` + per-world cards. Add an explicit `matchmaking_consent` flag on `profiles`. Nothing about today's schema blocks this — the per-world + global split is already the right shape. **Do not build matching logic now**; just land the consent column and keep personality data structured so a later job can vectorize it.

---

## 7. Launch-readiness checklist (from your deadline requirements)

| Requirement | Status today | After Day-1 tasks |
|---|---|---|
| Reliable chat upload & parsing | ✅ Already strong | ✅ |
| High-quality relationship analysis | ⚠️ `gpt-5-nano`, template-prone | ✅ (Task 3, 4) |
| Detailed timeline | 🔴 Generic/hardcoded | ✅ (Task 2) |
| Evidence-backed insights | ⚠️ Inconsistent | ✅ (Task 4) |
| Evolving personality profile | 🔴 Overwrites, not cumulative | ✅ (Task 5) |
| Polished Understand Yourself | ✅ Visually; ⚠️ accumulation | ✅ (Task 5) |
| Strong mobile usability | ⚠️ Timeline weak spot | ✅ (Task 6) |
| Loading / error states | ✅ Mostly; ⚠️ silent fallbacks | ✅ (Task 6) |
| Privacy & data controls | ✅ RLS/filters; ⚠️ no delete UI | ✅ (Task 7) |
| No placeholder/broken functionality | ⚠️ Refresh-loss + dead components | ✅ (Task 1, 8) |
| Matchmaking-ready architecture | ✅ Right shape, not built | ✅ (consent column) |

**Bottom line:** Tasks 1–3 are the real "launchable by tomorrow" set; 4–7 make it match the vision. The codebase is well-built enough that all of Day-1 is achievable in a day.
