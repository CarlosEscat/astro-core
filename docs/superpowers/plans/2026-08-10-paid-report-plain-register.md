# Plan A — the paid report's register goes plain

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The eight paid sections stop being written in astrological vocabulary, and the model stops receiving the data it would need to write it — while grounding stays mechanically verifiable.

**Architecture:** Three moves, in order. A closed set of plain relation phrases (`RELATION_ES`) so `groundingProblems()` can verify plain prose the way it verifies technical prose today. Then `buildSectionMessages` stops handing over raw chart JSON and hands over life-areas and pre-written relation phrases instead — no degrees, no orbs, no house numbers. Then the eight briefs and `system-section.md` are rewritten to match. Ends by running the live battery, which is the only thing that can answer whether V4 Pro writes good plain Spanish at this length.

**Tech Stack:** TypeScript (ESM, `"type": "module"`), vitest 4 via the repo-root config, DeepSeek V4 Pro through OpenRouter for the battery.

**Spec:** `docs/superpowers/specs/2026-08-10-paid-report-plain-language-design.md`

## Global Constraints

- `npm test` must stay green from the repo root. Baseline **241 tests in 16 files** — trust the runner over this number.
- `npm run example` must still pass. Vitest passing does NOT prove the tsx path works (ESM interop) — CLAUDE.md.
- **All prompt text is es-ES, "de tú".** Hand-written copy is held to the same gender discipline as model output (Addendum 6).
- **`{{RULES}}` is universal; `{{RULES_CHART}}` may ONLY appear in a prompt that receives the raw chart JSON.** After this plan the section prompt receives neither raw JSON nor that fragment.
- **`fatal` in `validateSection` does not grow.** It stays empty-or-truncated plus grounding. Escalating to Kimi over a non-factual defect cost 317–603 s and $0.08/section (Addendum 12).
- **Never write `\b` next to a letter class in `src/validate.ts`** — JavaScript's `\b` is ASCII-only and Spanish words do not end where ASCII thinks they do (Addendum 9). Use the existing `WORD_START` / `WORD_END` lookarounds.
- **Scope boundary:** this plan changes the **per-section** path (`system-section.md`, `src/sections.ts`). `prompts/system-report.md` and `buildReportMessages` are the superseded single-call path (Addendum 10) and keep their technical register; Task 5 adds a header note saying so. Do not rewrite them.
- Commit after every task.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/copy/relations.es.ts` | **New.** The closed set of plain relation phrases, plus the regexes that detect them. One responsibility: the vocabulary of "how two planets get along". |
| `src/validate.ts` | Modified. `groundingProblems()` learns the plain vocabulary alongside the technical one; `validateSection()` flags banned jargon. |
| `src/report.ts` | Modified. New `sectionFacts()` builds the translated payload; `buildSectionMessages()` uses it instead of `chartForLLM()`. |
| `src/sections.ts` | Modified. The eight briefs, rewritten in plain register. |
| `prompts/system-section.md` | Modified. Drops `{{RULES_CHART}}`, gains the ban list and the "name the planet and sign, never the number" rule. |
| `prompts/system-report.md` | Modified — **header note only**, marking it the superseded single-call prompt. |

`chartForLLM()` stays exactly as it is: `buildReportMessages` and `buildTeaserMessages` still use it, and the teaser is still a technical-register prompt.

---

### Task 1: `RELATION_ES` — the closed vocabulary

Without this, plain prose can assert that two planets clash and nothing can check it. That is the same defect class Addendum 12 found already shipped.

**Files:**
- Create: `src/copy/relations.es.ts`
- Test: `tests/relations.test.ts`

**Interfaces:**
- Consumes: `AspectType` from `src/types.ts` (`"conjunction" | "opposition" | "trine" | "square" | "sextile"`)
- Produces: `RELATION_ES: Record<AspectType, string>`, `RELATIONS: Relation[]`, `interface Relation { phrase: string; match: RegExp; types: AspectType[] }`

- [ ] **Step 1: Write the failing test**

Create `tests/relations.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { RELATION_ES, RELATIONS } from "../src/copy/relations.es";
import type { AspectType } from "../src/types";

const ALL: AspectType[] = ["conjunction", "opposition", "trine", "square", "sextile"];

describe("RELATION_ES", () => {
  it("renders every aspect type the engine can produce", () => {
    for (const t of ALL) {
      expect(RELATION_ES[t]).toBeTypeOf("string");
      expect(RELATION_ES[t].length).toBeGreaterThan(0);
    }
  });

  // The point of the table: the model is handed the phrase, so it never has to
  // judge an orb or name an aspect.
  it("uses no technical vocabulary in any phrase", () => {
    const banned = ["conjunción", "oposición", "cuadratura", "trígono", "sextil",
                    "aspecto", "orbe", "grado", "casa"];
    for (const phrase of Object.values(RELATION_ES)) {
      for (const word of banned) expect(phrase.toLowerCase()).not.toContain(word);
    }
  });

  it("collapses hard aspects onto one phrase and soft ones onto another", () => {
    expect(RELATION_ES.opposition).toBe(RELATION_ES.square);
    expect(RELATION_ES.trine).toBe(RELATION_ES.sextile);
    expect(RELATION_ES.conjunction).not.toBe(RELATION_ES.opposition);
    expect(RELATION_ES.conjunction).not.toBe(RELATION_ES.trine);
  });
});

