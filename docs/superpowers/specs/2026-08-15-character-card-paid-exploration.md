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

## Por dónde empieza la próxima sesión

**Decidido 2026-08-15: la ficha va ANTES que el plan 2.** No se construye
el cobro hasta saber qué se está vendiendo (Addendum 19).

El punto de partida cambia respecto a lo que decía este documento cuando
se escribió. La pregunta ya no es «cuáles de mis once bloques
sobreviven», porque ese marco produjo cinco rechazos seguidos. Es:

1. **¿Qué haría que alguien que no sabe nada de astrología hiciera una
   captura y se la mandara a un amigo?** Diseñar desde ahí hacia atrás.
   La ficha es la superficie de conversión y la viral (Addendum 19), no
   un resumen fiel de la carta.
2. **Aplicar la regla de los nombres de planeta** (Addendum 19): los
   signos son vocabulario común, los planetas no. Todo bloque rechazado
   en esta sesión empieza por un planeta; todo bloque aceptado empieza
   por un signo o una palabra corriente.
3. **Fijar el presupuesto de scroll de la portada.** Los once bloques
   juntos son 2.643 px. Con ese número, elegir.
4. Resolver la línea gratis/pago de la compatibilidad — que con el
   Addendum 19 es una decisión de precio, no de interfaz.
5. Enmendar `2026-08-13-character-card-design.md`: describe una ficha de
   prosa ya descartada, y no contiene ni los percentiles, ni la regla de
   «titular lo más raro», ni la compatibilidad, ni la retirada de
   `oneIn`, ni la regla de los nombres de planeta.
6. Solo entonces, escribir el plan.

**No escribir el plan antes de que Carlos apruebe un diseño**, y
**enseñar siempre la ficha entera**, nunca un recorte. Esta sesión gastó
cinco iteraciones por saltarse esas dos cosas.

## Maquetas de esta sesión

Todas con datos reales de bilbao-2000, para mirar, no para copiar:

- v1, tres niveles de copy — `https://claude.ai/code/artifact/8ccd4a27-8f06-4355-8b65-4bc818479797`
- v2, hoja de stats — `https://claude.ai/code/artifact/ce8576c6-c812-41fe-bda6-795741b0acc0`
- v3, pregunta + respuesta — `https://claude.ai/code/artifact/54e22784-3a1c-4d7c-bd5c-509ed219f15e`
- v4, percentiles y `?` — `https://claude.ai/code/artifact/5b879022-77b2-4851-9fce-4dbca1500249`
- v5, compatibilidad — `https://claude.ai/code/artifact/28711402-437f-4d35-b1cb-cbea7f473eb2`
- completa, los once — `https://claude.ai/code/artifact/82f0b7ea-c724-4d44-9664-efce88e0281a`

---

## EL CONCEPTO (Carlos, 2026-08-15, al cierre de la sesión)

Esto llegó después de todo lo anterior y **sustituye a la pregunta de
partida**. Empezar por aquí.

> El objetivo de la ficha es traducir la matemática astrológica a
> conceptos de videojuego con tanta precisión y tanta gracia que la gente
> se sienta **expuesta, validada, y con ganas de compartirlo
> inmediatamente**.
>
> En vez de leer *«Tengo Mercurio en Leo y Luna en Cáncer»* — que no le
> dice nada a sus amigos no astrólogos — leen: *«Mi personaje usa
> monólogos dramáticos para comunicarse, se cura llorando en su cuarto, y
> su punto débil es pagar impuestos.»*
>
> Sus amigos lo entienden al instante, se ríen, están de acuerdo, y
> quieren generar su propia ficha para ver cuáles son sus **Buffs** y sus
> **Bugs**. Es el *roast* y el *praise* hiperpersonalizado. La gente
> comparte lo que le hace decir **«esto da miedo de lo preciso que es»**.

### Por qué esto resuelve el problema de toda la sesión

El bloqueo era que los nombres de planeta son jerga (Addendum 19). Este
concepto **no los esquiva: los elimina de la superficie**. No se enseña
el planeta, se enseña *lo que hace* el planeta, como mecánica de juego.

**El planeta es la ranura. El signo es el sabor.**

| Astrología | Ranura | Carta real de bilbao-2000 |
|---|---|---|
| Mercurio | cómo **habla** tu personaje | en Cáncer → habla en indirectas y silencios con intención |
| Luna | cómo se **cura** | en Cáncer → se cura llorando en su cuarto |
| Marte | cómo **ataca** | en Cáncer → ataca de lado, nunca de frente |
| Venus | cómo **liga** | en Leo → liga montando un espectáculo |
| Sol | quién **es** al descubierto | en Leo → clase ARTISTA |
| Júpiter | dónde tiene **suerte** | en Géminis → se le da bien caer bien hablando |
| Saturno | qué le **cuesta** | en Tauro → soltar lo que ya tiene |
| Tierra al 4,9% (p6,6) | **punto débil** | pagar impuestos, montar muebles, cuadrar cuentas |
| Trígonos y sextiles | **BUFFS** | Marte + Saturno → termina lo que empieza |
| Cuadraturas y oposiciones | **BUGS** | Venus + Urano → se enamora de quien no se deja atrapar |

El ejemplo de Carlos —«se cura llorando en su cuarto»— es literalmente lo
que debería producir la Luna en Cáncer de bilbao. El mapeo no es forzado:
es el significado astrológico de verdad, contado como juego.

### Todos los datos ya existen

Posiciones, `elementBalance`, el reparto armonioso/tenso de
`selectTraits()`, y los percentiles medidos hoy. **No hay nada nuevo que
calcular: esto es un problema de copia, no de ingeniería.**

### Tres cosas que decidir antes de escribir 84 chistes

1. **Fuera Urano, Neptuno y Plutón de las ranuras.** Están en un signo
   entre 7 y 20 años, así que «tu personaje» diría el mismo chiste a
   todos los nacidos en la misma década — lo contrario de
   hiperpersonalizado. Solo aparecen en buffs y bugs, emparejados con un
   planeta personal. **Siete ranuras, no diez.** (Es la misma regla que
   ya justifica las siete filas del spec original.)

2. **El presupuesto de copia es ~84 líneas** (7 planetas × 12 signos),
   más las de punto débil por elemento y las de buff/bug. Cada una es un
   chiste que tiene que funcionar. Ese es el coste real del producto, y
   es de escritura, no de código. Comparar con el lote de rasgos del spec
   original: aquel eran 126 entradas de pares, mucho menos rentables por
   línea que estas 84, que son autónomas y cada una da titular.

3. **El roast necesita una regla.** «Su punto débil es pagar impuestos»
   es cariñoso; la misma mecánica se vuelve cruel enseguida, y un
   producto de pago que hace sentir mal no se comparte. Propuesta: **se
   ataca la conducta, nunca a la persona**, y toda línea pasa por
   `copyProblems()` y `countGenderMarks()` como el resto de las tablas.
   Ojo: la regla de género epicena aprieta mucho el humor en castellano y
   hay que probarlo antes de dar por hecho que se puede.

### Lo que esto deja obsoleto de este mismo documento

Los once bloques de más arriba, el presupuesto de scroll y el veredicto
por bloque siguen siendo información útil **sobre datos**, pero el marco
ya no es «qué bloques enseño». Es «qué ranuras tiene el personaje». Los
percentiles y la compatibilidad sobreviven porque encajan solos: la
rareza es *«solo el 2% tiene esta build»* y la compatibilidad es *«contra
qué clases juegas bien»*.
