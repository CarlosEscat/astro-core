# Design: the flow, shortened and reskinned

Date: 2026-08-22
Status: approved, not built

Two changes to the onboarding flow, taken together because they touch
the same three files:

1. **Shorten it.** Four questions over eight presses become three
   questions over four presses.
2. **Reskin it.** `docs/design/DESIGN.md` replaces the warm-paper system
   as the design of record.

The gamified flow this amends shipped hours earlier the same day
(`2026-08-22-gamified-onboarding-flow-design.md`, merged as `1c00663`).
This is not a repudiation of it — the reactions, the cusp guard and the
theatrical wait all survive. It is the second pass over a flow whose
shape was right and whose length was not.

---

## Why this exists

Two complaints, both correct, both observed on the built flow.

**It is too long.** The flow reads as four questions but costs eight
presses, because every step submits to reveal its reaction and then
presses again to advance. That doubling was invisible in the spec and
obvious in the hand.

**The questions have no object.** They shipped with placeholder styling
that reuses `.field` and `.submit` on a bare `.shell`. The holding
comment at `web/src/app/globals.css:294` says so outright: *"The design
canvas has no artboard for a one-question screen yet — `Entrada` still
shows the old four-field panel."* A question with no card around it
reads as a label above a button.

## The design-system collision

`docs/design/clay/` and `docs/design/DESIGN.md` are two different design
systems that share the name **Clay**. The first shipped in the reskin
merged 2026-08-22 and is what the running app uses. The second is the
style reference, and as of this spec it wins.

| | `docs/design/clay/` (shipped) | `docs/design/DESIGN.md` (now authoritative) |
|---|---|---|
| Canvas | Warm paper `#faf7f2` | Pure white `#ffffff` |
| Type | Bricolage Grotesque + Karla | Roobert (substitute: General Sans) |
| Accent | Four element colours, fixed meaning | Violet Pulse `#3859f9`, links only |
| Radius | 28 / 16 / 999 | 24 / 8 / 1584 |
| Separation | "Sin sombras y sin bordes" | 1px Sand `#dad4c8` borders |
| Vivid colour | Element-coded, meaningful | Testimonial cards only |

They contradict each other on every axis, so there is no partial
adoption that is not visibly two systems at once.

## What this is not

**It is not the whole reskin.** This spec covers the landing and the
three question screens. The character card, the free reading, the paid
report, the `/informe/<token>` delivery route and the 1080×1920 share
render all still use the warm-paper system and each needs its own spec.
Until those land, the app visibly changes systems at the moment the flow
hands over to the card. That is accepted, and it is the cost of not
doing a big-bang reskin.

**It is not a change to what the flow computes.** Zero LLM calls, the
same pure functions, the same static tables.

**It is not a re-opening of the card's four known defects.** Those live
in `2026-08-15-character-card-game-mechanics-design.md`.

## What binds this design

Unchanged and not relitigated here:

1. **The timezone contract** (`CLAUDE.md`). `computeNatalChart` takes a
   UTC instant resolved with the historical offset.
2. **No PII to the LLM**, and nothing personal in a URL. Answers stay in
   `sessionStorage`; step routes are static paths.
3. **The epicene rule.** Surviving Spanish copy stays gated by
   `copyProblems()` at test time.
4. **Zero LLM at render.**
5. **The cusp guard.** On the 45 guarded days `sunSignForDate` returns
   `certain: false` and the screen MUST NOT name a class. This is the
   one rule most at risk from the merge in decision 2, because the class
   reveal moves onto a busier screen.

---

## Decisions taken

Approved in conversation on 2026-08-22.

### 1. The press only ever advances

Reactions appear the moment a field validates. There is no submit-to-see
step.

This is the whole of the length problem. `día` gains nothing from a
press to reveal the class — the date input completes, `sunSignForDate`
is synchronous, and the class can simply appear. The press that used to
buy the reaction now buys nothing, so it goes.

Rejected: auto-advancing on a timer after showing the reaction. It takes
control away at exactly the moment the person is reading the one thing
the flow gave them.

### 2. Three screens: nombre → cuando → donde

`día` and `hora` merge into `/crear/cuando`. Both ask about the same
event, and `hora`'s reaction was the weakest of the four by necessity —
the place is not yet known, so the Ascendant cannot be computed and the
line can only be qualitative.

`lugar` becomes `/crear/donde` and keeps having no reaction: the
Ascendant belongs to the reveal, and pre-empting it spends the climax a
screen early.

Rejected: two screens (`nombre`+`día`, then `hora`+`lugar`). It puts the
class reveal on the same card as the name box and crowds the one moment
meant to feel like a reward.

### 3. The nombre reaction is dropped

Question 1 says nothing back. The name is stored and pays off later, on
the card and in the reveal, where it means more.

