# Character Card — Phase 1 (free tier) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the partial character card on the free reading — a computed
RPG-shaped summary of the chart with the paid blocks visibly locked.

**Architecture:** A pure function in astro-core (`src/card.ts`) turns a
`NatalChart` into a `FreeCard` struct using three frozen copy tables. Two React
components render it: an HTML hero and a 9:16 SVG export. No LLM call, no
network, no cost at render time. `/api/chart` gains the struct; nothing else
about the free flow changes.

**Tech Stack:** TypeScript (ESM), vitest 4, React 19 / Next 16, jsdom for
component tests.

## Global Constraints

Copied verbatim from `docs/superpowers/specs/2026-08-13-character-card-design.md`
and the plain-language spec it defers to. Every task's requirements implicitly
include this section.

- **Houses are never numbered.** No rendered output may contain a house number.
  Life areas render through `AREA_CORTA_ES`. `AREA_ES` is unchanged and stays
  the prompt-facing form; the short table is display-only and must never be
  handed to a model.
- **Every figure is a count or a distribution**, never a score on a shared
  scale. No invented numbers.
- **Class names are epicene agent nouns used without an article**, one register
  throughout — no mixing with impersonal metaphors.
- **All committed copy passes `countGenderMarks()` and `copyProblems()`.**
- **Sign glyphs only, never planetary ones.**
- Spanish (es-ES) for all reader-facing strings.
- `npm test` must stay green. Current baseline: **241 tests**.
- Palette: ink `#10131c`, bone `#ece6da`, brass `#c9a227`, copper `#b4653a`,
  muted `#a9a496`, dim `#6e7689`, rule `#262c3c`.

## Scope note: this is Phase 1 of two

The full card's traits consume `RELATION_ES`, which **does not exist yet** — it
arrives with plan A of `2026-08-10-paid-report-plain-language-design.md`.

Phase 2 (traits, the full card, the preview-route mount) is deliberately **not**
detailed here. Writing task-level code against an interface that does not exist
is exactly what produced the three broken APIs recorded in HANDOVER Addendum 13,
all of which failed at the first `npm test`. Phase 2 gets its own plan once
`RELATION_ES` is real.

Phase 1 stands alone and ships to users.

## Spec correction found during planning

The spec says the free projection is served by `/api/free`. **It is not.**
`/api/free` returns only the LLM reading (`apertura`, `amor`, `hook`); all chart
data reaches the client through `/api/chart`, which already returns `bigThree`,
`matches`, `elements`, `ruler` and `signature`. Task 8 wires the card into
`/api/chart`. Update the spec when this lands.

## Spec deviation: glyphs

The spec calls for the twelve zodiac glyphs as inline SVG paths. This plan
**embeds a subsetted symbol font instead** (Noto Sans Symbols 2, which covers
U+2648–U+2653), because the fonts are already being embedded by the same
mechanism and this meets the same goal — self-contained, identical on every
device — with no path data, no font-parsing dependency, and no change required
to the per-section data strip. `SIGN_GLYPH` stays exactly as it is.

## File Structure

| File | Responsibility |
|---|---|
| `src/validate.ts` (modify) | add `copyProblems()` — jargon/cliché check with no chart and no length rule |
| `src/copy/areas.es.ts` (modify) | add `AREA_CORTA_ES` — display-only short life areas |
| `src/copy/classes.es.ts` (create) | `CLASS_ES` — twelve epicene class names |
| `src/card.ts` (create) | `selectTraits()`, `freeCard()` — all card computation |
| `scripts/build-card-fonts.ts` (create) | one-time asset build: subsetted base64 fonts |
| `web/src/lib/card-fonts.ts` (generated, committed) | `CARD_FONT_CSS` |
| `web/src/components/CharacterCard.tsx` (create) | HTML hero, renders locked blocks |
| `web/src/components/CharacterCardShare.tsx` (create) | 9:16 SVG + PNG export |
| `web/src/app/api/chart/route.ts` (modify) | return the `FreeCard` struct |
| `web/src/components/BirthForm.tsx` (modify) | mount the card, drop the absorbed components |
| `web/src/components/Matches.tsx` (modify) | take over `Elements`'s echo paragraph |
| `Readout.tsx`, `Elements.tsx`, `Signature.tsx` (delete) | absorbed by the card |

---

### Task 1: `copyProblems()` — a copy check with no chart

`validateProse()` cannot check copy-table entries: it requires a `NatalChart`
these strings are not grounded in, and enforces a word range meaningless for a
three-word class name. `countGenderMarks()` is already exported and standalone;
jargon and cliché are not, because `JARGON` and `CLICHES` are module-private.

**Files:**
- Modify: `src/validate.ts` (add export beside `countGenderMarks`, ~line 339)
- Test: `tests/validate.test.ts` (append)

**Interfaces:**
- Consumes: nothing.
- Produces: `copyProblems(text: string): string[]` — returns one string per
  problem, empty array when clean. Used by Tasks 2 and 3.

- [ ] **Step 1: Write the failing test**

Append to `tests/validate.test.ts`:

```ts
describe("copyProblems", () => {
  it("passes clean reader-facing copy", () => {
    expect(copyProblems("cómo hablas y te mueves")).toEqual([]);
  });

  it("flags jargon", () => {
    expect(copyProblems("tu regente en domicilio")).toEqual([
      'jerga prohibida: "regente"',
      'jerga prohibida: "domicilio"',
    ]);
  });

  it("flags a cliché", () => {
    expect(copyProblems("sois almas gemelas")).toEqual([
      'cliché prohibido: "alma gemela"',
    ]);
  });

  it("flags a numbered house", () => {
    expect(copyProblems("tu casa 7")).toContain("jerga prohibida: casa numerada");
  });

  it("imposes no length rule and needs no chart", () => {
    expect(copyProblems("el dinero")).toEqual([]);
  });
});
```

Add `copyProblems` to the existing import from `../src/validate` at the top of
the file.

- [ ] **Step 2: Run the test and watch it fail**

```bash
npx vitest run tests/validate.test.ts -t copyProblems
```

Expected: FAIL — `copyProblems is not a function`.

- [ ] **Step 3: Implement it**

In `src/validate.ts`, directly after `countGenderMarks`:

```ts
/**
 * Jargon and cliché only, for strings that are not model output: copy tables,
 * static UI text. `validateProse` cannot serve here — it demands a NatalChart
 * these strings are not grounded in, and a word range that is meaningless for a
 * three-word label. The lists are the same ones the prose gate uses, so hand
 * copy and model copy are held to one standard.
 */
export function copyProblems(text: string): string[] {
  const problems: string[] = [];
  const lower = text.toLowerCase();
  for (const word of JARGON) {
    if (lower.includes(word)) problems.push(`jerga prohibida: "${word}"`);
  }
  if (/\bcasa\s*\d/i.test(text)) problems.push("jerga prohibida: casa numerada");
  for (const phrase of CLICHES) {
    if (lower.includes(phrase)) problems.push(`cliché prohibido: "${phrase}"`);
  }
  return problems;
}
```

- [ ] **Step 4: Run the test and watch it pass**

```bash
npx vitest run tests/validate.test.ts
```

Expected: PASS, and every pre-existing test in the file still passes.

- [ ] **Step 5: Commit**

```bash
git add src/validate.ts tests/validate.test.ts
git commit -m "feat: copyProblems, a jargon and cliche check for hand-written copy"
```

---

### Task 2: `AREA_CORTA_ES`

