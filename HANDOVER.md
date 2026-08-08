# Handover: Destiny Reports (Spanish AI astrology product)

## Estado actual (keep this section updated — it is the first thing read)

Last updated: 2026-08-08 — prompt fragments split (Addendum 8), gate word
boundaries fixed (Addendum 9), paid report re-modelled and flow designed
(Addenda 10-11, spec + four plans).

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

The paid report is now four sequential plans. Nothing below is built.

- [ ] **Plan 1 — section generation core** (WRITTEN, not executed):
      `docs/superpowers/plans/2026-08-08-per-section-report-generation.md`.
      Pure TypeScript in astro-core, no vendor accounts, 169 → 205 tests.
      Ends with `scripts/battery-sections.ts`, which **measures the risk
      accepted in Addendum 10**. Run it before building anything on top.
- [ ] **Plan 2 — orders, payment, persistence.** Supabase schema
      (`orders`, `report_sections`, `entitlements`), `/api/checkout`,
      Stripe with Bizum, webhook with signature verification and
      idempotency, 24h expiry sweep that deletes unpaid birth data.
      Can be built in parallel with plan 1: the schema does not depend
      on which model wins.
- [ ] **Plan 3 — queued generation pipeline.** Inngest two-wave fan-out,
      conditional `paid → generating` claim, per-section retry and Kimi
      escalation, Resend email.
- [ ] **Plan 4 — delivery UI.** `/informe/<token>` holding page with
      progressive rendering, report component, shareable 9:16 card,
      and wiring the buy CTA that is currently just copy in
      `BirthForm.tsx:287`.
- [ ] PDF rendering (Puppeteer over the same report component) — own spec
- [ ] Daily cron: transits once/day → 12 horoscopes → Supabase cache
- [ ] Oracle chat (post-MVP): system-oracle.md, rolling window, quotas

### Small pending fixes
- [ ] `parseReport` tolerant of `#` vs `##` — **scheduled as plan 1
      task 3**, no longer loose. Saves paid retries; the bake-off lost 4
      good reports to this.
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
