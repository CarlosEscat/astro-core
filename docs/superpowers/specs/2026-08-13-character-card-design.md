# Design: the character card

Date: 2026-08-13
Status: approved, not built

The paid report opens as prose and nothing else. This spec adds a
computed **character card** — an RPG/TCG-shaped summary of the chart —
as the report's first screen, and a partial version of it to the free
reading.

Everything on the card is derived from `NatalChart` by pure functions.
**No LLM call happens at render time.** That is the point of the feature,
not an implementation detail: it is the first user-visible surface in
this product that cannot hallucinate.

---

## What this is not

**It is not the fix for the wall of text.** Addendum 13 measured that
problem precisely: report length is fine (sections run 272–547 words),
but five paragraphs exceed 200 words and the worst is a 286-word section
rendered as a single unbroken block, 1.31 phone screens at 375px. The fix
for that is Addendum 12's still-open item 3 — brief each section for
3–4 paragraphs instead of a word count — and it needs its own battery
run. This spec does not touch `src/sections.ts`, `prompts/`, or any
generation path.

The card is a *wow and share* feature. The paragraph brief is the
*readability* fix. Shipping the card and calling the wall solved would be
a mistake.

## Relationship to the plain-language spec

`2026-08-10-paid-report-plain-language-design.md` governs the same screen
and was amended on 2026-08-13 to absorb this one. The card is that spec's
own principle — *separar el dato de la frase* — taken to its limit: a
surface that writes nothing and therefore cannot get anything wrong.

Four rules from it bind this design and are not relitigated here:

1. **Houses are never numbered** (its decision 1). The card renders life
   areas in words.
2. **`RELATION_ES` is the single relation vocabulary** (its decision 4).
   The card's trait fallback consumes it rather than inventing a third.
3. **Sign glyphs only, never planetary ones** (its decision 7).
4. **`ReportView` never branches on title or index** (its decision 10).
   The card enters as an optional top-level prop.

Its decision 6 (per-section data strip) and this card are **not
redundant** and neither replaces the other: the strip exists so the
reader can check a claim *next to the claim*, which a card at the top of
3,000 words cannot do. Do not "simplify" by deleting one.

## Scope

- **In:** `src/card.ts`, three copy tables (`classes.es.ts`,
  `traits.es.ts`, `AREA_CORTA_ES`), a drafting script, a standalone
  jargon/cliché export in `src/validate.ts`, a shared zodiac-glyph path
  module, two React components, the free-tier projection, wiring into the
  live free page and the dev preview route.
- **Out:** section briefs, prompts, model choice, `/informe/<token>`
  (phase B, blocked on plans 2 and 3), server-side PNG rendering, PDF.

### Sequencing

**Nothing here is blocked by plans 2 or 3** (orders, payment, queue). But
the two halves of the card have different dependencies, and the split is
clean:

- **The free partial card is genuinely independent and ships now.** Its
  projection omits `rasgos` and `tensiones` entirely, so it touches no
  relation vocabulary at all — it needs only `classes.es.ts` and
  `AREA_CORTA_ES`, and it renders over the existing live `/api/free`.
- **The full card follows plan A and plan B** of
  `2026-08-10-paid-report-plain-language-design.md`. Plan A because its
  traits consume `RELATION_ES`, which does not exist yet; plan B because
  it should inherit that plan's glyph paths and area copy rather than
  race them into the same screen.

The full card then ships behind `/preview/informe/<chart>` and slots into
`/informe/<token>` unchanged when phase B of the delivery plan lands.

---

## Decisions

### 1. Hero header only

The card sits above the section index on the report page. The eight prose
sections are untouched. Rejected: threading card-shaped stat strips into
each section header, and restructuring the report itself around card
mechanics — the latter rewrites all eight briefs and needs a new battery
run for a presentation change.

### 2. Honest counts, no shared scale

No `STR: 14`. Astrology has no strength scale, so any 3–18 or 0–100 axis
is invented, and the buyer cannot audit it against their own chart. That
inverts `prompts/rubric.md`, where one unverifiable claim is
*eliminatory*, and contradicts the comment already standing in
`ShareCard.tsx`: *"never invented — because a fake number is exactly the
thing this product is not."*

