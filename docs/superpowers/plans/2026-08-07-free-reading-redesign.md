# Free Reading Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the free reading so it reads like a person talking, not an ephemeris — a computed profile layer that renders instantly plus one cheap LLM call that never sees jargon.

**Architecture:** Two layers. A deterministic layer (`src/rulers.ts`, `src/profile.ts`, `src/copy/`) derives everything computable from `NatalChart` — compatible signs, element balance, chart ruler, the chart's most striking feature — in ~0 ms with no LLM. A prose layer makes a single LLM call that receives *only* precomputed facts translated into plain Spanish (life areas, never house numbers; "van de la mano", never "trígono") and returns two short blocks. A mechanical gate (`src/validate.ts`) rejects jargon, clichés, false placements and gendered phrasing before anything reaches a reader.

**Tech Stack:** TypeScript (ESM, `"type": "module"`), vitest, Next.js 16 (`web/`), DeepSeek V4 Flash via OpenRouter.

**Spec:** `docs/superpowers/specs/2026-08-07-free-reading-redesign-design.md`

## Global Constraints

- `npm test` must stay green. Baseline measured 2026-08-07: **55 tests in 4 files**.
- `npm run example` must keep working — vitest passing does NOT prove the tsx path works (ESM interop).
- **Timezone contract:** `computeNatalChart` takes a UTC instant. Never resolve birth times in the browser.
- **No PII to the LLM:** only derived chart data plus an optional sanitized first name.
- **Gender neutrality applies to hand-written copy too, not just LLM output.** Every string in `src/copy/` must pass the same regexes the validator applies to model output.
- **The model never receives:** house numbers, aspect names, orbs, degrees, the words "regente"/"domicilio"/"retrógrado", or the raw `NatalChart`.
- **No literal example sentences in prompt files.** A sample line placed in a prompt came back copied verbatim into output.
- All user-facing strings are Spanish (es-ES, "de tú").
- Zodiac glyphs in UI must carry U+FE0E or they render as colour emoji on Apple platforms.
- Commit after every task.

---

### Task 1: Sign tables and relations (`src/rulers.ts`)

**Files:**
- Create: `src/rulers.ts`
- Test: `tests/rulers.test.ts`

**Interfaces:**
- Consumes: `Body`, `Sign` from `src/types.ts`
- Produces: `SIGN_ORDER`, `RULER`, `RULER_TRADITIONAL`, `ELEMENT`, `MODALITY`, `Element`, `Modality`, `signIndex()`, `signSeparation()`, `trineSigns()`, `sextileSigns()`, `squareSigns()`, `oppositeSign()`

- [ ] **Step 1: Write the failing test**

Create `tests/rulers.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  SIGN_ORDER, RULER, RULER_TRADITIONAL, ELEMENT, MODALITY,
  signIndex, signSeparation, trineSigns, sextileSigns, squareSigns, oppositeSign,
} from "../src/rulers";

describe("sign tables", () => {
  it("covers all twelve signs in every table", () => {
    expect(SIGN_ORDER).toHaveLength(12);
    for (const sign of SIGN_ORDER) {
      expect(RULER[sign]).toBeDefined();
      expect(RULER_TRADITIONAL[sign]).toBeDefined();
      expect(ELEMENT[sign]).toBeDefined();
      expect(MODALITY[sign]).toBeDefined();
    }
  });

  it("uses modern rulerships as primary", () => {
    expect(RULER.Scorpio).toBe("Pluto");
    expect(RULER.Aquarius).toBe("Uranus");
    expect(RULER.Pisces).toBe("Neptune");
    expect(RULER.Leo).toBe("Sun");
    expect(RULER.Cancer).toBe("Moon");
  });

  it("keeps traditional rulerships available", () => {
    expect(RULER_TRADITIONAL.Scorpio).toBe("Mars");
    expect(RULER_TRADITIONAL.Aquarius).toBe("Saturn");
    expect(RULER_TRADITIONAL.Pisces).toBe("Jupiter");
  });

  it("splits elements and modalities four/three ways", () => {
    const elements = SIGN_ORDER.map((s) => ELEMENT[s]);
    for (const e of ["Fuego", "Tierra", "Aire", "Agua"]) {
      expect(elements.filter((x) => x === e)).toHaveLength(3);
    }
    const modalities = SIGN_ORDER.map((s) => MODALITY[s]);
    for (const m of ["Cardinal", "Fijo", "Mutable"]) {
      expect(modalities.filter((x) => x === m)).toHaveLength(4);
    }
  });
});

describe("sign relations", () => {
  it("indexes signs from Aries", () => {
    expect(signIndex("Aries")).toBe(0);
    expect(signIndex("Pisces")).toBe(11);
  });

  it("measures separation as the short way round", () => {
    expect(signSeparation("Aries", "Libra")).toBe(6);
    expect(signSeparation("Pisces", "Aries")).toBe(1);
    expect(signSeparation("Aries", "Pisces")).toBe(1);
  });

  it("returns two trine signs, always same element", () => {
    const trines = trineSigns("Leo");
    expect(trines).toHaveLength(2);
    expect(new Set(trines)).toEqual(new Set(["Aries", "Sagittarius"]));
    for (const t of trines) expect(ELEMENT[t]).toBe(ELEMENT.Leo);
  });

  it("returns two sextile and two square signs", () => {
    expect(new Set(sextileSigns("Leo"))).toEqual(new Set(["Gemini", "Libra"]));
    expect(new Set(squareSigns("Capricorn"))).toEqual(new Set(["Aries", "Libra"]));
  });

  it("returns the opposite sign", () => {
    expect(oppositeSign("Cancer")).toBe("Capricorn");
    expect(oppositeSign("Capricorn")).toBe("Cancer");
  });

  it("never includes the sign itself in its own relations", () => {
    for (const s of SIGN_ORDER) {
      expect(trineSigns(s)).not.toContain(s);
      expect(sextileSigns(s)).not.toContain(s);
      expect(squareSigns(s)).not.toContain(s);
      expect(oppositeSign(s)).not.toBe(s);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/rulers.test.ts`
Expected: FAIL — cannot resolve `../src/rulers`

- [ ] **Step 3: Write the implementation**

Create `src/rulers.ts`:

```ts
import type { Body, Sign } from "./types";

export const SIGN_ORDER: Sign[] = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

/** Modern rulerships — the Spanish market expectation, matching Placidus default. */
export const RULER: Record<Sign, Body> = {
  Aries: "Mars", Taurus: "Venus", Gemini: "Mercury", Cancer: "Moon",
  Leo: "Sun", Virgo: "Mercury", Libra: "Venus", Scorpio: "Pluto",
  Sagittarius: "Jupiter", Capricorn: "Saturn", Aquarius: "Uranus",
  Pisces: "Neptune",
};

/** Kept for readings that want the classical ruler as a secondary voice. */
export const RULER_TRADITIONAL: Record<Sign, Body> = {
  ...RULER, Scorpio: "Mars", Aquarius: "Saturn", Pisces: "Jupiter",
};

export type Element = "Fuego" | "Tierra" | "Aire" | "Agua";
export type Modality = "Cardinal" | "Fijo" | "Mutable";

export const ELEMENT: Record<Sign, Element> = {
  Aries: "Fuego", Leo: "Fuego", Sagittarius: "Fuego",
  Taurus: "Tierra", Virgo: "Tierra", Capricorn: "Tierra",
  Gemini: "Aire", Libra: "Aire", Aquarius: "Aire",
  Cancer: "Agua", Scorpio: "Agua", Pisces: "Agua",
};

export const MODALITY: Record<Sign, Modality> = {
  Aries: "Cardinal", Cancer: "Cardinal", Libra: "Cardinal", Capricorn: "Cardinal",
  Taurus: "Fijo", Leo: "Fijo", Scorpio: "Fijo", Aquarius: "Fijo",
  Gemini: "Mutable", Virgo: "Mutable", Sagittarius: "Mutable", Pisces: "Mutable",
};

export function signIndex(sign: Sign): number {
  return SIGN_ORDER.indexOf(sign);
}

/** Distance in signs, taking the short way round: 0-6. */
export function signSeparation(a: Sign, b: Sign): number {
  const d = Math.abs(signIndex(a) - signIndex(b));
  return Math.min(d, 12 - d);
}

function atSeparation(sign: Sign, n: number): Sign[] {
  return SIGN_ORDER.filter((o) => o !== sign && signSeparation(sign, o) === n);
}

export const trineSigns = (sign: Sign): Sign[] => atSeparation(sign, 4);
export const sextileSigns = (sign: Sign): Sign[] => atSeparation(sign, 2);
export const squareSigns = (sign: Sign): Sign[] => atSeparation(sign, 3);

export function oppositeSign(sign: Sign): Sign {
  return SIGN_ORDER[(signIndex(sign) + 6) % 12];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/rulers.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS, 62 tests

- [ ] **Step 6: Commit**

```bash
git add src/rulers.ts tests/rulers.test.ts
git commit -m "feat: sign rulership, element, modality and relation tables"
```

---

### Task 2: Chart ruler, relationship profile and balances (`src/profile.ts`)

**Files:**
- Create: `src/profile.ts`
- Test: `tests/profile.test.ts`

**Interfaces:**
- Consumes: Task 1 exports; `NatalChart`, `Aspect`, `Body`, `Sign` from `src/types.ts`
- Produces: `Placement`, `ChartRuler`, `RelationshipProfile`, `Balance`, `chartRuler()`, `relationshipProfile()`, `elementBalance()`, `modalityBalance()`, `WEIGHT`

- [ ] **Step 1: Write the failing test**

Create `tests/profile.test.ts`. The bilbao-2000 chart is the canary used throughout this plan; its ground truth is Sun Leo h2, Moon Cancer h2, Mercury Cancer h1, Venus Leo h3, Mars Cancer h2, Jupiter Gemini h12, Saturn Taurus h12, Uranus Aquarius h9 R, Neptune Aquarius h8 R, Pluto Sagittarius h6 R, Asc Cancer 2°39′, MC Pisces, Dsc Capricorn.

```ts
import { describe, it, expect } from "vitest";
import { computeNatalChart } from "../src/chart";
import { resolveBirthUtc } from "../src/birthtime";
import {
  chartRuler, relationshipProfile, elementBalance, modalityBalance,
} from "../src/profile";

function chartFor(local: { year: number; month: number; day: number; hour: number; minute: number },
                  lat: number, lon: number) {
  const { utc } = resolveBirthUtc(local, lat, lon);
  return computeNatalChart({ utc, latitude: lat, longitude: lon });
}

/** Canary chart — breaks gender rules across all models (see HANDOVER Addendum 2). */
export const bilbao = chartFor({ year: 2000, month: 7, day: 30, hour: 4, minute: 15 }, 43.263, -2.935);

describe("chartRuler", () => {
  it("finds the ruler of the ascendant and its position", () => {
    const r = chartRuler(bilbao);
    expect(r.ascendant).toBe("Cancer");
    expect(r.body).toBe("Moon");
    expect(r.sign).toBe("Cancer");
    expect(r.house).toBe(2);
  });

  it("detects a ruler in its own sign", () => {
    expect(chartRuler(bilbao).inDomicile).toBe(true);
  });
});

describe("relationshipProfile", () => {
  it("reads the relationship axis from the descendant", () => {
    const p = relationshipProfile(bilbao);
    expect(p.descendant.sign).toBe("Capricorn");
    expect(p.rulerOfSeventh.body).toBe("Saturn");
    expect(p.rulerOfSeventh.sign).toBe("Taurus");
    expect(p.rulerOfSeventh.house).toBe(12);
  });

  it("carries Venus, Mars and Moon placements", () => {
    const p = relationshipProfile(bilbao);
    expect(p.venus.sign).toBe("Leo");
    expect(p.venus.house).toBe(3);
    expect(p.mars.sign).toBe("Cancer");
    expect(p.moon.sign).toBe("Cancer");
  });

  it("lists only aspects that actually involve Venus or Mars", () => {
    const p = relationshipProfile(bilbao);
    for (const a of p.venusAspects) expect([a.a, a.b]).toContain("Venus");
    for (const a of p.marsAspects) expect([a.a, a.b]).toContain("Mars");
    expect(p.venusAspects.some((a) => a.type === "opposition" &&
      [a.a, a.b].includes("Uranus"))).toBe(true);
  });

  it("reports an empty seventh house when nothing tenants it", () => {
    expect(relationshipProfile(bilbao).seventhHouseTenants).toEqual([]);
  });
});

