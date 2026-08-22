# Handover: Destiny Reports (Spanish AI astrology product)

## Estado actual (keep this section updated — it is the first thing read)

### ⇢ START HERE: the sequencing decision, 2026-08-22

**Carlos's instruction, and it overrides the ordering further down this
file:** nothing gets built until the *design* is finished and he is happy
with it. Specifically —

1. **Design the whole user flow, end to end**, from landing to delivered
   report. Not screen-by-screen in isolation: the actual path a person
   walks, including what happens when things go wrong or come back empty.
2. **Finish the card designs** — free and paid.
3. Only when the designs, the decisions behind them, **and how they are
   to be implemented** are settled and approved: move to **Plan 2**
   (orders/payment/persistence) and everything after it.

**Plans 2, 3 and 4-phase-B are explicitly parked** until step 3 clears.
Do not start them, do not "get a head start" on them, and do not treat
their being written as permission to execute. Carlos's words: the rest
does not matter until the user flow is right.

The existing rule still stands and now matters more: **no plan before
Carlos approves a design.**

### Where the design actually stands

A design canvas exists, published as an Artifact, seeded from
`docs/design/clay/` (read that README first — it explains the artboards
and how to regenerate). It covers, in Clay:

- **Sistema** — the token system, type scale, object vocabulary, rules
- **La app** — landing + form, free reading, paid report, post-payment
  delivery, both share cards, and the card itself
- **Estados** — loading, four error states, empty/thin-chart cases
- **La carta** — the four rejected card directions, kept with the
  reasoning for rejecting them on sticky notes

**Direction B ("Bloques", the Clay axis) is the approved card design.**

What the canvas does NOT yet cover, and what step 1 above needs:
the flow *between* screens rather than the screens themselves — what a
returning visitor sees, what happens on a second reading, the checkout
step itself, what an expired or wrong `/informe/<token>` does, and the
transitions that make it feel like one product rather than six screens.

### Four spec defects to settle before any card is built

Found by measurement this session; all still unresolved in
`docs/superpowers/specs/2026-08-15-character-card-game-mechanics-design.md`:

1. **The paywall contradicts itself.** Line 92 marks block 6 *Viene en el
   mismo paquete* free (✓); line 276 says "Free: blocks 1–5. Paid: blocks
   6–9." This decides what sits inside the 1080×1920 share export.
2. **The zeros are wrong.** Line 263 says Cáncer, Leo and Acuario score 0
   on bilbao. The engine says **Leo, Capricornio, Acuario** — Cáncer
   scores 25, second-highest. Verified by running `compatibleSigns()`.
   Someone would otherwise write punchlines for the wrong signs.
3. **The share budget is 711px**, not the spec's 635–732. Measured at
   400px wide with fonts loaded: the card came to 1107px, and 640px above
   the fold after the stats block was tightened 218 → 168.
4. **The realce should be permanent** — `selectFeature()` applied to
   stats, headlining whatever is rarest — rather than a fallback that
   only appears when an aspect bucket is empty. This also stops the
   empty-bucket cases needing special-casing. Confirmed against the
   engine: bilbao really is the empty-`En contra` case (8,4%),
   madrid-1992 really is the empty-`A favor` mirror (5,8%).

### Design decisions already taken (do not relitigate)

- The card's fold: **clase + frase + stats + one realce** above it. A
  cube does not fit — measured at ~85px + gap against 71px of headroom.
- The **1080×1920 share image is its own render**, not a screenshot of
  the DOM, so the web card can breathe and the export can scale type for
  a thumbnail.
- **Nothing signals the paywall inside the shareable frame** — no locked
  rows, no counter. The spec's own finding: a screenshot with a locked
  row does not get shared.
- One behavioural fix the design assumes: **retry the reading only.** If
  `/api/chart` succeeded and `/api/free` failed, the chart is already
  computed and recomputing is free — the retry must not send the person
  back through the form. Today all four error paths land in the same
  place.

---

Last updated: 2026-08-22 — **THE GAMIFIED ONBOARDING FLOW IS BUILT, ON
`feat/onboarding-flow`, NOT YET MERGED.** 338 → **406 tests**. Tasks 1-10 of
`docs/superpowers/plans/2026-08-22-gamified-onboarding-flow.md` are done;
spec is `docs/superpowers/specs/2026-08-22-gamified-onboarding-flow-design.md`,
eleven decisions. This is **step 1 of the sequencing decision** at the top of
this file — the landing and the path from it to a delivered free reading.

The landing is now four elements (wordmark, headline, subhead, button) and
the four-field panel is gone: `BirthForm.tsx` is **deleted**, replaced by
five routes under `/crear`, one question per screen, each answer paying back
something computed. Read **Addendum 21** before touching any of it.

**Two things a future session must not "fix":**

1. **The 4.5s reveal is deliberate.** `/api/chart` returns in ~80ms. The wait
   exists so the person watches the system compute, which is what makes the
   9,90 € feel earned — and it pushes the prose skeleton below the fold. This
   **deliberately reverses the `Espera` artboard**, whose sticky note says the
   calculating state is *"candidato a borrarse"*.
2. **The landing no longer says "cada frase nombra la posición exacta que la
   sustenta"** — nor does the page metadata. That is a **marketing** change
   only. `validateTeaser()` and `groundingProblems()` are untouched and
   grounding is still fatal on the paid tier.

**STYLING IS HOLDING, NOT DESIGNED.** The canvas has no artboard for a
one-question screen — `Entrada` still shows the old panel. Only shipped
tokens are used and `.field`/`.submit` are reused, so nothing invents a new
visual language, but these screens need a designed treatment before launch.
**This is the most important open item on this branch.**

Also still open, and needing Carlos's call: the two spec gaps at the top of
the plan. `porDentro.area` is as hour-dependent as `seVe` but is NOT hedged,
and the free prose is built on the Ascendant too. Decision 8 was reaffirmed
as written on 2026-08-22, so both are known accepted states, pinned by a test.

Before that, same day — **THE CLAY RESKIN IS BUILT AND MERGED.** Still
338 tests, because **no test in this repo asserts a class, colour or
font** — they cannot catch a visual regression, and that fact is the
single most important thing to know before touching the visual layer
again. Verification was done in the browser.

The app is now light: warm paper (`--papel #faf7f2`), coloured objects,
Bricolage Grotesque + Karla. Fraunces, IBM Plex and the ink/brass
instrument palette are gone. The brass `#c9a227` survives, renamed
`--aire`, as the colour of the Air element. Plan:
`docs/superpowers/plans/2026-08-21-clay-reskin.md`, 8 tasks, 9 commits
on `feat/clay-reskin`.

