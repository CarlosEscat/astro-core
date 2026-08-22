# Flow Reskin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Shorten the onboarding flow from four questions over eight presses to
three questions over four presses, and move the landing + the three question
screens off the warm-paper Clay system onto the `docs/design/DESIGN.md` style
reference (white canvas, black type, 1px Sand borders, black pill CTA, violet
links only). No LLM call, no change to what the flow computes.

**Architecture:** Two of the four question components merge (`Dia` + `Hora` →
`Cuando`), one is renamed (`Lugar` → `Donde`), one loses its reaction
(`Nombre`). The dead copy they leave behind is deleted. The visual layer is
split into two tokens sets — the new DESIGN.md tokens for the flow, the legacy
warm-paper tokens kept alive for the not-yet-migrated components — so the app
changes systems at the `/crear/donde` → reveal seam exactly as the spec
accepts.

**Tech Stack:** TypeScript, vitest (node + jsdom via docblock), Next.js 16 App
Router, React 19, `next/font/local`.

Spec: `docs/superpowers/specs/2026-08-22-flow-reskin-design.md`

## Global Constraints

- **The timezone contract.** Untouched. `computeNatalChart` still takes a UTC
  instant; nothing in the flow converts birth times.
- **Nothing personal in a URL.** Step routes stay static paths; answers stay in
  `sessionStorage`.
- **Epicene Spanish.** The surviving copy is gated by `copyProblems()` at test
  time. Deleting lines is fine; adding a gendered line is not.
- **Zero LLM at render.** Nothing in the flow calls a model.
- **`npm test` must stay green.** Baseline is **406 tests** (not the 215 the
  spec quotes — that was the pre-onboarding-flow number). Also
  `npx tsc --noEmit` (root and `web`), `npm run example`, and the `web`
  typecheck.
- **No test in this repo asserts a class, colour or font.** A green suite is
  not evidence the reskin looks right. Task 6's browser pass is not optional.
- **The 4.5s reveal, the cusp guard, and the U+FE0E glyph guard are deliberate.**
  Do not "simplify" them.
- Next.js 16 is not the Next.js you know. Before touching `layout.tsx`
  (`next/font/local`) read `web/node_modules/next/dist/docs/01-app/01-getting-started/13-fonts.md`
  and `.../03-api-reference/02-components/font.md`.

---

## ⚠️ Decisions resolved while planning — read before executing

The spec is approved but leaves three things open. These are resolved here;
each is a deliberate deviation or clarification, not a relitigation.

**1. `:root` cannot be replaced wholesale — it must become dual-token.** The
spec's Styles section says "the `:root` block is replaced wholesale," but its
own "What this is not" says the card, reveal, reading, report and share render
"remain warm-paper." Those components reference `var(--papel)`, `var(--tinta)`,
`var(--agua)`, `var(--radio-objeto)`, `var(--font-display)` and friends. Deleting
those tokens wholesale would break every out-of-scope component. Resolution:
`:root` gains the DESIGN.md tokens **and** keeps the legacy warm-paper tokens in
a marked legacy block. The flow screens consume the new tokens; nothing else
changes until its own migration spec. This is the only way the "two design
systems in one app" seam the spec accepts can exist at all.

**2. The `cuando` skip pill writes storage immediately; the date commits on the
CTA.** The spec says the ghost pill "sets `time: 12:00` and `hourKnown: false`…
does not advance," and the Testing section requires "both ghost-pill skips
writing the right storage" (assertable without pressing the CTA). So the skip
pill writes `{ time: "12:00", hourKnown: false }` on click. The date, which has
no separate action of its own, is committed by the single CTA press together
with the hour when one was typed. This is the one place a value reaches storage
before the advance press, and it is required by the spec's own test list.

**3. Decision 6 (element colour remap) is a no-op here.** The deepened palette
(`#c2410c` / `#0667d9` / `#0a7d70` / `#02693e`) is consumed by the card and the
dial, both out of scope, and "no element colour appears on any of the three
question screens." The remap lands in follow-on work #1. This plan adds no
element tokens and changes no `--agua`/`--fuego`/`--aire`/`--tierra` value.
The values are recorded in the follow-on note at the bottom of this plan so
they are not lost.

**4. Font fallback.** If the Fontshare licence forbids self-hosting (Task 4
step 1), substitute Inter via `next/font/google` under the **same**
`--font-roobert` variable name, so no call site changes. Do not proceed to the
styles tasks with a half-wired font.

