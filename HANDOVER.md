# Handover: Destiny Reports (Spanish AI astrology product)

## Estado actual (keep this section updated — it is the first thing read)

Last updated: 2026-08-13 — **design only, nothing built, still 241
tests.** Two things happened since the last entry, both on paper:

1. The paid report's **plain register** was specced and plan A written
   (2026-08-10, commits `1b0c571`, `2bf5e4f`, `9a69de6`). This was
   missing from this checklist entirely until today — see "Next up".
2. The **character card** was specced and its phase-1 plan written
   (2026-08-13). It reconciles with the plain-register spec, which was
   amended in five places to absorb it. See **Addendum 14**.

Before that, 2026-08-10 — **plan 4 phase A built** (report component,
section index, 9:16 share card, preview route). 241 tests. The three
battery reports now render at `/preview/informe/<chart>`, which answered
Addendum 12's open ~3,000-word question: the length is fine, the
paragraphs are not. See **Addendum 13**.

Before that, same day: plan 1 (per-section generation core) built and
measured. The battery found the gate, not the model, is the
problem, and that an invented retrogradation shipped because nothing
gated grounding on the paid tier. Three fixes applied AND confirmed by a
second battery run: 28.2 min/$1.03/2-of-3 → 5.4 min/$0.12/3-of-3, zero
escalations, zero grounding failures. Read Addendum 12 before touching
`validateSection` or `src/sections.ts`.

### Done
- [x] Chart computation engine (Placidus + whole-sign fallback), 25 tests
- [x] Report + teaser prompt layer, PII-free, injection-sanitized
- [x] Model bake-off run, ranked blind → `bakeoff-out/RANKING.md`
- [x] Models selected: Kimi K3 (paid report, $0.216), DeepSeek V4 Flash
      (teaser, ~$0.0008) — details in Addendum 2. **The paid half of this
      was superseded on 2026-08-08 (Addendum 10): DeepSeek V4 Pro per
      section, Kimi K3 as escalation. The free tier is unchanged.**
- [x] Prompt hardening: aspect-vocabulary, retrograde, gender-neutrality
      rules in both prompts (tests assert them)
- [x] `validateTeaser()` mechanical output gate + 8 tests
      (baseline measured 2026-08-07: 55 tests in 4 files, all green —
      the "42" quoted here and in CLAUDE.md was stale). After the
      free-reading redesign: 151 tests in 9 files. After the prompt
      fragment split (Addendum 8) and the word-boundary fixes
      (Addendum 9): **169 tests in 9 files**.
- [x] Git repo initialized, pushed to GitHub
- [x] Historical timezone resolver (`src/birthtime.ts`, tz-lookup +
      Node ICU tz database, 6 tests incl. pre-1940 Madrid GMT+0)
- [x] Next.js 16 app scaffolded in `web/`, wired to astro-core sources
      via `@core/*` path alias + `turbopack.root` (build + typecheck green)

### Next up (in order)
- [x] Birth-place autocomplete: bundled GeoNames index + searchPlaces()
      + /api/places route, live end-to-end (Addendum 4)
- [x] Landing page + birth-data form (es-ES, mobile-first), free teaser
      flow live: /api/chart (instant) + /api/teaser (Flash → gate →
      retry ≤2). Design direction + latency findings in Addendum 5.
- [x] Free-reading redesign — SHIPPED. Plan:
      `docs/superpowers/plans/2026-08-07-free-reading-redesign.md`,
      spec: `docs/superpowers/specs/2026-08-07-free-reading-redesign-design.md`.
      Computed profile layer (`src/rulers.ts`, `src/profile.ts`,
      `src/copy/`), one Flash call behind `src/validate.ts`, new
      `/api/free` + UI modules. Measured results in Addendum 7 — read
      that before touching the free prompt or the gate.
- [x] Shared prompt fragments split by tier (Addendum 3 item 2, finished
      2026-08-08). `{{RULES}}` = universal, `{{RULES_CHART}}` = technical
      vocabulary, free tier gets only the first. Addendum 8.
      Both batteries re-run against it; a control run proved the free
      tier's lower pass rate is DeepSeek drift, not the split.
- [x] Gate word boundaries made Unicode-aware (Addendum 9) — `\b` is
      ASCII-only, so "te hace soñar" and "solía" were misread. Three
      false positives fixed, one known false negative left open.
- [x] **Paid report flow designed** (2026-08-08). Spec:
      `docs/superpowers/specs/2026-08-08-paid-report-flow-design.md`.
      Roadmap of all four plans:
      `docs/superpowers/plans/2026-08-08-paid-report-roadmap.md`.
      Read the spec before touching any of the plans below. Two calls in
      it are counterintuitive and both have their reasoning recorded in
      Addendum 10: the paid report moves off Kimi to DeepSeek V4 Pro
      per section, and the paid tier gets no gender gate.

The paid report is now four sequential plans. Plan 1 is built; plans 2-4
are not.

- [x] **Plan 1 — section generation core** — BUILT AND MEASURED
      (2026-08-10). `src/sections.ts`, `src/allocate.ts`,
      `prompts/system-section.md`, `buildSectionMessages`,
      `validateSection`, `composeReport`, `scripts/battery-sections.ts`.
      169 → 205 tests, 215 after the fixes below. Battery run once
      (against the 205-test state); results and the three
      recommended fixes are in **Addendum 12**. The Addendum 10 quality
      risk did NOT materialise — V4 Pro holds up. What did materialise is
      that `validateSection`'s length gate rejects good prose and
      escalates to Kimi for it, which is slower and dearer than the
      single call it replaced. **Do the Addendum 12 fixes before
      plan 3 wires this to a queue.** Three are DONE (escalation no
      longer fires on length; the Amor brief is 350-480; grounding is
      gated after an invented retrogradation shipped), and CONFIRMED by
      a second battery run — Addendum 12's confirming-run table.
- [ ] **Plan 2 — orders, payment, persistence** — PLAN WRITTEN
      2026-08-10, not executed:
      `docs/superpowers/plans/2026-08-10-orders-payment-persistence.md`.
      Eight tasks, 215 → ~264 tests. Supabase schema (`orders`,
      `report_sections`, `entitlements`) behind RLS that denies
      everything, `/api/checkout`, Stripe webhook with signature
      verification and a conditional `paid` claim, 24h sweep that
      deletes unpaid birth data. **First plan that needs your
      credentials** (Stripe + Supabase), so it cannot run unattended.
      Two roadmap instructions were corrected against current vendor
      docs — the App Router has no body parser to disable, and
      `payment_method_types` must NOT be set or Bizum can never appear.
      **Bizum is behind a Stripe early-access request**; the plan
      deliberately does not block on it.
- [ ] **Plan 3 — queued generation pipeline.** Inngest two-wave fan-out,
      conditional `paid → generating` claim, per-section retry and Kimi
      escalation, Resend email.
- [~] **Plan 4 — delivery UI** — `docs/superpowers/plans/2026-08-10-delivery-ui.md`.
      **Phase A BUILT 2026-08-10** (215 → 241 tests): `ReportView`,
      `ReportIndex`, `ShareCard`, `web/src/lib/report-format.ts` and the
      dev-only `/preview/informe/<chart>` route over the battery reports.
      It answered the ~3,000-word question — **Addendum 13**. Three
      places where the plan was written against APIs this repo does not
      have are recorded there too; read it before executing phase B.
      **Phase B NOT started** (`/informe/<token>`, 2 s polling,
      progressive rendering, wiring the CTA at `BirthForm.tsx:287`) —
      it needs plans 2 and 3.
**The paid report's register** is a separate track from the four plans
above, and was missing from this list until 2026-08-13. It does not block
plans 2 and 3, and plans 2 and 3 do not block it.

- [ ] **Plain register, plan A — the words.** Spec:
      `docs/superpowers/specs/2026-08-10-paid-report-plain-language-design.md`
      (amended 2026-08-13). Plan:
      `docs/superpowers/plans/2026-08-10-paid-report-plain-register.md`.
      Eight briefs rewritten, `{{RULES_CHART}}` out of the report prompt,
      `RELATION_ES` created, `buildSectionMessages` handing over
      pre-translated data, `groundingProblems` rewritten against the new
      vocabulary. **Ends by running `scripts/battery-sections.ts`** — the
      prose-quality risk is real and only the battery measures it.
      Nobody has ever asked V4 Pro for 3,000 words of plain Spanish.
- [ ] **Plain register, plan B — the presentation.** Per-section data
      strip, `HookCard`, `matchesFor`, decorated `ReportSection`, shared
      glyph handling. No LLM, no vendors, no network. Goes after A.
- [ ] **Character card, phase 1 (free tier).** Spec:
      `docs/superpowers/specs/2026-08-13-character-card-design.md`. Plan:
      `docs/superpowers/plans/2026-08-13-character-card-free.md`.
      Eleven tasks, ~+45 tests. **Ships independently of everything
      above** — the free card carries no traits, so it needs no
      `RELATION_ES`. Renders with zero LLM calls. Read Addendum 14 first.
- [ ] **Character card, phase 2 (paid).** Blocked on plan A
      (`RELATION_ES`) and plan B (glyphs, area copy). Needs its own plan
      once those exist. Carries the ~126-entry trait table, the drafting
      script, the seven planet rows and the provenance test.
