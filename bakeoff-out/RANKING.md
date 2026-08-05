# Bake-off blind ranking — committed BEFORE opening KEY.json

> UNBLINDED AFTERWARDS: A = mistralai/mistral-small-2603,
> B = moonshotai/kimi-k3 (GANADOR), C = anthropic/claude-haiku-4.5,
> D = z-ai/glm-5.2, E = deepseek/deepseek-v4-pro (segundo).

Scored per prompts/rubric.md (naturalidad ×3, anclaje ×3, anti-Barnum ×2,
efecto "¿cómo lo sabe?" ×2, estructura ×1; total /55). Anclaje checked by
tracing claims against each chart's TRUTH.txt.

## Final ranking

| Letra | Total | Veredicto |
|---|---|---|
| **B** | **54** | **Ganador** |
| E | 49.5 | Segundo |
| D | 46 | DESCARTADO (criterio 2 en madrid) |
| C | 38.5 | Cuarto |
| A | 33 | DESCARTADO (criterio 2 en madrid) |

## Per-model notes

### B — 54 (naturalidad 5, anclaje 5, barnum 4.5, wow 5, estructura 5)
Every single claim verified across all three charts, including hard
negative-space insights: the Bilbao Moon receives no aspects ("una Luna
isla") — true and brilliant; Venus conjunct MC in Buenos Aires (1.3°,
not in the aspect list, correctly derived). Spanish is flawless and
idiomatic ("planta de reciclaje emocional", "el trono y la chimenea",
"sin cauce, el agua inunda; con cauce, riega"). Word counts in range
after retry. CAVEAT: reasoning model — returned empty at max_tokens
6000 on all three charts; needs a ~24000 token budget. Its one metered
call cost $0.216 (≈2% of a €9.90 sale — acceptable).

### E — 49.5 (naturalidad 4.5, anclaje 5, barnum 4.5, wow 4.5, estructura 3)
Fully grounded on all three charts; correctly converts decimal degrees
to minutes most of the time, spotted the anaretic Saturn at 29° Taurus.
Warm tarotista voice closest to the product's target register. Failures
are structural, not substantive: dropped the first `##` heading on
madrid (parser reject), and ran long (2843/2916 words vs 2000–2500).

### D — 46, DESCARTADO (naturalidad 4.5, anclaje 2 peor carta, barnum 4.5, wow 4, estructura 3.5)
Buenos Aires and Bilbao reports are spotless and degree-precise, but the
madrid report invents two aspects: "Sol y Luna... casi en oposición
perfecta" (real separation ≈156°, no listed aspect) and "Marte forma
sextiles con Urano, Neptuno y Plutón" (Mars–Pluto sextile does not
exist). Rubric: one invented position caps criterion 2 at 2 → discard.
1-in-3 charts with invented data is disqualifying for a paid product.

### C — 38.5 (naturalidad 3, anclaje 4.5, barnum 3.5, wow 3.5, estructura 2)
No invented placements, but leaks English sign names in Spanish text on
all three charts ("Aquarius", "Scorpio", "Uranus", "Taurus"), typos
("sofocán", "rumiabas"), and used `#` for the first heading on all
three (parser reject). Calls a 5.2° conjunction "exacta".

### A — 33, DESCARTADO (naturalidad 3, anclaje 2, barnum 4, wow 3, estructura 4)
Madrid report invents a Sun–Mercury conjunction ("a solo tres décimas
de grado de tu Sol" — they are 25° apart; it misread Mercury's 0.3°
degree-in-sign as an orb) and misplaces planets ("tus planetas en las
casas dos, seis y diez — Venus, Marte, Júpiter y Saturno" — three of
four wrong). Also systematically reads decimals as minutes ("cero
grados y ochenta y un minutos"), gibberish token ("Butaca en la
oposición"), English leakage ("Pisces", "trine").

## Production notes (independent of ranking)

- Empty-content failures in the original run (B ×3, D ×1, E ×1) were
  reasoning-token exhaustion at max_tokens 6000. Any reasoning model in
  production needs a much larger budget or reasoning disabled/capped.
- parseReport should tolerate `#` vs `##` on the first heading, or the
  retry-once policy will eat real money on cosmetic failures (C lost
  3/3, E 1/3 to this).
