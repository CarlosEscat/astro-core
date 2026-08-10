# Delivery UI and Share Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The buyer reads their report. Plus the shareable 9:16 card that Addendum 1 keeps in the MVP for distribution value.

**Architecture:** Two phases, deliberately ordered so the half that needs no vendors comes first. **Phase A** (tasks 1-3) renders a report from data alone and is executable *today* against the three real reports already in `bakeoff-out/sections/` — no database, no Stripe, no queue. **Phase B** (tasks 4-7) wires that renderer to a real order behind a token, and cannot start until plans 2 and 3 land.

**Tech Stack:** Next.js **16.3.0** App Router, React 19, Tailwind 4 + the existing CSS custom properties in `web/src/app/globals.css`, vitest 4 via the repo-root config.

**Spec:** `docs/superpowers/specs/2026-08-08-paid-report-flow-design.md`
**Roadmap:** `docs/superpowers/plans/2026-08-08-paid-report-roadmap.md` (plan 4 section)

**Scope:** Rendering, the holding page, and the share card. PDF export is explicitly out (its own spec — Puppeteer over this same component, which is why the component must not depend on browser-only APIs to render its prose).

---

## Why this plan is reordered relative to the roadmap

The roadmap lists plan 4 as depending on plan 3, and for the delivery route that is true. But the **report component and the share card depend on nothing** — they need eight `{title, body}` objects, and three real reports already exist on disk from plan 1's battery.

Doing that half first buys two things beyond "something to look at":

1. **It answers an open product question.** HANDOVER Addendum 12 recorded that reports now run 2877-3071 words with 12 of 24 sections over their brief, and flagged the decision as one to make *before* plan 4 renders them. Rendering them is how the decision gets made — a 3,000-word wall reads very differently from a well-sectioned long read.
2. **It pins the section data shape before plan 3 persists it.** Same argument that put plan 1 first: learn the constraint before building infrastructure on an assumption about it.

Phase B tasks are marked with their prerequisite and must not be started early.

---

## Global Constraints

- `npm test` must stay green from the repo root. Baseline **215 tests in 13 files** (or ~264 if plan 2 landed first — trust the runner).
- **Read `web/AGENTS.md` before writing any code under `web/`.** This is Next.js 16.3.0 and its docs are bundled at `web/node_modules/next/dist/docs/`. Do not write Next.js from memory. Note in particular that `params` in a dynamic route is a **Promise** since 15.0.
- **No markdown library.** `prompts/system-section.md` forbids lists, bullets and bold, so a section body is always plain paragraphs. `body.split(/\n{2,}/)` → `<p>` is sufficient and is what `BirthForm.tsx` already does for the free reading. Adding a markdown renderer would import an injection surface for zero benefit.
- **Reuse the design language, do not invent one.** Tokens live in `web/src/app/globals.css` (`--ink`, `--bone`, `--brass`, `--copper`, `--font-display`, `--measure`). "Precision as mysticism" — the astronomer's instrument, not the purple fog of the category (Addendum 5).
- **Zodiac glyphs must carry U+FE0E** or they render as colour emoji on Apple platforms. `SIGN_GLYPH` in `src/copy/signs.es.ts` already does; never re-type a glyph by hand.
- All user-facing strings are Spanish (es-ES, "de tú"), and **hand-written copy is held to the same gender discipline as LLM output** — Addendum 6 records a gendered section heading shipping in the prototype. `tests/copy.test.ts` exists for exactly this.
- The token is the only credential: the report route is rate limited and a bad token must not reveal whether it exists.
- Commit after every task.

---

## File Structure

| File | Responsibility |
|---|---|
| `web/src/components/ReportView.tsx` | The report: section headings + prose. Pure, no data fetching. |
| `web/src/components/ReportIndex.tsx` | Section index for a ~3,000-word read. |
| `web/src/components/ShareCard.tsx` | The 9:16 card as inline SVG, plus its download/share affordance. |
| `web/src/lib/report-format.ts` | `paragraphsOf`, `readingMinutes` — pure helpers, unit-tested. |
| `web/src/app/preview/informe/[chart]/page.tsx` | **Phase A only.** Dev-only route rendering the on-disk battery reports. |
| `web/src/app/informe/[token]/page.tsx` | **Phase B.** The real delivery route. |
| `web/src/app/informe/[token]/HoldingPage.tsx` | **Phase B.** Client component: states + polling. |
| `web/src/app/api/informe/[token]/route.ts` | **Phase B.** JSON status + sections for polling. |
| `web/tests/report-format.test.ts`, `web/tests/report-view.test.tsx` | Their tests. |

---

# PHASE A — no vendors, executable today

### Task 1: Report formatting helpers (`web/src/lib/report-format.ts`)

Small and pure, so the component in Task 2 has nothing to compute inline.

**Files:**
- Create: `web/src/lib/report-format.ts`
- Test: `web/tests/report-format.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `paragraphsOf(body: string): string[]`, `readingMinutes(words: number): number`, `slugify(title: string): string`

- [ ] **Step 1: Write the failing test**

Create `web/tests/report-format.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { paragraphsOf, readingMinutes, slugify } from "@/lib/report-format";

describe("paragraphsOf", () => {
  it("splits on blank lines", () => {
    expect(paragraphsOf("Uno.\n\nDos.\n\nTres.")).toEqual(["Uno.", "Dos.", "Tres."]);
  });

  it("tolerates the extra blank lines models emit", () => {
    expect(paragraphsOf("Uno.\n\n\n\nDos.")).toEqual(["Uno.", "Dos."]);
  });

  it("treats a single unbroken block as one paragraph", () => {
    expect(paragraphsOf("Una sola parrafada larga.")).toHaveLength(1);
  });

  it("trims and drops empties rather than rendering blank <p>", () => {
    expect(paragraphsOf("\n\n  Uno.  \n\n\n")).toEqual(["Uno."]);
    expect(paragraphsOf("   ")).toEqual([]);
  });

  // The section prompt forbids lists and bold, so a stray "## " means the
  // model emitted a heading composeReport failed to strip. Render it as prose
  // rather than swallowing it — silently dropping text is worse than showing it.
  it("keeps stray markdown as literal text", () => {
    expect(paragraphsOf("## Título\n\nCuerpo.")).toEqual(["## Título", "Cuerpo."]);
  });
});

