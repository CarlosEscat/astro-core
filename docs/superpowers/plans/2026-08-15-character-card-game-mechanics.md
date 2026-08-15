# Character Card (Game Mechanics) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the paid character card specified in
`docs/superpowers/specs/2026-08-15-character-card-game-mechanics-design.md`
— the chart rendered as a videogame character sheet, with zero LLM calls.

**Architecture:** Pure functions in `astro-core` project the `NatalChart`
into a card; static Spanish copy tables supply every line; React
components render it. `selectTraits()` is reworked into three
aspect-type buckets, a baked percentile table turns element balances into
0–100 stats, and a five-row composer applies the empty-bucket fallbacks.
Nothing in this plan calls a model, touches a prompt, or needs the
network.

**Tech Stack:** TypeScript (ESM, `"type": "module"`), vitest, Next.js 16
in `web/` consuming `astro-core` through the `@core/*` alias.

## Global Constraints

- **Zero LLM calls at render time.** Every line comes from a static table
  chosen by computed geometry. This is the property phase 1 won.
- **Copy register, every table, no exceptions:** third person about *tu
  personaje*, an action, a concrete object. **Never an adjective.**
- **No planet name may appear in any copy table.** Planet names appear
  only in the `?` reveal and the compatibility receipt, both generated
  from `PLANET_ES` + `SIGN_ES` at render time.
- **The roast attacks the behaviour, never the person.**
- **Every copy table passes `copyProblems()` and `countGenderMarks()`**
  (both from `src/validate.ts`), with exactly one documented exemption:
  `RETRO_ES` may contain "retrógrado" (Carlos approved it explicitly;
  `copyProblems()` bans it as jargon — Addendum 18).
- **Two signs sharing geometry must not share text.**
- **The free/paid split is absent from the payload, never hidden in the
  client.** `FreeCard` must not carry a paid field for the UI to hide.
- **No house numbers reach any reader-facing surface.** Use
  `AREA_CORTA_ES`, never `p.house`.
- `npm test` must stay green. Baseline at plan start: **338 tests**.
- Never write `\b` after a letter class in a regex — Spanish words do not
  end where ASCII thinks they do (Addendum 9).

---

## Scope boundary

This plan builds the card and renders it on the **dev preview route**. It
does **not** build an entitlement-gated API route or wire the card to a
payment — that is plan 2 (orders/payment) and plan 3 (delivery). The
verification surface for the paid half here is
`/preview/informe/<chart>`.

---

## File Structure

**Created:**

| File | Responsibility |
|---|---|
| `src/percentiles.ts` | Element share → percentile, over a baked table |
| `src/percentiles.data.ts` | GENERATED quantile breakpoints |
| `scripts/build-percentiles.ts` | Bakes the above from a birth-plausible population |
| `src/copy/slots.es.ts` | 84 lines — 7 planets × 12 signs |
| `src/copy/pairs.es.ts` | 63 lines — 21 pairs × 3 tones |
| `src/copy/matches.es.ts` | 84 lines — 12 signs × 7 connection types |
| `src/copy/friction.es.ts` | 12 lines — the sign that unsettles you |
| `src/copy/elements.es.ts` | 8 lines — 4 punto débil + 4 punto fuerte |
| `src/copy/retro.es.ts` | 5 lines — one per retrogradable slot planet |
| `tests/percentiles.test.ts` | Percentile engine |
| `tests/card-copy.test.ts` | The gate over all six new tables |

**Modified:**

| File | Change |
|---|---|
| `src/card.ts` | `selectTraits` → three buckets; add `cardRows`, `characterCard`; rework `freeCard` |
| `tests/card.test.ts` | Rewritten for the new shapes |
| `web/src/components/CharacterCard.tsx` | Free half + paid blocks + two interactions |
| `web/src/components/CharacterCardShare.tsx` | Renders the free half only |
| `web/src/app/preview/informe/[chart]/page.tsx` | Reads real battery birth data |
| `src/profile.ts` | Retire `signature().oneIn` |

---

## A note on the four authoring tasks

Tasks 3, 4, 6 and 7 produce **256 lines of Spanish copy**. They are not
agent-executable: the lines are the product, and shipping unreviewed
jokes is exactly what sank the five rejected iterations. Each of those
tasks:

- enumerates its complete key set, so nothing is left vague;
- carries the lines already written and approved on 2026-08-15 as the
  register anchor;
- ends with **Carlos reviewing the table** before the commit step.

The mechanical gate (`tests/card-copy.test.ts`, built in Task 3) runs on
every one of them and catches gender marks, jargon, planet names and
missing keys — but it cannot tell you whether a joke is funny.

---

### Task 1: `selectTraits` — three buckets, outers excluded

**Files:**
- Modify: `src/card.ts:22-71`
- Test: `tests/card.test.ts`

**Interfaces:**
- Consumes: `NatalChart`, `Aspect`, `AspectType`, `Body` from `src/types`
- Produces:
  ```ts
  export type Tone = "armonioso" | "tenso" | "fusion";
  export interface SelectedTrait {
    pair: [Body, Body];
    aspect: AspectType;
    orb: number;
    tone: Tone;
  }
  export interface Traits {
    aFavor: SelectedTrait[];      // trine, sextile
    enContra: SelectedTrait[];    // square, opposition
    mismoPaquete: SelectedTrait[];// conjunction
  }
  export function selectTraits(chart: NatalChart): Traits;
  ```
  All three lists are orb-ascending and **uncapped** — capping is Task 5's
  job. `MAX_RASGOS` and `MAX_TENSIONES` are deleted.

**Why this changes:** today `selectTraits` skips only outer–**outer**
pairs, and reassigns overflow between buckets — so a conjunction lands in
`tensiones` whenever `rasgos` is full. Under a buff/bug frame that prints
a conjunction as something working against you, which `card.ts`'s own
comment forbids in the other direction. bilbao has zero tense personal
aspects and is the proof.

- [ ] **Step 1: Write the failing tests**

Replace the existing `describe("selectTraits", …)` block in
`tests/card.test.ts` with:

```ts
describe("selectTraits", () => {
  it("excludes every aspect touching an outer planet", () => {
    for (const [name, chart] of Object.entries(CHARTS)) {
      const t = selectTraits(chart);
      for (const trait of [...t.aFavor, ...t.enContra, ...t.mismoPaquete]) {
        for (const body of trait.pair) {
          expect(OUTER, `${name}: ${trait.pair.join("+")}`).not.toContain(body);
        }
      }
    }
  });

  it("files every aspect under the bucket its type dictates", () => {
    for (const [name, chart] of Object.entries(CHARTS)) {
      const t = selectTraits(chart);
      for (const x of t.aFavor) {
        expect(["trine", "sextile"], name).toContain(x.aspect);
      }
      for (const x of t.enContra) {
        expect(["square", "opposition"], name).toContain(x.aspect);
      }
      for (const x of t.mismoPaquete) {
        expect(x.aspect, name).toBe("conjunction");
      }
    }
  });

  it("never files a conjunction as something working against you", () => {
    // The defect this task exists to fix. bilbao is the chart that exposes
    // it: no tense personal aspects at all, so the old overflow rule
    // pushed Jupiter conjunct Saturn into `tensiones`.
    expect(selectTraits(bilbao).enContra).toHaveLength(0);
    expect(selectTraits(bilbao).mismoPaquete.length).toBeGreaterThan(0);
  });

  it("leaves madrid with no harmonious personal aspects", () => {
    expect(selectTraits(madrid).aFavor).toHaveLength(0);
    expect(selectTraits(madrid).enContra.length).toBeGreaterThan(0);
  });

  it("orders each bucket tightest first", () => {
    for (const chart of Object.values(CHARTS)) {
      const t = selectTraits(chart);
      for (const list of [t.aFavor, t.enContra, t.mismoPaquete]) {
        const orbs = list.map((x) => x.orb);
        expect(orbs).toEqual([...orbs].sort((a, b) => a - b));
      }
    }
  });
});
```

- [ ] **Step 2: Run the tests and watch them fail**

Run: `npx vitest run tests/card.test.ts -t selectTraits`
Expected: FAIL — `t.aFavor is undefined` (the function still returns
`{ rasgos, tensiones }`).

- [ ] **Step 3: Rewrite `selectTraits`**

In `src/card.ts`, replace the `OUTER` constant, `MAX_RASGOS`,
`MAX_TENSIONES` and the whole `selectTraits` body with:

```ts
/**
 * Slow enough that their sign is shared by everyone born within years, so a
 * line about them is a line about a birth cohort, not a person. They are out
 * of the slots for that reason, and out of the pairs for the same one:
 * measured over 5.000 charts, dropping them halves the pair table (126 -> 63)
 * while 76,4% of charts still fill all five rows. Addendum 20.
 */
const OUTER = new Set<Body>(["Uranus", "Neptune", "Pluto"]);

export interface Traits {
  aFavor: SelectedTrait[];
  enContra: SelectedTrait[];
  mismoPaquete: SelectedTrait[];
}

/**
 * The chart's aspects, bucketed by what the geometry actually says and nothing
 * else. There is deliberately no overflow between buckets: the previous
 * version moved a conjunction into `tensiones` when `rasgos` filled up, which
 * under a buff/bug frame asserts a valence the geometry does not carry — the
 * exact error the old comment warned about, in the opposite direction.
 *
 * Uncapped. `cardRows()` decides how many survive onto the card, because that
 * is a layout question and this is a geometry one.
 *
 * `detectAspects` returns aspects orb-ascending, so each bucket inherits it.
 */
export function selectTraits(chart: NatalChart): Traits {
  const out: Traits = { aFavor: [], enContra: [], mismoPaquete: [] };

  for (const a of chart.aspects) {
    if (OUTER.has(a.a) || OUTER.has(a.b)) continue;
    const tone = toneFor(a.type);
    const trait: SelectedTrait = { pair: [a.a, a.b], aspect: a.type, orb: a.orb, tone };
    if (tone === "armonioso") out.aFavor.push(trait);
    else if (tone === "tenso") out.enContra.push(trait);
    else out.mismoPaquete.push(trait);
  }

  return out;
}
```

- [ ] **Step 4: Fix `freeCard`'s call site so the package compiles**

`freeCard` currently destructures `{ rasgos, tensiones }`. Task 8 rewrites
it properly; for now make it compile by replacing that line and the
`bloqueado` block with:

```ts
  const traits = selectTraits(chart);

  // Superseded in Task 8 — kept only so the package compiles between tasks.
  const bloqueado = {
    rasgos: traits.aFavor.length,
    tensiones: traits.enContra.length,
    planetas: SHOWN_PLANETS,
  };
```

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: the five new `selectTraits` tests PASS. Any other test asserting
`rasgos`/`tensiones` will fail — update those assertions to the new bucket
names; do **not** reintroduce the old shape.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/card.ts tests/card.test.ts
git commit -m "fix: a conjunction is not a bug — selectTraits buckets by aspect type

It skipped only outer-outer pairs and reassigned overflow between rasgos
and tensiones, so a conjunction landed under tensiones whenever rasgos
filled up. bilbao has zero tense personal aspects and would have shipped
Jupiter conjunct Saturn as something working against it.

Three buckets keyed by aspect type alone, uncapped, outers excluded."
```

---

### Task 2: the percentile engine

**Files:**
- Create: `scripts/build-percentiles.ts`, `src/percentiles.data.ts` (generated), `src/percentiles.ts`
- Test: `tests/percentiles.test.ts`

**Interfaces:**
- Consumes: `elementBalance` from `src/profile`, `Element` from `src/rulers`
- Produces:
  ```ts
  // src/percentiles.data.ts (generated)
  export const POPULATION_SIZE: number;
  /** 101 breakpoints per element: index i is the i-th percentile of share. */
  export const ELEMENT_QUANTILES: Record<Element, number[]>;

  // src/percentiles.ts
  export interface ElementStat {
    element: Element;
    share: number;      // 0..1, this chart's share of the weighted total
    percentile: number; // 0..100
  }
  export function percentileOf(element: Element, share: number): number;
  export function elementStats(chart: NatalChart): ElementStat[]; // Fuego, Tierra, Aire, Agua
  export function rarest(stats: ElementStat[]): ElementStat;      // furthest from p50
  ```

**The population must be birth-plausible.** The spec flags this: *"más
agua que el 98% de la gente"* has to mean real people, so the sample draws
places from the bundled GeoNames index weighted by population, not uniform
lat/lon over a globe that is mostly ocean.

- [ ] **Step 1: Write the build script**

Create `scripts/build-percentiles.ts`:

```ts
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join } from "node:path";
import { computeNatalChart } from "../src/chart";
import { elementBalance } from "../src/profile";
import type { Element } from "../src/rulers";

const ELEMENTS: Element[] = ["Fuego", "Tierra", "Aire", "Agua"];
const N = 20000;
const FROM = Date.UTC(1950, 0, 1);
const TO = Date.UTC(2010, 11, 31);

/** Deterministic, so re-running the script does not churn the generated file. */
let seed = 20260815;
function rnd(): number {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}

// [name, latitude, longitude, countryCode, region, population] — see src/places.ts
type Row = [string, number, number, string, string, number];

function loadPlaces(): Row[] {
  const path = join(process.cwd(), "data", "cities.json.gz");
  return JSON.parse(gunzipSync(readFileSync(path)).toString("utf8"));
}

/** Population-weighted, so the sample looks like where people are actually born. */
function cumulative(rows: Row[]): number[] {
  const cum: number[] = [];
  let total = 0;
  for (const r of rows) { total += Math.max(1, r[5]); cum.push(total); }
  return cum;
}

function pick(rows: Row[], cum: number[]): Row {
  const target = rnd() * cum[cum.length - 1];
  let lo = 0, hi = cum.length - 1;
  while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] < target) lo = m + 1; else hi = m; }
  return rows[lo];
}

const rows = loadPlaces();
const cum = cumulative(rows);
const samples: Record<Element, number[]> =
  { Fuego: [], Tierra: [], Aire: [], Agua: [] };

for (let i = 0; i < N; i++) {
  const place = pick(rows, cum);
  const utc = new Date(FROM + rnd() * (TO - FROM));
  const chart = computeNatalChart({ utc, latitude: place[1], longitude: place[2] });
  const b = elementBalance(chart);
  for (const e of ELEMENTS) samples[e].push(b.totals[e] / b.total);
}

const quantiles: Record<string, number[]> = {};
for (const e of ELEMENTS) {
  const sorted = samples[e].sort((a, b) => a - b);
  quantiles[e] = Array.from({ length: 101 }, (_, p) => {
    const idx = Math.min(sorted.length - 1, Math.round((p / 100) * (sorted.length - 1)));
    return +sorted[idx].toFixed(5);
  });
}

const body = `// GENERATED by scripts/build-percentiles.ts — do not edit by hand.
// Population: ${N} charts, dates uniform 1950-2010, birthplaces drawn from
// data/cities.json.gz weighted by population. Regenerate with:
//   npx tsx scripts/build-percentiles.ts
import type { Element } from "./rulers";

export const POPULATION_SIZE = ${N};

/** 101 breakpoints per element: index i is the i-th percentile of that element's share. */
export const ELEMENT_QUANTILES: Record<Element, number[]> = ${JSON.stringify(quantiles, null, 2)};
`;

writeFileSync(join(process.cwd(), "src", "percentiles.data.ts"), body);
console.log(`wrote src/percentiles.data.ts from ${N} charts`);
```

- [ ] **Step 2: Run it**

Run: `npx tsx scripts/build-percentiles.ts`
Expected: prints `wrote src/percentiles.data.ts from 20000 charts` in
roughly 15–25 s (measured: 0,553 ms per chart).

- [ ] **Step 3: Write the failing tests**

Create `tests/percentiles.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { computeNatalChart } from "../src/chart";
import { resolveBirthUtc } from "../src/birthtime";
import { percentileOf, elementStats, rarest } from "../src/percentiles";
import { ELEMENT_QUANTILES } from "../src/percentiles.data";
import type { Element } from "../src/rulers";
import type { NatalChart } from "../src/types";

const ELEMENTS: Element[] = ["Fuego", "Tierra", "Aire", "Agua"];

function chartFor(
  local: { year: number; month: number; day: number; hour: number; minute: number },
  lat: number, lon: number,
): NatalChart {
  const { utc } = resolveBirthUtc(local, lat, lon);
  return computeNatalChart({ utc, latitude: lat, longitude: lon });
}

const bilbao = chartFor({ year: 2000, month: 7, day: 30, hour: 4, minute: 15 }, 43.263, -2.935);
const buenosaires = chartFor({ year: 1985, month: 11, day: 2, hour: 11, minute: 20 }, -34.6037, -58.3816);

