# Design: the character card as game mechanics (phase 2, paid)

Date: 2026-08-15
Status: approved by Carlos, not built

This is the design that unblocks the paid character card. It supersedes
the card half of `2026-08-13-character-card-design.md`, whose trait rows
("name plus a sentence") were rejected across five iterations on
2026-08-15 — see `2026-08-15-character-card-paid-exploration.md` for the
dead ends, and HANDOVER Addenda 18 and 19 for the summary.

Phase 1 (the free card, `src/card.ts` + `CharacterCard.tsx`) is built and
merged. This spec changes it as well as extending it; the changes are
listed explicitly in "What changes in code".

---

## The objective this is judged against

From Addendum 19, restated because every rejected iteration failed it:

> The card is the **conversion surface and the viral surface**. The report
> is the payload. The buyer knows nothing about astrology and must
> understand the card the first time they see it, without reading.

The test is not "does this summarise the chart faithfully" — that is the
report's job. The test is **would a stranger screenshot this and send it
to a friend**, saying *"esto da miedo de lo preciso que es"*.

Carlos's framing, from the concept note that ends the exploration
document:

> Traducir la matemática astrológica a conceptos de videojuego con tanta
> precisión y tanta gracia que la gente se sienta expuesta, validada, y
> con ganas de compartirlo inmediatamente.

---

## The governing idea

**The planet is the slot. The sign is the flavour.** The card never
prints a planet name on its surface; it prints what the planet *does*.

| Slot | Planet | bilbao-2000 |
|---|---|---|
| quién es | Sol | Leo → clase ARTISTA |
| cómo habla | Mercurio | Cáncer → en indirectas y silencios con intención |
| cómo se cura | Luna | Cáncer → llorando en su cuarto |
| cómo ataca | Marte | Cáncer → de lado, nunca de frente |
| cómo liga | Venus | Leo → montando un espectáculo |
| dónde tiene suerte | Júpiter | Géminis → cayendo bien mientras habla |
| qué le cuesta | Saturno | Tauro → soltar lo que ya tiene |

This is the rule Addendum 19 demanded — *planet names are jargon, sign
names are not* — taken one step further: the planet names are not merely
avoided, they are **eliminated from the surface** and replaced by the
mechanic they govern. They remain reachable behind a `?` on each row, so
the claim stays checkable without taxing a reader who will never check.

### The card speaks in the third person, about *tu personaje*

Not a stylistic choice. It resolves three separate problems at once:

1. **Gender agreement disappears.** Third-person verbs do not inflect in
   Spanish. *"Se cura llorando en su cuarto"* carries no gender mark;
   *"eres sensible"* does. The exploration document worried that the
   epicene rule would strangle the humour — the register dodges the
   problem entirely, because every line is an **action**, never an
   adjective.
2. **The roast stays affectionate.** Half a step of distance is what lets
   *"su punto débil es pagar impuestos"* read as funny rather than
   cruel. This is the answer to decision 3 of the concept note.
3. **It is the game.** Nothing signals "character sheet" more cheaply
   than talking about a character.

**Copy rule for all 256 lines: third person, an action, a concrete
object. Never an adjective.**

---

## The card, block by block

Ten blocks in this order. The paywall sits between blocks 6 and 7.

| # | Block | Free | Source |
|---|---|---|---|
| 1 | Clase + gloss + placement line | ✓ | `CLASS_ES[sun.sign]`, Sol + Ascendente |
| 2 | The punchline sentence | ✓ | composed from three slot lines |
| 3 | De qué está hecho (4 stats) | ✓ | `elementBalance` → percentile |
| 4 | A favor | ✓ | trígonos + sextiles |
| 5 | En contra | ✓ | cuadraturas + oposiciones |
| 6 | Viene en el mismo paquete | ✓ | conjunciones |
| — | **paywall** | | |
| 7 | Punto débil | (see below) | weakest element |
| 8 | Habilidades (6 rows) | | the seven slots minus the Sun |
| 9 | Compatibilidad (12 signs, tap to expand) | | `compatibleSigns()` |
| 10 | Quien le descoloca | | `frictionSign()` |