`AREA_ES` phrases run 6–12 words ("cómo hablas, escribes y te mueves por tu
barrio"). Seven stacked are unreadable on screen and do not fit the 1080×1920
export at all. The card needs a short form — and dropping to "casa 3" instead
would violate decision 1 of the plain-language spec.

**Files:**
- Modify: `src/copy/areas.es.ts`
- Test: `tests/copy.test.ts` (append)

**Interfaces:**
- Consumes: `copyProblems()` from Task 1.
- Produces: `AREA_CORTA_ES: Record<number, string>`, keys 1–12. Used by Tasks 5
  and 7.

- [ ] **Step 1: Write the failing test**

Append to `tests/copy.test.ts`:

```ts
describe("short area copy", () => {
  it("covers all twelve houses", () => {
    for (let h = 1; h <= 12; h++) expect(AREA_CORTA_ES[h]).toBeTruthy();
  });

  it("stays short enough for a card row", () => {
    for (let h = 1; h <= 12; h++) {
      const words = AREA_CORTA_ES[h].split(/\s+/).length;
      expect(words, `house ${h}`).toBeLessThanOrEqual(6);
    }
  });

  it("never numbers a house and never says casa", () => {
    for (let h = 1; h <= 12; h++) {
      expect(AREA_CORTA_ES[h]).not.toMatch(/\d/);
      expect(AREA_CORTA_ES[h]).not.toMatch(/\bcasa\b/i);
    }
  });

  it("carries no jargon or cliché", () => {
    for (let h = 1; h <= 12; h++) expect(copyProblems(AREA_CORTA_ES[h])).toEqual([]);
  });

  it("does not repeat the long form", () => {
    for (let h = 1; h <= 12; h++) expect(AREA_CORTA_ES[h]).not.toBe(AREA_ES[h]);
  });
});
```

Add to the imports at the top of the file:

```ts
import { AREA_ES, AREA_CORTA_ES } from "../src/copy/areas.es";
import { copyProblems } from "../src/validate";
```

(replacing the existing `AREA_ES` import line).

- [ ] **Step 2: Run the test and watch it fail**

```bash
npx vitest run tests/copy.test.ts -t "short area copy"
```

Expected: FAIL — `AREA_CORTA_ES` is undefined.

- [ ] **Step 3: Implement it**

Append to `src/copy/areas.es.ts`:

```ts
/**
 * The same twelve areas, short enough to sit in a card row. DISPLAY ONLY —
 * never hand this to a model. A model given the terse phrasing writes terse,
 * and AREA_ES's length is what makes the prose readable. The no-house-number
 * rule is identical: this table exists so the card never has to print "casa 3".
 */
export const AREA_CORTA_ES: Record<number, string> = {
  1: "cómo te presentas",
  2: "el dinero y lo tuyo",
  3: "cómo hablas y te mueves",
  4: "tu hogar y tu familia",
  5: "lo que haces por gusto",
  6: "tu día a día",
  7: "con quién te emparejas",
  8: "lo que compartes a fondo",
  9: "lo que crees y estudias",
  10: "tu cara pública",
  11: "tus amistades y tus grupos",
  12: "lo que llevas a solas",
};
```

- [ ] **Step 4: Run the test and watch it pass**

```bash
npx vitest run tests/copy.test.ts
```

Expected: PASS, all pre-existing area and sign tests still green.

- [ ] **Step 5: Commit**

```bash
git add src/copy/areas.es.ts tests/copy.test.ts
git commit -m "feat: AREA_CORTA_ES, short life areas for the card"
```

---

### Task 3: `CLASS_ES` — the twelve class names

**Files:**
- Create: `src/copy/classes.es.ts`
- Test: `tests/copy.test.ts` (append)

**Interfaces:**
- Consumes: `copyProblems()` (Task 1), `countGenderMarks()` (existing),
  `SIGN_ORDER` from `src/rulers.ts`.
- Produces: `CLASS_ES: Record<Sign, string>`. Used by Tasks 5 and 7.

**Why these words.** Spanish agent nouns mostly inflect — "El Alquimista" is
masculine — and the universal rules forbid gendering the reader. Every name
below is **epicene**: identical for any reader, taking only the article's
gender, which is why the card renders them without an article. They are one
register throughout (agent nouns), never mixed with impersonal metaphors.

- [ ] **Step 1: Write the failing test**

Append to `tests/copy.test.ts`:

```ts
describe("class copy", () => {
  it("covers all twelve signs", () => {
    for (const sign of SIGN_ORDER) expect(CLASS_ES[sign]).toBeTruthy();
  });

  it("gives every sign a distinct class", () => {
    expect(new Set(Object.values(CLASS_ES)).size).toBe(12);
  });

  it("carries no gender mark", () => {
    for (const sign of SIGN_ORDER) {
      expect(countGenderMarks(CLASS_ES[sign]), sign).toEqual([]);
    }
  });

  it("carries no jargon or cliché", () => {
    for (const sign of SIGN_ORDER) expect(copyProblems(CLASS_ES[sign])).toEqual([]);
  });

  it("uses no article, so it cannot inflect", () => {
    for (const sign of SIGN_ORDER) {
      expect(CLASS_ES[sign], sign).not.toMatch(/^(el|la|los|las)\s/i);
    }
  });

  it("is a single word, keeping one register", () => {
    for (const sign of SIGN_ORDER) {
      expect(CLASS_ES[sign].split(/\s+/), sign).toHaveLength(1);
    }
  });
});
```

Add to the file's imports:

```ts
import { CLASS_ES } from "../src/copy/classes.es";
import { copyProblems, countGenderMarks } from "../src/validate";
```

(merge with the `copyProblems` import added in Task 2 rather than duplicating it).

- [ ] **Step 2: Run the test and watch it fail**

```bash
npx vitest run tests/copy.test.ts -t "class copy"
```

Expected: FAIL — cannot resolve `../src/copy/classes.es`.

- [ ] **Step 3: Implement it**

Create `src/copy/classes.es.ts`:

```ts
import type { Sign } from "../types";

/**
 * The sun sign as a character class. Every name is EPICENE — one form for any
 * reader — and the card renders them without an article, which is the only
 * part that would inflect. Do not "improve" one of these into a noun that
 * takes -o/-a: that ships a gendered reading, which the universal rules forbid
 * and no runtime gate protects, because this table is frozen.
 *
 * One register throughout: agent nouns, never impersonal metaphors. A set that
 * mixes ALQUIMISTA with HOGUERA reads as two products.
 */
export const CLASS_ES: Record<Sign, string> = {
  Aries: "COMBATIENTE",
  Taurus: "ORFEBRE",
  Gemini: "INTÉRPRETE",
  Cancer: "CONFIDENTE",
  Leo: "ARTISTA",
  Virgo: "ALQUIMISTA",
  Libra: "EQUILIBRISTA",
  Scorpio: "VIDENTE",
  Sagittarius: "NAVEGANTE",
  Capricorn: "ESTRATEGA",
  Aquarius: "DISIDENTE",
  Pisces: "ERRANTE",
};
```

- [ ] **Step 4: Run the test and watch it pass**

```bash
npx vitest run tests/copy.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/copy/classes.es.ts tests/copy.test.ts
git commit -m "feat: twelve epicene class names, one per sun sign"
```

---

### Task 4: `selectTraits()` — trait geometry, no vocabulary

The free card shows only *how many* traits exist, but the count must be the
real one, so selection ships now. Vocabulary (naming each trait) is Phase 2 and
consumes `RELATION_ES`; this task is pure geometry and depends on nothing
unbuilt.

**Files:**
- Create: `src/card.ts`
- Test: `tests/card.test.ts`

**Interfaces:**
- Consumes: `NatalChart`, `Aspect`, `AspectType`, `Body` from `src/types.ts`.
- Produces:
  - `type Tone = "armonioso" | "tenso" | "fusion"`
  - `interface SelectedTrait { pair: [Body, Body]; aspect: AspectType; orb: number; tone: Tone }`
  - `function selectTraits(chart: NatalChart): { rasgos: SelectedTrait[]; tensiones: SelectedTrait[] }`

  Used by Task 5 (for counts) and by Phase 2 (for naming).

**The rules, stated so they cannot be read two ways.** Walk the aspects
tightest-first — `detectAspects()` already returns them sorted by orb ascending,
so no re-sorting is needed. Drop any pair where **both** bodies are outer
(Uranus, Neptune, Pluto): those aspects are generational, identical for everyone
born within a ~5-year window, and so are the opposite of personal. Map tone from
aspect type. `armonioso` fills `rasgos` (max 3); `tenso` fills `tensiones`
(max 2); a `fusion` trait takes a free `rasgos` slot if one remains, otherwise a
free `tensiones` slot. Stop when both are full. An aspect that finds no slot is
dropped — by construction it was looser than everything kept.

- [ ] **Step 1: Write the failing test**

Create `tests/card.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { computeNatalChart } from "../src/chart";
import { resolveBirthUtc } from "../src/birthtime";
import { selectTraits } from "../src/card";
import type { Body, NatalChart } from "../src/types";

function chartFor(
  local: { year: number; month: number; day: number; hour: number; minute: number },
  lat: number, lon: number,
): NatalChart {
  const { utc } = resolveBirthUtc(local, lat, lon);
  return computeNatalChart({ utc, latitude: lat, longitude: lon });
}

// The three canonical battery charts, copied from scripts/battery-sections.ts:43-46.
// Keep them identical to that file — every measurement in HANDOVER is against these.
const madrid = chartFor({ year: 1992, month: 4, day: 15, hour: 10, minute: 30 }, 40.4168, -3.7038);
const buenosaires = chartFor({ year: 1985, month: 11, day: 2, hour: 11, minute: 20 }, -34.6037, -58.3816);
/** The canary. Leo Sun/Venus drags Spanish toward feminine participles. */
const bilbao = chartFor({ year: 2000, month: 7, day: 30, hour: 4, minute: 15 }, 43.263, -2.935);
const CHARTS = { madrid, buenosaires, bilbao };

const OUTER: Body[] = ["Uranus", "Neptune", "Pluto"];

describe("selectTraits", () => {
  it("never returns a generational pair", () => {
    for (const [name, chart] of Object.entries(CHARTS)) {
      const { rasgos, tensiones } = selectTraits(chart);
      for (const t of [...rasgos, ...tensiones]) {
        const bothOuter = OUTER.includes(t.pair[0]) && OUTER.includes(t.pair[1]);
        expect(bothOuter, `${name}: ${t.pair.join("-")}`).toBe(false);
      }
    }
  });

  it("respects the caps", () => {
    for (const chart of Object.values(CHARTS)) {
      const { rasgos, tensiones } = selectTraits(chart);
      expect(rasgos.length).toBeLessThanOrEqual(3);
      expect(tensiones.length).toBeLessThanOrEqual(2);
    }
  });

  it("keeps the tightest aspects first", () => {
    for (const chart of Object.values(CHARTS)) {
      const { rasgos, tensiones } = selectTraits(chart);
      for (const list of [rasgos, tensiones]) {
        const orbs = list.map((t) => t.orb);
        expect(orbs).toEqual([...orbs].sort((a, b) => a - b));
      }
    }
  });

  it("maps aspect type to tone", () => {
    for (const chart of Object.values(CHARTS)) {
      const { rasgos, tensiones } = selectTraits(chart);
      for (const t of [...rasgos, ...tensiones]) {
        if (t.aspect === "trine" || t.aspect === "sextile") expect(t.tone).toBe("armonioso");
        else if (t.aspect === "square" || t.aspect === "opposition") expect(t.tone).toBe("tenso");
        else expect(t.tone).toBe("fusion");
      }
    }
  });

  it("never puts a tense aspect in rasgos", () => {
    for (const chart of Object.values(CHARTS)) {
      for (const t of selectTraits(chart).rasgos) expect(t.tone).not.toBe("tenso");
    }
  });

  it("carries the real orb from the chart", () => {
    const { rasgos, tensiones } = selectTraits(bilbao);
    for (const t of [...rasgos, ...tensiones]) {
      const real = bilbao.aspects.find(
        (a) => a.a === t.pair[0] && a.b === t.pair[1] && a.type === t.aspect,
      );
      expect(real, `${t.pair.join("-")} must exist in the chart`).toBeDefined();
      expect(t.orb).toBe(real!.orb);
    }
  });

  it("finds traits on every fixture chart", () => {
    for (const [name, chart] of Object.entries(CHARTS)) {
      const { rasgos, tensiones } = selectTraits(chart);
      expect(rasgos.length + tensiones.length, name).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run the test and watch it fail**

```bash
npx vitest run tests/card.test.ts
```

Expected: FAIL — cannot resolve `../src/card`.

- [ ] **Step 3: Implement it**

Create `src/card.ts`:

```ts
import type { AspectType, Body, NatalChart } from "./types";

export type Tone = "armonioso" | "tenso" | "fusion";

export interface SelectedTrait {
  pair: [Body, Body];
  aspect: AspectType;
  orb: number;
  tone: Tone;
}

/**
 * Slow enough that their sign is shared by everyone born within years. They
 * never appear as a card row of their own, and an aspect between two of them is
 * not personal either — it is the signature of a birth cohort.
 */
const OUTER = new Set<Body>(["Uranus", "Neptune", "Pluto"]);

const MAX_RASGOS = 3;
const MAX_TENSIONES = 2;

/**
 * A conjunction gets its own tone rather than being folded into one of the
 * others: it is genuinely neither, and calling it harmonious would invent a
 * valence the geometry does not carry.
 */
function toneFor(type: AspectType): Tone {
  if (type === "trine" || type === "sextile") return "armonioso";
  if (type === "square" || type === "opposition") return "tenso";
  return "fusion";
}

/**
 * The chart's traits, tightest first. `detectAspects` already returns aspects
 * sorted by orb ascending, so this walks them in order and takes what fits.
 *
 * An aspect that finds no free slot is dropped. That is intended, not a loss:
 * by construction it is looser than everything already kept.
 */
export function selectTraits(chart: NatalChart): {
  rasgos: SelectedTrait[];
  tensiones: SelectedTrait[];
} {
  const rasgos: SelectedTrait[] = [];
  const tensiones: SelectedTrait[] = [];

  for (const a of chart.aspects) {
    if (OUTER.has(a.a) && OUTER.has(a.b)) continue;
    if (rasgos.length >= MAX_RASGOS && tensiones.length >= MAX_TENSIONES) break;

    const tone = toneFor(a.type);
    const trait: SelectedTrait = { pair: [a.a, a.b], aspect: a.type, orb: a.orb, tone };

    if (tone === "tenso") {
      if (tensiones.length < MAX_TENSIONES) tensiones.push(trait);
    } else if (tone === "armonioso") {
      if (rasgos.length < MAX_RASGOS) rasgos.push(trait);
    } else if (rasgos.length < MAX_RASGOS) {
      rasgos.push(trait);
    } else if (tensiones.length < MAX_TENSIONES) {
      tensiones.push(trait);
    }
  }

  return { rasgos, tensiones };
}
```

- [ ] **Step 4: Run the test and watch it pass**

```bash
npx vitest run tests/card.test.ts
```

Expected: PASS, 7 tests.

If `finds traits on every fixture chart` fails for a chart, do **not** loosen
the caps — check the fixture's birth data against `scripts/battery-sections.ts`
first, since the three charts there are the canonical ones.

- [ ] **Step 5: Commit**

```bash
git add src/card.ts tests/card.test.ts
git commit -m "feat: trait selection, generational pairs excluded"
```

---

### Task 5: `freeCard()`

**Files:**
- Modify: `src/card.ts`
- Test: `tests/card.test.ts` (append)

**Interfaces:**
- Consumes: `selectTraits()` (Task 4), `CLASS_ES` (Task 3), `AREA_CORTA_ES`
  (Task 2), `elementBalance()` and `signature()` from `src/profile.ts`,
  `Balance<Element>` from `src/profile.ts`, `Element` from `src/rulers.ts`.
- Produces: `interface FreeCard` and `function freeCard(chart: NatalChart): FreeCard`.
  Used by Tasks 7, 8 and 9.

**`house` never crosses this boundary.** The free struct carries `area` only.
The paid blocks are omitted entirely rather than hidden — sending them and
hiding them in the client would leave the paid content readable in devtools.

- [ ] **Step 1: Write the failing test**

Append to `tests/card.test.ts`:

```ts
describe("freeCard", () => {
  it("reads the class from the sun sign", () => {
    // bilbao-2000 is the Leo Sun chart (battery-sections.ts:45). If this fails,
    // the fixture differs from the note — fix the expectation, not the code.
    const { clase } = freeCard(bilbao);
    expect(clase.sign).toBe("Leo");
    expect(clase.nombre).toBe("ARTISTA");
  });

  it("reads how the reader is seen from the ascendant", () => {
    const card = freeCard(bilbao);
    expect(card.seVe.sign).toBe("Cancer");
    expect(card.seVe.signDegree).toBeGreaterThanOrEqual(0);
    expect(card.seVe.signDegree).toBeLessThan(30);
  });

  it("reads the inner world from the moon, as a life area", () => {
    // The canary's Moon is in Cancer, house 2 — asserted in tests/profile.test.ts.
    const card = freeCard(bilbao);
    expect(card.porDentro.sign).toBe("Cancer");
    expect(card.porDentro.area).toBe(AREA_CORTA_ES[2]);
  });

  it("carries the glosses Readout used to render", () => {
    const card = freeCard(bilbao);
    expect(card.clase.gloss).toBe(SUN_ES.Leo);
    expect(card.porDentro.gloss).toBe(MOON_ES.Cancer);
    expect(card.seVe.gloss).toBe(ASC_ES.Cancer);
  });

  it("carries a degree for each of the three, as Readout did", () => {
    const card = freeCard(bilbao);
    for (const d of [card.clase.signDegree, card.seVe.signDegree, card.porDentro.signDegree]) {
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThan(30);
    }
  });

  it("never exposes a house number", () => {
    for (const chart of Object.values(CHARTS)) {
      expect(JSON.stringify(freeCard(chart))).not.toMatch(/"house"/);
    }
  });

  it("omits the paid blocks entirely rather than hiding them", () => {
    const json = JSON.stringify(freeCard(bilbao));
    for (const key of ["rasgos", "tensiones", "planetas", "definitorio"]) {
      expect(json, key).not.toContain(`"${key}"`);
    }
  });

  it("reports the real locked counts", () => {
    for (const chart of Object.values(CHARTS)) {
      const { rasgos, tensiones } = selectTraits(chart);
      const card = freeCard(chart);
      expect(card.bloqueado.rasgos).toBe(rasgos.length);
      expect(card.bloqueado.tensiones).toBe(tensiones.length);
      expect(card.bloqueado.planetas).toBe(7);
    }
  });

  it("carries the element distribution unchanged", () => {
    const card = freeCard(bilbao);
    expect(card.afinidad).toEqual(elementBalance(bilbao));
  });

  it("carries the computed rarity", () => {
    expect(freeCard(bilbao).rareza.oneIn).toBe(1728);
  });
});
```

Extend the imports at the top of the file:

```ts
import { selectTraits, freeCard } from "../src/card";
import { elementBalance } from "../src/profile";
import { AREA_CORTA_ES } from "../src/copy/areas.es";
import { SUN_ES, MOON_ES, ASC_ES } from "../src/copy/signs.es";
```

- [ ] **Step 2: Run the test and watch it fail**

```bash
npx vitest run tests/card.test.ts -t freeCard
```

Expected: FAIL — `freeCard is not a function`.

- [ ] **Step 3: Implement it**

Append to `src/card.ts`, and extend its imports:

```ts
import { elementBalance, signature, type Balance } from "./profile";
import type { Element } from "./rulers";
import type { Sign } from "./types";
import { CLASS_ES } from "./copy/classes.es";
import { AREA_CORTA_ES } from "./copy/areas.es";
```

```ts
/** Seven rows on the full card: the five personal planets plus Jupiter and Saturn. */
const SHOWN_PLANETS = 7;

/**
 * What the free reading is allowed to know. The paid blocks are ABSENT, not
 * hidden: a struct that carried them and let the client hide them would leave
 * the paid report readable in devtools.
 *
 * Note there is no `house` anywhere — only `area`. Decision 1 of the
 * plain-language spec removes house numbering from every reader-facing surface,
 * and the cheapest way to honour that is never to carry the number out here.
 */
export interface FreeCard {
  clase: { sign: Sign; nombre: string; signDegree: number; gloss: string };
  seVe: { sign: Sign; signDegree: number; gloss: string };
  porDentro: { sign: Sign; signDegree: number; area: string; gloss: string };
  afinidad: Balance<Element>;
  rareza: { oneIn: number };
  /** Counts only — enough to render locked rows honestly. */
  bloqueado: { rasgos: number; tensiones: number; planetas: number };
}

export function freeCard(chart: NatalChart): FreeCard {
  const sun = chart.planets.find((p) => p.body === "Sun")!;
  const moon = chart.planets.find((p) => p.body === "Moon")!;
  const asc = chart.angles.ascendant;
  const { rasgos, tensiones } = selectTraits(chart);

  return {
    clase: {
      sign: sun.sign, nombre: CLASS_ES[sun.sign],
      signDegree: sun.signDegree, gloss: SUN_ES[sun.sign],
    },
    seVe: {
      sign: asc.sign, signDegree: asc.signDegree, gloss: ASC_ES[asc.sign],
    },
    porDentro: {
      sign: moon.sign, signDegree: moon.signDegree,
      area: AREA_CORTA_ES[moon.house], gloss: MOON_ES[moon.sign],
    },
    afinidad: elementBalance(chart),
    rareza: { oneIn: signature(chart).oneIn },
    bloqueado: {
      rasgos: rasgos.length,
      tensiones: tensiones.length,
      planetas: SHOWN_PLANETS,
    },
  };
}
```

**The glosses ride along because the card absorbs `Readout`** (Task 10). Those
three lines are real reading content, and moving them into the struct is what
lets the component be deleted without losing anything. Degrees ride along for
the same reason — `Readout` showed one per row.

Extend the import added earlier in this step:

```ts
import { SUN_ES, MOON_ES, ASC_ES } from "./copy/signs.es";
```

- [ ] **Step 4: Run the test and watch it pass**

```bash
npm test
```

Expected: PASS. Full suite green, 241 + 20 tests.

- [ ] **Step 5: Commit**

```bash
git add src/card.ts tests/card.test.ts
git commit -m "feat: freeCard, the projection the free reading is allowed to see"
```

---

### Task 6: embedded card fonts

Addendum 13 verified the current PNG export is **not** in Fraunces and Plex
Mono: `XMLSerializer` copies the DOM as-is, and a detached SVG loaded through a
blob URL sees neither the page's custom properties nor its next/font faces, so
the `var()` fallbacks are what rasterises. A text-heavy card makes that obvious.

This also fixes the zodiac glyphs, which are U+2648–U+2653 and absent from
Fraunces — they currently resolve through a system fallback and differ per
device. Noto Sans Symbols 2 covers them.

**Files:**
- Create: `scripts/build-card-fonts.ts`
- Create (generated, committed): `web/src/lib/card-fonts.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `CARD_FONT_CSS: string` — `@font-face` rules with base64 `src`,
  plus `.cc-display`, `.cc-mono`, `.cc-glyph` classes. Used by Tasks 7 and 9.

Google Fonts' `text=` parameter returns a woff2 subset to exactly the characters
requested, so no subsetting library is needed. The subset covers the **whole
Spanish alphabet**, not just the glyphs in the fixture charts, because the card
carries a user-supplied first name.

- [ ] **Step 1: Write the build script**

Create `scripts/build-card-fonts.ts`:

```ts
/**
 * One-time asset build. Writes web/src/lib/card-fonts.ts, which IS committed —
 * the app never fetches fonts at runtime.
 *
 * Run: npx tsx scripts/build-card-fonts.ts
 *
 * Google Fonts' `text=` parameter returns a woff2 containing only the
 * characters asked for, so this needs no subsetting library. The character set
 * is the whole Spanish alphabet plus digits and punctuation, NOT just what the
 * fixture charts happen to contain: the card renders a first name the user
 * types.
 */
import { writeFile } from "node:fs/promises";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const SPANISH = "ÁÉÍÓÚÜÑáéíóúüñ¿¡";
const REST = "0123456789 .,:;·—–-()«»\"'%";
const TEXT = LETTERS + SPANISH + REST;
const GLYPHS = "♈♉♊♋♌♍♎♏♐♑♒♓";

const FACES = [
  { name: "CardDisplay", family: "Fraunces:opsz,wght@9..144,400", text: TEXT },
  { name: "CardMono", family: "IBM+Plex+Mono:wght@400", text: TEXT },
  { name: "CardGlyph", family: "Noto+Sans+Symbols+2", text: GLYPHS },
];

// A modern UA string is required, or Google serves legacy TTF instead of woff2.
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function face(name: string, family: string, text: string): Promise<string> {
  const url =
    `https://fonts.googleapis.com/css2?family=${family}` +
    `&text=${encodeURIComponent(text)}&display=swap`;
  const css = await (await fetch(url, { headers: { "User-Agent": UA } })).text();
  const woff2 = css.match(/url\((https:\/\/[^)]+\.woff2)\)/)?.[1];
  if (!woff2) throw new Error(`no woff2 in the CSS for ${family}`);

  const bytes = Buffer.from(await (await fetch(woff2)).arrayBuffer());
  console.log(`${name}: ${(bytes.length / 1024).toFixed(1)} KB`);
  return `@font-face{font-family:"${name}";font-style:normal;font-weight:400;` +
    `src:url(data:font/woff2;base64,${bytes.toString("base64")}) format("woff2");}`;
}