describe("the baked table", () => {
  it("has 101 breakpoints per element", () => {
    for (const e of ELEMENTS) expect(ELEMENT_QUANTILES[e]).toHaveLength(101);
  });

  it("is monotonic", () => {
    for (const e of ELEMENTS) {
      const q = ELEMENT_QUANTILES[e];
      for (let i = 1; i < q.length; i++) expect(q[i], `${e}[${i}]`).toBeGreaterThanOrEqual(q[i - 1]);
    }
  });
});

describe("percentileOf", () => {
  it("stays within 0 and 100", () => {
    for (const e of ELEMENTS) {
      expect(percentileOf(e, -1)).toBe(0);
      expect(percentileOf(e, 99)).toBe(100);
    }
  });

  it("puts the median of the population near 50", () => {
    for (const e of ELEMENTS) {
      const median = ELEMENT_QUANTILES[e][50];
      expect(Math.abs(percentileOf(e, median) - 50), e).toBeLessThanOrEqual(2);
    }
  });
});

describe("elementStats", () => {
  it("returns four stats whose shares sum to one", () => {
    const stats = elementStats(bilbao);
    expect(stats).toHaveLength(4);
    const sum = stats.reduce((t, s) => t + s.share, 0);
    expect(sum).toBeCloseTo(1, 5);
  });

  it("puts bilbao at the top for agua and the bottom for tierra", () => {
    // Measured 2026-08-15: agua 0,585 of the chart, tierra 0,049.
    // Asserted as ranges, not exact percentiles — those move with the table.
    const stats = elementStats(bilbao);
    const agua = stats.find((s) => s.element === "Agua")!;
    const tierra = stats.find((s) => s.element === "Tierra")!;
    expect(agua.percentile).toBeGreaterThanOrEqual(90);
    expect(tierra.percentile).toBeLessThanOrEqual(15);
  });
});

describe("rarest", () => {
  it("picks the measure furthest from the middle", () => {
    // buenosaires is the chart whose headline is an absence: tierra 0,04.
    expect(rarest(elementStats(buenosaires)).element).toBe("Tierra");
  });
});
```

- [ ] **Step 4: Run them and watch them fail**

Run: `npx vitest run tests/percentiles.test.ts`
Expected: FAIL — `Cannot find module '../src/percentiles'`.

- [ ] **Step 5: Write `src/percentiles.ts`**

```ts
import { elementBalance } from "./profile";
import type { Element } from "./rulers";
import type { NatalChart } from "./types";
import { ELEMENT_QUANTILES } from "./percentiles.data";

const ELEMENTS: Element[] = ["Fuego", "Tierra", "Aire", "Agua"];

export interface ElementStat {
  element: Element;
  /** This chart's share of the weighted total, 0..1. */
  share: number;
  /** 0..100 against the baked birth-plausible population. */
  percentile: number;
}

/**
 * "Agua 12" means nothing without astrology. "Más agua que el 98% de la gente"
 * needs none at all, and is the whole reason the card is legible to someone
 * who knows nothing about any of this.
 */
export function percentileOf(element: Element, share: number): number {
  const q = ELEMENT_QUANTILES[element];
  let lo = 0, hi = q.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (q[mid] < share) lo = mid + 1; else hi = mid;
  }
  return Math.max(0, Math.min(100, lo));
}

export function elementStats(chart: NatalChart): ElementStat[] {
  const balance = elementBalance(chart);
  return ELEMENTS.map((element) => {
    const share = balance.totals[element] / balance.total;
    return { element, share, percentile: percentileOf(element, share) };
  });
}

/**
 * The one measure worth a headline on this chart. Two people get two different
 * opening lines, which is what makes the card read as theirs — the same rule
 * `selectFeature()` follows for the free reading.
 */
export function rarest(stats: ElementStat[]): ElementStat {
  return stats.reduce((best, s) =>
    Math.abs(s.percentile - 50) > Math.abs(best.percentile - 50) ? s : best);
}
```

- [ ] **Step 6: Run the tests**

Run: `npx vitest run tests/percentiles.test.ts`
Expected: all PASS.

- [ ] **Step 7: Sanity-check the population against the spec's open question**

Run:

```bash
npx tsx -e "import('./src/percentiles.data.ts').then(m=>console.log(Object.fromEntries(Object.entries(m.ELEMENT_QUANTILES).map(([k,v])=>[k,{p10:v[10],p50:v[50],p90:v[90]}]))))"
```

Expected: each element's p50 near 0,25 (four elements sharing a whole).
**If any element's p50 is far from 0,25, stop and report it** — the spec
flags that all three battery charts came out weakest-in-Tierra and that it
may be a sampling artifact. This is where that gets resolved.

- [ ] **Step 8: Commit**

```bash
git add scripts/build-percentiles.ts src/percentiles.ts src/percentiles.data.ts tests/percentiles.test.ts
git commit -m "feat: element percentiles over a birth-plausible population

Places drawn from the bundled GeoNames index weighted by population, not
uniform lat/lon over a globe that is mostly ocean — 'más agua que el 98%
de la gente' has to mean real people. Baked to a constant table, so it
costs nothing at request time."
```

---

### Task 3: `elements.es.ts`, `retro.es.ts`, and the copy gate

**AUTHORING TASK — Carlos reviews before commit.** 13 lines.

**Files:**
- Create: `src/copy/elements.es.ts`, `src/copy/retro.es.ts`, `tests/card-copy.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // src/copy/elements.es.ts
  export const PUNTO_DEBIL_ES: Record<Element, string>;   // 4
  export const PUNTO_FUERTE_ES: Record<Element, string>;  // 4

  // src/copy/retro.es.ts
  export type RetroBody = "Mercury" | "Venus" | "Mars" | "Jupiter" | "Saturn";
  export const RETRO_ES: Record<RetroBody, string>;       // 5
  ```

**Why both directions:** the empty-bucket fallback needs a *punto fuerte*
as well as a *punto débil* — 8,4% of charts have no tense personal aspect
and 5,8% have no harmonious one.

- [ ] **Step 1: Write the copy gate**

Create `tests/card-copy.test.ts`. It is written now and **extended by
every later authoring task**, so build it to iterate over a registry:

```ts
import { describe, it, expect } from "vitest";
import { copyProblems, countGenderMarks } from "../src/validate";
import { PUNTO_DEBIL_ES, PUNTO_FUERTE_ES } from "../src/copy/elements.es";
import { RETRO_ES } from "../src/copy/retro.es";
import type { Element } from "../src/rulers";

const ELEMENTS: Element[] = ["Fuego", "Tierra", "Aire", "Agua"];

/** Every planet name the card is forbidden to print in a copy table. */
const PLANET_WORDS =
  /\b(sol|luna|mercurio|venus|marte|j[úu]piter|saturno|urano|neptuno|plut[óo]n)\b/iu;

/**
 * Tables exempt from the "retrógrado is jargon" rule. Carlos approved the word
 * on the card explicitly (Addendum 18); copyProblems() bans it everywhere else,
 * so the exemption is named here rather than weakened there.
 */
const RETRO_EXEMPT = new Set(["RETRO_ES"]);

export interface TableCase { name: string; lines: string[] }

export const TABLES: TableCase[] = [
  { name: "PUNTO_DEBIL_ES", lines: ELEMENTS.map((e) => PUNTO_DEBIL_ES[e]) },
  { name: "PUNTO_FUERTE_ES", lines: ELEMENTS.map((e) => PUNTO_FUERTE_ES[e]) },
  { name: "RETRO_ES", lines: Object.values(RETRO_ES) },
];

describe("card copy tables", () => {
  it("has no empty or stub line", () => {
    for (const { name, lines } of TABLES) {
      for (const [i, line] of lines.entries()) {
        expect(line, `${name}[${i}]`).toBeTruthy();
        expect(line.length, `${name}[${i}]`).toBeGreaterThan(12);
      }
    }
  });

  it("carries no gender mark", () => {
    for (const { name, lines } of TABLES) {
      for (const line of lines) {
        expect(countGenderMarks(line), `${name}: ${line}`).toEqual([]);
      }
    }
  });

  it("carries no jargon or cliché", () => {
    for (const { name, lines } of TABLES) {
      if (RETRO_EXEMPT.has(name)) continue;
      for (const line of lines) {
        expect(copyProblems(line), `${name}: ${line}`).toEqual([]);
      }
    }
  });

  it("names no planet", () => {
    for (const { name, lines } of TABLES) {
      for (const line of lines) {
        expect(line, `${name}: ${line}`).not.toMatch(PLANET_WORDS);
      }
    }
  });

  it("repeats no line inside a table", () => {
    for (const { name, lines } of TABLES) {
      expect(new Set(lines).size, `${name} has duplicates`).toBe(lines.length);
    }
  });
});

