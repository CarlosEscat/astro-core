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
- Settled decisions (web-first, one-time payments, Placidus, two-tier
  models: Kimi K3 paid / DeepSeek V4 Flash free) are in `HANDOVER.md`.

## Working notes

- `npm test` must stay green (55 tests). `npm run example` smoke-tests
  the tsx path — vitest passing does NOT prove tsx works (ESM interop).
- `OPENROUTER_API_KEY` lives in `.env.local` (gitignored). Never commit
  or print it.
- LLM calls: reasoning models return empty content when max_tokens is
  too low (Kimi ≈24000, Flash ≈8000). Always check for empty output.
- Multi-chart test batteries for any prompt change; bilbao-2000 is the
  canary chart (breaks gender rules across all models).
