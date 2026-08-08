# Per-Section Report Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the paid report from one 5-minute Kimi call into eight briefed, independently generated and independently retryable sections, and measure whether DeepSeek V4 Pro holds quality under that briefing.

**Architecture:** Three pure layers plus one measuring harness. `src/sections.ts` holds the eight section briefs as data instead of prose buried in a prompt file. `src/allocate.ts` deterministically hands each section the chart features it owns, so seven concurrent calls cannot all reach for the same tightest aspect. `src/report.ts` gains a per-section message builder and a composer that reassembles the sections into the same markdown `parseReport` already understands. `scripts/battery-sections.ts` runs it against live models and reports wall clock, cost, escalation rate and gender marks.

**Tech Stack:** TypeScript (ESM, `"type": "module"`), vitest, OpenRouter (DeepSeek V4 Pro primary, Kimi K3 escalation).

**Spec:** `docs/superpowers/specs/2026-08-08-paid-report-flow-design.md`

**Scope:** This plan covers the generation core only. Payment, the Inngest pipeline, Supabase persistence and the delivery UI are separate plans that depend on this one.

## Global Constraints

- `npm test` must stay green. Baseline **169 tests in 9 files**.
- `npm run example` must keep working — vitest passing does NOT prove the tsx path works (ESM interop).
- **No PII to the LLM:** only derived chart data plus an optional sanitized first name.
- **Prompts are composed, never copy-pasted.** `{{RULES}}` is universal; `{{RULES_CHART}}` holds technical vocabulary and may ONLY appear in prompts that receive the raw chart JSON (Addendum 8). The section prompt receives the chart, so it gets both.
- **Never write `\b` after a letter class** in any regex touching Spanish text — JavaScript's `\b` is ASCII-only and finds boundaries inside words like "soñar" (Addendum 9). Use `WORD_END`/`WORD_START` from `src/validate.ts`.
- **No gender/jargon/cliché rejection on the paid tier.** Marks are counted and reported, never used to reject. `validateProse` belongs to the free tier and must not be reused here.
- **No literal example sentences in prompt files.** A sample line placed in a prompt came back copied verbatim into output (Addendum 6).
- All model-facing and user-facing strings are Spanish (es-ES, "de tú").
- Batteries cost money and need the network — never add them to `npm test`.
- Commit after every task.

---

### Task 1: Section briefs as data (`src/sections.ts`)

The eight briefs currently live as prose under `# Estructura del informe` in `prompts/system-report.md`. Per-section generation needs them addressable individually, with their word ranges as numbers rather than sentences.

**Files:**
- Create: `src/sections.ts`
- Test: `tests/sections.test.ts`

**Interfaces:**
- Consumes: `SECTION_TITLES`, `Focus` from `src/report.ts`
- Produces: `SectionBrief`, `SECTION_BRIEFS`, `briefFor(index: number, focus?: Focus): SectionBrief`

- [ ] **Step 1: Write the failing test**

Create `tests/sections.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { SECTION_BRIEFS, briefFor } from "../src/sections";
import { SECTION_TITLES } from "../src/report";

describe("section briefs", () => {
  it("has one brief per report section, in order", () => {
    expect(SECTION_BRIEFS).toHaveLength(8);
    expect(SECTION_BRIEFS.map((b) => b.title)).toEqual([...SECTION_TITLES]);
    expect(SECTION_BRIEFS.map((b) => b.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it("gives every section a sane word range", () => {
    for (const b of SECTION_BRIEFS) {
      expect(b.minWords).toBeGreaterThan(0);
      expect(b.maxWords).toBeGreaterThan(b.minWords);
      expect(b.brief.length).toBeGreaterThan(80);
    }
  });

  it("grows the love section under the amor focus", () => {
    expect(briefFor(4).maxWords).toBe(350);
    expect(briefFor(4, "amor").maxWords).toBe(450);
    expect(briefFor(4, "trabajo").maxWords).toBe(350);
  });

  it("grows the vocation section under the trabajo focus", () => {
    expect(briefFor(5, "trabajo").maxWords).toBe(450);
    expect(briefFor(5, "amor").maxWords).toBe(350);
  });

  it("rejects an out-of-range index", () => {
    expect(() => briefFor(8)).toThrow();
    expect(() => briefFor(-1)).toThrow();
  });

  // The model must never be told to write its own heading: composeReport
  // adds it, and a duplicated heading breaks parseReport.
  it("never instructs the model to emit a heading", () => {
    for (const b of SECTION_BRIEFS) {
      expect(b.brief).not.toContain("##");
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/sections.test.ts`
Expected: FAIL — `Cannot find module '../src/sections'`

- [ ] **Step 3: Write minimal implementation**

Create `src/sections.ts`. The brief text is lifted from `prompts/system-report.md` so the content is unchanged — only its location and shape change.