describe("RELATIONS", () => {
  it("covers every aspect type exactly once across all entries", () => {
    const covered = RELATIONS.flatMap((r) => r.types).sort();
    expect(covered).toEqual([...ALL].sort());
  });

  it("matches its own canonical phrase", () => {
    for (const r of RELATIONS) expect(r.match.test(r.phrase)).toBe(true);
  });

  // The model is handed the phrase but writes its own sentence, so the detector
  // has to survive ordinary conjugation rather than demand the exact string.
  it("still matches when the model conjugates around the phrase", () => {
    const find = (s: string) => RELATIONS.filter((r) => r.match.test(s)).flatMap((r) => r.types);
    expect(find("tu Venus y tu Urano tiran cada uno para un lado")).toContain("opposition");
    expect(find("tira cada uno para su lado")).toContain("square");
    expect(find("tu Marte va pegado a tu Luna")).toContain("conjunction");
    expect(find("tu Sol y tu Júpiter van de la mano")).toContain("trine");
  });

  it("does not fire on ordinary prose that describes no relation", () => {
    const find = (s: string) => RELATIONS.filter((r) => r.match.test(s));
    expect(find("te gusta ir de la mano por la calle")).toHaveLength(1); // deliberate: see note
    expect(find("no tienes por qué darle mil vueltas")).toHaveLength(0);
    expect(find("tu Luna en Cáncer te pide calma")).toHaveLength(0);
  });
});
```

> **Note on the deliberate assertion.** "ir de la mano" in ordinary prose *does* match, and that is accepted: a false positive costs one flagged section that a human then reads, while a false negative ships an invented relation. Addendum 9 settled this direction — narrow by naming exceptions, never by weakening the pattern. The check only fires when the sentence also names exactly two planets, which makes the practical false-positive rate near zero.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/relations.test.ts`
Expected: FAIL — `Cannot find module '../src/copy/relations.es'`

- [ ] **Step 3: Write the implementation**

Create `src/copy/relations.es.ts`:

```ts
import type { AspectType } from "../types";

/**
 * How two planets get along, in words the reader already owns. This is the
 * ONLY form in which a relation may reach a prompt — the model never sees
 * "oposición" or an orb, which is why it cannot write either.
 *
 * The set is CLOSED on purpose. Because we author these phrases,
 * groundingProblems() can verify a plain-language relation claim exactly the
 * way it verifies "conjunción" today. Prose describing a relation in any other
 * words would be unverifiable, so nothing else may be used.
 *
 * Five aspect types collapse onto three phrases: the reader does not need the
 * distinction between a trine and a sextile, only between "these help each
 * other" and "these fight".
 */
export const RELATION_ES: Record<AspectType, string> = {
  conjunction: "van pegados",
  opposition: "tiran cada uno para un lado",
  square: "tiran cada uno para un lado",
  trine: "van de la mano",
  sextile: "van de la mano",
};

export interface Relation {
  /** The canonical phrase, as handed to the model. */
  phrase: string;
  /** Detector. Loose enough to survive the model conjugating around it. */
  match: RegExp;
  types: AspectType[];
}

/**
 * Detection is deliberately looser than the canonical phrase: the model is
 * given the phrase but writes its own sentence, so "tira cada uno para su
 * lado" has to count. Erring toward matching is the safe direction — a false
 * positive costs a flagged section a human then reads, a false negative ships
 * an invented relation (Addendum 9's rule, applied to a new vocabulary).
 */
export const RELATIONS: Relation[] = [
  {
    phrase: RELATION_ES.conjunction,
    match: /va(?:n)?\s+pegad[oa]s?/iu,
    types: ["conjunction"],
  },
  {
    phrase: RELATION_ES.opposition,
    match: /tira(?:n)?\s+cada\s+uno/iu,
    types: ["opposition", "square"],
  },
  {
    phrase: RELATION_ES.trine,
    match: /va(?:n)?\s+de\s+la\s+mano/iu,
    types: ["trine", "sextile"],
  },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/relations.test.ts && npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/copy/relations.es.ts tests/relations.test.ts
git commit -m "feat: RELATION_ES, the closed set of plain relation phrases"
```

---

### Task 2: `groundingProblems()` verifies plain prose too

**Files:**
- Modify: `src/validate.ts` (the aspect loop at the end of `groundingProblems`, currently lines ~280-297)
- Test: `tests/validate.test.ts` (add a describe block)

**Interfaces:**
- Consumes: `RELATIONS` (Task 1)
- Produces: no signature change. `groundingProblems(text, chart)` still returns `string[]`.

**Both vocabularies stay live.** The teaser is still a technical-register prompt and still runs through `validateProse` → `groundingProblems`, so removing the `ASPECT_ES` check would blind it. The section path adds the plain one.

- [ ] **Step 1: Write the failing test**

Append to `tests/validate.test.ts`:

