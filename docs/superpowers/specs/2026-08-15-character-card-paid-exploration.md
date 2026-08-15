# La ficha de pago: qué se exploró y dónde se atascó

**Estado: SIN RESOLVER.** Cinco iteraciones de diseño, cero código. Este
documento existe para que la próxima sesión no repita el camino ni
redescubra los hallazgos. No es un plan y no debe ejecutarse como tal.

Spec original (sigue vigente para la fase 1, ya construida):
`2026-08-13-character-card-design.md`

---

## Por qué se paró

Carlos rechazó las cinco versiones. La objeción de fondo, en sus
palabras: *"esto no es gamificación de la astrología, es más texto encima
del muro de texto que ya tenemos"*, y después *"sigue siendo difícil de
entender a la primera"*.

El usuario objetivo es alguien **que no sabe nada de astrología** y que
compra esto como algo divertido. Tiene que entenderlo **la primera vez
que lo ve**, sin leer.

---

## Las cinco versiones y por qué falló cada una

| # | Qué era | Por qué se cayó |
|---|---|---|
| v1 | Rasgos como nombre + frase (lo que dice el spec) | Es prosa dentro de un marco. Añade muro, no lo quita. |
| v2 | Barras, mapa de 12 casillas, medidores de conexiones | Visualmente denso pero ilegible: cada bloque enseñaba la prueba sin decir de qué era prueba. |
| v3 | Cada bloque con pregunta + respuesta + dibujo | Se entendía, pero volvía a ser texto. |
| v4 | Percentiles contra 8.000 cartas, `?` desplegables | Mejor, pero se cargó bloques sin preguntar y seguía sin lo importante. |
| v5 | Compatibilidad de los doce signos + signo de fricción | Bien recibido, pero se habían borrado secciones otra vez. |
| completa | Los once bloques juntos, sin quitar nada | 2.643 px de alto. Ver el conjunto es lo que dejó claro que el problema es el presupuesto de scroll, no cada bloque. |

**El error de proceso, para no repetirlo:** cada iteración enseñaba *mi
recorte* en vez del conjunto, así que Carlos no podía juzgar qué perdía.
Cuando pidió verlo todo junto, el problema real apareció solo.

---

## Hallazgos que SÍ sirven y no hay que volver a medir

### 1. Los percentiles se pueden calcular y son la clave de la legibilidad

«Agua 12» no significa nada sin astrología. **«Más agua que el 98% de la
gente»** lo entiende cualquiera sin saber siquiera qué es el agua. La
comparación hace el trabajo que intentaba hacer el texto.

Medido: `computeNatalChart` + `elementBalance` tardan **0,57 ms por
carta**, así que 8.000 cartas aleatorias salen en ~4,5 s. Se hornea una
vez a una tabla de constantes y en producción cuesta cero.

Percentiles reales de bilbao-2000 sobre 8.000 cartas:

| Medida | Valor | Supera al |
|---|---|---|
| Agua (proporción) | 0,585 | **98,0%** |
| Tierra (proporción) | 0,049 | 6,6% — notable **por ausencia** |
| Retrógrados | 3 | 56,3% |
| Lazos totales | 14 | 36,4% |
| Orbe más fino | 0,51° | 34,0% |
| Zona más cargada | 3 planetas | 30,0% |

**Solo dos de seis medidas dan titular en esta carta.** De ahí la regla
que sí sobrevive: la ficha mide todo y **titula lo más raro de esa
persona**, igual que `selectFeature()` en la lectura gratuita. Dos cartas
distintas abren con bloques distintos.

Distribución medida de agua (20 cubos, alturas normalizadas a 100):
`[78,50,94,100,89,98,75,63,51,30,26,12,6,4,1,1,0,0,0,0]`
Tierra: `[82,65,87,100,90,84,78,55,42,28,19,12,6,3,1,1,0,0,0,0]`
Mediana de agua: 24,4% de la carta.

### 2. La compatibilidad ya está construida y es lo que Carlos quiere

Esto fue lo mejor recibido de todo. `profile.ts` ya expone, con tests y
sin jerga, desde el rediseño de la lectura gratuita:

- `compatibleSigns(chart)` → los doce signos puntuados 0-40, ordenados,
  cada uno con sus motivos ya escritos en castillano llano
- `topMatches(chart)` → los tres mejores, nunca el de fricción
- `frictionSign(chart)` → el que choca y atrae a la vez, con motivo

Ejemplo real (bilbao-2000): Capricornio 40 *(«es el signo que tienes
justo enfrente»)*, Tauro 32, Aries 20, Sagitario 20, Escorpio 18,
Piscis 18, Géminis 13, Libra 13, Virgo 7, Cáncer/Leo/Acuario 0.
Fricción: **Aries** *(«te lleva la contraria: te atrae y te descoloca a
la vez»)*.

**La interacción que hace que funcione es buscar el signo de tu pareja.**
Por eso hay que listar los doce, no solo el podio: la pregunta que la
gente trae no es «¿con quién encajo?», es «¿y con *este* qué tal?».

**Decisión pendiente:** la lectura gratuita ya enseña los tres mejores.
Si la ficha de pago enseña lo mismo, el comprador paga por lo que ya
tenía. Enseñar los doce + fricción es lo que lo convierte en producto de
pago, pero mueve la línea gratis/pago y esa decisión es de Carlos.

### 3. El lote de 63 textos del spec cubriría menos de la mitad

El spec prioriza los 63 pares «entre los siete planetas que la ficha
enseña». Pero `selectTraits()` coge los aspectos **más cerrados**, y esos
suelen involucrar a Urano, Neptuno o Plutón, que no están entre los
siete.

Medido sobre las tres cartas de la batería: **6 de 14 filas** quedarían
escritas, **8 seguirían en fallback**. En la canaria, 2 de 5.