```ts
import { SECTION_TITLES, type Focus } from "./report";

export interface SectionBrief {
  index: number;
  title: (typeof SECTION_TITLES)[number];
  minWords: number;
  maxWords: number;
  /** What this section must cover, in Spanish, as it reaches the model. */
  brief: string;
  /** The focus that makes this section grow, and the ceiling it grows to. */
  growsOn?: Focus;
  grownMax?: number;
}

export const SECTION_BRIEFS: SectionBrief[] = [
  {
    index: 0, title: "Tu retrato esencial", minWords: 250, maxWords: 300,
    brief:
      "El gancho del informe. Teje Sol, Luna y Ascendente en un retrato " +
      "unificado que produzca el efecto \"¿cómo lo sabe?\". Abre con la " +
      "tensión o la armonía más llamativa entre los tres. No los describas " +
      "por separado: describe cómo conviven.",
  },
  {
    index: 1, title: "El corazón de tu identidad", minWords: 250, maxWords: 300,
    brief:
      "Tu Sol: signo, casa y los aspectos que se te asignan abajo. Qué te da " +
      "vida, dónde brillas, qué te apaga.",
  },
  {
    index: 2, title: "Tu mundo emocional", minWords: 250, maxWords: 300,
    brief:
      "Tu Luna. Cómo sientes, qué necesitas para sentirte en casa, cómo " +
      "reaccionas cuando algo te duele.",
  },
  {
    index: 3, title: "La puerta por la que entras al mundo", minWords: 200, maxWords: 250,
    brief:
      "Tu Ascendente y su regente si su posición está en el JSON. La primera " +
      "impresión que causas y el papel que la vida te invita a ensayar.",
  },
  {
    index: 4, title: "Amor y vínculos", minWords: 300, maxWords: 350,
    growsOn: "amor", grownMax: 450,
    brief:
      "La lectura gratuita ya le ha dado tres cosas: su Venus por signo y por " +
      "zona de la vida, su Descendente, y los signos con los que mejor encaja. " +
      "No las repitas: aquí vas más hondo. Cubre, en prosa continua y no como " +
      "lista: el patrón que se repite de una relación a otra y en qué momento " +
      "se tuerce siempre; los aspectos duros que se te asignan abajo leídos " +
      "como dinámicas entre dos personas y nunca como etiquetas; la distancia " +
      "entre lo que dice buscar en voz alta y a quién elige de hecho; la casa " +
      "ocho y la Luna, la intimidad y qué necesita para soltar del todo. " +
      "Cierra explicando cómo se trabaja ese patrón, con agencia.",
  },
  {
    index: 5, title: "Vocación y propósito", minWords: 300, maxWords: 350,
    growsOn: "trabajo", grownMax: 450,
    brief:
      "Medio Cielo, casa diez, Saturno y los planetas en casas dos, seis y " +
      "diez. Hacia dónde apunta tu ambición, qué estilo de trabajo te " +
      "sostiene, qué reconocimiento buscas.",
  },
  {
    index: 6, title: "Tus luces y tus sombras", minWords: 300, maxWords: 350,
    brief:
      "Los aspectos que se te asignan abajo, leídos en profundidad. Cada " +
      "tensión presentada con su regalo: qué fuerza esconde y cómo se canaliza.",
  },
  {
    index: 7, title: "Claves para tu camino", minWords: 200, maxWords: 250,
    brief:
      "Síntesis final. Tres hilos concretos que unan las secciones anteriores, " +
      "formulados como invitaciones prácticas, no como órdenes ni promesas. " +
      "Te doy la primera frase de cada sección anterior para que hiles sin " +
      "repetirlas. Cierra con una frase memorable propia de esta carta.",
  },
];

export function briefFor(index: number, focus?: Focus): SectionBrief {
  const base = SECTION_BRIEFS[index];
  if (!base) throw new RangeError(`No existe la sección ${index}`);
  if (focus && base.growsOn === focus && base.grownMax) {
    return { ...base, maxWords: base.grownMax };
  }
  return base;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/sections.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/sections.ts tests/sections.test.ts
git commit -m "feat: section briefs as data, not prose in a prompt file"
```

---

### Task 2: Deterministic feature allocation (`src/allocate.ts`)

The risk in concurrent generation is seven calls independently grabbing the tightest aspect. Section 6 ("Tus luces y tus sombras") asks for the most exact aspects, which collides with sections 1 and 2 by construction. Nothing about this needs an LLM, so nothing about it should involve one.

**Files:**
- Create: `src/allocate.ts`
- Test: `tests/allocate.test.ts`

**Interfaces:**
- Consumes: `NatalChart`, `Aspect`, `Body`, `AspectType` from `src/types.ts`
- Produces: `AspectRef`, `SectionAllocation`, `allocateFeatures(chart: NatalChart): SectionAllocation[]` (always length 8)

- [ ] **Step 1: Write the failing test**