A second reason, independent of grounding: a stat on a shared scale
implies a ranking. `DEF: 8` is fatalism with a number on it, and the
universal rules mandate agency-preserving language. Every figure on this
card is either a **count** (how many bodies aspect this planet) or a
**distribution** (element weights, which sum to a total and where no axis
is "better"). Neither can read as a verdict.

### 3. Game shape, Spanish words

The card is unmistakably a character sheet in structure, and carries no
English abbreviations. `CLASE`, `SE VE COMO`, `POR DENTRO`, `AFINIDAD`,
`RASGOS`, `TENSIONES`. A player reads a character card; a reader who has
never played an RPG reads a well-made profile. Both work.

This keeps the locked Addendum 5 direction — "precision as mysticism",
ink/bone/brass, Fraunces + Plex Mono, deliberately not the category's
purple fog — and stays consistent with the plain-register move committed
in `2bf5e4f` / `9a69de6`. Rejected: `STR/INT/CHA/DEF/LUCK`, which is
English jargon in an es-ES product aimed at a demographic that mostly
does not play RPGs.

### 4. No AI-generated avatar

The original idea called for Midjourney/DALL-E portraits. Rejected: it
breaks determinism, adds per-order cost and latency, cannot be rasterised
into the export without tainting the canvas, and produces off-brand art.
The visual identity stays generative-from-the-chart, as `ZodiacArc.tsx`
already is.

### 5. Free gets a partial card, paid gets the full one

The card costs nothing to compute (~80ms, local), so the free tier can
afford it — but a card given away whole stops being a reason to buy.

| Block | Free | Paid |
|---|---|---|
| `clase`, `seVe`, `porDentro` | yes | yes |
| `afinidad` | yes | yes |
| `rareza` | yes | yes |
| `planetas` | locked | yes |
| `rasgos`, `tensiones` | count only | yes |
| `definitorio` | locked | yes |

The locked rows are the pitch. Distribution and conversion both work.

### 6. Frozen copy tables, LLM-drafted and human-reviewed

Trait and class names are generated once offline, reviewed by hand, and
committed as static tables. Rejected: generating them per report, which
would add cost, latency, a validator and a retry path to the one
component that currently cannot hallucinate — and an invented trait is
exactly the failure mode Addendum 12 caught in production.

---

## Module boundary

`src/card.ts` exports one pure function:

```ts
characterCard(chart: NatalChart): CharacterCard
```

No I/O, no dates, no network — same contract as `chart.ts`. The web layer
renders and never computes, matching how `Elements.tsx` consumes
`elementBalance()` today.

It is a new module rather than an addition to `profile.ts`, which is
already 381 lines covering rulers, relationships, balances, compatibility,
friction, features and signature. Adding a seventh job would make a file
that is already doing too much worse.

Copy lives in `src/copy/classes.es.ts` and `src/copy/traits.es.ts`,
beside the existing `signs.es.ts` and `areas.es.ts`.

## Data model

```ts
export type Tone = "armonioso" | "tenso" | "fusion";

export interface CardPlanet {
  body: Body;
  sign: Sign;
  /** Internal key only. MUST NOT reach the DOM — see "houses are never
   *  numbered" below. Render `area`. */
  house: number;
  /** AREA_CORTA_ES[house]. This is what renders. */
  area: string;
  signDegree: number;
  retrograde: boolean;
  /** How many other bodies aspect this one. Recomputable from chart.aspects. */
  aspectCount: number;
}

export interface CardTrait {
  pair: [Body, Body];
  aspect: AspectType;
  orb: number;
  tone: Tone;
  /** null when the pair/tone has no reviewed entry — see the fallback. */
  nombre: string | null;
  linea: string;
}

export interface CardHighlight {
  kind: "cumulo-casa" | "cumulo-signo" | "sin-aspectos";
  titulo: string;
  linea: string;
}

export interface CharacterCard {
  clase: { sign: Sign; nombre: string };
  seVe: { sign: Sign; signDegree: number };
  porDentro: { sign: Sign; house: number; area: string };
  afinidad: Balance<Element>;
  planetas: CardPlanet[];
  rasgos: CardTrait[];
  tensiones: CardTrait[];
  definitorio: CardHighlight | null;
  rareza: { oneIn: number };
}
```