**Si se retoma la tabla de rasgos, priorizar por frecuencia real** —
generar unos miles de cartas, contar qué pares salen de verdad, y
escribir esos primero. El orden del spec es una división administrativa
que nadie contrastó contra una carta real.

### 4. «1 de 1728» hay que retirarlo

Es 12×12×12 y devuelve lo mismo para toda persona que haya existido.
El Addendum 14 ya lo marcó como la línea más débil de la ficha. Con el
motor de percentiles de arriba, la rareza se puede calcular de verdad.

### 5. «Retrógrado» está permitido en la ficha

Carlos lo autorizó explícitamente. **Consecuencia técnica:**
`copyProblems()` tiene «retrógrado» en su lista de jerga y rechazaría la
copia de la ficha, así que hace falta una excepción explícita en el test
de la tabla. Una línea, pero hay que decidirla a propósito.

### 6. Las zonas nunca se numeran

El mapa de 12 casillas numeradas fue el bloque menos entendido. Las zonas
**ya tienen nombre escrito** en `AREA_CORTA_ES` («el dinero y lo tuyo»,
«lo que llevas a solas»). Enseñar el nombre y los planetas que caen ahí
se entiende sin explicación, y de paso desaparece el conflicto con la
decisión 1 del spec llano.

---

## Los once bloques, con veredicto

| # | Bloque | Veredicto |
|---|---|---|
| 01 | Eres agua (percentil) | **fuerte** |
| 02 | Casi nada de tierra (percentil por ausencia) | **fuerte** |
| 03 | Los cuatro elementos en crudo | solapa con 01 y 02 |
| 04 | Arranca / mantiene / se adapta | sirve; falta medir si casi todo el mundo sale igual |
| 05 | Se te junta todo aquí | **floja** — tener 3 en una zona le pasa a la mitad de la gente |
| 06 | Qué parte de ti trabaja más | **floja** — cuatro planetas empatados a 4, no señala a nadie |
| 07 | 3 a favor, 2 en contra | a medias — las cinco parejas sirven, el marcador no |
| 08 | Encajas con… (podio) | **fuerte** |
| 09 | Busca el suyo (los doce) | **fuerte** — lo único interactivo |
| 10 | Te descoloca (fricción) | **fuerte** |
| 11 | Tu carta en números | **floja** — honesto pero opaco para quien empieza |

**Los once juntos miden 2.643 px**, ~3,3 pantallas de móvil antes de que
empiece el informe. El problema no es qué bloque es malo: es **cuánto
scroll se lleva la portada**. Esa es la pregunta a resolver primero.

---

## Qué está construido ya (no rehacer)

- `selectTraits(chart)` — algoritmo completo de selección de rasgos y
  tensiones, topes, filtro de pares generacionales, mapeo de tono
- `freeCard(chart)` — la proyección gratuita
- `CLASS_ES`, `AREA_CORTA_ES`, `copyProblems()`
- `CharacterCard.tsx`, `CharacterCardShare.tsx` (export 1080×1920)
- `RELATION_ES` — construido en el plan A, y desde 2026-08-15 la **única**
  redacción de la geometría: `relationPhrase()` fue absorbida
- `compatibleSigns()`, `topMatches()`, `frictionSign()`, `elementBalance()`,
  `modalityBalance()`, `chartFeatures()`

## Qué faltaría, sea cual sea el diseño final

- `characterCard(chart)` — la proyección de pago
- El motor de percentiles + su tabla de constantes horneada
- `PLANET_DOMAIN` si se conserva el fallback de rasgos
- Las filas de pago en `CharacterCard.tsx`
- Un mapa de cartas de prueba en la ruta de preview: hoy
  `/preview/informe/<chart>` lee un `.md` y **no tiene carta**, por eso su
  tarjeta actual es un marcador fijo Leo/Cáncer/Cáncer que no coincide con
  el informe de debajo. Debe leer los datos de nacimiento de
  `scripts/battery-sections.ts:42-47`, no repetirlos.

---

## Por dónde empezaría la próxima sesión

1. **Fijar el presupuesto de scroll de la portada** antes de discutir
   bloques. Todo lo demás se deduce de ahí.
2. Con ese número, elegir entre los cuatro **fuertes** (01, 02, 09, 10) y
   decidir si 04 y 07 caben.
3. Resolver la línea gratis/pago de la compatibilidad.
4. Enmendar `2026-08-13-character-card-design.md`: el spec describe una
   ficha de prosa que ya se ha descartado, y no contiene ni los
   percentiles, ni la regla de «titular lo más raro», ni la
   compatibilidad, ni la retirada de `oneIn`.
5. Solo entonces, escribir el plan.

**No escribir el plan antes de que Carlos apruebe un diseño.** Esta
sesión gastó cinco iteraciones por saltarse ese orden.

## Maquetas de esta sesión

Todas con datos reales de bilbao-2000, para mirar, no para copiar:

- v1, tres niveles de copy — `https://claude.ai/code/artifact/8ccd4a27-8f06-4355-8b65-4bc818479797`
- v2, hoja de stats — `https://claude.ai/code/artifact/ce8576c6-c812-41fe-bda6-795741b0acc0`
- v3, pregunta + respuesta — `https://claude.ai/code/artifact/54e22784-3a1c-4d7c-bd5c-509ed219f15e`
- v4, percentiles y `?` — `https://claude.ai/code/artifact/5b879022-77b2-4851-9fce-4dbca1500249`
- v5, compatibilidad — `https://claude.ai/code/artifact/28711402-437f-4d35-b1cb-cbea7f473eb2`
- completa, los once — `https://claude.ai/code/artifact/82f0b7ea-c724-4d44-9664-efce88e0281a`