**The reskin changed appearance only.** The design canvas that produced
it also shows content changes the card spec wants — percentiles instead
of `Agua 10 / 20,5`, a permanent *realce*, three aspect cubes, no
`Bloqueado:` rows, a fold/share split — and **none of those were built.**
They still need the spec amendment. Do not read the canvas as shipped.

Two things the final review caught that per-task review structurally
could not, both now fixed: `--tinta-suave` shipped at `#9a9284`
(2.6–3.1:1, failing AA in all 21 uses, a regression from 7.45:1) and is
now `#6f685c`; and the generated `@font-face` declared `font-weight:400`
while carrying Bricolage 800 / Karla 600 bytes, which synthesised bold
on the character card because an SVG `<style>` is document-scoped and
leaks onto the page. **That leak is still there** — it is how
`card-fonts.ts` reaches the on-screen card at all — so any future change
to the embedded faces changes the page too.

`ShareCard.tsx` had a silent bug the reskin fixed: it declared fonts via
`var(--font-display, Georgia…)`, and custom properties cannot resolve
inside a serialised standalone SVG, so its exported PNG had always
fallen back to Georgia. It now uses the embedded subset like
`CharacterCardShare` does.

Known and deliberately deferred: dead CSS that got restyled (`.card`,
`.sig*`, `.bars`, `.bar*` — unreferenced; `.verdict` and `.cc__bar*` are
live), six unused palette tokens held for the parked card work, a
`.next-step` container that inherits ink-on-ink (harmless today, every
child sets its own colour), and `.soon` losing a specificity fight in a
way that **produces the accessible result — do not "fix" it.**

Before that, 2026-08-15 — **THE PAID CARD IS DESIGNED AND THE DESIGN IS
APPROVED.** Still 338 tests; nothing built yet, by intent. Spec:
`docs/superpowers/specs/2026-08-15-character-card-game-mechanics-design.md`.
It unblocks what five rejected iterations could not, by dropping the
prose-card frame entirely: **the planet is the slot, the sign is the
flavour**, and the card speaks in the third person about *tu personaje*.
Read **Addendum 20** for the decisions and the measurements behind them.

**NEXT SESSION: write the implementation plan** for that spec, then
execute it. The card still goes before plan 2 (Addendum 19), and the
spec answers the question plan 2 was waiting on: **what is sold is the
full card plus the report.**

Before that, same day — **plain register (plan A) BUILT, MEASURED AND
MERGED TO `main`.** 301 → **338 tests**, 9 commits (branch
`feat/plain-register`). The paid report is now written in plain Spanish,
the model receives no degree, orb or house number, and the battery says
the prose holds up: 3/3 reports, 92% first-attempt, zero Kimi
escalations, zero grounding failures, **zero paragraphs over 200 words**
against Addendum 13's five. `npm test`, `npx tsc --noEmit`,
`npm run example` and the `web` typecheck all green on the merged result.
Read **Addendum 17** before touching `src/sections.ts`,
`src/report.ts` or `prompts/system-section.md` — it records the go for
plan B, a methodological warning about re-checking battery output against
the wrong chart, and the fact that the gender log is noise in both
directions.

The 2026-08-15 exploration that preceded the approved design — five
rejected iterations, zero code — is kept in
`docs/superpowers/specs/2026-08-15-character-card-paid-exploration.md`
plus **Addenda 18 and 19**. Its measurements still stand; its eleven-block
frame does not. The two process rules it cost are permanent: never show a
trimmed card, always the whole thing, and no plan before Carlos approves
a design.

Before that, same day — **character card phase 1 BUILT, VERIFIED IN THE
BROWSER, AND MERGED TO `main`.** 241 → 301 tests, 20 commits (branch
`feat/character-card-free`, since deleted). `npm test`, `npm run build`,
`npm run example` and the `web` typecheck were all green on the merged
result, not just on the branch.