Block 7 is the one exception to the clean cut: when block 5 comes back
empty (8,4% of charts), the *punto débil* is promoted above the fold to
fill the gap and does **not** appear again below it. It is free on those
cards and paid on the rest. The mirror case — block 4 empty, 5,8% — is
served by a *punto fuerte*, which has no paid position at all and exists
only as that fallback.

Measured on the three battery charts: the free half is **635–732 px** —
inside one phone screen — and the whole card **1.710–1.876 px**, against
the 2.643 px of the eleven blocks the exploration document rejected for
scroll budget alone.

### Block 1 — the class is the Sun

The Sun is not given a row in Habilidades. `CLASS_ES` already renders it
as a class name (ARTISTA, COMBATIENTE, VIDENTE…), and a row repeating it
says the same thing twice. Seven planets, six rows plus the header.

The class **does** carry a one-line gloss under the name, in the game
register — *ARTISTA · "necesita público hasta para estar en su casa"*.
The mockups omitted it by accident; it is restored here because
"ARTISTA" on its own explains nothing to the reader this card exists
for. That gloss is the Sun's twelve lines in `slots.es.ts`.

**The existing `SUN_ES` / `MOON_ES` / `ASC_ES` tables cannot be reused
for any of this.** They are written in the second person and in the free
reading's register (*"te gusta que se te note"*), where the card needs
third person and an action (*"monta un espectáculo para que se le
note"*). Same data, different voice; they stay where they are, serving
the free reading.

### Block 2 — the punchline

One sentence, composed mechanically from three slot lines: *cómo habla*,
*cómo se cura*, and the *punto débil*. This is the screenshot unit.

> Tu personaje **habla en indirectas**, **se cura llorando en su cuarto**
> y su punto débil es **pagar impuestos**.

Every rejected iteration showed evidence without saying what it was
evidence *of*. This inverts that: the punchline leads, everything below
it is the receipt.

Note for whoever writes the tables: Carlos's original example used
*"monólogos dramáticos para comunicarse"*, which is Mercurio en **Leo**.
bilbao's Mercurio is in **Cáncer**. The mapping is sound; the example
reached for a different chart.

### Block 3 — the elements become a stat block, as percentiles

Four stats, 0–100, where the number is the **percentile against a baked
population**, not the raw weighted total.

```
AGUA    98  ████████████████████
FUEGO   54  ███████████
AIRE    12  ██
TIERRA   6  █
```

This is the single highest-leverage decision in the spec. It reads
instantly as the most universally recognised object in gaming — an RPG
stat block — while every number remains honest and checkable. *"Agua 12"*
means nothing without astrology; *"más agua que el 98% de la gente"*
needs none at all.

It also deletes two blocks: the raw four-element bar is redundant, and
the weakest stat **is** the punto débil.

The card **headlines whatever is rarest for that person** — the
`selectFeature()` pattern applied to stats. On bilbao only two of six
candidate measures are notable (agua p98, tierra p6); on
buenosaires-1985 the headline is tierra p4.

Measured: `computeNatalChart` + `elementBalance` run at **0,553 ms per
chart**, so an 8.000-chart population bakes in **4,4 s** and costs zero
at request time.

### Blocks 4, 5 and 6 — three categories, never two

`selectTraits()` currently sorts aspects into `rasgos` and `tensiones`,
and **spills a conjunction into `tensiones` whenever `rasgos` is full**.
Under the old prose card that was harmless. Under a buff/bug frame it
states something false — and `card.ts`'s own comment already knows why:
calling a conjunction harmonious *"would invent a valence the geometry
does not carry"*. The overflow rule does exactly that in the other
direction.

bilbao is the proof. It has **zero tense aspects** among the personal
planets, so as the code stands its card would print Júpiter conjunct
Saturno as something working against it.

Three buckets, keyed by aspect type alone, no reassignment:

| Block | Aspects | Sign |
|---|---|---|
| A favor | trígono, sextil | `+` |
| En contra | cuadratura, oposición | `−` |
| Viene en el mismo paquete | conjunción | `=` |

**Five rows maximum** across the three, tightest orb first.

### The empty-block rule

Some charts have nothing in a bucket. The stat block is the guaranteed
fallback, because every chart has a strongest and a weakest element:

- **`En contra` empty** → the *punto débil* moves above the fold and
  takes the slot. Measured at **8,4%** of charts (bilbao is one).
- **`A favor` empty** → the *punto fuerte* moves up instead. **5,8%**
  (madrid-1992 is one).

This is why the element tables need both directions — 8 lines, not 4.

### Block 8 — Habilidades, with the planet behind a `?`

Six rows. Each carries a `?` revealing the placement — *"esto sale de tu
Luna en Cáncer"*. The product's moat is that every claim is checkable;
this keeps that property without putting jargon on the surface.

**Retrógrado is a per-planet modifier, not a per-sign rewrite.** A
retrograde variant of every line would cost 60 lines (5 retrogradable
slot planets × 12 signs); one modifier per planet costs 5.

> ↺ **al revés.** Esta habilidad la usa hacia dentro: le sale cuando deja
> de buscarla.

Addendum 18 recorded that Carlos explicitly allows the word "retrógrado"
on the card, and that `copyProblems()` bans it as jargon. The card's copy
test needs an explicit exemption for this table.

### Blocks 9 and 10 — compatibility, personal per row

The best-received material of the entire exploration, already built and
tested in `profile.ts` since the free-reading redesign. All twelve signs
are listed, not the podium: the interaction that makes it work is
**looking up your partner's sign**, and the question people bring is not
"¿con quién encajo?" but "¿y con *este* qué tal?".

Each row expands on tap to two lines:

- **The reason**, joining what that sign does to something this person
  already is, taken from their own slots.
- **The receipt** underneath, in mono at 40% opacity — the geometric
  fact, translated into slot vocabulary.

`compatibleSigns()`'s existing `reasons` **cannot be used verbatim**, for
two independent reasons: they are full of planet names (*"Tauro es donde
está Saturno"*), and they address the reader in the second person while
the card speaks in the third. Both are fixed by the same rewrite, and
the slot vocabulary does the work — *"tu Venus en Leo se lleva bien con
Aries"* becomes *"Liga en el mismo idioma"*.

Signs sharing geometry must not share text. Aries and Sagitario score
identically on bilbao from the same aspects, and read:

> **Aries** — Entra por donde tú rodeas. Dice en voz alta lo que tú
> llevas media tarde insinuando — y eso te encanta y te agota el mismo
> día.
>
> **Sagitario** — Se ríe fuerte y no se para a descifrar qué querías
> decir con ese silencio. Contigo, que hablas en indirectas, funciona
> mejor de lo que parece: te obliga a soltarlo.

**A zero is a punchline, not a blank.** Cáncer, Leo and Acuario all score
0 on bilbao. Written properly they are among the strongest lines on the
card: *"El mismo número, el mismo escenario. Alguien tiene que sentarse a
mirar y ninguno de los dos ha venido a eso."*

The friction sign gets an inline tag in the list as well as its own
closing block — on bilbao it is Aries, which sits third at 20 points with
nothing marking it as the one that also unsettles.

---

## The paywall

**Free: blocks 1–5. Paid: blocks 6–9, plus the report.**

The free half is exactly one phone screen and exactly the 1080×1920 share
export, so the paywall and the shareable unit are the same line by
construction. A screenshot with a locked row in it does not get shared;
the free card must feel complete, because it is the advertisement.

What sits behind the wall is what has lookup value — the six abilities
and the twelve-sign compatibility.

### The free reading keeps its own compatibility block

`PARTNER_ES` already exists in `src/copy/signs.es.ts` — twelve
second-person lines, described in its own comment as *"the plain line
shown above the receipt in the compatibility module"*. The free reading
shows `topMatches()` (three signs) using it, and that **does not
change**. It would be absurd for the card to show a locked
*Compatibilidad* block while three matches sit in plain sight further
down the same page.

So the paid product is not "compatibility" — it is **the twelve, each
with its own reason, plus the sign that unsettles you**. That is exactly
the line the exploration document drew: *"enseñar los doce + fricción es
lo que lo convierte en producto de pago"*.

`PARTNER_ES` (12 lines, second person, keyed on sign alone) and the
card's `matches.es.ts` (84 lines, third person, keyed on sign ×
connection) therefore coexist deliberately. Unifying the free reading's
voice with the card's is a separate question this spec does not open.

The split is **absent from the payload, not hidden in the client**, which
is how `FreeCard` already works: a struct carrying paid fields for the
client to hide leaves the paid content readable in devtools.

This also answers the question Addendum 19 left open — *what exactly is
being sold* — which plan 2 needs before it writes a product description
into Stripe. **What is sold is the full card plus the report.**

---

## The copy budget: 256 lines

This is the real cost of the product, and it is writing, not
engineering. Every table is static; nothing is generated at request time.

| Table | Key | Lines |
|---|---|---|
| `slots.es.ts` | 7 planetas × 12 signos | 84 |
| `matches.es.ts` | 12 signos × 7 tipos de conexión | 84 |
| `pairs.es.ts` | 21 pares × 3 tonos | 63 |
| `friction.es.ts` | 12 signos | 12 |
| `elements.es.ts` | 4 punto débil + 4 punto fuerte | 8 |
| `retro.es.ts` | 1 por planeta retrogradable | 5 |
| | **Total** | **256** |

The Sun's twelve entries in `slots.es.ts` are the class glosses, not a
Habilidades row. Nothing here reuses `SUN_ES`, `MOON_ES`, `ASC_ES` or
`PARTNER_ES`: those are second-person, free-reading register, and they
stay in service there. `CLASS_ES` **is** reused as-is — it is already
epicene and already the right register.

### Why the pair table excludes the outers

`selectTraits()` today skips only outer–outer pairs, so `Sol+Urano` is
the **second most common key in the whole distribution**. Excluding any
aspect that touches Urano, Neptuno or Plutón:

- the table halves, **126 → 63** (only 58 keys ever occur in 5.000 charts)
- **76,4%** of charts still fill all five rows; the average is 4,71 of 5
- every surviving line is personal rather than shared with a birth cohort

It is the same rule that already justifies seven slots rather than ten,
applied one step further.

### Why "write the frequent pairs first" does not work

The exploration document proposed prioritising pairs by measured
frequency. Measured over 5.000 charts, **the distribution is flat**. The
most common key (`Sol+Mercurio` fusión) appears in 10% of charts and
everything after it sits at ~6%; 121 of 126 possible keys occur.

| Lines written | Slots covered | Charts with no fallback |
|---|---|---|
| 50 | 55,7% | 3,5% |
| 80 | 81,3% | 38% |
| 100 | 92% | 67% |
| 126 | 100% | 100% |

There is no head to write first. Either write the whole table or accept
fallback on a third of cards — which is why the 63-line version wins:
it is complete.

### Copy rules for every table

1. Third person, an action, a concrete object. Never an adjective.
2. The roast attacks the **behaviour**, never the person.
3. Every line passes `copyProblems()` and `countGenderMarks()`, with a
   deliberate `retrógrado` exemption for `retro.es.ts`.
4. No line may name a planet. The `?` reveal and the compatibility
   receipt are the only places a planet name appears.
5. Two signs sharing geometry must not share text.

An LLM may help **draft** these lines offline. None of them is generated
at request time — the card keeps phase 1's zero-LLM property, which is
what makes it grounded by construction.

---

## What changes in code

### `astro-core`

**`src/card.ts` — `selectTraits()` changes twice.**

- It skips any aspect touching an outer, not merely outer–outer pairs.
- It stops reassigning overflow between buckets, and returns three lists
  — `aFavor`, `enContra`, `mismoPaquete` — keyed by aspect type alone.

Both changes are visible through `freeCard().bloqueado`, which is under
test today.

**`src/card.ts` — `characterCard(chart)`**, the paid projection, sibling
to `freeCard()`. `freeCard()` grows the new free blocks (percentile
stats, the punchline parts, up to five trait rows) and keeps carrying
counts only for what is locked.

**`src/percentiles.ts` (new)** — a pure lookup over a baked constant
table, plus `scripts/build-percentiles.ts` to generate it. Same shape as
`scripts/build-card-fonts.ts` and its generated output.

**`src/copy/` — the six tables above.**

### `web/`

- `CharacterCard.tsx` grows the paid rows and two client interactions:
  the `?` reveal and the compatibility drawers.
- `CharacterCardShare.tsx` renders the free half and nothing else, so the
  export and the paywall cannot drift apart.
- The dev preview route at `/preview/informe/<chart>` currently renders a
  fixed Leo/Cáncer/Cáncer placeholder that does not match the report
  below it. It must read the birth data from
  `scripts/battery-sections.ts`, not repeat it.

### Retired

`signature().oneIn` and the `1 de 1728` line. It is 12×12×12 and
identical for every human who has ever lived — Addendum 14 flagged it as
the card's weakest line, and the percentile engine makes real rarity
computable.

---

## Testing

- Every copy table under `copyProblems()` and `countGenderMarks()`, with
  the single documented `retrógrado` exemption.
- Completeness tests per table: no key may be missing, so a chart can
  never render a blank row.
- `selectTraits()`: a conjunction never lands in `enContra`; no returned
  trait touches an outer.
- Percentile table: monotonic, bounded 0–100, and the lookup agrees with
  a linear scan on the battery charts.
- Golden tests for both fallback paths, pinned to the charts that
  actually exercise them: **bilbao-2000** for the empty `En contra`,
  **madrid-1992** for the empty `A favor`.
- No test in this spec needs the network or costs money. The card has no
  LLM call, so there is no battery to run.

---

## Measured, and measured against what

Everything in this spec that carries a number was measured on
2026-08-15 against the three battery charts and populations of 5.000 or
8.000 generated charts. Two corrections were made during the session and
are recorded so they are not re-derived:

- **8,4% of charts have no tense personal aspects, not 2%.** The first
  measurement counted conjunctions that had spilled into the bug bucket
  as if they were bugs — the very defect this spec fixes.
- **The copy budget is 256, not 240.** The element fallback needs a
  *punto fuerte* table as well as *punto débil*, and the twelve friction
  paragraphs were missing from the earlier totals.

### One thing to fix before the number ships

The percentile population used here samples **uniform latitude and
longitude over the whole globe**, oceans and poles included, and uniform
dates 1960–2010. *"Más agua que el 98% de la gente"* should mean real
people, so `scripts/build-percentiles.ts` must sample a plausible birth
population instead. All three battery charts came out weakest-in-Tierra,
which may be a real pattern or may be an artifact of that sampling —
check it before the table is baked.

### Known cost, accepted

Júpiter sits ~1 year per sign and Saturno ~2,5, so those two slots are
age-correlated: your same-age friends — exactly the people you share with
— get the same line. It is still 1/12 of people per sign, which is why
they stay in the seven. Urano, Neptuno and Plutón at 7–20 years are not,
which is why they are out of both the slots and the pairs.

---

## What this spec does not decide

- **The 256 lines themselves.** This spec fixes their keys, their count
  and their rules. Writing them is the plan's largest task and the
  product's real cost.
- **Price.** Addendum 19 makes the free/paid line a pricing question;
  this spec answers *what is sold* (the full card plus the report) and
  leaves *for how much* to plan 2.
- **Anything in the report pipeline.** No prompt, no section, no
  generation path is touched.

---

## Process rules honoured, and why they are written down

The 2026-08-15 exploration burned five iterations on two mistakes. Both
held for this session and should hold for the next:

- **Always show the whole card, never a trimmed subset.** Every mockup in
  this session showed all nine blocks, which is how the empty-bucket
  defect surfaced at all — it is only visible when you look at three
  charts end to end.
- **No plan before Carlos approves a design.** This document is that
  approval.