Create `tests/allocate.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { computeNatalChart } from "../src/chart";
import { resolveBirthUtc } from "../src/birthtime";
import { allocateFeatures } from "../src/allocate";
import type { AspectRef } from "../src/allocate";

function chartFor(
  local: { year: number; month: number; day: number; hour: number; minute: number },
  latitude: number, longitude: number,
) {
  const { utc } = resolveBirthUtc(local, latitude, longitude);
  return computeNatalChart({ utc, latitude, longitude });
}

const madrid = chartFor({ year: 1992, month: 4, day: 15, hour: 10, minute: 30 }, 40.4168, -3.7038);
const bilbao = chartFor({ year: 2000, month: 7, day: 30, hour: 4, minute: 15 }, 43.263, -2.935);

const key = (r: AspectRef) => `${r.a}-${r.b}-${r.type}`;

describe("feature allocation", () => {
  it("returns one allocation per section", () => {
    expect(allocateFeatures(madrid)).toHaveLength(8);
  });

  // The whole point: two sections describing the same aspect is the failure
  // mode that made single-call generation safer than concurrent generation.
  it("never gives the same aspect to two sections", () => {
    for (const chart of [madrid, bilbao]) {
      const seen = new Set<string>();
      for (const alloc of allocateFeatures(chart)) {
        for (const ref of alloc.aspects) {
          expect(seen.has(key(ref))).toBe(false);
          seen.add(key(ref));
        }
      }
    }
  });

  it("gives the two most exact aspects to Tus luces y tus sombras", () => {
    const alloc = allocateFeatures(madrid);
    const tightest = madrid.aspects.slice(0, 2).map((a) => `${a.a}-${a.b}-${a.type}`);
    expect(alloc[6].aspects.map(key)).toEqual(tightest);
  });

  it("reserves for each section exactly what the others own", () => {
    const allocs = allocateFeatures(madrid);
    for (let i = 0; i < allocs.length; i++) {
      const mine = new Set(allocs[i].aspects.map(key));
      const others = allocs
        .filter((_, j) => j !== i)
        .flatMap((a) => a.aspects.map(key));
      expect(new Set(allocs[i].reserved.map(key))).toEqual(new Set(others));
      for (const r of allocs[i].reserved.map(key)) expect(mine.has(r)).toBe(false);
    }
  });

  it("gives the Sun section an aspect involving the Sun when one is free", () => {
    const alloc = allocateFeatures(madrid);
    for (const ref of alloc[1].aspects) {
      expect(ref.a === "Sun" || ref.b === "Sun").toBe(true);
    }
  });

  it("is deterministic", () => {
    expect(allocateFeatures(madrid)).toEqual(allocateFeatures(madrid));
  });

  it("survives a chart with almost no aspects", () => {
    const bare = { ...madrid, aspects: madrid.aspects.slice(0, 1) };
    const allocs = allocateFeatures(bare);
    expect(allocs).toHaveLength(8);
    expect(allocs.flatMap((a) => a.aspects)).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/allocate.test.ts`
Expected: FAIL — `Cannot find module '../src/allocate'`

- [ ] **Step 3: Write minimal implementation**

Create `src/allocate.ts`. `chart.aspects` arrives sorted most-exact-first (`src/aspects.ts:64`), so "take the next free one" is already "take the most exact free one".

```ts
import type { Aspect, AspectType, Body, NatalChart } from "./types";

/** An aspect stripped to what a section brief needs to name it. */
export interface AspectRef {
  a: Body;
  b: Body;
  type: AspectType;
  orb: number;
}

export interface SectionAllocation {
  /** Aspects this section owns and should build on. */
  aspects: AspectRef[];
  /** Aspects owned by other sections. This one must not use them. */
  reserved: AspectRef[];
}

const ref = (a: Aspect): AspectRef => ({ a: a.a, b: a.b, type: a.type, orb: a.orb });
const involves = (a: Aspect, bodies: Body[]) => bodies.includes(a.a) || bodies.includes(a.b);

/**
 * Which bodies each section may claim, and how many aspects it gets. Sections
 * absent from this table (0, 3, 7) work from placements or from the other
 * sections' openings, not from aspects of their own.
 *
 * Order matters: section 6 is listed first because it is defined as "the most
 * exact aspects of the chart", so it must claim before anyone else narrows the
 * pool.
 */
const CLAIMS: Array<{ section: number; bodies: Body[] | "any"; count: number }> = [
  { section: 6, bodies: "any", count: 2 },
  { section: 1, bodies: ["Sun"], count: 1 },
  { section: 2, bodies: ["Moon"], count: 1 },
  { section: 4, bodies: ["Venus", "Mars"], count: 2 },
  { section: 5, bodies: ["Saturn"], count: 1 },
];

export function allocateFeatures(chart: NatalChart): SectionAllocation[] {
  const owned: AspectRef[][] = Array.from({ length: 8 }, () => []);
  const taken = new Set<Aspect>();

  for (const claim of CLAIMS) {
    for (const aspect of chart.aspects) {
      if (owned[claim.section].length >= claim.count) break;
      if (taken.has(aspect)) continue;
      if (claim.bodies !== "any" && !involves(aspect, claim.bodies)) continue;
      taken.add(aspect);
      owned[claim.section].push(ref(aspect));
    }
  }

  const key = (r: AspectRef) => `${r.a}-${r.b}-${r.type}`;
  const all = owned.flat();
  return owned.map((aspects) => {
    const mine = new Set(aspects.map(key));
    return { aspects, reserved: all.filter((r) => !mine.has(key(r))) };
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/allocate.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/allocate.ts tests/allocate.test.ts
git commit -m "feat: deterministic aspect allocation across report sections"
```

---

### Task 3: Make `parseReport` tolerate `#` and `###`

Listed as a pending fix in HANDOVER: the bake-off lost four good reports because `parseReport` does a literal `indexOf("## " + title)`. With per-section generation this also becomes the round-trip check for `composeReport`, so it must be robust before Task 6 depends on it.

**Files:**
- Modify: `src/report.ts:197-215` (`parseReport`)
- Test: `tests/report.test.ts` (extend the existing `parseReport` describe block)

**Interfaces:**
- Consumes: `SECTION_TITLES`
- Produces: `parseReport` unchanged in signature — `(markdown: string) => ParsedReport | null`

- [ ] **Step 1: Write the failing test**

Add to the existing `describe("parseReport", ...)` block in `tests/report.test.ts`:

```ts
  it("accepts any heading level the model emits", () => {
    for (const hashes of ["#", "##", "###"]) {
      const md = SECTION_TITLES.map((t) => `${hashes} ${t}\n\n${fakeBody}`).join("\n\n");
      const parsed = parseReport(md);
      expect(parsed, `heading level ${hashes}`).not.toBeNull();
      expect(parsed!.sections).toHaveLength(8);
      expect(parsed!.sections[0].title).toBe("Tu retrato esencial");
    }
  });

  it("tolerates trailing spaces after a heading", () => {
    const md = SECTION_TITLES.map((t) => `##  ${t}  \n\n${fakeBody}`).join("\n\n");
    expect(parseReport(md)).not.toBeNull();
  });

  it("still rejects a heading that is only part of a line", () => {
    const md = SECTION_TITLES
      .map((t, i) => (i === 0 ? `Hablemos de ## ${t} ahora\n\n${fakeBody}` : `## ${t}\n\n${fakeBody}`))
      .join("\n\n");
    expect(parseReport(md)).toBeNull();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/report.test.ts -t "heading level"`
Expected: FAIL — `expected null not to be null` for `#` and `###`

- [ ] **Step 3: Write minimal implementation**

Replace `parseReport` in `src/report.ts`:

```ts
/** A heading on its own line, at any level the model might emit. */
function headingAt(markdown: string, title: string, from: number) {
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^#{1,3}[ \\t]*${escaped}[ \\t]*$`, "im");
  const m = re.exec(markdown.slice(from));
  return m ? { start: from + m.index, end: from + m.index + m[0].length } : null;
}

export function parseReport(markdown: string): ParsedReport | null {
  const sections: Array<{ title: string; body: string }> = [];
  let cursor = 0;
  for (let i = 0; i < SECTION_TITLES.length; i++) {
    const here = headingAt(markdown, SECTION_TITLES[i], cursor);
    if (!here) return null;
    const next =
      i + 1 < SECTION_TITLES.length
        ? headingAt(markdown, SECTION_TITLES[i + 1], here.end)
        : null;
    if (i + 1 < SECTION_TITLES.length && !next) return null;
    const body = markdown.slice(here.end, next ? next.start : markdown.length).trim();
    if (body.length < 200) return null; // suspiciously short section
    sections.push({ title: SECTION_TITLES[i], body });
    cursor = here.end;
  }
  const wordCount = markdown.split(/\s+/).filter(Boolean).length;
  return { sections, wordCount };
}
```

- [ ] **Step 4: Run the whole suite**

Run: `npm test`
Expected: PASS — **185 tests** (169 baseline + 6 from Task 1 + 7 from Task 2 + 3 here). The pre-existing `parseReport` tests (missing section, short section) must still pass unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/report.ts tests/report.test.ts
git commit -m "fix: parseReport accepts any heading level, not just ##"
```

---

### Task 4: Per-section prompt and message builder

**Files:**
- Create: `prompts/system-section.md`
- Modify: `src/report.ts` (add `buildSectionMessages`, export `SectionRequest`)
- Test: `tests/section-messages.test.ts`

**Interfaces:**
- Consumes: `SECTION_BRIEFS`/`briefFor` (Task 1), `allocateFeatures`/`SectionAllocation` (Task 2), existing `chartForLLM`, `sanitizeName`, `loadPrompt`
- Produces: `SectionRequest`, `buildSectionMessages(req: SectionRequest): ChatMessage[]`

```ts
export interface SectionRequest {
  chart: NatalChart;
  /** 0-7 */
  section: number;
  allocation: SectionAllocation[];
  firstName?: string;
  focus?: Focus;
  /** Section 7 only: the first sentence of each earlier section, in order. */
  priorOpenings?: string[];
}
```

- [ ] **Step 1: Write the failing test**

Create `tests/section-messages.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { computeNatalChart } from "../src/chart";
import { resolveBirthUtc } from "../src/birthtime";
import { buildSectionMessages } from "../src/report";
import { allocateFeatures } from "../src/allocate";

const { utc } = resolveBirthUtc({ year: 1992, month: 4, day: 15, hour: 10, minute: 30 }, 40.4168, -3.7038);
const chart = computeNatalChart({ utc, latitude: 40.4168, longitude: -3.7038 });
const allocation = allocateFeatures(chart);
const build = (section: number, extra = {}) =>
  buildSectionMessages({ chart, section, allocation, ...extra });

describe("section message builder", () => {
  it("returns a system and a user message", () => {
    const msgs = build(1);
    expect(msgs).toHaveLength(2);
    expect(msgs[0].role).toBe("system");
    expect(msgs[1].role).toBe("user");
  });

  it("names the section and its word range in the user message", () => {
    const user = build(4)[1].content;
    expect(user).toContain("Amor y vínculos");
    expect(user).toContain("300");
    expect(user).toContain("350");
  });

  it("grows the range under a matching focus", () => {
    expect(build(4, { focus: "amor" })[1].content).toContain("450");
  });

  it("hands the section its allocated aspects and names what is reserved", () => {
    const user = build(6)[1].content;
    for (const ref of allocation[6].aspects) expect(user).toContain(ref.a);
    expect(user.toLowerCase()).toContain("no uses");
  });

  it("gives the synthesis section the earlier openings", () => {
    const user = build(7, { priorOpenings: ["Abre así.", "Y luego así."] })[1].content;
    expect(user).toContain("Abre así.");
    expect(user).toContain("Y luego así.");
  });

  it("carries both rule fragments, since it receives the chart JSON", () => {
    const system = build(0)[0].content;
    expect(system).toContain("No asumas ni indiques el género de la persona");
    expect(system).toContain("figuren en la lista `aspects`");
    expect(system).not.toMatch(/\{\{[A-Z_]+\}\}/);
  });

  it("never asks the model to emit the heading", () => {
    const system = build(0)[0].content;
    expect(system.toLowerCase()).toContain("sin encabezado");
  });

  it("carries no PII beyond a sanitized first name", () => {
    const all = build(0, { firstName: "Lucía<script>" }).map((m) => m.content).join(" ");
    expect(all).toContain("Lucía");
    expect(all).not.toContain("<script>");
    expect(all).not.toContain("1992");
    expect(all).not.toContain("40.41");
  });

  it("rejects an out-of-range section", () => {
    expect(() => build(8)).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/section-messages.test.ts`