This is a deliberate narrowing of the earlier spec's decision 1 ("the
flow reacts to every answer"). That rule was written to stop the flow
being a form with extra clicks. With three screens and one press each,
the risk it guarded against is gone, and the `conNombre` line was
framing rather than a computed payoff — it gave nothing the flow knew.

Rejected: moving the greeting to screen 2's heading. It reads well but
makes the heading vary in length by name, and the screen already carries
the class.

### 4. The question screens are fully monochrome

White canvas, black type, 1px Sand borders, 8px inputs, black pill CTA
at 1584px radius, Violet Pulse on links only.

This is what the reference requires — *"never use [vivid colour] for
buttons, links, or functional UI"*, and *"no distinct primary action
color"*. It also happens to be better for the flow than the alternative:
colour is withheld across all three screens and then arrives at once on
the card. The card becomes the "vivid clay object" the reference is
built around, and the payoff has somewhere to land.

### 5. General Sans, self-hosted

Roobert is commercial (Displaay) and not on Google Fonts. The reference
names Inter, General Sans or Söhne as substitutes. General Sans is the
closest to Roobert's geometric character, which matters because heavy
700 at large sizes IS this system's signature.

Loaded via `next/font/local` from files in the repo, replacing the
`next/font/google` import of Bricolage + Karla. **Confirm the Fontshare
licence permits self-hosting before wiring this.**

Swap to real Roobert later without touching call sites: everything reads
`var(--font-roobert)`.

### 6. Element colour survives, remapped and deepened

The four elements carry fixed astrological meaning — the character card
and the reveal dial both colour themselves by element — and the
reference has no slot for colour that means something. Rather than drop
it, the element palette is remapped onto vivid fills deepened until
white ink holds.

| Element | Hex | White ink |
|---|---|---|
| Fuego | `#c2410c` | 5.18:1 |
| Aire | `#0667d9` | 5.32:1 |
| Agua | `#0a7d70` | 5.03:1 |
| Tierra | `#02693e` | 6.79:1 |

One ink rule, no per-element exceptions, every card clearing 4.5:1.

Rejected, and worth recording because it was tried: the bright fills
(`#ff7614`, `#429dff`, `#10dce3`) with white ink. They measure 2.66,
2.83 and 1.70 respectively — below even the 3:1 large-text floor, and in
the 1.70 case the white name pill disappears into the fill. Bright fill,
white ink, readable text: pick two.

Also rejected: keeping the bright fills with black ink (8.1 / 7.9 /
12.4). It reads well and is what the reference literally specifies, but
Tierra's Forest still needs white, so the card carries two ink rules.

**These colours are consumed by the card and the dial, not by the flow.**
No element colour appears on any of the three question screens.

---

### 7. ZodiacArc stays, restyled to ink

The landing's arc is kept and its strokes move to the new neutrals
(`--color-ink-black` for sign rules, `--color-ash-gray` for the 2°
ticks, glyphs in ink). Its geometry, `SPAN`, and the U+FE0E text-
presentation guard on the glyphs are untouched.

There is a real tension here: the reference states *"Decorative
illustrations are absent"* and that the only graphic elements are clay
photography and logo marks. The arc is kept anyway because it is not
decoration — the component comment is explicit that it is real ecliptic
geometry, ticked every 2° with heavier rules on the 30° sign
boundaries, and it is the only thing on an otherwise monochrome landing
that says what the product is.

Rejected: dropping it for the reference's clay-sculpture photography.
That photography does not exist for this product, and commissioning or
sourcing it is not work this spec can assume.

## The three screens

Shared frame: `crear/layout.tsx` keeps the wordmark mount so it does not
re-mount between questions.

### `/crear/nombre`

Asks the name. Guards nothing. One press advances; a ghost pill
("Prefiero no decirlo") clears `firstName` and advances.

No reaction (decision 3). The CTA is inactive until the box is non-empty.

### `/crear/cuando`

Asks date and hour on one card, in a two-column pair. Guards nothing —
the name is skippable, so no earlier answer must exist.

On a valid date, `sunSignForDate` runs and the class appears immediately,
without a press. **On a guarded cusp day it must render `CUSPIDE_ES` and
must not name a class** — the reveal would otherwise contradict the card
twenty seconds later.

A ghost pill ("No la sé exacta") sets `time: "12:00"` and
`hourKnown: false`. **It does not advance the screen** — unlike the
`Hora.tsx` it replaces, where skipping was also the press that moved
you on. Here the date may still be empty, so skipping the hour only
marks the hour answered and leaves the CTA to advance. Pressing it
should visibly mark the hour field as skipped rather than filling in a
time.