The free reading now opens with a computed character card and **zero LLM
calls**; `Readout`, `Elements` and `Signature` are deleted, absorbed by
it. Two long-open questions are closed by measurement: the PNG export
finally renders in **Fraunces** (Addendum 13's open font item), and the
whole card is grounded with no model in the loop. Read **Addendum 15**
(what was built, and the plan defects) and **Addendum 16** (what the
final whole-branch review caught) before touching it.

Before that, 2026-08-13 — design only, nothing built, still 241 tests.
Two things happened, both on paper:

1. The paid report's **plain register** was specced and plan A written
   (2026-08-10, commits `1b0c571`, `2bf5e4f`, `9a69de6`). This was
   missing from this checklist entirely until that day — see "Next up".
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
      2026-08-10, not executed. **PARKED as of 2026-08-22 behind the
      whole-flow design — see the sequencing decision at the top of this
      file. Do not execute.** Previously **SEQUENCED BEHIND THE CARD as of
      2026-08-15**: the card is the conversion surface (Addendum 19), and
      this plan writes a product description into Stripe, so what is
      being sold has to be settled first.
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
- [ ] **Plan 3 — queued generation pipeline.** **PARKED behind the design (2026-08-22).** Inngest two-wave fan-out,
      conditional `paid → generating` claim, per-section retry and Kimi
      escalation, Resend email.
- [~] **Plan 4 — delivery UI** — `docs/superpowers/plans/2026-08-10-delivery-ui.md`.
      **Phase A BUILT 2026-08-10** (215 → 241 tests): `ReportView`,
      `ReportIndex`, `ShareCard`, `web/src/lib/report-format.ts` and the
      dev-only `/preview/informe/<chart>` route over the battery reports.
      It answered the ~3,000-word question — **Addendum 13**. Three
      places where the plan was written against APIs this repo does not
      have are recorded there too; read it before executing phase B.
      **Phase B NOT started, and PARKED behind the design (2026-08-22)**
      (`/informe/<token>`, 2 s polling,
      progressive rendering, wiring the CTA at `BirthForm.tsx:287`) —
      it needs plans 2 and 3.
**The paid report's register** is a separate track from the four plans
above, and was missing from this list until 2026-08-13. It does not block
plans 2 and 3, and plans 2 and 3 do not block it.

- [x] **Plain register, plan A — the words** — **BUILT AND MEASURED
      2026-08-15**, 301 → 336 tests. Spec:
      `docs/superpowers/specs/2026-08-10-paid-report-plain-language-design.md`
      (amended 2026-08-13). Plan:
      `docs/superpowers/plans/2026-08-10-paid-report-plain-register.md`
      (amended 2026-08-15 to absorb the paragraph fix). `RELATION_ES`,
      `sectionFacts`, `jargonProblems`, the eight briefs rewritten with a
      paragraph range each, `groundingProblems` extended to the plain
      vocabulary. The prose-quality risk **did not materialise** — the
      datum stayed in the sentence, it just changed clothes. Full results
      and the six things the plan got wrong are in **Addendum 17**.
- [ ] **Plain register, plan B — the presentation.** Per-section data
      strip, `HookCard`, `matchesFor`, decorated `ReportSection`, shared
      glyph handling. No LLM, no vendors, no network. Goes after A.
- [x] **Character card, phase 1 (free tier)** — **BUILT AND MERGED
      2026-08-15**, 241 → 301 tests. Spec:
      `docs/superpowers/specs/2026-08-13-character-card-design.md`. Plan:
      `docs/superpowers/plans/2026-08-13-character-card-free.md`.
      Eleven tasks, all executed. `src/card.ts` (`selectTraits`,
      `freeCard`), `CLASS_ES`, `AREA_CORTA_ES`, `copyProblems`,
      `scripts/build-card-fonts.ts` + the generated
      `web/src/lib/card-fonts.ts`, `CharacterCard.tsx`,
      `CharacterCardShare.tsx`, the card on `/api/chart`, and the
      deletion of `Readout`/`Elements`/`Signature`. Renders with zero LLM
      calls. **Read Addendum 15 before touching it** — the plan shipped
      four defects that only review or the browser caught.
- [~] **Character card, phase 2 (paid) — DESIGNED AND APPROVED
      2026-08-15, NOT BUILT. Plan not yet written.** Spec:
      `docs/superpowers/specs/2026-08-15-character-card-game-mechanics-design.md`.
      The planet is the slot, the sign is the flavour; third person about
      *tu personaje*; ten blocks with the paywall after block 6; elements
      become a percentile stat block; buffs/bugs/conjunctions are three
      categories, never two. **The real cost is 256 lines of copy**, not
      engineering. Decisions and measurements in **Addendum 20**.
      The superseded exploration (five rejected iterations) is
      `docs/superpowers/specs/2026-08-15-character-card-paid-exploration.md`
      (Addenda 18 and 19) — its measurements stand, its frame does not.
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

---

## Addendum 15: the character card ships, and what executing the plan cost (2026-08-15)

Spec: `docs/superpowers/specs/2026-08-13-character-card-design.md`
Plan: `docs/superpowers/plans/2026-08-13-character-card-free.md`

Phase 1 is **built, tested and verified in a real browser**. 241 → **301
tests** (297 at the time this addendum was first written; the final review
in Addendum 16 added four), 20 commits. Everything below is measured, not
predicted.

### What the free reading looks like now

The reading opens with the card: class name, three placement rows with
gloss and degree, the affinity bars, three locked rows, the combination
line, the rarity line. Then love, matches, the opening prose, and the
9:16 export. `Readout.tsx`, `Elements.tsx` and `Signature.tsx` are
**deleted** — the card absorbed all three, with their glosses and degrees
moved into the `FreeCard` struct so nothing was lost.

**The card makes zero LLM calls.** That property survived the whole
build. It is the first user-visible surface in this product that cannot
hallucinate.

### The three questions the plan asked, answered

**1. Does the PNG export render in Fraunces?** *Yes — Addendum 13's open
font item is now CLOSED.* Verified by rasterising the live SVG twice, once
as serialised and once with its `@font-face` rules stripped, and comparing
pixels: the two images hash differently, and the `ARTISTA` headline band
carries **8,653 glyph pixels with the embedded fonts against 11,251
without** — Georgia is materially heavier. The export is 1080x1920, ink
ground, canvas untainted.

**2. Does any house number reach the page?** *No.* Checked against the
live DOM, not the struct: `/casa\s*\d|\bcasa\b/i` over `document.body.innerText`
returns false. `FreeCard` carries no `house` key at all — only `area`,
via `AREA_CORTA_ES`.

**3. Does the register land?** **Still unmeasured, and still a market
question.** It renders well and reads as a well-made profile rather than
a game sheet, but no amount of internal reasoning settles whether Spanish
astrology buyers find it delightful or childish. The free partial now
reaches real users, which is the cheapest way to find out.

### Font subset: two faces, not three

`web/src/lib/card-fonts.ts` is **39,833 bytes** — Fraunces 23,420 B and
IBM Plex Mono 6,020 B, base64'd.

**Noto Sans Symbols 2 was dropped and the plan's glyph deviation is
dead.** Google's `css2` endpoint cannot subset it: the `/l/font?kit=…` URL
it returns for that family responds **HTTP 400 with an HTML body**
(reproduced with curl, with and without UA and Referer, single glyph and
full set). The only working source is the static `symbols` unicode-range
file at **229,448 bytes** — ~8x the plan's ceiling and ~307 KB of base64
inside every serialised share SVG. So zodiac glyphs keep today's
`SIGN_GLYPH` behaviour (U+2648–U+2653 + U+FE0E through a system font).
Not a regression; it is exactly what shipped before. **Glyph fidelity is
deferred to phase 2**, where the spec already requires the card and the
per-section data strip to converge on one mechanism.

**The build script silently embedded that 400 HTML page as font data** on
its first run and reported a plausible "1.6 KB". It now asserts the `wOF2`
magic number before base64-encoding, and checks the CSS fetch status
before regexing. Note also that Google now serves subsetted faces from
`/l/font?kit=…` with **no `.woff2` extension**, so the plan's regex
matched nothing.

Two further subset notes: `°` and `′` had to be added to the character
set — `formatDegree()` renders every placement as `12°24′` inside
`.cc-mono`, and without them that notation fell back to a system font.
And the generated file is **not byte-reproducible**: Google served a
different Fraunces build between two runs (23,696 → 23,420 B).

### KNOWN LEAK, deliberately deferred to phase 2

**SVG `<style>` elements are not scoped — they apply document-wide.** So
`CARD_FONT_CSS`, injected inside the share SVG, leaks onto the page and
overrides the `.cc-display` / `.cc-mono` / `.cc-glyph` rules in
`globals.css` (equal specificity, later in document order). Confirmed
live: `.cc__class` computes to `CardDisplay, Georgia, serif`, not
`var(--font-display)`.

**Nothing is visibly wrong today** — `CardDisplay` *is* Fraunces, and
every character the card currently renders is inside the subset. But the
`globals.css` rules are dead in practice, and any character outside the
subset would silently drop to Georgia. The one-line fix is to emit
`svg .cc-display{…}` from `scripts/build-card-fonts.ts`, which still
matches inside the standalone serialised SVG but no longer matches page
elements. Deliberately not done now.

### The plan shipped four defects. Three were caught by review, one by the browser.

Recorded because the pattern matters: every one passed a green test suite.

1. **A test that could never pass.** Task 1 asserted
   `copyProblems("sois almas gemelas")` flags `"alma gemela"` — but
   `CLICHES` holds the singular and the check is `lower.includes()`, so
   the plural `-s` breaks both words. Fixed the fixture, not the check:
   `copyProblems` stays a plain substring check over the same lists
   `validateProse` uses, so hand copy and model output meet one standard.
2. **A test that contradicted its own task.** Task 5 asserted the
   serialised `FreeCard` contains none of `"rasgos"`/`"tensiones"`/
   `"planetas"`, while the same task mandated
   `bloqueado: { rasgos, tensiones, planetas }`. Rewritten as a
   *top-level* absence assertion — "absent, not hidden" means no paid
   **content**, and a count is not content.
3. **Two tests that could not fail.** Task 3's `carries no gender mark`
   is vacuous on single-word input: every `GENDERED_READER` pattern needs
   a verb or pronoun prefix a bare noun never supplies. And its
   "one register" test only counted words — it would pass if `Virgo` were
   `HOGUERA`. The spec calls this frozen table *"strictly stronger than
   the free tier's runtime gate"*, a claim those tests did not earn.
   Added an epicene-ending assertion (`/(?:ISTA|EGA|E)$/`) that rejects
   `GUERRERO`, `GUERRERA`, `MÉDICA`, `NÓMADA`, `HOGUERA` and `MAREA`.
   **Mechanical register testing was declined** — separating `ALQUIMISTA`
   from `HOGUERA` needs a per-entry tag, and phase 2's ~126 trait entries
   would inherit that cost. Register stays an authorial rule.
4. **Missing CSS.** The plan's component used `.cc-display`/`.cc-mono`/
   `.cc-glyph` but its `globals.css` block never defined them; they exist
   only inside `CARD_FONT_CSS`. The on-screen card would have rendered in
   Plex Sans. Added rules pointing at the page's next/font custom
   properties (now shadowed by the leak above, but correct).

Three more gaps review found in the plan's own tests, all now closed: the
fusion-overflow branch in `selectTraits` is **unreachable from all three
fixture charts** and needed a synthetic one; the export's
self-containment test missed `@import`, protocol-relative refs and
`xlink:href` (and a tainted canvas throws only at runtime, where no jsdom
test can see it); and `Matches`'s negative test used **zero** sharing
signs where the boundary is two, so a `>= 1` threshold bug would have
passed.

### Two pieces of shipped copy went missing in the absorption

Caught by review, not by tests, because nothing tests deleted copy.

- **`Signature`'s "Tu combinación" line** — the condensed three-sign row —
  survived nowhere, leaving *"1 de 1728 combinaciones"* with nothing
  adjacent naming the combination it counts. **Restored** on the card,
  in Sun · Moon · Ascendant order (`clase`, `porDentro`, `seVe`), which
  is deliberately **not** the card's visual row order. Do not "tidy" it.
- **`Elements`'s opening sentence** (*"Tu mezcla se va casi toda a…"*) is
  **dropped on purpose.** The affinity bars show all four totals sorted,
  dominant and weakest included, so the sentence narrated numbers sitting
  directly above it.

### Smaller things worth knowing

- `1728` is still identical for every chart. The card now shows the
  combination beside it, which makes the number parse — but it is still
  not per-person, and must never be presented as if it were.
- Locked rows carry a visually-hidden `"Bloqueado: "` prefix. The lock
  was previously conveyed **only** by a CSS `::before` emoji, which is
  decorative and unreliably announced — and spec decision 5 makes those
  rows the pitch, so screen-reader users were losing the conversion cue.
  The colour emoji is kept deliberately, against the U+FE0E discipline
  used for zodiac glyphs.
- Dead CSS was left in place, not deleted: `.readout*`, `.bars`/`.bar__*`
  and `.card`/`.sig*` are now unreferenced. `.verdict`/`.punch` are still
  live — the moved echo paragraph uses them.
- `ShareCard.tsx` is **not** deleted; the preview route still uses it and
  it has its own tests. Phase 2 removes it.

### Phase 2 is unchanged and still blocked

It needs `RELATION_ES` from plan A of the plain-language spec. It carries
the ~126-entry trait table, the drafting script, the seven planet rows,
the provenance test, the full `characterCard()`, the preview-route mount,
the glyph decision above, and the removal of `ShareCard.tsx`.

---

## Addendum 16: final whole-branch review fixes, before merge (2026-08-15)

Three defects survived eleven task-scoped reviews and were caught by a
final whole-branch pass. All three fixed: **297 → 301 tests** (four added,
several rewritten, none removed).

1. **`npm run build` was red.** `tests/card.test.ts` cast `FreeCard` to
   `Record<string, unknown>` directly, which `tsc` rejects as an
   insufficient-overlap conversion — vitest transpiles without
   typechecking, so `npm test` stayed green while the declared build
   script failed. Fixed as `as unknown as Record<string, unknown>`. While
   in that file, the fusion-overflow test's synthetic `Aspect` literals
   gained an explicit `Aspect` return type on the `aspect()` helper, so a
   future shape change to `Aspect` raises a compile error there instead of
   silently passing through `as unknown as NatalChart`.
2. **The Afinidad bars printed unauditable numbers.** The totals are
   weighted sums (Sun/Moon 3, Mercury/Venus/Mars 2, Jupiter/Saturn 1,
   outers 0.5, Ascendant 3, Midheaven 2) with no published weight table —
   `Fuego 9,5` was not something a reader could check. Both
   `CharacterCard.tsx` and `CharacterCardShare.tsx` now render each total
   against `card.afinidad.total` (`9,5 / 21,5`), restoring the share
   `Elements.tsx` used to supply before the card absorbed it. The share
   SVG's affinity value font dropped from 30px to 24px to keep the longer
   string clear of the 1032px inner border — confirmed by rendering the
   real component (worst case, all weight in one element: `"20,5 / 20,5"`)
   in a browser and screenshotting it.
3. **The web component tests could not detect a Sun/Moon/Ascendant swap.**
   Both `web/tests/character-card.test.tsx` and
   `web/tests/character-card-share.test.tsx` used fixtures where `seVe`
   and `porDentro` shared the sign "Cancer" — so the one assertion
   protecting the deliberate Sun·Moon·Ascendant combination order was
   byte-identical under a Sun·Ascendant·Moon bug, and the share test had
   no assertion binding "SE TE VE COMO" to `seVe` or "POR DENTRO" to
   `porDentro` at all. Fixtures now use three distinct signs (Leo/Aries/
   Pisces) with distinct degrees; row- and group-scoped assertions bind
   each placement to its own sign. Verified the new ordering test can
   fail: swapping `seVe`/`porDentro` in the combo line's source array
   turned it red with a real diff (`'♌︎ Leo · ♈︎ Aries · ♓︎ Piscis'` vs the
   expected `'♌︎ Leo · ♓︎ Piscis · ♈︎ Aries'`), then reverted to green.

Also corrected: `CharacterCardView`'s docstring no longer claims it
"serves" the delivery route and Puppeteer, since only `BirthForm` renders
it today — softened to describe why it *can*. (The commit count in this
section was revised twice as the fix wave landed; the merged total is 20.)

### Two nits knowingly left in, and one drift worth watching

Parked at merge rather than opening a second fix wave. None is a defect in
shipped behaviour; all three are traps for whoever edits these files next.

- **The component test fixtures use `afinidad.total: 21.5`. The real value
  is always 20.5** — `WEIGHT` sums to 15.5 across the ten bodies, plus
  Ascendant 3 and Midheaven 2, and that grand total is sign-independent,
  so it is identical for every chart ever computed. The fixtures are
  self-consistent (their four element totals do sum to 21.5) and they only
  exercise rendering, so no test is wrong — but note that this addendum's
  own example above reads `9,5 / 21,5` from the fixture while the
  worst-case note reads `20,5 / 20,5` from reality. Do not take 21.5 as
  the invariant.
- **The comment justifying the 30px → 24px affinity font drop is wrong on
  its arithmetic.** It claims the longer string would run past the 1032px
  inner border at 30px. IBM Plex Mono advances ~0.6em, and the true worst
  case `"20,5 / 20,5"` is 11 characters — ≈198px at 30px, ending near
  x=938, comfortably inside. 24px is safe and legible either way, but the
  stated reason does not hold. Correct it if you are in that file.
- **`/api/chart` now returns fields nobody reads.** `bigThree` and
  `signature` fed `Readout` and `Signature`, both deleted; `ruler` was
  already unused. They remain required on `ChartResponse`, which is
  hand-written and **not compiler-enforced against the route's
  `NextResponse.json` literal** — nothing would catch a future divergence.
  Harmless today, but the response has now visibly drifted from what is
  rendered, which is exactly the failure mode that gap invites.

---

## Addendum 17: the plain register lands, and the paragraph fix works (2026-08-15)

Plan: `docs/superpowers/plans/2026-08-10-paid-report-plain-register.md`
(amended 2026-08-15 to absorb the paragraph fix — see below).
Spec: `docs/superpowers/specs/2026-08-10-paid-report-plain-language-design.md`
Before-state preserved in `bakeoff-out/sections-technical-register/`.

Plan A is **built and measured**. 301 → **336 tests**. Everything below is
from one live battery run on 2026-08-15, not predicted.

### The headline: both open questions came back yes

| | Addendum 12 (first run) | Addendum 12 (confirming) | **This run** |
|---|---|---|---|
| Reports delivered | 2/3 | 3/3 | **3/3** |
| Attempts / 24 sections | 39 (1.63) | — | **26 (1.08)** |
| First-attempt rate | 14/24 (58%) | — | **22/24 (92%)** |
| Escalations to Kimi | 4 | 0 | **0** |
| Cost | $1.0338 | ~$0.12 | **$0.1258** |
| Wall clock | 28.2 min | 5.4 min | **15.9 min** |

Words: madrid 2745, buenosaires 2829, bilbao 2761. `parseReport` OK on
all three.

### 1. Does it still sound like the product, or like a magazine horoscope?

**Like the product.** The feared failure — that removing data from the
sentence would leave generic prose — did not happen, because the datum did
not leave the sentence. It changed clothes:

> "Con tu Venus en Leo en el terreno de la palabra y el encuentro cercano,
> te enamoras hablando, seduces contando historias..."

Planet, sign and life area are all still there and all still checkable; only
"casa tres" became "el terreno de la palabra y el encuentro cercano". The
"¿cómo lo sabe?" moment survives the translation intact. The canary's love
section is the best prose this project has produced — "intimidad para ti no
es el cuerpo: es la cocina de noche, las confesiones en voz baja" — and it
is anchored on a real Luna en Cáncer.

### 2. Did the paragraph counts land?

**Both halves, which the plan was careful to separate.**

- *The model obeyed the count*: **24/24 sections** came back inside their
  asked paragraph range. Not one missed.
- *The count worked*: **85 paragraphs, zero over 200 words.** The longest in
  the whole battery is 193.

Against Addendum 13's before-state — five paragraphs over 200, the worst a
286-word section rendered as one unbroken block, 1.31 phone screens with no
break. `Claves para tu camino`, the section that produced that block, now
comes back as 67/60/80/55 on madrid.

This settles Addendum 12's open item 3 and Addendum 13's open finding
together, which is why the fix was folded into this plan rather than run as
its own battery.

### 3. Grounding

**Clean: 24/24 delivered sections, zero false claims**, verified by replaying
every delivered section through `groundingProblems` against its own chart —
not by spot-reading, which is the mistake Addendum 12 records.

The gate also demonstrably works on the new vocabulary: buenosaires section 3
was **rejected on attempt 1** for `relación no presente: Sun-Venus
(conjunction)` and came back clean on attempt 2. That is Task 2's plain-language
grounding check catching an invented relation in the plain register — the exact
defect class that shipped undetected before.

Jargon: `grep` over all three reports for the banned vocabulary and numbered
houses returns **nothing**.

### A methodological warning, paid for during this run

An earlier pass of this addendum reported one shipped grounding failure
(`Moon-Neptune` on buenosaires). **That was wrong, and the cause is worth
recording**: the replay script was written with buenosaires' birth data typed
from memory (1985-11-03 18:45) instead of the fixture the battery actually
uses (`scripts/battery-sections.ts:44` — 1985-11-02 11:20). A different chart
produces different aspects, so correct prose was judged against the wrong sky.

**Any script that re-checks battery output must read its charts from `CASES`,
not restate them.** The same error class — restating a fixture instead of
computing it — also produced three wrong assertions in the plan itself
(Addendum's task notes below).

### The gender log is not measuring what it says

Logged: madrid 1, buenosaires 0, bilbao 3. Read against the prose, those
numbers are wrong in **both directions**, tested directly:

| Phrase (from bilbao) | Real? | `countGenderMarks` |
|---|---|---|
| `te vuelve protectora` | yes | flagged ✓ |
| `estás construyendo` ×2 | no — gerund | **flagged ✗** |
| `puedes ser generosa y expansiva` | yes | **missed ✗** |
| `sentirte igual de vista` | yes | **missed ✗** |

So the canary's real count is higher than 3, and two of its three logged marks
are noise. Operationally harmless — the paid tier logs rather than gates
(spec decision 6), and this run is more evidence for that decision, since
gating on a detector this noisy would have burned retries on gerunds. But
**do not read the logged number as a measurement**; `estás` + gerund needs the
same exclusion the free tier already gives it (Addendum 7).

### Two things that are slower or longer than hoped

- **Wall clock is 15.9 min, against the 5.4 min confirming run in Addendum 12**
  at the same cost ($0.1258 vs ~$0.12). Per-section latency ranged 16.6 s to
  236.2 s for single first-attempt calls, and the diagnostics name different
  providers per call (BaseTen, Baidu among them). Provider routing is the
  leading explanation and Addendum 12 already observed it directly on V4 Pro —
  but **this is not settled**, and it is worth re-measuring before anyone
  quotes a generation time to a buyer.
- **`Amor y vínculos` still overshoots**, now at 583-586 words against a 480
  ceiling (552 with margin), and `Vocación y propósito` hit 489 against 402.
  Both were accepted with a warning and neither cost a retry, which is the
  Addendum 12 fix working as designed. The section is simply longer than its
  brief admits; if that matters, raise the range rather than gate it.

One empty completion: buenosaires section 5, from Baidu, `completion=4095
reasoning=4094` — the whole budget spent on reasoning before emitting a word.
Retried and succeeded. The emptiness check earns its keep.

### Go/no-go for Plan B

**Go.** The prose is good enough to build the presentation layer on, which is
what this run existed to decide.

### What executing the plan cost

Tasks 1-5 landed in five commits. The plan carried five defects that a green
test suite would not have caught, all recorded in the commit messages:

1. **The plan's own test contradicted its regex.** It asserts "te gusta *ir*
   de la mano" matches, but `/va(?:n)?\s+de\s+la\s+mano/` cannot match an
   infinitive. Widened the detectors rather than relaxing the test — a missed
   relation ships an invented claim; a false positive is filtered by the
   two-planet gate.
2. **A fixture fact was wrong**: the plan calls Sol-Plutón absent in bilbao.
   It is a trine, orb 3.05. The absent-pair tests use Sol-Saturno.
3. **The wrong chart backed task 4.** `tests/section-messages.test.ts` is
   madrid, not bilbao, so the planned "Leo", "barrio" and "tiran cada uno"
   assertions were all false there.
4. **Two existing tests encoded the policies being reversed**, and the plan
   said to keep every other test as-is.
5. **The `SUPERSEDED` marker sabotaged itself.** The plan puts it in
   `system-report.md` as an HTML comment mentioning `{{RULES_CHART}}` — and
   `loadPrompt` substituted that placeholder *inside the comment*, injecting
   the whole fragment into it, while also tripping an existing test banning
   `<!--` in composed prompts. Fixed by stripping notes from prompt bodies
   before substitution, the rule fragments already followed.

---

## Addendum 18: the paid card is blocked on design, and what was learned trying (2026-08-15)

Full write-up: `docs/superpowers/specs/2026-08-15-character-card-paid-exploration.md`

**Five design iterations, all rejected, zero code written.** This addendum
records only what a future session must not rediscover; the reasoning and
the mockup links are in the document above.

### Why it stopped

The card as the 2026-08-13 spec describes it renders traits as a name
plus a sentence — which is prose in a frame, on a product whose main
complaint is already a wall of text. The target buyer **knows nothing
about astrology** and must understand the card **the first time they see
it, without reading**. None of the five versions cleared that bar.

The process error is worth naming: each iteration showed Carlos a
*subset* rather than the whole, so he could not judge what was being
lost. Assembling all eleven blocks at once is what finally exposed the
real constraint — see below.

### The finding that reframes the problem

**All eleven proposed blocks together measure 2.643 px** — about 3,3
phone screens before the report begins. The question is therefore not
which block is weak but **how much scroll the opening screen gets**.
Settle that number before discussing blocks again.

### Three measurements worth keeping

1. **Percentiles are cheap and they are what makes the card legible.**
   `computeNatalChart` + `elementBalance` run at **0,57 ms/chart**, so
   8.000 random charts take ~4,5 s and bake once into a constant table.
   "Agua 12" means nothing without astrology; **"más agua que el 98% de
   la gente"** needs no astrology at all.

   On bilbao-2000 only **two of six** measures are notable (agua p98,
   tierra p6,6 by absence); retrogrades, tie counts, tightest orb and
   zone concentration all land mid-pack. So the card must **headline
   whatever is rarest for that person** — the `selectFeature()` pattern,
   applied to stats.

2. **The compatibility material Carlos actually wants already exists.**
   `compatibleSigns()`, `topMatches()` and `frictionSign()` have been in
   `profile.ts` with tests and jargon-free reasons since the free-reading
   redesign. This was the best-received part of the whole exploration.
   The interaction that makes it work is **looking up your partner's
   sign**, so all twelve must be listed, not just the podium. Open
   decision: the free reading already shows the top three.

3. **The spec's 63-entry trait batch would cover less than half.** It
   prioritises pairs among the seven *displayed* planets, but
   `selectTraits()` takes the tightest aspects, which usually involve
   Urano, Neptuno or Plutón. Measured across the three battery charts:
   6 of 14 rows written, 8 still on fallback. If the table is revived,
   **priority must come from measured frequency**, not the spec's split.

### Three smaller decisions taken

- **"Retrógrado" is allowed on the card** (Carlos, explicitly). Note the
  consequence: `copyProblems()` bans it as jargon, so the card's copy
  test needs an explicit exemption.
- **Zones are never numbered.** `AREA_CORTA_ES` already holds written
  names; showing "2" and hoping it means something was the single least
  understood element of any version.
- **`oneIn: 1728` should be retired.** It is 12×12×12 and identical for
  every human ever born — Addendum 14 flagged it, and the percentile
  engine above makes a true rarity computable.

### Also fixed this day, outside plan A's task list

`relationPhrase()` in `profile.ts` returned the same three strings as
`RELATION_ES`. The plain-language spec assigns the fold to plan A and the
card spec makes the paid card depend on it; plan A's written tasks never
listed it. Folded, with tests pinning the equivalence. There is now **one
wording for the geometry** across free, paid and card.

---

## Addendum 19: the card IS the product — a positioning correction (2026-08-15)

Carlos, at the end of the 2026-08-15 session, correcting how this
document and the card spec are written:

> "The card is very important because it's the visual part that will
> carry the product. The product is not just the wall of text. The
> product is a fun casual woah card that will actually be viral. What
> we're actually doing now is having a really long wall of text that is
> hard to read, a person that doesn't know about astrology doesn't
> understand and won't buy."

**This reverses a stated position.** Addendum 14 calls the card "a wow/
share feature" and warns against treating it as the fix for the wall of
text. The 2026-08-13 spec frames it as the report's first screen. Both
put the 3.000-word report at the centre. The product's centre is the
card; the report is what you get after you are convinced.

Nothing built so far is wasted by this — the report still has to be good
once bought, and the plain register merged today is what makes it
readable. What changes is **priority and audience**: the card is the
conversion surface and the viral surface, so it is judged by whether a
stranger with no astrology knowledge finds it fun at a glance, not by
whether it summarises the chart faithfully.

### The concrete design rule this session produced

**Planet names are jargon. Sign names are not.** The card spec asserts
that planets and signs are *"las dos únicas palabras que todo el mundo
reconoce"*. That is true of signs and false of planets: everyone knows
their own sign and their partner's; nobody outside astrology knows what
"tu Saturno" means.

The evidence is this session's own feedback, and it is unanimous:

| Well received | Leads with |
|---|---|
| Encajas con Capricornio · Busca el suyo · Aries te descoloca | **sign names** |
| Eres agua, más que el 98% de la gente | **everyday word + comparison** |

| Rejected | Leads with |
|---|---|
| Tu Júpiter y tu Neptuno van de la mano | **planet names** |
| Qué parte de ti trabaja más (Sol 4, Marte 4…) | **planet names** |
| Se te junta todo aquí | **planet names** in every row |

Every rejected block leads with a planet; every accepted one leads with a
sign or a plain word. **This is stricter than the plain-register rule
merged today**, which deliberately keeps planet names in the paid prose
(they are how a reader verifies a claim). The card is a different surface
with a different job: it has to be understood by someone who will never
verify anything, so it should reach for signs, everyday words and
comparisons, and treat planet names as a cost to be justified.

### What this implies for the roadmap, unresolved

If the card converts and the report is the payload, then the free card is
the advertisement and the paid card is part of the purchase. That makes
the free/paid split of the compatibility block (Addendum 18) a pricing
decision rather than a UI one, and it raises a question nobody has
answered: **what exactly is being sold — the report, or the full card
with the report attached?** Decide that before plan 2 fixes a product
description in Stripe. **Answered on the same day — Addendum 20.**

---

## Addendum 20: the card is game mechanics, and the design is approved (2026-08-15)

Spec: `docs/superpowers/specs/2026-08-15-character-card-game-mechanics-design.md`

Approved by Carlos. Nothing built; the plan comes next. This addendum
records only what a future session must not re-derive.

### What unblocked it

The five rejected iterations all argued about *which blocks to show*.
The concept that ended the exploration replaces the frame: **the planet
is the slot, the sign is the flavour**. The card never prints a planet
name on its surface — it prints what the planet does (*cómo habla, cómo
se cura, cómo ataca, cómo liga, dónde tiene suerte, qué le cuesta*) —
and puts the placement behind a `?` for anyone who wants the receipt.

**The card speaks in the third person, about *tu personaje*.** That one
choice solves three problems at once: Spanish third-person verbs carry no
gender, so the epicene rule stops fighting the humour; the half-step of
distance is what keeps the roast affectionate; and it *is* the game.
The copy rule that falls out: **third person, an action, a concrete
object — never an adjective.**

### Decisions taken

- **What is sold: the full card plus the report.** This closes Addendum
  19's open question and unblocks plan 2's Stripe product description.
- **The paywall sits at the fold**, after the buffs/bugs. The free half
  is exactly one phone screen and exactly the 1080×1920 share export, so
  the shareable unit and the paywall are the same line by construction.
  A screenshot with a locked row in it does not get shared.
- **The free reading keeps its existing top-3 love block** (`PARTNER_ES`,
  unchanged). What is paid is *the twelve signs, each with its own
  reason, plus the friction sign* — not "compatibility".
- **Elements become a percentile stat block.** `AGUA 98` reads as an RPG
  stat and needs no astrology; the raw four-element bar and the separate
  punto débil both collapse into it.
- **`oneIn: 1728` is retired**, as Addenda 14 and 18 wanted.
- **Retrógrado is a per-planet modifier, not a per-sign rewrite** — 5
  lines instead of 60.

### The defect this found in shipped code

`selectTraits()` **spills a conjunction into `tensiones` whenever
`rasgos` is full.** Harmless under the old prose card; under a buff/bug
frame it prints a conjunction as something working against you, which
`card.ts`'s own comment already forbids in the opposite direction
(*"calling it harmonious would invent a valence the geometry does not
carry"*). bilbao is the proof: it has **zero tense personal aspects**, so
today's code would render Júpiter conjunct Saturno as a bug.

Fix: three buckets keyed by aspect type alone, no reassignment — *A
favor* / *En contra* / *Viene en el mismo paquete* — capped at five rows.

### Measurements worth keeping

All on 2026-08-15, over populations of 5.000–8.000 generated charts.

- **The pair distribution is FLAT.** The exploration document's plan to
  "write the most frequent pairs first" does not work: the top key is 10%
  of charts and everything else ~6%; 121 of 126 keys occur. 50 lines
  cover 3,5% of charts fully; you need essentially all of them.
- **Excluding outers from buffs/bugs halves the table for almost
  nothing**: 126 → 63 keys (58 ever seen), 76,4% of charts still fill all
  five rows, average 4,71 of 5. Same rule that already justifies seven
  slots rather than ten.
- **8,4% of charts have no tense personal aspect** and **5,8% have no
  harmonious one**. The stat block is the guaranteed fallback: punto
  débil fills the first case, punto fuerte the second. bilbao and madrid
  are the two golden charts for these paths.
- **Percentiles cost nothing**: 0,553 ms/chart, so 8.000 charts bake in
  4,4 s to a constant table.
- **Scroll budget solved**: free half 635–732 px, whole card
  1.710–1.876 px, against 2.643 px for the rejected eleven blocks.
- All seven slot planets reach all twelve signs across random birthdays,
  so none of the 84-line table is wasted. Júpiter (~1 yr/sign) and
  Saturno (~2,5) are age-correlated — still 1/12 of people, but your
  same-age friends share the line. Accepted cost.

### Two corrections made mid-session, recorded so they are not repeated

- **8,4%, not 2%, of charts have no bugs.** The first measurement counted
  conjunction-spillover as bugs — the very defect above.
- **The copy budget is 256 lines, not 240.** The element fallback needs a
  *punto fuerte* table as well as *punto débil* (8, not 4), and the
  twelve friction paragraphs were missing from the earlier totals.

### The real cost is writing

256 lines: 84 habilidades (7 × 12, the Sun's twelve being the class
gloss) + 84 compatibilidad (12 signos × 7 conexiones) + 63 pares (21 × 3
tonos) + 12 fricción + 8 elementos + 5 retrógrados. **The card keeps
phase 1's zero-LLM property** — every line is a static table entry chosen
by computed geometry. An LLM may draft them offline; none is generated at
request time.

`compatibleSigns()`'s existing `reasons` cannot be used verbatim on the
card: they name planets and they address the reader in the second person.
The slot vocabulary rewrites them for free — *"tu Venus en Leo se lleva
bien con Aries"* becomes *"Liga en el mismo idioma"*.

### One thing to fix before the percentile table is baked

The population used for these numbers samples **uniform lat/lon over the
whole globe**, oceans and poles included. *"Más agua que el 98% de la
gente"* should mean real people. All three battery charts came out
weakest-in-Tierra, which may be real or may be an artifact of that
sampling — check before baking.

---

## Addendum 21: the gamified onboarding flow (2026-08-22)

Spec: `docs/superpowers/specs/2026-08-22-gamified-onboarding-flow-design.md`
Plan: `docs/superpowers/plans/2026-08-22-gamified-onboarding-flow.md`
Branch: `feat/onboarding-flow`, 338 → 406 tests, ten tasks, ten commits.

### What it is

Four questions asked one at a time — nombre, día, hora, lugar — each answer
paying back something **computed and true, with zero LLM calls**, ending in a
deliberate 4.5-second reveal and the character card. Five routes under
`/crear`; answers live in `sessionStorage`, never in a URL.

The reward at question 2 is the **class, not the sign**: `CLASS_ES` already
shipped, so Leo arrives as **ARTISTA**. That was free copy and a better beat.

### The cusp guard, and the measurement that replaced an estimate

The flow names a class from the date alone, before the hour or place are
known. `sunSignForDate()` (`src/sunsign.ts`) is what stops that contradicting
`computeNatalChart` at question 4.

The spec guessed a "boundary day ±1" rule. It was not needed. The Sun's
ecliptic longitude increases monotonically, so local midnight at UTC+14 and
local 23:59 at UTC−12 **bound every sign it can occupy** on a date. Checked
across 1900-2030 at build time into a committed table.

**MEASURED: 45 of 366 days guarded (12,3%)**, against the spec's estimate of
~36 (~10%). Three to four days per boundary — the ~50h bracket plus a century
of drift. On those days the flow shows the cusp line and names nothing.

`src/sunsign.ts` imports **no ephemeris**, on purpose: it runs in the browser
and `astronomy-engine` would land in the landing bundle. There is a grep for
this in the plan's task 1.

### Measured in the browser, on the real flow

Card at **5015ms** from the commit press. Lines echoed *"43,26° N · 2,93° O"*
and *"Bilbao el 28 de julio de 2000"*, ending on ARTISTA / Leo 6°03′.

`/api/free` took **longer than 15s** on that run — slower than Addendum 7's
~9,5s first-attempt figure, consistent with a gate retry. The card was on
screen at 5s regardless, which is the whole point of splitting them.

**Note for anyone re-measuring: a hidden browser pane throttles timers to
1000ms**, so the dial lines appear ~1s apart rather than 750ms. That is the
harness, not the code.

### Five defects the browser caught and the tests could not

The handover's standing warning — no test in this repo asserts a class, colour
or font — earned its keep again.

1. **`Lugar`'s commit button was permanently disabled** for anyone returning
   to the step with a place already chosen. It seeded
   `useState(answers.place)`, which captures the first render — always empty,
   because the hook reads `sessionStorage` in an effect.
2. **The dial flashed `Fijando tus coordenadas: —`** for 2ms, same cause.
3. **The three questions rendered label and input on one line**, because they
   did not reuse `.field`.
4. **`.pregunta__q` (0,1,0) lost a specificity fight to `.field label`**
   (0,1,1) and rendered the question at caption size. It is now written
   `.field label.pregunta__q` with a comment saying why.
5. **The page metadata still carried the removed grounding claim**, so it
   showed in the browser tab, search results and link previews.

All five are now covered by tests or comments. **The general lesson: any state
seeded from `useBirthAnswers` on first render is empty.** Derive it, never
seed it — there are four such sites and all four were wrong at first.

### Two smaller things worth keeping

**The sunsign property test was flaky, not broken** — ~4,1s against vitest's
5s default, which it cleared alone and missed under parallel load. Narrowed to
the bracket's own bounds (−12, 0, +14) and given an explicit 30s timeout.

**Found and NOT fixed, pre-existing:** `computeNatalChart` rejects UTC years
outside 1900-2100, so a birth on **1900-01-01 east of Greenwich** resolves to
an 1899 instant it will not chart — and that is the earliest date the form
offers. `/api/chart` throws rather than returning a handled error.

### `copyProblems()` has a blind spot

It checks adjectives and participles, **not object pronouns**. The Leo line
originally read *"el sitio en el que lo ponen"*, which assumes a masculine
object and passed the gate completely clean. Read new copy for pronouns by
eye; the gate will not do it.

### What is NOT built

- **Designed question screens.** See the warning in Estado actual.
- The rest of step 1: checkout, `/informe/<token>`, the returning visitor, the
  second reading, expired tokens.
- The two spec gaps: `porDentro.area` and the prose, both hour-dependent and
  both deliberately unhedged.