```ts
describe("groundingProblems on plain-language relations", () => {
  // bilbao: Venus-Urano IS an opposition; Sol-Plutón is not an aspect at all.
  it("accepts a plain phrase for a relation that exists", () => {
    const text = "Tu Venus y tu Urano tiran cada uno para un lado.";
    expect(groundingProblems(text, bilbao)).toEqual([]);
  });

  it("rejects a plain phrase for a relation that does not exist", () => {
    const text = "Tu Sol y tu Plutón tiran cada uno para un lado.";
    const problems = groundingProblems(text, bilbao);
    expect(problems.some((p) => /no presente/i.test(p))).toBe(true);
  });

  it("rejects the wrong FAMILY of relation between a real pair", () => {
    // Venus-Urano is an opposition, so "van de la mano" is a false claim
    // about a real pair — the subtle case a human reader would miss.
    const text = "Tu Venus y tu Urano van de la mano.";
    const problems = groundingProblems(text, bilbao);
    expect(problems.some((p) => /no presente/i.test(p))).toBe(true);
  });

  it("ignores a sentence that names only one planet", () => {
    expect(groundingProblems("Tu Venus va de la mano con lo que quieres.", bilbao)).toEqual([]);
  });

  it("still catches the technical vocabulary, for the teaser", () => {
    const text = "Tu Sol y tu Plutón forman una oposición.";
    expect(groundingProblems(text, bilbao).some((p) => /no presente/i.test(p))).toBe(true);
  });
});
```

Check the top of `tests/validate.test.ts` for how the `bilbao` chart fixture is named there and reuse it; if the existing fixture has another name, use that name rather than introducing a second chart.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/validate.test.ts`
Expected: FAIL — the plain-phrase cases return `[]` because nothing detects them yet.

- [ ] **Step 3: Modify the aspect loop**

In `src/validate.ts`, add the import at the top:

```ts
import { RELATIONS } from "./copy/relations.es";
```

Replace the final loop of `groundingProblems` (the one beginning `// An aspect keyword in a sentence naming exactly two planets`) with:

```ts
  // A relation claim in a sentence naming exactly two planets must match a real
  // aspect of that family between them. Two vocabularies are checked: the
  // technical one (the teaser still writes it) and the plain one (the paid
  // sections now write it). Other planet counts are unattributable.
  for (const sentence of sentencesOf(trimmed)) {
    const types = new Set<string>();

    for (const [es, en] of Object.entries(ASPECT_ES)) {
      if (new RegExp(`${WORD_START}${es}${WORD_END}`, "iu").test(sentence)) types.add(en);
    }
    for (const relation of RELATIONS) {
      if (relation.match.test(sentence)) for (const t of relation.types) types.add(t);
    }
    if (types.size === 0) continue;

    const mentioned = planetsIn(sentence);
    if (mentioned.length !== 2) continue;
    const [p1, p2] = mentioned;
    const matches = chart.aspects.some(
      (a) =>
        types.has(a.type) &&
        ((a.a === p1 && a.b === p2) || (a.a === p2 && a.b === p1)),
    );
    if (!matches) {
      problems.push(
        `relación no presente en la carta: ${p1}-${p2} (${[...types].join("/")})`,
      );
    }
  }
```

Note the message changed from "aspecto no presente" to "relación no presente" — it now covers both vocabularies. The tests above match on `/no presente/i`, so both spellings satisfy them, but grep for the old string elsewhere before finishing:

```bash
grep -rn "aspecto no presente" src/ tests/ scripts/
```