describe("balances", () => {
  it("weights luminaries and angles above outer planets", () => {
    const b = elementBalance(bilbao);
    expect(b.total).toBeCloseTo(20.5, 5);
    expect(b.dominant).toBe("Agua");
    expect(b.weakest).toBe("Tierra");
    expect(b.totals.Tierra).toBeCloseTo(1, 5);
    expect(b.totals.Agua).toBeCloseTo(12, 5);
  });

  it("totals modality with the same weights", () => {
    const m = modalityBalance(bilbao);
    expect(m.total).toBeCloseTo(20.5, 5);
    expect(m.dominant).toBe("Cardinal");
  });

  it("keeps every element and modality key present even at zero", () => {
    const b = elementBalance(bilbao);
    expect(Object.keys(b.totals).sort()).toEqual(["Agua", "Aire", "Fuego", "Tierra"]);
    const m = modalityBalance(bilbao);
    expect(Object.keys(m.totals).sort()).toEqual(["Cardinal", "Fijo", "Mutable"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/profile.test.ts`
Expected: FAIL — cannot resolve `../src/profile`

- [ ] **Step 3: Write the implementation**

Create `src/profile.ts`:

```ts
import type { Aspect, Body, NatalChart, Sign } from "./types";
import {
  ELEMENT, MODALITY, RULER, type Element, type Modality,
} from "./rulers";

export interface Placement {
  body: Body;
  sign: Sign;
  house: number;
  degree: number;
  retrograde: boolean;
}

export interface ChartRuler {
  ascendant: Sign;
  body: Body;
  sign: Sign;
  house: number;
  degree: number;
  /** True when the ruler sits in the sign it rules. */
  inDomicile: boolean;
}

export interface RelationshipProfile {
  descendant: { sign: Sign; degree: number };
  rulerOfSeventh: Placement;
  venus: Placement;
  mars: Placement;
  moon: Placement;
  seventhHouseTenants: Placement[];
  venusAspects: Aspect[];
  marsAspects: Aspect[];
}

export interface Balance<K extends string> {
  totals: Record<K, number>;
  dominant: K;
  weakest: K;
  total: number;
}

/**
 * How loudly each body speaks in an element/modality count. The angles are
 * included because a chart's feel is set as much by the ascendant as by the sun.
 */
export const WEIGHT: Record<Body, number> = {
  Sun: 3, Moon: 3, Mercury: 2, Venus: 2, Mars: 2,
  Jupiter: 1, Saturn: 1, Uranus: 0.5, Neptune: 0.5, Pluto: 0.5,
};
const ASCENDANT_WEIGHT = 3;
const MIDHEAVEN_WEIGHT = 2;

function planet(chart: NatalChart, body: Body): Placement {
  const p = chart.planets.find((x) => x.body === body)!;
  return {
    body: p.body, sign: p.sign, house: p.house,
    degree: p.signDegree, retrograde: p.retrograde,
  };
}

export function chartRuler(chart: NatalChart): ChartRuler {
  const ascendant = chart.angles.ascendant.sign;
  const body = RULER[ascendant];
  const p = planet(chart, body);
  return {
    ascendant, body, sign: p.sign, house: p.house, degree: p.degree,
    inDomicile: RULER[p.sign] === body,
  };
}

export function relationshipProfile(chart: NatalChart): RelationshipProfile {
  const dsc = chart.angles.descendant;
  const involves = (a: Aspect, body: Body) => a.a === body || a.b === body;
  return {
    descendant: { sign: dsc.sign, degree: dsc.signDegree },
    rulerOfSeventh: planet(chart, RULER[dsc.sign]),
    venus: planet(chart, "Venus"),
    mars: planet(chart, "Mars"),
    moon: planet(chart, "Moon"),
    seventhHouseTenants: chart.planets
      .filter((p) => p.house === 7)
      .map((p) => planet(chart, p.body)),
    venusAspects: chart.aspects.filter((a) => involves(a, "Venus")),
    marsAspects: chart.aspects.filter((a) => involves(a, "Mars")),
  };
}

function balance<K extends string>(
  chart: NatalChart,
  table: Record<Sign, K>,
  keys: K[],
): Balance<K> {
  const totals = Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;
  for (const p of chart.planets) totals[table[p.sign]] += WEIGHT[p.body];
  totals[table[chart.angles.ascendant.sign]] += ASCENDANT_WEIGHT;
  totals[table[chart.angles.midheaven.sign]] += MIDHEAVEN_WEIGHT;

  const ranked = keys.slice().sort((a, b) => totals[b] - totals[a]);
  return {
    totals,
    dominant: ranked[0],
    weakest: ranked[ranked.length - 1],
    total: keys.reduce((sum, k) => sum + totals[k], 0),
  };
}

export function elementBalance(chart: NatalChart): Balance<Element> {
  return balance<Element>(chart, ELEMENT, ["Fuego", "Tierra", "Aire", "Agua"]);
}

export function modalityBalance(chart: NatalChart): Balance<Modality> {
  return balance<Modality>(chart, MODALITY, ["Cardinal", "Fijo", "Mutable"]);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/profile.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add src/profile.ts tests/profile.test.ts
git commit -m "feat: chart ruler, relationship profile and element/modality balances"
```

---

### Task 3: Plain-Spanish copy tables

**Files:**
- Create: `src/copy/areas.es.ts`, `src/copy/signs.es.ts`
- Test: `tests/copy.test.ts`

**Interfaces:**
- Produces: `AREA_ES`, `SIGN_ES`, `SIGN_GLYPH`, `SUN_ES`, `MOON_ES`, `ASC_ES`, `PARTNER_ES`

Every string here is read by a person and must obey the gender rule exactly as
LLM output does. A gendered heading shipped in the prototype; that is why this
task has its own test.

- [ ] **Step 1: Write the failing test**

Create `tests/copy.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { AREA_ES } from "../src/copy/areas.es";
import { SIGN_ES, SIGN_GLYPH, SUN_ES, MOON_ES, ASC_ES, PARTNER_ES } from "../src/copy/signs.es";
import { SIGN_ORDER } from "../src/rulers";

const TABLES = { SUN_ES, MOON_ES, ASC_ES, PARTNER_ES, SIGN_ES, SIGN_GLYPH };

describe("area copy", () => {
  it("covers all twelve houses", () => {
    for (let h = 1; h <= 12; h++) {
      expect(AREA_ES[h]).toBeTruthy();
      expect(AREA_ES[h].length).toBeGreaterThan(10);
    }
  });

  it("never mentions a house number", () => {
    for (let h = 1; h <= 12; h++) expect(AREA_ES[h]).not.toMatch(/casa\s*\d|\bcasa\b/i);
  });
});

describe("sign copy", () => {
  it("covers all twelve signs in every table", () => {
    for (const [name, table] of Object.entries(TABLES)) {
      for (const sign of SIGN_ORDER) {
        expect(table[sign], `${name}.${sign}`).toBeTruthy();
      }
    }
  });

  it("keeps glyphs as engraved text, not colour emoji", () => {
    for (const sign of SIGN_ORDER) expect(SIGN_GLYPH[sign]).toContain("︎");
  });

  it("uses no astrology jargon in reader-facing lines", () => {
    const jargon = /regente|domicilio|casa\s*\d|tr[íi]gono|sextil|cuadratura|conjunci[óo]n|oposici[óo]n|orbe|retr[óo]grad/i;
    for (const table of [SUN_ES, MOON_ES, ASC_ES, PARTNER_ES]) {
      for (const sign of SIGN_ORDER) expect(table[sign]).not.toMatch(jargon);
    }
  });

  it("never names a sign inside its own description", () => {
    for (const table of [SUN_ES, MOON_ES, ASC_ES, PARTNER_ES]) {
      for (const sign of SIGN_ORDER) {
        expect(table[sign].toLowerCase()).not.toContain(SIGN_ES[sign].toLowerCase());
      }
    }
  });
});

describe("copy gender neutrality", () => {
  // Same shapes the output gate applies to the model. Hand-written copy is
  // held to the identical standard.
  const GENDERED = [
    /\b(?:t[uú]|ti|s[ií])\s+mism[oa]\b/iu,
    /\b(?:ser|estar|verte|sentirte|sentirse)\s+(?:\p{L}+(?:ad|id)|vist|hech|dich|puest|abiert)[oa]s?\b/iu,
    /\b(?:eres|seas|fueras|est[áa]s)\s+(?:m[áa]s\s+|muy\s+|tan\s+|un[ao]\s+)?\p{L}{4,}[oa]\b/iu,
    /\bte\s+(?:hace|vuelve|convierte)\s+(?:en\s+)?(?:m[áa]s\s+)?\p{L}+[oa]\b/iu,
    /\b(?:juntos|solos|cansad[oa]s?|tranquil[oa]s?)\b/iu,
  ];

  it("has no gendered agreement aimed at the reader", () => {
    for (const table of [SUN_ES, MOON_ES, ASC_ES, PARTNER_ES]) {
      for (const sign of SIGN_ORDER) {
        for (const re of GENDERED) {
          expect(table[sign], `${sign}: ${table[sign]}`).not.toMatch(re);
        }
      }
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/copy.test.ts`
Expected: FAIL — cannot resolve `../src/copy/areas.es`

- [ ] **Step 3: Write the area table**

Create `src/copy/areas.es.ts`:

```ts
/**
 * The twelve houses in words a reader already owns. This is the ONLY form in
 * which house information is allowed to reach a prompt — the model never sees
 * a house number, which is why it cannot write one.
 */
export const AREA_ES: Record<number, string> = {
  1: "cómo te presentas y el cuerpo con el que vas por el mundo",
  2: "el dinero, tus cosas y lo que consideras tuyo",
  3: "cómo hablas, escribes y te mueves por tu barrio",
  4: "tu hogar, tu familia y de dónde vienes",
  5: "lo que haces por gusto: crear, ligar, jugar",
  6: "tu día a día, el trabajo cotidiano y tus rutinas",
  7: "tus relaciones de tú a tú y con quién te emparejas",
  8: "lo que compartes a fondo con otra persona y lo que te transforma",
  9: "lo que crees, lo que estudias y lo lejos que viajas",
  10: "tu cara pública y a qué te dedicas delante de la gente",
  11: "tus amistades, tus grupos y lo que quieres para el futuro",
  12: "lo que pasa a puerta cerrada, contigo a solas",
};
```

- [ ] **Step 4: Write the sign tables**

Create `src/copy/signs.es.ts`:

```ts
import type { Sign } from "../types";

export const SIGN_ES: Record<Sign, string> = {
  Aries: "Aries", Taurus: "Tauro", Gemini: "Géminis", Cancer: "Cáncer",
  Leo: "Leo", Virgo: "Virgo", Libra: "Libra", Scorpio: "Escorpio",
  Sagittarius: "Sagitario", Capricorn: "Capricornio", Aquarius: "Acuario",
  Pisces: "Piscis",
};

/** U+FE0E keeps these as engraved text rather than colour emoji on Apple platforms. */
export const SIGN_GLYPH: Record<Sign, string> = {
  Aries: "♈︎", Taurus: "♉︎", Gemini: "♊︎", Cancer: "♋︎",
  Leo: "♌︎", Virgo: "♍︎", Libra: "♎︎", Scorpio: "♏︎",
  Sagittarius: "♐︎", Capricorn: "♑︎", Aquarius: "♒︎", Pisces: "♓︎",
};

/** Reads after "Quién eres cuando estás a gusto: ". */
export const SUN_ES: Record<Sign, string> = {
  Aries: "vas de frente y sin rodeos; si algo te apetece, ya estás en marcha.",
  Taurus: "vas a tu ritmo y no te mueve nadie; disfrutas de lo que se toca.",
  Gemini: "te enciendes hablando; necesitas curiosear y luego contarlo.",
  Cancer: "cuidas de los tuyos, y ahí es donde te crece el ánimo.",
  Leo: "te gusta que se te note, y no tienes por qué disimularlo.",
  Virgo: "te crece el ánimo cuando algo queda bien hecho y en su sitio.",
  Libra: "estás a gusto cuando hay buen ambiente y las cosas están igualadas.",
  Scorpio: "vas a fondo o no vas; lo tibio te aburre enseguida.",
  Sagittarius: "necesitas horizonte: planes, viajes, cosas por aprender.",
  Capricorn: "te crece el ánimo cuando construyes algo que dura.",
  Aquarius: "estás a gusto cuando haces las cosas a tu manera, aunque chirríe.",
  Pisces: "te enciendes con lo que te emociona, no con lo que te conviene.",
};

/** Reads after "Lo que necesitas para estar en paz: ". */
export const MOON_ES: Record<Sign, string> = {
  Aries: "moverte y soltarlo pronto; guardártelo te pudre el día.",
  Taurus: "calma, rutina y que no te cambien los planes a última hora.",
  Gemini: "hablarlo con alguien; si no lo cuentas, no lo entiendes.",
  Cancer: "tu gente, tu hogar, tus cosas. Sin eso no funcionas.",
  Leo: "que te hagan caso de verdad, no de pasada.",
  Virgo: "tener las cosas resueltas; el desorden te pone de los nervios.",
  Libra: "que no haya tensión alrededor; la bronca te deja mal cuerpo días.",
  Scorpio: "confiar del todo o nada; los términos medios te inquietan.",
  Sagittarius: "aire y libertad; si te aprietan, te vas.",
  Capricorn: "sentir que hay un plan y que aguanta.",
  Aquarius: "tu espacio; que te dejen respirar sin dar explicaciones.",
  Pisces: "silencio y un rato a solas para que se te pase.",
};

/** Reads after "Cómo te ve quien acaba de conocerte: ". */
export const ASC_ES: Record<Sign, string> = {
  Aries: "vas de cara y con prisa; se nota cuando llegas.",
  Taurus: "das calma; transmites que no hay ninguna urgencia.",
  Gemini: "caes bien enseguida y hablas con cualquiera.",
  Cancer: "das cercanía, pero no te abres a la primera.",
  Leo: "entras y se nota; ocupas sitio sin tener que pedirlo.",
  Virgo: "das sensación de orden y de estar pendiente del detalle.",
  Libra: "gustas de entrada; suavizas el ambiente sin querer.",
  Scorpio: "impones un poco; parece que estás midiendo.",
  Sagittarius: "das buen rollo y ganas de plan.",
  Capricorn: "pareces mayor de lo que eres y das confianza.",
  Aquarius: "chocas un poco al principio, y justo eso engancha.",
  Pisces: "das dulzura y cuesta situarte del todo.",
};

/** The plain line shown above the receipt in the compatibility module. */
export const PARTNER_ES: Record<Sign, string> = {
  Aries: "Te tira la gente con arranque, que decide rápido y no le da mil vueltas.",
  Taurus: "Necesitas calma y cero drama. Que las cosas vayan despacio, pero que vayan.",
  Gemini: "Te engancha quien te hace reír hablando y no repite conversación.",
  Cancer: "Te tira quien cuida de verdad: que pregunte, que se acuerde, que esté.",
  Leo: "Te engancha quien tiene luz propia y no la esconde.",
  Virgo: "Te tira quien se ocupa de las cosas sin que haya que pedirlo.",
  Libra: "Te engancha quien pone paz y hace fácil el día a día.",
  Scorpio: "Te tira la gente intensa, que va a fondo o no va.",
  Sagittarius: "Te engancha quien te propone planes y tira de ti.",
  Capricorn: "Te enganchan las personas serias, con su vida montada. Alguien que dice que viene a las ocho y viene a las ocho.",
  Aquarius: "Te tira quien va por libre y no te pide explicaciones.",
  Pisces: "Te engancha quien te entiende sin que tengas que explicarte.",
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/copy.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: PASS — Tasks 1-3 complete, ~76 tests

- [ ] **Step 7: Commit**

```bash
git add src/copy tests/copy.test.ts
git commit -m "feat: plain-Spanish copy tables for houses and signs"
```

---

### Task 4: Compatible signs and the friction sign

**Files:**
- Modify: `src/profile.ts` (append)
- Test: `tests/profile.test.ts` (append)

**Interfaces:**
- Consumes: Task 2 exports; `trineSigns`/`sextileSigns`/`squareSigns`/`SIGN_ORDER`/`signIndex` from Task 1; `SIGN_ES` from Task 3
- Produces: `SignScore`, `Friction`, `compatibleSigns()`, `frictionSign()`, `topMatches()`

Reason strings are written jargon-free on purpose — they surface in the UI as
the small "receipt" line under each match, so they must not contain the words
"regente", "casa 7", "trígono" or "sextil".

- [ ] **Step 1: Write the failing test**

Append to `tests/profile.test.ts`:

```ts
import { compatibleSigns, frictionSign, topMatches } from "../src/profile";
import { SIGN_ORDER, squareSigns } from "../src/rulers";

/** Same day and place as bilbao, six hours later: same Sun, different Ascendant. */
const bilbaoLater = chartFor({ year: 2000, month: 7, day: 30, hour: 10, minute: 15 }, 43.263, -2.935);

describe("compatibleSigns", () => {
  it("scores all twelve signs and sorts them descending", () => {
    const scored = compatibleSigns(bilbao);
    expect(scored).toHaveLength(12);
    expect(new Set(scored.map((s) => s.sign))).toEqual(new Set(SIGN_ORDER));
    for (let i = 1; i < scored.length; i++) {
      expect(scored[i - 1].score).toBeGreaterThanOrEqual(scored[i].score);
    }
  });

  it("puts the descendant sign first and explains why", () => {
    const top = compatibleSigns(bilbao)[0];
    expect(top.sign).toBe("Capricorn");
    expect(top.score).toBe(40);
    expect(top.reasons[0]).toContain("justo enfrente");
  });

  it("scores the sign holding the ruler of the seventh", () => {
    const taurus = compatibleSigns(bilbao).find((s) => s.sign === "Taurus")!;
    // 25 (Saturn, ruler of the 7th, sits there) + 7 (sextile to Mars in Cancer)
    expect(taurus.score).toBe(32);
  });

  it("weights the sun lowest of all the signals", () => {
    // Sagittarius gets 15 from Venus in Leo and only 5 from the Sun in Leo.
    const sag = compatibleSigns(bilbao).find((s) => s.sign === "Sagittarius")!;
    expect(sag.score).toBe(20);
    expect(sag.reasons).toHaveLength(2);
  });

  it("attaches a jargon-free reason to every contribution", () => {
    const jargon = /regente|casa\s*\d|tr[íi]gono|sextil|cuadratura|conjunci[óo]n|oposici[óo]n|orbe/i;
    for (const s of compatibleSigns(bilbao)) {
      for (const r of s.reasons) expect(r).not.toMatch(jargon);
    }
  });

  it("gives different answers for the same sun sign under a different ascendant", () => {
    expect(bilbaoLater.planets.find((p) => p.body === "Sun")!.sign).toBe("Leo");
    expect(bilbao.planets.find((p) => p.body === "Sun")!.sign).toBe("Leo");
    expect(bilbaoLater.angles.ascendant.sign).not.toBe(bilbao.angles.ascendant.sign);
    // This is the product's whole argument. If it ever stops being true, shout.
    expect(topMatches(bilbaoLater).map((s) => s.sign))
      .not.toEqual(topMatches(bilbao).map((s) => s.sign));
  });

  it("breaks ties by strongest single contribution, then zodiac order", () => {
    const scored = compatibleSigns(bilbao);
    const aries = scored.findIndex((s) => s.sign === "Aries");
    const sag = scored.findIndex((s) => s.sign === "Sagittarius");
    // Both score 20 with identical composition; Aries precedes Sagittarius.
    expect(aries).toBeLessThan(sag);
  });
});

describe("frictionSign", () => {
  it("squares the relationship axis", () => {
    const f = frictionSign(bilbao);
    expect(squareSigns("Capricorn")).toContain(f.sign);
    expect(f.sign).toBe("Aries");
  });

  it("picks the square sign you are also drawn to", () => {
    const scored = compatibleSigns(bilbao);
    const [a, b] = squareSigns("Capricorn");
    const scoreOf = (s: string) => scored.find((x) => x.sign === s)!.score;
    const expected = scoreOf(a) >= scoreOf(b) ? a : b;
    expect(frictionSign(bilbao).sign).toBe(expected);
  });

  it("explains itself without jargon", () => {
    expect(frictionSign(bilbao).reason).not.toMatch(/cuadratura|eje|Ascendente/i);
  });
});

describe("topMatches", () => {
  it("returns three signs and never the friction sign", () => {
    const top = topMatches(bilbao);
    expect(top).toHaveLength(3);
    expect(top.map((s) => s.sign)).not.toContain(frictionSign(bilbao).sign);
  });

  it("skips signs that scored nothing rather than padding", () => {
    for (const s of topMatches(bilbao)) expect(s.score).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/profile.test.ts`
Expected: FAIL — `compatibleSigns` is not exported

- [ ] **Step 3: Write the implementation**

Append to `src/profile.ts`:

```ts
import {
  SIGN_ORDER, signIndex, sextileSigns, squareSigns, trineSigns,
} from "./rulers";
import { SIGN_ES } from "./copy/signs.es";

export interface SignScore {
  sign: Sign;
  score: number;
  /** Plain-language receipts, shown under the match in the UI. */
  reasons: string[];
}

export interface Friction {
  sign: Sign;
  reason: string;
}

/**
 * Weights are the product's astrological opinion, written down on purpose.
 * The sun is worth least of everything: sun-sign compatibility is the thing
 * this product exists to be better than.
 */
const W = {
  descendant: 40,
  rulerOfSeventh: 25,
  seventhTenant: 20,
  venusTrine: 15,
  venusSextile: 10,
  marsTrine: 10,
  marsSextile: 7,
  moonElement: 8,
  sunTrine: 5,
  sunSextile: 3,
} as const;

export function compatibleSigns(chart: NatalChart): SignScore[] {
  const tally = new Map<Sign, { score: number; best: number; reasons: string[] }>();
  const add = (sign: Sign, score: number, reason: string) => {
    const cur = tally.get(sign) ?? { score: 0, best: 0, reasons: [] };
    cur.score += score;
    cur.best = Math.max(cur.best, score);
    cur.reasons.push(reason);
    tally.set(sign, cur);
  };

  const p = relationshipProfile(chart);
  const es = (s: Sign) => SIGN_ES[s];

  add(p.descendant.sign, W.descendant,
    `${es(p.descendant.sign)} es el signo que tienes justo enfrente`);

  const r7 = p.rulerOfSeventh;
  add(r7.sign, W.rulerOfSeventh,
    `${es(r7.sign)} es donde está ${r7.body === "Moon" ? "la Luna" : PLANET_ES[r7.body]}, el que manda en tus relaciones`);

  for (const t of p.seventhHouseTenants) {
    add(t.sign, W.seventhTenant,
      `tienes ${PLANET_ES[t.body]} en la zona de la pareja, en ${es(t.sign)}`);
  }

  for (const s of trineSigns(p.venus.sign)) {
    add(s, W.venusTrine, `tu Venus en ${es(p.venus.sign)} se lleva bien con ${es(s)}`);
  }
  for (const s of sextileSigns(p.venus.sign)) {
    add(s, W.venusSextile, `tu Venus en ${es(p.venus.sign)} encaja con ${es(s)}`);
  }
  for (const s of trineSigns(p.mars.sign)) {
    add(s, W.marsTrine, `tu Marte en ${es(p.mars.sign)} empuja en la misma dirección que ${es(s)}`);
  }
  for (const s of sextileSigns(p.mars.sign)) {
    add(s, W.marsSextile, `tu Marte en ${es(p.mars.sign)} encaja con ${es(s)}`);
  }
  for (const s of trineSigns(p.moon.sign)) {
    add(s, W.moonElement, `tu Luna en ${es(p.moon.sign)} está a gusto con ${es(s)}`);
  }

  const sun = chart.planets.find((x) => x.body === "Sun")!;
  for (const s of trineSigns(sun.sign)) {
    add(s, W.sunTrine, `tu Sol en ${es(sun.sign)} se lleva bien con ${es(s)}`);
  }
  for (const s of sextileSigns(sun.sign)) {
    add(s, W.sunSextile, `tu Sol en ${es(sun.sign)} encaja con ${es(s)}`);
  }

  return SIGN_ORDER
    .map((sign) => {
      const t = tally.get(sign);
      return { sign, score: t?.score ?? 0, best: t?.best ?? 0, reasons: t?.reasons ?? [] };
    })
    .sort((a, b) =>
      b.score - a.score ||
      b.best - a.best ||
      signIndex(a.sign) - signIndex(b.sign))
    .map(({ sign, score, reasons }) => ({ sign, score, reasons }));
}

/**
 * Of the two signs square to the relationship axis, the one you also score
 * highly for. Attraction and friction in the same place is the interesting case.
 */
export function frictionSign(chart: NatalChart): Friction {
  const scored = compatibleSigns(chart);
  const scoreOf = (s: Sign) => scored.find((x) => x.sign === s)!.score;
  const candidates = squareSigns(chart.angles.descendant.sign);
  const sign = candidates
    .slice()
    .sort((a, b) => scoreOf(b) - scoreOf(a) || signIndex(a) - signIndex(b))[0];
  return {
    sign,
    reason: `${SIGN_ES[sign]} te lleva la contraria: te atrae y te descoloca a la vez`,
  };
}

export function topMatches(chart: NatalChart, n = 3): SignScore[] {
  const friction = frictionSign(chart).sign;
  return compatibleSigns(chart)
    .filter((s) => s.sign !== friction && s.score > 0)
    .slice(0, n);
}
```

Add the planet-name table near the top of `src/profile.ts` (it is used by the
reason strings above):

```ts
const PLANET_ES: Record<Body, string> = {
  Sun: "el Sol", Moon: "la Luna", Mercury: "Mercurio", Venus: "Venus",
  Mars: "Marte", Jupiter: "Júpiter", Saturn: "Saturno", Uranus: "Urano",
  Neptune: "Neptuno", Pluto: "Plutón",
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/profile.test.ts`
Expected: PASS (21 tests)

- [ ] **Step 5: Commit**

```bash
git add src/profile.ts tests/profile.test.ts
git commit -m "feat: compatible signs scored from the relationship axis, not the sun"
```

---

### Task 5: Chart features and signature

**Files:**
- Modify: `src/profile.ts` (append)
- Test: `tests/profile.test.ts` (append)

**Interfaces:**
- Consumes: Tasks 1-4; `AREA_ES` and `SIGN_ES` from Task 3
- Produces: `FeatureKind`, `ChartFeature`, `Signature`, `chartFeatures()`, `selectFeature()`, `signature()`

`ChartFeature.payload` is what reaches the LLM. It must contain **no house
numbers, no aspect names, no orbs and no degrees** — only Spanish life-area
strings and plain relation phrases.

- [ ] **Step 1: Write the failing test**

Append to `tests/profile.test.ts`:

```ts
import { chartFeatures, selectFeature, signature } from "../src/profile";

describe("chartFeatures", () => {
  it("finds a stellium of three planets sharing a house", () => {
    const houses = chartFeatures(bilbao).filter((f) => f.kind === "cumulo-casa");
    expect(houses).toHaveLength(1);
    // Sun, Moon and Mars all sit in house 2.
    expect(houses[0].payload.planetas).toEqual(
      expect.arrayContaining(["el Sol", "la Luna", "Marte"]));
  });

  it("finds a stellium of three planets sharing a sign", () => {
    const signs = chartFeatures(bilbao).filter((f) => f.kind === "cumulo-signo");
    expect(signs).toHaveLength(1);
    expect(signs[0].payload.signo).toBe("Cáncer");
  });

  it("flags an element that barely registers", () => {
    const absent = chartFeatures(bilbao).find((f) => f.kind === "elemento-ausente");
    expect(absent).toBeDefined();
    expect(absent!.payload.falta).toBe("Tierra");
  });

  it("flags a ruler sitting in its own sign", () => {
    expect(chartFeatures(bilbao).some((f) => f.kind === "regente-domicilio")).toBe(true);
  });

  it("never leaks house numbers, degrees or aspect names into a payload", () => {
    const leak = /casa\s*\d|\d+\s*°|tr[íi]gono|sextil|cuadratura|conjunci[óo]n|oposici[óo]n|orbe/i;
    for (const f of chartFeatures(bilbao)) {
      expect(JSON.stringify(f.payload)).not.toMatch(leak);
    }
  });

  it("always offers at least one feature for any chart", () => {
    const plain = chartFor({ year: 1992, month: 4, day: 15, hour: 8, minute: 30 }, 40.4168, -3.7038);
    expect(chartFeatures(plain).length).toBeGreaterThan(0);
  });
});

describe("selectFeature", () => {
  it("prefers a house stellium over everything else", () => {
    expect(selectFeature(bilbao).kind).toBe("cumulo-casa");
  });

  it("is deterministic for a given chart", () => {
    expect(selectFeature(bilbao)).toEqual(selectFeature(bilbao));
  });
});

describe("signature", () => {
  it("reports the big-three combination and its rarity", () => {
    const s = signature(bilbao);
    expect(s.sun).toBe("Leo");
    expect(s.moon).toBe("Cancer");
    expect(s.ascendant).toBe("Cancer");
    expect(s.oneIn).toBe(1728);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/profile.test.ts`
Expected: FAIL — `chartFeatures` is not exported

- [ ] **Step 3: Write the implementation**

Append to `src/profile.ts`:

```ts
import { AREA_ES } from "./copy/areas.es";

export type FeatureKind =
  | "cumulo-casa"
  | "cumulo-signo"
  | "sin-aspectos"
  | "elemento-ausente"
  | "regente-domicilio"
  | "aspecto-estrecho";

export interface ChartFeature {
  kind: FeatureKind;
  /** Lower sorts first. */
  priority: number;
  /** Plain-Spanish payload — this is what the model actually receives. */
  payload: Record<string, unknown>;
}

const PRIORITY: Record<FeatureKind, number> = {
  "cumulo-casa": 1,
  "cumulo-signo": 2,
  "sin-aspectos": 3,
  "elemento-ausente": 4,
  "regente-domicilio": 5,
  "aspecto-estrecho": 6,
};

/** How a pair of planets get on, in words a reader already knows. */
function relationPhrase(type: Aspect["type"]): string {
  if (type === "conjunction") return "van pegados";
  if (type === "opposition" || type === "square") return "tiran cada uno para un lado";
  return "van de la mano";
}

const MIN_STELLIUM = 3;
const ABSENT_ELEMENT_THRESHOLD = 2;

export function chartFeatures(chart: NatalChart): ChartFeature[] {
  const out: ChartFeature[] = [];
  const push = (kind: FeatureKind, payload: Record<string, unknown>) =>
    out.push({ kind, priority: PRIORITY[kind], payload });

  const byHouse = new Map<number, Body[]>();
  const bySign = new Map<Sign, Body[]>();
  for (const p of chart.planets) {
    byHouse.set(p.house, [...(byHouse.get(p.house) ?? []), p.body]);
    bySign.set(p.sign, [...(bySign.get(p.sign) ?? []), p.body]);
  }

  for (const [house, bodies] of byHouse) {
    if (bodies.length < MIN_STELLIUM) continue;
    push("cumulo-casa", {
      zona: AREA_ES[house],
      planetas: bodies.map((b) => PLANET_ES[b]),
      significa: "ahí se le va casi toda la energía",
    });
  }

  for (const [sign, bodies] of bySign) {
    if (bodies.length < MIN_STELLIUM) continue;
    push("cumulo-signo", {
      signo: SIGN_ES[sign],
      planetas: bodies.map((b) => PLANET_ES[b]),
      significa: "esa forma de ser tiñe todo lo demás",
    });
  }

  const aspected = new Set<Body>();
  for (const a of chart.aspects) { aspected.add(a.a); aspected.add(a.b); }
  for (const p of chart.planets) {
    if (aspected.has(p.body)) continue;
    push("sin-aspectos", {
      planeta: PLANET_ES[p.body],
      signo: SIGN_ES[p.sign],
      zona: AREA_ES[p.house],
      significa: "eso funciona por su cuenta, sin negociar con el resto",
    });
  }

  const elements = elementBalance(chart);
  if (elements.totals[elements.weakest] < ABSENT_ELEMENT_THRESHOLD) {
    push("elemento-ausente", {
      falta: elements.weakest,
      significa: "es justo lo que le cuesta y lo que va buscando fuera",
    });
  }

  const ruler = chartRuler(chart);
  if (ruler.inDomicile) {
    push("regente-domicilio", {
      planeta: PLANET_ES[ruler.body],
      signo: SIGN_ES[ruler.sign],
      zona: AREA_ES[ruler.house],
      significa: "juega en casa: manda desde su propio terreno",
    });
  }

  const tightest = chart.aspects[0];
  if (tightest) {
    push("aspecto-estrecho", {
      planetas: [PLANET_ES[tightest.a], PLANET_ES[tightest.b]],
      relacion: relationPhrase(tightest.type),
      significa: "es el lazo más fuerte de toda la carta",
    });
  }

  return out.sort((a, b) => a.priority - b.priority);
}

/**
 * One feature, chosen by us. Handing the model a menu made it fuse two
 * features into a claim that was true of neither.
 */
export function selectFeature(chart: NatalChart): ChartFeature {
  return chartFeatures(chart)[0];
}

export interface Signature {
  sun: Sign;
  moon: Sign;
  ascendant: Sign;
  /** Honest combinatorial rarity: 12 x 12 x 12. Not a made-up percentage. */
  oneIn: number;
}

export function signature(chart: NatalChart): Signature {
  return {
    sun: chart.planets.find((p) => p.body === "Sun")!.sign,
    moon: chart.planets.find((p) => p.body === "Moon")!.sign,
    ascendant: chart.angles.ascendant.sign,
    oneIn: 12 * 12 * 12,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/profile.test.ts`
Expected: PASS (30 tests)

- [ ] **Step 5: Commit**

```bash
git add src/profile.ts tests/profile.test.ts
git commit -m "feat: chart feature detection with plain-Spanish payloads"
```

---

### Task 6: Extract the gate into `src/validate.ts` without changing behaviour

**Files:**
- Create: `src/validate.ts`
- Modify: `src/report.ts` (remove gate code, re-export from validate)
- Test: `tests/report.test.ts` (unchanged — that is the point)

**Interfaces:**
- Produces: `Validation`, `ProseOptions`, `validateProse()`, `validateTeaser()`

This task must not change a single assertion. `tests/report.test.ts` imports
`validateTeaser` from `../src/report`, and it must keep passing untouched.

- [ ] **Step 1: Create validate.ts by moving code**

Create `src/validate.ts`. Move these from `src/report.ts` verbatim:
`TeaserValidation` (rename to `Validation`), `TEASER_MIN_WORDS`,
`TEASER_MAX_WORDS`, `PLANET_ES`, `ASPECT_ES`, `GENDERED_PATTERNS`,
`sentencesOf()`, `planetsIn()`, `validateTeaser()`.

Then generalise the word range without changing the default:

```ts
export interface Validation {
  ok: boolean;
  problems: string[];
}

export interface ProseOptions {
  minWords: number;
  maxWords: number;
}

const TEASER_RANGE: ProseOptions = { minWords: 110, maxWords: 175 };

/** The original teaser gate, unchanged in behaviour. */
export function validateTeaser(text: string, chart: NatalChart): Validation {
  return validateProse(text, chart, TEASER_RANGE);
}

export function validateProse(
  text: string,
  chart: NatalChart,
  opts: ProseOptions,
): Validation {
  // ...body of the old validateTeaser, with the two word-count constants
  // replaced by opts.minWords / opts.maxWords
}
```

- [ ] **Step 2: Re-export from report.ts**

In `src/report.ts`, delete the moved code and add:

```ts
export { validateTeaser, validateProse } from "./validate";
export type { Validation, ProseOptions } from "./validate";
```

Keep `export type TeaserValidation = Validation;` if any caller still uses the
old name — check with `grep -rn "TeaserValidation" src web tests` first and
delete the alias if nothing references it.

- [ ] **Step 3: Run the full suite to prove nothing changed**

Run: `npm test`
Expected: PASS, same count as before this task (~92). If any assertion in
`tests/report.test.ts` changed, the extraction was not faithful — revert and redo.

- [ ] **Step 4: Verify the tsx path still works**

Run: `npm run example`
Expected: prints a sample chart with no module-resolution error.

- [ ] **Step 5: Commit**

```bash
git add src/validate.ts src/report.ts
git commit -m "refactor: extract output gate into validate.ts, behaviour unchanged"
```

---

### Task 7: New gate checks

**Files:**
- Modify: `src/validate.ts`
- Test: `tests/validate.test.ts`

**Interfaces:**
- Consumes: Task 6
- Produces: `JARGON`, `CLICHES`, extended `validateProse()` with `ProseOptions.allowHeading`

The bad-case corpus below is real output captured during diagnosis, not
invented. Each string shipped from the model and got past the old gate.

- [ ] **Step 1: Write the failing test**

Create `tests/validate.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { computeNatalChart } from "../src/chart";
import { resolveBirthUtc } from "../src/birthtime";
import { validateProse } from "../src/validate";

const { utc } = resolveBirthUtc({ year: 2000, month: 7, day: 30, hour: 4, minute: 15 }, 43.263, -2.935);
const bilbao = computeNatalChart({ utc, latitude: 43.263, longitude: -2.935 });

const RANGE = { minWords: 1, maxWords: 500 };
const check = (text: string) => validateProse(text, bilbao, RANGE);
const problems = (text: string) => check(text).problems.join(" | ");

describe("jargon ban", () => {
  it.each([
    "forman una conjunción exacta",
    "ese trígono entre tu Sol y Plutón",
    "el regente de tu casa 7 es Saturno",
    "Mercurio en Cáncer en la casa 1",
    "con apenas 1,29º de orbe",
    "Plutón retrógrado en Escorpio",
  ])("rejects %s", (text) => {
    expect(check(text).ok).toBe(false);
  });

  it("allows plain planet and sign names", () => {
    expect(check("Tu Venus en Leo quiere que te miren.").ok).toBe(true);
  });
});

describe("cliché ban", () => {
  it("rejects the model's favourite phrases", () => {
    expect(problems("una intuición casi telepática")).toContain("cliché");
    expect(problems("una danza entre dos necesidades")).toContain("cliché");
    expect(problems("bajo esa coraza emocional")).toContain("cliché");
  });

  it("rejects sample lines copied out of the prompt", () => {
    expect(problems("quieres fuegos artificiales con alguien que llegue puntual"))
      .toContain("cliché");
  });
});

describe("false placement claims", () => {
  it("catches a planet placed in the wrong sign", () => {
    // Jupiter is in Gemini, not Taurus.
    expect(problems("tu Júpiter en Tauro")).toContain("signo");
  });

  it("accepts a correct sign claim", () => {
    expect(check("tu Júpiter en Géminis").ok).toBe(true);
  });
});

describe("gendered phrasing aimed at the reader", () => {
  it.each([
    "te convierte en una diplomática innata",
    "eso te hace más profundo de lo que pareces",
    "no es que seas tacaño con el dinero",
    "cuando estás emocionado se te nota",
    "que te digan que eres única",
    "ni tú misma lo ves del todo",
    "necesitas ser vista",
  ])("rejects %s", (text) => {
    expect(check(text).ok).toBe(false);
  });

  it("accepts the neutral rewrite", () => {
    expect(check("necesitas que te miren y que te lo digan").ok).toBe(true);
    expect(check("eres alguien que se guarda las cosas").ok).toBe(true);
  });
});

describe("partner gendering", () => {
  it("rejects gendering the other person", () => {
    expect(check("quien se siente envuelto por tu calidez").ok).toBe(false);
    expect(check("cuando tu chica te lo pide").ok).toBe(false);
  });

  it("accepts neutral forms", () => {
    expect(check("quien tienes delante no siempre lo entiende").ok).toBe(true);
  });
});

describe("headings", () => {
  it("rejects a heading when the interface already prints one", () => {
    expect(problems("## En el amor\n\nTu Venus en Leo.")).toContain("encabezado");
  });

  it("allows headings when asked to", () => {
    const v = validateProse("## APERTURA\n\nTexto.", bilbao, { ...RANGE, allowHeading: true });
    expect(v.problems.join(" ")).not.toContain("encabezado");
  });
});

describe("word range", () => {
  it("reports counts outside the range", () => {
    expect(problems("corto")).toBe("");
    const v = validateProse("una dos tres", bilbao, { minWords: 5, maxWords: 10 });
    expect(v.problems.join(" ")).toContain("palabras");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/validate.test.ts`
Expected: FAIL — jargon, cliché, sign and gender cases all pass validation today

- [ ] **Step 3: Write the implementation**

Add to `src/validate.ts`:

```ts
import { SIGN_ES } from "./copy/signs.es";

/**
 * Words the reader does not know. The prose layer never receives any of these,
 * so their presence means the model reached for training data instead of the
 * facts it was handed.
 */
const JARGON = [
  "conjunción", "conjuncion", "oposición", "oposicion", "cuadratura",
  "trígono", "trigono", "sextil", "aspecto", "orbe", "regente", "regir",
  "domicilio", "exaltación", "retrógrad", "retrograd", "cúspide", "cuspide",
  "tránsito", "transito", "efeméride", "efemeride", "modalidad",
];

/** Model tics and any sample phrasing that has leaked out of a prompt. */
const CLICHES = [
  "casi telep", "una danza", "un pozo de", "coraza", "montaña rusa",
  "media naranja", "alma gemela", "energía magnética", "sin filtro",
  "fuegos artificiales", "llegue puntual", "eres de los que",
];

/**
 * Reader-directed constructions that force gender agreement. A false positive
 * costs one cheap retry; a false negative ships a gendered reading.
 */
const GENDERED_READER = [
  /\b(?:t[uú]|ti|s[ií])\s+mism[oa]\b/iu,
  /\b(?:ser|estar|verte|sentirte|sentirse|saberte|mostrarte)\s+(?:\p{L}+(?:ad|id)|vist|hech|dich|puest|abiert|escrit|vuelt|satisfech)[oa]s?\b/iu,
  /\b(?:eres|seas|fueras|ser[íi]as|est[áa]s|estabas|te\s+sientes|te\s+ves)\s+(?:m[áa]s\s+|muy\s+|tan\s+|un[ao]\s+|demasiado\s+)?\p{L}{4,}[oa]\b/iu,
  /\bte\s+(?:hace|vuelve|convierte)\s+(?:en\s+)?(?:m[áa]s\s+)?\p{L}+[oa]\b/iu,
];

const GENDERED_PARTNER = [
  /\btu\s+(?:chico|chica|marido|mujer|novio|novia|pareja\s+\p{L}+[oa])\b/iu,
  /\bquien\s+(?:se\s+)?\p{L}+\s+(?:envuelto|envuelta|comprendido|comprendida|amado|amada|perdido|perdida)\b/iu,
];

const PLANET_TO_BODY: Record<string, Body> = {
  sol: "Sun", luna: "Moon", mercurio: "Mercury", venus: "Venus", marte: "Mars",
  "júpiter": "Jupiter", jupiter: "Jupiter", saturno: "Saturn", urano: "Uranus",
  neptuno: "Neptune", "plutón": "Pluto", pluton: "Pluto",
};
```

Extend `ProseOptions` and the body of `validateProse`:

```ts
export interface ProseOptions {
  minWords: number;
  maxWords: number;
  /** Set when the block legitimately carries its own heading. */
  allowHeading?: boolean;
}
```

Inside `validateProse`, after the existing checks, add:

```ts
  const lower = trimmed.toLowerCase();

  for (const word of JARGON) {
    if (lower.includes(word)) problems.push(`jerga prohibida: "${word}"`);
  }
  if (/\bcasa\s*\d/i.test(trimmed)) problems.push("jerga prohibida: casa numerada");

  for (const phrase of CLICHES) {
    if (lower.includes(phrase)) problems.push(`cliché prohibido: "${phrase}"`);
  }

  for (const re of GENDERED_READER) {
    const m = trimmed.match(re);
    if (m) problems.push(`marca de género: "${m[0]}"`);
  }
  for (const re of GENDERED_PARTNER) {
    const m = trimmed.match(re);
    if (m) problems.push(`género de la pareja: "${m[0]}"`);
  }

  if (!opts.allowHeading && /^\s*#{1,3}\s/m.test(trimmed)) {
    problems.push("encabezado emitido: la interfaz ya pone el título");
  }

  // A named sign must be the sign that planet actually occupies.
  const signClaim = /\b(?:tu\s+)?(Sol|Luna|Mercurio|Venus|Marte|J[úu]piter|Saturno|Urano|Neptuno|Plut[óo]n)\s+en\s+(\p{Lu}\p{L}+)/giu;
  for (const m of trimmed.matchAll(signClaim)) {
    const body = PLANET_TO_BODY[m[1].toLowerCase()];
    if (!body) continue;
    const actual = chart.planets.find((p) => p.body === body);
    if (!actual) continue;
    const actualEs = SIGN_ES[actual.sign];
    const claimed = m[2];
    // Only judge words that are actually sign names; "Venus en casa" is caught above.
    const isSignName = Object.values(SIGN_ES)
      .some((s) => s.toLowerCase() === claimed.toLowerCase());
    if (isSignName && claimed.toLowerCase() !== actualEs.toLowerCase()) {
      problems.push(`signo falso: ${m[1]} está en ${actualEs}, el texto dice ${claimed}`);
    }
  }
```

Note the existing aspect-vocabulary and retrograde checks stay in place as a
safety net even though the jargon ban makes them mostly unreachable.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/validate.test.ts`
Expected: PASS (13 tests)

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS. If `tests/report.test.ts` now fails, an existing teaser fixture
contains jargon — that is expected, since the old teaser prompt allowed it.
Update those fixtures to call `validateProse` with the old options rather than
weakening the new checks.

- [ ] **Step 6: Commit**

```bash
git add src/validate.ts tests/validate.test.ts
git commit -m "feat: gate rejects jargon, cliches, false signs and gendered phrasing"
```

---

### Task 8: Deterministic repair pass

**Files:**
- Modify: `src/validate.ts`
- Test: `tests/validate.test.ts` (append)

**Interfaces:**
- Produces: `repair()`

Repair runs *before* the gate so a trivial slip does not spend a ~5 s retry.
Literal substitutions only — never semantic rewriting.

- [ ] **Step 1: Write the failing test**

Append to `tests/validate.test.ts`:

```ts
import { repair } from "../src/validate";

describe("repair", () => {
  it.each([
    ["que eres única", "que no hay nadie como tú"],
    ["necesitas ser vista", "necesitas que te miren"],
    ["quieres ser admirada", "quieres que te admiren"],
    ["sentirte comprendida", "que te entiendan"],
    ["ni tú misma lo ves", "ni tú lo ves"],
    ["eres de los que guardan", "eres de quienes guardan"],
  ])("rewrites %s", (input, expected) => {
    expect(repair(input)).toContain(expected);
  });

  it("turns a rejected text into a passing one", () => {
    const before = "Tu Venus en Leo necesita ser vista y que te lo digan.";
    expect(check(before).ok).toBe(false);
    expect(check(repair(before)).ok).toBe(true);
  });

  it("leaves clean text untouched", () => {
    const clean = "Tu Venus en Leo necesita que te miren.";
    expect(repair(clean)).toBe(clean);
  });

  it("does not attempt semantic repair of unknown phrasing", () => {
    const unknown = "no es que seas tacaño con el dinero";
    expect(repair(unknown)).toBe(unknown);
    expect(check(repair(unknown)).ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/validate.test.ts`
Expected: FAIL — `repair` is not exported

- [ ] **Step 3: Write the implementation**

Add to `src/validate.ts`:

```ts
/**
 * Literal, deterministic rewrites of stock gendered phrasing. Applied before
 * the gate so a known slip costs no retry. Whitelist only: if a phrasing is
 * not on this list it goes to the gate untouched and gets rejected there.
 */
const REPAIRS: Array<[RegExp, string]> = [
  [/\bque\s+eres\s+[úu]nic[ao]\b/giu, "que no hay nadie como tú"],
  [/\beres\s+[úu]nic[ao]\b/giu, "no hay nadie como tú"],
  [/\bser\s+vist[ao]\b/giu, "que te miren"],
  [/\bser\s+admirad[ao]\b/giu, "que te admiren"],
  [/\bser\s+reconocid[ao]\b/giu, "que te reconozcan"],
  [/\bsentirte\s+querid[ao]\b/giu, "que te quieran"],
  [/\bsentirte\s+comprendid[ao]\b/giu, "que te entiendan"],
  [/\bni\s+t[úu]\s+mism[ao]\b/giu, "ni tú"],
  [/\beres\s+de\s+los\s+que\b/giu, "eres de quienes"],
];

export function repair(text: string): string {
  let out = text;
  for (const [re, replacement] of REPAIRS) out = out.replace(re, replacement);
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/validate.test.ts`
Expected: PASS (17 tests)

- [ ] **Step 5: Commit**

```bash
git add src/validate.ts tests/validate.test.ts
git commit -m "feat: deterministic repair pass for stock gendered phrasing"
```

---

### Task 9: Shared prompt rules fragment

**Files:**
- Create: `prompts/rules-universal.md`
- Modify: `src/report.ts` (`loadPrompt` composition)
- Modify: `prompts/system-report.md`, `prompts/system-teaser.md`
- Test: `tests/report.test.ts` (existing assertions must still pass)

**Interfaces:**
- Produces: `loadPrompt(name)` resolving `{{RULES}}` from `prompts/rules-universal.md`

Rules are currently copy-pasted across prompt files and have already drifted
once. With a third prompt arriving in Task 10, compose them instead.

- [ ] **Step 1: Write the failing test**

Append to `tests/report.test.ts`:

```ts
describe("shared rules fragment", () => {
  it("injects the universal rules into every prompt", () => {
    const report = buildReportMessages({ chart })[0].content;
    const teaser = buildTeaserMessages({ chart })[0].content;
    for (const prompt of [report, teaser]) {
      expect(prompt).toContain("No asumas ni indiques el género de la persona");
      expect(prompt).not.toContain("{{RULES}}");
    }
  });

  it("keeps the content bans in both prompts", () => {
    for (const prompt of [buildReportMessages({ chart })[0].content,
                          buildTeaserMessages({ chart })[0].content]) {
      expect(prompt).toMatch(/salud/i);
      expect(prompt).toMatch(/muerte/i);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/report.test.ts`
Expected: FAIL — `{{RULES}}` assertion is vacuous today but the composition
does not exist; add the placeholder in Step 3 and this becomes meaningful.

- [ ] **Step 3: Create the fragment**

Create `prompts/rules-universal.md`. This consolidates the rules currently
duplicated across both prompt files and adds the two gaps found in real output
— the gendered-noun ban and the partner-gender ban:

```markdown
# Reglas

Solo puedes afirmar lo que los datos contienen, y cada afirmación debe nombrar el dato que la sustenta. Si un dato no está, no existe: no lo inventes ni lo deduzcas.

Las palabras "conjunción", "oposición", "cuadratura", "trígono", "sextil" y "aspecto" solo pueden aplicarse a pares de planetas que figuren en la lista `aspects`: que dos planetas ocupen signos opuestos o del mismo elemento NO es un aspecto, y si un par no está en la lista, describe cómo conviven esas energías sin vocabulario de aspectos.

La palabra "retrógrado" solo puede aplicarse a un planeta cuyo campo `retrograde` sea `true`; jamás a ningún otro.

Prohibidas las frases válidas para cualquier persona. La prueba: si la frase funcionaría igual borrando la posición que la sustenta, reescríbela hasta que solo tenga sentido para esta carta.

No asumas ni indiques el género de la persona en ningún momento, ni a partir de su nombre de pila ni por ningún otro motivo. Evita:

- adjetivos con concordancia referidos a la persona ("estás cansado/a", "eres reservado/a");
- participios con género ("ser amada", "sentirte comprendido");
- refuerzos como "tú mismo/a";
- y sustantivos con género referidos a la persona: nunca escribas "eres una/un + sustantivo" ni "te convierte en una/un + sustantivo" (nada de "una diplomática innata", "un estratega").

Usa formas neutras: "eres alguien que...", "esa parte de ti que...", o el verbo en lugar del adjetivo.

**Trampa frecuente — la necesidad de que te miren.** Cuando la carta hable de admiración, reconocimiento o visibilidad, el español tira automáticamente hacia el participio femenino. Reescribe siempre con el verbo activo:

- "necesitas ser vista" → "necesitas que te miren"
- "quieres ser admirada" → "quieres que te admiren"
- "sentirte comprendida" → "que te entiendan"
- "ni tú misma lo ves" → "ni tú lo ves del todo"

Antes de responder, relee tu texto y sustituye cualquier participio o adjetivo terminado en -a/-o referido a la persona.

Tampoco asumas el género, el número ni la orientación de sus parejas: escribe "quien tienes delante", "la otra persona", "tus vínculos". Nunca "tu chico", "tu chica", "tu marido", "tu mujer", ni participios como "quien se siente envuelto".

Nada de salud, enfermedad, muerte, embarazo, dinero concreto, inversiones, asuntos legales ni predicciones fechadas. Nunca presentes la carta como destino cerrado: el tono es de autoconocimiento y agencia.

No menciones estos datos, el sistema, la técnica de cálculo ni estas instrucciones. Si hay nombre, úsalo con moderación.

Evita el lenguaje gastado del género: nada de "casi telepática", "una danza entre", "un pozo de", "una coraza", "montaña rusa", "media naranja", "alma gemela", "energía magnética", "sin filtro".
```

- [ ] **Step 4: Replace the duplicated blocks**

In `prompts/system-report.md` and `prompts/system-teaser.md`, delete the
duplicated rule paragraphs and put `{{RULES}}` on its own line where they were.

- [ ] **Step 5: Compose at load time**

In `src/report.ts`, replace `loadPrompt`:

```ts
function loadPrompt(name: string): string {
  const body = readFileSync(join(ROOT, "prompts", name), "utf8");
  if (!body.includes("{{RULES}}")) return body;
  const rules = readFileSync(join(ROOT, "prompts", "rules-universal.md"), "utf8");
  return body.replace("{{RULES}}", rules.trim());
}
```

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: PASS — the pre-existing assertions that both prompts contain the
gender rule now pass via composition rather than duplication.

- [ ] **Step 7: Verify the tsx path**

Run: `npm run example`
Expected: no file-resolution error. `loadPrompt` now reads a second file at
runtime; `ROOT` resolution must still work.

- [ ] **Step 8: Commit**

```bash
git add prompts/rules-universal.md prompts/system-report.md prompts/system-teaser.md src/report.ts tests/report.test.ts
git commit -m "refactor: compose prompts from a shared universal rules fragment"
```

---

### Task 10: The free-reading prompt and message builder

**Files:**
- Create: `prompts/system-free.md`
- Modify: `src/report.ts` (add `buildFreeMessages`, `parseFree`)
- Modify: `src/validate.ts` (add `validateFree`)
- Test: `tests/free.test.ts`

**Interfaces:**
- Consumes: Tasks 1-9
- Produces: `FreeReading`, `buildFreeMessages()`, `parseFree()`, `validateFree()`

- [ ] **Step 1: Write the failing test**

Create `tests/free.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { computeNatalChart } from "../src/chart";
import { resolveBirthUtc } from "../src/birthtime";
import { buildFreeMessages, parseFree } from "../src/report";
import { validateFree } from "../src/validate";

const { utc } = resolveBirthUtc({ year: 2000, month: 7, day: 30, hour: 4, minute: 15 }, 43.263, -2.935);
const bilbao = computeNatalChart({ utc, latitude: 43.263, longitude: -2.935 });

describe("buildFreeMessages", () => {
  it("sends exactly one chosen feature, not a menu", () => {
    const user = buildFreeMessages({ chart: bilbao })[1].content;
    const payload = JSON.parse(user.match(/rasgo:\n(\{[\s\S]*?\})\n\n/)![1]);
    expect(payload).toBeTruthy();
    expect(Array.isArray(payload)).toBe(false);
  });

  it("never leaks house numbers, degrees or aspect names to the model", () => {
    const all = buildFreeMessages({ chart: bilbao }).map((m) => m.content).join("\n");
    expect(all).not.toMatch(/"house"/);
    expect(all).not.toMatch(/casa\s*\d/i);
    expect(all).not.toMatch(/"degree"/);
    expect(all).not.toMatch(/tr[íi]gono|sextil|cuadratura|"conjunction"|"opposition"/i);
  });

  it("carries no PII beyond a sanitized first name", () => {
    const all = buildFreeMessages({ chart: bilbao, firstName: "Lucía" })
      .map((m) => m.content).join("\n");
    expect(all).toContain("Lucía");
    expect(all).not.toContain("2000");
    expect(all).not.toContain("43.26");
  });

  it("stays small — the prompt dominates cost", () => {
    const user = buildFreeMessages({ chart: bilbao })[1].content;
    expect(user.length).toBeLessThan(3000);
  });
});

describe("parseFree", () => {
  const good = "## APERTURA\n\nTexto de apertura.\n\n## AMOR\n\nLa frase gancho.\n\nY el desarrollo.";

  it("splits the two blocks", () => {
    const r = parseFree(good)!;
    expect(r.apertura).toBe("Texto de apertura.");
    expect(r.amor).toContain("La frase gancho.");
  });

  it("pulls the hook out as the first line of the love block", () => {
    expect(parseFree(good)!.hook).toBe("La frase gancho.");
  });

  it("returns null when the model breaks the structure", () => {
    expect(parseFree("Sin encabezados")).toBeNull();
    expect(parseFree("## APERTURA\n\nSolo una parte.")).toBeNull();
  });

  it("tolerates a single hash and stray whitespace", () => {
    expect(parseFree("# APERTURA\n\nA.\n\n#  AMOR \n\nB.")).not.toBeNull();
  });
});

describe("validateFree", () => {
  it("checks each block against its own word range", () => {
    const short = { apertura: "corto", amor: "corto", hook: "corto" };
    const v = validateFree(short, bilbao);
    expect(v.ok).toBe(false);
    expect(v.problems.join(" ")).toContain("apertura");
    expect(v.problems.join(" ")).toContain("amor");
  });

  it("rejects jargon in either block", () => {
    const words = (n: number) => Array(n).fill("palabra").join(" ");
    const bad = {
      apertura: `${words(120)} con una conjunción exacta`,
      amor: words(90),
      hook: "gancho",
    };
    expect(validateFree(bad, bilbao).ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/free.test.ts`
Expected: FAIL — `buildFreeMessages` is not exported

- [ ] **Step 3: Write the prompt**

Create `prompts/system-free.md` with exactly this content:

```markdown
# Rol

Eres una astróloga española que le está leyendo la carta a una amiga en la cocina. Escribes en español de España, de tú, en lenguaje corriente. Tu lectora no sabe nada de astrología y no tiene por qué aprender: nunca ha oído hablar de orbes, regentes ni casas, y si se lo sueltas, cierra la página.

Recibirás datos ya calculados. Tu trabajo es traducirlos a lenguaje humano, no volver a calcularlos.

# Prohibido el vocabulario técnico

NO puedes usar ninguna de estas palabras: conjunción, oposición, cuadratura, trígono, sextil, aspecto, orbe, grado, regente, regir, domicilio, exaltación, retrógrado, casa 1 (ni ninguna otra casa numerada), cúspide, tránsito, natal, carta, efeméride, elemento, modalidad, cardinal, fijo, mutable, eje.

Sí puedes nombrar planetas (tu Venus, tu Luna, tu Marte) y signos (en Leo, en Capricornio), porque son las dos únicas palabras que todo el mundo reconoce. Nada más.

Cuando dos planetas se lleven bien, dilo así: "tu Venus y tu Sol van de la mano". Cuando se lleven mal: "tu Venus y tu Urano tiran cada uno para un lado". Cuando estén juntos: "tu Marte va pegado a tu Luna". Cuando algo ocurra en una zona de la vida, nombra la zona, nunca el número: "en el dinero y en lo que consideras tuyo", "en cómo hablas", "a puerta cerrada", "delante de la gente".

# Tarea

Devuelve exactamente dos bloques, con estos encabezados literales y nada más:

## APERTURA

Entre 100 y 140 palabras, un solo párrafo. Escribe SOLO sobre el rasgo que te doy en `rasgo`. No lo busques por tu cuenta, no lo mezcles con ningún otro dato y no le añadas planetas ni zonas que no vengan ahí dentro.

Explica qué significa en la vida real de una persona: cómo se nota, en qué situaciones, qué haría alguien así un martes cualquiera. Concreto y cotidiano, nada de abstracciones. Cierra con una frase que apunte a algo que no has contado.

No repitas el Sol, la Luna ni el Ascendente: la pantalla ya los muestra.

## AMOR

Entre 70 y 100 palabras — el máximo de 100 es estricto: cuéntalas y recorta antes de responder. La frase de apertura cuenta dentro del total.

La primera línea es una sola frase corta y rotunda que nombre la contradicción amorosa de esta persona, pensada para que alguien la lea, se ría y le haga una captura de pantalla. Que suene a verdad incómoda y con gracia, no a horóscopo de revista. Tiene que salir de los datos concretos de ESTA persona, no de una plantilla.

Después, dos o tres frases que lo desarrollen en lenguaje llano, apoyándote en lo que te doy en `amor`. Termina en seco, sin moraleja, sin consejos y sin vender nada.

{{RULES}}
```

Two things about this file that are load-bearing:

**It asks for less than the gate allows.** Measured: requesting 70-110 returned
118, 127 and 131 words across three runs. Requesting 70-100 with "cuéntalas y
recorta" landed in range on the first attempt.

**There is not one literal example sentence in it, deliberately.** An earlier
draft carried a sample hook line to illustrate the register; the model returned
it word for word. Any example in a prompt is a tic waiting to happen — which is
also why those phrases are in the `CLICHES` blocklist from Task 7.

- [ ] **Step 4: Write the builder and parser**

Add to `src/report.ts`:

```ts
import { relationshipProfile, selectFeature } from "./profile";
import { AREA_ES } from "./copy/areas.es";
import { SIGN_ES } from "./copy/signs.es";

export interface FreeReading {
  apertura: string;
  amor: string;
  /** First line of the love block — the screenshot unit. */
  hook: string;
}

/** Everything the model learns about the relationship axis, in plain Spanish. */
function loveFacts(chart: NatalChart) {
  const p = relationshipProfile(chart);
  const phrase = (t: string) =>
    t === "conjunction" ? "van pegados"
    : t === "opposition" || t === "square" ? "tiran cada uno para un lado"
    : "van de la mano";
  return {
    como_quieres: { planeta: "tu Venus", signo: SIGN_ES[p.venus.sign], zona: AREA_ES[p.venus.house] },
    a_quien_buscas: {
      signo: SIGN_ES[p.descendant.sign],
      nota: "es el signo que tienes justo enfrente: el tipo de persona hacia la que miras",
    },
    quien_manda_en_tus_relaciones: {
      signo: SIGN_ES[p.rulerOfSeventh.sign],
      zona: AREA_ES[p.rulerOfSeventh.house],
    },
    que_persigues: { planeta: "tu Marte", signo: SIGN_ES[p.mars.sign], zona: AREA_ES[p.mars.house] },
    tensiones: [...p.venusAspects, ...p.marsAspects].map((a) => ({
      relacion: phrase(a.type),
    })),
  };
}

export function buildFreeMessages(req: ReportRequest): ChatMessage[] {
  const parts = [
    `rasgo:\n${JSON.stringify(selectFeature(req.chart).payload)}`,
    `amor:\n${JSON.stringify(loveFacts(req.chart))}`,
  ];
  if (req.firstName) parts.push(`Nombre de pila: ${sanitizeName(req.firstName)}`);
  parts.push("Escribe ahora los dos bloques.");

  return [
    { role: "system", content: loadPrompt("system-free.md") },
    { role: "user", content: parts.join("\n\n") },
  ];
}

export function parseFree(markdown: string): FreeReading | null {
  const a = markdown.match(/#{1,3}\s*APERTURA\s*([\s\S]*?)(?=#{1,3}\s*AMOR|$)/i);
  const l = markdown.match(/#{1,3}\s*AMOR\s*([\s\S]*)$/i);
  if (!a || !l) return null;
  const apertura = a[1].trim();
  const amor = l[1].trim();
  if (!apertura || !amor) return null;
  return { apertura, amor, hook: amor.split(/\n+/)[0].trim() };
}
```

Note `tensiones` deliberately carries only the relation phrase, not which
planets — naming them invites the model to attach the relation to the wrong
pair. If a future test shows the prose is too vague, add plain planet names,
never aspect names.

- [ ] **Step 5: Write validateFree**

Add to `src/validate.ts`:

```ts
import type { FreeReading } from "./report";

const APERTURA_RANGE: ProseOptions = { minWords: 100, maxWords: 140 };
/** Wider than the prompt asks for: the model overshoots consistently. */
const AMOR_RANGE: ProseOptions = { minWords: 70, maxWords: 120 };

export function validateFree(reading: FreeReading, chart: NatalChart): Validation {
  const a = validateProse(reading.apertura, chart, APERTURA_RANGE);
  const l = validateProse(reading.amor, chart, AMOR_RANGE);
  return {
    ok: a.ok && l.ok,
    problems: [
      ...a.problems.map((p) => `apertura: ${p}`),
      ...l.problems.map((p) => `amor: ${p}`),
    ],
  };
}
```

If importing `FreeReading` from `./report` creates a cycle, move the interface
into `src/types.ts` and import it from there in both files.

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run tests/free.test.ts`
Expected: PASS (11 tests)

- [ ] **Step 7: Run the multi-chart battery against the live model**

This is required before the prompt is considered done — `CLAUDE.md` mandates a
multi-chart battery for any prompt change, with bilbao-2000 as the canary.

Write `scripts/battery-free.ts` (not committed to the test suite — it costs
money and needs the network) that runs `buildFreeMessages` → OpenRouter
(`deepseek/deepseek-v4-flash`, `temperature: 0.8`, `max_tokens: 8000`,
`reasoning: { enabled: false }`) → `repair` → `parseFree` → `validateFree`
across at least madrid-1990, buenosaires-1985 and bilbao-2000, six runs each,
and prints the pass rate per chart plus every rejection reason.

Run: `npx tsx --env-file=.env.local scripts/battery-free.ts`
Expected: report the measured pass rate. **The gender gate is the known
bottleneck** — if bilbao passes fewer than 4 of 6 within the retry budget,
stop and tune the prompt's neutral-rewrite guidance before continuing.

- [ ] **Step 8: Commit**

```bash
git add prompts/system-free.md src/report.ts src/validate.ts tests/free.test.ts scripts/battery-free.ts
git commit -m "feat: single-call free reading prompt, builder, parser and gate"
```

---

### Task 11: API routes

**Files:**
- Modify: `web/src/app/api/chart/route.ts`
- Create: `web/src/app/api/free/route.ts`
- Delete: `web/src/app/api/teaser/route.ts`
- Modify: `web/src/lib/astro.ts`

**Interfaces:**
- Consumes: Tasks 1-10
- Produces: `/api/chart` returning `ChartResponse`; `/api/free` returning `{ apertura, amor, hook, attempts }`

- [ ] **Step 1: Widen the server-side barrel**

In `web/src/lib/astro.ts`, replace the teaser re-exports:

```ts
export { buildFreeMessages, parseFree } from "@core/report";
export { validateFree, repair } from "@core/validate";
export {
  relationshipProfile, topMatches, frictionSign, elementBalance,
  modalityBalance, chartRuler, signature,
} from "@core/profile";
export { SIGN_ES, SIGN_GLYPH, SUN_ES, MOON_ES, ASC_ES, PARTNER_ES } from "@core/copy/signs.es";
```

- [ ] **Step 2: Return the full profile from /api/chart**

Replace the response block in `web/src/app/api/chart/route.ts` (currently
lines 30-42) with:

```ts
  const sun = chart.planets.find((p) => p.body === "Sun")!;
  const moon = chart.planets.find((p) => p.body === "Moon")!;
  const elements = elementBalance(chart);
  const ruler = chartRuler(chart);
  const friction = frictionSign(chart);

  return NextResponse.json({
    timeZone,
    bigThree: {
      sun: { sign: sun.sign, degree: sun.signDegree, gloss: SUN_ES[sun.sign] },
      moon: { sign: moon.sign, degree: moon.signDegree, gloss: MOON_ES[moon.sign] },
      ascendant: {
        sign: chart.angles.ascendant.sign,
        degree: chart.angles.ascendant.signDegree,
        gloss: ASC_ES[chart.angles.ascendant.sign],
      },
    },
    matches: topMatches(chart).map((m) => ({
      sign: m.sign, say: PARTNER_ES[m.sign], why: m.reasons[0],
    })),
    friction: { sign: friction.sign, say: PARTNER_ES[friction.sign], why: friction.reason },
    elements: { totals: elements.totals, dominant: elements.dominant,
                weakest: elements.weakest, total: elements.total },
    ruler: { body: ruler.body, sign: ruler.sign, inDomicile: ruler.inDomicile },
    signature: signature(chart),
  });
```

This is still pure local math — the response must stay under ~100 ms.

- [ ] **Step 3: Create /api/free**

Create `web/src/app/api/free/route.ts`, modelled on the existing teaser route
(same validation of `date`/`time`/`latitude`/`longitude`, same 400/500/502
error shapes, same Spanish error copy). Differences:

```ts
const MODEL = "deepseek/deepseek-v4-flash";
const MAX_ATTEMPTS = 6; // a retry costs ~$0.00015; the canary chart needs them
```

and the attempt loop:

```ts
  const messages = buildFreeMessages({ chart, firstName });
  let lastProblems: string[] = [];

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL, messages, temperature: 0.8, max_tokens: 8000,
        // Reasoning off: 4-8s vs 12-60s, identical cost, and the reasoning
        // bursts were what produced empty completions.
        reasoning: { enabled: false },
      }),
    });
    if (!res.ok) {
      return NextResponse.json({ error: "El oráculo no responde. Inténtalo de nuevo." }, { status: 502 });
    }
    const data = await res.json();
    const text: string = data.choices?.[0]?.message?.content ?? "";
    // Never trust status alone — reasoning models can return HTTP 200 with
    // empty content after spending the whole budget.
    if (!text.trim()) { lastProblems = ["respuesta vacía"]; continue; }

    const parsed = parseFree(repair(text));
    if (!parsed) { lastProblems = ["estructura rota"]; continue; }

    const verdict = validateFree(parsed, chart);
    if (verdict.ok) return NextResponse.json({ ...parsed, attempts: attempt });

    lastProblems = verdict.problems;
    console.warn(`free gate rejected attempt ${attempt}:`, verdict.problems.join("; "));
  }

  console.warn("free gate failed after retries:", lastProblems);
  return NextResponse.json(
    { error: "No hemos podido preparar una lectura fiable ahora mismo. Vuelve a intentarlo." },
    { status: 503 },
  );
```

- [ ] **Step 4: Delete the old route**

```bash
git rm web/src/app/api/teaser/route.ts
```

- [ ] **Step 5: Typecheck and build**

Run: `cd web && npx tsc --noEmit && npm run build`
Expected: both clean. Fix any `@core/*` path-alias resolution errors before continuing.

- [ ] **Step 6: Commit**

```bash
git add web/src/lib/astro.ts web/src/app/api
git commit -m "feat: /api/free replaces /api/teaser, /api/chart returns full profile"
```

---

### Task 12: Free reading UI

**Files:**
- Create: `web/src/components/Readout.tsx`, `Matches.tsx`, `Elements.tsx`, `Signature.tsx`, `LoveHook.tsx`
- Modify: `web/src/components/BirthForm.tsx`, `web/src/app/globals.css`

**Interfaces:**
- Consumes: `/api/chart` and `/api/free` from Task 11

Module order on the page: big three → love (hook + prose) → matches → elements
→ opening prose → signature → upsell. Love sits second because it is the
shareable unit.

- [ ] **Step 1: Split the fetch**

In `BirthForm.tsx`, replace the `teaser` state with `free` state and update
`onSubmit` to call `/api/chart` first and render immediately, then `/api/free`:

```tsx
const [profile, setProfile] = useState<ChartResponse | null>(null);
const [free, setFree] = useState<FreeReading | null>(null);
```

The `/api/chart` response now carries every computed module, so the page fills
with dense, specific content before any LLM call returns. Keep the existing
`aria-live="polite"` behaviour on the results region.

- [ ] **Step 2: Build the presentational components**

Shared prop types — put these in `web/src/components/types.ts` so every
component and `BirthForm` agree:

```ts
import type { Sign } from "@core/types";

export interface Placement { sign: Sign; degree: number; gloss: string }
export interface BigThree { sun: Placement; moon: Placement; ascendant: Placement }
export interface Match { sign: Sign; say: string; why: string }
export interface Elements {
  totals: Record<"Fuego" | "Tierra" | "Aire" | "Agua", number>;
  dominant: string; weakest: string; total: number;
}
export interface ChartResponse {
  timeZone: string;
  bigThree: BigThree;
  matches: Match[];
  friction: Match;
  elements: Elements;
  ruler: { body: string; sign: Sign; inDomicile: boolean };
  signature: { sun: Sign; moon: Sign; ascendant: Sign; oneIn: number };
}
export interface FreeReading { apertura: string; amor: string; hook: string }
```

`Readout` — the three placements. Note `formatDegree` already exists in
`BirthForm.tsx`; move it to a shared module rather than copying it.

```tsx
import { SIGN_ES, SIGN_GLYPH } from "@core/copy/signs.es";
import type { BigThree } from "./types";
import { formatDegree } from "@/lib/format";

const ROLES = [
  ["Sol", "sun"], ["Luna", "moon"], ["Ascendente", "ascendant"],
] as const;

export function Readout({ big }: { big: BigThree }) {
  return (
    <div className="readout">
      {ROLES.map(([label, key]) => {
        const p = big[key];
        return (
          <div key={key}>
            <div className="rt">
              <span className="role">{label}</span>
              <span className="sym">{SIGN_GLYPH[p.sign]}</span>
              <span className="sign">{SIGN_ES[p.sign]}</span>
              <span className="deg">{formatDegree(p.degree)}</span>
            </div>
            <p className="gloss">{p.gloss}</p>
          </div>
        );
      })}
    </div>
  );
}
```

`Matches` — the "plain line first, receipt underneath" pattern that carries the
whole register decision. The friction sign sits below a dashed divider under
its own copper label, never inside the ranking.

```tsx
import { SIGN_ES, SIGN_GLYPH } from "@core/copy/signs.es";
import type { Match } from "./types";

function Fit({ rank, m }: { rank: string; m: Match }) {
  return (
    <div className="fit">
      <div className="fit__head">
        <span className="fit__rank">{rank}</span>
        <span className="fit__sym">{SIGN_GLYPH[m.sign]}</span>
        <span className="fit__name">{SIGN_ES[m.sign]}</span>
      </div>
      <p className="fit__say">{m.say}</p>
      <p className="fit__why">{m.why}</p>
    </div>
  );
}

export function Matches({ matches, friction }: { matches: Match[]; friction: Match }) {
  return (
    <>
      {matches.map((m, i) => (
        <Fit key={m.sign} rank={String(i + 1).padStart(2, "0")} m={m} />
      ))}
      <div className="friction">
        <span className="label">El que te desordena</span>
        <Fit rank="—" m={friction} />
      </div>
    </>
  );
}
```

`LoveHook` — the screenshot unit. Brass border, display face, the mark beneath
so a cropped screenshot still carries the brand.

```tsx
export function LoveHook({ hook, prose }: { hook: string; prose: string }) {
  const body = prose.split(/\n+/).slice(1).join("\n").trim() || prose;
  return (
    <>
      <div className="hook">
        <p>«{hook}»</p>
        <span className="mark">Destiny Reports · tu lectura</span>
      </div>
      <div className="prose">
        {body.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
      </div>
    </>
  );
}
```

`Elements` — four bars sized against the dominant total, weakest in copper.
The second verdict line only renders when the weakest element is also the
element of a top match; that coincidence is the strongest moment on the page
and it must not be faked when it is not true.

```tsx
import { ELEMENT } from "@core/rulers";
import { SIGN_ES } from "@core/copy/signs.es";
import type { Elements as E, Match } from "./types";

const ORDER = ["Fuego", "Tierra", "Aire", "Agua"] as const;

export function Elements({ elements, matches }: { elements: E; matches: Match[] }) {
  const max = Math.max(...ORDER.map((k) => elements.totals[k]));
  const echo = matches.filter((m) => ELEMENT[m.sign] === elements.weakest);
  const n = (x: number) => x.toLocaleString("es-ES", { maximumFractionDigits: 1 });

  return (
    <>
      <div className="bars">
        {ORDER.slice().sort((a, b) => elements.totals[b] - elements.totals[a]).map((k) => (
          <div className="bar" key={k}>
            <span className="bar__name">{k}</span>
            <span className="bar__track">
              <span
                className={`bar__fill${k === elements.weakest ? " low" : ""}`}
                style={{ width: `${(elements.totals[k] / max) * 100}%` }}
              />
            </span>
            <span className="bar__val">{n(elements.totals[k])}</span>
          </div>
        ))}
      </div>
      <p className="verdict">
        Tu mezcla se va casi toda a {elements.dominant.toLowerCase()}. De{" "}
        {elements.weakest.toLowerCase()} tienes {n(elements.totals[elements.weakest])} de{" "}
        {n(elements.total)}.
      </p>
      {echo.length >= 2 && (
        <p className="verdict punch">
          Y ahora fíjate: los signos con los que mejor encajas,{" "}
          <strong>{echo.map((m) => SIGN_ES[m.sign]).join(" y ")}</strong>, son justo de{" "}
          {elements.weakest.toLowerCase()}. Buscas fuera lo que no llevas dentro.
        </p>
      )}
    </>
  );
}
```

Note the verdict avoids "vas cargada de agua" — the natural Spanish phrasing
there is gendered. Component copy is held to the same standard as everything
in `src/copy/`; if these strings grow, move them into a copy table so
`tests/copy.test.ts` covers them.

`Signature` — centred label, glyph row, rarity line.

```tsx
import { SIGN_ES, SIGN_GLYPH } from "@core/copy/signs.es";
import type { ChartResponse } from "./types";

export function Signature({ sig }: { sig: ChartResponse["signature"] }) {
  const row = [sig.sun, sig.moon, sig.ascendant]
    .map((s) => `${SIGN_GLYPH[s]} ${SIGN_ES[s]}`).join(" · ");
  return (
    <div className="card sig">
      <span className="sig__label">Tu combinación</span>
      <p className="sig__combo">{row}</p>
      <p className="sig__stat">1 de {sig.oneIn.toLocaleString("es-ES")} combinaciones posibles</p>
    </div>
  );
}
```

Use the existing tokens in `globals.css` (`--ink`, `--ink-raised`,
`--ink-line`, `--bone`, `--bone-dim`, `--brass`, `--copper`, `--slate`,
`--font-display`, `--font-body`, `--font-mono`). Add the new classes used
above (`.rt`, `.gloss`, `.hook`, `.fit*`, `.friction`, `.bar*`, `.verdict`,
`.sig*`) following the existing file's conventions. Render glyphs from
`SIGN_GLYPH`, never hardcoded.

- [ ] **Step 3: Verify in the browser**

Start the dev server via `preview_start` (never `npm run dev` in a shell), then
submit the canary birth data: 30-07-2000, 04:15, Bilbao.

Check: computed modules paint before the prose arrives; no jargon anywhere on
screen; degrees render as `7°12′`; glyphs are engraved, not colour emoji; the
page does not scroll horizontally at 375 px.

Run `read_console_messages` and `preview_logs` — expect no errors, and expect
the `free gate rejected attempt N` warnings to appear in the server log when
retries happen.

- [ ] **Step 4: Commit**

```bash
git add web/src/components web/src/app/globals.css
git commit -m "feat: free reading UI modules in plain Spanish"
```

---

### Task 13: Reframe section 5 of the paid report

**Files:**
- Modify: `prompts/system-report.md`
- Test: `tests/report.test.ts` (append)

**Interfaces:**
- `SECTION_TITLES` is unchanged — the title and position stay, only the brief changes.

The free reading now covers Venus by sign and area, the Descendant, and
compatible signs. Section 5 must stop repeating them.

- [ ] **Step 1: Write the failing test**

Append to `tests/report.test.ts`:

```ts
describe("paid report section 5", () => {
  it("keeps the section titles stable", () => {
    expect(SECTION_TITLES[4]).toBe("Amor y vínculos");
    expect(SECTION_TITLES).toHaveLength(8);
  });

  it("briefs the model on what the free reading already covered", () => {
    const prompt = buildReportMessages({ chart })[0].content;
    const section = prompt.slice(prompt.indexOf("## Amor y vínculos"),
                                prompt.indexOf("## Vocación y propósito"));
    expect(section).toMatch(/patr[óo]n/i);
    expect(section).toMatch(/proyect/i);        // what gets projected onto partners
    expect(section).toMatch(/casa ocho|casa 8/i);
    expect(section).toMatch(/Saturno|Plut[óo]n/);
  });

  it("still grows under the amor focus", () => {
    const prompt = buildReportMessages({ chart, focus: "amor" })[0].content;
    expect(prompt).toMatch(/450 palabras/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/report.test.ts`
Expected: FAIL — the section brief mentions none of these

- [ ] **Step 3: Rewrite the section brief**

Replace the `## Amor y vínculos` brief in `prompts/system-report.md` with a
version that keeps the word counts (300-350, 450 under the "amor" focus) and
redirects the content:

- State explicitly that the free reading already gave the reader Venus by sign
  and area, the Descendant, and their compatible signs, so this section must
  not restate them.
- Cover instead: the pattern that repeats across relationships and how each
  cycle begins; hard aspects from Venus and Mars to Saturn, Pluto, Uranus and
  Neptune read as relational dynamics rather than labels; what gets projected
  onto the other person — the distance between what is asked for out loud and
  who actually gets chosen; house eight and the Moon, meaning intimacy,
  dependency and what is needed to let go properly.
- Close on how the pattern is worked with, preserving agency — never fatalism.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/report.test.ts`
Expected: PASS

- [ ] **Step 5: Run the report battery**

Generate the full report for madrid-1990, buenosaires-1985 and bilbao-2000
using the paid model (`moonshotai/kimi-k3`, `max_tokens: 24000` — it returns
empty content at lower budgets). Read section 5 of each and confirm it does
not restate the free content and that `parseReport` still returns non-null.

- [ ] **Step 6: Full suite and example**

Run: `npm test && npm run example`
Expected: both green.

- [ ] **Step 7: Commit**

```bash
git add prompts/system-report.md tests/report.test.ts
git commit -m "feat: reframe paid report section 5 away from free-tier content"
```

---

### Task 14: Update the handover

**Files:**
- Modify: `HANDOVER.md`

- [ ] **Step 1: Tick the checklist**

Mark the free-reading redesign item done, record the final test count from
`npm test`, and note the measured battery pass rate per chart from Task 10
Step 7 — that number is the thing a future session will want and cannot
recover without spending money again.

- [ ] **Step 2: Commit**

```bash
git add HANDOVER.md
git commit -m "HANDOVER: free reading redesign shipped"
```

---

## Verification checklist

Before calling this done:

- [ ] `npm test` green
- [ ] `npm run example` green (proves the tsx/ESM path, which vitest does not)
- [ ] `cd web && npx tsc --noEmit && npm run build` clean
- [ ] Battery pass rate measured and recorded for all three charts
- [ ] No jargon visible anywhere in the rendered page
- [ ] No gendered agreement in `src/copy/` (enforced by `tests/copy.test.ts`)
- [ ] `/api/chart` still responds in well under 100 ms
- [ ] Delivered cost per free reading inside $0.0011-0.0015