Expected: FAIL — `buildSectionMessages is not a function`

- [ ] **Step 3: Write the prompt file**

Create `prompts/system-section.md`. It receives the chart JSON, so it takes both fragments.

```markdown
# Rol

Eres una astróloga profesional española con veinte años de experiencia leyendo cartas natales. Tu voz es cálida, directa y concreta: hablas de tú, con la cercanía de una conversación en confianza, pero cada frase nace de la carta real de la persona, nunca de generalidades. Escribes en español de España, en prosa continua y cuidada. Jamás usas listas, viñetas ni negritas.

# Qué vas a escribir

Vas a escribir **una sola sección** de un informe más largo. Recibirás el JSON de la carta, el encargo de esa sección, su extensión exacta y los aspectos que le pertenecen.

Devuelve **solo la prosa de esa sección, sin encabezado**: el título lo pone la interfaz. No escribas las demás secciones, no las resumas y no anuncies lo que vendrá después.

Cada interpretación debe anclarse en un dato concreto del JSON, y ese dato debe nombrarse con naturalidad en el texto ("con tu Luna en Libra en la casa cinco...", "Venus a nueve grados de Aries..."). El lector debe poder verificar cada afirmación contra su carta.

Si te doy una lista de aspectos reservados, esos pertenecen a otras secciones: no los desarrolles aquí ni los menciones de pasada.

Si `houseSystemFallback` es true, usa las casas con naturalidad sin dar explicaciones técnicas.

{{RULES}}

{{RULES_CHART}}
```

- [ ] **Step 4: Write the message builder**

Add to `src/report.ts` (imports at the top: `briefFor` from `./sections`, types from `./allocate`):

```ts
export interface SectionRequest {
  chart: NatalChart;
  /** 0-7 */
  section: number;
  allocation: SectionAllocation[];
  firstName?: string;
  focus?: Focus;
  /** Section 7 only: the first sentence of each earlier section, in order. */
  priorOpenings?: string[];
}

/** Plain-language rendering of an aspect for the brief. */
function aspectLine(r: AspectRef): string {
  const ES: Record<AspectType, string> = {
    conjunction: "conjunción", opposition: "oposición", square: "cuadratura",
    trine: "trígono", sextile: "sextil",
  };
  return `${r.a}-${r.b}: ${ES[r.type]} (orbe ${r.orb.toFixed(2)}°)`;
}

export function buildSectionMessages(req: SectionRequest): ChatMessage[] {
  const brief = briefFor(req.section, req.focus);
  const mine = req.allocation[req.section];

  const parts = [
    `Carta natal (JSON):\n${JSON.stringify(chartForLLM(req.chart))}`,
    `Sección: ${brief.title}`,
    `Extensión: entre ${brief.minWords} y ${brief.maxWords} palabras.`,
    `Encargo:\n${brief.brief}`,
  ];

  if (mine.aspects.length) {
    parts.push(`Aspectos que te pertenecen:\n${mine.aspects.map(aspectLine).join("\n")}`);
  }
  if (mine.reserved.length) {
    parts.push(
      "No uses estos aspectos, pertenecen a otras secciones:\n" +
      mine.reserved.map(aspectLine).join("\n"),
    );
  }
  if (req.priorOpenings?.length) {
    parts.push(
      "Primera frase de cada sección anterior, para que hiles sin repetir:\n" +
      req.priorOpenings.map((s, i) => `${i + 1}. ${s}`).join("\n"),
    );
  }
  if (req.firstName) parts.push(`Nombre de pila: ${sanitizeName(req.firstName)}`);
  parts.push("Escribe ahora esa sección, sin encabezado.");

  return [
    { role: "system", content: loadPrompt("system-section.md") },
    { role: "user", content: parts.join("\n\n") },
  ];
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/section-messages.test.ts`
Expected: PASS (9 tests). Then `npm test` → **194 tests**.

- [ ] **Step 6: Commit**

```bash
git add prompts/system-section.md src/report.ts tests/section-messages.test.ts
git commit -m "feat: per-section prompt and message builder"
```

---

### Task 5: Per-section validation and gender-mark counting

Structure only. A gender gate on a 2,400-word report would reject ~95% of them (spec, decision 6), so marks are counted for reporting and never used to reject.

**Files:**
- Modify: `src/validate.ts`
- Test: `tests/validate.test.ts` (new describe block)

**Interfaces:**
- Consumes: `SectionBrief` (Task 1), existing `GENDERED_READER`, `WORD_END`
- Produces: `SectionCheck`, `validateSection(text: string, brief: SectionBrief): SectionCheck`, `countGenderMarks(text: string): string[]`

- [ ] **Step 1: Write the failing test**

Add to `tests/validate.test.ts`:

```ts
import { validateSection, countGenderMarks } from "../src/validate";
import { briefFor } from "../src/sections";

describe("per-section validation", () => {
  const brief = briefFor(3); // 200-250 words
  const words = (n: number) => Array.from({ length: n }, () => "palabra").join(" ") + ".";

  it("accepts a section inside its range", () => {
    expect(validateSection(words(220), brief).ok).toBe(true);
  });

  it("rejects a section that is empty", () => {
    expect(validateSection("   ", brief).ok).toBe(false);
  });

  it("rejects a section outside its word range", () => {
    expect(validateSection(words(80), brief).ok).toBe(false);
    expect(validateSection(words(900), brief).ok).toBe(false);
  });

  it("rejects a section cut off mid-sentence", () => {
    const truncated = Array.from({ length: 220 }, () => "palabra").join(" ");
    const v = validateSection(truncated, brief);
    expect(v.ok).toBe(false);
    expect(v.problems.join(" ")).toMatch(/truncad/i);
  });

  // The paid tier reports gender marks, it does not reject on them.
  it("counts gender marks without rejecting", () => {
    const text = words(210).replace("palabra.", "estás cansada.");
    const v = validateSection(text, brief);
    expect(v.ok).toBe(true);
    expect(v.genderMarks.length).toBeGreaterThan(0);
  });

  it("does not reject jargon, which the paid tier is allowed to use", () => {
    const text = words(210).replace("palabra.", "una conjunción exacta con Saturno retrógrado.");
    expect(validateSection(text, brief).ok).toBe(true);
  });

  it("countGenderMarks finds real marks and ignores clean prose", () => {
    expect(countGenderMarks("cuando estás cansada se te nota")).toHaveLength(1);
    expect(countGenderMarks("eres alguien que se guarda las cosas")).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/validate.test.ts -t "per-section"`
Expected: FAIL — `validateSection is not a function`

- [ ] **Step 3: Write minimal implementation**

Add to `src/validate.ts`:

```ts
import type { SectionBrief } from "./sections";

export interface SectionCheck {
  ok: boolean;
  problems: string[];
  /** Reported, never a rejection reason on the paid tier. */
  genderMarks: string[];
}

/** Every reader-directed gender mark in the text, for logging only. */
export function countGenderMarks(text: string): string[] {
  const found: string[] = [];
  for (const re of GENDERED_READER) {
    const m = text.match(new RegExp(re.source, "giu"));
    if (m) found.push(...m);
  }
  return found;
}

/**
 * Structure only: non-empty, inside the brief's word range with a margin, and
 * finished rather than cut off. No gender, jargon or cliché check — see the
 * spec's decision 6 for why a gate that works on a 200-word free block is
 * economically unviable on a 2,400-word report.
 */
export function validateSection(text: string, brief: SectionBrief): SectionCheck {
  const problems: string[] = [];
  const trimmed = text.trim();
  const words = trimmed.split(/\s+/).filter(Boolean).length;
  // The free tier measured that models overshoot word budgets consistently;
  // a 15% margin stops a merely-long section costing a paid retry.
  const floor = Math.round(brief.minWords * 0.85);
  const ceiling = Math.round(brief.maxWords * 1.15);

  if (!trimmed) problems.push("sección vacía");
  else {
    if (words < floor || words > ceiling) {
      problems.push(`${words} palabras (rango ${floor}-${ceiling})`);
    }
    if (!/[.!?…]["»)]?$/.test(trimmed)) problems.push("texto truncado: no termina en puntuación final");
  }

  return { ok: problems.length === 0, problems, genderMarks: countGenderMarks(trimmed) };
}
```

- [ ] **Step 4: Run the whole suite**

Run: `npm test`
Expected: PASS — **201 tests** (194 after Task 4, plus 7 here)

- [ ] **Step 5: Commit**

```bash
git add src/validate.ts tests/validate.test.ts
git commit -m "feat: per-section structural validation, gender marks logged not gated"
```

---

### Task 6: Compose sections back into a report

**Files:**
- Modify: `src/report.ts`
- Test: `tests/compose.test.ts`

**Interfaces:**
- Consumes: `SECTION_TITLES`, `parseReport` (Task 3)
- Produces: `composeReport(bodies: string[]): string` — takes 8 section bodies in order, returns full report markdown

- [ ] **Step 1: Write the failing test**

