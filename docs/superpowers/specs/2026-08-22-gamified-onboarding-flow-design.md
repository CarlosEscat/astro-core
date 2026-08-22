# Design: the gamified onboarding flow

Date: 2026-08-22
Status: approved, not built

The landing page today shows a hero, a four-field panel and a submit
button. This spec replaces that panel with **four questions asked one at
a time**, each answer paying back something computed and true, ending in
a deliberate theatrical wait and the character card.

Everything the flow says back is derived from the answers by pure
functions or read from static tables. **No LLM call happens anywhere in
the flow.** That is inherited from the character card, and it is the
property that makes the reactions safe to write at all.

---

## Why this exists, and where it sits

The 2026-08-22 sequencing decision at the top of `HANDOVER.md` parks
plans 2, 3 and 4-phase-B behind finishing the design of the whole user
journey. This spec is **step 1 of that instruction**: the landing, and
the path from it to a delivered free reading.

It does not cover the paid half of the journey — checkout, the
`/informe/<token>` delivery route, the returning visitor, or what an
expired token does. Those are the rest of step 1 and need their own
spec.

## What this is not

**It is not a redesign of the card, the reading, or the report.** The
free reading's modules, the character card and the paid upsell are
unchanged below the fold. This spec changes how a person *arrives* at
them.

**It is not the card spec's four open defects.** The paywall
contradiction, the wrong zeros, the 711px share budget and the permanent
*realce* all live in
`2026-08-15-character-card-game-mechanics-design.md` and are untouched
here. This flow ships against the card as it exists today.

**It is not a visual reskin.** Clay is the system and stays the system.
The flow uses tokens and objects that already exist — including
`@keyframes clay-latido` and the `prefers-reduced-motion` block the
`Espera` artboard already defines.

## What binds this design

Four existing rules constrain it and are not relitigated here:

1. **The timezone contract** (`CLAUDE.md`). `computeNatalChart` takes a
   UTC instant resolved with the *historical* offset. The flow adds a
   client-side sun-sign guess; §"The cusp guard" exists entirely to stop
   that guess from ever contradicting the real computation.
2. **No PII to the LLM**, and by extension: nothing personal in a URL.
   The step routes are static paths; every answer lives in
   `sessionStorage`.
3. **The epicene rule.** The flow's ~45 new lines are static Spanish
   written in the second person, which is where gendered participles
   creep in. They are gated by `copyProblems()` at test time.
4. **Zero LLM at render.** The card's defining property (Addendum 15)
   now extends backwards over the whole flow.

---

## Decisions taken

Approved in conversation on 2026-08-22. Do not relitigate without cause.

### 1. The flow reacts to every answer

The alternative — one question per screen with only a progress
indicator — was rejected. It is a form with extra clicks. Each step
gives something back, and what it gives back is computed, not written by
a model.

### 2. Question order is nombre → día → hora → lugar

Considered and rejected: putting *lugar* third so the timezone is known
before the hour is asked, which would make the Sun sign exact one step
earlier and leave a single tap as the final action. Rejected in favour
of the original order. Both orders end with the full chart, so the
climax is identical; the cost of this one is that the hour reaction
stays qualitative and the place autocomplete is the last input before
the reveal.

### 3. The reward at Q2 is the CLASS, not the sign

`CLASS_ES` already ships: Leo is **ARTISTA**, Aries is COMBATIENTE,
Escorpio is VIDENTE. Naming the class is the better game beat, it is
copy that already exists, and it is the card's own vocabulary arriving
before the card does.

### 4. The name is asked first, plainly, and is skippable

No "opcional" label — a character has a name. A quiet escape link
underneath means nobody is walled out at step one, before any value has
been delivered. The existing data contract is unchanged: `firstName`
stays optional and sanitized.

### 5. Each step has its own route, and the browser's back IS the back

`/crear/nombre`, `/crear/dia`, `/crear/hora`, `/crear/lugar`, `/crear`.

