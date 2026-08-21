# Clay — design canvas source

These are the **source** files for the Clay design canvas. They are not
built or imported by the app; nothing in `web/` reads them. They exist so
the canvas can be regenerated and re-published without reconstructing it
by hand.

The canvas itself is a published Artifact. Its URL is the thing to share;
these files are what it is seeded from.

## What each file is

Every `.dc.html` is one **artboard** — a Design Component, rendered in its
own sandboxed iframe on a shared pan/zoom canvas. `canvas.json` is the
layout manifest: artboard positions, the sticky notes, and the four pages.

| Page | Artboards |
|---|---|
| Sistema | `Sistema` — tokens, type scale, object vocabulary, the six rules |
| La app | `Entrada` (landing + form), `Gratis` (free reading), `Informe` (paid report), `Entrega` (post-payment `/informe/<token>`), `Firma` (report share card), `Bloques` (the card), `Compartir` (1080×1920 share render) |
| Estados | `Espera` (loading), `Errores` (error states), `Vacios` (empty/edge cases) |
| La carta | `Main` (A · Pegatina), `Consola` (C), `Crepusculo` (D), `Bronce` (E) — the rejected card directions, kept for the record |

`Bloques` is the direction that was chosen. The four on *La carta* are the
alternatives it was picked over; they are kept because the reasoning for
rejecting them is on the sticky notes beside them.

## Regenerating and re-publishing

The seeded output is a ~2.3 MB HTML file with the canvas editor baked in.
It is a **build artifact** and is deliberately gitignored — regenerate it
rather than committing it.

Seeding needs the `design` skill's helper, which ships with the skill and
is not vendored here. Invoke `/design` to get its base directory, then:

```
node "<skill base>/seed-canvas.mjs" \
  --template "<skill base>/payload.template.html" \
  --out astrocard-directions.html \
  --title "Destiny Reports en Clay" \
  --artboard Sistema.dc.html --artboard Entrada.dc.html \
  --artboard Gratis.dc.html --artboard Informe.dc.html \
  --artboard Entrega.dc.html --artboard Firma.dc.html \
  --artboard Espera.dc.html --artboard Errores.dc.html \
  --artboard Vacios.dc.html --artboard Bloques.dc.html \
  --artboard Compartir.dc.html --artboard Main.dc.html \
  --artboard Consola.dc.html --artboard Crepusculo.dc.html \
  --artboard Bronce.dc.html \
  --canvas canvas.json
```

Then publish the output, passing the **existing artifact URL** so it
updates in place instead of creating a second canvas.

If someone has edited the canvas in the browser since these files were
written, their version is newer — read it back with the helper's
`--extract` before editing, or their work is overwritten.

## Read this before treating the canvas as a spec

**The canvas shows more than what shipped.** The Clay reskin
(`docs/superpowers/plans/2026-08-21-clay-reskin.md`, merged 2026-08-22)
was **appearance only**. These artboards additionally show content
changes that are still unbuilt and still need a spec amendment:

- percentiles in place of the raw `Agua 10 / 20,5` fractions
- a permanent *realce* block, rather than one that only appears when an
  aspect bucket is empty
- three aspect cubes (`A favor` / `En contra` / `Viene en el mismo
  paquete`) instead of two
- no `Bloqueado:` rows inside the shareable area
- the fold and the 1080×1920 share render as separate compositions

The chart data on the artboards is real — computed from the engine for
`bilbao-2000` (Sol en Leo, Ascendente en Piscis) and `madrid-1992`. The
*A favor* / *En contra* lines are drafts: those copy tables do not exist
yet.

Placeholders left unfilled on purpose: `[PRECIO]`, `[TU CORREO]`,
`[TU DOMINIO]`.