- [ ] PDF rendering (Puppeteer over the same report component) — own spec
- [ ] Daily cron: transits once/day → 12 horoscopes → Supabase cache
- [ ] Oracle chat (post-MVP): system-oracle.md, rolling window, quotas

### Small pending fixes
- [x] `parseReport` tolerant of `#` vs `##` — DONE in plan 1 task 3
      (2026-08-10). Any heading level, whole-line match only.
- [ ] Compiled `dist/` can't find `prompts/` (only matters when the
      package is consumed from build output)
- [ ] Re-verify Kimi K3 on its pinned production host before launch.
      Now better evidenced: on 2026-08-08 the same slug cost $0.218 and
      $0.481 on two calls and returned empty once. Kimi is no longer the
      primary paid model (Addendum 10) but it IS the escalation path, so
      this still matters.
- [ ] `acabas agotada` escapes the gender check — the rule's verb list
      omits "acabas" (Addendum 9). A false negative, the dangerous
      direction. Free tier only; the paid tier logs rather than gates.

## What this is

A Spanish-market consumer product: paid AI-generated natal chart reports
(€9.90-14.90 one-time), free teaser readings as the conversion hook, daily
horoscope content for SEO/TikTok as a Tier-1 free layer. Business context:
copying a proven Chinese paid-AI-astrology pattern into the EU market where
Chinese exporters aren't competing (deep localization play, not a thin
wrapper). Full strategy reasoning lives in prior chat history if needed —
conversation_search for "destiny reports" or "AI fortune telling China" will
surface it — but the code is self-contained and doesn't require that context.

Second idea in the same conversation (not started): a nautical-license
(PER/PNB) AI exam tutor with photo-graded chart-plotting exercises. Ranked
#2, not built yet. Ignore unless explicitly asked to pick it up.

## What's built so far: `astro-core` package