No on-screen back button is drawn — the flow reads as strictly forward,
which is what was wanted. But per-step routes hand the user a back
gesture whether one is designed or not, and on mobile the edge-swipe is
the gesture people already use. So back is *supported*, not *advertised*:
it steps to the previous question with the answer still filled in.

Deep-linking to a step with no answers in `sessionStorage` redirects to
`/crear/nombre`.

### 6. The reveal is a deliberate 4.5-second wait

**This deliberately reverses the `Espera` artboard.** Its sticky note on
state 1 reads: *"El cálculo tarda 0,553 ms. Esto no se llega a leer — es
el viaje de red, no la carta. Candidato a borrarse."* The canvas was
going to delete the calculating state. This spec expands it instead.

The reasoning is not decoration. It is that the wait must feel like work
is being done, because a person who watches a system compute for five
seconds is a person who believes the 9,90 € buys something. **A future
session must not "simplify" this back to an instant render.**

### 7. The status lines name their own data and real computation

Rejected: invented RPG stats (*calculando nivel de carisma*). The product
does not compute carisma, and a moat built on "every sentence names the
placement behind it" cannot open with a sentence that names nothing.

Every line names something that genuinely runs, and the first two echo
the person's own answers back:

```
Fijando tus coordenadas: 43,26° N · 2,93° O
Comprobando qué hora era de verdad en Bilbao el 28 de julio de 2000
Calculando las posiciones de los planetas
Levantando las doce casas
Midiendo los ángulos entre ellos
Comparando tus elementos con 8.000 cartas
```

Line 2 is the one that earns the money: the historical-timezone
resolution is this repo's first invariant and the thing competitors get
silently wrong. Here it is visible.

### 8. An unknown hour is answerable, and the card says so

An escape link under the time input sets 12:00 and flags the chart as
having no exact hour. The card then renders `seVe` as **approximate**
rather than printing an Ascendant as fact. Rejected: forcing a guess and
treating it as exact — that prints a possibly-wrong Ascendant in a
product that promises not to.

### 9. No failure ever returns anyone to question 1

`HANDOVER.md` already records this as an unfixed defect: *"today all four
error paths land in the same place."* With four questions answered it
stops being a nuisance and becomes indefensible.

### 10. The landing no longer states the grounding rule

*"Cada frase nombra la posición exacta que la sustenta"* comes off the
landing page. It is the method, not the benefit, and it is too technical
to earn its place at the moment someone decides whether to bother. The
subhead sells specificity instead.

**Read this precisely, because it is easy to misread as something much
worse.** What changed is the *marketing claim*. The *engineering rule is
untouched*: `validateTeaser()` and `groundingProblems()` still gate
output, grounding is still fatal on the paid tier, and `{{RULES_CHART}}`
still governs which prompts may see the technical vocabulary. Dropping
the sentence from a landing page has no bearing on whether the model is
allowed to invent a retrogradation. It is not.

Addendum 5's *"precision as mysticism"* direction was already superseded
on the visual axis by the Clay reskin. This supersedes it on the copy
axis: **the precision is still the product, it is just no longer the
pitch.**

---

## The flow, step by step

### Landing — `/`

Headline leads with the card and the invitation. The subhead says the
*benefit* — that this one is about them specifically — and never the
method. The current long paragraph about astronomical precision comes
out entirely; see decision 10.

```
        Destiny Reports

     Crea tu carta.
     Descubre tu personaje.

  No es un horóscopo. Es tu carta,
  y no se parece a la de nadie.

     [  Empezar  ]

     4 preguntas · 40 segundos
```

The "40 segundos" claim is a promise the flow has to keep. Four inputs
plus a 4.5s reveal is comfortably inside it; if the flow grows a fifth
question, the number changes or comes out.

### Q1 — `/crear/nombre`

- **Input:** free text, sanitized on submit as today.
- **Escape:** "Prefiero no decirlo" → advances with `firstName`
  undefined.
- **Reaction:** framing only. No astrology is available yet. One line,
  plus one variant for the skipped case.

### Q2 — `/crear/dia`