## Derivation rules

Every field must be recomputable from `NatalChart` alone. A field that
cannot be is not allowed on the card.

**`clase`** — from the Sun sign, 12 names. It is deliberately not unique:
one in twelve buyers share a class, and that is fine, because rarity is
carried by `rareza` and by the combination the card shows as a whole.

**`seVe`** — Ascendant sign and degree. **`porDentro`** — Moon sign and
life area.

### Houses are never numbered

The card renders the life area in words and **never a house number**.
This is not a card decision; it is decision 1 of
`2026-08-10-paid-report-plain-language-design.md`, and `AREA_ES`'s own
header states it: *"la ÚNICA forma en que la información de casa puede
llegar a un prompt"*. Decision 6's per-section data strip already
complies. A card printing "casa 3" three rows above a strip that
deliberately refuses to would be the product contradicting itself on one
screen.

**This requires a new copy table, `AREA_CORTA_ES`.** `AREA_ES` phrases run
6–12 words ("cómo hablas, escribes y te mueves por tu barrio"); seven of
them stacked is unreadable on screen and does not fit the 1080×1920
export at all. `AREA_CORTA_ES` is 12 entries of 2–4 words ("tu barrio y
cómo hablas", "el dinero", "el día a día"), lives beside `AREA_ES` in
`src/copy/areas.es.ts`, and goes under the same table test as the others.

`AREA_ES` is unchanged and keeps its role as the prompt-facing form. The
short table is display-only and must never be handed to a model — a
model given the terse phrasing would write terse, and the long form is
what makes the prose readable.

**`afinidad`** — the existing `elementBalance(chart)`, unchanged. Already
weighted (Sun/Moon 3, Mercury/Venus/Mars 2, outers 0.5, Ascendant 3,
Midheaven 2) and already rendered this way for the free tier.

**`planetas` — seven rows, not ten.** The five personal planets plus
Júpiter and Saturno. Urano, Neptuno and Plutón are excluded as individual
rows because each sits in one sign for 7–20 years: everyone of the
buyer's age has them there, so as a "stat" they say nothing personal.
They still appear inside `rasgos`/`tensiones` when they aspect a personal
planet, which is the only context in which they become personal.

*This rule must survive review — it looks like an omission otherwise.*

**`rasgos` and `tensiones`** — from `chart.aspects`, which
`detectAspects()` already returns sorted by orb ascending, so "tightest
first" needs no new sorting. Outer-to-outer pairs (Urano–Neptuno,
Urano–Plutón, Neptuno–Plutón) are filtered out for the generational
reason above. Cap: `rasgos` ≤ 3, `tensiones` ≤ 2.

Tone maps from aspect type:

| Aspect type | Tone |
|---|---|
| trine, sextile | `armonioso` |
| square, opposition | `tenso` |
| conjunction | `fusion` |

A conjunction gets its own tone rather than being folded into one of the
others. It is genuinely neither: calling it harmonious would invent a
valence the geometry does not carry.

**Selection is exactly this, stated so it cannot be read two ways.** Walk
the eligible aspects tightest-first. `armonioso` fills `rasgos` (≤3),
`tenso` fills `tensiones` (≤2). A `fusion` trait takes a free `rasgos`
slot if one remains, otherwise a free `tensiones` slot. Stop when both
lists are full; at most 5 traits appear.

An aspect that finds no free slot is dropped — but by construction it was
looser than everything already kept, so this is the intended behaviour,
not a loss. There is no rule that a conjunction always survives.

**`definitorio`** — reuses `chartFeatures()` but takes only the three
*structural* kinds: `cumulo-casa`, `cumulo-signo`, `sin-aspectos`. It is
`null` otherwise, and will be null on many charts. That is intended: a
field that is always populated means nothing.

