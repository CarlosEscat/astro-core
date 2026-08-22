# astro-core — Destiny Reports

Start every session by reading `HANDOVER.md` — its "Estado actual"
checklist says exactly where the project stands. Update that checklist
whenever you complete or add work, and record significant decisions as
dated addenda in the same file.

## Invariants (never violate, never relitigate without cause)

- **Timezone contract**: `computeNatalChart` takes a UTC instant. The
  caller must resolve birth-local time → UTC using the HISTORICAL offset
  at the birth date, never the current one. Getting this wrong corrupts
  every chart silently.
- **No PII to the LLM**: only derived chart data + optional sanitized
  first name ever enter a prompt.
- **Grounding discipline**: LLM output may only claim what the chart
  JSON contains. Teaser output must pass `validateTeaser()` (retry ≤2).
- Settled decisions (web-first, one-time payments, Placidus) are in
  `HANDOVER.md`. **Models: the two-tier choice was superseded on
  2026-08-08** — the paid report is DeepSeek V4 Pro one call per
  section, Kimi K3 as per-section escalation; the free tier stays
  DeepSeek V4 Flash. Reasoning in Addendum 10.

## Working notes

- `npm test` must stay green (403 tests). `npm run example` smoke-tests
  the tsx path — vitest passing does NOT prove tsx works (ESM interop).
- Prompts are composed from fragments, never copy-pasted. `{{RULES}}` is
  universal; `{{RULES_CHART}}` holds the technical vocabulary and may
  ONLY go in prompts that receive the raw chart JSON — the free tier is
  handed pre-translated data so it never learns the jargon (Addendum 8).
- `OPENROUTER_API_KEY` lives in `.env.local` (gitignored). Never commit
  or print it.
- LLM calls: reasoning models return empty content when max_tokens is
  too low (Kimi ≈24000, Flash ≈8000). Always check for empty output.
- Multi-chart test batteries for any prompt change; bilbao-2000 is the
  canary chart (breaks gender rules across all models). Run
  `scripts/battery-free.ts` for the free reading,
  `scripts/battery-report.ts` for the paid single-call one and
  `scripts/battery-sections.ts` for the paid per-section one — all cost
  money and need the network, so they are not in `npm test`. Measured
  baselines live in HANDOVER Addenda 7 (free) and 12 (per-section).
- **Grounding IS gated on the paid tier; length is not.** `groundingProblems()`
  (invented retrogradation, false sign, absent aspect) is fatal — an invented
  retrogradation shipped once because nothing checked it. `SectionCheck`
  splits `fatal` (empty, truncated) from advisory length; escalating to
  Kimi over a word count made the run slower and dearer than the single
  call it replaced. Addendum 12.