The assumed 12:00 is never shown back: it was not their answer, and
seeing it filled in looks like the flow decided they were born at
midday.

The CTA activates once the date is valid and the hour is either entered
or explicitly skipped.

### `/crear/donde`

`PlaceCombo` unchanged in behaviour. Guards `["date"]`.

No reaction. Choosing a place does not advance — the step ends with an
explicit press, because that press is the roll, and it is what makes the
wait that follows feel earned.

CTA disabled until a place is chosen. `ERRORES_ES.lugarVacio` on an
empty search.

---

## Files

**Routes.** `web/src/app/crear/dia/` and `crear/hora/` are deleted;
`crear/cuando/` is added. `crear/lugar/` is renamed to `crear/donde/`.

**Guards.** `crear/cuando` guards nothing. `crear/donde` guards
`["date"]` — down from `["date", "time"]`, because the hour is now
answered on the same screen as the date and cannot be present without
it. `crear/` (the reveal) keeps `["date", "time", "place"]` unchanged.

**Components.** `questions/Dia.tsx` and `questions/Hora.tsx` are
replaced by `questions/Cuando.tsx`. `questions/Lugar.tsx` becomes
`questions/Donde.tsx`. `questions/Nombre.tsx` loses its reaction state.
`StepGuard.tsx` is unchanged in logic; its bounce target stays
`/crear/nombre`.

**Copy.** `src/copy/flow.es.ts`: `NOMBRE_ES.conNombre` and
`horaReaccion()` become dead and are deleted. `CLASE_REACCION_ES`,
`CUSPIDE_ES` and `ERRORES_ES` stay.

**Styles.** `web/src/app/globals.css`: the `:root` block is replaced
wholesale with the DESIGN.md tokens. The `.pregunta` / `.reaccion` /
`.escape` / `.field` / `.submit` holding block goes with it. The
`prefers-reduced-motion` block at the end of the file stays — the reveal
still depends on it.

**Fonts.** `web/src/app/layout.tsx` swaps `next/font/google` for
`next/font/local`.

**Out of scope, and therefore still warm-paper after this ships:**
`CharacterCard.tsx`, `CharacterCardShare.tsx`, `ShareCard.tsx`,
`Reading.tsx`, `ReportView.tsx`, `ReportIndex.tsx`, `Matches.tsx`,
`LoveHook.tsx`, `Dial.tsx`, `Reveal.tsx`.

`ZodiacArc.tsx` is **in** scope — see decision 7.

## Testing

`npm test` must come back green. The count moves off 215 and the new
number gets recorded in `CLAUDE.md` and `HANDOVER.md`.

- `web/tests/questions.test.tsx` — rewritten for three screens. Must
  cover: one press per screen; the class appearing on valid date with no
  press; **a guarded cusp day rendering `CUSPIDE_ES` and no class name**;
  both ghost-pill skips writing the right storage.
- `web/tests/use-birth-answers.test.tsx` — unchanged. The shape of
  `BirthAnswers` does not move.
- The `copyProblems()` epicene gate runs over surviving copy.
- `npm run example` still smoke-tests the tsx path. Vitest passing does
  not prove tsx works.

No new battery run is needed: nothing here touches a prompt or a model.

## Risks

**Dead bookmarks.** `/crear/dia`, `/crear/hora` and `/crear/lugar` stop
existing. `StepGuard` bounces an unguarded deep link to `/crear/nombre`,
but a bookmarked `/crear/lugar` will 404 rather than bounce, because the
route itself is gone. Acceptable for a flow whose state is
`sessionStorage`-scoped and which nobody has reason to bookmark
mid-way.

**Two design systems in one app.** Stated above and accepted. The seam is
the handover from `/crear/donde` to the reveal.

**Font licence.** Blocks decision 5 if Fontshare disallows self-hosting.

## Open question, deferred

The reference reserves vivid colour for testimonial cards and the
product now uses it for astrological meaning. Decision 6 resolves this
for the four elements. It does **not** resolve what the three aspect
cubes (`A favor` / `En contra` / `Mismo paquete`) become, nor
`--violeta` (`#7c3aed`), which `globals.css:482` uses as the fill for
`.hook` — the LoveHook screenshot unit in the free reading. Note that
DESIGN.md has its own violet, Violet Pulse `#3859f9`, reserved for links
and emphasis; whether `.hook` adopts it, takes a vivid card colour, or
keeps a violet of its own is decided when the free reading is migrated.

## Follow-on work, in order

1. The character card and the reveal dial onto the new tokens — this is
   what closes the seam, and it consumes decision 6.
2. The free reading.
3. The paid report, delivery route and share render.
4. Regenerate or retire `docs/design/clay/`. Its 15 artboards now
   describe a superseded system; leaving them unmarked will mislead the
   next person as it misled this session.