The other three feature kinds are skipped because the card already shows
them elsewhere — `elemento-ausente` is visible in `afinidad`,
`regente-domicilio` and `aspecto-estrecho` in the planet rows and traits.

**`rareza`** — the existing `signature(chart).oneIn`.

### Known limitation: `oneIn` is the same number for everybody

`signature()` returns a hardcoded `12 * 12 * 12` = **1728 for every chart
ever computed**. It is honest as combinatorial arithmetic and it is not
being changed here, but it is *not* personal, and on a card surrounded by
seven rows of real per-chart data it is the weakest line.

Making it genuinely per-chart is real work and is deliberately out of
scope: sun signs are not uniformly distributed (birth rates vary by
month), and ascendant distribution depends on latitude and hour of birth.
It needs a distribution model and its own validation.

**Do not present 1728 as if it were computed per person.** If the copy
around it ever implies that, it becomes exactly the invented statistic
this product refuses to ship.

### Deliberate exclusion: dignity

Domicile, exile, exaltation and fall are not shown. Domicile is
computable from the existing `RULER` table, but exaltation and fall would
need a new doctrine table, the vocabulary is technical against a register
that just went plain, and "en caída" reads as a verdict — the same
ranking problem decision 2 exists to avoid. `chartRuler().inDomicile`
remains available to the prose layer, where it already feeds
`regente-domicilio`.

---

## The copy layer

### Sparse table, first-class fallback

Full coverage is 42 eligible pairs × 3 tones = **126 entries**, too much
to block a first release on. The table is therefore sparse by design:
a pair/tone with an entry renders its written name and line; anything
missing renders through a fallback that is a designed path, not an error.