describe("readingMinutes", () => {
  // ~200 wpm is the standard for prose in a first language.
  it("rounds up to whole minutes", () => {
    expect(readingMinutes(200)).toBe(1);
    expect(readingMinutes(201)).toBe(2);
    expect(readingMinutes(3000)).toBe(15);
  });

  it("never claims zero minutes", () => {
    expect(readingMinutes(0)).toBe(1);
    expect(readingMinutes(10)).toBe(1);
  });
});

describe("slugify", () => {
  it("makes an anchor id from a Spanish heading", () => {
    expect(slugify("Amor y vínculos")).toBe("amor-y-vinculos");
    expect(slugify("Tu retrato esencial")).toBe("tu-retrato-esencial");
  });

  it("strips accents rather than emitting them into an id", () => {
    expect(slugify("Vocación y propósito")).toBe("vocacion-y-proposito");
  });

  it("is stable and collision-free across the eight real titles", () => {
    const titles = [
      "Tu retrato esencial", "El corazón de tu identidad", "Tu mundo emocional",
      "La puerta por la que entras al mundo", "Amor y vínculos",
      "Vocación y propósito", "Tus luces y tus sombras", "Claves para tu camino",
    ];
    const slugs = titles.map(slugify);
    expect(new Set(slugs).size).toBe(8);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9-]+$/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run web/tests/report-format.test.ts`
Expected: FAIL — `Cannot find module '@/lib/report-format'`

- [ ] **Step 3: Write minimal implementation**

Create `web/src/lib/report-format.ts`:

```ts
/**
 * A section body is always plain paragraphs: prompts/system-section.md forbids
 * lists, bullets and bold, so there is no markdown to parse. This is the same
 * treatment BirthForm already gives the free reading.
 */
export function paragraphsOf(body: string): string[] {
  return body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
}

const WORDS_PER_MINUTE = 200;

export function readingMinutes(words: number): number {
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

/** Anchor id for a Spanish section title. Accents are stripped, not encoded. */
export function slugify(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run web/tests/report-format.test.ts`
Expected: PASS (12 tests)

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/report-format.ts web/tests/report-format.test.ts
git commit -m "feat: report formatting helpers"
```

---

### Task 2: The report component and a preview route over the real reports

This is the task that produces something to look at. It renders the three battery reports from `bakeoff-out/sections/` with no database involved.

**Files:**
- Create: `web/src/components/ReportView.tsx`
- Create: `web/src/components/ReportIndex.tsx`
- Create: `web/src/app/preview/informe/[chart]/page.tsx`
- Modify: `web/src/app/globals.css` (report styles)
- Test: `web/tests/report-view.test.tsx`

**Interfaces:**
- Consumes: `paragraphsOf`, `readingMinutes`, `slugify` (Task 1)
- Produces: `ReportSection { title: string; body: string }`, `ReportView({ sections, firstName? })`, `ReportIndex({ sections })`

- [ ] **Step 1: Add the React testing dependencies**

```bash
cd web && npm i -D @testing-library/react @testing-library/dom jsdom && cd ..
```

Then teach the root `vitest.config.ts` to run `.tsx` tests in a DOM. If plan 2 has not landed and no `vitest.config.ts` exists yet, create it with exactly this content; if it exists, merge the `environmentMatchGlobs` and the `include` entry in.

```ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts", "web/tests/**/*.test.{ts,tsx}"],
    // Only the component tests pay for a DOM; the rest stay in node.
    environmentMatchGlobs: [["web/tests/**/*.test.tsx", "jsdom"]],
  },
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: {
      "@core": r("./src"),
      "@/": `${r("./web/src")}/`,
      "server-only": r("./web/node_modules/server-only/empty.js"),
    },
  },
});
```

- [ ] **Step 2: Write the failing test**

Create `web/tests/report-view.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ReportView } from "@/components/ReportView";
import { ReportIndex } from "@/components/ReportIndex";

afterEach(cleanup);

const sections = [
  { title: "Tu retrato esencial", body: "Primer párrafo.\n\nSegundo párrafo." },
  { title: "El corazón de tu identidad", body: "Cuerpo dos." },
  { title: "Amor y vínculos", body: "Cuerpo tres." },
];

describe("ReportView", () => {
  it("renders every section title as a heading", () => {
    render(<ReportView sections={sections} />);
    for (const s of sections) {
      expect(screen.getByRole("heading", { name: s.title })).toBeDefined();
    }
  });

  it("renders each paragraph separately rather than one block", () => {
    const { container } = render(<ReportView sections={sections} />);
    const first = container.querySelector("section");
    expect(first?.querySelectorAll("p")).toHaveLength(2);
  });

  it("gives each section an anchor id matching its slug", () => {
    const { container } = render(<ReportView sections={sections} />);
    expect(container.querySelector("#amor-y-vinculos")).not.toBeNull();
  });

  it("greets by first name when there is one, and omits it otherwise", () => {
    const { unmount } = render(<ReportView sections={sections} firstName="Lucía" />);
    expect(screen.getByText(/Lucía/)).toBeDefined();
    unmount();
    render(<ReportView sections={sections} />);
    expect(screen.queryByText(/Lucía/)).toBeNull();
  });

  // Progressive rendering (Task 6) hands this component a partial array.
  // It must be a normal state, not a crash or an empty page.
  it("renders a partial report without complaining", () => {
    const { container } = render(<ReportView sections={sections.slice(0, 1)} />);
    expect(container.querySelectorAll("section")).toHaveLength(1);
  });

  it("renders nothing rather than throwing when given no sections", () => {
    const { container } = render(<ReportView sections={[]} />);
    expect(container.querySelectorAll("section")).toHaveLength(0);
  });

  // The prompt bans markup, so any that arrives is a model slip. It must show
  // as text — never be injected as HTML.
  it("does not interpret markup in a body as HTML", () => {
    const hostile = [{ title: "Tu retrato esencial", body: "<img src=x onerror=alert(1)>" }];
    const { container } = render(<ReportView sections={hostile} />);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText(/<img/)).toBeDefined();
  });
});

describe("ReportIndex", () => {
  it("links to every section", () => {
    render(<ReportIndex sections={sections} />);
    const link = screen.getByRole("link", { name: "Amor y vínculos" });
    expect(link.getAttribute("href")).toBe("#amor-y-vinculos");
  });

  it("numbers the sections", () => {
    const { container } = render(<ReportIndex sections={sections} />);
    expect(container.textContent).toContain("01");
    expect(container.textContent).toContain("03");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run web/tests/report-view.test.tsx`
Expected: FAIL — `Cannot find module '@/components/ReportView'`

- [ ] **Step 4: Write the components**

Create `web/src/components/ReportView.tsx`:

```tsx
import { paragraphsOf, slugify } from "@/lib/report-format";

export interface ReportSection { title: string; body: string }

/**
 * The report itself. Pure: it takes sections and renders them, so the same
 * component serves the preview route, the delivery route, the progressive
 * (partial) state, and later the PDF renderer. It must not fetch, poll or
 * touch browser-only APIs — Puppeteer will render this exact component.
 *
 * Bodies are plain paragraphs by construction (the section prompt forbids
 * lists and bold), and React escapes them, so model output can never inject
 * markup.
 */
export function ReportView({
  sections, firstName,
}: { sections: ReportSection[]; firstName?: string }) {
  return (
    <article className="report">
      {firstName && (
        <p className="report__greeting">
          Para {firstName}, a partir de la carta que calculamos con tus datos.
        </p>
      )}
      {sections.map((s) => (
        <section key={s.title} id={slugify(s.title)} className="report__section">
          <h2 className="report__title">{s.title}</h2>
          {paragraphsOf(s.body).map((p, i) => (
            <p key={i} className="report__p">{p}</p>
          ))}
        </section>
      ))}
    </article>
  );
}
```

Create `web/src/components/ReportIndex.tsx`:

```tsx
import { slugify } from "@/lib/report-format";
import type { ReportSection } from "./ReportView";

/**
 * A ~3,000-word report is a 15-minute read (HANDOVER Addendum 12 measured
 * 2877-3071 words). Without an index the buyer meets a wall of prose and has
 * no way back to the section they wanted.
 */
export function ReportIndex({ sections }: { sections: ReportSection[] }) {
  return (
    <nav className="rindex" aria-label="Secciones del informe">
      <ol className="rindex__list">
        {sections.map((s, i) => (
          <li key={s.title} className="rindex__item">
            <a className="rindex__link" href={`#${slugify(s.title)}`}>
              <span className="rindex__num">{String(i + 1).padStart(2, "0")}</span>
              <span className="rindex__name">{s.title}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
```

- [ ] **Step 5: Add the styles**

Append to `web/src/app/globals.css`:

```css
/* ── The paid report ────────────────────────────────────────────── */

.report { max-width: var(--measure); margin: 0 auto; }

.report__greeting {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--bone-dim);
  border-bottom: 1px solid var(--ink-line);
  padding-bottom: 1.25rem;
  margin-bottom: 2.5rem;
}

.report__section { margin: 0 0 3.5rem; scroll-margin-top: 2rem; }

.report__title {
  font-family: var(--font-display);
  font-size: clamp(1.5rem, 1.2rem + 1.4vw, 2rem);
  font-weight: 400;
  line-height: 1.15;
  color: var(--bone);
  margin: 0 0 1.25rem;
}

/* A brass rule under each title: the engraved-instrument language, and it
   gives the eye a rung to find when scrolling a 15-minute read. */
.report__title::after {
  content: "";
  display: block;
  width: 2.5rem;
  height: 1px;
  margin-top: 0.75rem;
  background: var(--brass);
}

.report__p { margin: 0 0 1.15rem; text-wrap: pretty; }
.report__p:last-child { margin-bottom: 0; }

.rindex {
  max-width: var(--measure);
  margin: 0 auto 3.5rem;
  border: 1px solid var(--ink-line);
  border-radius: 3px;
  background: var(--ink-raised);
  padding: 1.5rem 1.25rem;
}

.rindex__list { list-style: none; margin: 0; padding: 0; }
.rindex__item + .rindex__item { border-top: 1px solid var(--ink-line); }

.rindex__link {
  display: flex;
  gap: 0.9rem;
  align-items: baseline;
  padding: 0.6rem 0;
  color: var(--bone);
  text-decoration: none;
}
.rindex__link:hover .rindex__name { color: var(--brass); }

.rindex__num {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--slate);
}
.rindex__name { font-family: var(--font-display); font-size: 1.0625rem; }

.report__meta {
  max-width: var(--measure);
  margin: 0 auto 1.5rem;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--slate);
}
```

- [ ] **Step 6: Write the preview route**

Create `web/src/app/preview/informe/[chart]/page.tsx`:

```tsx
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { notFound } from "next/navigation";
import { parseReport } from "@core/report";
import { ReportView } from "@/components/ReportView";
import { ReportIndex } from "@/components/ReportIndex";
import { readingMinutes } from "@/lib/report-format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DIR = join(process.cwd(), "..", "bakeoff-out", "sections");

/**
 * Development-only preview of the reports plan 1's battery wrote to disk.
 * It exists so the report can be designed and judged before plans 2 and 3
 * make a real one reachable — and so the "is a 3,000-word report the product
 * we want" question in HANDOVER Addendum 12 can be answered by looking at one.
 *
 * Deliberately NOT the delivery route: no token, no order, no payment.
 */
export default async function PreviewReport(
  { params }: { params: Promise<{ chart: string }> },
) {
  // Never serve battery output from production — it is not anybody's report.
  if (process.env.NODE_ENV === "production") notFound();

  // params is a Promise since Next 15; awaiting it is required, not optional.
  const { chart } = await params;
  if (!/^[a-z0-9-]+$/.test(chart)) notFound();   // no path traversal

  let markdown: string;
  try {
    markdown = readFileSync(join(DIR, `${chart}.md`), "utf8");
  } catch {
    const available = readdirSync(DIR).filter((f) => f.endsWith(".md"));
    return (
      <main className="shell">
        <p className="error">No existe {chart}. Disponibles: {available.join(", ")}</p>
      </main>
    );
  }

  const parsed = parseReport(markdown);
  if (!parsed) {
    return <main className="shell"><p className="error">parseReport devolvió null.</p></main>;
  }

  return (
    <main className="shell">
      <p className="report__meta">
        {chart} · {parsed.wordCount.toLocaleString("es-ES")} palabras ·
        {" "}{readingMinutes(parsed.wordCount)} min de lectura
      </p>
      <ReportIndex sections={parsed.sections} />
      <ReportView sections={parsed.sections} firstName="Lucía" />
    </main>
  );
}
```

- [ ] **Step 7: Run the tests**

Run: `npx vitest run web/tests/report-view.test.tsx && npm test`
Expected: PASS (9 more tests)

- [ ] **Step 8: Look at it — this is the point of Phase A**

```bash
cd web && npm run dev
```

Open all three, on a phone width as well as desktop:

- http://localhost:3000/preview/informe/bilbao-2000
- http://localhost:3000/preview/informe/madrid-1992
- http://localhost:3000/preview/informe/buenosaires-1985

Then answer, in HANDOVER, the question Addendum 12 left open: **does a ~3,000-word report read as generous or as a wall?** If it reads as a wall, the fix is upstream in `src/sections.ts` word ranges, not here — say so rather than papering over it with typography.

- [ ] **Step 9: Commit**

```bash
git add web/src/components/ReportView.tsx web/src/components/ReportIndex.tsx \
        web/src/app/preview web/src/app/globals.css web/tests/report-view.test.tsx \
        vitest.config.ts web/package.json web/package-lock.json
git commit -m "feat: report component, section index, and a preview route over the battery reports"
```

---

### Task 3: The 9:16 share card

Addendum 1 keeps this in the MVP for distribution value, and the roadmap notes it needs "the Instagram/TikTok aspect ratio and a share affordance, not new maths" — `Signature.tsx` already computes the real rarity.

**Files:**
- Create: `web/src/components/ShareCard.tsx`
- Modify: `web/src/app/globals.css`
- Modify: `web/src/app/preview/informe/[chart]/page.tsx` (show the card)
- Test: `web/tests/share-card.test.tsx`

**Interfaces:**
- Consumes: `SIGN_ES`, `SIGN_GLYPH`, `ChartResponse["signature"]`
- Produces: `ShareCard({ sig, firstName? })`

- [ ] **Step 1: Write the failing test**

Create `web/tests/share-card.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ShareCard } from "@/components/ShareCard";

afterEach(cleanup);

const sig = { sun: "Leo", moon: "Cancer", ascendant: "Cancer", oneIn: 1728 } as const;

describe("ShareCard", () => {
  it("renders at the 9:16 ratio the platforms expect", () => {
    const { container } = render(<ShareCard sig={sig} />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("viewBox")).toBe("0 0 1080 1920");
  });

  it("names the big three in Spanish", () => {
    const { container } = render(<ShareCard sig={sig} />);
    expect(container.textContent).toContain("Leo");
    expect(container.textContent).toContain("Cáncer");
  });

  it("states the computed rarity, formatted for es-ES", () => {
    const { container } = render(<ShareCard sig={sig} />);
    expect(container.textContent).toContain("1.728");
  });

  // Addendum 5: without U+FE0E these render as colour emoji on Apple
  // platforms, which destroys the engraved look on exactly the devices the
  // card is shared from.
  it("carries the text-presentation selector on every glyph", () => {
    const { container } = render(<ShareCard sig={sig} />);
    expect(container.textContent).toContain("︎");
  });

  it("offers a share affordance", () => {
    render(<ShareCard sig={sig} />);
    expect(screen.getByRole("button", { name: /compartir|guardar/i })).toBeDefined();
  });

  // The copy is hand-written, so it is held to the same standard as LLM
  // output — Addendum 6 records a gendered heading shipping in the prototype.
  it("uses no gendered phrasing", () => {
    const { container } = render(<ShareCard sig={sig} firstName="Lucía" />);
    expect(container.textContent).not.toMatch(/\b(nacida|nacido|preparada|preparado)\b/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run web/tests/share-card.test.tsx`
Expected: FAIL — `Cannot find module '@/components/ShareCard'`

- [ ] **Step 3: Write the component**

Create `web/src/components/ShareCard.tsx`:

```tsx
"use client";

import { useRef, useState } from "react";
import { SIGN_ES, SIGN_GLYPH } from "@core/copy/signs.es";
import type { ChartResponse } from "./types";

const W = 1080;
const H = 1920; // 9:16 — Instagram Stories and TikTok native

/**
 * The shareable "cosmic signature". The statistic is genuinely computed by
 * profile.signature(), never invented — same grounding discipline as the
 * report, because a fake number is exactly the thing this product is not.
 *
 * Drawn as inline SVG at 1080x1920 so one source serves both the on-screen
 * preview and the exported PNG; rasterising happens only on share.
 */
export function ShareCard({
  sig, firstName,
}: { sig: ChartResponse["signature"]; firstName?: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [busy, setBusy] = useState(false);

  const rows = [
    { label: "Sol", sign: sig.sun },
    { label: "Luna", sign: sig.moon },
    { label: "Ascendente", sign: sig.ascendant },
  ];

  async function share() {
    const svg = svgRef.current;
    if (!svg) return;
    setBusy(true);
    try {
      const blob = await rasterise(svg);
      const file = new File([blob], "mi-carta.png", { type: "image/png" });
      // Web Share with files is the good path on mobile, which is where this
      // card is actually shared. Download is the desktop fallback.
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "mi-carta.png";
        a.click();
        URL.revokeObjectURL(url);
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
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Tu combinación astral"
      >
        <rect width={W} height={H} fill="#10131c" />
        <rect x="48" y="48" width={W - 96} height={H - 96} fill="none"
              stroke="#262c3c" strokeWidth="2" />

        <text x={W / 2} y="300" textAnchor="middle" fill="#a9a496"
              fontFamily="var(--font-mono)" fontSize="34" letterSpacing="10">
          TU COMBINACIÓN
        </text>

        {rows.map((r, i) => (
          <g key={r.label} transform={`translate(0 ${560 + i * 240})`}>
            <text x={W / 2} y="0" textAnchor="middle" fill="#c9a227"
                  fontFamily="var(--font-display)" fontSize="120">
              {SIGN_GLYPH[r.sign]}
            </text>
            <text x={W / 2} y="96" textAnchor="middle" fill="#ece6da"
                  fontFamily="var(--font-display)" fontSize="72">
              {SIGN_ES[r.sign]}
            </text>
            <text x={W / 2} y="150" textAnchor="middle" fill="#6e7689"
                  fontFamily="var(--font-mono)" fontSize="30" letterSpacing="6">
              {r.label.toUpperCase()}
            </text>
          </g>
        ))}

        <text x={W / 2} y="1500" textAnchor="middle" fill="#b4653a"
              fontFamily="var(--font-mono)" fontSize="36">
          1 de {sig.oneIn.toLocaleString("es-ES")} combinaciones
        </text>
        {firstName && (
          <text x={W / 2} y="1570" textAnchor="middle" fill="#6e7689"
                fontFamily="var(--font-body)" fontSize="32">
            La carta de {firstName}
          </text>
        )}
        <text x={W / 2} y="1790" textAnchor="middle" fill="#a9a496"
              fontFamily="var(--font-mono)" fontSize="30" letterSpacing="8">
          DESTINY REPORTS
        </text>
      </svg>

      <button className="submit" onClick={share} disabled={busy}>
        {busy ? "Preparando…" : "Compartir o guardar"}
      </button>
    </div>
  );
}

/**
 * SVG → PNG via canvas. Fonts are inlined as computed values by the browser
 * when the SVG is serialised from the live DOM, so the card exports with the
 * same faces it displays.
 */
async function rasterise(svg: SVGSVGElement): Promise<Blob> {
  const source = new XMLSerializer().serializeToString(svg);
  const svgBlob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  try {
    const img = new Image();
    img.decoding = "sync";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("no se pudo rasterizar la tarjeta"));
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

- [ ] **Step 4: Add the styles**

Append to `web/src/app/globals.css`:

```css
.share { max-width: var(--measure); margin: 0 auto 3rem; text-align: center; }

.share__card {
  display: block;
  width: min(280px, 70vw);
  height: auto;
  margin: 0 auto 1rem;
  border: 1px solid var(--ink-line);
  border-radius: 4px;
}
```

- [ ] **Step 5: Show it in the preview route**

In `web/src/app/preview/informe/[chart]/page.tsx`, import `ShareCard` and render it above `ReportIndex` with a fixed signature, since the preview has no chart object:

```tsx
<ShareCard sig={{ sun: "Leo", moon: "Cancer", ascendant: "Cancer", oneIn: 1728 }} />
```

Phase B replaces that literal with the order's real snapshotted signature.

- [ ] **Step 6: Run the tests and look at it**

Run: `npx vitest run web/tests/share-card.test.tsx && npm test`
Expected: PASS (6 more tests)

Then reload the preview route and click **Compartir o guardar**. Confirm the PNG is 1080×1920 and the glyphs are brass line-art, not colour emoji.

- [ ] **Step 7: Commit**

```bash
git add web/src/components/ShareCard.tsx web/tests/share-card.test.tsx \
        web/src/app/globals.css web/src/app/preview
git commit -m "feat: 9:16 shareable signature card with PNG export"
```

---

# PHASE B — needs plans 2 and 3

> **Do not start Phase B until plan 2 (orders, payment, persistence) and plan 3 (queued generation pipeline) have landed.** Every task below reads an order or its sections; without them there is nothing to render and nothing to poll. Phase A is complete and useful on its own.

### Task 4: `/informe/<token>` — server lookup

**Prerequisite: plan 2.**

**Files:**
- Create: `web/src/app/informe/[token]/page.tsx`
- Create: `web/src/lib/rate-limit.ts`
- Test: `web/tests/rate-limit.test.ts`

**Interfaces:**
- Consumes: `OrderStore.findByToken` (plan 2 Task 5)
- Produces: `rateLimit(key: string, limit: number, windowMs: number): boolean`

- [ ] **Step 1: Write the failing test**

Create `web/tests/rate-limit.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { rateLimit, resetRateLimits } from "@/lib/rate-limit";

beforeEach(() => { resetRateLimits(); vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe("rateLimit", () => {
  it("allows up to the limit then refuses", () => {
    for (let i = 0; i < 5; i++) expect(rateLimit("ip-1", 5, 60_000)).toBe(true);
    expect(rateLimit("ip-1", 5, 60_000)).toBe(false);
  });

  it("keeps callers independent", () => {
    for (let i = 0; i < 5; i++) rateLimit("ip-1", 5, 60_000);
    expect(rateLimit("ip-2", 5, 60_000)).toBe(true);
  });

  it("lets the window expire", () => {
    for (let i = 0; i < 5; i++) rateLimit("ip-1", 5, 60_000);
    expect(rateLimit("ip-1", 5, 60_000)).toBe(false);
    vi.advanceTimersByTime(60_001);
    expect(rateLimit("ip-1", 5, 60_000)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run web/tests/rate-limit.test.ts`
Expected: FAIL — `Cannot find module '@/lib/rate-limit'`

- [ ] **Step 3: Write minimal implementation**

Create `web/src/lib/rate-limit.ts`:

```ts
/**
 * In-process fixed-window limiter. The token is the report's only credential,
 * so an unlimited lookup endpoint is an offline guessing oracle — 256 bits is
 * not brute-forceable, but the limiter also caps the damage from a leaked link
 * being scraped. Per-instance state is acceptable because it only ever
 * under-counts across instances, never over-counts a legitimate reader.
 */
const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || now >= entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

/** Test-only. */
export function resetRateLimits() { hits.clear(); }
```

- [ ] **Step 4: Write the page**

Create `web/src/app/informe/[token]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { supabaseOrderStore } from "@/lib/orders-store.supabase";
import { rateLimit } from "@/lib/rate-limit";
import { HoldingPage } from "./HoldingPage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function InformePage(
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "desconocida";
  if (!rateLimit(`informe:${ip}`, 30, 60_000)) {
    return <main className="shell"><p className="error">Demasiadas peticiones. Espera un minuto.</p></main>;
  }

  const order = await supabaseOrderStore().findByToken(token);
  // 404 for an unknown token AND for one that never got paid: the response must
  // not reveal which of the two it was.
  if (!order || order.status === "pending_payment" || order.status === "expired") notFound();

  return <HoldingPage token={token} initialStatus={order.status} />;
}
```

- [ ] **Step 5: Run the suite**

Run: `npm test && cd web && npx tsc --noEmit && cd ..`
Expected: PASS (3 more tests)

- [ ] **Step 6: Commit**

```bash
git add web/src/app/informe web/src/lib/rate-limit.ts web/tests/rate-limit.test.ts
git commit -m "feat: token-guarded report route with rate limiting"
```

---

### Task 5: Status endpoint for polling

**Prerequisite: plans 2 and 3.**

**Files:**
- Create: `web/src/app/api/informe/[token]/route.ts`
- Test: `web/tests/informe-api.test.ts`

**Interfaces:**
- Consumes: `OrderStore` (plan 2), `report_sections` reads (plan 3)
- Produces: `createInformeApi(deps)` returning `{ status, sections, firstName, signature }`

- [ ] **Step 1: Write the failing test**

Create `web/tests/informe-api.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { createInformeApi } from "@/app/api/informe/[token]/route";

const sections = [{ index: 0, title: "Tu retrato esencial", body: "Cuerpo." }];

function deps(overrides: Record<string, unknown> = {}) {
  return {
    findByToken: async (t: string) =>
      t === "bueno" ? { id: "o1", status: "generating", firstName: "Lucía" } : null,
    sectionsFor: async () => sections,
    ...overrides,
  } as never;
}

const get = (token: string, d = deps()) =>
  createInformeApi(d)(new Request(`http://localhost/api/informe/${token}`), token);

describe("GET /api/informe/[token]", () => {
  it("returns status and the sections landed so far", async () => {
    const res = await get("bueno");
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("generating");
    expect(json.sections).toHaveLength(1);
  });

  // Must not reveal whether a token exists.
  it("404s an unknown token with no distinguishing body", async () => {
    const res = await get("malo");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "No encontrado" });
  });

  it("orders sections by index even when they land out of order", async () => {
    const jumbled = [
      { index: 2, title: "Tu mundo emocional", body: "c" },
      { index: 0, title: "Tu retrato esencial", body: "a" },
    ];
    const res = await get("bueno", deps({ sectionsFor: async () => jumbled }));
    const json = await res.json();
    expect(json.sections.map((s: { index: number }) => s.index)).toEqual([0, 2]);
  });

  it("tells the client to stop polling on a terminal status", async () => {
    for (const status of ["ready", "failed"]) {
      const res = await get("bueno", deps({
        findByToken: async () => ({ id: "o1", status, firstName: null }),
      }));
      expect((await res.json()).done).toBe(true);
    }
    const res = await get("bueno");
    expect((await res.json()).done).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run web/tests/informe-api.test.ts`
Expected: FAIL — `Cannot find module '@/app/api/informe/[token]/route'`

- [ ] **Step 3: Write the route**

Create `web/src/app/api/informe/[token]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { supabaseOrderStore } from "@/lib/orders-store.supabase";
import { sectionsForOrder } from "@/lib/sections-store";  // plan 3 provides this

export const runtime = "nodejs";

interface Deps {
  findByToken: (token: string) => Promise<{ id: string; status: string; firstName: string | null } | null>;
  sectionsFor: (orderId: string) => Promise<Array<{ index: number; title: string; body: string }>>;
}

const TERMINAL = new Set(["ready", "failed"]);

export function createInformeApi(deps: Deps) {
  return async function handle(_req: Request, token: string): Promise<Response> {
    const order = await deps.findByToken(token);
    // Identical response for "no such token" and "not yours": the token is the
    // only credential, so the 404 must not confirm one exists.
    if (!order) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const sections = (await deps.sectionsFor(order.id)).sort((a, b) => a.index - b.index);

    return NextResponse.json({
      status: order.status,
      firstName: order.firstName,
      sections,
      done: TERMINAL.has(order.status),
    });
  };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const store = supabaseOrderStore();
  return createInformeApi({
    findByToken: async (t) => {
      const o = await store.findByToken(t);
      return o ? { id: o.id, status: o.status, firstName: o.birth?.firstName ?? null } : null;
    },
    sectionsFor: sectionsForOrder,
  })(req, token);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run web/tests/informe-api.test.ts && npm test`
Expected: PASS (4 more tests)

- [ ] **Step 5: Commit**

```bash
git add web/src/app/api/informe web/tests/informe-api.test.ts
git commit -m "feat: status and sections endpoint for the holding page"
```

---

### Task 6: Holding page with progressive rendering

**Prerequisite: plans 2 and 3.** This is what turns ~30 s into a readable experience rather than a wait — and it is why the spec says email stops being the primary delivery.

**Files:**
- Create: `web/src/app/informe/[token]/HoldingPage.tsx`
- Modify: `web/src/app/globals.css`
- Test: `web/tests/holding-page.test.tsx`

**Interfaces:**
- Consumes: `ReportView` (Task 2), the endpoint from Task 5
- Produces: `HoldingPage({ token, initialStatus })`

- [ ] **Step 1: Write the failing test**

Create `web/tests/holding-page.test.tsx`:

```tsx
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { HoldingPage } from "@/app/informe/[token]/HoldingPage";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function mockFetch(...responses: unknown[]) {
  const fn = vi.fn();
  for (const r of responses) {
    fn.mockResolvedValueOnce({ ok: true, json: async () => r } as never);
  }
  fn.mockResolvedValue({ ok: true, json: async () => responses.at(-1) } as never);
  vi.stubGlobal("fetch", fn);
  return fn;
}

const section = (i: number, title: string) => ({ index: i, title, body: "Cuerpo de prueba." });

describe("HoldingPage", () => {
  it("shows sections as they land instead of a bare spinner", async () => {
    mockFetch({
      status: "generating", done: false, firstName: null,
      sections: [section(0, "Tu retrato esencial")],
    });
    render(<HoldingPage token="t" initialStatus="generating" />);
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Tu retrato esencial" })).toBeDefined());
  });

  it("stops polling once the report is ready", async () => {
    const fn = mockFetch({
      status: "ready", done: true, firstName: null,
      sections: [section(0, "Tu retrato esencial")],
    });
    render(<HoldingPage token="t" initialStatus="generating" />);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Tu retrato esencial" })).toBeDefined());
    const calls = fn.mock.calls.length;
    await new Promise((r) => setTimeout(r, 60));
    expect(fn.mock.calls.length).toBe(calls);
  });

  // "failed" must say so. A spinner forever is the dishonest option, and this
  // buyer has paid.
  it("shows an honest message when generation failed", async () => {
    mockFetch({ status: "failed", done: true, firstName: null, sections: [] });
    render(<HoldingPage token="t" initialStatus="generating" />);
    await waitFor(() => expect(screen.getByText(/no hemos podido/i)).toBeDefined());
    expect(screen.queryByText(/preparando/i)).toBeNull();
  });

  it("shows progress out of eight while generating", async () => {
    mockFetch({
      status: "generating", done: false, firstName: null,
      sections: [section(0, "Tu retrato esencial"), section(1, "El corazón de tu identidad")],
    });
    render(<HoldingPage token="t" initialStatus="generating" />);
    await waitFor(() => expect(screen.getByText(/2 de 8/)).toBeDefined());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run web/tests/holding-page.test.tsx`
Expected: FAIL — `Cannot find module '@/app/informe/[token]/HoldingPage'`

- [ ] **Step 3: Write the component**

Create `web/src/app/informe/[token]/HoldingPage.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { ReportView, type ReportSection } from "@/components/ReportView";
import { ReportIndex } from "@/components/ReportIndex";

const POLL_MS = 2000;   // spec: poll every 2s while paid | generating
const TOTAL_SECTIONS = 8;

interface Payload {
  status: string;
  done: boolean;
  firstName: string | null;
  sections: Array<{ index: number; title: string; body: string }>;
}

/**
 * Per-section generation lands sections one at a time, so the buyer reads
 * section one while the rest is still being written. That is what makes the
 * ~30 s wait feel like the free reading rather than like a queue — and why the
 * email became a safety net rather than the delivery (spec, Addendum 11).
 */
export function HoldingPage({
  token, initialStatus,
}: { token: string; initialStatus: string }) {
  const [data, setData] = useState<Payload>({
    status: initialStatus, done: false, firstName: null, sections: [],
  });

  useEffect(() => {
    let live = true;
    let timer: ReturnType<typeof setTimeout>;

    async function tick() {
      try {
        const res = await fetch(`/api/informe/${token}`);
        if (res.ok && live) {
          const next = (await res.json()) as Payload;
          setData(next);
          if (next.done) return;          // terminal: stop polling
        }
      } catch { /* transient: the next tick retries */ }
      if (live) timer = setTimeout(tick, POLL_MS);
    }

    tick();
    return () => { live = false; clearTimeout(timer); };
  }, [token]);

  const sections: ReportSection[] = data.sections
    .sort((a, b) => a.index - b.index)
    .map(({ title, body }) => ({ title, body }));

  if (data.status === "failed") {
    return (
      <main className="shell">
        <p className="error">
          No hemos podido terminar tu informe. Ya lo sabemos y vamos a resolverlo:
          escríbenos y te devolvemos el dinero o lo repetimos.
        </p>
      </main>
    );
  }

  return (
    <main className="shell">
      {!data.done && (
        <p className="report__meta working">
          Preparando tu informe · {sections.length} de {TOTAL_SECTIONS} secciones
        </p>
      )}
      {data.done && sections.length > 0 && <ReportIndex sections={sections} />}
      <ReportView sections={sections} firstName={data.firstName ?? undefined} />
    </main>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run web/tests/holding-page.test.tsx && npm test`
Expected: PASS (4 more tests)

- [ ] **Step 5: Commit**

```bash
git add web/src/app/informe/[token]/HoldingPage.tsx web/tests/holding-page.test.tsx web/src/app/globals.css
git commit -m "feat: holding page with progressive section rendering"
```

---

### Task 7: Wire the buy CTA

**Prerequisite: plan 2.** `BirthForm.tsx:287` currently says "Disponible muy pronto" with nothing behind it.

**Files:**
- Modify: `web/src/components/BirthForm.tsx` (the `.next-step` block)
- Test: `web/tests/buy-cta.test.tsx`

**Interfaces:**
- Consumes: `POST /api/checkout` (plan 2 Task 6)
- Produces: the CTA calling checkout and redirecting to Stripe

- [ ] **Step 1: Write the failing test**

Create `web/tests/buy-cta.test.tsx`:

```tsx
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BuyButton } from "@/components/BuyButton";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const birth = { date: "1992-04-15", time: "10:30", latitude: 40.4, longitude: -3.7 };

describe("BuyButton", () => {
  it("posts the birth data to checkout and follows the Stripe URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ url: "https://checkout.stripe.com/x" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const go = vi.fn();

    render(<BuyButton birth={birth} navigate={go} />);
    await userEvent.click(screen.getByRole("button", { name: /informe completo/i }));

    await waitFor(() => expect(go).toHaveBeenCalledWith("https://checkout.stripe.com/x"));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).date).toBe("1992-04-15");
  });

  it("shows an error instead of navigating when checkout fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false, json: async () => ({ error: "No se pudo iniciar el pago." }),
    }));
    const go = vi.fn();

    render(<BuyButton birth={birth} navigate={go} />);
    await userEvent.click(screen.getByRole("button", { name: /informe completo/i }));

    await waitFor(() => expect(screen.getByText(/no se pudo iniciar el pago/i)).toBeDefined());
    expect(go).not.toHaveBeenCalled();
  });

  it("cannot be double-submitted into two orders", async () => {
    const fetchMock = vi.fn(() => new Promise(() => {}));   // never resolves
    vi.stubGlobal("fetch", fetchMock);

    render(<BuyButton birth={birth} navigate={vi.fn()} />);
    const button = screen.getByRole("button", { name: /informe completo/i });
    await userEvent.click(button);
    await userEvent.click(button);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run web/tests/buy-cta.test.tsx`
Expected: FAIL — `Cannot find module '@/components/BuyButton'`

- [ ] **Step 3: Write the component**

```bash
cd web && npm i -D @testing-library/user-event && cd ..
```

Create `web/src/components/BuyButton.tsx`:

```tsx
"use client";

import { useState } from "react";

interface Birth {
  date: string; time: string; latitude: number; longitude: number;
  firstName?: string; focus?: string;
}

/**
 * `navigate` is injected so the redirect is testable — jsdom has no real
 * navigation, and asserting on window.location.href assignment is brittle.
 */
export function BuyButton({
  birth, navigate = (url: string) => { window.location.href = url; },
}: { birth: Birth; navigate?: (url: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buy() {
    // Guard against a double click creating two pending orders and two Stripe
    // sessions for one buyer.
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(birth),
      });
      const json = await res.json();
      if (!res.ok || !json.url) {
        setError(json.error ?? "No se pudo iniciar el pago.");
        setBusy(false);
        return;
      }
      navigate(json.url);
    } catch {
      setError("No se pudo iniciar el pago.");
      setBusy(false);
    }
  }

  return (
    <>
      <button className="submit" onClick={buy} disabled={busy}>
        {busy ? "Abriendo el pago…" : "Quiero mi informe completo — 9,90 €"}
      </button>
      {error && <p className="error">{error}</p>}
    </>
  );
}
```

- [ ] **Step 4: Replace the placeholder copy**

In `web/src/components/BirthForm.tsx`, inside the `.next-step` block, replace:

```tsx
<p className="soon">Disponible muy pronto</p>
```

with:

```tsx
<BuyButton birth={{ date, time, latitude: place.lat, longitude: place.lon, firstName: name }} />
```

using whatever the local state variables are actually named at that point in the file — read the surrounding code rather than assuming these names. Import `BuyButton` at the top.

- [ ] **Step 5: Run the suite**

Run: `npm test && cd web && npx tsc --noEmit && cd ..`
Expected: PASS (3 more tests)

- [ ] **Step 6: Verify the whole funnel by hand**

With plans 2 and 3 running plus `stripe listen`: fill the birth form, take the free reading, click the CTA, pay with `4242 4242 4242 4242`, and confirm you land on `/informe/<token>`, watch sections appear one at a time, and end with a full report and a shareable card.

- [ ] **Step 7: Commit**

```bash
git add web/src/components/BuyButton.tsx web/src/components/BirthForm.tsx \
        web/tests/buy-cta.test.tsx web/package.json web/package-lock.json
git commit -m "feat: wire the buy CTA to checkout"
```

---

## Done when

**Phase A:** the three battery reports render at `/preview/informe/<chart>` with a section index and an exportable 9:16 card, and HANDOVER records a decision on the ~3,000-word question.

**Phase B:** a test-mode payment ends with a rendered report and a shareable card, from a browser, without touching the terminal.

---

## Self-Review

**Spec coverage.** The roadmap's six plan-4 tasks all map: `/informe/<token>` → Task 4; holding-page states → Tasks 4 and 6 (unknown token 404s without leaking existence, `failed` gets an honest message); progressive rendering → Task 6; report component → Task 2; 9:16 share card → Task 3; buy CTA → Task 7. The design-language requirement (Addendum 5) is honoured by reusing the existing custom properties rather than new colours, and the U+FE0E requirement is asserted by a test.

**Deliberate deviation.** The roadmap orders plan 4 strictly after plan 3. This plan splits it: Tasks 1-3 need no vendors and are executable immediately, because the report component and share card depend on data, not infrastructure, and three real reports already exist on disk. The reasoning is in "Why this plan is reordered", and Phase B carries explicit prerequisite markers so nobody starts it early.

**Placeholder scan.** No TBDs. One step (Task 7 Step 4) deliberately says to read the surrounding code for the state variable names instead of inventing them, because `BirthForm.tsx` is 298 lines and guessing its locals would produce code that does not compile — that is an instruction to look, not a placeholder.

**Type consistency.** `ReportSection { title, body }` is defined in Task 2 and consumed under that name in Tasks 2, 3 and 6. `ReportView({ sections, firstName? })` and `ReportIndex({ sections })` keep the same props everywhere. The API payload in Task 5 (`status`, `sections`, `firstName`, `done`) is exactly what Task 6 consumes, and its `sections` carry `index` — which Task 6 sorts on and strips before passing to `ReportView`, matching `ReportSection`. `slugify` produces the ids `ReportIndex` links to in both directions.

**Test count arithmetic.** Phase A: +12 (T1) +9 (T2) +6 (T3) = **27 tests, no vendors**. Phase B: +3 (T4) +4 (T5) +4 (T6) +3 (T7) = 14 more. Trust `npm test` over these figures.
