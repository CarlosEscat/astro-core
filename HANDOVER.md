# Handover: Destiny Reports (Spanish AI astrology product)

## Estado actual (keep this section updated — it is the first thing read)

Last updated: 2026-08-05

### Done
- [x] Chart computation engine (Placidus + whole-sign fallback), 25 tests
- [x] Report + teaser prompt layer, PII-free, injection-sanitized
- [x] Model bake-off run, ranked blind → `bakeoff-out/RANKING.md`
- [x] Models selected: Kimi K3 (paid report, $0.216), DeepSeek V4 Flash
      (teaser, ~$0.0008) — details in Addendum 2
- [x] Prompt hardening: aspect-vocabulary, retrograde, gender-neutrality
      rules in both prompts (tests assert them)
- [x] `validateTeaser()` mechanical output gate + 8 tests (42/42 total)
- [x] Git repo initialized, pushed to GitHub

### Next up (in order)
- [ ] Next.js app: landing page + birth-data form
  - [ ] Historical timezone resolver (lat/lon + birth date → UTC offset AT
        that date) — build and test FIRST, everything depends on it
  - [ ] Places autocomplete for birth location (provider undecided)
  - [ ] Free teaser flow: buildTeaserMessages → Flash → validateTeaser →
        retry ≤2 → flag
- [ ] Supabase schema: charts, orders, reports, quotas (not designed)
- [ ] Stripe checkout: one-time, Bizum enabled, webhook-triggered
      generation (never block checkout on LLM latency)
- [ ] Report delivery + shareable cosmic-signature card (computed rarity
      stat, IG/TikTok aspect ratio)
- [ ] PDF rendering (Puppeteer over the same report component)
- [ ] Daily cron: transits once/day → 12 horoscopes → Supabase cache
- [ ] Oracle chat (post-MVP): system-oracle.md, rolling window, quotas

### Small pending fixes
- [ ] `parseReport` tolerant of `#` vs `##` first heading (saves paid
      retries; bake-off lost 4 good reports to this)
- [ ] Compiled `dist/` can't find `prompts/` (only matters when the
      package is consumed from build output)
- [ ] Re-verify Kimi K3 on its pinned production host before launch
      (fp8/bf16 + the new gender rule, untested in the bake-off)

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

A standalone TypeScript package, NOT yet wired into a Next.js app. It has
two layers:

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
33/33 tests passing as of last run. `npm test` and `npm run example` both
verified working.

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
2. **Shared prompt fragments** (do on next prompt touch): grounding,
   gender-neutrality and content-ban rules are currently copy-pasted per
   prompt file — drift already happened once. Compose prompts from a
   shared rules fragment + product-specific body at build time.
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