---

## File Structure

**Core (`src/`)**
- `src/copy/flow.es.ts` — modified. `NOMBRE_ES`, `HORA_ES`, `HourBucket`,
  `horaReaccion` deleted. `CLASE_REACCION_ES`, `CUSPIDE_ES`, `DIAL_ES`,
  `HORA_DESCONOCIDA_ES`, `ERRORES_ES` stay.

**Web (`web/src/`)**
- `components/questions/Cuando.tsx` — new. Merges `Dia` + `Hora`.
- `components/questions/Donde.tsx` — new. Renamed from `Lugar`.
- `components/questions/Nombre.tsx` — modified. Loses its reaction state.
- `components/questions/Dia.tsx`, `Hora.tsx`, `Lugar.tsx` — deleted.
- `app/crear/cuando/page.tsx` — new.
- `app/crear/donde/page.tsx` — new (renamed from `lugar/`).
- `app/crear/dia/`, `app/crear/hora/`, `app/crear/lugar/` — deleted.
- `app/crear/nombre/page.tsx` — modified (next target → `/crear/cuando`).
- `app/layout.tsx` — modified. `next/font/google` → `next/font/local`.
- `app/globals.css` — modified. Dual-token `:root`, monochrome question
  screens, landing + arc restyle.
- `components/ZodiacArc.tsx` — modified. Ink strokes (decision 7).

**Fonts (`web/src/fonts/`)** — new. General Sans woff2 (Task 4).

**Tests**
- `web/tests/questions.test.tsx` — rewritten for three screens.
- `tests/copy.test.ts` — modified. Dead copy removed from the gate.

---

### Task 1: `Cuando` — the merged date-and-hour screen