- **Input:** date, 1900-01-01 to 2030-12-31, must be a real date.
- **Reaction:** **the class**, in the card's own typography —
  `CLASS_ES[sign]` plus one line per sign.
- **Cusp case:** when the guard says the sign is not certain, the class
  is *not* named. See below.

### Q3 — `/crear/hora`

- **Input:** time.
- **Escape:** "No la sé exacta" → 12:00 and `hourKnown: false`.
- **Reaction:** one of ~6 hour buckets (madrugada, amanecer, mañana,
  mediodía, tarde, noche). Qualitative and true; it names that the hour
  moves the Ascendant without claiming to know where yet.

### Q4 — `/crear/lugar`

- **Input:** the existing `/api/places` combobox, extracted unchanged
  from `BirthForm.tsx` — debounce, arrow-key navigation, `aria-*`
  wiring, "elige el municipio más cercano" hint.
- **No inline reaction.** The Ascendant line (`ASC_ES`) is not shown
  here — it belongs to the reveal, and pre-empting it would spend the
  climax a screen early. Choosing a place does not advance. The step ends with
  an explicit button press, because the person needs to commit: this is
  the roll, and it is what makes the wait feel earned rather than
  imposed.

### The reveal — `/crear`

```
t=0.0    button pressed → POST /api/chart and POST /api/free, both now
t=0.08   chart returns; card held in reserve
t=0-4.5  dial: 6 lines at ~750ms
t=4.5    card assembles, slot by slot
t=6.3    card complete
t=~9.5   prose lands underneath
```

**The dial is a floor, not a fixed timer.** Minimum 4.5s so the beat
always plays. If `/api/chart` has not returned by the last line, that
line *holds* rather than the sequence looping — it is still working, so
holding is honest. Past ~12s it is an error, not a wait. The cap applies
to `/api/chart` only; `/api/free` is allowed to keep running under the
finished card.

**What this does to the skeleton state, stated accurately.** Addendum 7
measured `/api/free` at ~9.5s end-to-end for a first-attempt pass, at
1.61 attempts per delivered reading, with each rejection costing ~5s. So
the prose typically arrives ~3s *after* the card finishes assembling, and
on a retry considerably later. The skeleton modules are therefore **not
deleted** — they are pushed below the fold and are no longer the first
thing anyone sees. That is the real gain, and it is worth having; but a
future session should not expect them to be gone.

**Reduced motion.** No spin, no assembly animation; lines still advance
on the same timing, card renders complete at 4.5s. The `Espera` artboard
already establishes this pattern.

---

## The cusp guard

The flow names a class at Q2, before any real chart exists. Sign
boundaries shift by about a day across years, so a naive date table would
occasionally announce ARTISTA and then hand back a card reading
CONFIDENTE — in a product whose entire claim is exactness.

**`sunSignForDate(date) → { sign, certain }`** lives in `src/`, not in
`web/`, so vitest reaches it. Within ±1 day of any boundary it returns
`certain: false`.

When `certain` is false the flow does not name the class. It says the
truth:

> Ese día el Sol estaba cambiando de signo. Tu hora decide de qué lado
> caes.

and the class reveal moves to the end, alongside the Ascendant. This
turns the ambiguous case into suspense rather than a bug.

**How wide the guard is, is an implementation choice and is not yet
measured.** A boundary-day ±1 rule guards 3 days per boundary, so ~36 of
365 days, on the order of 10% of birthdays. Treat that as an estimate:
the real figure depends on how far the boundaries actually drift across
1900-2030, which the population run in §Testing will tell you. Widen the
guard rather than narrow it — a missed reveal costs a beat, a wrong
reveal costs the product's whole claim.

**The property that must be tested:** when `certain` is true,
`sunSignForDate` must never disagree with `computeNatalChart` over a
generated population. Addendum 20 established the pattern — 5.000–8.000
generated charts — and this check is the reason the function belongs in
core.

---

## Error paths

