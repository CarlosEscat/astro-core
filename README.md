# astro-core

Deterministic natal-chart computation layer for the destiny-reports product.
Outputs a canonical, PII-free chart JSON — the only thing the LLM layer sees.

## Design contract

- **Input**: a UTC instant + lat/lon. Timezone and geocoding resolution are
  the caller's job (do it once at the form layer with a tz-by-coordinates
  lookup for the *birth date*, not the browser timezone).
- **Output**: `NatalChart` JSON (~3.8K chars): 10 planets with sign/degree/
  house/retrograde, 12 house cusps, 4 angles, aspects sorted by orb.
- **No PII crosses this boundary**: no name, no email, no raw birth data —
  only derived positions. This is what makes the LLM provider choice a
  low-stakes GDPR decision.

## Usage

```ts
import { computeNatalChart } from "./src/chart";

const chart = computeNatalChart({
  utc: new Date("1992-04-15T08:30:00Z"),
  latitude: 40.4168,
  longitude: -3.7038,
}); // { houseSystem: "placidus", planets: [...], houses: [...], aspects: [...] }
```

Options: `{ houseSystem: "placidus" | "whole-sign" | "equal" }` (default
Placidus — the standard in Spain). Above |66°| latitude Placidus is
undefined; the chart silently falls back to whole-sign and flags it via
`houseSystemFallback: true`.

## Validation strategy (tests/chart.test.ts)

Fixtures anchor on *definitional* astronomical truths rather than numbers
copied from astrology sites:

1. Sun's tropical longitude = 0/90/180/270° at published equinox/solstice
   instants (6 fixtures, 0.01° tolerance).
2. Moon longitude = Sun longitude at new moon; opposite at full moon
   (searched via an independent astronomy-engine code path).
3. At the geometric (airless) sunrise moment, the Sun's longitude equals
   the computed Ascendant (3 latitudes, 0.3° tolerance) — this jointly
   validates sidereal time, obliquity, and the Ascendant formula.
4. Placidus structural invariants: opposite cusps 180° apart, monotonic
   cusp ordering, cusp 1 = Asc, cusp 10 = MC, equator degeneracy.
5. Known Mercury retrograde window (Feb–Mar 2020) for retrograde detection.
6. Historical spot check via `example.ts`: the 1992 Uranus–Neptune
   conjunction appears at <1° orb.

Run: `npm test`  ·  Example: `npm run example`

## Dependencies

`astronomy-engine` (MIT) only. Pure computation, no I/O, no network —
safe for edge functions.

## Report layer (src/report.ts + prompts/)

- `buildReportMessages({chart, firstName?, focus?})` → provider-agnostic
  `[system, user]` messages. The chart is slimmed for the LLM (no raw
  longitudes, no labels, no metadata): ~1.7K tokens total for the full
  report prompt, ~1K for the teaser.
- `prompts/system-report.md` — the product. Eight fixed sections, hard
  grounding rules (every claim must name its placement), anti-Barnum ban,
  content limits (no health/death/money/dated predictions), es-ES voice.
- `prompts/system-teaser.md` — 120–160 word free hook: Sun/Moon/Asc trio,
  one surprising specific from the tightest aspect, one dangling thread.
- `parseReport(markdown)` validates the 8-section structure for rendering;
  returns null on structural failure → retry once, then flag.
- First-name input is sanitized (letters only, 40 chars) as prompt-injection
  defense-in-depth.

## Bake-off (bakeoff.ts + prompts/rubric.md)

`OPENROUTER_API_KEY=... npx tsx bakeoff.ts` generates the same 3 charts
across 5 candidate models (Kimi K3, DeepSeek V4, GLM 5.2, Mistral Small 4,
Claude Haiku 4.5 as baseline), writes blinded outputs (A–E per chart), and
saves the letter→model mapping to KEY.json. Rank with prompts/rubric.md
BEFORE opening the key. Criterion 2 (chart grounding) is eliminatory:
one invented placement disqualifies regardless of prose quality.
