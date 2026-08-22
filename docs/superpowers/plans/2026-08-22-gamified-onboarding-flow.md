# Gamified Onboarding Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single four-field birth form with four questions asked
one at a time, each answer paying back something computed and true, ending in
a deliberate 4.5-second reveal and the character card.

**Architecture:** Three new pieces of core logic (a generated sun-sign table
with a cusp guard, the flow's Spanish copy tables, an approximate-Ascendant
flag on the card) plus a decomposition of the 293-line `BirthForm.tsx` into a
`sessionStorage`-backed hook, an extracted place combobox, one component per
question, a reveal dial, and five routes under `/crear`. No LLM call happens
anywhere in the flow.

**Tech Stack:** TypeScript, vitest (node + jsdom via docblock), Next.js 16 App
Router, React 19, `astronomy-engine` (build-time only for the new table).

Spec: `docs/superpowers/specs/2026-08-22-gamified-onboarding-flow-design.md`

## Global Constraints

- **The timezone contract.** `computeNatalChart` takes a UTC instant resolved
  with the HISTORICAL offset. Never convert birth times in the browser.
  `web/src/lib/astro.ts` is `import "server-only"` and stays that way.
- **`src/sunsign.ts` must not import `astronomy-engine`, `src/chart.ts` or
  `src/ephemeris.ts`.** It runs in the browser. Only the generator script
  touches the ephemeris. Violating this puts ~200 KB of ephemeris into the
  landing bundle.
- **Nothing personal in a URL.** Step routes are static paths; every answer
  lives in `sessionStorage`.
- **Epicene Spanish.** Every new user-facing line is second person and must
  pass `copyProblems()` (`src/validate.ts:412`).
- **Zero LLM at render.** Nothing in the flow calls a model.
- **`npm test` must stay green.** Currently **338 tests**. Also
  `npx tsc --noEmit`, `npm run example`, and the `web` typecheck.
- **No test in this repo asserts a class, colour or font.** A green suite is
  not evidence the reveal works. Task 10 is not optional.
- Spanish copy uses `·` as separator and `,` as decimal, matching shipped copy.

---

## ⚠️ Two spec gaps found while planning — read before Task 3

Both concern decision 8 (unknown hour → 12:00, card marks it approximate).
**Task 3 implements exactly what the spec says. These two go beyond it and are
deliberately NOT built here.** Raise with Carlos before executing Task 3.

**Gap 1: `porDentro.area` is as hour-dependent as `seVe`.** The spec marks
only the Ascendant approximate. But `freeCard` sets
`porDentro.area = AREA_CORTA_ES[moon.house]`, and houses are computed entirely
from the hour. With a 12:00 guess the Moon's house is very likely wrong, so the
card would print a confident, wrong life area while carefully hedging the
Ascendant next to it.

**Gap 2: the free prose is built on the Ascendant too.** `chartRuler()` derives
from `chart.angles.ascendant.sign` (`src/profile.ts:69-70`), and
`elementBalance()` adds `ASCENDANT_WEIGHT` to the totals
(`src/profile.ts:102`). So an unknown hour can move the chart ruler and the
dominant element, both of which reach the prose through `selectFeature()`. The
spec does not address the prose at all.

Recommended resolution, for the amendment: when `hourKnown` is false, mark
`porDentro.area` approximate as well, and have `/api/free` skip any feature
whose basis is the Ascendant, the chart ruler, or a house. That is a spec
change and a battery re-run, so it does not belong in this plan.

---

## File Structure

**Core (`src/`)**
- `src/sunsign.ts` — new. `sunSignForDate`. Reads the table, imports nothing heavy.
- `src/sunsign-table.ts` — new, **generated**. 366 entries. Committed.
- `scripts/build-sunsign-table.ts` — new. Regenerates the above.
- `src/copy/flow.es.ts` — new. Every Spanish line the flow says.
- `src/card.ts` — modified. `freeCard(chart, opts?)`, `seVe.approximate`.

**Web (`web/src/`)**
- `hooks/useBirthAnswers.ts` — new. `sessionStorage`-backed answers.
- `components/PlaceCombo.tsx` — new. Extracted from `BirthForm.tsx` unchanged.
- `components/questions/{Nombre,Dia,Hora,Lugar}.tsx` — new, one per step.
- `components/Dial.tsx` — new. The reveal.
- `components/Reading.tsx` — new. Everything currently below the card.
- `app/crear/{nombre,dia,hora,lugar}/page.tsx`, `app/crear/page.tsx` — new.
- `app/page.tsx` — modified. Landing.
- `components/BirthForm.tsx` — deleted at Task 9, once nothing imports it.
- `app/api/chart/route.ts` — modified. Accepts `hourKnown`.

---

### Task 1: The sun-sign table and the cusp guard

The flow names a class at Q2, before any chart exists. This is the machinery
that stops it ever contradicting `computeNatalChart` at Q4.

**Why a generated table rather than a date rule:** the spec's "boundary day ±1"
was an estimate. It is not needed. The Sun's apparent ecliptic longitude
increases monotonically (~0,9856°/day) and never retrogrades, so for a given
calendar date the widest possible UTC window is bounded by two instants — local
midnight at UTC+14 and local 23:59 at UTC−12. If the Sun is in the same sign at
both ends, it is in that sign for every hour and every timezone of that date.
Checking those two endpoints across 1900–2030 gives an exact answer with no
drift heuristic.

**Files:**
- Create: `scripts/build-sunsign-table.ts`
- Create: `src/sunsign-table.ts` (generated by the above)
- Create: `src/sunsign.ts`
- Create: `tests/sunsign.test.ts`

**Interfaces:**
- Consumes: `eclipticLongitude` and `signOf` (existing, `src/ephemeris.ts`,
  `src/zodiac.ts`) — generator only.
- Produces:
  ```ts
  export interface SunSignGuess { sign: Sign | null; certain: boolean }
  export function sunSignForDate(iso: string): SunSignGuess
  export const SUN_SIGN_BY_DAY: Readonly<Record<string, Sign | null>>
  ```
  `iso` is `"YYYY-MM-DD"`. `certain: false` always comes with `sign: null`.

- [ ] **Step 1: Write the generator**

Create `scripts/build-sunsign-table.ts`:

```ts
/**
 * Regenerates src/sunsign-table.ts.
 *
 * For a calendar date with unknown time and unknown timezone, the UTC
 * instant lies between local midnight at UTC+14 and local 23:59 at UTC-12.
 * The Sun's ecliptic longitude increases monotonically, so those two
 * endpoints bound every sign the Sun can be in on that date. A day is
 * "certain" only if every year 1900-2030 agrees on one sign.
 *
 * Run: npx tsx scripts/build-sunsign-table.ts
 */
import { writeFileSync } from "node:fs";
import { eclipticLongitude } from "../src/ephemeris";
import { signOf } from "../src/zodiac";
import type { Sign } from "../src/types";

const FIRST_YEAR = 1900;
const LAST_YEAR = 2030;
const HOUR = 3600_000;

/** Widest UTC bracket for a local calendar date, offsets UTC-12..UTC+14. */
function bracket(year: number, month: number, day: number): [Date, Date] {
  const midnight = Date.UTC(year, month - 1, day, 0, 0, 0);
  const endOfDay = Date.UTC(year, month - 1, day, 23, 59, 0);
  return [new Date(midnight - 14 * HOUR), new Date(endOfDay + 12 * HOUR)];
}

function key(month: number, day: number): string {
  return `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function daysInMonth(month: number): number {
  return [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

const table: Record<string, Sign | null> = {};

for (let month = 1; month <= 12; month++) {
  for (let day = 1; day <= daysInMonth(month); day++) {
    const seen = new Set<Sign>();
    for (let year = FIRST_YEAR; year <= LAST_YEAR; year++) {
      // Feb 29 does not exist in common years.
      if (month === 2 && day === 29 && new Date(Date.UTC(year, 1, 29)).getUTCMonth() !== 1) {
        continue;
      }
      const [start, end] = bracket(year, month, day);
      seen.add(signOf(eclipticLongitude("Sun", start)));
      seen.add(signOf(eclipticLongitude("Sun", end)));
    }
    table[key(month, day)] = seen.size === 1 ? [...seen][0] : null;
  }
}

const guarded = Object.values(table).filter((s) => s === null).length;
const total = Object.keys(table).length;

const body = Object.entries(table)
  .map(([k, v]) => `  "${k}": ${v === null ? "null" : `"${v}"`},`)
  .join("\n");

writeFileSync(
  new URL("../src/sunsign-table.ts", import.meta.url),
  `// GENERATED BY scripts/build-sunsign-table.ts — DO NOT EDIT BY HAND.
//
// null means the Sun changes sign somewhere inside that calendar date for at
// least one year in ${FIRST_YEAR}-${LAST_YEAR}, across UTC-12..UTC+14. The
// flow must not name a class on those days.
//
// Guarded days: ${guarded} of ${total}.
import type { Sign } from "./types";

export const SUN_SIGN_BY_DAY: Readonly<Record<string, Sign | null>> = {
${body}
};
`,
);

console.log(`wrote src/sunsign-table.ts — ${guarded}/${total} days guarded`);
```

- [ ] **Step 2: Run the generator and record the real number**

```bash
npx tsx scripts/build-sunsign-table.ts
```

Expected: writes the file and prints a guarded count. The spec estimated ~36 of
366 (~10%). **Record the actual number in the commit message** — it replaces an
estimate with a measurement, which is the house style.

- [ ] **Step 3: Write the failing test**

Create `tests/sunsign.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { sunSignForDate } from "../src/sunsign";
import { computeNatalChart } from "../src/chart";
import { SUN_SIGN_BY_DAY } from "../src/sunsign-table";
import type { Sign } from "../src/types";

/** The Sun's sign from a real chart at a given UTC instant. */
function sunSignAt(utc: Date): Sign {
  const chart = computeNatalChart({ utc, latitude: 43.26, longitude: -2.93 });
  return chart.planets.find((p) => p.body === "Sun")!.sign;
}

describe("sunSignForDate", () => {
  it("names a sign on a day that is safely mid-sign", () => {
    expect(sunSignForDate("2000-07-28")).toEqual({ sign: "Leo", certain: true });
  });

  it("returns no sign when the day is not certain", () => {
    const guarded = Object.entries(SUN_SIGN_BY_DAY).find(([, v]) => v === null)!;
    const [key] = guarded;
    expect(sunSignForDate(`2000-${key}`)).toEqual({ sign: null, certain: false });
  });

  it("rejects a malformed date rather than guessing", () => {
    expect(sunSignForDate("nonsense")).toEqual({ sign: null, certain: false });
  });

  // THE PROPERTY THAT MATTERS. If this fails, the flow can announce ARTISTA
  // and then hand back a card reading CONFIDENTE.
  it("never disagrees with computeNatalChart when it claims certainty", () => {
    const disagreements: string[] = [];
    for (let year = 1900; year <= 2030; year += 7) {
      for (let month = 1; month <= 12; month++) {
        for (const day of [1, 9, 17, 21, 22, 23, 24, 28]) {
          const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const guess = sunSignForDate(iso);
          if (!guess.certain) continue;
          // Every hour the widest bracket allows: UTC-12 .. UTC+14.
          for (const offset of [-12, -5, 0, 5.5, 9, 14]) {
            const utc = new Date(Date.UTC(year, month - 1, day, 12, 0) - offset * 3600_000);
            const actual = sunSignAt(utc);
            if (actual !== guess.sign) disagreements.push(`${iso} @${offset}: ${guess.sign} vs ${actual}`);
          }
        }
      }
    }
    expect(disagreements).toEqual([]);
  });

  it("covers every calendar day including 29 February", () => {
    expect(Object.keys(SUN_SIGN_BY_DAY)).toHaveLength(366);
    expect(SUN_SIGN_BY_DAY["02-29"]).toBeDefined();
  });
});
```

- [ ] **Step 4: Run it and watch it fail**

```bash
npx vitest run tests/sunsign.test.ts
```

Expected: FAIL — `Cannot find module '../src/sunsign'`.

- [ ] **Step 5: Write `src/sunsign.ts`**

```ts
import type { Sign } from "./types";
import { SUN_SIGN_BY_DAY } from "./sunsign-table";

export interface SunSignGuess {
  sign: Sign | null;
  certain: boolean;
}

/**
 * The Sun's sign for a birth DATE alone, before the hour or the place are
 * known — so the flow can name a class at question 2.
 *
 * Returns `certain: false` on days where the Sun changes sign for some year
 * or some timezone. On those days the caller MUST NOT name a sign: the whole
 * point is that this can never contradict computeNatalChart later.
 *
 * Deliberately imports no ephemeris. This runs in the browser.
 */
export function sunSignForDate(iso: string): SunSignGuess {
  const m = /^\d{4}-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return { sign: null, certain: false };
  const sign = SUN_SIGN_BY_DAY[`${m[1]}-${m[2]}`];
  return sign ? { sign, certain: true } : { sign: null, certain: false };
}
```

- [ ] **Step 6: Run the tests**

```bash
npx vitest run tests/sunsign.test.ts && npm test
```

Expected: the new file passes and the suite is still green (338 + new).

- [ ] **Step 7: Assert the bundle constraint**

```bash
grep -nE "astronomy-engine|ephemeris|from \"\./chart\"" src/sunsign.ts && echo "VIOLATION" || echo "clean"
```

Expected: `clean`. If it prints VIOLATION the table is being computed at
runtime and the landing bundle just grew by the whole ephemeris.

- [ ] **Step 8: Commit**

```bash
git add scripts/build-sunsign-table.ts src/sunsign-table.ts src/sunsign.ts tests/sunsign.test.ts
git commit -m "feat(flow): sun sign from a date alone, with a cusp guard"
```

---

### Task 2: The flow's copy tables

**Files:**
- Create: `src/copy/flow.es.ts`
- Modify: `tests/copy.test.ts`

**Interfaces:**
- Consumes: `Sign` (`src/types.ts`), `copyProblems` (`src/validate.ts:412`).
- Produces:
  ```ts
  export const NOMBRE_ES: { conNombre: string; sinNombre: string }
  export const CLASE_REACCION_ES: Record<Sign, string>
  export const CUSPIDE_ES: string
  export interface HourBucket { untilHour: number; linea: string }
  export const HORA_ES: HourBucket[]           // ascending untilHour, last is 24
  export function horaReaccion(time: string): string
  export const DIAL_ES: readonly string[]      // 6 lines, {coords} {ciudad} {fecha}
  export const HORA_DESCONOCIDA_ES: string
  export const ERRORES_ES: Record<"lugarVacio"|"conexion"|"datos"|"lectura", string>
  ```

All copy below is a **draft that reads correctly**. Carlos may replace the
strings; the table shapes are the deliverable.

- [ ] **Step 1: Write the failing test**

Append to `tests/copy.test.ts`:

```ts
import {
  CLASE_REACCION_ES, HORA_ES, DIAL_ES, NOMBRE_ES, CUSPIDE_ES,
  HORA_DESCONOCIDA_ES, ERRORES_ES, horaReaccion,
} from "../src/copy/flow.es";
import { SIGNS } from "../src/zodiac";
import { copyProblems } from "../src/validate";

describe("flow copy", () => {
  it("has a reaction for all twelve classes", () => {
    for (const sign of SIGNS) expect(CLASE_REACCION_ES[sign]?.length).toBeGreaterThan(0);
    expect(Object.keys(CLASE_REACCION_ES)).toHaveLength(12);
  });

  it("covers the whole clock with ascending buckets ending at 24", () => {
    const hours = HORA_ES.map((b) => b.untilHour);
    expect([...hours].sort((a, b) => a - b)).toEqual(hours);
    expect(hours.at(-1)).toBe(24);
  });

  it("maps a time to a bucket", () => {
    expect(horaReaccion("22:45")).toBe(HORA_ES.at(-1)!.linea);
    expect(horaReaccion("03:10")).toBe(HORA_ES[0].linea);
  });

  it("has six dial lines", () => {
    expect(DIAL_ES).toHaveLength(6);
  });

  // The epicene rule. These are second-person Spanish, which is exactly where
  // gendered participles get in.
  it("is free of gendered and jargon copy", () => {
    const all = [
      ...Object.values(CLASE_REACCION_ES), ...HORA_ES.map((b) => b.linea),
      ...DIAL_ES, ...Object.values(ERRORES_ES), ...Object.values(NOMBRE_ES),
      CUSPIDE_ES, HORA_DESCONOCIDA_ES,
    ];
    const bad = all.flatMap((line) => copyProblems(line).map((p) => `${line} → ${p}`));
    expect(bad).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
npx vitest run tests/copy.test.ts
```

Expected: FAIL — `Cannot find module '../src/copy/flow.es'`.

- [ ] **Step 3: Write `src/copy/flow.es.ts`**

```ts
import type { Sign } from "../types";

/**
 * Everything the onboarding flow says back. All of it is static: the flow
 * makes no LLM call, which is what makes these lines safe to write at all.
 *
 * Second person, epicene by construction — tests/copy.test.ts gates it with
 * copyProblems().
 */

export const NOMBRE_ES = {
  conNombre: "Vale, {nombre}. Vamos a ver quién eres.",
  sinNombre: "Sin nombre, entonces. Igual funciona.",
};

/** Shown under the class name at question 2. */
export const CLASE_REACCION_ES: Record<Sign, string> = {
  Aries: "Vas primero y preguntas después.",
  Taurus: "Lo que construyes, aguanta.",
  Gemini: "Cambias de idea porque se te ocurren más.",
  Cancer: "La gente te cuenta cosas que no cuenta.",
  Leo: "Ocupas el sitio en el que te ponen.",
  Virgo: "Ves el fallo antes que nadie.",
  Libra: "Sostienes lo que a otros se les cae.",
  Scorpio: "Miras hasta el fondo y no apartas la vista.",
  Sagittarius: "Te vas lejos y vuelves con algo.",
  Capricorn: "Juegas a largo y ganas tarde.",
  Aquarius: "No te vale porque sí.",
  Pisces: "Te enteras de cosas que nadie ha dicho.",
};

/** Days where the Sun changes sign: the class reveal waits for the chart. */
export const CUSPIDE_ES =
  "Ese día el Sol estaba cambiando de signo. Tu hora decide de qué lado caes.";

export interface HourBucket {
  /** Exclusive upper bound, 0-24. */
  untilHour: number;
  linea: string;
}

export const HORA_ES: HourBucket[] = [
  { untilHour: 6, linea: "De madrugada. El cielo estaba en su punto más callado." },
  { untilHour: 9, linea: "Al amanecer. El horizonte se movía deprisa esa hora." },
  { untilHour: 13, linea: "Por la mañana. El Sol subiendo por el lado que se ve." },
  { untilHour: 17, linea: "Con el Sol arriba. La parte más pública del cielo." },
  { untilHour: 21, linea: "Por la tarde. El cielo empezando a darse la vuelta." },
  { untilHour: 24, linea: "Casi de noche. Eso empuja tu Ascendente al otro extremo." },
];

/** "HH:MM" → the line for its bucket. Out-of-range input gets the last bucket. */
export function horaReaccion(time: string): string {
  const hour = Number(time.slice(0, 2));
  const bucket = HORA_ES.find((b) => hour < b.untilHour);
  return (bucket ?? HORA_ES[HORA_ES.length - 1]).linea;
}

/**
 * The reveal. {coords}, {ciudad} and {fecha} are filled from the person's own
 * answers — a bar that echoes back your city reads as real computation.
 *
 * Every line names something that genuinely runs. Do not add invented stats
 * (spec decision 7).
 */
export const DIAL_ES: readonly string[] = [
  "Fijando tus coordenadas: {coords}",
  "Comprobando qué hora era de verdad en {ciudad} el {fecha}",
  "Calculando las posiciones de los planetas",
  "Levantando las doce casas",
  "Midiendo los ángulos entre ellos",
  "Comparando tus elementos con 8.000 cartas",
];

/** Printed on the card when the hour was skipped (spec decision 8). */
export const HORA_DESCONOCIDA_ES =
  "Sin la hora exacta no podemos fijar esto. Está en tu partida de nacimiento.";

export const ERRORES_ES = {
  lugarVacio: "No encontramos ese sitio. Prueba con el municipio más cercano.",
  conexion: "No hemos podido conectar. Inténtalo otra vez.",
  datos: "Hay algo que no cuadra en ese dato.",
  lectura: "La lectura no ha llegado. Tu carta está bien, solo falta el texto.",
};
```

- [ ] **Step 4: Run the tests**

```bash
npx vitest run tests/copy.test.ts
```

Expected: PASS. If the epicene test fails, `copyProblems` has caught a real
gendered form — fix the line, do not weaken the test.

- [ ] **Step 5: Commit**

```bash
git add src/copy/flow.es.ts tests/copy.test.ts
git commit -m "feat(flow): the onboarding copy tables, gated epicene"
```

---

### Task 3: The approximate Ascendant

**Read the two spec gaps at the top of this plan before starting.** This task
implements decision 8 exactly as written and no further.

**Files:**
- Modify: `src/card.ts`
- Modify: `web/src/app/api/chart/route.ts`
- Modify: `tests/card.test.ts`

**Interfaces:**
- Consumes: `FreeCard` (existing).
- Produces:
  ```ts
  export interface FreeCardOptions { hourKnown?: boolean }   // default true
  export function freeCard(chart: NatalChart, opts?: FreeCardOptions): FreeCard
  // FreeCard.seVe gains: approximate: boolean
  ```
  `/api/chart` accepts an optional `hourKnown: boolean` in its JSON body.

- [ ] **Step 1: Write the failing test**

Append to `tests/card.test.ts` (it already builds a chart fixture — reuse
whatever the file names it; the variable below is `chart`):

```ts
describe("freeCard hourKnown", () => {
  it("marks the Ascendant exact by default", () => {
    expect(freeCard(chart).seVe.approximate).toBe(false);
  });

  it("marks the Ascendant approximate when the hour was skipped", () => {
    expect(freeCard(chart, { hourKnown: false }).seVe.approximate).toBe(true);
  });

  it("still returns a sign, so the card has something to render", () => {
    const card = freeCard(chart, { hourKnown: false });
    expect(card.seVe.sign).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
npx vitest run tests/card.test.ts
```

Expected: FAIL — `approximate` is undefined.

- [ ] **Step 3: Change `src/card.ts`**

Change the `FreeCard` interface:

```ts
  seVe: { sign: Sign; signDegree: number; gloss: string; approximate: boolean };
```

Add above `freeCard`:

```ts
export interface FreeCardOptions {
  /**
   * False when the person skipped the birth hour and 12:00 was assumed.
   * The Ascendant is then a guess, and the card says so rather than
   * printing it as fact.
   */
  hourKnown?: boolean;
}
```

Change the signature and the `seVe` block:

```ts
export function freeCard(chart: NatalChart, opts: FreeCardOptions = {}): FreeCard {
```

```ts
    seVe: {
      sign: asc.sign, signDegree: asc.signDegree, gloss: ASC_ES[asc.sign],
      approximate: opts.hourKnown === false,
    },
```

- [ ] **Step 4: Run the tests**

```bash
npx vitest run tests/card.test.ts && npm test
```

Expected: PASS. Other suites may fail to typecheck against the widened
`FreeCard` — fix their fixtures by adding `approximate: false`.

- [ ] **Step 5: Thread it through `/api/chart`**

In `web/src/app/api/chart/route.ts`, change the destructure and the card call:

```ts
  const { date, time, latitude, longitude, hourKnown } = await req.json();
```

```ts
    card: freeCard(chart, { hourKnown: hourKnown !== false }),
```

`hourKnown !== false` means an absent field is treated as a known hour, which
keeps every existing caller working unchanged.

- [ ] **Step 6: Typecheck both projects**

```bash
npx tsc --noEmit && cd web && npx tsc --noEmit; cd ..
```

Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src/card.ts tests/card.test.ts web/src/app/api/chart/route.ts web/tests
git commit -m "feat(card): mark the Ascendant approximate when the hour is unknown"
```

---

### Task 4: The answers hook

**Files:**
- Create: `web/src/hooks/useBirthAnswers.ts`
- Create: `web/tests/use-birth-answers.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  export interface BirthAnswers {
    firstName?: string; date?: string; time?: string;
    hourKnown?: boolean; place?: Place;
  }
  export interface Place {
    name: string; region: string; countryCode: string;
    latitude: number; longitude: number;
  }
  export function useBirthAnswers(): {
    answers: BirthAnswers;
    set: (patch: Partial<BirthAnswers>) => void;
    clear: () => void;
    ready: boolean;   // false during the first render, before storage is read
  }
  export const STORAGE_KEY = "destiny.answers";
  ```

`Place` moves here from `BirthForm.tsx` and becomes the shared definition.

- [ ] **Step 1: Write the failing test**

Create `web/tests/use-birth-answers.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBirthAnswers, STORAGE_KEY } from "@/hooks/useBirthAnswers";

beforeEach(() => sessionStorage.clear());

describe("useBirthAnswers", () => {
  it("starts empty and becomes ready", () => {
    const { result } = renderHook(() => useBirthAnswers());
    expect(result.current.answers).toEqual({});
    expect(result.current.ready).toBe(true);
  });

  it("persists a patch to sessionStorage", () => {
    const { result } = renderHook(() => useBirthAnswers());
    act(() => result.current.set({ firstName: "Carlos" }));
    expect(result.current.answers.firstName).toBe("Carlos");
    expect(JSON.parse(sessionStorage.getItem(STORAGE_KEY)!).firstName).toBe("Carlos");
  });

  it("merges patches rather than replacing", () => {
    const { result } = renderHook(() => useBirthAnswers());
    act(() => result.current.set({ firstName: "Carlos" }));
    act(() => result.current.set({ date: "2000-07-28" }));
    expect(result.current.answers).toEqual({ firstName: "Carlos", date: "2000-07-28" });
  });

  // This is what makes browser-back restore the previous answer.
  it("rehydrates from storage on a fresh mount", () => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ date: "1992-03-04" }));
    const { result } = renderHook(() => useBirthAnswers());
    expect(result.current.answers.date).toBe("1992-03-04");
  });

  it("survives corrupt storage rather than throwing", () => {
    sessionStorage.setItem(STORAGE_KEY, "{ not json");
    const { result } = renderHook(() => useBirthAnswers());
    expect(result.current.answers).toEqual({});
  });

  it("clears everything", () => {
    const { result } = renderHook(() => useBirthAnswers());
    act(() => result.current.set({ firstName: "Carlos" }));
    act(() => result.current.clear());
    expect(result.current.answers).toEqual({});
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
npx vitest run web/tests/use-birth-answers.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the hook**

Create `web/src/hooks/useBirthAnswers.ts`:

```ts
"use client";

import { useCallback, useEffect, useState } from "react";

export interface Place {
  name: string;
  region: string;
  countryCode: string;
  latitude: number;
  longitude: number;
}

export interface BirthAnswers {
  firstName?: string;
  date?: string;
  time?: string;
  /** False when the person skipped the hour and 12:00 was assumed. */
  hourKnown?: boolean;
  place?: Place;
}

export const STORAGE_KEY = "destiny.answers";

function read(): BirthAnswers {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as BirthAnswers) : {};
  } catch {
    // Corrupt or unavailable storage must not wall someone out of the flow.
    return {};
  }
}

/**
 * The four answers, kept in sessionStorage.
 *
 * Storage is what makes the browser's back button work as the flow's back
 * (spec decision 5): each step route reads the same object, so returning to
 * an earlier question finds its answer still there.
 *
 * sessionStorage, not localStorage: birth data should not outlive the tab.
 * Nothing personal ever goes in the URL.
 */
export function useBirthAnswers() {
  const [answers, setAnswers] = useState<BirthAnswers>({});
  const [ready, setReady] = useState(false);

  // Storage is not available during SSR, so the first render is always empty.
  useEffect(() => {
    setAnswers(read());
    setReady(true);
  }, []);

  const set = useCallback((patch: Partial<BirthAnswers>) => {
    setAnswers((prev) => {
      const next = { ...prev, ...patch };
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Private-mode quota. The flow still works for this session.
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* nothing to do */
    }
    setAnswers({});
  }, []);

  return { answers, set, clear, ready };
}
```

- [ ] **Step 4: Run the tests**

```bash
npx vitest run web/tests/use-birth-answers.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/hooks/useBirthAnswers.ts web/tests/use-birth-answers.test.tsx
git commit -m "feat(flow): sessionStorage-backed birth answers"
```

---

### Task 5: Extract the place combobox

Pure refactor. `BirthForm.tsx` keeps working and keeps its tests; the combobox
moves out so a question screen can use it.

**Files:**
- Create: `web/src/components/PlaceCombo.tsx`
- Modify: `web/src/components/BirthForm.tsx`
- Create: `web/tests/place-combo.test.tsx`

**Interfaces:**
- Consumes: `Place` from `@/hooks/useBirthAnswers` (Task 4).
- Produces:
  ```ts
  export function PlaceCombo(props: {
    value: string;
    onQueryChange: (q: string) => void;
    onChoose: (p: Place) => void;
    onEmpty?: () => void;      // fired when a lookup returns nothing
    id?: string;               // defaults to "lugar"
  }): JSX.Element
  ```

- [ ] **Step 1: Add the test-only dependency**

`userEvent` is not installed yet, and the next step imports it. Install it
first, or the red step fails on a missing module instead of on the missing
component — which proves nothing.

```bash
cd web && npm i -D @testing-library/user-event && cd ..
```

- [ ] **Step 2: Write the failing test**

Create `web/tests/place-combo.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlaceCombo } from "@/components/PlaceCombo";

afterEach(cleanup);
beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async () => ({
    ok: true,
    json: async () => [
      { name: "Bilbao", region: "País Vasco", countryCode: "ES", latitude: 43.26, longitude: -2.93 },
    ],
  })));
});

describe("PlaceCombo", () => {
  it("is a combobox", () => {
    render(<PlaceCombo value="" onQueryChange={() => {}} onChoose={() => {}} />);
    expect(screen.getByRole("combobox")).toBeTruthy();
  });

  it("hands the chosen place to onChoose", async () => {
    const onChoose = vi.fn();
    const user = userEvent.setup();
    render(<PlaceCombo value="Bil" onQueryChange={() => {}} onChoose={onChoose} />);
    await waitFor(() => screen.getByRole("option"));
    await user.click(screen.getByRole("option"));
    expect(onChoose).toHaveBeenCalledWith(expect.objectContaining({ name: "Bilbao" }));
  });
});
```

- [ ] **Step 3: Run it and watch it fail**

```bash
npx vitest run web/tests/place-combo.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 4: Create `PlaceCombo.tsx`**

Move, verbatim, from `BirthForm.tsx`: the `Place` import (now from the hook),
the debounced `useEffect` lookup at lines 33-52, the click-outside `useEffect`
at 54-60, `choose` at 62-67, `onPlaceKeyDown` at 69-83, and the JSX from the
`div.field.combo` through its closing tag (lines 199-238). Keep every
`aria-*` attribute, the 180 ms debounce, the arrow-key handling and the hint
text exactly as they are — this task changes no behaviour.

Two changes only: the component owns `query` through props (`value`,
`onQueryChange`) instead of parent state, and it calls `props.onEmpty?.()` when
a lookup returns an empty array.

- [ ] **Step 5: Rewire `BirthForm.tsx` to use it**

Delete the moved code and render `<PlaceCombo …/>` in its place, keeping the
existing `query`/`place` state in `BirthForm`.

- [ ] **Step 6: Run the whole suite**

```bash
npm test && cd web && npx tsc --noEmit; cd ..
```

Expected: green, including the existing `BirthForm` behaviour.

- [ ] **Step 7: Commit**

```bash
git add web/src/components/PlaceCombo.tsx web/src/components/BirthForm.tsx web/tests/place-combo.test.tsx web/package.json web/package-lock.json
git commit -m "refactor(flow): extract PlaceCombo from BirthForm, no behaviour change"
```

---

### Task 6: The four question screens and their routes

**Files:**
- Create: `web/src/components/questions/Nombre.tsx`, `Dia.tsx`, `Hora.tsx`, `Lugar.tsx`
- Create: `web/src/app/crear/nombre/page.tsx`, `dia/page.tsx`, `hora/page.tsx`, `lugar/page.tsx`
- Create: `web/src/components/questions/StepGuard.tsx`
- Create: `web/tests/questions.test.tsx`

**Interfaces:**
- Consumes: `useBirthAnswers`, `Place` (Task 4); `PlaceCombo` (Task 5);
  `sunSignForDate` (Task 1); `CLASE_REACCION_ES`, `CUSPIDE_ES`, `NOMBRE_ES`,
  `horaReaccion` (Task 2); `CLASS_ES` from `@core/copy/classes.es`.
- Produces: each question component takes `{ onNext: () => void }` and writes
  its own answer through the hook. `StepGuard` redirects to `/crear/nombre`
  when a required earlier answer is missing.

- [ ] **Step 1: Write the failing test**

Create `web/tests/questions.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Dia } from "@/components/questions/Dia";
import { Hora } from "@/components/questions/Hora";
import { STORAGE_KEY } from "@/hooks/useBirthAnswers";

afterEach(cleanup);
beforeEach(() => sessionStorage.clear());

describe("Dia", () => {
  it("names the class on a certain day", async () => {
    const user = userEvent.setup();
    render(<Dia onNext={() => {}} />);
    await user.type(screen.getByLabelText(/día/i), "2000-07-28");
    await user.click(screen.getByRole("button", { name: /siguiente/i }));
    expect(screen.getByText("ARTISTA")).toBeTruthy();
  });

  // The cusp guard, at the surface. It must not name a class here.
  it("says the Sun was changing sign on a guarded day", async () => {
    const user = userEvent.setup();
    render(<Dia onNext={() => {}} />);
    await user.type(screen.getByLabelText(/día/i), "2000-07-22");
    await user.click(screen.getByRole("button", { name: /siguiente/i }));
    expect(screen.queryByText("ARTISTA")).toBeNull();
    expect(screen.getByText(/cambiando de signo/i)).toBeTruthy();
  });

  it("stores the date", async () => {
    const user = userEvent.setup();
    render(<Dia onNext={() => {}} />);
    await user.type(screen.getByLabelText(/día/i), "2000-07-28");
    await user.click(screen.getByRole("button", { name: /siguiente/i }));
    expect(JSON.parse(sessionStorage.getItem(STORAGE_KEY)!).date).toBe("2000-07-28");
  });
});

describe("Hora", () => {
  it("records hourKnown false and 12:00 when the hour is skipped", async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(<Hora onNext={onNext} />);
    await user.click(screen.getByRole("button", { name: /no la sé/i }));
    const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY)!);
    expect(stored.time).toBe("12:00");
    expect(stored.hourKnown).toBe(false);
    expect(onNext).toHaveBeenCalled();
  });

  it("records hourKnown true for a given hour", async () => {
    const user = userEvent.setup();
    render(<Hora onNext={() => {}} />);
    await user.type(screen.getByLabelText(/hora/i), "22:45");
    await user.click(screen.getByRole("button", { name: /siguiente/i }));
    const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY)!);
    expect(stored.hourKnown).toBe(true);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
npx vitest run web/tests/questions.test.tsx
```

Expected: FAIL — modules not found.

- [ ] **Step 3: Write `Dia.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useBirthAnswers } from "@/hooks/useBirthAnswers";
import { sunSignForDate } from "@core/sunsign";
import { CLASS_ES } from "@core/copy/classes.es";
import { CLASE_REACCION_ES, CUSPIDE_ES } from "@core/copy/flow.es";

/**
 * Question 2. The reward is the CLASS, not the sign (spec decision 3) —
 * CLASS_ES already ships, so Leo arrives as ARTISTA.
 *
 * On a guarded day sunSignForDate returns certain:false and this MUST NOT
 * name a class: the reveal would otherwise contradict the card 20 seconds
 * later. The cusp line is the honest alternative and it reads as suspense.
 */
export function Dia({ onNext }: { onNext: () => void }) {
  const { answers, set } = useBirthAnswers();
  const [date, setDate] = useState(answers.date ?? "");
  const [shown, setShown] = useState(false);

  const guess = shown ? sunSignForDate(date) : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    set({ date });
    setShown(true);
  }

  return (
    <form onSubmit={submit} noValidate>
      <label htmlFor="dia">¿Qué día naciste?</label>
      <input id="dia" type="date" min="1900-01-01" max="2030-12-31"
             value={date} onChange={(e) => setDate(e.target.value)} />

      {guess && (
        <div className="reaccion" aria-live="polite">
          {guess.certain && guess.sign ? (
            <>
              <p className="reaccion__clase">{CLASS_ES[guess.sign]}</p>
              <p>{CLASE_REACCION_ES[guess.sign]}</p>
            </>
          ) : (
            <p>{CUSPIDE_ES}</p>
          )}
        </div>
      )}

      {shown
        ? <button type="button" onClick={onNext}>Seguir</button>
        : <button type="submit">Siguiente</button>}
    </form>
  );
}
```

- [ ] **Step 4: Write `Hora.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useBirthAnswers } from "@/hooks/useBirthAnswers";
import { horaReaccion } from "@core/copy/flow.es";

/**
 * Question 3. The escape link is spec decision 8: an unknown hour is
 * answerable, 12:00 is assumed, and the CARD says so rather than printing a
 * possibly-wrong Ascendant as fact.
 */
export function Hora({ onNext }: { onNext: () => void }) {
  const { answers, set } = useBirthAnswers();
  const [time, setTime] = useState(answers.time ?? "");
  const [linea, setLinea] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{2}:\d{2}$/.test(time)) return;
    set({ time, hourKnown: true });
    setLinea(horaReaccion(time));
  }

  function skip() {
    set({ time: "12:00", hourKnown: false });
    onNext();
  }

  return (
    <form onSubmit={submit} noValidate>
      <label htmlFor="hora">¿A qué hora naciste?</label>
      <input id="hora" type="time" value={time}
             onChange={(e) => setTime(e.target.value)} />

      {linea && <p className="reaccion" aria-live="polite">{linea}</p>}

      {linea
        ? <button type="button" onClick={onNext}>Seguir</button>
        : <button type="submit">Siguiente</button>}

      <button type="button" className="escape" onClick={skip}>
        No la sé exacta
      </button>
    </form>
  );
}
```

- [ ] **Step 5: Write `Nombre.tsx` and `Lugar.tsx`**

`Nombre.tsx` follows `Dia.tsx`'s shape: a text input, `set({ firstName })` on
submit, `NOMBRE_ES.conNombre` with `{nombre}` replaced as the reaction, and an
escape button reading "Prefiero no decirlo" that sets nothing and shows
`NOMBRE_ES.sinNombre`.

`Lugar.tsx` renders `<PlaceCombo>` and, per spec, has **no inline reaction**
and does not auto-advance on choosing. Its button is the commit:

```tsx
<button type="button" disabled={!place} onClick={() => { set({ place }); onNext(); }}>
  Crear mi carta
</button>
```

- [ ] **Step 6: Write `StepGuard.tsx` and the four routes**

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useBirthAnswers, type BirthAnswers } from "@/hooks/useBirthAnswers";

/**
 * Deep-linking to a step with nothing in storage sends you back to the start
 * (spec decision 5). Waits for `ready` — storage is unreadable during SSR and
 * on the first client render, so guarding before then would bounce everyone.
 */
export function StepGuard({ needs, children }: {
  needs: (keyof BirthAnswers)[];
  children: React.ReactNode;
}) {
  const { answers, ready } = useBirthAnswers();
  const router = useRouter();

  useEffect(() => {
    if (ready && needs.some((k) => answers[k] === undefined)) {
      router.replace("/crear/nombre");
    }
  }, [ready, answers, needs, router]);

  if (!ready) return null;
  return <>{children}</>;
}
```

Each route is thin. `web/src/app/crear/hora/page.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { StepGuard } from "@/components/questions/StepGuard";
import { Hora } from "@/components/questions/Hora";

export default function Page() {
  const router = useRouter();
  return (
    <StepGuard needs={["date"]}>
      <Hora onNext={() => router.push("/crear/lugar")} />
    </StepGuard>
  );
}
```

`nombre` guards nothing, `dia` needs `[]` (the name is skippable, so nothing is
required), `hora` needs `["date"]`, `lugar` needs `["date", "time"]`.

- [ ] **Step 7: Run the tests**

```bash
npx vitest run web/tests/questions.test.tsx && npm test
```

Expected: PASS. If the cusp test fails because `2000-07-22` turns out to be
certain, pick a guarded key from `SUN_SIGN_BY_DAY` and use that instead — the
generated table is the authority, not the date in this plan.

- [ ] **Step 8: Commit**

```bash
git add web/src/components/questions web/src/app/crear web/tests/questions.test.tsx
git commit -m "feat(flow): four question screens, one route each"
```

---

### Task 7: The dial

**Files:**
- Create: `web/src/components/Dial.tsx`
- Create: `web/tests/dial.test.tsx`

**Interfaces:**
- Consumes: `DIAL_ES` (Task 2).
- Produces:
  ```ts
  export const DIAL_FLOOR_MS = 4500;
  export const DIAL_LINE_MS = 750;
  export function Dial(props: {
    coords: string; ciudad: string; fecha: string;
  }): JSX.Element
  ```
  `Dial` renders lines only. The *timing* of what happens after the floor is
  Task 8's job — this component owns no fetch.

- [ ] **Step 1: Write the failing test**

Create `web/tests/dial.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, act } from "@testing-library/react";
import { Dial, DIAL_LINE_MS } from "@/components/Dial";

afterEach(() => { cleanup(); vi.useRealTimers(); });

const props = { coords: "43,26° N · 2,93° O", ciudad: "Bilbao", fecha: "28 de julio de 2000" };

describe("Dial", () => {
  it("fills the first line with the person's own data", () => {
    render(<Dial {...props} />);
    expect(screen.getByText(/43,26° N · 2,93° O/)).toBeTruthy();
  });

  it("advances to the next line", () => {
    vi.useFakeTimers();
    render(<Dial {...props} />);
    act(() => { vi.advanceTimersByTime(DIAL_LINE_MS + 10); });
    expect(screen.getByText(/Bilbao/)).toBeTruthy();
    expect(screen.getByText(/28 de julio de 2000/)).toBeTruthy();
  });

  // Holding, not looping: it really is still working, so holding is honest.
  it("holds the last line rather than looping", () => {
    vi.useFakeTimers();
    render(<Dial {...props} />);
    act(() => { vi.advanceTimersByTime(DIAL_LINE_MS * 20); });
    expect(screen.getByText(/8\.000 cartas/)).toBeTruthy();
    expect(screen.queryByText(/43,26/)).toBeNull();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
npx vitest run web/tests/dial.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write `Dial.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { DIAL_ES } from "@core/copy/flow.es";

export const DIAL_FLOOR_MS = 4500;
export const DIAL_LINE_MS = 750;

/**
 * The reveal (spec decision 6). This is a DELIBERATE wait, not a spinner
 * waiting on the network: /api/chart returns in ~80ms. A future session must
 * not "simplify" it back to an instant render — the wait is what makes the
 * 9,90 € feel earned, and it also pushes the prose skeleton below the fold.
 *
 * Six lines at 750ms = the 4.5s floor. If the network runs long the last line
 * HOLDS rather than the sequence looping: it really is still working.
 */
export function Dial({ coords, ciudad, fecha }: {
  coords: string; ciudad: string; fecha: string;
}) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (i >= DIAL_ES.length - 1) return;
    const id = setTimeout(() => setI((n) => n + 1), DIAL_LINE_MS);
    return () => clearTimeout(id);
  }, [i]);

  const linea = DIAL_ES[i]
    .replace("{coords}", coords)
    .replace("{ciudad}", ciudad)
    .replace("{fecha}", fecha);

  return (
    <div className="dial">
      <div className="dial__aro latido" aria-hidden="true" />
      <p className="dial__linea" aria-live="polite">{linea}</p>
    </div>
  );
}
```

- [ ] **Step 4: Add the styles**

In `web/src/app/globals.css`, next to the existing `clay-latido` keyframes, add
a `.dial__aro` rule and reuse the shipped `.latido` class. The
`@media (prefers-reduced-motion: reduce)` block already neutralises `.latido`
— confirm `.dial__aro` inherits that and add no new animation outside it.

- [ ] **Step 5: Run the tests**

```bash
npx vitest run web/tests/dial.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add web/src/components/Dial.tsx web/tests/dial.test.tsx web/src/app/globals.css
git commit -m "feat(flow): the reveal dial, floor 4.5s, last line holds"
```

---

### Task 8: The reveal route

**Files:**
- Create: `web/src/app/crear/page.tsx`
- Create: `web/src/components/Reveal.tsx`
- Create: `web/src/components/Reading.tsx`
- Create: `web/tests/reveal.test.tsx`

**Interfaces:**
- Consumes: everything above, plus `ChartResponse` and `FreeReading`
  (`web/src/components/types.ts`).
- Produces: `Reveal` orchestrates both fetches and the floor. `Reading` renders
  the card and the three modules — lifted verbatim out of `BirthForm.tsx`
  lines 246-292, including the comment about love sitting second.

**Timing contract:**

```
t=0      both fetches fire
t=4.5s   floor elapsed AND chart present → card
t=12s    chart still absent → error (the cap applies to /api/chart only)
         /api/free keeps running under a finished card, with no cap
```

- [ ] **Step 1: Write the failing test**

Create `web/tests/reveal.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, act, waitFor } from "@testing-library/react";
import { Reveal } from "@/components/Reveal";
import { STORAGE_KEY } from "@/hooks/useBirthAnswers";

afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

const answers = {
  firstName: "Carlos", date: "2000-07-28", time: "22:45", hourKnown: true,
  place: { name: "Bilbao", region: "País Vasco", countryCode: "ES", latitude: 43.26, longitude: -2.93 },
};

beforeEach(() => {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
});

describe("Reveal", () => {
  it("shows the dial and not the card before the floor", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({}) })));
    render(<Reveal />);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByText(/Fijando tus coordenadas/)).toBeTruthy();
  });

  it("sends hourKnown to /api/chart", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({}) }));
    vi.stubGlobal("fetch", fetchMock);
    render(<Reveal />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.hourKnown).toBe(true);
    expect(body.latitude).toBe(43.26);
  });

  it("never puts an answer in the URL", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({}) }));
    vi.stubGlobal("fetch", fetchMock);
    render(<Reveal />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    for (const call of fetchMock.mock.calls) {
      expect(String(call[0])).not.toMatch(/Carlos|2000-07-28|43\.26/);
    }
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
npx vitest run web/tests/reveal.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write `Reveal.tsx`**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useBirthAnswers } from "@/hooks/useBirthAnswers";
import { Dial, DIAL_FLOOR_MS } from "./Dial";
import { Reading } from "./Reading";
import { ERRORES_ES } from "@core/copy/flow.es";
import type { ChartResponse, FreeReading } from "./types";

const CHART_CAP_MS = 12_000;

function coords(lat: number, lon: number): string {
  const ns = `${Math.abs(lat).toFixed(2).replace(".", ",")}° ${lat >= 0 ? "N" : "S"}`;
  const ew = `${Math.abs(lon).toFixed(2).replace(".", ",")}° ${lon >= 0 ? "E" : "O"}`;
  return `${ns} · ${ew}`;
}

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
  "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function fechaLarga(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} de ${MESES[m - 1]} de ${y}`;
}

/**
 * Orchestrates the reveal. Both fetches fire at once; the dial runs for a
 * FLOOR of 4.5s regardless of how fast the chart comes back (it comes back in
 * ~80ms). The cap applies only to /api/chart — /api/free is allowed to keep
 * running underneath a finished card, because Addendum 7 measures it at ~9,5s
 * and more on a retry.
 */
export function Reveal() {
  const { answers, ready } = useBirthAnswers();
  const [floorDone, setFloorDone] = useState(false);
  const [chart, setChart] = useState<ChartResponse | null>(null);
  const [free, setFree] = useState<FreeReading | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [freeFailed, setFreeFailed] = useState(false);
  const fired = useRef(false);

  useEffect(() => {
    const id = setTimeout(() => setFloorDone(true), DIAL_FLOOR_MS);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!ready || fired.current) return;
    const { date, time, place, firstName, hourKnown } = answers;
    if (!date || !time || !place) return;
    fired.current = true;

    const payload = {
      firstName: firstName?.trim() || undefined,
      date, time, hourKnown: hourKnown !== false,
      latitude: place.latitude, longitude: place.longitude,
    };
    const post = (url: string) =>
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

    // A plain ref, not a state updater: updaters must be pure, and doing the
    // "did the chart arrive?" check inside one would fire a second setState as
    // a side effect — twice over, under StrictMode.
    let chartArrived = false;
    const cap = setTimeout(() => {
      if (!chartArrived) setError(ERRORES_ES.conexion);
    }, CHART_CAP_MS);

    post("/api/chart")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? ERRORES_ES.datos);
        chartArrived = true;
        setChart(data);
      })
      .catch((e) => setError(e.message ?? ERRORES_ES.conexion))
      .finally(() => clearTimeout(cap));

    // A failed READING must never cost four answers: the chart is already
    // computed. This branch sets no page-level error on purpose.
    post("/api/free")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error();
        setFree({ apertura: data.apertura, amor: data.amor, hook: data.hook });
      })
      .catch(() => setFreeFailed(true));
  }, [ready, answers]);

  if (error) {
    return (
      <div className="error" role="alert">
        <p>{error}</p>
        <button type="button" onClick={() => location.reload()}>Reintentar</button>
      </div>
    );
  }

  if (!floorDone || !chart) {
    const p = answers.place;
    return (
      <Dial
        coords={p ? coords(p.latitude, p.longitude) : "—"}
        ciudad={p?.name ?? "—"}
        fecha={answers.date ? fechaLarga(answers.date) : "—"}
      />
    );
  }

  return (
    <Reading
      profile={chart}
      free={free}
      freeFailed={freeFailed}
      firstName={answers.firstName?.trim() || undefined}
    />
  );
}
```

- [ ] **Step 4: Write `Reading.tsx`**

Lift `BirthForm.tsx` lines 246-292 verbatim — `CharacterCardView`, the three
`section.module` blocks in their current order, `CharacterCardShare`, and the
`next-step` upsell. Keep the comment explaining why love sits second. Add one
branch: when `freeFailed` is true, the two prose modules render
`ERRORES_ES.lectura` with a retry button that re-posts `/api/free` only.

`web/src/app/crear/page.tsx`:

```tsx
"use client";