const rules = await Promise.all(FACES.map((f) => face(f.name, f.family, f.text)));

await writeFile(
  new URL("../web/src/lib/card-fonts.ts", import.meta.url),
  `// GENERATED by scripts/build-card-fonts.ts — do not edit by hand.\n` +
  `// Regenerate only when the card's typefaces or character set change.\n` +
  `export const CARD_FONT_CSS = ${JSON.stringify(
    rules.join("") +
    `.cc-display{font-family:"CardDisplay",Georgia,serif;}` +
    `.cc-mono{font-family:"CardMono",ui-monospace,monospace;}` +
    `.cc-glyph{font-family:"CardGlyph","CardDisplay",serif;}`,
  )};\n`,
  "utf8",
);
console.log("wrote web/src/lib/card-fonts.ts");
```

- [ ] **Step 2: Run it**

```bash
npx tsx scripts/build-card-fonts.ts
```

Expected: three size lines then `wrote web/src/lib/card-fonts.ts`. Each face
should be roughly 10–40 KB. If any exceeds ~80 KB, the `text=` parameter was
ignored — check the URL encoding before continuing.

- [ ] **Step 3: Verify the output is usable**

```bash
node -e "import('./web/src/lib/card-fonts.ts').catch(()=>{})" 2>/dev/null; \
grep -c "@font-face" web/src/lib/card-fonts.ts && \
grep -o "data:font/woff2;base64,.\{0,20\}" web/src/lib/card-fonts.ts | head -3
```

Expected: `1` (all three rules are on one line) and three base64 prefixes.

- [ ] **Step 4: Commit**

```bash
git add scripts/build-card-fonts.ts web/src/lib/card-fonts.ts
git commit -m "feat: subsetted base64 card fonts, glyphs included"
```

---

### Task 7: `CharacterCardView`

**Files:**
- Create: `web/src/components/CharacterCard.tsx`
- Test: `web/tests/character-card.test.tsx`

**Interfaces:**
- Consumes: `FreeCard` (Task 5), `SIGN_ES` and `SIGN_GLYPH` from
  `@core/copy/signs.es`.
- Produces: `CharacterCardView({ card, firstName }: { card: FreeCard; firstName?: string })`.
  Used by Task 9.

Pure — no fetch, no browser APIs — so it serves the free page, the future
delivery route and Puppeteer alike.

- [ ] **Step 1: Write the failing test**

Create `web/tests/character-card.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { CharacterCardView } from "@/components/CharacterCard";
import { formatDegree } from "@/lib/format";
import type { FreeCard } from "@core/card";