The fallback composes **`RELATION_ES`** — the closed set of plain
relation phrases introduced by plan A of the plain-language spec —
against a new `PLANET_DOMAIN` table (Venus → "cómo quieres y qué te
gusta", Marte → "cómo peleas y cómo empiezas"). An unreviewed pair
therefore still reads in sentences the report already speaks, and carries
`nombre: null`; the component falls back to the two planet names as its
heading.

**It must be `RELATION_ES`, not `relationPhrase()`.** `profile.ts` has a
`relationPhrase()` returning "van pegados" / "tiran cada uno para un
lado" / "van de la mano" for the free tier, and plan A adds `RELATION_ES`
for the paid prose — where decision 5 makes it load-bearing for grounding,
not merely copy. If the card introduced a third wording, the same
geometry would be described three different ways on one page. Plan A
should fold `relationPhrase()` into `RELATION_ES` for the same reason;
they are one idea written twice.

**This makes the full card depend on plan A.** See sequencing below —
the free partial card does not, because it carries no traits at all.

Review is incremental and never gates a deploy. Priority order: the 21
pairs among the seven shown planets first (63 entries), then the 21
shown×outer pairs (63 entries).

### `scripts/draft-traits.ts`

Generates candidates offline. Same class as `battery-*.ts`: costs money,
needs the network, **not in `npm test`**. Beyond generating, it must:

1. **Filter before a human reads it**, so review starts from pre-filtered
   copy rather than catching agreement errors by eye across 126 strings.
2. Write to a reviewable file, not directly into `src/copy/`.

### A small validator split is needed first

`validateProse(text, chart, opts)` cannot be used on copy-table entries:
it requires a `NatalChart` these strings are not grounded in, and it
enforces a word range that is meaningless for a three-word trait name.

`countGenderMarks(text)` is already exported and standalone, so gender is
covered. Jargon and cliché are not — `JARGON` and `CLICHES` are private
to `src/validate.ts`. Add one standalone export beside `countGenderMarks`
that checks a string against both lists and returns the problems, with no
chart and no length rule. Both the drafting script and the table test use
it, so drafts are filtered against exactly what the test enforces.

### The committed table is tested

Every entry must pass `countGenderMarks()` and the new jargon/cliché
check.

This is the strongest guarantee in the product: because the table is
frozen, **a gendered trait name cannot reach a buyer at runtime** — no
retry, no gate, no ~50% per-attempt pass rate. It is strictly stronger
than the free tier's runtime gate.

### Class names: epicene or impersonal, never inflected

"El Alquimista" is masculine. Spanish agent nouns mostly inflect, and the
universal rules forbid gendering the reader, so the 12 class names must
be either:

- **epicene agent nouns used without an article** — ALQUIMISTA,
  ESTRATEGA, NÓMADA, CENTINELA, EQUILIBRISTA read identically for any
  reader; or
- **impersonal force/object metaphors** — HOGUERA, CUMBRE, MAREA, ARIETE.

**The set must commit to one register and not mix the two.** Try epicene
agent nouns first, since they are closer to what a "class" is; fall back
to the metaphor set if twelve good ones do not exist. Decide against real
candidates at review time, not in the abstract.

### Forward note: the gender rule may not be permanent

The gender-neutrality constraint is expensive — it drives most free-tier
rejections and roughly one extra retry per delivered reading (Addendum
8), and it is the reason class naming is constrained at all. If the birth
form ever collects gender, most of this constraint disappears.

Two things to know before anyone acts on that:

- **It touches a CLAUDE.md invariant.** The no-PII rule currently permits
  only derived chart data plus an optional sanitized first name. Sending
  gender to a prompt is a change to that invariant and needs its own
  decision, not a drive-by.
- **The copy tables are keyed so the change is additive.** Adding
  optional gendered variants to an entry is a field addition, not a
  restructure. Nothing here needs to be designed for it now.

---

## Rendering

Two components over one struct:

- **`CharacterCardView`** — HTML/CSS, responsive, accessible, selectable,
  can link `RASGOS` into the relevant report section. The on-screen hero.
- **`CharacterCardShare`** — SVG 1080×1920, the 9:16 export, extending
  the proven `ShareCard.tsx` rasterise path.

Both are pure functions of `CharacterCard` and share palette and type
tokens, so they cannot drift on colour or scale.

Rejected: one SVG serving both. A 9:16 portrait is the wrong shape for a
desktop hero, does not reflow, and gives up text selection, screen-reader
quality and in-page links. Also rejected for now: server-side PNG
rendering (satori/Puppeteer), which would solve fonts properly and shares
infrastructure with the planned PDF work — a reasonable later migration,
but it couples this work to an unbuilt item.

### Export: the two things Addendum 13 leaves open

**Fonts must be embedded as subsetted base64 `@font-face` inside the
SVG.** Addendum 13 verified the current export is *not* in Fraunces and
Plex Mono — `XMLSerializer` copies the DOM as-is, and a detached SVG
loaded through a blob URL sees neither the page's custom properties nor
its next/font faces, so the `var()` fallbacks (Georgia, ui-monospace) are
what actually rasterises. A text-heavy card makes that far more visible.

**Subset to the Spanish alphabet, not to observed glyphs.** The card
carries a user-supplied first name, so the subset must cover Latin basic
plus Spanish accents, digits and punctuation (~150 glyphs), not only the
characters present in the fixture charts. Roughly 20–30KB per face.

**Draw the 12 zodiac glyphs as inline SVG paths, not text.** `SIGN_GLYPH`
currently uses U+2648–U+2653 with a U+FE0E variation selector to stop
Apple rendering colour emoji. Those codepoints are almost certainly absent
from Fraunces, so they resolve through a system fallback — meaning
embedding Fraunces would *not* fix them and the export would stay
inconsistent across devices. Twelve paths make the card fully
self-contained and retire the U+FE0E workaround permanently.

**Both components use the same path set**, from one shared module. If
`CharacterCardView` kept the text glyphs and only the export used paths,
the two would render visibly different symbols — the exact drift the
shared-token rule exists to prevent.

**So does the per-section data strip.** Decision 6 of the plain-language
spec specifies its sign glyphs as text with U+FE0E. Left as written, Leo
would render one way in the strip and another in the card, on the same
screen. The paths win and the strip adopts them; that spec has been
amended to say so.

`SIGN_GLYPH` itself stays where it is — other surfaces still use it and
are out of scope here.

**Only sign glyphs, never planetary ones.** The twelve zodiac symbols are
the ones every reader has met on a horoscope page. Planetary glyphs are
a second alphabet nobody has agreed to learn, which is one of the two
reasons decision 7 rejected the astral wheel; the card does not use them
and the strip already does not.

### Gating is a server-side projection

`characterCard()` always computes the full struct. `/api/free` returns a
`freeCard()` projection that **omits** `planetas`, `rasgos`, `tensiones`
and `definitorio`, keeping only their counts so the UI can render
"3 rasgos, 2 tensiones" as locked rows.

Sending the full struct and hiding it in the client would leave the paid
content readable in devtools.

### Mount points

| Surface | State | What it shows |
|---|---|---|
| free reading page | live today | partial card, via `/api/free` |
| `/preview/informe/<chart>` | dev only, exists | full card over battery reports |
| `/informe/<token>` | phase B, blocked | full card, no change needed |

---

## Testing

All in `npm test`, no network, no cost.

`tests/card.test.ts`, over the three battery charts (madrid-1992,
buenosaires-1985, bilbao-2000 — bilbao stays the canary):

- **Provenance.** Each row's `aspectCount` equals the count recomputed
  directly from `chart.aspects`. This is the test that keeps the card
  honest and it is the one to protect in review.
- **Generational exclusion.** No outer-to-outer pair appears in `rasgos`
  or `tensiones`, on any chart.
- **Seven rows.** `planetas` never contains Urano, Neptuno or Plutón.
- **Caps and ordering.** `rasgos` ≤ 3, `tensiones` ≤ 2, at most 5 traits
  total, and the kept traits are the tightest eligible ones the caps
  allow — asserted by comparing against a hand-computed expectation for
  each fixture chart.
- **Fallback.** A pair with no table entry yields a renderable trait with
  `nombre: null` and a non-empty `linea` — asserted directly, since it is
  a designed path rather than an error case.
- **`definitorio` is nullable** and only ever carries the three
  structural kinds.

- **No house numbers reach the struct's rendered fields.** Every
  `CardPlanet.area` and `porDentro.area` is a non-empty
  `AREA_CORTA_ES` phrase, on all three charts.

`tests/copy-tables.test.ts`:

- Every trait, class and `AREA_CORTA_ES` entry passes
  `countGenderMarks()`.
- No entry contains blocklisted jargon or cliché, via the new standalone
  check.
- `AREA_CORTA_ES` covers all twelve houses, with no entry containing a
  digit — the mechanical form of "houses are never numbered".
- Class names all come from one register (no mixing epicene agent nouns
  with impersonal metaphors).

Component tests, jsdom via the `// @vitest-environment jsdom` docblock
per Addendum 13 — **not** `environmentMatchGlobs`, which Vitest 4
removed, and `jsdom` stays a **root** devDependency because Vitest
resolves the environment from the project root:

- `CharacterCardView` renders every block; locked blocks render as locked
  when handed a free projection.
- **No rendered output contains a house number.** Asserted against the
  rendered DOM, not the struct — the struct keeps `house` as an internal
  key and this is the test that stops it leaking.
- **Free projection.** The `/api/free` payload does not contain the
  locked fields at all — absent, not hidden.
- `CharacterCardShare` serialises with its `@font-face` rules present and
  **no external references**, so the canvas stays untainted and `toBlob`
  works.

---

## Risks

**The register may not land with the audience.** Spanish astrology buyers
skew away from RPG players, and no amount of internal reasoning settles
whether a character sheet reads as delightful or as childish to them.
This is the largest open risk in the spec and it is a market question,
not a technical one. It is cheap to test: the card renders from a chart
with no LLM call, so a prototype over the three battery charts costs
nothing to look at, and the free-tier partial reaches real users
immediately.

**Two rendering paths can drift.** Mitigated by shared tokens and by both
components being tested against the same fixtures, but it is a real
maintenance cost accepted knowingly in exchange for a proper responsive
hero.

**126 entries is a lot of copy to review.** Mitigated by the fallback
making review incremental and non-blocking, but the card is visibly
better once the high-priority 63 are written, and that is a real writing
session.