Create `tests/compose.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { composeReport, parseReport, SECTION_TITLES } from "../src/report";

const body = (n: number) => `Cuerpo ${n}. ` + "palabra ".repeat(60) + "final.";
const bodies = () => SECTION_TITLES.map((_, i) => body(i));

describe("composeReport", () => {
  it("round-trips through parseReport", () => {
    const parsed = parseReport(composeReport(bodies()));
    expect(parsed).not.toBeNull();
    expect(parsed!.sections).toHaveLength(8);
    expect(parsed!.sections.map((s) => s.title)).toEqual([...SECTION_TITLES]);
    expect(parsed!.sections[3].body).toContain("Cuerpo 3.");
  });

  it("emits each title exactly once as a level-two heading", () => {
    const md = composeReport(bodies());
    for (const title of SECTION_TITLES) {
      expect(md.match(new RegExp(`^## ${title}$`, "gm"))).toHaveLength(1);
    }
  });

  it("strips a heading the model emitted despite being told not to", () => {
    const withHeading = bodies();
    withHeading[0] = `## ${SECTION_TITLES[0]}\n\n${withHeading[0]}`;
    const md = composeReport(withHeading);
    expect(md.match(new RegExp(`^## ${SECTION_TITLES[0]}$`, "gm"))).toHaveLength(1);
    expect(parseReport(md)).not.toBeNull();
  });

  it("rejects the wrong number of sections", () => {
    expect(() => composeReport(["solo una"])).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/compose.test.ts`
Expected: FAIL — `composeReport is not a function`

- [ ] **Step 3: Write minimal implementation**

Add to `src/report.ts`:

```ts
/**
 * Reassemble section bodies into the markdown parseReport understands.
 * A model told not to emit a heading sometimes emits one anyway; stripping it
 * here is cheaper than a retry, and a duplicated heading breaks the parser.
 */
export function composeReport(bodies: string[]): string {
  if (bodies.length !== SECTION_TITLES.length) {
    throw new RangeError(`Se esperaban ${SECTION_TITLES.length} secciones, llegaron ${bodies.length}`);
  }
  return SECTION_TITLES.map((title, i) => {
    const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const body = bodies[i].replace(new RegExp(`^#{1,3}[ \\t]*${escaped}[ \\t]*$`, "im"), "").trim();
    return `## ${title}\n\n${body}`;
  }).join("\n\n");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/compose.test.ts && npm test`
Expected: PASS — **205 tests** (201 after Task 5, plus 4 here)

- [ ] **Step 5: Commit**

```bash
git add src/report.ts tests/compose.test.ts
git commit -m "feat: compose generated sections into a parseable report"
```

---

### Task 7: The measuring battery (`scripts/battery-sections.ts`)

This is the task that pays for the whole plan: it measures the risk accepted in Addendum 10 — whether DeepSeek V4 Pro under per-section briefing holds up against Kimi's 54-point single call.

**Files:**
- Create: `scripts/battery-sections.ts`
- No test file: batteries cost money and need the network, so they never enter `npm test`.

**Interfaces:**
- Consumes: everything from Tasks 1-6
- Produces: a run report on stdout plus full reports in `bakeoff-out/sections/<chart>.md`

- [ ] **Step 1: Verify the model slugs before spending anything**

HANDOVER warns that OpenRouter slugs drift and a stale slug writes an error rather than crashing. Check `deepseek/deepseek-v4-pro` and `moonshotai/kimi-k3` against openrouter.ai/models and correct the constants if they have moved.

- [ ] **Step 2: Write the script**

Create `scripts/battery-sections.ts`:

```ts
/**
 * Per-section battery. NOT part of `npm test` — it costs money and needs the
 * network. Measures the decision recorded in HANDOVER Addendum 10: whether
 * DeepSeek V4 Pro under per-section briefing holds quality against Kimi's
 * single-call baseline (2297-2630 words, 367-454 in section 5).
 *
 *   npx tsx --env-file=.env.local scripts/battery-sections.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { computeNatalChart } from "../src/chart";
import { resolveBirthUtc } from "../src/birthtime";
import { buildSectionMessages, composeReport, parseReport, SECTION_TITLES } from "../src/report";
import { allocateFeatures } from "../src/allocate";
import { briefFor } from "../src/sections";
import { repair, validateSection } from "../src/validate";
import type { NatalChart } from "../src/types";

const PRIMARY = "deepseek/deepseek-v4-pro";
const ESCALATION = "moonshotai/kimi-k3";
const PRIMARY_ATTEMPTS = 2;
const OUT = "bakeoff-out/sections";

function chartFor(
  local: { year: number; month: number; day: number; hour: number; minute: number },
  latitude: number, longitude: number,
): NatalChart {
  const { utc } = resolveBirthUtc(local, latitude, longitude);
  return computeNatalChart({ utc, latitude, longitude });
}

const CASES = [
  { name: "madrid-1992", chart: chartFor({ year: 1992, month: 4, day: 15, hour: 10, minute: 30 }, 40.4168, -3.7038) },
  { name: "buenosaires-1985", chart: chartFor({ year: 1985, month: 11, day: 2, hour: 11, minute: 20 }, -34.6037, -58.3816) },
  // The canary. Leo Sun/Venus drags Spanish toward feminine participles.
  { name: "bilbao-2000", chart: chartFor({ year: 2000, month: 7, day: 30, hour: 4, minute: 15 }, 43.263, -2.935) },
];

interface Outcome { body: string; model: string; attempts: number; cost: number; genderMarks: string[] }

async function call(model: string, messages: unknown, maxTokens: number) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: maxTokens }),
  });
  if (!res.ok) return { text: "", cost: 0, note: `HTTP ${res.status}` };
  const data = await res.json();
  // Never trust status alone — reasoning models return 200 with empty content.
  return {
    text: data.choices?.[0]?.message?.content ?? "",
    cost: data.usage?.cost ?? 0,
    note: data.choices?.[0]?.finish_reason ?? "",
  };
}

async function generateSection(chart: NatalChart, section: number, allocation: ReturnType<typeof allocateFeatures>, priorOpenings?: string[]): Promise<Outcome> {
  const brief = briefFor(section);
  const messages = buildSectionMessages({ chart, section, allocation, priorOpenings });
  let cost = 0;

  for (let attempt = 1; attempt <= PRIMARY_ATTEMPTS + 1; attempt++) {
    const escalated = attempt > PRIMARY_ATTEMPTS;
    const model = escalated ? ESCALATION : PRIMARY;
    const { text, cost: c } = await call(model, messages, escalated ? 40000 : 4000);
    cost += c;
    if (!text.trim()) continue;

    const body = repair(text.trim());
    const verdict = validateSection(body, brief);
    if (verdict.ok) return { body, model, attempts: attempt, cost, genderMarks: verdict.genderMarks };
    console.log(`    ${brief.title} intento ${attempt} (${model}) rechazado: ${verdict.problems.join("; ")}`);
  }
  return { body: "", model: "", attempts: PRIMARY_ATTEMPTS + 1, cost, genderMarks: [] };
}

async function main() {
  if (!process.env.OPENROUTER_API_KEY) {
    console.error("Falta OPENROUTER_API_KEY (usa --env-file=.env.local)");
    process.exit(1);
  }
  mkdirSync(OUT, { recursive: true });

  for (const c of CASES) {
    console.log(`\n=== ${c.name} ===`);
    const started = Date.now();
    const allocation = allocateFeatures(c.chart);

    // Wave 1: sections 0-6 concurrently.
    const wave1 = await Promise.all(
      [0, 1, 2, 3, 4, 5, 6].map((s) => generateSection(c.chart, s, allocation)),
    );
    // Wave 2: the synthesis, fed the first sentence of each earlier section.
    const openings = wave1.map((o) => (o.body.match(/^[\s\S]*?[.!?…](?=\s|$)/)?.[0] ?? "").trim());
    const wave2 = await generateSection(c.chart, 7, allocation, openings);

    const all = [...wave1, wave2];
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    const cost = all.reduce((s, o) => s + o.cost, 0);
    const escalated = all.filter((o) => o.model === ESCALATION).length;
    const marks = all.flatMap((o) => o.genderMarks);
    const missing = all.filter((o) => !o.body).length;

    if (missing) { console.log(`  ${missing} secciones sin generar — informe incompleto`); continue; }

    const markdown = composeReport(all.map((o) => o.body));
    writeFileSync(`${OUT}/${c.name}.md`, markdown);
    const parsed = parseReport(markdown);

    console.log(`  ${seconds}s · $${cost.toFixed(4)} · escalados a Kimi: ${escalated}/8`);
    console.log(`  parseReport: ${parsed ? `OK, ${parsed.wordCount} palabras` : "NULL"}`);
    console.log(`  marcas de género registradas: ${marks.length}${marks.length ? ` (${marks.slice(0, 5).join(", ")})` : ""}`);
    all.forEach((o, i) => console.log(`    ${i}. ${SECTION_TITLES[i]} — ${o.body.split(/\s+/).length} palabras, ${o.attempts} intento(s), ${o.model}`));
  }
  console.log(`\nInformes en ${OUT}/ — léelos antes de dar esto por bueno.`);
}

main();
```

- [ ] **Step 3: Run it**

```bash
npx tsx --env-file=.env.local scripts/battery-sections.ts
```

Expected: three reports written, each printing wall clock, cost, escalation count and gender marks. Compare against the single-call Kimi baseline in HANDOVER Addendum 8: 2297-2630 words, section 5 at 367-454 words, $0.218-0.481, ~5 minutes.

- [ ] **Step 4: Read the reports**

Open `bakeoff-out/sections/*.md`. The regex checks are not proof — Addendum 7 records `FREE_TIER_ECHO` producing a false alarm. Judge whether sections repeat each other, whether the synthesis actually synthesizes, and whether the prose holds up against `bakeoff-out/section5/` from the Kimi run.

- [ ] **Step 5: Record the measurement in HANDOVER**

Add an addendum with wall clock, cost, escalation rate, gender marks and your quality read. If DeepSeek does not hold up, this is the evidence that reopens Addendum 10 — that is what the battery is for.

- [ ] **Step 6: Commit**

```bash
git add scripts/battery-sections.ts bakeoff-out/sections HANDOVER.md
git commit -m "test: per-section battery, measures the Addendum 10 decision"
```

---

## Self-Review

**Spec coverage.** Decisions 3 (two waves), 4 (deterministic allocation), 5 (V4 Pro primary, Kimi escalation), 6 (no gender gate, marks logged) and the pending `parseReport` fix all map to tasks 1-7. Decisions 1, 2, 7 and 8 (no account, birth data at checkout, scope, vendors) belong to the payment and delivery plans and are deliberately out of scope here — noted under **Scope** in the header.

**Deliberately deferred to plan 2.** Section word ranges are validated but the `focus` growth path is only exercised in unit tests, since the battery runs `focus: "general"`. Storage of per-section `model`/`attempts`/`cost`/`gender_marks` is designed in the spec's `report_sections` table but has nowhere to live until Supabase exists; the battery prints the same fields to stdout meanwhile.

**Type consistency.** `AspectRef` and `SectionAllocation` are defined in Task 2 and consumed under those names in Tasks 4 and 7. `SectionBrief`/`briefFor` are defined in Task 1 and consumed in Tasks 4, 5 and 7. `composeReport(bodies: string[])` takes bodies, not `{title, body}` objects — Task 7 calls it as `composeReport(all.map((o) => o.body))`, which matches. `validateSection(text, brief)` has the same two-argument shape in Tasks 5 and 7.

**Test count arithmetic.** 169 baseline → 175 (T1) → 182 (T2) → 185 (T3) → 194 (T4) → 201 (T5) → 205 (T6). The per-task "expected" figures in Tasks 3, 5 and 6 assume the preceding tasks landed; if executed out of order, trust `npm test` over the stated number.