afterEach(cleanup);

// Gloss strings are deliberately obvious fixtures, not copy from signs.es.ts —
// this asserts that the component renders whatever it is handed.
const card: FreeCard = {
  clase: { sign: "Leo", nombre: "ARTISTA", signDegree: 7.2, gloss: "glosa del sol" },
  seVe: { sign: "Cancer", signDegree: 12.4, gloss: "glosa del ascendente" },
  porDentro: {
    sign: "Cancer", signDegree: 3.1,
    area: "el dinero y lo tuyo", gloss: "glosa de la luna",
  },
  afinidad: {
    totals: { Fuego: 9.5, Tierra: 2, Aire: 6, Agua: 4 },
    dominant: "Fuego", weakest: "Tierra", total: 21.5,
  },
  rareza: { oneIn: 1728 },
  bloqueado: { rasgos: 3, tensiones: 2, planetas: 7 },
};

describe("CharacterCardView", () => {
  it("names the class", () => {
    const { container } = render(<CharacterCardView card={card} />);
    expect(container.textContent).toContain("ARTISTA");
  });

  it("names the signs in Spanish", () => {
    const { container } = render(<CharacterCardView card={card} />);
    expect(container.textContent).toContain("Cáncer");
  });

  it("shows the life area, never a house number", () => {
    const { container } = render(<CharacterCardView card={card} />);
    expect(container.textContent).toContain("el dinero y lo tuyo");
    expect(container.textContent).not.toMatch(/casa/i);
    expect(container.textContent).not.toMatch(/\bcasa\s*\d/i);
  });

  it("renders all three glosses, which Readout used to carry", () => {
    const { container } = render(<CharacterCardView card={card} />);
    expect(container.textContent).toContain("glosa del sol");
    expect(container.textContent).toContain("glosa del ascendente");
    expect(container.textContent).toContain("glosa de la luna");
  });

  it("renders a degree per row, formatted as Readout formatted it", () => {
    const { container } = render(<CharacterCardView card={card} />);
    expect(container.textContent).toContain(formatDegree(12.4));
  });

  it("renders the element distribution with its real totals", () => {
    const { container } = render(<CharacterCardView card={card} />);
    expect(container.textContent).toContain("9,5");
    expect(container.textContent).toContain("Fuego");
  });

  it("renders the locked blocks with their real counts", () => {
    const { container } = render(<CharacterCardView card={card} />);
    const locked = container.querySelectorAll("[data-locked]");
    expect(locked.length).toBe(3);
    expect(container.textContent).toContain("3 rasgos");
    expect(container.textContent).toContain("2 tensiones");
  });

  it("states the rarity formatted for es-ES", () => {
    const { container } = render(<CharacterCardView card={card} />);
    // es-ES does not group four-digit numbers (CLDR minimumGroupingDigits: 2).
    expect(container.textContent).toContain("1728");
  });

  it("names the reader when a first name is given", () => {
    const { container } = render(<CharacterCardView card={card} firstName="Alex" />);
    expect(container.textContent).toContain("Alex");
  });

  it("omits the name line entirely without one", () => {
    const { container } = render(<CharacterCardView card={card} />);
    expect(container.querySelector("[data-name]")).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test and watch it fail**

```bash
npx vitest run web/tests/character-card.test.tsx
```

Expected: FAIL — cannot resolve `@/components/CharacterCard`.

- [ ] **Step 3: Implement it**

Create `web/src/components/CharacterCard.tsx`:

```tsx
import { SIGN_ES, SIGN_GLYPH } from "@core/copy/signs.es";
import { formatDegree } from "@/lib/format";
import type { FreeCard } from "@core/card";

const ELEMENTS = ["Fuego", "Tierra", "Aire", "Agua"] as const;

const n = (x: number) => x.toLocaleString("es-ES", { maximumFractionDigits: 1 });

/**
 * The chart as a character sheet. Every figure is a count or a distribution the
 * reader can check against their own chart — never a score on a shared scale,
 * which would be a number we invented and they cannot audit.
 *
 * Pure: no fetch, no browser APIs, so it serves the free page, the delivery
 * route and Puppeteer alike.
 */
export function CharacterCardView({
  card, firstName,
}: { card: FreeCard; firstName?: string }) {
  const max = Math.max(...ELEMENTS.map((k) => card.afinidad.totals[k]));

  return (
    <section className="cc">
      <header className="cc__head">
        <p className="cc__label">Clase</p>
        <p className="cc__class cc-display">{card.clase.nombre}</p>
        {firstName && <p className="cc__name" data-name>La carta de {firstName}</p>}
      </header>

      <dl className="cc__rows">
        {[
          {
            key: "clase", label: "Quién eres", sign: card.clase.sign,
            degree: card.clase.signDegree, gloss: card.clase.gloss, area: null,
          },
          {
            key: "seVe", label: "Se te ve como", sign: card.seVe.sign,
            degree: card.seVe.signDegree, gloss: card.seVe.gloss, area: null,
          },
          {
            key: "porDentro", label: "Por dentro", sign: card.porDentro.sign,
            degree: card.porDentro.signDegree, gloss: card.porDentro.gloss,
            area: card.porDentro.area,
          },
        ].map((r) => (
          <div className="cc__row" key={r.key}>
            <dt>{r.label}</dt>
            <dd>
              <span className="cc__placement">
                <span className="cc-glyph">{SIGN_GLYPH[r.sign]}</span>{" "}
                {SIGN_ES[r.sign]}{" "}
                <span className="cc-mono cc__deg">{formatDegree(r.degree)}</span>
                {r.area && <> — {r.area}</>}
              </span>
              <span className="cc__gloss">{r.gloss}</span>
            </dd>
          </div>
        ))}
      </dl>

      <div className="cc__block">
        <p className="cc__label">Afinidad</p>
        <div className="cc__bars">
          {ELEMENTS.slice()
            .sort((a, b) => card.afinidad.totals[b] - card.afinidad.totals[a])
            .map((k) => (
              <div className="cc__bar" key={k}>
                <span className="cc__bar-name">{k}</span>
                <span className="cc__bar-track">
                  <span
                    className="cc__bar-fill"
                    style={{ width: `${(card.afinidad.totals[k] / max) * 100}%` }}
                  />
                </span>
                <span className="cc__bar-val cc-mono">{n(card.afinidad.totals[k])}</span>
              </div>
            ))}
        </div>
      </div>

      <div className="cc__locked">
        <p className="cc__lock" data-locked>{card.bloqueado.rasgos} rasgos</p>
        <p className="cc__lock" data-locked>{card.bloqueado.tensiones} tensiones</p>
        <p className="cc__lock" data-locked>{card.bloqueado.planetas} planetas</p>
      </div>

      <p className="cc__rarity cc-mono">
        1 de {card.rareza.oneIn.toLocaleString("es-ES")} combinaciones
      </p>
    </section>
  );
}
```

- [ ] **Step 4: Run the test and watch it pass**

```bash
npx vitest run web/tests/character-card.test.tsx
```

Expected: PASS, 8 tests.

- [ ] **Step 5: Add the styles**

Append to `web/src/app/globals.css`, matching the palette in Global Constraints:

```css
.cc { border: 1px solid #262c3c; padding: 1.5rem; margin: 2rem 0; }
.cc__label { color: #6e7689; font-size: .75rem; letter-spacing: .18em;
             text-transform: uppercase; margin: 0 0 .35rem; }
.cc__class { color: #c9a227; font-size: 2.25rem; letter-spacing: .06em; margin: 0; }
.cc__name { color: #6e7689; font-size: .85rem; margin: .35rem 0 0; }
.cc__head { border-bottom: 1px solid #262c3c; padding-bottom: 1rem; }
.cc__rows { margin: 1rem 0; }
.cc__row { padding: .6rem 0; border-bottom: 1px solid #262c3c; }
.cc__row:last-child { border-bottom: 0; }
.cc__row dt { color: #6e7689; font-size: .75rem; letter-spacing: .12em;
              text-transform: uppercase; }
.cc__row dd { color: #ece6da; margin: .2rem 0 0; }
.cc__placement { display: block; }
.cc__deg { color: #a9a496; font-size: .85em; }
.cc__gloss { display: block; color: #a9a496; font-size: .9rem; margin-top: .2rem; }
.cc__bars { display: grid; gap: .35rem; }
.cc__bar { display: grid; grid-template-columns: 4.5rem 1fr 2.5rem; align-items: center;
           gap: .5rem; }
.cc__bar-name { color: #a9a496; font-size: .8rem; }
.cc__bar-track { background: #262c3c; height: .5rem; }
.cc__bar-fill { display: block; background: #c9a227; height: 100%; }
.cc__bar-val { color: #a9a496; font-size: .8rem; text-align: right; }
.cc__locked { display: flex; flex-wrap: wrap; gap: .75rem; margin: 1.25rem 0 0; }
.cc__lock { color: #6e7689; font-size: .85rem; margin: 0; }
.cc__lock::before { content: "🔒 "; }
.cc__rarity { color: #b4653a; font-size: .85rem; margin: 1rem 0 0; }
```

- [ ] **Step 6: Commit**

```bash
git add web/src/components/CharacterCard.tsx web/tests/character-card.test.tsx web/src/app/globals.css
git commit -m "feat: character card hero, locked blocks and no house numbers"
```

---

### Task 8: `/api/chart` returns the card

**Files:**
- Modify: `web/src/app/api/chart/route.ts`
- Modify: `web/src/lib/astro.ts` (re-export)
- Modify: `web/src/components/types.ts` (extend `ChartResponse`)

**Interfaces:**
- Consumes: `freeCard()` (Task 5).
- Produces: `ChartResponse.card: FreeCard`. Used by Task 9.

- [ ] **Step 1: Re-export `freeCard` through the server-only lib**

In `web/src/lib/astro.ts`, append:

```ts
export { freeCard, selectTraits } from "@core/card";
export type { FreeCard, SelectedTrait, Tone } from "@core/card";
```

- [ ] **Step 2: Extend the response type**

In `web/src/components/types.ts`, add the import and the field:

```ts
import type { FreeCard } from "@core/card";
```

and inside `ChartResponse`, after `signature`:

```ts
  card: FreeCard;
```

- [ ] **Step 3: Return it from the route**

In `web/src/app/api/chart/route.ts`, add `freeCard` to the existing import from
`@/lib/astro`, then add one line to the returned object after `signature`:

```ts
    signature: signature(chart),
    card: freeCard(chart),
```

- [ ] **Step 4: Verify types and the suite**

```bash
cd web && npx tsc --noEmit && cd .. && npm test
```

Expected: no type errors, full suite green.

- [ ] **Step 5: Commit**

```bash
git add web/src/app/api/chart/route.ts web/src/lib/astro.ts web/src/components/types.ts
git commit -m "feat: serve the free card from /api/chart"
```

---

### Task 9: `CharacterCardShare` — the 9:16 export

Replaces `ShareCard` as the report's shareable piece, per decision 8 of the
plain-language spec. `ShareCard.tsx` stays in the tree for now; Phase 2 removes
it once the full card's export is live.

**Files:**
- Create: `web/src/components/CharacterCardShare.tsx`
- Test: `web/tests/character-card-share.test.tsx`

**Interfaces:**
- Consumes: `FreeCard` (Task 5), `CARD_FONT_CSS` (Task 6).
- Produces: `CharacterCardShare({ card, firstName }: { card: FreeCard; firstName?: string })`.

- [ ] **Step 1: Write the failing test**

Create `web/tests/character-card-share.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { CharacterCardShare } from "@/components/CharacterCardShare";
import type { FreeCard } from "@core/card";

afterEach(cleanup);

// Gloss strings are deliberately obvious fixtures, not copy from signs.es.ts —
// this asserts that the component renders whatever it is handed.
const card: FreeCard = {
  clase: { sign: "Leo", nombre: "ARTISTA", signDegree: 7.2, gloss: "glosa del sol" },
  seVe: { sign: "Cancer", signDegree: 12.4, gloss: "glosa del ascendente" },
  porDentro: {
    sign: "Cancer", signDegree: 3.1,
    area: "el dinero y lo tuyo", gloss: "glosa de la luna",
  },
  afinidad: {
    totals: { Fuego: 9.5, Tierra: 2, Aire: 6, Agua: 4 },
    dominant: "Fuego", weakest: "Tierra", total: 21.5,
  },
  rareza: { oneIn: 1728 },
  bloqueado: { rasgos: 3, tensiones: 2, planetas: 7 },
};

describe("CharacterCardShare", () => {
  it("renders at the 9:16 ratio the platforms expect", () => {
    const { container } = render(<CharacterCardShare card={card} />);
    expect(container.querySelector("svg")?.getAttribute("viewBox")).toBe("0 0 1080 1920");
  });

  it("carries its fonts inside the SVG, so the export is not a system fallback", () => {
    const { container } = render(<CharacterCardShare card={card} />);
    const style = container.querySelector("svg style")?.textContent ?? "";
    expect(style).toContain("@font-face");
    expect(style).toContain("data:font/woff2;base64,");
  });

  it("references nothing external, so the canvas stays untainted", () => {
    const { container } = render(<CharacterCardShare card={card} />);
    const svg = container.querySelector("svg")!.outerHTML;
    expect(svg).not.toMatch(/(href|src)="https?:/);
    expect(svg).not.toMatch(/url\((?!data:)/);
  });

  it("names the class and the signs", () => {
    const { container } = render(<CharacterCardShare card={card} />);
    expect(container.textContent).toContain("ARTISTA");
    expect(container.textContent).toContain("Cáncer");
  });

  it("shows no house number", () => {
    const { container } = render(<CharacterCardShare card={card} />);
    expect(container.textContent).not.toMatch(/casa/i);
  });
});
```

- [ ] **Step 2: Run the test and watch it fail**

```bash
npx vitest run web/tests/character-card-share.test.tsx
```

Expected: FAIL — cannot resolve `@/components/CharacterCardShare`.

- [ ] **Step 3: Implement it**

Create `web/src/components/CharacterCardShare.tsx`. The rasterise function is
lifted verbatim from `ShareCard.tsx:144-165`, which is verified working.

```tsx
"use client";

import { useRef, useState } from "react";
import { SIGN_ES, SIGN_GLYPH } from "@core/copy/signs.es";
import { CARD_FONT_CSS } from "@/lib/card-fonts";
import type { FreeCard } from "@core/card";

const W = 1080;
const H = 1920; // 9:16 — Instagram Stories and TikTok native

const ELEMENTS = ["Fuego", "Tierra", "Aire", "Agua"] as const;
const n = (x: number) => x.toLocaleString("es-ES", { maximumFractionDigits: 1 });

export function CharacterCardShare({
  card, firstName,
}: { card: FreeCard; firstName?: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ranked = ELEMENTS.slice()
    .sort((a, b) => card.afinidad.totals[b] - card.afinidad.totals[a]);
  const max = card.afinidad.totals[ranked[0]];

  async function share() {
    const svg = svgRef.current;
    if (!svg || busy) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await rasterise(svg);
      const file = new File([blob], "mi-ficha.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "mi-ficha.png";
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        setError("No se pudo preparar la imagen.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="share">
      <svg
        ref={svgRef}
        className="share__card"
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={`Tu ficha: ${card.clase.nombre}`}
      >
        {/* The faces travel INSIDE the SVG. A detached SVG in a blob URL sees
            neither the page's custom properties nor its next/font faces, so
            without this the PNG rasterises in Georgia (Addendum 13). */}
        <style>{CARD_FONT_CSS}</style>
        <rect width={W} height={H} fill="#10131c" />
        <rect x="48" y="48" width={W - 96} height={H - 96} fill="none"
              stroke="#262c3c" strokeWidth="2" />

        <text x={W / 2} y="250" textAnchor="middle" fill="#a9a496"
              className="cc-mono" fontSize="32" letterSpacing="10">CLASE</text>
        <text x={W / 2} y="380" textAnchor="middle" fill="#c9a227"
              className="cc-display" fontSize="104">{card.clase.nombre}</text>

        {[
          { label: "SE TE VE COMO", sign: card.seVe.sign },
          { label: "POR DENTRO", sign: card.porDentro.sign },
        ].map((r, i) => (
          <g key={r.label} transform={`translate(0 ${600 + i * 260})`}>
            <text x={W / 2} y="0" textAnchor="middle" fill="#c9a227"
                  className="cc-glyph" fontSize="104">{SIGN_GLYPH[r.sign]}</text>
            <text x={W / 2} y="86" textAnchor="middle" fill="#ece6da"
                  className="cc-display" fontSize="64">{SIGN_ES[r.sign]}</text>
            <text x={W / 2} y="140" textAnchor="middle" fill="#6e7689"
                  className="cc-mono" fontSize="28" letterSpacing="6">{r.label}</text>
          </g>
        ))}

        <text x="140" y="1240" fill="#a9a496" className="cc-mono"
              fontSize="30" letterSpacing="8">AFINIDAD</text>
        {ranked.map((k, i) => (
          <g key={k} transform={`translate(140 ${1310 + i * 76})`}>
            <text x="0" y="26" fill="#a9a496" className="cc-mono" fontSize="30">{k}</text>
            <rect x="220" y="6" width="480" height="24" fill="#262c3c" />
            <rect x="220" y="6" width={(card.afinidad.totals[k] / max) * 480}
                  height="24" fill="#c9a227" />
            <text x="740" y="26" fill="#a9a496" className="cc-mono" fontSize="30">
              {n(card.afinidad.totals[k])}
            </text>
          </g>
        ))}

        <text x={W / 2} y="1700" textAnchor="middle" fill="#b4653a"
              className="cc-mono" fontSize="34">
          1 de {card.rareza.oneIn.toLocaleString("es-ES")} combinaciones
        </text>
        {firstName && (
          <text x={W / 2} y="1760" textAnchor="middle" fill="#6e7689"
                className="cc-display" fontSize="32">La ficha de {firstName}</text>
        )}
        <text x={W / 2} y="1840" textAnchor="middle" fill="#a9a496"
              className="cc-mono" fontSize="28" letterSpacing="8">DESTINY REPORTS</text>
      </svg>

      <button className="submit" onClick={share} disabled={busy}>
        {busy ? "Preparando…" : "Compartir o guardar"}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

/**
 * SVG → PNG via canvas. The SVG must be self-contained: no external references,
 * fonts declared inline. Nothing external is fetched, so the canvas stays
 * untainted and toBlob works.
 */
async function rasterise(svg: SVGSVGElement): Promise<Blob> {
  const source = new XMLSerializer().serializeToString(svg);
  const svgBlob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("no se pudo rasterizar la ficha"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    canvas.getContext("2d")!.drawImage(img, 0, 0, W, H);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob vacío"))), "image/png"),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
```

- [ ] **Step 4: Run the test and watch it pass**

```bash
npx vitest run web/tests/character-card-share.test.tsx
```

Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/CharacterCardShare.tsx web/tests/character-card-share.test.tsx
git commit -m "feat: 9:16 character card export with embedded fonts"
```

---

### Task 10: the card absorbs `Readout`, `Elements` and `Signature`

The free reading renders `Readout` (big three + glosses), `Elements` (affinity
bars) and `Signature` (the combination + rarity). The card contains all three.
Mounting it alongside them would put the big three and the affinity bars on
screen twice, so they are removed and the card takes their place.

Nothing is lost: the glosses and degrees moved into `FreeCard` in Task 5, and
the rarity line is already on the card.

`Elements`'s closing "echo" paragraph is the one piece that cannot move to the
card — it needs `matches`, which the card deliberately does not carry. It goes
to `Matches`, where it belongs anyway: it is a statement about the reader's
matches, not about their elements.

**Files:**
- Modify: `web/src/components/BirthForm.tsx:249-282`
- Modify: `web/src/components/Matches.tsx`
- Delete: `web/src/components/Readout.tsx`, `Elements.tsx`, `Signature.tsx`
- Test: `web/tests/matches.test.tsx` (create)

**Interfaces:**
- Consumes: `CharacterCardView` (Task 7), `CharacterCardShare` (Task 9),
  `ChartResponse.card` (Task 8).

- [ ] **Step 1: Write the failing test for the moved echo**

Create `web/tests/matches.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { Matches } from "@/components/Matches";
import type { Match } from "@/components/types";

afterEach(cleanup);

const friction: Match = { sign: "Capricorn", say: "roce", why: "por qué" };
const airMatches: Match[] = [
  { sign: "Gemini", say: "encaje aire", why: "por qué" },
  { sign: "Libra", say: "otro aire", why: "por qué" },
];

describe("Matches", () => {
  it("lists the matches and the friction sign", () => {
    const { container } = render(
      <Matches matches={airMatches} friction={friction} weakest="Aire" />,
    );
    expect(container.textContent).toContain("Géminis");
    expect(container.textContent).toContain("Capricornio");
  });

  it("names the pattern when two matches share the reader's weakest element", () => {
    const { container } = render(
      <Matches matches={airMatches} friction={friction} weakest="Aire" />,
    );
    expect(container.textContent).toContain("Buscas fuera lo que no llevas dentro");
  });

  it("stays quiet when fewer than two matches share it", () => {
    const { container } = render(
      <Matches matches={airMatches} friction={friction} weakest="Agua" />,
    );
    expect(container.textContent).not.toContain("Buscas fuera");
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
npx vitest run web/tests/matches.test.tsx
```

Expected: FAIL — `Matches` does not accept a `weakest` prop and renders no echo.

- [ ] **Step 3: Move the echo into `Matches`**

In `web/src/components/Matches.tsx`, add `weakest` to the props and append the
echo, lifted from `Elements.tsx:33-39`:

```tsx
import { ELEMENT } from "@core/rulers";
import { SIGN_ES } from "@core/copy/signs.es";
import type { ElementName, Match } from "./types";
```

```tsx
export function Matches({
  matches, friction, weakest,
}: { matches: Match[]; friction: Match; weakest: ElementName }) {
```

and, immediately before the component's closing tag:

```tsx
      {matches.filter((m) => ELEMENT[m.sign] === weakest).length >= 2 && (
        <p className="verdict punch">
          Y ahora fíjate: los signos con los que mejor encajas,{" "}
          <strong>
            {matches.filter((m) => ELEMENT[m.sign] === weakest)
              .map((m) => SIGN_ES[m.sign]).join(" y ")}
          </strong>
          , son justo de {weakest.toLowerCase()}. Buscas fuera lo que no llevas
          dentro.
        </p>
      )}
```

- [ ] **Step 4: Run it and watch it pass**

```bash
npx vitest run web/tests/matches.test.tsx
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Rewire `BirthForm`**

Replace the imports of `Readout`, `Elements` and `Signature` with:

```tsx
import { CharacterCardView } from "./CharacterCard";
import { CharacterCardShare } from "./CharacterCardShare";
```

Replace `<Readout big={profile.bigThree} />` (line 249) with:

```tsx
<CharacterCardView card={profile.card} firstName={firstName.trim() || undefined} />
```

Pass the new prop to `Matches`:

```tsx
<Matches matches={profile.matches} friction={profile.friction}
         weakest={profile.elements.weakest} />
```

Delete the whole `De qué está hecha tu mezcla` module (the `<section>` wrapping
`<Elements .../>`), and replace `<Signature sig={profile.signature} />` with:

```tsx
<CharacterCardShare card={profile.card} firstName={firstName.trim() || undefined} />
```

- [ ] **Step 6: Delete the absorbed components**

```bash
git rm web/src/components/Readout.tsx web/src/components/Elements.tsx web/src/components/Signature.tsx
```

- [ ] **Step 7: Confirm nothing else referenced them**

```bash
grep -rn "Readout\|Elements\|Signature" web/src web/tests
```

Expected: no hits other than `ElementName` in `types.ts` and the `.cc__` styles.
If `web/src/app/preview/informe/[chart]/page.tsx` references `ShareCard`, leave
that alone — `ShareCard.tsx` is not deleted in this phase.

- [ ] **Step 8: Full suite and typecheck**

```bash
npm test && cd web && npx tsc --noEmit
```

Expected: green. The suite grows by roughly 45 tests from the 241 baseline.

- [ ] **Step 9: Commit**

```bash
git add -A web/src web/tests
git commit -m "feat: the card absorbs the readout, the element bars and the signature"
```

---

### Task 11: verify in the browser

Nothing here is provable from unit tests: the fonts only matter once serialised,
and the register question is the spec's largest open risk.

- [ ] **Step 1: Start the dev server**

Use the preview tooling, never `npm run dev` in a shell. Submit the form with a
first name and a birth place from the autocomplete.

- [ ] **Step 2: Check the card on screen**

Confirm each: the class name renders in Fraunces (not a serif fallback); all
three sign glyphs are engraved, not colour emoji; each row shows sign, degree
and its gloss; the affinity bars are proportional and the totals match; three
locked rows show real counts; and **no house number appears anywhere on the
page**.

- [ ] **Step 3: Check it at 375px**

Resize to mobile. The card must not scroll horizontally, and the gloss lines
must wrap rather than overflow.

- [ ] **Step 4: Check the export**

Click "Compartir o guardar" and open the PNG. It must be 1080×1920 with an ink
background, and **the class name must be in Fraunces**. Georgia means Task 6's
fonts are not reaching the serialised SVG — the whole point of that task.

Confirm the zodiac glyphs render as symbols and not as tofu boxes; tofu means
the Noto Sans Symbols 2 subset did not include them.

- [ ] **Step 5: Record what you saw**

Add the dated addendum described in "After Phase 1" below, including the
measured size of `web/src/lib/card-fonts.ts` and whether the PNG is in Fraunces
— that closes Addendum 13's open font item either way.

- [ ] **Step 6: Commit**

```bash
git add HANDOVER.md
git commit -m "docs: record what the character card looks like in the browser"
```

---

## After Phase 1

Update `HANDOVER.md`'s "Estado actual" with the new test count and add a dated
addendum recording:

- whether the register landed — the open market risk in the spec, and the first
  time real users see it;
- the measured size of `web/src/lib/card-fonts.ts`;
- whether the export renders in Fraunces, closing Addendum 13's open font item.

Then Phase 2, once plan A has shipped `RELATION_ES`: `traits.es.ts`, the
drafting script, `describeTrait()`, the full `characterCard()` with its seven
planet rows, and the mount on `/preview/informe/<chart>`.

Two spec requirements land in Phase 2 rather than here, because both hang off
`CardPlanet`, which the free card does not carry:

- the **provenance test** (each row's `aspectCount` equals the count recomputed
  from `chart.aspects`) — the spec calls this the test that keeps the card
  honest, and it is the one to protect in review;
- the **seven-rows rule** (no Urano, Neptuno or Plutón as individual rows).

Phase 2 also removes `ShareCard.tsx`, which this phase leaves in the tree.