import { StepGuard } from "@/components/questions/StepGuard";
import { Reveal } from "@/components/Reveal";

export default function Page() {
  return (
    <StepGuard needs={["date", "time", "place"]}>
      <Reveal />
    </StepGuard>
  );
}
```

- [ ] **Step 5: Run the tests**

```bash
npx vitest run web/tests/reveal.test.tsx && npm test
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add web/src/components/Reveal.tsx web/src/components/Reading.tsx web/src/app/crear/page.tsx web/tests/reveal.test.tsx
git commit -m "feat(flow): the reveal route, 4.5s floor over both fetches"
```

---

### Task 9: The landing, and deleting the old form

**Files:**
- Modify: `web/src/app/page.tsx`
- Delete: `web/src/components/BirthForm.tsx`
- Modify: `web/src/app/globals.css` (only if rules become unreferenced)

- [ ] **Step 1: Rewrite the landing**

Four elements only — wordmark, headline, subhead, button (spec decisions 10
and 11). No step count, no time estimate, and **no precision paragraph**.

```tsx
import Link from "next/link";
import { ZodiacArc } from "@/components/ZodiacArc";

export default function Home() {
  return (
    <main>
      <ZodiacArc />
      <div className="shell">
        <p className="wordmark">Destiny Reports</p>

        <div className="hero">
          <h1>Crea tu carta.<br /><em>Descubre tu personaje.</em></h1>
          <p>No es un horóscopo. Es tu carta, y no se parece a la de nadie.</p>
        </div>

        <Link className="submit" href="/crear/nombre">Empezar</Link>

        <p className="foot">
          Tu fecha y tu lugar de nacimiento no salen de este servidor: la carta
          se calcula aquí y solo viajan las posiciones ya calculadas.
        </p>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Confirm nothing imports `BirthForm`**

```bash
grep -rn "BirthForm" web/src web/tests || echo "no importers"
```

Expected: `no importers`. If a test still references it, that test is now
covering deleted behaviour — delete it, since Tasks 6-8 replace its coverage.

- [ ] **Step 3: Delete it**

```bash
git rm web/src/components/BirthForm.tsx
```

- [ ] **Step 4: Full verification**

```bash
npm test && npx tsc --noEmit && npm run example && cd web && npx tsc --noEmit && npm run build; cd ..
```

Expected: all green. `npm run example` is not optional — vitest passing does
not prove the tsx path works.

- [ ] **Step 5: Commit**

```bash
git add -A web/src web/tests
git commit -m "feat(flow): the landing leads with the card, old form deleted"
```

---

### Task 10: Browser verification

**No test in this repo asserts a class, colour or font.** Everything visual in
Tasks 6-9 is invisible to vitest. This task is where it gets checked.

- [ ] **Step 1: Start the dev server**

Use the preview tooling with `.claude/launch.json`, not a bare shell.

- [ ] **Step 2: Walk the happy path**

`/` → Empezar → Carlos → 28/07/2000 → confirm **ARTISTA** appears → 22:45 →
Bilbao → Crear mi carta. Confirm the dial holds for ~4.5s, that lines 1 and 2
show *43,26° N · 2,93° O* and *Bilbao … 28 de julio de 2000*, and that the card
lands after it.

- [ ] **Step 3: Walk the cusp path**

Same, with a date that `SUN_SIGN_BY_DAY` marks `null`. Confirm **no class is
named** and the cusp line shows instead.

- [ ] **Step 4: Walk the unknown-hour path**

Skip the hour. Confirm the card marks the Ascendant approximate and that
`HORA_DESCONOCIDA_ES` renders.

- [ ] **Step 5: Check back and refresh**

Browser back from `/crear/hora` → `/crear/dia` with the date still filled.
Refresh `/crear/lugar` → stays. Open `/crear/lugar` in a fresh tab → redirects
to `/crear/nombre`.

- [ ] **Step 6: Check the console, the network and reduced motion**

No console errors. Confirm no request URL contains a name, date or coordinate.
Then set `prefers-reduced-motion: reduce` and confirm the dial does not spin
but still advances.

- [ ] **Step 7: Screenshot the landing, a question, the dial and the card**

- [ ] **Step 8: Update `HANDOVER.md` and commit**

Update the "Estado actual" checklist, add an addendum recording what the
generated table measured (the real guarded-day count against the spec's ~10%
estimate) and anything the browser caught that tests could not.

```bash
git add HANDOVER.md
git commit -m "docs: record the gamified onboarding flow"
```

---

## Self-review notes

- **Spec coverage.** Decisions 1-11 all map to a task: 1→6/7, 2→6, 3→1+6,
  4→6, 5→4+6, 6→7+8, 7→2+7, 8→3+6, 9→8, 10→9, 11→9.
- **The two gaps at the top of this plan are the known holes.** Decision 8 is
  implemented as written; `porDentro.area` and the prose are not covered, by
  design, pending a spec amendment.
- **Not covered here, and not a gap in this plan:** checkout,
  `/informe/<token>`, the returning visitor. The spec scopes those out.