A TypeScript package consumed by the Next.js app in `web/` through the
`@core/*` path alias. (This section used to say "NOT yet wired into a
Next.js app" — that stopped being true when the app was scaffolded.) It
has two layers:

**1. Chart computation** (`src/chart.ts`, `ephemeris.ts`, `houses.ts`,
`aspects.ts`, `zodiac.ts`, `types.ts`)
- `computeNatalChart({utc, latitude, longitude}, {houseSystem?})` → full
  `NatalChart` JSON. Pure math via `astronomy-engine` (MIT license), zero
  network calls, safe for edge functions.
- Placidus houses by default (Spain standard), auto-fallback to whole-sign
  above ±66° latitude (flagged via `houseSystemFallback: true`).
- **Deliberately does NOT do timezone resolution or geocoding** — caller
  must resolve birth locale time → UTC instant before calling this. This is
  the single most important integration detail; get it wrong and every
  chart downstream is silently wrong. Use a tz-database-by-coordinates
  lookup keyed to the *historical* birth date, not the browser's current
  timezone.
- Tests (`tests/chart.test.ts`, 25 cases) validate against astronomical
  ground truth (equinox/solstice instants, new/full moon, geometric sunrise
  = Ascendant), not hand-copied numbers. All passing.

**2. Report/prompt layer** (`src/report.ts`, `prompts/*.md`)
- `buildReportMessages({chart, firstName?, focus?})` and
  `buildTeaserMessages({chart, firstName?})` → provider-agnostic
  `[{role:"system",...},{role:"user",...}]` arrays, ready for any
  OpenAI-compatible chat completions endpoint.
- The chart JSON is slimmed before it reaches the LLM (no raw longitudes,
  no obliquity/sidereal metadata) — full report prompt ≈1.7K tokens, teaser
  ≈1K tokens.
- **No PII crosses into the LLM call** — only sign/degree/house/retrograde
  data plus an optional first name. This was a deliberate architecture
  choice so the LLM provider choice (see below) is a low-stakes GDPR
  decision.
- `prompts/system-report.md` (es-ES): 8 fixed sections, ~2000-2500 words,
  hard grounding rule (every claim names its placement), anti-Barnum
  rule, content bans (no health/death/money/dated predictions).
- `prompts/system-teaser.md` (es-ES): 120-160 word free hook engineered for
  a "how did it know that" moment plus one dangling thread, no sales CTA.
- `parseReport(markdown)` validates the 8-section structure for downstream
  rendering; returns `null` on structural failure → caller should retry
  once then flag.
- First-name input is sanitized (letters only, 40 char cap) as
  prompt-injection defense-in-depth.
- Tests (`tests/report.test.ts`, 8 cases) cover message assembly, PII
  absence, injection sanitization, and parser correctness. All passing.

**3. Model bake-off harness** (`bakeoff.ts`, `prompts/rubric.md`)
- RUN on 2026-08-05 — see "Addendum 2" at the bottom of this file for
  results, model selections and costs. Original notes kept below for
  context on how the harness works.
- Generates the same 3 test charts (Madrid/Buenos Aires/Bilbao, chosen for
  different chart "textures") across 5 candidate models: Kimi K3, DeepSeek
  V4, GLM 5.2, Mistral Small 4, Claude Haiku 4.5 (quality baseline).
  **Verify these exact model slugs against openrouter.ai/models before
  running — names drift and a stale slug just writes an ERROR file for
  that letter, doesn't crash the run.**
- Outputs blinded to `bakeoff-out/<chart-name>/[A-E].md`, mapping saved
  separately to `bakeoff-out/KEY.json` — rank via the rubric BEFORE
  opening the key file, or the blinding is worthless.
- `prompts/rubric.md`: weighted rubric, chart-grounding is an eliminatory
  criterion (one invented planetary placement disqualifies a model
  regardless of prose quality).

## Full package status

```
astro-core/
├── package.json          # "type":"module", scripts: test/example/build
├── tsconfig.json
├── example.ts             # run: npm run example (prints a sample chart)
├── bakeoff.ts              # NOT YET RUN — needs OPENROUTER_API_KEY
├── README.md               # setup + design-contract docs, keep in sync
├── src/
│   ├── types.ts            # NatalChart JSON contract — the LLM boundary
│   ├── zodiac.ts, ephemeris.ts, houses.ts, aspects.ts, chart.ts
│   └── report.ts            # prompt assembly + parseReport()
├── prompts/
│   ├── system-report.md, system-teaser.md, rubric.md
└── tests/
    ├── chart.test.ts (25 tests), report.test.ts (8 tests)
```
**The tree above is the 2026-08-05 snapshot and is now incomplete** — it
predates `src/birthtime.ts`, `places.ts`, `profile.ts`, `rulers.ts`,
`validate.ts`, `src/copy/`, the `prompts/rules-*.md` fragments, `web/`
and `scripts/`. Trust `ls` over this diagram. **169 tests passing** as of
2026-08-08; `npm test` and `npm run example` both verified.

## Immediate next steps, in order

1. **Run the bake-off.** Get an OpenRouter key, verify model slugs, run
   `npx tsx bakeoff.ts`, rank blind with the rubric, pick the paid-report
   model. Cheap models (DeepSeek Flash / Gemini Flash-Lite) for the free
   teaser + daily cron tier regardless of bake-off winner — cost only
   matters at scale on the free tier, not on the €9.90 paid tier.
2. **Landing page + birth-data form** (Next.js, per Carlos's usual stack).
   Needs: places autocomplete for birth location, server-side historical
   timezone resolution (lat/lon + date → UTC offset at that date — NOT the
   current offset), free teaser rendering.
3. **Stripe checkout** — one-time payment, enable Bizum explicitly (Spain
   conversion driver), webhook-triggered generation (don't block checkout
   on LLM latency; background job + email delivery + "preparing your
   reading" holding page).
4. **PDF rendering** — Puppeteer server-side rendering the same report
   page component, not a separate layout.
5. **Daily cron** (Tier 1, free/SEO layer) — n8n or Vercel cron, computes
   today's transits once, generates 12 sign horoscopes, caches in
   Supabase, feeds both the SEO pages and the Remotion/TikTok pipeline.

## Key architectural decisions already made (don't relitigate without cause)

- **Web-first, not mobile app** — Bizum + Stripe's low take-rate vs Apple/
  Google's 30% cut on digital goods; app-store review risk for fortune-
  telling category; distribution (TikTok, SEO) is web-native anyway.
- **One-time payments, not subscription** — matches impulse-purchase
  psychology in this category; subscription fatigue is the incumbents'
  weak point.
- **Placidus default, whole-sign fallback** — not user-configurable at
  launch; Placidus is the Spanish-market expectation.
- **PII never reaches the LLM** — only derived chart data + optional first
  name. Keep this invariant when wiring up the real backend.
- **Two-tier LLM cost model**: cheap/fast model for teaser + daily cron
  (scales with traffic), quality-optimized model for the €9.90+ paid report
  (cost is a rounding error there — six cents either way against the
  price point, so optimize for Spanish prose quality, not price).

## Things NOT yet decided / open questions for Claude Code to flag back

- Which model wins the bake-off (blocked on running it).
- Exact Supabase schema for storing charts, reports, orders (not designed
  yet — natural next artifact once the backend build starts).
- Geocoding/timezone provider choice (needs an API — Google Places +
  a tz-by-coordinate library, or similar; not selected yet).
- Whether to pursue the palm-photo-reading feature (Chinese-market
  differentiator mentioned in strategy discussion) at launch or as a v2.

---

## Addendum: Competitive positioning + the Oracle chat feature (added after initial handover)

Not yet built in code — this section documents product decisions made in chat
that Claude Code should design toward once the MVP report pipeline is done.

### Competitive positioning vs Co-Star (the market's dominant reference point)

Same category (AI-powered natal chart astrology), deliberately different
shape — don't build toward feature parity with Co-Star, build toward this
contrast:

| | Co-Star | This product |
|---|---|---|
| Model | Free app, subscription for depth | One-time paid report + free teaser |
| Engagement engine | Daily push notifications | Oracle chat (see below) |
| Voice | Blunt, dry, algorithmic | Warm, intimate, es-ES tarotista voice |
| Market | English-first, global | Spanish-first, Spain (Bizum) |
| Platform | Native mobile app | Web-first |

Researched Western competitors and their single differentiators (don't
duplicate, don't need to match): Co-Star = social/friend compatibility +
shareable blunt notifications. CHANI = single-voice thoughtful writing +
guided rituals. Sanctuary = chat-format delivery + human astrologer access
(explicitly NOT copying the human-in-loop part). The Pattern = psychological/
relationship depth. Nobody in the Western market currently offers live,
open-ended conversation with your own chart — that's the identified gap.

Researched Chinese revenue benchmarks for pricing-ladder validation: CeCe
(测测) ~$5M/yr App Store revenue via AI base reading + paid human-expert
upsell (NOT replicating the human part). Lingji (灵机) ~80M registered users,
2M+ daily divination sessions. Common pricing ladder across Chinese apps:
¥9.9 basic reading / ¥199 annual forecast / ¥999 premium tier — this maps
directly onto: free teaser → €9.90 report → annual "tu año" forecast →
Oracle chat quota top-ups (see below) as the fourth rung.

### The Oracle chat feature ("wow" / word-of-mouth driver)

**Concept:** after buying the full report, the user gets access to a chat
interface that has their `NatalChart` JSON + today's transits loaded as
permanent context, and can ask anything in natural language, grounded in
their actual placements — not a generic chatbot, a conversational layer
over `computeNatalChart()` output. Reuses the exact grounding discipline
already built into `system-report.md` (name the placement behind every
claim, no invented positions, no health/death/dated-prediction claims,
agency-preserving language — not fatalistic).

**Why this over a generic chatbot:** the report is necessarily generic-to-
the-chart (same output every time for the same person); the chat is
generic-to-the-moment (two people with identical charts get different
conversations depending what they ask "today"). That's a harder thing for
a cloner to replicate quickly — the moat is prompt-craft and grounding
discipline, not a feature checklist.

**Cost-control architecture (IMPORTANT — this is the part that makes the
feature viable, not a nice-to-have):**

The naive failure mode is resending full conversation history on every
message, which makes cost grow quadratically with conversation length — a
100-message conversation could cost several dollars against a one-time
€9.90 purchase. Do NOT build it that way.

Correct design:
1. **Fixed context per message**: chart JSON (~1.5K tokens, constant) +
   a short rolling window (last 2-3 exchanges only, NOT full history) +
   the new question. Cost per message stays flat regardless of
   conversation length.
2. **Cheap model for chat** (DeepSeek Flash-class or similar from the
   bake-off's free-tier candidates, NOT the premium report-writing model).
   At flat context size, per-message cost is roughly $0.0004-0.001.
3. **Quota bundled with purchase, not "unlimited forever"**: e.g. "20
   preguntas incluidas con tu informe." Concrete, honest, cheap to fulfill.
4. **Top-up as a real SKU**: "10 preguntas más — €2.99" — turns the
   feature into a second monetization surface (the 4th rung on the
   pricing ladder above) rather than an open liability. Converts your
   most-engaged users into repeat payers instead of being a cost sink.
5. **Daily rate cap regardless of quota remaining** (e.g. 5 msgs/day) —
   kills bot abuse / scraping risk without affecting real users.

**Marketing line to use once built** (honest, bounded, still differentiated):
"Tu informe no termina cuando lo terminas de leer — puedes seguir
preguntando" with quota terms stated plainly on the product page.

### Secondary viral mechanic: shareable "cosmic signature" card

Auto-generated on report delivery: Big Three + one real, computed statistic
("Solo el 3% de las cartas natales tienen esta combinación exacta de
Sol-Luna-Ascendente") styled for Instagram Stories / TikTok native aspect
ratio, one-tap share. The percentage should be genuinely computed from
sign/degree distribution logic (extend `src/report.ts` or a sibling module),
not a fake/random number — same grounding discipline as the report itself.
This is cheap to build relative to the Oracle chat and should probably ship
alongside the report/card MVP, with the Oracle chat as the fast-follow.

### Revised build sequencing (supersedes the "immediate next steps" list above)

1. Bake-off → pick paid-report model (unchanged).
2. Landing page + birth form + Stripe/Bizum checkout (unchanged).
3. Report delivery + **shareable cosmic-signature card** (moved up — cheap,
   high distribution value, ship with MVP not as a v2).
4. Daily cron / Tier-1 free content (unchanged).
5. **Oracle chat** as the fast-follow after MVP validates — needs: a new
   prompt file (`system-oracle.md`, same grounding rules as the report
   prompt but conversational), a rolling-window context builder (do NOT
   reuse `buildReportMessages` as-is — it assumes single-shot), quota
   tracking in Supabase (messages_remaining per order), and a rate limiter.

---

## Addendum 2: bake-off results and model selection (2026-08-05)

Everything in this section is reproducible from the repo: full blind
scoring in `bakeoff-out/RANKING.md`, raw outputs + per-chart ground
truth in `bakeoff-out/`, mapping in `bakeoff-out/KEY.json`.

### Selected models

| Tier | Model | Measured cost/unit | Notes |
|---|---|---|---|
| Paid report (€9.90+) | `moonshotai/kimi-k3` | $0.216 | Bake-off winner, 54/55. Reasoning model: needs `max_tokens` ≈ 24000 (returns EMPTY content at 6000). Re-verify on the pinned production host before launch (fp8 vs bf16). |
| Free teaser + daily cron | `deepseek/deepseek-v4-flash` | ~$0.0008 | Must run behind `validateTeaser()` with retry ≤2 (expected delivered cost ~$0.0011–0.0015). Needs `max_tokens` ≈ 8000 (intermittent reasoning bursts). |

### Bake-off ranking (blind, per prompts/rubric.md)

1. Kimi K3 — 54. Only model with a perfect grounding record; found true
   negative-space insights (aspectless "Luna isla" in bilbao, Venus
   conjunct MC in buenosaires). Best Spanish of the five.
2. DeepSeek V4 Pro — 49.5. Fully grounded; structure/length slips.
3. GLM 5.2 — 46, DISCARDED: invented two aspects on the madrid chart.
4. Claude Haiku 4.5 — 38.5. English sign names leak into Spanish text.
5. Mistral Small 2603 — 33, DISCARDED: invented placements on madrid.

### Decisions made after the bake-off

- **Teaser tier = Flash + mechanical gate, not a better model.** A 6-run
  V4 Pro teaser comparison failed at the same ~1-in-3 rate as Flash
  (invented retrogradation, gendered participle) at ~6x the cost. Model
  upgrades do not fix teaser compliance; the gate does. `validateTeaser()`
  in `src/report.ts` checks word range, truncation, gendered phrasing,
  invented retrogradations and invented aspect claims — verified to catch
  6/6 known-bad and pass 12/12 known-good stored outputs.
- **Prompt hardening (both prompts):** aspect vocabulary restricted to
  pairs in the JSON `aspects` list; "retrógrado" restricted to planets
  with `retrograde: true`; gender-neutral phrasing rule (no gender
  inference from first name) — tests assert both prompts contain it.
- **Observed failure pattern worth remembering:** the bilbao chart
  (Leo Sun/Venus — "being seen/admired" themes) pulls Spanish toward
  feminine participles ("ser vista/admirada/reconocida") across ALL
  models and rounds. Multi-chart test batteries are mandatory for any
  prompt or model change; bilbao-2000 is the canary.
- **Empty-output failure mode:** reasoning models can spend the whole
  token budget before emitting content (HTTP 200, `finish_reason:
  "stop"`, empty `content`). Any production call needs a generous
  `max_tokens` plus an emptiness check — never trust status alone.

### Harness scripts kept in repo

- `bakeoff.ts` — the original 5x3 blinded run.
- `retry-empties.ts` — re-runs empty/truncated bake-off cells at higher
  token budget without unblinding.
- `meter.ts` — metered cost measurement (billed `usage.cost`) for the
  DeepSeek report/teaser calls.

---

## Addendum 3: extensibility notes for future products (2026-08-05)

Future upsells (daily/weekly/monthly/yearly horoscopes, per the pricing
ladder) fit the existing architecture as new instances of the product
template: prompt file → build*Messages → model+budget → mechanical
validator → retry policy. Four things to do at the right moment, none
speculatively:

1. **Transit-to-natal aspects** (engine, build with the first periodic
   product): aspects.ts only computes intra-chart aspects. Personalized
   periodic content needs cross-aspects between today's positions and the
   natal chart; yearly needs a solar-return instant finder (root-search
   on the Sun's longitude). Both are small pure modules.
2. **Shared prompt fragments** — DONE. Composition shipped in 786448b;
   the per-tier split that made it correct is Addendum 8 (2026-08-08).
3. **Product-generic schema** (do when designing the Supabase schema —
   expensive to retrofit): orders carry a product_code; access is modeled
   as entitlements (report access, oracle quota, "daily pass until date
   X"). New SKU = product row + prompt file, no migration. Periodic
   upsells are sold as one-time time-boxed passes, never subscriptions
   (locked decision).
4. **Per-product content rules** (with the first periodic product): the
   report bans dated predictions; a daily horoscope IS one. Split rules
   into universal (health/death/money, grounding, gender) vs per-product
   (prediction scope, length, structure).

---

## Addendum 4: birth-place autocomplete = bundled GeoNames, not an API (2026-08-05)

Decision: place search runs on our own server over a bundled GeoNames
cities500 index (`data/cities.json.gz`, 235K places, built by
`scripts/build-cities.ts`, refresh ~yearly). Not Google Places, not
Photon. Reasons: (1) birth place + date is sensitive data and this way
no third party sees a keystroke — consistent with the no-PII posture;
(2) no rate limits / outage mode at the top of the funnel; (3) village-
level coordinate precision is irrelevant to chart accuracy (~1° of
Ascendant per ~100km). Trade-offs accepted: towns under ~500 people
missing (UI should hint "elige el municipio más cercano"), and foreign
exonyms don't match (a user typing "Londres" won't find London — fine
for the ES/LatAm birth-place use case). If real users report missing
towns, bolt Google Places on as a fallback endpoint; the form component
doesn't change. Ranking: Spain first, then Spanish-speaking countries,
population within tier, dominant tier capped at 60% of results so big
LatAm cities always surface. ES region names translated to Spanish in
the build script.

---

## Addendum 5: web MVP — design direction and LLM latency (2026-08-05)

**Design direction: "precision as mysticism."** The product's moat is
that every sentence names its placement, so the visual world is the
astronomer's instrument (ink #10131C, bone #ECE6DA, brass #C9A227,
copper #B4653A; Fraunces for the voice, IBM Plex Sans/Mono for the
data), not the purple fog of the category. Signature element: a zodiac
arc drawn with real geometry — ticks every 2°, heavier rules on the 30°
sign boundaries. Zodiac glyphs MUST carry U+FE0E or they render as
colour emoji on Apple platforms.

**Turn reasoning OFF for the teaser.** Measured on the real teaser
prompt: reasoning enabled = 12-60s per call and it passed the gate 1/2;
`reasoning: {enabled: false}` = 4-8s, identical cost, passed 2/2. The
unpredictable reasoning bursts were also what produced empty
completions. Kimi K3 for the paid report is a different case — it is a
reasoning model and needs its budget.

**Perceived latency is solved by splitting the request.** The
placements are local math (~80ms) and the prose is ~8s, so the UI calls
`/api/chart` first and renders the exact Sol/Luna/Ascendente readout
immediately, then fills in the prose when `/api/teaser` returns. The
precision arrives first, which is also the product's argument. Do the
same for any future periodic product.

**Gate retries are the real latency variable**, not the model: a
rejected attempt doubles the wait. Observed ~1 retry in 4 on the canary
bilbao chart (gendered participle, invented retrogradation) — worth
re-measuring if the teaser prompt changes.

---

## Addendum 6: the free reading was bland for structural reasons (2026-08-07)

Diagnosed on real pipeline output across several charts, not on
assumptions. Full design: `docs/superpowers/specs/2026-08-07-free-reading-redesign-design.md`.

**The grounding was never the problem.** Teaser prose named real
placements, real aspects, correct houses, and passed the gate. What
failed was shape: three fixed beats every time (mandated by the prompt),
one 140-word block, no answer to what users arrive asking (love,
compatibility), model tic phrases repeating across different users
("casi telepática" appeared independently on two unrelated charts), and
a register the target audience can't read.

**Governing principle now: the model never derives structure and never
sees jargon.** Evidence — when asked to *find* the chart's most striking
feature (stelliums, unaspected planets, tight orbs) it invented all
three: Jupiter placed in Taurus when it is in Gemini, a 6.35° conjunction
called "exacta", Mercury declared unaspected while conjunct the Moon.
The love section, handed a precomputed relationship profile, came out
clean. So: compute the features, hand over a single chosen one, and
translate houses to plain-language life areas and aspects to plain
phrases before they ever reach a prompt. It cannot write jargon it never
receives, and cannot misstate an orb it never sees.

**The gender gate is the binding constraint on the free tier** — not
cost, not latency. On bilbao-2000 it rejected 3 of 4 attempts. Retries
cost $0.00015 each (irrelevant) but ~5s each (not irrelevant), and a
fully failed batch serves an error page. `validateTeaser()` also had two
real holes found in production-shaped output: gendered *nouns* ("te
convierte en una diplomática innata") and predicative adjectives ("te
hace más profundo"). Mitigations specced: broader predicative rule, a
deterministic whitelist repair pass before spending a retry, and
MAX_ATTEMPTS 3 → 6. **Pass rate still needs measuring across the full
multi-chart battery before launch.**

**Two process lessons worth keeping.** A literal example inside a prompt
becomes a tic: the sample line "quieres fuegos artificiales con alguien
que llegue puntual" came back copied verbatim, and is now blocklisted.
And template UI copy needs the same gender discipline as LLM output — a
hand-written section heading ("De qué vas cargado") shipped gendered in
the prototype, so the copy tables go under test.

**Costs measured** (DeepSeek V4 Flash, single call returning both
blocks): $0.000150 for a clean attempt, $0.000541 delivered across 4
attempts. Inside the Addendum 2 budget. Merging teaser and love into one
call matters because the prompt dominates: ~1,950 input tokens against
~370 output.

---

## Addendum 7: what the free-reading battery actually measured (2026-08-07)

The redesign shipped. Everything below is measured on live DeepSeek V4
Flash calls via `scripts/battery-free.ts` (3 charts x 6 readers), not
estimated. Re-run it after ANY change to `prompts/system-free.md`,
`prompts/rules-universal.md` or `src/validate.ts`.

### Delivered results

| Chart | Readers served | Notes |
|---|---|---|
| madrid-1992 | 6/6 | |
| buenosaires-1985 | 6/6 | |
| bilbao-2000 (canary) | 6/6 | 1/6 before feature rotation |

29 attempts for 18 readings = **1.61 attempts per delivered reading**.
First-attempt rate 11/18 (61%). Cost **$0.000375 per attempt** (metered
`usage.cost`, 1,988 prompt + ~365 completion tokens), so **$0.000603
delivered** — under the $0.0011-0.0015 budgeted in the plan. Latency
~9.5 s observed end-to-end on `/api/free` for a first-attempt pass.

### The finding that mattered: rotate the feature, don't just retry

`selectFeature()` is deterministic, so every retry re-rolled the model on
the *same* topic. The canary's chosen feature is its house-2 money
stellium, and describing thrift in Spanish drags relentlessly toward a
gendered adjective — killing "no es que seas agarrada" just brought back
"seas cuidadosa". Bilbao sat at 1/6 no matter how the prompt was tuned.

`selectFeature(chart, index)` now walks the ranked feature list and
`/api/free` passes `featureIndex: attempt - 1`. Bilbao went 1/6 → 6/6.
**If pass rate ever collapses on one chart again, check whether every
attempt is being handed the same feature before touching the prompt.**

### Word budgets are ignored; sentence counts are obeyed

Asking for "70-100 palabras, cuéntalas y recorta" returned 123-155 words
consistently. Asking for "exactamente CUATRO frases" landed in range.
Note the overcorrection risk: a three-sentence ask with per-sentence word
caps crushed both blocks below their minimums (0/18). The love gate is
70-135, deliberately wider than the 80-110 the prompt asks for — the
screenshot unit is the hook line, not the block, so mild length costs the
product nothing while each rejection costs ~5 s.

### Two gate bugs found only by running it

- **`seas una persona` was a false positive.** "persona" is feminine in
  form but neutral in reference, and is the very form the rules tell the
  model to use. `persona|gente|criatura` are now excluded, as are gerunds
  (`estás buscando` is not a gendered adjective).
- **`parseFree` took the first LINE as the hook.** The model often
  returns the love block as one unbroken paragraph, which handed the UI
  the whole block as a display quote and left the body empty. It now
  takes the first *sentence*.

`repair()` also handles `tú mismo`/`ti mismo` generally now — that was
the single most frequent gender rejection, and it costs no retry.

### Known limitation

The gate is mechanical, so it cannot catch gendered *similes*: one
delivered hook read "quieres que te miren como una reina". No agreement
error, but it still genders the reader. If this shows up in real user
output, the fix is a prompt rule, not a regex.

### Paid report section 5, re-briefed and re-measured

`scripts/battery-report.ts` (Kimi K3, `max_tokens: 24000`, ~$0.22/report)
regenerated all three charts against the rewritten `## Amor y vínculos`
brief. Outputs kept in `bakeoff-out/section5/`.

| Chart | Report | Section 5 |
|---|---|---|
| madrid-1992 | 2571 words | 415 |
| buenosaires-1985 | 2411 words | 394 |
| bilbao-2000 | 2630 words | 431 |

`parseReport` returned non-null on all three. All three cover the new
material — the repeating pattern and where each cycle turns, what gets
projected onto partners, house eight and the Moon, closing on agency.

Two caveats a future session should know rather than rediscover:

- **The section runs long.** 394-431 words against a 300-350 brief.
  Nothing enforces it; `parseReport` only rejects sections under 200
  characters. Add a length check if it matters.
- **"No overlap" is weaker than the script claims.** The
  `FREE_TIER_ECHO` regex only matches "tu Venus **en** X" and missed
  bilbao's "Tu Venus **está en** Leo, a 20 grados, en la casa tres".
  That opening is a deliberate springboard, not a restatement — it is
  immediately followed by "Hasta ahí, lo que quizá ya intuías" — so the
  brief is satisfied. But the regex is not proof. Read the sections.

---

## Addendum 8: the shared rules fragment had to be split by tier (2026-08-08)

Addendum 3 item 2 (compose prompts from a shared fragment) shipped in
786448b and all three prompts already carried `{{RULES}}`. The item was
recorded as pending; it was not. What *was* broken is how it was wired.

**The universal fragment smuggled jargon into the free prompt.**
`rules-universal.md` carried the aspect-vocabulary rule and the
"retrógrado" rule — both of which name the exact words `system-free.md`
forbids in its "Prohibido el vocabulario técnico" section. The composed
free prompt told the model it may never write "conjunción", "trígono",
"retrógrado" and so on, and then, forty lines later, explained how to use
them correctly. That is the direct opposite of Addendum 6's governing
principle: *the model never sees jargon, because it cannot write a word
it was never given.*

**The split.** Two fragments, two placeholders:

| Fragment | Placeholder | Contents | Used by |
|---|---|---|---|
| `rules-universal.md` | `{{RULES}}` | grounding, anti-Barnum, gender neutrality, partner neutrality, content bans, agency, tic blocklist | report, teaser, free |
| `rules-chart-data.md` | `{{RULES_CHART}}` | aspect vocabulary, retrogradation vocabulary | report, teaser only |

The rule for adding anything to `{{RULES_CHART}}` is mechanical: if the
rule can only be obeyed by a model holding the raw `NatalChart` JSON, it
belongs there. Everything else is universal.

Three supporting changes:

- `loadPrompt()` iterates a `FRAGMENTS` map, so a third fragment is one
  line. HTML comments are stripped from fragments before injection —
  a fragment needs a place to warn the next editor which prompts may
  include it, and that note must not cost tokens or describe the system
  to the model (which the universal rules forbid it from mentioning).
- `system-report.md` no longer restates the universal grounding rule in
  its own words. It now says only how grounding applies to a report
  (name the datum in the prose, so the reader can verify it), which is
  the report-specific half. That restatement was the last copy-paste
  left, and copy-paste is what caused the original drift.
- Tests cover the split from both sides: the chart-data rules must be
  present in report and teaser, absent from free, no placeholder may
  survive composition, and no editor comment may leak. 155 tests green.

**Measured effect on the composed prompts.** Report and teaser are
rule-for-rule identical to before — verified by diffing the composed
system prompts against the previous commit — with the two technical
rules moved under their own heading at the end, and the deduplicated
sentence removed (7979 → 7779 chars). The free prompt loses 458 chars
(~115 tokens per call, on the tier that scales with traffic).

### Battery results (run 2026-08-08, after the split)

**Free tier — still 18/18 delivered, but it costs more attempts.**

| | Baseline (Add. 7) | Run 1 | Run 2 |
|---|---|---|---|
| Delivered | 18/18 | 18/18 | 18/18 |
| Attempts | 29 | 35 | 37 |
| Attempts per reading | 1.61 | 1.94 | 2.06 |
| Per-attempt pass rate | 62% | 51% | 49% |

Two independent runs both above baseline, so this is not run-to-run
noise. No reader is served an error page; the cost is ~one extra ~5 s
retry per reading. The dominant rejection is no longer gender but
**length** — `amor` landing at 136-171 against a 135 cap, `apertura` at
141-156 against 140.

**Attribution: settled by a control run — this is provider drift, not the
split.** `battery-free.ts` was re-run the same day from a detached
worktree at 646bf40 (the pre-split prompts), sharing node_modules. Same
charts, same readers, same hour:

| Prompt | When | Attempts | Delivered | Per-attempt pass |
|---|---|---|---|---|
| pre-split | 2026-08-07 | 29 | 18/18 | 62% |
| **pre-split (control)** | **2026-08-08** | **33** | **17/18** | **51.5%** |
| post-split | 2026-08-08 | 35 | 18/18 | 51.4% |
| post-split | 2026-08-08 | 37 | 18/18 | 48.6% |

The old prompt scores the same ~51% per attempt as the new one, and did
*worse* on delivery — one madrid reader exhausted all 6 attempts and
would have been served an error page. The length-overrun failure mode
dominates the control too (14 length rejections vs 4 gender), so it is
not caused by the 458 chars the split removed. What changed is DeepSeek,
between 2026-08-07 and 2026-08-08.

**Two consequences worth acting on, neither caused by the split:**

- The ~62% per-attempt baseline in Addendum 7 is stale. Treat ~50% as
  current, and note that at that rate 6 attempts is no longer comfortably
  enough — the control produced a real 1-in-18 total failure.
- The gate's length caps are now the binding constraint, not gender.
  `AMOR_RANGE` max 135 rejects prose at 136-140 that costs the product
  nothing (Addendum 7's own reasoning: the screenshot unit is the hook
  line). Widening it is the cheapest available win and needs no prompt
  change.

**Paid tier — the battery did not complete.**

| Chart | Result | Words | Section 5 | Cost |
|---|---|---|---|---|
| madrid-1992 | OK | 2297 | 367 | $0.481 |
| buenosaires-1985 | OK | 2479 | 454 | $0.251 |
| bilbao-2000 @ 24000 | **VACÍO** | — | — | burned, no output |
| bilbao-2000 @ 40000 | OK | 2253 | 370 | $0.218 |

Three things a future session needs:

- **`MAX_TOKENS` is now 40000** in `battery-report.ts`. The canary went
  empty at the 24000 Addendum 2 called sufficient, then succeeded at
  40000 using only 13844 completion tokens (8851 of them reasoning).
  Raising the ceiling is free: you are billed for tokens used, not the
  budget. Any production path needs the same headroom plus the
  emptiness check.
- **We do NOT know why it came back empty.** The script logged only
  "VACÍO" and discarded `finish_reason`, usage and provider for that
  call, so budget exhaustion (`finish_reason: "length"`) cannot be
  distinguished from the provider fault Addendum 2 recorded (HTTP 200,
  `"stop"`, no content). Note that the successful retry needed only
  13844 completion tokens, so for budget exhaustion to be the cause the
  reasoning burst would have had to nearly triple between attempts.
  **The empty path is now fully instrumented — read its output before
  theorising again.**
- **Cost varies ~2x run to run** ($0.218 to $0.481 against a $0.216
  baseline). Reasoning length is one candidate; the other is OpenRouter
  routing the same slug to different hosts at different prices and
  different builds, which would also explain an empty from one host and
  not another. Both calls now log `provider`, which settles it. Either
  way this makes "re-verify Kimi K3 on its pinned production host" a real
  pending item — at $0.48 the margin assumption behind the €9.90 price
  point is thinner than Addendum 2 implies.
- **Section 5 still runs long** (367 and 454 against a 300-350 brief),
  unchanged from Addendum 7. The `FREE_TIER_ECHO` flag on madrid is
  another false alarm of the kind Addendum 7 described: it matched
  "tu Venus en Aries" inside "esa es tu Venus en Aries votando", a
  callback within an argument, not a restatement. The section covers all
  four required beats. The regex is still not proof — read the sections.

---

## Addendum 9: the gate's word boundaries were ASCII (2026-08-08)

Found by reading rejection reasons on the Addendum 8 battery rather than
by review. Three false positives, one root cause, all in `src/validate.ts`.

**JavaScript's `\b` is ASCII-only even under the /u flag.** It treats "ñ"
and accented vowels as non-word characters, so it finds a word boundary
in the *middle* of a Spanish word. Consequences, all observed or
reproduced:

- `te hace soñar` was rejected as the non-word **"te hace so"** (twice in
  one battery run). Same for `te hace daño` and `te hace compañía`.
- `solía` matched the planet name **"sol"**, so an ordinary verb
  registered as the Sun being named. That feeds the retrogradation check,
  where it could invent a "retrogradación inventada: Sun" rejection.

`WORD_END` / `WORD_START` (Unicode lookarounds) now replace every `\b`
that sat next to a letter class. The rule for this file: **never write
`\b` after a letter class — Spanish words do not end where ASCII thinks
they do.** Leading `\b` before an ASCII-initial literal is still fine and
is left in place.

A second, unrelated bug in the same rule: **`contigo` / `conmigo` /
`consigo` end in -o and were read as masculine adjectives**, so
"estás contigo" burned a retry. They join `persona|gente|criatura` in the
neutral exclusion list. `te hace {daño|sombra|compañía|gracia|falta|caso}`
gets the same treatment — those are objects, not predicates.

Both fixes narrow by naming exceptions, never by weakening the pattern,
because a false negative ships a gendered reading while a false positive
only costs a retry. 14 tests added (155 → 169), including a "still
rejects real gendered phrasing" block guarding the other direction.

### One gap found and deliberately NOT fixed

`acabas agotada` is **not** caught: the rule's verb list is
`eres|seas|fueras|serías|estás|estabas|te sientes|te ves`, and "acabas"
is not in it — even though `rules-universal.md` explicitly teaches the
model to avoid "acabas agotada". That is a false negative, the dangerous
direction. It was out of scope here (widening the verb list risks new
false positives and needs its own battery), but it is a real hole worth
closing before launch.

---

## Addendum 10: the paid report's model choice is superseded (2026-08-08)

Full reasoning: `docs/superpowers/specs/2026-08-08-paid-report-flow-design.md`.

**The two-tier model decision (Kimi K3 paid / DeepSeek Flash free) no
longer describes the paid tier.** The paid report becomes **DeepSeek V4
Pro, one call per section, eight sections in two waves**, with Kimi K3
kept as a per-section escalation path.

This is a change to a decision CLAUDE.md lists as settled, so the cause
is recorded rather than assumed. The bake-off compared *whole reports in
a single call*, and the paid pipeline no longer works that way — the old
result does not automatically transfer.

**Why it holds up.** V4 Pro scored 49.5 to Kimi's 54, and its recorded
weakness was exactly *"fully grounded; structure/length slips"*.
Per-section generation removes structure and length from the model: each
call gets one brief, one word range and a deterministic allocation of
chart features. Part of the bake-off's margin was measuring a problem
this architecture deletes. Grounding, the eliminatory criterion, V4 Pro
already passed.

**The argument is speed, not cost.** Cost on this tier is a rounding
error and arguing from it would relitigate a locked decision on weak
grounds. But ~5 min → ~25-30 s changes the product: the buyer reads
section one while the rest generates, and the holding page stops being a
apology.

**The fallback inverts.** A section that exhausts its DeepSeek retries
escalates to Kimi. Two providers are preserved (a DeepSeek outage does
not stop sales) and a section DeepSeek cannot land degrades *upward* in
quality, for the price of one section rather than one report.

**Risk accepted, stated plainly:** paid prose drops from 54-class to
49.5-class on the rubric, and per-section briefing closing that gap is
**predicted, not measured**. Re-running the blind bake-off per section
against the same rubric and the same three charts is cheap and is listed
as the first thing to measure.

Also recorded there and worth knowing before touching the pipeline:

- **No gender gate on the paid tier**, deliberately. Extrapolating the
  free tier's rate across 2,400 words gives ~5% of reports passing —
  half the revenue spent on rejected drafts. The paid path runs
  `repair()`, validates structure only, and *logs* gender marks instead
  of rejecting. If the log shows it is frequent, the fix is a prompt
  rule, not a regex.
- **The free tier keeps its gate**, because a rejection there costs
  $0.000375 and it can rotate the feature on retry — a lever the paid
  report does not have.

---

## Addendum 11: the paid report is four plans, in this order (2026-08-08)

Spec: `docs/superpowers/specs/2026-08-08-paid-report-flow-design.md`
Roadmap: `docs/superpowers/plans/2026-08-08-paid-report-roadmap.md`

**Nothing of the paid report exists yet.** The prompt layer works and
`scripts/battery-report.ts` writes reports to disk, but there is no
route, no component, no checkout and no delivery. The only mention of it
in `web/` is sales copy at `BirthForm.tsx:287`.

| Plan | Delivers | Vendors |
|---|---|---|
| 1 (written) | section generation core in astro-core | none |
| 2 | orders, payment, persistence | Stripe, Supabase |
| 3 | queued generation pipeline | Inngest, Resend |
| 4 | delivery UI and share card | none |

**Why plan 1 comes first even though it builds nothing sellable.** It
needs no vendor accounts, and it ends by measuring the risk Addendum 10
accepted. If DeepSeek V4 Pro does not hold quality under per-section
briefing, that reopens the model decision — and the difference between
learning it in plan 1 and learning it in plan 4 is a few dollars versus
several weeks of infrastructure built on a wrong assumption.

Plan 2 can run in parallel: the schema does not depend on which model
wins. Plans 3 and 4 cannot.

### Decisions in the spec that are easy to get wrong later

- **No user account.** Tokenised link plus email. No users table. Oracle
  quota later hangs off the order, not a person.
- **Birth data is stored only at checkout intent**, and Stripe receives
  an opaque id — never the birth date, time or place. Same reasoning as
  the bundled GeoNames index (Addendum 4). The 24h expiry sweep deletes
  the birth data of people who never paid.
- **The chart is snapshotted with the finished report**, not recomputed
  on read. If the engine ever changes, a delivered report must stay
  auditable against the exact chart it was grounded in — that claim is
  the whole product.
- **The webhook never generates.** It marks paid and enqueues. A
  conditional `paid → generating` claim stops at-least-once delivery
  generating (and billing) twice.
- **Section 8 cannot be generated in parallel** — it is a synthesis of
  the other seven. Hence two waves. It receives the first sentence of
  each earlier section, not their full prose.
- **A deterministic allocation pass** hands each section the aspects it
  owns before any call happens, so seven concurrent calls cannot all
  reach for the same tightest aspect. Same principle as the free tier's
  `selectFeature`: compute the structure, hand the model one chosen thing.

### What the queue is still for at ~30 seconds

The async architecture was designed for a 5-7 minute wait. Per-section
DeepSeek generation is ~25-30s, so that justification mostly evaporated.
It stays for different reasons, and a future session should know they are
the real ones: the Stripe webhook must return in seconds regardless;
at-least-once delivery needs the conditional claim; retries and
escalation need durable state; and the buyer can close the tab.

What changed is that **email stops being the primary delivery and becomes
a safety net** — the holding page fills in progressively instead.

---

## Addendum 12: the per-section battery measured the gate, not the model (2026-08-10)

Plan 1 is built (tasks 1-6, 169 → 205 tests) and
`scripts/battery-sections.ts` has been run once against live models.
Raw output in `bakeoff-out/sections/`. Read this before touching
`validateSection` or re-running the battery.

**The Addendum 10 risk did not materialise. A different one did.**

### What was measured

| Chart | Wall clock | Cost | Escalations | Words | parseReport | Marcas de género |
|---|---|---|---|---|---|---|
| madrid-1992 | 799.5 s | $0.5595 | 3/8 | 2506 | OK | 2 |
| buenosaires-1985 | 244.2 s | $0.1357 | 0/8 | — | **informe incompleto** | — |
| bilbao-2000 (canary) | 648.0 s | $0.3386 | 1/8 | 2584 | OK | 0 |

39 attempts for 24 sections (1.63 per section); 14/24 passed first
attempt (58%). Two of three reports delivered.

### The finding: all 16 rejections were word count. Zero were empty or truncated.

Not one rejection in 39 live calls was for the failure modes
`validateSection` exists to catch. DeepSeek V4 Pro overshoots every
brief, exactly as Addendum 7 measured for Flash on the free tier
(*"word budgets are ignored; sentence counts are obeyed"*). The ±15%
margin in `validateSection` is not enough, and one section was rejected
at **348 words against a 345 ceiling** — three words.

**`Amor y vínculos` is the acute case and it was already documented.**
It overshot on all three charts and on both models: 563/461 (madrid),
557/510/425 (buenosaires, the 425 is Kimi), 461/495 (bilbao). Addendum 7
recorded this same section at 394-431 words and Addendum 8 at 367-454,
both against the same 300-350 brief, under the *old single-call* Kimi
architecture — and Addendum 7 explicitly said *"Nothing enforces it...
Add a length check if it matters."* Plan 1 added that length check, and
it turned a known, harmless overshoot into the thing that destroyed the
buenosaires report entirely. No model can write that brief's four
required beats in 350 words; Kimi never could either.

### Consequence: escalation fires for the wrong reason, and it is brutally expensive

A length rejection escalates to Kimi at 40000 tokens. Measured Kimi
escalation latencies: **317 s, 603 s, 196 s, 466 s.** Madrid's 13.3
minutes is three Kimi calls; single DeepSeek attempts run 12-138 s
(typically 30-70 s). So the architecture came out **slower and dearer
than the 5-minute single Kimi call it was meant to replace** — for the
sole reason that a section wrote too much.

**Escalating to a better model because the current one was too long is
backwards.** Length is not a quality defect, and the escalation model
overshoots too (Kimi's 425 on buenosaires was rejected as well, which is
why that report has no section 4 at all).

### What the architecture actually delivers when the gate does not fire

buenosaires passed 7/8 sections on the first DeepSeek attempt. Ignoring
the one miscalibrated section, that run is the measurement Addendum 10
hoped for:

| | Kimi single call (Add. 8) | Per-section, clean |
|---|---|---|
| Wall clock | ~5 min | **~2.4 min** |
| Cost | $0.218-0.481 | **~$0.045** |

Faster and ~5-10x cheaper, no escalation. **Addendum 10's speed argument
is confirmed, not refuted** — it was buried under a gate misfire.

### Quality: V4 Pro holds up under per-section briefing

Read, not inferred from regexes (Addendum 7's warning about
`FREE_TIER_ECHO` applies here too).

- **Grounding is mostly intact, but NOT perfect — see the defect below.**
  Claims name their datum, degrees and all ("tu Luna en Libra en la casa
  cinco, recién estrenada a un grado escaso").
- **The deterministic allocation works.** On madrid, the eight sections
  develop eight *different* aspect pairs — Sol-Neptuno in section 1,
  Luna-Venus in 2, Marte-Urano in 4, Saturno-Plutón in 5, Urano-Neptuno
  in 6, and none in 0/3/7 as designed. Zero collisions, which is the
  entire reason `src/allocate.ts` exists.
- **The synthesis genuinely synthesises.** Madrid's section 8 names
  Ascendente, Mercurio, Sol, Luna, MC, Marte and Saturno, ties three
  named threads and closes on an image from that chart.
- **The canary produced zero gender marks** across 2584 words. bilbao is
  the chart that breaks gender rules across all models on the free tier.

### DEFECT: an invented retrogradation shipped, because nothing checks grounding

Found on 2026-08-10 by running the delivered reports back through
`validateProse`'s grounding checks — **after** an earlier draft of this
addendum had claimed the reports were clean on the strength of reading 5
of 16 sections. Read the whole thing or check it mechanically; do not
spot-check grounding.

`bakeoff-out/sections-pre-fixes/madrid-1992.md` (the pre-fix run,
archived so this evidence survives a re-run), section 3, says *"el hecho de que
Mercurio esté retrógrado"*. **Mercury is not retrograde in that chart** —
only Jupiter and Pluto are. One invented retrogradation in 16 delivered
sections. bilbao-2000 is clean (its Urano and Neptuno retrogrades are
real).

**Why it shipped: `validateSection` does not check grounding at all.** It
checks length and truncation. The free tier's `validateProse` *does*
catch exactly this (`retrogradación inventada`), and it would have caught
this one — the machinery exists and the paid path simply does not call
it.

This matters more than anything else in this addendum. Grounding is the
eliminatory criterion in `prompts/rubric.md` — one invented placement
disqualifies a model regardless of prose quality — and "every sentence
names its placement, and you can check it" is the product's whole claim.

**FIXED 2026-08-10** (210 → 215 tests). `groundingProblems(text, chart)`
now holds the three *chart-verifiable* checks — invented retrogradation,
false sign, absent aspect — split out of `validateProse` so the paid tier
enforces facts without inheriting the gender, jargon and cliché rules
that spec decision 6 deliberately excludes. Decision 6 ruled out a
*gender* gate; it never ruled out a grounding one.

`validateSection(text, brief, chart)` now takes the chart and puts
grounding failures in **`fatal`**, not in advisory `problems`: unlike
length, a retry can genuinely fix a false claim, and this is the one
error class the buyer can check against their own chart.

Verified end-to-end, not just in unit tests: replaying the two delivered
reports through the new gate flags exactly the madrid Mercury section and
nothing else, and passes bilbao clean.

### Three smaller things worth keeping

- **The raised token budget was right.** Zero empty completions in 39
  calls at 16000 (V4 Pro) / 40000 (Kimi). The plan specified 4000, which
  on this evidence would have produced empties; several calls spent
  1900-5300 tokens on reasoning alone before emitting a word.
- **Provider routing is confirmed as the cost-variance source.** One slug
  was served by CoreWeave, GMICloud, DigitalOcean, Ionstream, Baidu,
  DeepInfra, AtlasCloud, Novita and StreamLake in a single run, some
  returning `reasoning=0` and some 5265. Addendum 8 suspected this behind
  Kimi's 2.2x cost spread; it is now observed directly on V4 Pro.
- **`countGenderMarks` has a false positive**: it flagged `estar
  retrógrado` on madrid, which describes a planet, not the reader. Only
  1 of 2 madrid marks was real (`sentirte legitimado`). Harmless because
  the paid tier logs rather than gates — which is itself a vindication of
  that decision (spec decision 6). Also note the paid prose used
  "coraza", which is on the *free* tier's cliché blocklist; the paid tier
  deliberately does not check clichés.

### Three fixes applied on the strength of this run (2026-08-10)

All landed after the measurement above, so **the numbers in the table
predate them**. 205 → 215 tests. The third is the grounding gate
described in the DEFECT section.

1. **Escalation no longer fires on length.** `SectionCheck` now carries a
   `fatal` list — empty or truncated only — alongside `problems`. The
   caller retries and escalates on `fatal`, and *accepts and logs* a
   section that is merely long. `ok` is unchanged, so a length overrun is
   still visible; it just no longer buys a $0.08 five-minute Kimi call.
   This is the change that should recover the ~2.4 min / $0.045 profile.
2. **`Amor y vínculos` is now 350-480 words** (600 under the `amor`
   focus), replacing a 300-350 that no model ever hit in either
   architecture. `src/sections.ts` carries the evidence in a comment so
   nobody "corrects" it back.

### CONFIRMING RUN, after all three fixes (2026-08-10)

Second battery run, same three charts, against the fixed code. Outputs in
`bakeoff-out/sections/`; the pre-fix run is archived in
`bakeoff-out/sections-pre-fixes/`.

| | Run 1 (pre-fix) | Run 2 (post-fix) |
|---|---|---|
| Wall clock, 3 charts | 1691.7 s (28.2 min) | **322.9 s (5.4 min)** |
| Cost, 3 charts | $1.0338 | **$0.1247** |
| Reports delivered | 2/3 | **3/3** |
| Sections passing first attempt | 14/24 (58%) | **24/24 (100%)** |
| Kimi escalations | 4 | **0** |
| Grounding failures | 1, shipped undetected | **0** |

Per report: **~108 s and ~$0.042**. Against the Kimi single-call baseline
of ~5 min and $0.218-0.481, that is **~3x faster and 5-11x cheaper** —
and now measured rather than predicted. Addendum 10's speed argument is
fully vindicated.

**This run is a pure DeepSeek V4 Pro sample.** Zero Kimi calls anywhere,
so unlike run 1 (whose best sections were escalations) it isolates
exactly the risk Addendum 10 accepted. Grounding verified independently
by replaying all three reports through `validateSection`: **0 fatal
problems**. Prose quality holds — the canary's 547-word `Amor y vínculos`
covers all four beats, names every datum with degrees, and closes on
agency.

### What run 2 exposed in turn

- **Reports are now ~3,000 words** (2877-3071), against Kimi's 2297-2630
  and the 2000-2500 that `system-report.md`'s "Registro final" still
  asks for. **12 of 24 sections exceeded their brief ceiling** and were
  accepted with a warning. That is the intended consequence of making
  length advisory, but it means the briefs' word ranges are now roughly
  decorative — the model overshoots them by 20-30% as a matter of course.
  Decide whether a 3,000-word report is the product you want before
  plan 4 renders it.
- **`Amor y vínculos` at 350-480 is right but not generous.** bilbao came
  in at 547 against a 552 ceiling — five words of headroom.
- **Gender marks: 2 real in ~9,000 words, in 2 of 3 reports**
  (`sentirte invadida`, `estás lista`). The third, `te vuelve narrativa`,
  is a false positive — "la memoria se te vuelve narrativa" is a noun,
  not a participle agreeing with the reader. Addendum 10 set the
  criterion itself: *"If the log shows it is frequent, the fix is a
  prompt rule, not a regex."* Two of three reports meets that bar. Note
  both real marks are stock phrasings that `repair()` could absorb, but
  extending that whitelist is whack-a-mole; the prompt rule is the fix.
- **One orb overclaim:** bilbao calls a 1.29° Venus-Urano opposition
  "exacta". Mild — the other two exactness claims in the run are accurate
  and one quantifies itself correctly ("apenas un grado" for a 0.95°
  orb) — but the model *is* handed the orb in its brief, so a rule
  reserving "exacto" for <1° is cheap if it recurs.
- **The cliché "montaña rusa" appeared**, which is on the free tier's
  blocklist. Not gated here by design; noted so it is not mistaken for a
  regression later.

### Still open

3. **Consider briefing in sentences or paragraphs, not words.**
   Addendum 7 measured that models obey sentence counts and ignore word
   counts; nothing here contradicts it. Not attempted — it rewrites all
   eight briefs and needs its own battery run.
4. ~~Re-run the battery to confirm the fixes.~~ **DONE** — see the
   confirming run above. Prediction held: 5.4 min, $0.1247, zero
   escalations, 3/3 delivered.
5. The `countGenderMarks` false positive on `estar retrógrado` is
   untouched. Harmless while the paid tier only logs, but it would
   matter if anything ever gates on it.

---

## Addendum 13: the report is not too long; five of its paragraphs are (2026-08-10)

Plan 4 phase A is built, so the three battery reports can be read as a
buyer would read them at `/preview/informe/<chart>` (dev only — the route
404s in production, since battery output is nobody's report). 215 → 241
tests.

### The ~3,000-word question, answered by looking at one

Addendum 12 asked whether a ~3,000-word report is the product we want, and
said to decide it before rendering. Rendered, **the length is right and
the answer is "generous", not "a wall"** — but only because the section is
the unit the reader meets, not the report.

| Chart | Words | Sections | Shortest / longest section |
|---|---|---|---|
| madrid-1992 | 3063 | 8 | 315 / 454 |
| buenosaires-1985 | 2877 | 8 | 283 / 463 |
| bilbao-2000 | 3071 | 8 | 272 / 547 |

A section is 272-547 words — a 1.5-3 minute read with its own title, its
own brass rule and an index entry to get back to it. Nobody reads 3,000
words; they read `Amor y vínculos`. **Do not cut the word ranges in
`src/sections.ts` on length grounds.** The 16-minute figure the meta line
shows is a shelf-appeal number against a €9.90 price, not a burden.

### What is actually wrong: paragraph granularity

The defect the render exposes is one level down. Across 70 paragraphs the
median is ~120 words, which reads well — but the tail does not:

- **5 paragraphs of 200+ words** (237, 228, 217 on madrid; 286, 211 on
  buenosaires). bilbao's longest is 192 and it is noticeably easier.
- **The worst is 286 words rendered as 38 lines — 1.31 phone screens with
  no break.** That is buenosaires' `Claves para tu camino`, which is the
  whole section in **one single paragraph**. Measured in the browser at
  375px, not estimated.
- **`Tus luces y tus sombras` is the repeat offender**: 441-454 words in
  only 2-3 paragraphs on all three charts (madrid is 217 + 237).

So the wall is real but local. It is not fixed by typography here, and
per the plan that fix belongs upstream — though **not** in the word
ranges. The brief needs to ask for paragraphs.

**This is the same lever as Addendum 12's still-open item 3** (brief in
sentences or paragraphs, not words), and it is more evidence for it:
Addendum 7 established that models obey structural counts and ignore word
counts, and a section that was handed no paragraph instruction came back
as one 286-word block. Asking each brief for 3-4 paragraphs would fix the
tail and cost nothing, but it rewrites all eight briefs and needs its own
battery run — so it stays open, now with a measurement behind it.

### The plan was written against three APIs this repo does not have

All three would have failed at the first `npm test`, so they are recorded
rather than left for the next session to rediscover:

- **`environmentMatchGlobs` was removed in Vitest 4** (this repo is on
  4.1.10). The `.tsx` tests opt into a DOM with a
  `// @vitest-environment jsdom` docblock instead. Same intent — only the
  component tests pay for a DOM.
- **Vite 7 transforms with oxc, not esbuild**, so the plan's
  `esbuild: { jsx: "automatic" }` was ignored with a warning. No JSX
  config is needed at all.
- **`jsdom` must be a ROOT devDependency, not a `web/` one.** Vitest
  resolves the environment package from the project root, not from the
  test file, so the plan's `cd web && npm i -D jsdom` puts it where the
  runner cannot see it. `@testing-library/*` does resolve from `web/`
  (the test file imports it), and belongs there with React.

Two smaller corrections, both cases of the plan's own test being wrong
rather than its component:

- **`ShareCard`'s rarity is "1728", not "1.728".** es-ES does not group
  four-digit numbers (CLDR `minimumGroupingDigits: 2`). The shipped
  `Signature.tsx` already behaved this way; the plan's expectation did
  not. The test now asserts both that and a five-digit case that actually
  exercises grouping.
- **`ReportIndex`'s ordinal is `aria-hidden`.** Left exposed it lands
  inside the link's accessible name ("03Amor y vínculos"). The `<ol>`
  already conveys the ordering.

Also: Next 16 makes `runtime = "nodejs"` the default and the docs say to
drop the export, so the preview route declares only `dynamic`.

### The share card exports for real — but its fonts do not travel

Verified in the browser, not assumed: the button produces a **1080x1920
PNG**, ink background, glyphs and names rasterised (~6.8k brass and ~8.3k
bone pixels in the glyph band), canvas untainted.

**The plan's stated reason it works is wrong, though**, and the next
person should not trust it: it claims the browser inlines computed fonts
when the SVG is serialised from the live DOM. It does not. `XMLSerializer`
copies the DOM as-is, and a detached SVG loaded through a blob URL can see
neither the page's CSS custom properties nor its next/font faces. The card
therefore declares its fonts in a `<style>` **inside** the SVG, which does
serialise with it — but the `var()` fallbacks (Georgia, ui-monospace) are
what the exported PNG actually renders with. **The PNG is not in Fraunces
and Plex Mono.** Closing that needs the faces embedded as base64
`@font-face` in the card, which is a real decision (weight vs fidelity) and
was out of scope here.

### Phase B is untouched and still blocked

`/informe/<token>`, the polling status endpoint, the holding page and the
buy CTA all read an order or its sections, so they need plans 2 and 3.
Phase A stands on its own.

---

## Addendum 14: the character card, and what reconciling it cost (2026-08-13)

Spec: `docs/superpowers/specs/2026-08-13-character-card-design.md`
Plan (phase 1): `docs/superpowers/plans/2026-08-13-character-card-free.md`

**Nothing is built.** This addendum records decisions, not measurements.

### What it is

The paid report opens as prose and nothing else, which is neither
attractive nor shareable. The card is a computed RPG/TCG-shaped summary —
class, how you are seen, what you are inside, elemental affinity, traits
— rendered as the report's first screen, with a partial version on the
free reading.

Everything on it is derived from `NatalChart` by pure functions. **No LLM
call at render time.** That is the feature, not an implementation detail:
it is the first user-visible surface in this product that cannot
hallucinate, in a codebase where an invented retrogradation shipped to a
delivered report (Addendum 12).

### The decision that mattered: no D&D stats

The original idea called for `STR: 14`, `INT: 18`, `LUCK: 20`. Rejected,
for two independent reasons:

- **Astrology has no strength scale**, so any 3-18 or 0-100 axis is
  invented and the buyer cannot audit it. That inverts `prompts/rubric.md`,
  where one unverifiable claim is eliminatory, and contradicts the comment
  already standing in `ShareCard.tsx`.
- **A shared scale implies a ranking.** `DEF: 8` is fatalism with a number
  on it, against a rule that mandates agency-preserving language. Nobody
  pays €9,90 to be told their luck is low.

Every figure on the card is instead a **count** (how many bodies aspect
this planet) or a **distribution** (element weights, where no axis is
"better"). Both are recomputable by the reader from their own chart.

### It is NOT the fix for the wall of text

Addendum 13 measured that problem: length is fine, but five paragraphs
exceed 200 words and the worst is a 286-word section as one unbroken
block. That fix is Addendum 12's still-open item 3 — brief in paragraphs,
not words — and it stays open. The card is a wow/share feature. Shipping
it and calling the wall solved would be a mistake.

### Reconciling with the plain-register spec found four conflicts

Both specs govern the same screen. Three of the four were the card's
fault, and all four are now fixed in both documents.

1. **The card printed house numbers.** Decision 1 of the plain-register
   spec removes house numbering, and `AREA_ES`'s own header calls itself
   the only permitted form. The card renders life areas — which forced a
   new `AREA_CORTA_ES`, because the existing phrases run 6-12 words and
   seven of them do not fit a card, let alone the 1080x1920 export.
2. **Three vocabularies for one geometry.** The card routed its trait
   fallback through `relationPhrase()` while plan A adds `RELATION_ES`
   for the same job. `RELATION_ES` becomes the single table and absorbs
   `relationPhrase()`. **This is why the full card depends on plan A**;
   the free partial does not, because it carries no traits.
3. **Decision 7 read as a self-contradiction** — it rejects the astral
   wheel on reasoning that appears to reject the card too. The
   distinction holds (sign glyphs not planetary ones, no house numbers,
   answers a question the reader actually has) but was unwritten. It is
   now a table in that spec.
4. **Glyphs rendered two ways** — text with U+FE0E in the strip, drawn
   paths in the card, on one screen.

### Then planning overturned the glyph decision again

SVG path data for twelve zodiac glyphs cannot be written from memory, and
generating it needs a font-parsing dependency. **Noto Sans Symbols 2
covers U+2648-U+2653**, and the fonts are already being embedded as
subsetted base64 via Google Fonts' `text=` parameter — which needs no
subsetting library at all. One mechanism now solves both the glyphs and
Addendum 13's open finding that the PNG export renders in Georgia rather
than Fraunces. `SIGN_GLYPH` is unchanged and the strip needs no change.

### Two more corrections the plan found

- **The spec named the wrong endpoint.** It says `/api/free` serves the
  card projection. It does not — `/api/free` returns only the LLM
  reading; all chart data goes through `/api/chart`.
- **The card duplicates three shipped components.** It contains the big
  three (`Readout`), the affinity bars (`Elements`) and the rarity line
  (`Signature`). Decision: the card **absorbs all three**, with their
  glosses and degrees moving into the `FreeCard` struct so no reading
  content is lost. `Elements`'s closing echo paragraph cannot move to the
  card — it needs `matches`, which the card deliberately does not carry —
  so it goes to `Matches`, which is what it was a statement about anyway.

### Open, and honest about it

- **Whether the register lands is unmeasured and is a market question.**
  Spanish astrology buyers skew away from RPG players. It is cheap to
  test — the card renders from a chart with no LLM call — and the free
  partial reaches real users first, which is the argument for shipping
  that half early.
- **`signature().oneIn` is hardcoded `12*12*12` and returns 1728 for
  every chart ever computed.** Honest arithmetic, but not personal, and
  on a card surrounded by per-chart data it is the weakest line. Kept
  as-is; making it per-chart needs a distribution model (sun signs are
  not uniform, ascendants depend on latitude and hour). **Never present
  it as computed per person** — that would make it exactly the invented
  statistic this product refuses to ship.
- **The gender rule may not be permanent.** It drives most free-tier
  rejections, costs roughly one extra retry per delivered reading
  (Addendum 8), and is why the twelve class names had to be epicene agent
  nouns. If the birth form ever collects gender, most of that constraint
  disappears — but it touches a CLAUDE.md invariant (no PII to the LLM
  beyond chart data and a sanitized first name), so it needs its own
  decision. The copy tables are keyed so gendered variants would be
  additive, not a restructure.