describe("the retrógrado exemption is deliberate and narrow", () => {
  it("is the only table allowed the word", () => {
    for (const { name, lines } of TABLES) {
      if (RETRO_EXEMPT.has(name)) continue;
      for (const line of lines) expect(line).not.toMatch(/retr[óo]grad/i);
    }
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run tests/card-copy.test.ts`
Expected: FAIL — `Cannot find module '../src/copy/elements.es'`.

- [ ] **Step 3: Write `src/copy/elements.es.ts`**

Two entries are already approved and are the register anchor; write the
other six to match them.

```ts
import type { Element } from "../rulers";

/**
 * The weakest element, as the thing this character is bad at. Reads after a
 * label like "Punto débil · le falta tierra", so it starts with the thing
 * itself — a list of concrete, ordinary failures, never an adjective.
 *
 * This table doubles as the fallback when a chart has no tense aspect at all
 * (8,4% of charts), so it is never optional.
 */
export const PUNTO_DEBIL_ES: Record<Element, string> = {
  Tierra: "Pagar impuestos, montar muebles, cuadrar cuentas, acordarse de dónde dejó las llaves.",
  Fuego: "AUTHOR THIS LINE",
  Aire: "AUTHOR THIS LINE",
  Agua: "AUTHOR THIS LINE",
};

/**
 * The strongest element, same register. Used as the fallback when a chart has
 * no harmonious aspect at all (5,8%), and nowhere else.
 */
export const PUNTO_FUERTE_ES: Record<Element, string> = {
  Aire: "Explicarle cualquier cosa a cualquiera, y caer de pie en una conversación que no entiende.",
  Fuego: "AUTHOR THIS LINE",
  Tierra: "AUTHOR THIS LINE",
  Agua: "AUTHOR THIS LINE",
};
```

Replace every `AUTHOR THIS LINE` before moving on — the gate's
`length > 12` and duplicate checks will not catch a placeholder that
happens to be long, so this is on the author.

- [ ] **Step 4: Write `src/copy/retro.es.ts`**

```ts
/**
 * Retrogradation as a modifier on the slot, not a rewrite of it. A retrograde
 * variant of every line would cost 60 entries (5 planets x 12 signs); one
 * modifier per planet costs 5, and says the same thing.
 *
 * This is the ONLY card table allowed to contain "retrógrado" — Carlos
 * approved the word explicitly, and tests/card-copy.test.ts names the
 * exemption rather than weakening copyProblems().
 */
export type RetroBody = "Mercury" | "Venus" | "Mars" | "Jupiter" | "Saturn";

export const RETRO_ES: Record<RetroBody, string> = {
  Jupiter: "Al revés. Esta habilidad la usa hacia dentro: le sale cuando deja de buscarla.",
  Mercury: "AUTHOR THIS LINE",
  Venus: "AUTHOR THIS LINE",
  Mars: "AUTHOR THIS LINE",
  Saturn: "AUTHOR THIS LINE",
};
```

- [ ] **Step 5: Run the gate**

Run: `npx vitest run tests/card-copy.test.ts`
Expected: all PASS. A failure naming a line is telling you that line
breaks a rule — fix the line, never the rule.

- [ ] **Step 6: Carlos reviews the 13 lines**

Show him all thirteen at once, never a subset. The mechanical gate cannot
tell him whether they are funny.

- [ ] **Step 7: Commit**

```bash
git add src/copy/elements.es.ts src/copy/retro.es.ts tests/card-copy.test.ts
git commit -m "feat: element and retrograde copy, plus the card copy gate

The gate checks gender marks, jargon, planet names, stubs and duplicates
across every card table, with one named exemption: RETRO_ES may say
retrógrado."
```

---

### Task 4: `pairs.es.ts` — 63 lines

**AUTHORING TASK — Carlos reviews before commit.**

**Files:**
- Create: `src/copy/pairs.es.ts`
- Modify: `tests/card-copy.test.ts` (add to `TABLES`, add completeness test)

**Interfaces:**
- Consumes: `Tone` from `src/card`, `Body` from `src/types`
- Produces:
  ```ts
  /** Key: the two body names sorted alphabetically and joined by "+", then "|", then the tone. */
  export type PairKey = string; // e.g. "Mars+Saturn|armonioso"
  export const PAIRS_ES: Record<PairKey, string>;
  export function pairKey(pair: [Body, Body], tone: Tone): PairKey;
  ```

**The complete key set is 21 pairs × 3 tones = 63.** The 21 pairs, over the
seven personal bodies (`Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn`):

```
Jupiter+Mars    Jupiter+Mercury  Jupiter+Moon    Jupiter+Saturn   Jupiter+Sun
Jupiter+Venus   Mars+Mercury     Mars+Moon       Mars+Saturn      Mars+Sun
Mars+Venus      Mercury+Moon     Mercury+Saturn  Mercury+Sun      Mercury+Venus
Moon+Saturn     Moon+Sun         Moon+Venus      Saturn+Sun       Saturn+Venus
Sun+Venus
```

Each takes all three tones: `armonioso` (trígono/sextil), `tenso`
(cuadratura/oposición), `fusion` (conjunción).

**Do not try to prioritise by frequency.** Measured over 5.000 charts the
distribution is flat — the most common key is 10% of charts and the rest
sit near 6%, and 50 written lines leave only 3,5% of charts free of
fallback. The table is only useful complete.

- [ ] **Step 1: Add the completeness test**

In `tests/card-copy.test.ts`, add:

```ts
import { PAIRS_ES, pairKey } from "../src/copy/pairs.es";
import type { Tone } from "../src/card";
import type { Body } from "../src/types";

const PERSONAL: Body[] = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"];
const TONES: Tone[] = ["armonioso", "tenso", "fusion"];

describe("PAIRS_ES", () => {
  it("covers every pair of personal bodies in every tone — 63 keys", () => {
    const missing: string[] = [];
    for (let i = 0; i < PERSONAL.length; i++) {
      for (let j = i + 1; j < PERSONAL.length; j++) {
        for (const tone of TONES) {
          const key = pairKey([PERSONAL[i], PERSONAL[j]], tone);
          if (!PAIRS_ES[key]) missing.push(key);
        }
      }
    }
    expect(missing).toEqual([]);
    expect(Object.keys(PAIRS_ES)).toHaveLength(63);
  });

  it("keys are order-independent", () => {
    expect(pairKey(["Saturn", "Mars"], "armonioso")).toBe(pairKey(["Mars", "Saturn"], "armonioso"));
  });

  it("never mentions an outer planet's pair", () => {
    for (const key of Object.keys(PAIRS_ES)) {
      expect(key).not.toMatch(/Uranus|Neptune|Pluto/);
    }
  });
});
```

Also add to the `TABLES` array:

```ts
  { name: "PAIRS_ES", lines: Object.values(PAIRS_ES) },
```

- [ ] **Step 2: Run and watch it fail**

Run: `npx vitest run tests/card-copy.test.ts`
Expected: FAIL — `Cannot find module '../src/copy/pairs.es'`.

- [ ] **Step 3: Write the table**

Eleven entries are already written and approved on the battery charts —
use them as the register anchor and write the other 52 to match.

```ts
import type { Body } from "../types";
import type { Tone } from "../card";

export type PairKey = string;

/** Order-independent, so "Mars+Saturn" and "Saturn+Mars" are the same row. */
export function pairKey(pair: [Body, Body], tone: Tone): PairKey {
  return `${[...pair].sort().join("+")}|${tone}`;
}

/**
 * What two placements do together, as one line a stranger understands.
 * `armonioso` reads under "A favor", `tenso` under "En contra", `fusion` under
 * "Viene en el mismo paquete" — so a line must make sense under its own
 * heading and nowhere else.
 *
 * Third person, an action, a concrete object. Never an adjective. The roast
 * attacks the behaviour, never the person: "se enamora de quien no se deja
 * atrapar" is affectionate, "es un desastre" is not.
 *
 * Complete by construction — 21 pairs x 3 tones. The frequency distribution is
 * flat (Addendum 20), so a partial table is a partial product.
 */
export const PAIRS_ES: Record<PairKey, string> = {
  // --- approved 2026-08-15 on the battery charts ---
  "Mars+Saturn|armonioso": "Termina lo que empieza.",
  "Jupiter+Sun|armonioso": "Le creen cuando cuenta algo.",
  "Mercury+Moon|fusion": "Siente y habla a la vez: no sabe pensar algo sin decirlo.",
  "Mars+Moon|fusion": "Se enfada y se emociona con el mismo botón.",
  "Mars+Mercury|armonioso": "Discute mejor que tú.",
  "Jupiter+Mars|armonioso": "Se le da bien apostar fuerte.",
  "Moon+Sun|armonioso": "Quiere lo mismo que siente: sin discusión interna.",
  "Mars+Moon|tenso": "Se enfada antes de saber por qué.",
  "Jupiter+Sun|tenso": "Promete más de lo que cabe en el día.",
  "Mercury+Moon|tenso": "Dice lo contrario de lo que siente, y se entera tarde.",
  "Moon+Venus|tenso": "Quiere caer bien y llevar razón al mismo tiempo.",

  // --- the remaining 52 keys, in the order listed in this task ---
  // AUTHOR EVERY KEY BELOW. The completeness test names any you miss.
};
```

- [ ] **Step 4: Run the gate until it is quiet**

Run: `npx vitest run tests/card-copy.test.ts`
Expected: the completeness test lists exactly which keys are still
missing. Iterate until all PASS.

- [ ] **Step 5: Carlos reviews all 63**

- [ ] **Step 6: Commit**

```bash
git add src/copy/pairs.es.ts tests/card-copy.test.ts
git commit -m "feat: the 63 pair lines — a favor, en contra, mismo paquete"
```

---

### Task 5: `cardRows` — the five-row composer

**Files:**
- Modify: `src/card.ts`
- Test: `tests/card.test.ts`

**Interfaces:**
- Consumes: `selectTraits` (Task 1), `elementStats`/`rarest` (Task 2),
  `PAIRS_ES`/`pairKey` (Task 4), `PUNTO_DEBIL_ES`/`PUNTO_FUERTE_ES` (Task 3)
- Produces:
  ```ts
  export interface TraitRow {
    kind: "aFavor" | "enContra" | "mismoPaquete";
    pair: [Body, Body];
    tone: Tone;
    texto: string;
  }
  export interface ElementRow {
    kind: "puntoDebil" | "puntoFuerte";
    element: Element;
    percentile: number;
    texto: string;
  }
  export type CardRow = TraitRow | ElementRow;
  export function cardRows(chart: NatalChart): CardRow[]; // length <= 5
  ```

**The composition rule, exactly:**

1. Bucket the aspects with `selectTraits` (outers already gone).
2. **Reserve fallback slots first.** If `enContra` is empty, reserve one
   for `puntoDebil`. If `aFavor` is empty, reserve one for `puntoFuerte`.
3. Fill the remaining `5 − reserved` slots by walking **all** the
   bucketed aspects in orb order, tightest first, subject to per-bucket
   caps of **3 aFavor, 2 enContra, 2 mismoPaquete**.
4. Emit in display order: `aFavor`, then `puntoFuerte` if reserved, then
   `enContra`, then `puntoDebil` if reserved, then `mismoPaquete`.

Reserving before filling is what keeps the total at five: on bilbao,
filling first would produce three harmonious rows *plus* the punto débil
and overflow the card.

- [ ] **Step 1: Write the failing tests**

Add to `tests/card.test.ts`:

```ts
describe("cardRows", () => {
  it("never returns more than five rows", () => {
    for (const [name, chart] of Object.entries(CHARTS)) {
      expect(cardRows(chart).length, name).toBeLessThanOrEqual(5);
    }
  });

  it("gives bilbao a punto débil, because it has no tense aspect", () => {
    const rows = cardRows(bilbao);
    expect(rows.filter((r) => r.kind === "enContra")).toHaveLength(0);
    expect(rows.filter((r) => r.kind === "puntoDebil")).toHaveLength(1);
    expect(rows.filter((r) => r.kind === "puntoFuerte")).toHaveLength(0);
    expect(rows).toHaveLength(5);
  });

  it("gives madrid a punto fuerte, because it has no harmonious aspect", () => {
    const rows = cardRows(madrid);
    expect(rows.filter((r) => r.kind === "aFavor")).toHaveLength(0);
    expect(rows.filter((r) => r.kind === "puntoFuerte")).toHaveLength(1);
    expect(rows.filter((r) => r.kind === "enContra")).toHaveLength(2);
  });

  it("gives buenosaires no fallback at all", () => {
    const rows = cardRows(buenosaires);
    expect(rows.filter((r) => r.kind === "puntoDebil")).toHaveLength(0);
    expect(rows.filter((r) => r.kind === "puntoFuerte")).toHaveLength(0);
    expect(rows).toHaveLength(5);
  });

  it("respects the per-bucket caps", () => {
    for (const [name, chart] of Object.entries(CHARTS)) {
      const rows = cardRows(chart);
      expect(rows.filter((r) => r.kind === "aFavor").length, name).toBeLessThanOrEqual(3);
      expect(rows.filter((r) => r.kind === "enContra").length, name).toBeLessThanOrEqual(2);
      expect(rows.filter((r) => r.kind === "mismoPaquete").length, name).toBeLessThanOrEqual(2);
    }
  });

  it("resolves every row to real copy", () => {
    for (const [name, chart] of Object.entries(CHARTS)) {
      for (const row of cardRows(chart)) {
        expect(row.texto, `${name}/${row.kind}`).toBeTruthy();
        expect(row.texto.length, `${name}/${row.kind}`).toBeGreaterThan(12);
      }
    }
  });
});
```

- [ ] **Step 2: Run and watch them fail**

Run: `npx vitest run tests/card.test.ts -t cardRows`
Expected: FAIL — `cardRows is not a function`.

- [ ] **Step 3: Implement it**

Add to `src/card.ts`:

```ts
import { elementStats, type ElementStat } from "./percentiles";
import { PAIRS_ES, pairKey } from "./copy/pairs.es";
import { PUNTO_DEBIL_ES, PUNTO_FUERTE_ES } from "./copy/elements.es";

export interface TraitRow {
  kind: "aFavor" | "enContra" | "mismoPaquete";
  pair: [Body, Body];
  tone: Tone;
  texto: string;
}
export interface ElementRow {
  kind: "puntoDebil" | "puntoFuerte";
  element: Element;
  percentile: number;
  texto: string;
}
export type CardRow = TraitRow | ElementRow;

const MAX_ROWS = 5;
const CAP = { aFavor: 3, enContra: 2, mismoPaquete: 2 } as const;

/**
 * The rows above the fold, which are also the free half and the share image.
 *
 * Fallbacks are reserved BEFORE the aspects are dealt, not appended after. Fill
 * first and bilbao produces three harmonious rows and then still needs its
 * punto débil, which is six rows on a card budgeted for five.
 */
export function cardRows(chart: NatalChart): CardRow[] {
  const traits = selectTraits(chart);
  const stats = elementStats(chart);
  const weakest = stats.reduce((a, b) => (a.share <= b.share ? a : b));
  const strongest = stats.reduce((a, b) => (a.share >= b.share ? a : b));

  const needsDebil = traits.enContra.length === 0;
  const needsFuerte = traits.aFavor.length === 0;
  const budget = MAX_ROWS - (needsDebil ? 1 : 0) - (needsFuerte ? 1 : 0);

  const picked = { aFavor: [] as TraitRow[], enContra: [] as TraitRow[], mismoPaquete: [] as TraitRow[] };
  const byOrb = [...traits.aFavor, ...traits.enContra, ...traits.mismoPaquete]
    .sort((a, b) => a.orb - b.orb);

  let used = 0;
  for (const t of byOrb) {
    if (used >= budget) break;
    const kind = t.tone === "armonioso" ? "aFavor" : t.tone === "tenso" ? "enContra" : "mismoPaquete";
    if (picked[kind].length >= CAP[kind]) continue;
    picked[kind].push({
      kind, pair: t.pair, tone: t.tone, texto: PAIRS_ES[pairKey(t.pair, t.tone)],
    });
    used++;
  }

  const elementRow = (kind: "puntoDebil" | "puntoFuerte", s: ElementStat): ElementRow => ({
    kind,
    element: s.element,
    percentile: s.percentile,
    texto: kind === "puntoDebil" ? PUNTO_DEBIL_ES[s.element] : PUNTO_FUERTE_ES[s.element],
  });

  return [
    ...picked.aFavor,
    ...(needsFuerte ? [elementRow("puntoFuerte", strongest)] : []),
    ...picked.enContra,
    ...(needsDebil ? [elementRow("puntoDebil", weakest)] : []),
    ...picked.mismoPaquete,
  ];
}
```

Add `import type { Element } from "./rulers";` at the top if it is not
already there.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/card.test.ts`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/card.ts tests/card.test.ts
git commit -m "feat: cardRows composes the five rows above the fold

Fallbacks are reserved before the aspects are dealt: bilbao has no tense
aspect and filling first would give it six rows on a five-row card."
```

---

### Task 6: `slots.es.ts` — 84 lines

**AUTHORING TASK — Carlos reviews before commit.**

**Files:**
- Create: `src/copy/slots.es.ts`
- Modify: `tests/card-copy.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type SlotBody = "Sun" | "Moon" | "Mercury" | "Venus" | "Mars" | "Jupiter" | "Saturn";
  /** The verb-phrase label each slot shows, e.g. "cómo habla". Sun has none — it is the class. */
  export const SLOT_LABEL_ES: Record<SlotBody, string>;
  export const SLOT_ES: Record<SlotBody, Record<Sign, string>>;
  ```

**The Sun's twelve entries are the class glosses**, not a Habilidades row
— they read under the big `CLASS_ES` name. The other six are the six
Habilidades rows.

**`SUN_ES` / `MOON_ES` / `ASC_ES` cannot be reused.** They are second
person and free-reading register (*"te gusta que se te note"*); this table
is third person and an action (*"monta un espectáculo para que se le
note"*). Same data, different voice.

- [ ] **Step 1: Add the completeness test**

In `tests/card-copy.test.ts`:

```ts
import { SLOT_ES, SLOT_LABEL_ES, type SlotBody } from "../src/copy/slots.es";
import { SIGN_ORDER } from "../src/rulers";

const SLOT_BODIES: SlotBody[] = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"];

describe("SLOT_ES", () => {
  it("covers all seven slots in all twelve signs — 84 lines", () => {
    const missing: string[] = [];
    for (const body of SLOT_BODIES) {
      for (const sign of SIGN_ORDER) if (!SLOT_ES[body]?.[sign]) missing.push(`${body}/${sign}`);
    }
    expect(missing).toEqual([]);
    expect(SLOT_BODIES.flatMap((b) => Object.values(SLOT_ES[b]))).toHaveLength(84);
  });

  it("labels the six shown slots and leaves the Sun to the class", () => {
    for (const body of SLOT_BODIES) expect(SLOT_LABEL_ES[body], body).toBeTruthy();
  });

  it("never names the sign inside its own line", () => {
    for (const body of SLOT_BODIES) {
      for (const sign of SIGN_ORDER) {
        expect(SLOT_ES[body][sign].toLowerCase(), `${body}/${sign}`)
          .not.toContain(SIGN_ES[sign].toLowerCase());
      }
    }
  });
});
```

Add to `TABLES`:

```ts
  ...SLOT_BODIES.map((b) => ({ name: `SLOT_ES.${b}`, lines: Object.values(SLOT_ES[b]) })),
```

Import `SIGN_ES` from `../src/copy/signs.es` at the top of the test file.

- [ ] **Step 2: Run and watch it fail**

Run: `npx vitest run tests/card-copy.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the table**

Nineteen entries are already approved across the three battery charts.

```ts
import type { Sign } from "../types";

export type SlotBody = "Sun" | "Moon" | "Mercury" | "Venus" | "Mars" | "Jupiter" | "Saturn";

/**
 * The planet is the slot; the sign is the flavour. The label is what the
 * planet DOES — the planet's name never reaches the surface, only the `?`.
 * The Sun has no row: it is the class, and its label is unused by Habilidades.
 */
export const SLOT_LABEL_ES: Record<SlotBody, string> = {
  Sun: "quién es",
  Mercury: "cómo habla",
  Moon: "cómo se cura",
  Mars: "cómo ataca",
  Venus: "cómo liga",
  Jupiter: "dónde tiene suerte",
  Saturn: "qué le cuesta",
};

/**
 * Third person, an action, a concrete object. Never an adjective — that rule
 * is what keeps these lines genderless in Spanish without a single regex.
 *
 * Each line reads directly after its label, so it starts mid-sentence:
 * "cómo habla" + "en indirectas y silencios con intención".
 *
 * The Sun's twelve read under the class name instead, as its gloss.
 */
export const SLOT_ES: Record<SlotBody, Record<Sign, string>> = {
  Sun: {
    Leo: "necesita público hasta para estar en su casa",
    Aries: "AUTHOR THIS LINE",
    Taurus: "AUTHOR THIS LINE",
    Gemini: "AUTHOR THIS LINE",
    Cancer: "AUTHOR THIS LINE",
    Virgo: "AUTHOR THIS LINE",
    Libra: "AUTHOR THIS LINE",
    Scorpio: "AUTHOR THIS LINE",
    Sagittarius: "AUTHOR THIS LINE",
    Capricorn: "AUTHOR THIS LINE",
    Aquarius: "AUTHOR THIS LINE",
    Pisces: "AUTHOR THIS LINE",
  },
  Mercury: {
    Cancer: "en indirectas y silencios con intención",
    Aries: "a bocajarro, y luego lo piensa",
    Sagittarius: "soltando la verdad sin mirar dónde cae",
    // ...the other nine
  },
  Moon: {
    Cancer: "llorando en su cuarto",
    Libra: "llamando a alguien para comentarlo",
    // ...the other ten
  },
  Mars: {
    Cancer: "de lado, nunca de frente",
    Pisces: "desapareciendo del mapa hasta que se le pasa",
    Libra: "con buenos modales, que es peor",
    // ...the other nine
  },
  Venus: {
    Leo: "montando un espectáculo",
    Aries: "yendo de frente el primer día",
    Libra: "haciendo que todo parezca fácil",
    // ...the other nine
  },
  Jupiter: {
    Gemini: "cayendo bien mientras habla",
    Virgo: "arreglando lo que otros rompieron",
    Aquarius: "cuando hace lo que no hace nadie",
    // ...the other nine
  },
  Saturn: {
    Taurus: "soltar lo que ya tiene",
    Aquarius: "pedirle ayuda al grupo",
    Scorpio: "fiarse, y soltar lo que sabe de los demás",
    // ...the other nine
  },
};
```

- [ ] **Step 4: Run the gate until quiet**

Run: `npx vitest run tests/card-copy.test.ts`
Expected: the completeness test names every missing `body/sign`. Iterate
to green.

- [ ] **Step 5: Carlos reviews all 84**

- [ ] **Step 6: Commit**

```bash
git add src/copy/slots.es.ts tests/card-copy.test.ts
git commit -m "feat: the 84 slot lines — the planet is the slot, the sign is the flavour"
```

---

### Task 7: `matches.es.ts` (84) and `friction.es.ts` (12)

**AUTHORING TASK — Carlos reviews before commit.**

**Files:**
- Create: `src/copy/matches.es.ts`, `src/copy/friction.es.ts`
- Modify: `tests/card-copy.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type Connection =
    | "descendant" | "rulerOfSeventh" | "venus" | "mars" | "moon" | "sun" | "ninguna";
  export const MATCH_ES: Record<Connection, Record<Sign, string>>; // 7 x 12 = 84
  export const FRICTION_ES: Record<Sign, string>;                  // 12
  ```

**The seven connection types**, chosen so the count is exactly 84: a
seventh-house tenant is *scored* as `compatibleSigns()` already scores it
but *worded* with the `rulerOfSeventh` key — both mean "this sign runs
your relationships". `ninguna` covers every sign scoring zero, and those
lines are not filler: on bilbao, *"El mismo número, el mismo escenario.
Alguien tiene que sentarse a mirar y ninguno de los dos ha venido a eso"*
is one of the strongest lines on the card.

**Why `compatibleSigns()`'s existing `reasons` cannot be reused:** they
name planets (*"Tauro es donde está Saturno"*) and they address the reader
in the second person, while the card speaks in the third. They stay where
they are, serving the free reading and the grey receipt line.

**`PARTNER_ES` is not touched.** The free reading keeps showing its top
three with it; what this table sells is the twelve with their own reasons
plus the friction sign.

- [ ] **Step 1: Add the completeness test**

```ts
import { MATCH_ES, type Connection } from "../src/copy/matches.es";
import { FRICTION_ES } from "../src/copy/friction.es";

const CONNECTIONS: Connection[] = [
  "descendant", "rulerOfSeventh", "venus", "mars", "moon", "sun", "ninguna",
];

describe("MATCH_ES and FRICTION_ES", () => {
  it("covers seven connections across twelve signs — 84 lines", () => {
    const missing: string[] = [];
    for (const c of CONNECTIONS) {
      for (const sign of SIGN_ORDER) if (!MATCH_ES[c]?.[sign]) missing.push(`${c}/${sign}`);
    }
    expect(missing).toEqual([]);
    expect(CONNECTIONS.flatMap((c) => Object.values(MATCH_ES[c]))).toHaveLength(84);
  });

  it("covers all twelve friction signs", () => {
    for (const sign of SIGN_ORDER) expect(FRICTION_ES[sign], sign).toBeTruthy();
  });

  it("gives two signs with the same connection different text", () => {
    // The complaint that produced this table: Aries and Sagitario shared
    // geometry and therefore shared bytes.
    for (const c of CONNECTIONS) {
      const lines = Object.values(MATCH_ES[c]);
      expect(new Set(lines).size, `${c} repeats a line`).toBe(lines.length);
    }
  });
});
```

Add to `TABLES`:

```ts
  ...CONNECTIONS.map((c) => ({ name: `MATCH_ES.${c}`, lines: Object.values(MATCH_ES[c]) })),
  { name: "FRICTION_ES", lines: Object.values(FRICTION_ES) },
```

- [ ] **Step 2: Run and watch it fail**

Run: `npx vitest run tests/card-copy.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write both tables**

Twelve `MATCH_ES` lines and one `FRICTION_ES` line are already approved,
written for bilbao. Note which connection each belongs to.

```ts
import type { Sign } from "../types";

/**
 * Which fact about this chart connects it to that sign — the highest-weight
 * one, using the same weights compatibleSigns() scores with. A seventh-house
 * tenant is worded as rulerOfSeventh: both say "this sign runs your
 * relationships", and splitting them would buy a 96th line that says the
 * same thing.
 */
export type Connection =
  | "descendant" | "rulerOfSeventh" | "venus" | "mars" | "moon" | "sun" | "ninguna";

/**
 * Each line joins what that sign DOES to something this person already is,
 * taken from their own slots — "contigo, que hablas en indirectas". That
 * second half is what stops twelve rows reading like twelve horoscopes.
 *
 * Reads above the grey receipt line, which carries the geometry.
 */
export const MATCH_ES: Record<Connection, Record<Sign, string>> = {
  descendant: {
    Capricorn: "No le vas a impresionar, y justo por eso te fías. Capricornio no aplaude el espectáculo: se queda a recoger cuando se ha ido todo el mundo.",
    // ...the other eleven
  },
  rulerOfSeventh: {
    Taurus: "Tarda una eternidad en moverse, pero cuando se queda, se queda. A alguien que no suelta lo que ya tiene, eso le suena a casa.",
    // ...the other eleven
  },
  venus: {
    Aries: "Entra por donde tú rodeas. Dice en voz alta lo que tú llevas media tarde insinuando — y eso te encanta y te agota el mismo día.",
    Sagittarius: "Se ríe fuerte y no se para a descifrar qué querías decir con ese silencio. Contigo, que hablas en indirectas, funciona mejor de lo que parece: te obliga a soltarlo.",
    Gemini: "Habla por los dos, que a ti te quita trabajo. El riesgo es que cambie de tema antes de que hayas terminado de montar la indirecta.",
    Libra: "Te da público sin que tengas que pedirlo, que es lo que más te gusta del mundo. Y esquiva el conflicto tanto como tú: eso es un problema, pero de más adelante.",
    // ...the other eight
  },
  mars: {
    Scorpio: "Entiende el silencio sin que se lo traduzcas. Ninguno de los dos va a decir lo que pasa, y aun así los dos os enteráis.",
    Pisces: "Se emociona antes que tú y no le da ninguna vergüenza. A alguien que llora con la puerta cerrada, eso le desarma bastante.",
    Virgo: "Te ordena justo la parte que llevas peor: los papeles, las cuentas, el mueble sin montar. A cambio te va a decir, con detalle, lo que has hecho mal.",
    // ...the other nine
  },
  moon: { /* twelve */ },
  sun: { /* twelve */ },
  ninguna: {
    Cancer: "Te entiende demasiado. Dos personas que se curan encerrándose en su cuarto acaban en dos cuartos distintos, cada una esperando que llame la otra.",
    Leo: "El mismo número, el mismo escenario. Alguien tiene que sentarse a mirar y ninguno de los dos ha venido a eso.",
    Aquarius: "Le da exactamente igual tu espectáculo, y lo raro es que eso no te atrae ni te ofende. Es el único de los doce que no te mueve en ninguna dirección.",
    // ...the other nine
  },
};
```

```ts
import type { Sign } from "../types";

/**
 * The sign that attracts and unsettles at once — a paragraph, not a clause,
 * because it is the most shareable block on the card: it names a specific
 * person in the reader's life.
 */
export const FRICTION_ES: Record<Sign, string> = {
  Aries: "Es el único que te atrae y te desarma con el mismo gesto. Aries no rodea: entra. Tú llevas toda la vida diciendo las cosas de lado, y aparece alguien que las dice de frente y se queda tan ancho. Te fascina mientras dura y te deja sin repertorio en cuanto se va.",
  // ...the other eleven
};
```

- [ ] **Step 4: Run the gate until quiet**

Run: `npx vitest run tests/card-copy.test.ts`
Expected: green.

- [ ] **Step 5: Carlos reviews all 96**

- [ ] **Step 6: Commit**

```bash
git add src/copy/matches.es.ts src/copy/friction.es.ts tests/card-copy.test.ts
git commit -m "feat: the 96 compatibility lines — twelve signs, seven connections, one friction"
```

---

### Task 8: `characterCard`, the reworked `freeCard`, and retiring `oneIn`

**Files:**
- Modify: `src/card.ts`, `src/profile.ts:364-379`
- Test: `tests/card.test.ts`, `tests/profile.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 1–7, plus `compatibleSigns`,
  `frictionSign`, `chartRuler`, `relationshipProfile` from `src/profile`
- Produces:
  ```ts
  export interface FreeCard {
    clase: { sign: Sign; nombre: string; gloss: string };
    seVe: { sign: Sign };
    punchline: string;
    stats: ElementStat[];
    titular: ElementStat;
    filas: CardRow[];
    bloqueado: { habilidades: number; signos: number };
  }
  export interface Habilidad {
    body: SlotBody; label: string; texto: string;
    sign: Sign; area: string; retro: string | null;
  }
  export interface Match {
    sign: Sign; score: number; connection: Connection;
    texto: string; recibo: string;
  }
  export interface CharacterCard extends FreeCard {
    habilidades: Habilidad[];   // 6
    puntoDebil: ElementRow;
    matches: Match[];           // 12, ordered by score
    friccion: { sign: Sign; texto: string };
  }
  export function freeCard(chart: NatalChart): FreeCard;
  export function characterCard(chart: NatalChart): CharacterCard;
  ```

`FreeCard` still carries **no paid field**. `bloqueado` counts only.

`connectionFor(chart, sign)` picks the highest-weight connection present,
mirroring `compatibleSigns()`'s weights: descendant > rulerOfSeventh (and
seventh tenant) > venus > moon > mars > sun, falling back to `ninguna`
when the sign scores zero.

- [ ] **Step 1: Write the failing tests**

```ts
describe("characterCard", () => {
  it("hands out exactly six abilities, never the Sun", () => {
    for (const [name, chart] of Object.entries(CHARTS)) {
      const card = characterCard(chart);
      expect(card.habilidades, name).toHaveLength(6);
      expect(card.habilidades.map((h) => h.body)).not.toContain("Sun");
    }
  });

  it("lists all twelve signs, highest score first", () => {
    const card = characterCard(bilbao);
    expect(card.matches).toHaveLength(12);
    const scores = card.matches.map((m) => m.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    expect(card.matches[0].sign).toBe("Capricorn");
  });

  it("resolves every match to copy and a receipt", () => {
    for (const [name, chart] of Object.entries(CHARTS)) {
      for (const m of characterCard(chart).matches) {
        expect(m.texto, `${name}/${m.sign}`).toBeTruthy();
        expect(m.recibo, `${name}/${m.sign}`).toBeTruthy();
      }
    }
  });

  it("uses the ninguna connection exactly for the signs scoring zero", () => {
    for (const chart of Object.values(CHARTS)) {
      for (const m of characterCard(chart).matches) {
        expect(m.connection === "ninguna").toBe(m.score === 0);
      }
    }
  });

  it("flags madrid's retrograde Jupiter and nothing else", () => {
    const retro = characterCard(madrid).habilidades.filter((h) => h.retro !== null);
    expect(retro.map((h) => h.body)).toEqual(["Jupiter"]);
    expect(characterCard(bilbao).habilidades.filter((h) => h.retro !== null)).toHaveLength(0);
  });

  it("never leaks a house number into a reader-facing string", () => {
    for (const chart of Object.values(CHARTS)) {
      for (const h of characterCard(chart).habilidades) {
        expect(h.area).not.toMatch(/\bcasa\b|\d/i);
      }
    }
  });
});

describe("freeCard", () => {
  it("carries no paid field", () => {
    const json = JSON.stringify(freeCard(bilbao));
    for (const key of ["habilidades", "matches", "friccion", "puntoDebil"]) {
      expect(json, key).not.toContain(`"${key}"`);
    }
  });

  it("counts what is locked without revealing it", () => {
    expect(freeCard(bilbao).bloqueado).toEqual({ habilidades: 6, signos: 12 });
  });

  it("has a punchline naming three things", () => {
    expect(freeCard(bilbao).punchline).toMatch(/^Tu personaje /);
  });
});
```

- [ ] **Step 2: Run and watch them fail**

Run: `npx vitest run tests/card.test.ts`
Expected: FAIL — `characterCard is not a function`.

- [ ] **Step 3: Implement, then delete `oneIn`**

Write `connectionFor`, `freeCard` and `characterCard` in `src/card.ts`
against the interfaces above. Then in `src/profile.ts` remove `oneIn`
from the `Signature` interface and from `signature()`, and delete the
`/** Honest combinatorial rarity … */` comment with it.

Remove any `tests/profile.test.ts` assertion on `oneIn`. The percentile
engine is the real rarity now: 12×12×12 returns the same number for every
human who has ever lived (Addenda 14, 18).

- [ ] **Step 4: Run the whole suite**

Run: `npm test`
Expected: green.

- [ ] **Step 5: Typecheck both packages**

Run: `npx tsc --noEmit && cd web && npx tsc --noEmit`
Expected: `web` fails only where `CharacterCard.tsx` still reads the old
`FreeCard` fields — Task 9 fixes that. Note the errors and continue.

- [ ] **Step 6: Commit**

```bash
git add src/card.ts src/profile.ts tests/card.test.ts tests/profile.test.ts
git commit -m "feat: characterCard, and 1-de-1728 is retired

12x12x12 returns the same number for every human who has ever lived. The
percentile table makes rarity real."
```

---

### Task 9: `CharacterCard.tsx`

**Files:**
- Modify: `web/src/components/CharacterCard.tsx`

Renders `FreeCard` alone or a full `CharacterCard`. Two client
interactions: the `?` reveal on each ability, and tap-to-expand on each
of the twelve matches. Reference layout, verified in the browser on
2026-08-15:
`.superpowers/brainstorm/23750-1786821511/content/compat-personal.html`.

- [ ] **Step 1: Take the props union**

```tsx
export function CharacterCardView({
  card, firstName,
}: { card: FreeCard | CharacterCard; firstName?: string }) {
  const paid = "habilidades" in card;
  // …
}
```

- [ ] **Step 2: Render the free half**

In order: `clase.nombre` + gloss + the Sol/Ascendente line; `punchline`;
the four `stats` as percentile bars with `titular` as the note beneath;
then `filas`, grouped by `kind`.

The grouping is the fiddly part, because a heading must never appear over
an empty group — madrid has no *A favor* and bilbao no *En contra*:

```tsx
const GROUPS = [
  { kind: "aFavor", label: "A favor", sign: "+" },
  { kind: "puntoFuerte", label: null, sign: null },
  { kind: "enContra", label: "En contra", sign: "−" },
  { kind: "puntoDebil", label: null, sign: null },
  { kind: "mismoPaquete", label: "Viene en el mismo paquete", sign: "=" },
] as const;

{GROUPS.map(({ kind, label, sign }) => {
  const rows = card.filas.filter((f) => f.kind === kind);
  if (rows.length === 0) return null;

  // The two element rows carry their own label and render as a bordered
  // block, so they never sit under one of the three aspect headings.
  if (label === null) {
    const row = rows[0] as ElementRow;
    const debil = row.kind === "puntoDebil";
    return (
      <div className={debil ? "cc__weak" : "cc__weak cc__weak--good"} key={kind}>
        <p className="cc__label">
          {debil ? "Punto débil · le falta " : "Punto fuerte · le sobra "}
          {row.element.toLowerCase()}
        </p>
        <p>{row.texto}</p>
      </div>
    );
  }

  return (
    <div key={kind}>
      <p className="cc__label">{label}</p>
      {rows.map((r, i) => (
        <div className="cc__bb" key={i}>
          <span className="cc__sig" aria-hidden>{sign}</span>
          <span>{r.texto}</span>
        </div>
      ))}
    </div>
  );
})}
```

- [ ] **Step 3: Render the paid half behind `paid`**

**Habilidades** (six rows, `label` + `texto` + `?` + the `retro` line when
present), **Punto débil**, **Compatibilidad** (twelve rows; row zero shows
`texto` inline, the rest reveal it on tap, with `recibo` under both in
mono at 40% opacity, and the friction sign tagged inline), then the
**Quien le descoloca** block.

- [ ] **Step 4: Verify in the browser**

Run `npm run dev` in `web/`, open `/preview/informe/bilbao-2000`, and
check: six ability rows, twelve matches, one tagged as friction, no bug
rows on bilbao and a punto débil in their place, drawers open and close.

- [ ] **Step 5: Typecheck and commit**

```bash
cd web && npx tsc --noEmit && cd ..
git add web/src/components/CharacterCard.tsx
git commit -m "feat: the card renders its paid half"
```

---

### Task 10: `CharacterCardShare.tsx` renders the free half only

**Files:**
- Modify: `web/src/components/CharacterCardShare.tsx`

The 1080×1920 export and the paywall must be the same line **by
construction**, so this component takes `FreeCard` — not
`FreeCard | CharacterCard` — and the type system enforces that no paid
row can reach the share image.

- [ ] **Step 1: Narrow the prop to `FreeCard`**
- [ ] **Step 2: Render clase, punchline, stats and `filas`; nothing else**
- [ ] **Step 3: Verify the PNG export still renders in Fraunces**

The font pipeline is `scripts/build-card-fonts.ts` → `web/src/lib/card-fonts.ts`
and it was hard-won (Addendum 15). Do not change it; just confirm the
export is not blank and the display face is Fraunces.

- [ ] **Step 4: Commit**

```bash
git add web/src/components/CharacterCardShare.tsx
git commit -m "feat: the share image is the free half, enforced by its prop type"
```

---

### Task 11: the preview route reads real birth data

**Files:**
- Modify: `web/src/app/preview/informe/[chart]/page.tsx`

The route renders a fixed Leo/Cáncer/Cáncer placeholder that does not
match the report below it. It must compute the chart from the same birth
data as `scripts/battery-sections.ts:43-46` — **imported or re-derived
from one shared constant, never re-typed**, since every measurement in
HANDOVER is against those three charts.

- [ ] **Step 1: Read the birth data from one place**

Export the three cases from a module both the script and the route can
import, then build the chart with `resolveBirthUtc` + `computeNatalChart`
and pass `characterCard(chart)` to `CharacterCardView`.

- [ ] **Step 2: Verify all three**

Open `/preview/informe/madrid-1992`, `/preview/informe/buenosaires-1985`
and `/preview/informe/bilbao-2000`. Confirm the card matches the report
beneath it, that madrid shows a punto fuerte and no *A favor* heading,
and that bilbao shows a punto débil and no *En contra* heading.

- [ ] **Step 3: Full green**

```bash
npm test && npx tsc --noEmit && npm run example && cd web && npx tsc --noEmit
```

Expected: all green. `npm run example` matters because vitest passing does
not prove the tsx path works (ESM interop).

- [ ] **Step 4: Commit**

```bash
git add web/src/app/preview/informe/
git commit -m "fix: the preview route renders the chart it is previewing"
```

---

## After the plan

Update HANDOVER's *Estado actual* and the phase-2 checklist item, and add
a dated addendum recording what the build measured that the design only
predicted — CLAUDE.md requires both.

Two things that are explicitly **not** in this plan and should not be
smuggled in: the entitlement-gated route (plan 2/3), and any change to a
prompt or generation path.
