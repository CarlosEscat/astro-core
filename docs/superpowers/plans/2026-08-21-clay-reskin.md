# Clay Reskin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the app's dark "precision as mysticism" visual layer
(ink, brass, Fraunces, Plex) with the Clay system — warm paper, coloured
objects, Bricolage Grotesque and Karla — across every surface, changing
nothing about what the app says or does.

**Architecture:** The whole visual layer is one 721-line stylesheet plus
three colour-carrying components. The token block at the top of
`globals.css` is rewritten first, every class below it is migrated
surface by surface, then the three components that hardcode colour
outside CSS are brought over, and finally the embedded PNG-export font
subset is regenerated for the new faces.

**Tech Stack:** Next.js 16 in `web/`, plain CSS (no Tailwind classes are
used in the app's own markup), `next/font/google`, vitest.

Design source of truth: the **Sistema Clay** artboard and the surface
artboards on the design canvas, plus the token values copied verbatim
into Task 1 below.

## Global Constraints

- **This is a reskin. It changes appearance only.** No copy string, no
  block order, no paywall boundary, no prompt, no model call, no API
  shape, no computed value changes in any task. If a task seems to
  require one, stop and ask — it belongs to the card spec amendment,
  not here.
- **Specifically NOT in scope**, even though the design canvas shows
  them: percentiles replacing `Agua 10 / 20,5`, the permanent realce,
  the three aspect cubes, removing the `Bloqueado:` rows, the
  fold/share-render split. Those are content decisions parked for the
  spec amendment.
- **The zodiac arc and the sign glyphs stay.** Restyle them; do not
  delete them. Removing them would be a content change.
- **`npm test` must stay green. Baseline at plan start: 338 tests.**
  Be aware they prove very little here — **no test in `tests/` or
  `web/tests/` asserts a class, colour, or font.** A reskin cannot turn
  them red, and their staying green is not evidence the reskin works.
  Visual verification in the browser is the real gate for every task.
- `npx tsc --noEmit`, `npm run build` (in `web/`) and `npm run example`
  must all be green before any task is committed.
- **Hit targets never below 44px** in anything tappable.
- **No emoji as an icon.** This retires `.cc__lock::before { content: "🔒 " }`.
- `OPENROUTER_API_KEY` is not needed by any task here. No task in this
  plan requires the network except Task 7 (Google Fonts) — none calls a
  model, and none costs money.
- Work on branch `feat/clay-reskin`.

---

## Scope boundary

This plan restyles what exists **today**, including surfaces the design
canvas draws differently. Where the canvas and the current app disagree
about *content*, the current app wins and the canvas is used only for
colour, type, spacing and shape.

---

## The Clay tokens

Copied verbatim from the Sistema Clay artboard. Every later task refers
back to these names.

| Token | Value | Replaces |
|---|---|---|
| `--papel` | `#faf7f2` | `--ink` `#10131c` |
| `--papel-alto` | `#ffffff` | `--ink-raised` `#171b27` |
| `--pista` | `#f0ece4` | `--ink-line` `#262c3c` |
| `--tinta` | `#14120e` | `--bone` `#ece6da` (inverted role) |
| `--tinta-media` | `#4a4438` | — |
| `--tinta-suave` | `#9a9284` | `--bone-dim` `#a9a496` |
| `--agua` | `#0e6b85` | — |
| `--fuego` | `#e2571e` | — |
| `--aire` | `#c9a227` | `--brass` `#c9a227` (same value, new name) |
| `--tierra` | `#8a6240` | `--copper` `#b4653a` (near) |
| `--favor-bg` / `--favor-tinta` | `#d6ef8f` / `#23300a` | — |
| `--contra-bg` / `--contra-tinta` | `#ffb59e` / `#4a1707` | — |
| `--paquete-bg` / `--paquete-tinta` | `#e6e0d4` / `#3c362b` | — |
| `--radio-objeto` | `28px` | `border-radius: 3px` |
| `--radio-campo` | `16px` | — |
| `--radio-pildora` | `999px` | — |

`--slate` `#6e7689` has no Clay equivalent; every use becomes
`--tinta-suave`.

---

### Task 1: The token layer and the two typefaces

Everything else depends on this. After this task the app will look
*wrong but Clay-coloured* — light background, dark text, new faces, and
many classes still shaped for a dark theme. That is the expected
intermediate state; do not fix downstream classes here.

**Files:**
- Modify: `web/src/app/globals.css:9-24` (the `:root` block) and
  `:26-49` (`html`, `body`, `::selection`, `:focus-visible`)
- Modify: `web/src/app/layout.tsx:2-23,35`

**Interfaces:**
- Produces: the CSS custom properties named in "The Clay tokens" above,
  and the font variables `--font-bricolage` and `--font-karla`. Every
  later task consumes these names.

- [ ] **Step 1: Replace the `:root` token block**

In `web/src/app/globals.css`, replace the comment and `:root` block
(lines 3–24) with:

```css
/*
  Destiny Reports — Clay.
  Coloured objects on warm paper. No borders, no shadows: weight and
  colour carry the hierarchy. Element colour is the only colour with a
  fixed meaning.
*/
:root {
  --papel: #faf7f2;
  --papel-alto: #ffffff;
  --pista: #f0ece4;
  --tinta: #14120e;
  --tinta-media: #4a4438;
  --tinta-suave: #9a9284;

  --agua: #0e6b85;
  --fuego: #e2571e;
  --aire: #c9a227;
  --tierra: #8a6240;

  --favor-bg: #d6ef8f;
  --favor-tinta: #23300a;
  --contra-bg: #ffb59e;
  --contra-tinta: #4a1707;
  --paquete-bg: #e6e0d4;
  --paquete-tinta: #3c362b;

  --radio-objeto: 28px;
  --radio-campo: 16px;
  --radio-pildora: 999px;

  --font-display: var(--font-bricolage), "Helvetica Neue", sans-serif;
  --font-body: var(--font-karla), "Helvetica Neue", system-ui, sans-serif;

  --measure: 34rem;
}
```

Note there is deliberately **no `--font-mono`**. Clay has two families,
not three. `globals.css` currently has **23** `var(--font-mono)` uses
spread across Tasks 3–6; each task retires its own, and Task 8's orphan
grep is what proves none survived. Until a given rule is migrated it
falls back to the browser default, which is expected and temporary — it
will look wrong in the intervening commits, and that is fine.

- [ ] **Step 2: Repoint the page frame**

Replace the `html`, `body`, `::selection` and `:focus-visible` rules
(lines ~26–49) with:

```css
* { box-sizing: border-box; }

html {
  background: var(--papel);
  -webkit-text-size-adjust: 100%;
}

body {
  margin: 0;
  background: var(--papel);
  color: var(--tinta);
  font-family: var(--font-body);
  font-size: 1.0625rem;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

::selection { background: var(--aire); color: var(--tinta); }

:focus-visible {
  outline: 2px solid var(--agua);
  outline-offset: 3px;
  border-radius: 4px;
}
```

- [ ] **Step 3: Swap the typefaces**

In `web/src/app/layout.tsx`, replace the import and the three font
constants (lines 2–23) with:

```tsx
import { Bricolage_Grotesque, Karla } from "next/font/google";

// Bricolage Grotesque titles and carries the numbers; Karla is
// everything that gets read. Weight does the work the serif used to.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["600", "800"],
});

const karla = Karla({
  variable: "--font-karla",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});
```

and the `className` on `<html>` (line ~35) with:

```tsx
      className={`${bricolage.variable} ${karla.variable}`}
```

Leave `metadata` untouched — those strings are copy.

- [ ] **Step 4: Verify it compiles and renders**

```bash
cd web && npx tsc --noEmit
```

Expected: clean. Then start the preview (`preview_start` with the `web`
config from `.claude/launch.json`) and load `http://localhost:3000`.

Expected: warm off-white page, dark text, new sans faces, no console
errors. The form and cards will look broken — dark-theme classes on a
light ground. That is correct at this stage.

- [ ] **Step 5: Commit**

```bash
git add web/src/app/globals.css web/src/app/layout.tsx
git commit -m "feat(clay): replace ink/brass tokens and typefaces with Clay"
```

---

### Task 2: Delete the dead free-reading CSS

Do this before restyling anything else, so no effort is spent migrating
rules nothing renders. `Readout`, `Elements` and `Signature` were
absorbed by the character card (HANDOVER, character card phase 1) but
their styles were left behind.

**Files:**
- Modify: `web/src/app/globals.css` — the `── Reading ──` section's
  `.readout*` rules (~lines 249–301)

- [ ] **Step 1: Confirm the classes are genuinely unreferenced**

```bash
cd web/src && grep -rn "readout" components app || echo "NO REFERENCES"
```

Expected: `NO REFERENCES`. **If anything is found, stop** — the class is
live and this task is wrong.

- [ ] **Step 2: Delete the `.readout` rules**

Remove every rule whose selector starts `.readout` (`.readout`,
`.readout > div`, `.readout > div:last-child`, `.readout .rt`,
`.readout .role`, `.readout .sym`, `.readout .sign`, `.readout .deg`,
`.readout .gloss`). Keep the `── Reading ──` section header comment and
the `.reading` rule — `.reading` is live.

- [ ] **Step 3: Verify nothing changed visually**

```bash
cd web && npx tsc --noEmit && npm run build
```

Expected: both clean. Reload the preview; the page must look exactly as
it did at the end of Task 1.

- [ ] **Step 4: Commit**

```bash
git add web/src/app/globals.css
git commit -m "refactor(clay): drop dead .readout styles absorbed by the card"
```

---

### Task 3: Page frame, hero and the birth form

The entry surface, and the one with the most interactive states. Design
reference: the **Landing + formulario** artboard.

**Files:**
- Modify: `web/src/app/globals.css` — `── Page frame ──` (`.shell`,
  `.wordmark`, `.hero h1`, `.hero h1 em`, `.hero p`) and `── Form ──`
  (`.panel`, `.panel__legend`, `.field`, `.field label`, `.hint`,
  `.hint--row`, `.field input`, `.row`, `.combo`, `.options`,
  `.options li`, `.options .place`, `.options .where`, `.submit`,
  `.error`)

**Interfaces:**
- Consumes: every token from Task 1.

- [ ] **Step 1: Restyle the frame and hero**

```css
.shell {
  max-width: var(--measure);
  margin: 0 auto;
  padding: 0 1.25rem 5rem;
}

.wordmark {
  font-family: var(--font-body);
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--tinta-suave);
  margin: 1.5rem 0 1.25rem;
  text-align: left;
}

/* The hero is the page's one bleed object. */
.hero {
  background: var(--agua);
  border-radius: var(--radio-objeto);
  padding: 1.75rem 1.4rem 1.6rem;
  margin-bottom: 0.875rem;
}

.hero h1 {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: clamp(2.1rem, 9vw, 2.75rem);
  line-height: 0.96;
  letter-spacing: -0.042em;
  color: var(--papel-alto);
  margin: 0 0 0.85rem;
  text-wrap: balance;
}

/* The brass italic is gone; emphasis is now weight, not another face. */
.hero h1 em { font-style: normal; color: var(--papel-alto); }

.hero p {
  color: rgba(255, 255, 255, 0.88);
  font-weight: 600;
  font-size: 0.9375rem;
  line-height: 1.45;
  margin: 0;
  text-wrap: pretty;
}
```

- [ ] **Step 2: Restyle the form panel and fields**

```css
.panel {
  background: var(--papel-alto);
  border: none;
  border-radius: var(--radio-objeto);
  padding: 1.4rem 1.25rem;
}

.panel__legend {
  font-family: var(--font-body);
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--tinta-suave);
  padding: 0;
  margin-bottom: 1rem;
}

.field { margin-bottom: 1rem; position: relative; }
.field:last-of-type { margin-bottom: 0; }

.field label {
  display: block;
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--tinta);
  margin-bottom: 0.45rem;
}

.hint {
  display: block;
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1.4;
  color: var(--tinta-suave);
  margin-top: 0.4rem;
  text-wrap: pretty;
}

.hint--row { margin: -0.5rem 0 1rem; }

.field input {
  width: 100%;
  background: var(--pista);
  border: none;
  border-radius: var(--radio-campo);
  padding: 0.85rem 1rem;
  min-height: 48px;
  font-family: var(--font-body);
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--tinta);
}

.field input[type="date"],
.field input[type="time"] { font-family: var(--font-body); }

.field input::placeholder { color: var(--tinta-suave); }
.field input:hover { background: #e9e4da; }

.row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
```

- [ ] **Step 3: Restyle the autocomplete and the submit**

```css
.combo { position: relative; }

.options {
  list-style: none;
  margin: 0.35rem 0 0;
  padding: 0.375rem;
  background: var(--papel-alto);
  border: none;
  border-radius: 18px;
  box-shadow: 0 6px 22px rgba(70, 58, 40, 0.13);
  position: absolute;
  z-index: 10;
  width: 100%;
  max-height: 15rem;
  overflow-y: auto;
}

.options li {
  padding: 0.7rem 0.8rem;
  border-radius: 13px;
  min-height: 44px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  justify-content: center;
}

.options li[aria-selected="true"] { background: var(--pista); }
.options .place { font-size: 0.9375rem; font-weight: 700; color: var(--tinta); }

.options .where {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--tinta-suave);
}

.submit {
  width: 100%;
  margin-top: 1.1rem;
  background: var(--agua);
  color: var(--papel-alto);
  border: none;
  border-radius: var(--radio-pildora);
  padding: 1rem 1.5rem;
  min-height: 52px;
  font-family: var(--font-body);
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: none;
  cursor: pointer;
}

.submit:hover:not(:disabled) { background: #0b5568; }
.submit:disabled { opacity: 0.5; cursor: progress; }

/* Validation lives with the field it belongs to, not as a banner. */
.error {
  margin-top: 0.75rem;
  padding: 0;
  border: none;
  background: none;
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1.4;
  color: var(--contra-tinta);
  text-wrap: pretty;
}
```

- [ ] **Step 4: Verify in the browser at phone width**

```bash
cd web && npx tsc --noEmit
```

Then in the preview, `resize_window` to the `mobile` preset and reload
`http://localhost:3000`.

Check, and fix anything that fails:
- Hero is a solid `--agua` block with white text, corners at 28px.
- All four inputs are filled `--pista` blocks, ≥48px tall.
- Submit is a full-width `--agua` pill, ≥52px.
- Type "Bil" into *Lugar de nacimiento*; the dropdown is a white rounded
  panel with rows ≥44px.
- `read_console_messages` reports no errors.

- [ ] **Step 5: Commit**

```bash
git add web/src/app/globals.css
git commit -m "feat(clay): restyle page frame, hero and birth form"
```

---

### Task 4: The free reading modules

Design reference: the **Lectura gratuita** artboard. Content and order
stay exactly as they are.

**Files:**
- Modify: `web/src/app/globals.css` — `.reading`, `── Modules ──`
  (`.module`, `.module__title`, `.prose p`, `.prose p + p`, `.writing`,
  `.writing span`), `── Love hook ──` (`.hook`, `.hook p`, `.hook .mark`),
  `── Matches ──` (`.fit`, `.fit__head`, `.fit__rank`, `.fit__sym`,
  `.fit__name`, `.fit__say`, `.fit__why`, `.friction`, `.friction .label`),
  `── Element balance ──` (`.bars`, `.bar`, `.bar__name`, `.bar__track`,
  `.bar__fill`, `.bar__fill.low`, `.bar__val`, `.verdict`), `.card`,
  `── Signature card ──` (`.sig*`), `.next-step`, `.soon`,
  `── Loading ──` (`.working`, `.working span`, `@keyframes pulse`),
  `.foot`

- [ ] **Step 1: Restyle modules, prose and the loading pulse**

```css
.reading { margin-top: 1.75rem; }

.module {
  margin-top: 0.875rem;
  background: var(--papel-alto);
  border-radius: var(--radio-objeto);
  padding: 1.25rem 1.375rem;
}

.module__title {
  font-family: var(--font-body);
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--tinta-suave);
  margin: 0 0 0.85rem;
}

.prose p {
  margin: 0;
  color: var(--tinta-media);
  font-size: 1rem;
  line-height: 1.6;
  text-wrap: pretty;
}

.prose p + p { margin-top: 0.85rem; }

/* The block breathes, not the letters — in Clay the object is what pulses. */
.writing {
  font-family: var(--font-body);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--tinta-suave);
  text-align: center;
}

.writing span { display: inline-block; animation: pulse 1.6s ease-in-out infinite; }

.working {
  margin-top: 1.75rem;
  text-align: center;
  font-family: var(--font-body);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--tinta-suave);
}

.working span { display: inline-block; animation: pulse 1.6s ease-in-out infinite; }

@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .writing span, .working span { animation: none; opacity: 0.75; }
}
```

- [ ] **Step 2: Restyle the love hook — the free tier's screenshot unit**

```css
.hook {
  margin-top: 0.875rem;
  background: #7c3aed;
  border: none;
  border-radius: var(--radio-objeto);
  padding: 1.5rem 1.375rem;
}

.hook p {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 1.4rem;
  line-height: 1.24;
  letter-spacing: -0.022em;
  color: var(--papel-alto);
  margin: 0;
  text-wrap: pretty;
}

.hook .mark {
  display: block;
  margin-top: 0.75rem;
  font-family: var(--font-body);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: rgba(255, 255, 255, 0.62);
}
```

- [ ] **Step 3: Restyle matches, bars and the upsell**

```css
.fit { padding: 0.85rem 0; border-bottom: 1px solid var(--pista); }
.fit:last-child { border-bottom: none; }

.fit__head { display: flex; align-items: center; gap: 0.6rem; }

.fit__rank {
  font-family: var(--font-display);
  font-size: 0.8125rem;
  font-weight: 800;
  color: var(--tinta-suave);
  min-width: 1.5rem;
}

.fit__sym { font-size: 1.125rem; color: var(--agua); line-height: 1; }

.fit__name {
  font-family: var(--font-display);
  font-size: 1.125rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--tinta);
}

.fit__say {
  margin: 0.4rem 0 0 2.1rem;
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.4;
  color: var(--tinta-media);
  text-wrap: pretty;
}

.fit__why {
  margin: 0.3rem 0 0 2.1rem;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.4;
  color: var(--tinta-suave);
  text-wrap: pretty;
}

.friction {
  margin-top: 1rem;
  background: var(--pista);
  border-radius: 18px;
  padding: 0.85rem 1rem;
}

.friction .label {
  display: block;
  font-family: var(--font-body);
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--tinta-media);
  margin-bottom: 0.4rem;
}

.friction .fit { border-bottom: none; padding-bottom: 0; }

.bars { display: grid; gap: 0.6rem; }

.bar {
  display: grid;
  grid-template-columns: 3.5rem 1fr 3.25rem;
  align-items: center;
  gap: 0.625rem;
}

.bar__name {
  font-family: var(--font-body);
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--tinta);
}

.bar__track {
  height: 6px;
  background: var(--pista);
  border-radius: var(--radio-pildora);
  overflow: hidden;
}

.bar__fill { display: block; height: 100%; background: var(--agua); }
.bar__fill.low { background: var(--tierra); }

.bar__val {
  font-family: var(--font-body);
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--tinta-suave);
  text-align: right;
}

.verdict {
  margin-top: 0.85rem;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--tinta-media);
  text-wrap: pretty;
}

.verdict.punch { color: var(--tinta); }
.verdict.punch strong { color: var(--agua); font-weight: 700; }

.card {
  background: var(--papel-alto);
  border: none;
  border-radius: var(--radio-objeto);
  padding: 1.25rem 1.375rem;
}

.sig { text-align: center; }

.sig__label {
  font-family: var(--font-body);
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--tinta-suave);
}

.sig__combo {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--tinta);
}

.sig__stat {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 800;
  color: var(--agua);
}

/* The upsell is the page's ink object. */
.next-step {
  margin-top: 0.875rem;
  background: var(--tinta);
  border: none;
  border-radius: var(--radio-objeto);
  padding: 1.5rem 1.375rem;
}

.next-step h2 {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 1.5rem;
  line-height: 1.18;
  letter-spacing: -0.025em;
  color: var(--papel-alto);
  margin: 0 0 0.6rem;
}

.next-step p {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.45;
  color: #cfc8bb;
  text-wrap: pretty;
}

.next-step .price {
  font-family: var(--font-display);
  font-weight: 800;
  color: var(--aire);
}

.soon {
  margin-top: 0.9rem;
  font-family: var(--font-body);
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #6d675c;
}

.foot {
  margin-top: 2.5rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--pista);
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.45;
  color: var(--tinta-suave);
  text-align: left;
  text-wrap: pretty;
}
```

- [ ] **Step 4: Verify against a real reading**

```bash
cd web && npx tsc --noEmit
```

This surface only renders after a submit, which costs one DeepSeek Flash
call (~$0.0011) and takes up to a minute. Run it once:

In the preview at mobile width, fill the form with the canary chart —
name `Carlos`, date `2000-07-28`, time `22:45`, place `Bilbao` (choose
*Bilbao, País Vasco* from the list) — and submit.

Check:
- `.hook` is a violet bleed block with white display type.
- `.module` blocks are white objects on warm paper.
- Element bars are 6px `--pista` tracks with `--agua` fill.
- `.next-step` is the ink block; the price is `--aire`.
- Nothing still renders on a dark background.

- [ ] **Step 5: Commit**

```bash
git add web/src/app/globals.css
git commit -m "feat(clay): restyle free reading modules, hook, matches and upsell"
```

---

### Task 5: The character card block

The `.cc*` rules hardcode hex values instead of using tokens — fix that
while restyling, so the block can never drift from the system again.

**Files:**
- Modify: `web/src/app/globals.css` — `── Character card ──`
  (`.cc-display`, `.cc-mono`, `.cc-glyph`, `.cc`, `.cc__label`,
  `.cc__class`, `.cc__name`, `.cc__head`, `.cc__rows`, `.cc__row`,
  `.cc__row dt`, `.cc__row dd`, `.cc__placement`, `.cc__deg`,
  `.cc__gloss`, `.cc__block`, `.cc__bars`, `.cc__bar`, `.cc__bar-name`,
  `.cc__bar-track`, `.cc__bar-fill`, `.cc__bar-val`, `.cc__locked`,
  `.cc__lock`, `.cc__lock::before`, `.cc__combo`, `.cc__rarity`,
  `.cc__sr`)

- [ ] **Step 1: Restyle the card, tokens only — no literal hex**

Replace every `#262c3c` with `var(--pista)`, `#c9a227` with
`var(--aire)`, `#ece6da` with `var(--tinta)`, `#6e7689` and `#a9a496`
with `var(--tinta-suave)`, `#b4653a` with `var(--tierra)`. Then apply
the Clay shape:

```css
.cc-display { font-family: var(--font-display); }
.cc-mono { font-family: var(--font-body); }
.cc-glyph { font-family: var(--font-body); }

.cc {
  background: var(--papel-alto);
  border: none;
  border-radius: var(--radio-objeto);
  padding: 1.375rem;
  margin: 0.875rem 0;
}

.cc__label {
  color: var(--tinta-suave);
  font-size: .625rem;
  font-weight: 700;
  letter-spacing: .2em;
  text-transform: uppercase;
}

.cc__class {
  font-family: var(--font-display);
  color: var(--tinta);
  font-size: 2.5rem;
  font-weight: 800;
  line-height: 0.94;
  letter-spacing: -.04em;
  margin: .25rem 0 0;
}

.cc__name { color: var(--tinta-suave); font-size: .8125rem; font-weight: 600; margin: .35rem 0 0; }
.cc__head { border-bottom: 1px solid var(--pista); padding-bottom: 1rem; }
.cc__rows { margin: 1rem 0; }
.cc__row { padding: .6rem 0; border-bottom: 1px solid var(--pista); }
.cc__row:last-child { border-bottom: 0; }

.cc__row dt {
  color: var(--tinta-suave);
  font-size: .625rem;
  font-weight: 700;
  letter-spacing: .16em;
  text-transform: uppercase;
}

.cc__row dd { color: var(--tinta); font-weight: 600; margin: .2rem 0 0; }
.cc__placement { display: block; }
.cc__deg { color: var(--tinta-suave); font-size: .85em; }
.cc__gloss { display: block; color: var(--tinta-media); font-size: .9rem; margin-top: .2rem; }
.cc__block { margin: 1.25rem 0 0; }
.cc__bars { display: grid; gap: .5rem; }

.cc__bar {
  display: grid;
  grid-template-columns: 4.5rem 1fr 2.5rem;
  align-items: center;
  gap: .5rem;
}

.cc__bar-name { color: var(--tinta); font-size: .6875rem; font-weight: 700; letter-spacing: .1em; }
.cc__bar-track { background: var(--pista); height: 6px; border-radius: var(--radio-pildora); overflow: hidden; }
.cc__bar-fill { display: block; background: var(--agua); height: 100%; }
.cc__bar-val { color: var(--tinta-suave); font-size: .6875rem; font-weight: 700; text-align: right; }
.cc__locked { display: flex; flex-wrap: wrap; gap: .5rem; margin: 1.25rem 0 0; }

/* The lock was a 🔒 emoji. Clay draws icons, and the system bans emoji
   as iconography — a tinted chip carries the same meaning. */
.cc__lock {
  background: var(--pista);
  border-radius: var(--radio-pildora);
  padding: .4rem .75rem;
  color: var(--tinta-suave);
  font-size: .75rem;
  font-weight: 700;
  margin: 0;
}

.cc__combo { color: var(--tinta); font-size: .9375rem; font-weight: 600; margin: 1rem 0 0; }
.cc__rarity { color: var(--tierra); font-size: .8125rem; font-weight: 700; margin: .25rem 0 0; }
```

Delete the `.cc__lock::before { content: "🔒 "; }` rule entirely. Leave
`.cc__sr` (the screen-reader utility) exactly as it is.

- [ ] **Step 2: Confirm no literal hex survives in the card block**

```bash
cd web/src && sed -n '/── Character card ──/,$p' app/globals.css | grep -n '#[0-9a-fA-F]\{6\}' || echo "NO LITERAL HEX"
```

Expected: `NO LITERAL HEX`.

- [ ] **Step 3: Verify in the browser**

```bash
cd web && npx tsc --noEmit && npm run build
```

Reload the reading from Task 4 (the form retains its values on reload;
if not, resubmit). Check the card is a white object, `ARTISTA` is heavy
Bricolage in `--tinta`, bars are `--agua`, and the three `Bloqueado:`
rows render as `--pista` chips with **no lock emoji**. The rows
themselves must still be present — removing them is a content change.

- [ ] **Step 4: Commit**

```bash
git add web/src/app/globals.css
git commit -m "feat(clay): restyle character card and tokenise its literal hex"
```

---

### Task 6: The paid report and the zodiac arc

**Files:**
- Modify: `web/src/app/globals.css` — `── The paid report ──`
  (`.report`, `.report__greeting`, `.report__section`, `.report__title`,
  `.report__title::after`, `.report__p`, `.rindex` and its children)
- Modify: `web/src/components/ZodiacArc.tsx:47-58` (the `stroke` on the
  arc `<path>`), and `globals.css` `.instrument`, `.tick`,
  `.tick--sign`, `.glyph`

- [ ] **Step 1: Restyle the report**

```css
.report { max-width: var(--measure); margin: 0 auto; }

.report__greeting {
  font-family: var(--font-body);
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
  color: var(--tinta-suave);
  border-bottom: none;
  padding-bottom: 0;
  margin-bottom: 1.75rem;
  text-wrap: pretty;
}

.report__section { margin: 0 0 2.75rem; scroll-margin-top: 2rem; }

.report__title {
  font-family: var(--font-display);
  font-size: clamp(1.6rem, 1.2rem + 1.6vw, 2.1rem);
  font-weight: 800;
  line-height: 1.02;
  letter-spacing: -0.035em;
  color: var(--tinta);
  margin: 0 0 1.1rem;
  text-wrap: balance;
}

/* Was a brass hairline. A short colour bar is the Clay equivalent, and
   it is the only wayfinding in a fifteen-minute read. */
.report__title::after {
  content: "";
  display: block;
  width: 2.125rem;
  height: 5px;
  border-radius: var(--radio-pildora);
  margin-top: 0.75rem;
  background: var(--agua);
}

.report__p {
  margin: 0 0 1rem;
  color: #2f2b23;
  line-height: 1.62;
  text-wrap: pretty;
}

.report__p:last-child { margin-bottom: 0; }
```

- [ ] **Step 2: Restyle the index, meta line and share frame**

```css
.rindex {
  max-width: var(--measure);
  margin: 0 auto 2.5rem;
  border: none;
  border-radius: var(--radio-objeto);
  background: var(--papel-alto);
  padding: 1.25rem 1.375rem;
}

.rindex__list { list-style: none; margin: 0; padding: 0; }
.rindex__item + .rindex__item { border-top: 1px solid var(--pista); }

.rindex__link {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  padding: 0.6rem 0;
  min-height: 44px;
  color: var(--tinta);
  text-decoration: none;
}

.rindex__link:hover .rindex__name { color: var(--agua); }

.rindex__num {
  font-family: var(--font-display);
  font-size: 0.9375rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--agua);
  min-width: 1.25rem;
}

.rindex__name {
  font-family: var(--font-body);
  font-size: 0.9375rem;
  font-weight: 600;
  line-height: 1.3;
  text-wrap: pretty;
}

.report__meta {
  max-width: var(--measure);
  margin: 0 auto 1.25rem;
  font-family: var(--font-body);
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--tinta-suave);
}

.share { max-width: var(--measure); margin: 0 auto 2.5rem; text-align: center; }

.share__card {
  display: block;
  width: min(280px, 70vw);
  height: auto;
  margin: 0 auto 1rem;
  border: none;
  border-radius: 18px;
}
```

Leave the `@media (prefers-reduced-motion: reduce)` block that follows
`.share__card` exactly as it is.

- [ ] **Step 3: Restyle the instrument**

In `globals.css`:

```css
.instrument {
  display: block;
  width: 100%;
  height: auto;
  border-bottom: none;
}

@media (min-width: 48rem) {
  .instrument { height: 15rem; }
}

.tick { stroke: #ded7c9; stroke-width: 1; }
.tick--sign { stroke: var(--aire); stroke-width: 1.5; }

.glyph {
  fill: var(--aire);
  font-family: var(--font-body);
  font-size: 26px;
  text-anchor: middle;
  opacity: 0.9;
}
```

In `web/src/components/ZodiacArc.tsx`, the arc `<path>` has
`stroke="var(--ink-line)"`, a token that no longer exists. Change that
one attribute to:

```tsx
        stroke="#ded7c9"
```

Change nothing else in that file — the geometry, glyphs and the
`U+FE0E` comment all stay.

- [ ] **Step 4: Verify both surfaces**

```bash
cd web && npx tsc --noEmit && npm run build
```

Check the arc renders as warm ticks on paper at `http://localhost:3000`
(not invisible — a missing token would make it transparent), then load
the report preview route:

```
http://localhost:3000/preview/informe/bilbao-2000
```

Check section titles are heavy Bricolage with an `--agua` bar beneath,
body copy is readable at 1.62 line-height, and the index is a white
object.

- [ ] **Step 5: Commit**

```bash
git add web/src/app/globals.css web/src/components/ZodiacArc.tsx
git commit -m "feat(clay): restyle paid report, index and zodiac arc"
```

---

### Task 7: The two share-card SVGs and the embedded font subset

The share cards are **not reachable from CSS** — they hardcode hex in
SVG attributes and get their fonts from an embedded base64 subset. This
task is why the reskin is not a one-file change.

Design reference: the **Compartir 1080×1920** and **Firma del informe**
artboards. Content stays as it is; only colour and type change.

**Files:**
- Modify: `scripts/build-card-fonts.ts:40-43` (the `FACES` array)
- Regenerate: `web/src/lib/card-fonts.ts` (generated, committed)
- Modify: `web/src/components/CharacterCardShare.tsx:68-119`
- Modify: `web/src/components/ShareCard.tsx:17-21,88-124`

**Interfaces:**
- Produces: `CARD_FONT_CSS` exporting `@font-face` families
  **`CardDisplay`** (Bricolage Grotesque 800) and **`CardBody`** (Karla
  600), plus the class rules `.cc-display`, `.cc-mono` and `.cc-glyph`
  that map onto them. **The class names do not change** — `.cc-mono` is
  used 3× by `CharacterCard.tsx` and 7× by `CharacterCardShare.tsx`, and
  renaming it would churn four files to no benefit. Only the face behind
  it changes.

Read this first: `web/src/lib/card-fonts.ts` is **generated**, and it
carries the `.cc-*` class rules itself — they are appended by
`build-card-fonts.ts`, *not* read from `globals.css`. The `.cc-display`
etc. rules in `globals.css` style the on-screen card; the ones inside
`CARD_FONT_CSS` style the serialised SVG. Both exist, and both need to
agree.

- [ ] **Step 1: Point the font build at the Clay faces**

In `scripts/build-card-fonts.ts`, replace the `FACES` array:

```ts
const FACES = [
  { name: "CardDisplay", family: "Bricolage+Grotesque:opsz,wght@12..96,800", text: TEXT },
  { name: "CardBody", family: "Karla:wght@600", text: TEXT },
];
```

Then, in the `writeFile` call at the bottom of the same file, replace
the three appended class rules so they point at the new faces with Clay
fallbacks:

```ts
    rules.join("") +
    `.cc-display{font-family:"CardDisplay","Helvetica Neue",sans-serif;}` +
    `.cc-mono{font-family:"CardBody","Helvetica Neue",sans-serif;}` +
    `.cc-glyph{font-family:"CardDisplay",sans-serif;}`,
```

`.cc-mono` keeping its name while pointing at `CardBody` is deliberate —
see the Interfaces note above.

Leave `TEXT`, `LETTERS`, `SPANISH`, `REST`, the `UA` constant and every
guard in `face()` untouched — the `°` and `′` characters in `REST` are
still needed, and the woff2 magic-number check is what stops a Google
error page being embedded as a "font".

- [ ] **Step 2: Regenerate the subset**

```bash
npx tsx scripts/build-card-fonts.ts
```

Expected: two lines like `CardDisplay: NN.N KB` and `CardBody: NN.N KB`,
and a rewritten `web/src/lib/card-fonts.ts`. **If either face throws**,
stop and report — Google's `text=` endpoint returning HTTP 400 for a
family is a known failure mode documented in that script's header, and
the fix is not to retry blindly.

- [ ] **Step 3: Restyle `CharacterCardShare.tsx`**

Apply this colour mapping to every SVG attribute in lines 68–119:

| Old | New |
|---|---|
| `#10131c` (card ground) | `#faf7f2` |
| `#262c3c` (frame, bar track) | `#f0ece4` |
| `#c9a227` (class, glyphs, bar fill) | `#0e6b85` |
| `#ece6da` (sign names) | `#14120e` |
| `#a9a496`, `#6e7689` (labels) | `#9a9284` |
| `#b4653a` (rarity) | `#8a6240` |

Change **no class names** in this file — `.cc-display`, `.cc-mono` and
`.cc-glyph` keep working, now backed by the Clay faces from Step 1.
Colour attributes are the only edit.

- [ ] **Step 4: Give `ShareCard.tsx` the embedded faces**

`ShareCard` declares its own `CARD_CSS` using `var(--font-display, …)`.
**Those `var()`s cannot resolve inside a serialised standalone SVG**, so
its exported PNG has always fallen back to Georgia — unlike
`CharacterCardShare`, which embeds real bytes. Fix that here rather than
carrying the bug into Clay.

Delete the `CARD_CSS` constant (lines 17–21) and add the import beside
the existing ones at the top of the file:

```tsx
import { CARD_FONT_CSS } from "@/lib/card-fonts";
```

Change `<style>{CARD_CSS}</style>` (line ~87) to:

```tsx
        <style>{CARD_FONT_CSS}</style>
```

Then rename the class on every `<text>` element so it uses the embedded
rules instead of the now-deleted `sc-*` ones:

| Old | New |
|---|---|
| `className="sc-display"` | `className="cc-display"` |
| `className="sc-mono"` | `className="cc-mono"` |
| `className="sc-body"` | `className="cc-mono"` |

Apply the same colour mapping as Step 3. The `rows` array, the `share()`
function and `rasterise()` are untouched.

- [ ] **Step 5: Verify the exports actually rasterise**

```bash
cd web && npx tsc --noEmit && npm run build
```

Then produce a reading as in Task 4 and, in the preview, click
**Compartir o guardar** under each of the two cards. Confirm for both
that a PNG is produced and that its text renders in Bricolage/Karla, not
a serif fallback. A silent fallback here is the exact failure this
subset exists to prevent, so compare against the on-screen SVG — they
must match.

- [ ] **Step 6: Commit**

```bash
git add scripts/build-card-fonts.ts web/src/lib/card-fonts.ts \
        web/src/components/CharacterCardShare.tsx \
        web/src/components/ShareCard.tsx web/src/app/globals.css
git commit -m "feat(clay): restyle both share cards and embed the Clay faces"
```

---

### Task 8: Whole-app pass and merge

**Files:** none expected; this task is verification and whatever it
turns up.

- [ ] **Step 1: Run every gate**

```bash
npm test
npx tsc --noEmit
npm run example
cd web && npx tsc --noEmit && npm run build
```

Expected: 338 tests green, all clean. Remember these do not check
appearance.

- [ ] **Step 2: Sweep for orphaned tokens**

```bash
cd web/src && grep -rn -- "--ink\|--bone\|--brass\|--copper\|--slate\|--font-fraunces\|--font-plex\|--font-mono" app components || echo "NO ORPHANS"
```

Expected: `NO ORPHANS`. Any hit is a rule still pointing at a deleted
token, which renders as `transparent` or an inherited face rather than
erroring — this grep is the only thing that catches it.

- [ ] **Step 3: Walk every surface at phone width**

In the preview at the `mobile` preset, with `read_console_messages`
clean at each step: landing, form with the dropdown open, a validation
error (submit with a place typed but not chosen from the list), the
loading state, the full reading, both share cards, and
`/preview/informe/bilbao-2000`.

Confirm on each: no dark backgrounds, no Fraunces or Plex, tap targets
≥44px, and no horizontal scroll.

- [ ] **Step 4: Merge**

```bash
git checkout main && git merge --no-ff feat/clay-reskin
```

- [ ] **Step 5: Update the handover**

Add a dated entry to the "Estado actual" checklist in `HANDOVER.md`
recording that the Clay reskin is merged, that it changed appearance
only, and that the card-spec content changes shown on the design canvas
(percentiles, permanent realce, three cubes, the fold/share split)
remain unbuilt and still need the spec amendment.

```bash
git add HANDOVER.md
git commit -m "docs: record the Clay reskin in the handover"
```