The one screen where the flow actually computes something, and the place the
cusp guard is most at risk (spec decision 2, "What binds this design" #5).

**Files:**
- Modify: `web/tests/questions.test.tsx` (Dia + Hora describes → Cuando)
- Create: `web/src/components/questions/Cuando.tsx`
- Create: `web/src/app/crear/cuando/page.tsx`
- Delete: `web/src/app/crear/dia/page.tsx`, `web/src/app/crear/hora/page.tsx`
- Delete: `web/src/components/questions/Dia.tsx`, `web/src/components/questions/Hora.tsx`
- Modify: `web/src/app/crear/nombre/page.tsx`

**Interfaces:**
- Consumes: `useBirthAnswers`; `sunSignForDate` (`@core/sunsign`); `CLASS_ES`
  (`@core/copy/classes.es`); `CLASE_REACCION_ES`, `CUSPIDE_ES`
  (`@core/copy/flow.es`).
- Produces: `export function Cuando({ onNext }: { onNext: () => void })`.

**Contract (this is the whole screen):**

- One card, two fields side by side in the existing `.row` grid: date
  (`type="date"`) and hour (`type="time"`).
- The class appears **immediately** when the date becomes valid — no press.
  `sunSignForDate` is synchronous; derive `guess = validDate ? sunSignForDate(date) : null`
  directly from the date string. There is no `shown` state.
- On a guarded day (`guess.certain === false`) render `CUSPIDE_ES` and **no**
  class name. This must not regress.
- Ghost pill "No la sé exacta": `set({ time: "12:00", hourKnown: false })`
  (writes storage immediately — see decision 2), marks the hour field visually
  as skipped, and does **not** advance. The assumed 12:00 is never shown back
  in the input; the skipped mark stands in for it.
- CTA "Siguiente" is disabled until the date matches `^\d{4}-\d{2}-\d{2}$`
  **and** (a valid `HH:MM` hour is entered **or** the hour was skipped).
- The single CTA press commits and advances: if the hour was skipped,
  `set({ date })` (time/hourKnown already in storage); otherwise
  `set({ date, time, hourKnown: true })`. Then `onNext()`.
- Date and hour both restore from storage on back-navigation, using the
  `typed ?? answers.X ?? ""` idiom. A previously-skipped hour shows the skip
  mark, not "12:00".

- [ ] **Step 1: Rewrite the test block first**

In `web/tests/questions.test.tsx`, delete the `Dia` and `Hora` describes and
their `Dia`/`Hora` imports; add a `Cuando` describe:

```tsx
describe("Cuando", () => {
  it("shows the class the moment a certain date is entered, with no press", async () => {
    const onNext = vi.fn();
    render(<Cuando onNext={onNext} />);
    fireEvent.change(screen.getByLabelText(/día naciste/i), { target: { value: "2000-07-28" } });
    expect(screen.getByText("ARTISTA")).toBeTruthy();
    expect(onNext).not.toHaveBeenCalled();
  });

  it("renders the cusp line and no class on a guarded day", async () => {
    render(<Cuando onNext={() => {}} />);
    fireEvent.change(screen.getByLabelText(/día naciste/i), { target: { value: GUARDED } });
    expect(screen.queryByText("ARTISTA")).toBeNull();
    expect(screen.getByText(/cambiando de signo/i)).toBeTruthy();
  });

  it("commits date and a typed hour on the single advance press", async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(<Cuando onNext={onNext} />);
    fireEvent.change(screen.getByLabelText(/día naciste/i), { target: { value: "2000-07-28" } });
    fireEvent.change(screen.getByLabelText(/qué hora/i), { target: { value: "22:45" } });
    await user.click(screen.getByRole("button", { name: /siguiente/i }));
    expect(stored()).toMatchObject({ date: "2000-07-28", time: "22:45", hourKnown: true });
    expect(onNext).toHaveBeenCalled();
  });

  it("writes 12:00 and hourKnown false when the hour is skipped, without advancing", async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(<Cuando onNext={onNext} />);
    await user.click(screen.getByRole("button", { name: /no la sé/i }));
    expect(stored()).toMatchObject({ time: "12:00", hourKnown: false });
    expect(onNext).not.toHaveBeenCalled();
  });

  it("advances from a skipped hour once the date is filled", async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(<Cuando onNext={onNext} />);
    await user.click(screen.getByRole("button", { name: /no la sé/i }));
    fireEvent.change(screen.getByLabelText(/día naciste/i), { target: { value: "2000-07-28" } });
    await user.click(screen.getByRole("button", { name: /siguiente/i }));
    expect(onNext).toHaveBeenCalled();
    expect(stored().date).toBe("2000-07-28");
  });

  it("keeps the CTA disabled until the date is valid and the hour answered", async () => {
    render(<Cuando onNext={() => {}} />);
    const cta = () => screen.getByRole("button", { name: /siguiente/i }) as HTMLButtonElement;
    expect(cta().disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/día naciste/i), { target: { value: "2000-07-28" } });
    expect(cta().disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/qué hora/i), { target: { value: "22:45" } });
    expect(cta().disabled).toBe(false);
  });
});
```

Keep the `GUARDED` helper (it derives from `SUN_SIGN_BY_DAY`) and the `stored()`
helper already in the file.

- [ ] **Step 2: Run it and watch it fail**

```bash
npx vitest run web/tests/questions.test.tsx
```

Expected: FAIL — `Cannot find module '@/components/questions/Cuando'`.

- [ ] **Step 3: Write `Cuando.tsx`**

Implement the contract above. Use the "derived, not synced" idiom already in
`Dia.tsx`/`Hora.tsx`: `date = typedDate ?? answers.date ?? ""`, and
`time = typedTime ?? (answers.hourKnown === false ? "" : answers.time ?? "")`.
Track the skip with a local boolean seeded from storage (`answers.hourKnown ===
false`) and cleared when a real hour is typed. The skipped visual is a quiet
mark on the hour field, never "12:00".

- [ ] **Step 4: Wire the route and delete the old ones**

`web/src/app/crear/cuando/page.tsx` — guards nothing (the name is skippable,
so no earlier answer must exist):

```tsx
"use client";

import { useRouter } from "next/navigation";
import { Cuando } from "@/components/questions/Cuando";

export default function Page() {
  const router = useRouter();
  return <Cuando onNext={() => router.push("/crear/donde")} />;
}
```

Delete `crear/dia/page.tsx`, `crear/hora/page.tsx`, `questions/Dia.tsx`,
`questions/Hora.tsx`. Update `crear/nombre/page.tsx` so its `onNext` pushes
`/crear/cuando` instead of `/crear/dia`. (`/crear/donde` is a dangling route
until Task 2 — that is a runtime target, not a typecheck break.)

- [ ] **Step 5: Run the tests**

```bash
npx vitest run web/tests/questions.test.tsx && npm test
```

Expected: PASS. If the cusp test fails because a hard-coded date turns out
certain, pick a `null` key from `SUN_SIGN_BY_DAY` — the generated table, not
the date, is the authority.

- [ ] **Step 6: Typecheck both projects**

```bash
npx tsc --noEmit && cd web && npx tsc --noEmit; cd ..
```

- [ ] **Step 7: Commit**

```bash
git add web/src/components/questions/Cuando.tsx web/src/app/crear web/tests/questions.test.tsx
git rm web/src/components/questions/Dia.tsx web/src/components/questions/Hora.tsx
git commit -m "feat(flow): merge dia and hora into /crear/cuando, one press"
```

---

### Task 2: `Donde` (rename) and the slimmed `Nombre`

**Files:**
- Modify: `web/tests/questions.test.tsx` (Lugar describe → Donde; Nombre
  describe updated)
- Create: `web/src/components/questions/Donde.tsx` (renamed `Lugar`)
- Create: `web/src/app/crear/donde/page.tsx` (renamed `lugar/`)
- Delete: `web/src/components/questions/Lugar.tsx`, `web/src/app/crear/lugar/`
- Modify: `web/src/components/questions/Nombre.tsx`

**Interfaces:**
- `Donde({ onNext })` — behaviour-identical to the current `Lugar`; only the
  name changes.
- `Nombre({ onNext })` — no reaction; CTA disabled until non-empty.

- [ ] **Step 1: Rename Lugar → Donde in behaviour, not behaviour**

In `questions.test.tsx`, rename the `Lugar` describe and the `Lugar, returning
to the step` describe to `Donde`, and import `Donde` instead of `Lugar`. The
tests themselves (cannot commit before choosing; choosing does not advance;
empty-search error; committable-on-return) stay as they are — the behaviour is
unchanged. Update the `Nombre` describe:

```tsx
describe("Nombre", () => {
  it("stores the name and advances without a reaction", async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(<Nombre onNext={onNext} />);
    await user.type(screen.getByLabelText(/te llamas/i), "Carlos");
    await user.click(screen.getByRole("button", { name: /siguiente/i }));
    expect(stored().firstName).toBe("Carlos");
    expect(onNext).toHaveBeenCalled();
    expect(screen.queryByText(/Vale, Carlos/)).toBeNull();
  });

  it("is skippable and advances without a name", async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(<Nombre onNext={onNext} />);
    await user.click(screen.getByRole("button", { name: /prefiero no decirlo/i }));
    expect(stored().firstName).toBeUndefined();
    expect(onNext).toHaveBeenCalled();
  });

  it("keeps the CTA disabled while the box is empty", async () => {
    render(<Nombre onNext={() => {}} />);
    expect((screen.getByRole("button", { name: /siguiente/i }) as HTMLButtonElement).disabled).toBe(true);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

```bash
npx vitest run web/tests/questions.test.tsx
```

Expected: FAIL — `Cannot find module '@/components/questions/Donde'`.

- [ ] **Step 3: Create `Donde.tsx` and `crear/donde/page.tsx`**

Copy `Lugar.tsx` to `Donde.tsx`, renaming the exported function to `Donde`.
Nothing else changes — same `PlaceCombo`, same disabled-until-chosen CTA, same
`ERRORES_ES.lugarVacio` on an empty search, same "Crear mi carta" label.
`crear/donde/page.tsx` guards `["date"]` only (down from `["date", "time"]` —
the hour is answered on the same screen as the date and cannot exist without
it):

```tsx
"use client";

import { useRouter } from "next/navigation";
import { StepGuard } from "@/components/questions/StepGuard";
import { Donde } from "@/components/questions/Donde";

export default function Page() {
  const router = useRouter();
  return (
    <StepGuard needs={["date"]}>
      <Donde onNext={() => router.push("/crear")} />
    </StepGuard>
  );
}
```

Delete `questions/Lugar.tsx` and `app/crear/lugar/`.

- [ ] **Step 4: Slim `Nombre.tsx`**

Remove the `reaccion` state and the `NOMBRE_ES` import. The single CTA becomes
a submit button that is `disabled` while `firstName.trim()` is empty; on submit
it does `set({ firstName: name })` then `onNext()`. The ghost pill
"Prefiero no decirlo" keeps `set({ firstName: undefined }); onNext();`.

- [ ] **Step 5: Run the tests**

```bash
npx vitest run web/tests/questions.test.tsx && npm test
```

- [ ] **Step 6: Typecheck both projects**

```bash
npx tsc --noEmit && cd web && npx tsc --noEmit; cd ..
```

- [ ] **Step 7: Commit**

```bash
git add web/src/components/questions/Donde.tsx web/src/components/questions/Nombre.tsx web/src/app/crear web/tests/questions.test.tsx
git rm web/src/components/questions/Lugar.tsx
git commit -m "feat(flow): rename lugar to donde, drop the nombre reaction"
```

---

### Task 3: Delete the dead copy

**Files:**
- Modify: `src/copy/flow.es.ts`
- Modify: `tests/copy.test.ts`

- [ ] **Step 1: Update the test first**

In `tests/copy.test.ts`, drop `HORA_ES`, `NOMBRE_ES` and `horaReaccion` from
the import, and remove the three tests that only exist to exercise them:
`"covers the whole clock with ascending buckets ending at 24"`, `"maps a time
to its bucket"`, `"falls back to the last bucket rather than returning
undefined"`. Remove `...HORA_ES.map((b) => b.linea)` and
`...Object.values(NOMBRE_ES)` from the epicene `lines` array. The
`"has a reaction for all twelve classes"`, `"has six dial lines"` and epicene
tests stay.

- [ ] **Step 2: Run it and watch it fail**

```bash
npx vitest run tests/copy.test.ts
```

Expected: FAIL — import/`describe` references now dangling.

- [ ] **Step 3: Delete the dead exports**

In `src/copy/flow.es.ts`, remove `NOMBRE_ES` (both `conNombre` and
`sinNombre` — the latter was already unreferenced), `HourBucket`, `HORA_ES`,
and `horaReaccion`. Keep `CLASE_REACCION_ES`, `CUSPIDE_ES`, `DIAL_ES`,
`HORA_DESCONOCIDA_ES` and `ERRORES_ES`.

- [ ] **Step 4: Run the tests**

```bash
npx vitest run tests/copy.test.ts && npm test
```

- [ ] **Step 5: Commit**

```bash
git add src/copy/flow.es.ts tests/copy.test.ts
git commit -m "refactor(flow): delete dead copy left by the shortened flow"
```

---

### Task 4: General Sans, self-hosted

**Files:**
- Create: `web/src/fonts/GeneralSans-{Regular,Medium,Semibold,Bold}.woff2`
- Modify: `web/src/app/layout.tsx`

- [ ] **Step 1: Download and confirm the licence**

Download the four static weights (400/500/600/700) from
`https://www.fontshare.com/fonts/general-sans`. **Read the Fontshare licence
and record the verdict** — the spec blocks decision 5 on this. If self-hosting
is not permitted, stop and use Inter via `next/font/google` under the same
`--font-roobert` variable name (decision 4 above); the rest of this task is
unchanged. Put the woff2 files under `web/src/fonts/`.

- [ ] **Step 2: Read the Next 16 font docs**

`web/node_modules/next/dist/docs/01-app/01-getting-started/13-fonts.md` and
`.../03-api-reference/02-components/font.md`. `next/font/local`'s API differs
from `next/font/google`; do not write it from memory of an older Next.

- [ ] **Step 3: Swap the import in `layout.tsx`**

Replace the `Bricolage_Grotesque`/`Karla` imports with `localFont` loading the
four weights, all under `variable: "--font-roobert"`, and keep the
`className` wiring on `<html>` (the variable now being `generalSans.variable`).
Leave the `metadata` block untouched — the spec's decision 10 landing-copy
change is already shipped and is not reopened here.

- [ ] **Step 4: Wire the aliases in `globals.css`**

Add (or confirm, in Task 5) `--font-display: var(--font-roobert)` and
`--font-body: var(--font-roobert)` in `:root`. This is what keeps every
out-of-scope component on the new face without editing each call site, and it
is what "everything reads `var(--font-roobert)`" means in practice. If this
step is deferred to Task 5, both must land in the same commit — a font swap
with the old `--font-bricolage`/`--font-karla` references still in `:root`
renders the app in a broken fallback.

- [ ] **Step 5: Verify and commit**

```bash
cd web && npm run dev
```

Confirm in the browser: the landing, a question screen, and the character card
all render in General Sans (the card will show it even though it is
out-of-scope, because the swap is global). Then:

```bash
git add web/src/fonts web/src/app/layout.tsx web/src/app/globals.css
git commit -m "feat(flow): self-host General Sans as --font-roobert"
```

---

### Task 5: Tokens + the monochrome question screens

The riskiest task, and the one no test can catch — verify in the browser.

**Files:**
- Modify: `web/src/app/globals.css`

- [ ] **Step 1: Build the dual-token `:root`**

Replace the `:root` block with two sections:

**(a) The DESIGN.md tokens** — colours `--color-ink-black` `#000000`,
`--color-paper-white` `#ffffff`, `--color-warm-cream` `#f9f8f6`,
`--color-sand-border` `#dad4c8`, `--color-cool-mist` `#e6e8ec`,
`--color-stone-gray` `#55534e`, `--color-ash-gray` `#9f9b93`,
`--color-slate-gray` `#222222`, `--color-violet-pulse` `#3859f9` (links only);
the type scale (`--text-caption` … `--text-display`, `--leading-*`,
`--tracking-*`); the radii (`--radius-sm` … `--radius-full`, plus the named
`--radius-inputs: 8px`, `--radius-buttons: 1584px`, `--radius-cards: 24px`);
`--shadow-subtle` (the primary-CTA shadow, verbatim from DESIGN.md); and
`--font-display: var(--font-roobert)`, `--font-body: var(--font-roobert)`.

**(b) The legacy warm-paper tokens, in a clearly-marked block.** Keep
`--papel`, `--papel-alto`, `--pista`, `--pista-alta`, `--tinta`,
`--tinta-media`, `--tinta-suave`, `--tinta-lectura`, `--tinta-inversa`,
`--tinta-inversa-suave`, `--linea`, `--agua`, `--fuego`, `--aire`, `--tierra`,
`--agua-honda`, `--violeta`, `--favor-*`, `--contra-*`, `--paquete-*`,
`--radio-objeto`, `--radio-campo`, `--radio-pildora`, and `--measure` exactly
as they are. A comment states: *"legacy — still consumed by the character
card, reveal, reading, report and share render; migrate those before deleting
this block"* (see decision 1).

- [ ] **Step 2: Restyle the question screens**

Rewrite the `.pregunta` / `.field` / `.reaccion` / `.reaccion__clase` /
`.escape` / `.submit` / `.error` block to the reference (spec decision 4):

- **The question card** — white `--color-paper-white` surface, `1px
  --color-sand-border` border, `--radius-cards` (24px) radius, comfortable
  padding. The question itself is display type: `--font-roobert` at
  `--text-subheading`/`--text-heading-sm`, weight 700, tight tracking, black.
- **Inputs** — `--radius-inputs` (8px), `1px --color-cool-mist` border, white
  fill, black text; keep the 48px min-height and the date/time native sizing.
- **CTA `.submit`** — black pill: `#000` fill, `--radius-buttons` (1584px)
  radius, white text at 15–16px Roobert 500, `--shadow-subtle`, 8px/16px
  padding. Disabled state is a muted opacity. **No `--agua` fill anywhere.**
- **`.reaccion__clase`** — the class name in **ink black** at display weight
  (700), not `--agua`. The supporting reaction line in `--color-stone-gray`.
- **`.escape` (ghost pill)** — outlined pill per DESIGN.md Secondary Ghost
  Button: transparent fill, `1px --color-cool-mist` border, 1584px radius,
  black text, 14–15px Roobert 500. (It is a pill now, not an underlined link.)
- **`.error`** — `--color-stone-gray` or ink, no colour fill.
- **No element colour appears on any question screen.** Grep after editing:
  the `.pregunta` block and its children must not reference `--agua`,
  `--fuego`, `--aire`, `--tierra` or `--violeta`.

- [ ] **Step 3: Verify in the browser**

```bash
cd web && npm run dev
```

Walk `/crear/nombre` → `/crear/cuando` → `/crear/donde`. Confirm: the class
reveal on a valid date is black type on a white card with a sand border; the
CTA is a black pill; the skip pill is outlined. Then check the seam: `/crear`
(the reveal) still shows the warm-paper dial — that is expected, not a bug.

- [ ] **Step 4: Commit**

```bash
git add web/src/app/globals.css
git commit -m "feat(flow): monochrome question screens on the DESIGN.md tokens"
```

---

### Task 6: Landing + ZodiacArc restyle

**Files:**
- Modify: `web/src/app/globals.css`
- Modify: `web/src/components/ZodiacArc.tsx`

- [ ] **Step 1: The landing goes monochrome (spec decision 4 + DESIGN.md Hero)**

Restyle `.hero` from a coloured block to the reference Hero Section: no fill
(white canvas), headline in `--font-roobert` 700 at `--text-heading-lg`/
`--text-display` with the DESIGN.md negative tracking and `--color-ink-black`,
subhead in `--font-roobert` 400 at `--text-body`/`--text-subheading` in
`--color-stone-gray`. The `.hero h1 em` emphasis is now weight, not a second
colour — keep it black. Restyle `.wordmark` to the reference nav treatment
(upper-case, small, +0.09em tracking, ink or stone) and `.foot` to a small
`--color-stone-gray` line with a `--color-sand-border` top hairline. The
landing CTA already uses `.submit.submit--enlace` and picks up the black pill
from Task 5.

- [ ] **Step 2: The arc moves to ink (spec decision 7)**

In `globals.css`: `.tick` stroke `--color-ash-gray` (2° ticks), `.tick--sign`
stroke `--color-ink-black` (30° sign rules), `.glyph` fill `--color-ink-black`.
Do **not** touch the glyph's `U+FE0E` guard in `ZodiacArc.tsx`, its geometry,
or `SPAN`.

In `ZodiacArc.tsx`, the baseline arc path hardcodes `stroke="var(--pista)"` —
move it to a neutral (`var(--color-sand-border)`), so the whole instrument is
ink/grey. This is the only change to the file; geometry, `SPAN` and the glyphs
are untouched.

- [ ] **Step 3: Verify in the browser**

`/` should now read: wordmark, black display headline on white, stone subhead,
black pill CTA, ink arc above. No element colour on the landing.

- [ ] **Step 4: Commit**

```bash
git add web/src/app/globals.css web/src/components/ZodiacArc.tsx
git commit -m "feat(flow): ink landing and zodiac arc"
```

---

### Task 7: Verify the whole thing and record the new count

- [ ] **Step 1: The full suite**

```bash
npm test
```

Expected: green. **Record the actual test count** — it moves off 406, not the
215 the spec quotes. Update both:

- `CLAUDE.md` — the "`npm test` must stay green (215 tests)" invariant becomes
  the new number.
- `HANDOVER.md` — the "Estado actual" checklist: mark the reskin built (and on
  which branch/commits), and add a dated addendum noting the two-design-system
  seam, the dual-token `:root` (decision 1), the skip-pill storage timing
  (decision 2), and the element-colour remap deferred to follow-on work #1.

- [ ] **Step 2: The remaining green gates**

```bash
npx tsc --noEmit && cd web && npx tsc --noEmit; cd ..
npm run example
cd web && npm run build
```

`npm run example` is the tsx smoke test — vitest passing does not prove tsx
works. `npm run build` is the real proof the `next/font/local` swap and the
dual-token CSS compile under Next 16.

- [ ] **Step 3: Full browser pass**

Walk the whole path on `npm run dev`: `/` → `/crear/nombre` (CTA disabled until
typed; skip advances) → `/crear/cuando` (class on valid date with no press; a
guarded day shows the cusp line; skip marks the hour without advancing; CTA
gates on date + hour) → `/crear/donde` (guard `["date"]`; CTA disabled until a
place is chosen; empty search errors) → `/crear` (the reveal still warm-paper).
Confirm dead bookmarks: `/crear/dia`, `/crear/hora` and `/crear/lugar` 404
(accepted — spec "Risks").

- [ ] **Step 4: Commit the doc updates**

```bash
git add CLAUDE.md HANDOVER.md
git commit -m "docs: record the flow reskin and the new test count"
```

---

## Follow-on (not part of this plan — spec "Follow-on work")

1. Migrate the character card and reveal dial onto the new tokens — this closes
   the seam and consumes the deepened element palette (`--fuego #c2410c`,
   `--aire #0667d9`, `--agua #0a7d70`, `--tierra #02693e`, one white-ink rule).
2. The free reading (including the `.hook` / `--violeta` open question).
3. The paid report, delivery route and share render.
4. Regenerate or retire `docs/design/clay/` — its artboards now describe a
   superseded system.