Update any assertion that pins the old wording.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/validate.test.ts && npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/validate.ts tests/validate.test.ts
git commit -m "feat: grounding check verifies plain-language relations"
```

---

### Task 3: `validateSection` flags banned jargon

Once the register changes, a technical word in a section is a rule violation. It is **advisory**, never `fatal` — Addendum 12's lesson.

**Files:**
- Modify: `src/validate.ts` (`validateSection`)
- Test: `tests/validate.test.ts`

**Interfaces:**
- Consumes: nothing new
- Produces: `validateSection(text, brief, chart)` unchanged in signature; `problems` may now contain `jerga: "<word>"`.

- [ ] **Step 1: Write the failing test**

Append to `tests/validate.test.ts`, inside the existing `validateSection` describe block if there is one, otherwise as a new block. Reuse whatever `brief` and `body()` helpers that file already defines for `validateSection` tests:

```ts
describe("validateSection flags the banned register", () => {
  it("flags a technical word as a problem, not as fatal", () => {
    const v = validateSection(body("Hay una cuadratura muy cerrada ahí."), brief, bilbao);
    expect(v.problems.some((p) => /jerga/i.test(p))).toBe(true);
    expect(v.fatal.some((p) => /jerga/i.test(p))).toBe(false);
  });

  it("flags 'retrógrado' even when the planet really is retrograde", () => {
    // Urano IS retrograde in bilbao. The word is still banned now, so this is
    // a register violation rather than a grounding one.
    const v = validateSection(body("tu Urano retrógrado lo complica."), brief, bilbao);
    expect(v.problems.some((p) => /jerga/i.test(p))).toBe(true);
  });

  it("leaves clean plain prose alone", () => {
    const v = validateSection(body("Tu Luna en Cáncer te pide un sitio tranquilo."), brief, bilbao);
    expect(v.problems.some((p) => /jerga/i.test(p))).toBe(false);
  });

  it("does not flag a house named as a life area", () => {
    const v = validateSection(body("en cómo hablas y te mueves por tu barrio."), brief, bilbao);
    expect(v.problems.some((p) => /jerga/i.test(p))).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/validate.test.ts`
Expected: FAIL — no `jerga` problem is ever produced.

- [ ] **Step 3: Implement**

Add near the other constants in `src/validate.ts`:

```ts
/**
 * Vocabulary the paid sections may no longer use. Same list the free prompt
 * bans, minus planet and sign names, which both tiers keep — they are "las dos
 * únicas palabras que todo el mundo reconoce".
 *
 * Advisory, never fatal: this is a register slip, not a false claim about the
 * chart, and escalating over a non-factual defect is what Addendum 12 measured
 * at 317-603 s and $0.08 a section.
 */
const BANNED_JARGON = [
  "conjunción", "conjuncion", "oposición", "oposicion", "cuadratura",
  "trígono", "trigono", "sextil", "aspecto", "orbe", "regente", "regir",
  "domicilio", "exaltación", "exaltacion", "retrógrado", "retrógrada",
  "retrogrado", "retrograda", "cúspide", "cuspide", "efeméride", "efemeride",
];

/**
 * "la casa tres", "en casa 7" — a numbered house, in words or digits.
 * Built with `new RegExp` because it interpolates the Unicode word-boundary
 * lookarounds; a regex literal cannot.
 */
const NUMBERED_HOUSE = new RegExp(
  `${WORD_START}casas?\\s+(?:\\d{1,2}|un[ao]|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce)${WORD_END}`,
  "giu",
);

function jargonProblems(text: string): string[] {
  const found = new Set<string>();
  for (const word of BANNED_JARGON) {
    if (new RegExp(`${WORD_START}${word}${WORD_END}`, "iu").test(text)) found.add(word);
  }
  for (const m of text.matchAll(NUMBERED_HOUSE)) found.add(m[0].toLowerCase().trim());
  return [...found].map((w) => `jerga: "${w}"`);
}
```

`NUMBERED_HOUSE` carries the `g` flag, so it is stateful across `.test()` calls — only ever use it with `matchAll`, as above, never with `.test()`.

Then in `validateSection`, inside the `else` branch, after the truncation check:

```ts
    problems.push(...jargonProblems(trimmed));
```

Put it **before** the `fatal.push(...groundingProblems(...))` line so the ordering reads register-then-facts, and note that `problems.push(...fatal)` at the end already merges the fatal list — do not add jargon to `fatal`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/validate.test.ts && npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/validate.ts tests/validate.test.ts
git commit -m "feat: sections flag technical vocabulary as an advisory problem"
```

---

### Task 4: the model stops receiving raw chart JSON

The load-bearing task. After this, the two defects Addendum 12 found are not detected — they are impossible.

**Files:**
- Modify: `src/report.ts` (add `sectionFacts`, change `buildSectionMessages`)
- Test: `tests/section-messages.test.ts`

**Interfaces:**
- Consumes: `AREA_ES` (`src/copy/areas.es.ts`), `SIGN_ES` (`src/copy/signs.es.ts`), `RELATION_ES` (Task 1), `SectionAllocation` (`src/allocate.ts`)
- Produces: `buildSectionMessages(req)` unchanged in signature — only its user-message content changes.

- [ ] **Step 1: Write the failing test**

Replace the test at `tests/section-messages.test.ts` named `"carries both rule fragments, since it receives the chart JSON"` and add the block below. Keep every other test in that file as it is.

```ts
  it("carries the universal rules but NOT the chart-data vocabulary", () => {
    const [system] = buildSectionMessages(req(0));
    expect(system.content).toMatch(/salud/i);                    // universal rules present
    expect(system.content).not.toContain("figuren en la lista `aspects`");
    expect(system.content).not.toContain('La palabra "retrógrado" solo puede aplicarse');
  });

describe("the section prompt receives no technical data", () => {
  const user = (section: number) => buildSectionMessages(req(section))[1].content;

  it("names houses as life areas, never as numbers", () => {
    const text = user(4);
    expect(text).toContain("cómo hablas, escribes y te mueves por tu barrio");
    expect(text).not.toMatch(/casas?\s*\d/iu);
    expect(text).not.toMatch(/"house"/);
  });

  // Written in the negative on purpose: this is the assertion that enforces
  // "it cannot misstate an orb it never sees".
  it("hands over no degrees and no orbs", () => {
    const text = user(4);
    expect(text).not.toContain("orbe");
    expect(text).not.toMatch(/\d+([.,]\d+)?\s*°/u);
    expect(text).not.toMatch(/"degree"/);
    expect(text).not.toMatch(/"orb"/);
  });

  it("renders allocated relations as plain phrases, not aspect names", () => {
    const text = user(4);
    expect(text).toContain("tiran cada uno para un lado");
    for (const word of ["conjunción", "oposición", "cuadratura", "trígono", "sextil"]) {
      expect(text.toLowerCase()).not.toContain(word);
    }
  });

  it("never leaks the retrograde flag", () => {
    // Urano and Neptuno are retrograde in the fixture; the word must not appear.
    const all = [0, 1, 2, 3, 4, 5, 6, 7].map(user).join("\n");
    expect(all.toLowerCase()).not.toContain("retrógrad");
    expect(all).not.toMatch(/"retrograde"/);
  });

  it("still names planets and signs, which both tiers keep", () => {
    const text = user(4);
    expect(text).toContain("Venus");
    expect(text).toContain("Leo");
  });

  it("still reserves the other sections' relations", () => {
    const text = user(4);
    expect(text).toMatch(/no (?:uses|desarrolles)/i);
  });
});
```

Check how `req(...)` is built at the top of the existing file and reuse it unchanged. If the fixture chart there is not bilbao-2000, the two assertions naming "Leo" and the barrio gloss must be adjusted to that chart's real values — **compute them, do not guess**:

```bash
npx tsx -e 'import {computeNatalChart} from "./src/chart.ts";import {resolveBirthUtc} from "./src/birthtime.ts";import {SIGN_ES} from "./src/copy/signs.es.ts";import {AREA_ES} from "./src/copy/areas.es.ts";const {utc}=resolveBirthUtc({year:2000,month:7,day:30,hour:4,minute:15},43.263,-2.935);const c=computeNatalChart({utc,latitude:43.263,longitude:-2.935});for(const p of c.planets)console.log(p.body,SIGN_ES[p.sign],"|",AREA_ES[p.house]);'
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/section-messages.test.ts`
Expected: FAIL — the user message is raw JSON, so degrees, orbs, house numbers and `retrograde` are all present.

- [ ] **Step 3: Write `sectionFacts`**

Add to `src/report.ts`, next to `loveFacts` (which is the same idea for the free tier — read it first; this is deliberately its sibling):

```ts
/**
 * Everything a paid section learns about the chart, already in plain Spanish.
 *
 * This is Addendum 6's governing principle applied to the paid tier: compute
 * the structure, hand over one translated thing. The model cannot write a house
 * number it never receives, cannot name an aspect it is never given, and cannot
 * misstate an orb it never sees — which retires the invented retrogradation and
 * the 1.29° "oposición exacta" that Addendum 12 found already delivered, rather
 * than detecting them after the fact.
 *
 * Planets and signs survive because both tiers keep them: they are the two
 * words every reader already owns.
 */
function sectionFacts(chart: NatalChart, mine: SectionAllocation) {
  const place = (p: NatalChart["planets"][number]) => ({
    planeta: `tu ${PLANET_ES[p.body]}`,
    signo: SIGN_ES[p.sign],
    zona: AREA_ES[p.house],
  });

  return {
    posiciones: chart.planets.map(place),
    asciende_en: SIGN_ES[chart.angles.ascendant.sign],
    cara_publica_en: SIGN_ES[chart.angles.midheaven.sign],
    // Relations carry the phrase and the pair, never the type or the orb.
    tensiones_tuyas: mine.aspects.map((a) => ({
      entre: [`tu ${PLANET_ES[a.a]}`, `tu ${PLANET_ES[a.b]}`],
      relacion: RELATION_ES[a.type],
    })),
    no_son_tuyas: mine.reserved.map((a) => ({
      entre: [`tu ${PLANET_ES[a.a]}`, `tu ${PLANET_ES[a.b]}`],
    })),
  };
}
```

`PLANET_ES` does not exist yet. Add it to `src/copy/signs.es.ts` (it is the sibling of `SIGN_ES` and belongs with it). That file's first line is currently `import type { Sign } from "../types";` — widen it rather than adding a second import:

```ts
import type { Body, Sign } from "../types";

/** Planet names in Spanish. Both tiers may write these. */
export const PLANET_ES: Record<Body, string> = {
  Sun: "Sol", Moon: "Luna", Mercury: "Mercurio", Venus: "Venus", Mars: "Marte",
  Jupiter: "Júpiter", Saturn: "Saturno", Uranus: "Urano", Neptune: "Neptuno",
  Pluto: "Plutón",
};
```

`Body` is the ten members above and nothing else (`src/types.ts:7-9`); `Record<Body, string>` makes a missing key a compile error rather than an `undefined` in a prompt.

Then add `PLANET_ES` to the existing `SIGN_ES` import in `src/report.ts:9`.

- [ ] **Step 4: Rewire `buildSectionMessages`**

Replace the `parts` array in `buildSectionMessages` (currently `src/report.ts:146-151`) with:

```ts
  const parts = [
    `Datos de la carta, ya en lenguaje llano:\n${JSON.stringify(sectionFacts(req.chart, mine))}`,
    `Sección: ${brief.title}`,
    `Extensión: entre ${brief.minWords} y ${brief.maxWords} palabras.`,
    `Encargo:\n${brief.brief}`,
  ];
```

and delete the two blocks that follow it which push `Aspectos que te pertenecen` and `No uses estos aspectos` — `sectionFacts` now carries both, translated. Replace them with a single line that keeps the reservation instruction explicit:

```ts
  if (mine.reserved.length) {
    parts.push("Los pares que aparecen en `no_son_tuyas` pertenecen a otras secciones: no los desarrolles aquí ni los menciones de pasada.");
  }
```

Leave `priorOpenings`, `firstName` and the closing instruction exactly as they are.

`aspectLine()` (`src/report.ts:129-135`) now has no callers. Delete it. It is the **only** remaining user of both `AspectType` and `AspectRef` in that file, so line 4 becomes `import type { NatalChart } from "./types";` and line 5 becomes `import type { SectionAllocation } from "./allocate";`.

- [ ] **Step 5: Run tests**

Run: `npx vitest run tests/section-messages.test.ts && npm test && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 6: Look at a real prompt before trusting the tests**

```bash
npx tsx -e 'import {computeNatalChart} from "./src/chart.ts";import {resolveBirthUtc} from "./src/birthtime.ts";import {allocateFeatures} from "./src/allocate.ts";import {buildSectionMessages} from "./src/report.ts";const {utc}=resolveBirthUtc({year:2000,month:7,day:30,hour:4,minute:15},43.263,-2.935);const chart=computeNatalChart({utc,latitude:43.263,longitude:-2.935});const m=buildSectionMessages({chart,section:4,allocation:allocateFeatures(chart)});console.log(m[1].content);'
```

Read it as the model would. There must be no digit that is a degree or an orb, no house number, and no aspect name anywhere in it.

- [ ] **Step 7: Commit**

```bash
git add src/report.ts src/copy/signs.es.ts tests/section-messages.test.ts
git commit -m "feat: sections receive pre-translated facts instead of chart JSON"
```

---

### Task 5: the briefs and the section prompt go plain

**Files:**
- Modify: `src/sections.ts` (all eight `brief` strings)
- Modify: `prompts/system-section.md`
- Modify: `prompts/system-report.md` (header note only)
- Test: `tests/sections.test.ts`

**Interfaces:**
- Consumes: nothing new
- Produces: `SECTION_BRIEFS` unchanged in shape. Word ranges are **not** changed by this plan.

- [ ] **Step 1: Write the failing test**

Append to `tests/sections.test.ts`:

```ts
describe("the briefs are written in the plain register", () => {
  it("uses no technical vocabulary and no numbered houses", () => {
    const banned = ["conjunción", "oposición", "cuadratura", "trígono", "sextil",
                    "aspecto", "orbe", "regente", "retrógrado", "cúspide"];
    for (const b of SECTION_BRIEFS) {
      const text = b.brief.toLowerCase();
      for (const word of banned) {
        expect(text, `${b.title} contiene "${word}"`).not.toContain(word);
      }
      expect(text, `${b.title} numera una casa`).not.toMatch(/casas?\s+(?:\d|un[ao]|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce)/u);
    }
  });

  it("stops telling the model there is a JSON to read", () => {
    for (const b of SECTION_BRIEFS) {
      expect(b.brief.toLowerCase()).not.toContain("json");
    }
  });

  it("keeps the love section's four beats", () => {
    const amor = SECTION_BRIEFS[4].brief;
    expect(amor).toMatch(/patrón/i);
    expect(amor).toMatch(/intimidad|soltar/i);
    expect(amor).toMatch(/agencia|se trabaja/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/sections.test.ts`
Expected: FAIL — several briefs name houses, aspects and the JSON.

- [ ] **Step 3: Rewrite the eight briefs**

In `src/sections.ts`, replace each `brief` string. Keep every `index`, `title`, `minWords`, `maxWords`, `growsOn` and `grownMax` exactly as they are, **including the comment above section 4 that records why its range is 350-480** — that comment exists so nobody "corrects" the range back.

```ts
  // index 0
    brief:
      "El gancho del informe. Teje su Sol, su Luna y su forma de asomarse al " +
      "mundo en un retrato unificado que produzca el efecto \"¿cómo lo sabe?\". " +
      "Abre con la tensión o la armonía más llamativa entre los tres. No los " +
      "describas por separado: describe cómo conviven.",

  // index 1
    brief:
      "Su Sol: el signo, la zona de la vida donde cae y las tensiones que se " +
      "te asignan. Qué le da vida, dónde brilla, qué le apaga.",

  // index 2
    brief:
      "Su Luna. Cómo siente, qué necesita para sentirse en casa, cómo " +
      "reacciona cuando algo le duele.",

  // index 3
    brief:
      "Cómo se asoma al mundo: la primera impresión que causa y el papel que " +
      "la vida le invita a ensayar.",

  // index 4 — keep the range comment above this entry
    brief:
      "Ve más hondo que una lectura de superficie de su Venus. Cubre, en prosa " +
      "continua y no como lista: el patrón que se repite de una relación a " +
      "otra y en qué momento se tuerce siempre; las tensiones que se te " +
      "asignan leídas como dinámicas entre dos personas y nunca como " +
      "etiquetas; la distancia entre lo que dice buscar en voz alta y a quién " +
      "elige de hecho; la intimidad y qué necesita para soltar del todo. " +
      "Cierra explicando cómo se trabaja ese patrón, con agencia.",

  // index 5
    brief:
      "Su cara pública, lo que se le da bien sostener en el día a día y lo que " +
      "construye para que dure. Hacia dónde apunta su ambición, qué estilo de " +
      "trabajo le sostiene, qué reconocimiento busca.",

  // index 6
    brief:
      "Las tensiones que se te asignan, leídas en profundidad. Cada una " +
      "presentada con su regalo: qué fuerza esconde y cómo se canaliza.",

  // index 7
    brief:
      "Síntesis final. Tres hilos concretos que unan las secciones anteriores, " +
      "formulados como invitaciones prácticas, no como órdenes ni promesas. " +
      "Te doy la primera frase de cada sección anterior para que hiles sin " +
      "repetirlas. Cierra con una frase memorable propia de esta carta.",
```

Two deliberate changes beyond vocabulary. Section 4 loses the "la lectura gratuita ya le ha dado tres cosas" opener (spec decision 9 — the report is read on its own). Section 3 loses "y su regente si su posición está en el JSON", because a ruler is jargon the reader does not have and the model no longer receives it.

- [ ] **Step 4: Rewrite `prompts/system-section.md`**

Replace the whole file with:

```markdown
# Rol

Eres una astróloga española que le está leyendo la carta a una amiga en la cocina. Escribes en español de España, de tú, en lenguaje corriente, en prosa continua y cuidada. Jamás usas listas, viñetas ni negritas. Tu lectora no sabe nada de astrología y no tiene por qué aprender: nunca ha oído hablar de orbes, regentes ni casas, y si se lo sueltas, cierra la página.

Recibirás datos ya calculados y ya traducidos. Tu trabajo es convertirlos en lenguaje humano, no volver a calcularlos ni añadirles nada.

# Prohibido el vocabulario técnico

NO puedes usar ninguna de estas palabras: conjunción, oposición, cuadratura, trígono, sextil, aspecto, orbe, grado, regente, regir, domicilio, exaltación, retrógrado, cúspide, tránsito, natal, carta, efeméride, elemento, modalidad, cardinal, fijo, mutable, eje. Tampoco puedes numerar las casas: ni "la casa uno", ni "la casa siete", ni ninguna otra.

Sí puedes nombrar planetas (tu Venus, tu Luna, tu Marte) y signos (en Leo, en Capricornio), porque son las dos únicas palabras que todo el mundo reconoce. Nada más.

Cuando dos planetas tengan una relación entre ellos, te la doy ya escrita en `tensiones_tuyas`: úsala tal cual — "van pegados", "van de la mano", "tiran cada uno para un lado" — y no inventes ninguna otra. Cuando algo ocurra en una zona de la vida, nombra la zona con las palabras que te doy en `zona`, nunca un número.

# Qué vas a escribir

Vas a escribir **una sola sección** de un informe más largo. Recibirás los datos de la carta ya en lenguaje llano, el encargo de esa sección y su extensión.

Devuelve **solo la prosa de esa sección, sin encabezado**: el título lo pone la interfaz. No escribas las demás secciones, no las resumas y no anuncies lo que vendrá después.

Cada interpretación tiene que apoyarse en algo que te he dado, y ese algo debe aparecer en el texto con naturalidad ("tu Luna en Cáncer, en lo que pasa a puerta cerrada..."). La lectora tiene que poder reconocer de dónde sale cada frase.

{{RULES}}
```

Note there is no `{{RULES_CHART}}` — that is the point of the task.

- [ ] **Step 5: Mark the legacy prompt**

At the very top of `prompts/system-report.md`, above its first heading, add:

```markdown
<!--
  SUPERSEDED. This is the single-call, whole-report prompt. The paid report has
  generated one section per call since 2026-08-08 (HANDOVER Addendum 10) using
  prompts/system-section.md, which is written in the plain register.

  This file deliberately keeps the technical register and {{RULES_CHART}}: it is
  only reachable through buildReportMessages() and scripts/battery-report.ts.
  If you are changing how the paid report reads, this is not the file.
-->
```

HTML comments are stripped from fragments but **not** from prompt bodies, so keep this short — it costs tokens on the legacy path only.

- [ ] **Step 6: Update the fragment-split test**

`tests/report.test.ts` has `"gives the chart-data rules to the prompts that receive the chart JSON"`, which iterates `[report(), teaser()]`. Both still receive raw JSON, so **that test is still correct and needs no change**. Verify it passes rather than assuming:

```bash
npx vitest run tests/report.test.ts
```

- [ ] **Step 7: Run everything**

Run: `npm test && npm run example`
Expected: PASS. `npm run example` is not optional — vitest passing does not prove the tsx path works.

- [ ] **Step 8: Commit**

```bash
git add src/sections.ts prompts/system-section.md prompts/system-report.md tests/sections.test.ts
git commit -m "feat: the eight briefs and the section prompt go plain-register"
```

---

### Task 6: run the battery and record what it says

**This task costs money and needs the network.** It is the whole reason the plan is ordered this way — everything above is unverified until it runs.

**Files:**
- Modify: `HANDOVER.md` (new addendum)
- Output: `bakeoff-out/sections/*.md`

**Interfaces:**
- Consumes: everything above
- Produces: a recorded measurement, and a go/no-go for Plan B

- [ ] **Step 1: Archive the current battery output**

The existing files are the technical-register run and are the only before/after evidence that will exist. Do not overwrite them.

```bash
git mv bakeoff-out/sections bakeoff-out/sections-technical-register
mkdir -p bakeoff-out/sections
git add -A bakeoff-out
git commit -m "chore: archive the technical-register battery as the before-state"
```

- [ ] **Step 2: Confirm the key is present without printing it**

```bash
test -f .env.local && grep -q OPENROUTER_API_KEY .env.local && echo "key present" || echo "MISSING"
```

Never print, echo or commit the key itself.

- [ ] **Step 3: Run the battery**

```bash
npx tsx scripts/battery-sections.ts
```

Three charts, bilbao-2000 is the canary. Expect roughly 5-6 minutes and ~$0.13 total based on the confirming run in Addendum 12 — but treat a large deviation as a finding, not as noise.

- [ ] **Step 4: Read the output — do not trust the summary line**

```bash
wc -w bakeoff-out/sections/*.md
```

Then actually read all three reports. Addendum 12 records an invented retrogradation that shipped because someone spot-checked 5 sections of 16 and declared the run clean. Read the whole thing.

Judge these five, which are what the run exists to answer:

1. **Does it still sound like the product, or like a magazine horoscope?** This is the main risk in the spec. Without data in the sentence, generic prose has nowhere to hide.
2. **Does the reader still get the "¿cómo lo sabe?" moment** from planet + sign + life-area alone?
3. **Any jargon leaks?** Check mechanically as well as by eye:
   ```bash
   grep -niE "conjunci|oposici|cuadratura|trígono|sextil|orbe|retrógrad|casa (uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce)|casa [0-9]" bakeoff-out/sections/*.md
   ```
4. **Section length.** The register change may move it; the briefs are unchanged, so any shift is the register's doing.
5. **Grounding.** The run reports `fatal` per section; confirm zero.

- [ ] **Step 5: Write the addendum**

Add **Addendum 14** to `HANDOVER.md` and update the "Estado actual" block at the top. Record: the measured numbers (wall clock, cost, sections passing first attempt, escalations, fatal count), a verdict in plain words on questions 1 and 2 above, and any jargon leak with the exact phrase.

State the go/no-go for Plan B explicitly. If the prose reads generic, **say so and stop** — the fix is the briefs, not the UI, and building the strip on top of prose we do not believe in is exactly the mistake Addendum 11 avoided by putting plan 1 first.

- [ ] **Step 6: Commit**

```bash
git add HANDOVER.md bakeoff-out/sections
git commit -m "test: plain-register battery run and what it measured"
```

---

## Done when

The eight sections are written in plain Spanish, the model receives no degree, orb or house number, `groundingProblems()` verifies plain relation claims as strictly as it verifies technical ones, and HANDOVER records a measured verdict on whether the prose is good enough to build Plan B's presentation layer on.

---

## Self-Review

**Spec coverage.** Decision 1 (register) → Tasks 4 and 5. Decision 2 (`{{RULES_CHART}}` out) → Task 5 Step 4. Decision 3 (pre-translated data) → Task 4. Decision 4 (`RELATION_ES`) → Task 1. Decision 5 (grounding rewrite) → Tasks 2 and 3; the table's three rows map to the surviving false-sign check (untouched), the retrograde row (Task 3's `jerga` flag) and the relation row (Task 2). Decisions 6, 8, 10 and 11 are the presentation layer and belong to Plan B, as the spec's execution-order section says. Decision 7 (no wheel) requires no code. Decision 9 (report reads alone) → Task 5 Step 3, section 4's brief.

**Deliberate deviation.** The spec says "the report prompt drops `{{RULES_CHART}}`". Applied to `system-section.md` only; `system-report.md` is the superseded single-call path and keeps it, with a header note added. Rewriting a prompt no longer in the product path would have doubled the diff for no gain.

**Placeholder scan.** No TBDs. Three steps deliberately say to read existing code instead of quoting it — Task 2's `bilbao` fixture name, Task 4's `req()` helper, Task 3's `body()`/`brief` helpers — because those live in test files this plan does not otherwise touch and inventing their names would produce code that does not compile. Those are instructions to look, not placeholders. Task 4 Step 1 gives the exact command to compute the fixture's real values rather than guessing them.

**Type consistency.** `RELATION_ES: Record<AspectType, string>` is defined in Task 1 and consumed in Task 4 under that name. `RELATIONS: Relation[]` with `{phrase, match, types}` is defined in Task 1 and consumed in Task 2. `PLANET_ES: Record<Body, string>` is introduced in Task 4 Step 3 and used only there. `sectionFacts(chart, mine)` takes the `SectionAllocation` already in scope as `mine` at `src/report.ts:144`. `groundingProblems` and `validateSection` keep their existing signatures throughout, so `scripts/battery-sections.ts` needs no change — which is what makes Task 6 runnable without touching it.

**One thing the plan cannot de-risk.** Whether V4 Pro writes good plain Spanish at 3,000 words is unmeasured and unmeasurable before Task 6. Every task before it is reversible; Task 6 is where the plan finds out if it was worth doing.