| Fails | What they see | Where they land |
|---|---|---|
| `/api/places` empty or down | «No encontramos ese sitio. Prueba con el municipio más cercano.» | stays on Q4, typed text intact |
| `/api/chart` — bad data | dial stops, names the offending field | back to *that one question*, others kept |
| `/api/chart` — server or network | «No hemos podido conectar.» + reintentar | on the dial, all four answers kept |
| over the 12s cap | as above | as above |
| **`/api/free` only** | **card renders normally**; prose modules carry their own retry | nothing re-answered |

The last row is the fix `HANDOVER.md` asks for. The chart is already
computed and recomputing it is free, so a failed *reading* must never
cost four answers.

Empty and thin-chart cases (8,4% of charts with no tense personal
aspect, 5,8% with no harmonious one) are **not** errors and are not
handled here — they are the card's business, covered by the `Vacios`
artboard and the *realce* item in the card spec.

---

## Copy budget

| Table | Lines |
|---|---|
| name reaction + skipped variant | 2 |
| class reactions (12 signs) | 12 |
| cusp line | 1 |
| hour buckets | 6 |
| ascendant reaction (reuses `ASC_ES`) | 12 |
| dial status lines | 6 |
| unknown-hour card line | 1 |
| error strings | ~5 |
| **Total** | **~45** |

Against the paid card's 256 lines, this is small. All of it is static
Spanish, written in the second person, and therefore all of it is
exposed to the epicene trap that `copyProblems()` exists to catch.

---

## What changes in code

### Core (`src/`)

- **`src/sunsign.ts`** (new) — `sunSignForDate`, the cusp guard.
- **`src/copy/flow.es.ts`** (new) — the reaction tables above.
- **`src/card.ts`** — `FreeCard.seVe` gains `approximate: boolean`, set
  when the hour was skipped. This touches shipped card code.

### Web (`web/`)

`BirthForm.tsx` is 293 lines doing form state, place autocomplete, two
fetches, error handling and the entire reading render. It splits:

- `useBirthAnswers` — `sessionStorage`-backed answers, the thing that
  makes browser-back restore state.
- `PlaceCombo` — the existing autocomplete, extracted unchanged.
- One component per question.
- `Dial` — the reveal.
- `Reading` — everything currently rendered below the card.
- Five routes under `/crear`.

`CharacterCard.tsx` renders the approximate-Ascendant state.

---

## Testing

**What tests can cover:** `sunSignForDate` including the population-scale
agreement property; the copy tables for completeness across all twelve
signs and for `copyProblems()` cleanliness, matching the pattern in
`tests/copy.test.ts`; the `approximate` flag through `freeCard`; the
answer state machine and its redirects.

**What tests cannot cover, and the reason this section exists:** no test
in this repo asserts a class, colour or font. The dial, the assembly, the
timings and the layout are invisible to vitest. They get verified in the
browser, and that fact is recorded here so nobody reads a green suite as
proof the reveal works.

`npm test`, `npx tsc --noEmit`, `npm run example` and the `web`
typecheck must all be green — `npm run example` because vitest passing
does not prove the tsx path works.

---

## Open, and deliberately not settled here

- **The rest of step 1.** Checkout, `/informe/<token>`, the returning
  visitor, the second reading, and expired or wrong tokens. This spec
  covers landing → free reading only.
- **Exact wording.** Every Spanish line above is a draft. The tables are
  the deliverable; these are placeholders that read correctly.
- **Whether "40 segundos" survives measurement.** It is a promise on the
  landing page and should be timed on a real device before it ships.
- **Whether the technical register also comes out of the teaser and the
  final report.** Raised on 2026-08-22 alongside decision 10, and
  deliberately *not* settled here: this spec only governs the landing.
  It is a real question — the plain-register work (Addendum 17) already
  moved the paid report off degrees, orbs and house numbers, so the
  direction is consistent — but it touches `prompts/`, `src/sections.ts`
  and the eight briefs, needs a battery run, and belongs in its own spec.
- **Re-measuring `/api/free`.** The ~9.5s figure is from 2026-08-07 and
  the timing of the reveal is built on it. Worth re-running
  `scripts/battery-free.ts` before trusting the 4.5s floor.
