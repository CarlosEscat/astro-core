# El informe de pago deja de ser un documento técnico

Fecha: 2026-08-10
Estado: aprobado, pendiente de plan de implementación

Sustituye a `2026-08-10-paid-love-section-design.md`, que quedó obsoleto
en su decisión 1 (paridad de forma pero NO de registro). Aquel spec
resolvía la sección de amor sola; este cambia el registro de las ocho y
absorbe aquel como caso particular.

**Enmendado el 2026-08-13** al aprobarse
`2026-08-13-character-card-design.md`, que añade una ficha de personaje
calculada como primera pantalla del informe. Las decisiones 4, 6, 7, 8 y
10 llevan la enmienda marcada en su sitio. Ninguna se revierte: la ficha
es este mismo principio — *separar el dato de la frase* — llevado al
extremo, una superficie que no escribe nada y por tanto no puede
equivocarse en nada.

## Problema

El informe de pago está escrito para alguien que ya sabe astrología, y
lo compra alguien que no.

Prosa entregada, bilbao-2000, sección 4:

> "tienes a Venus en Leo en la casa tres, a veinte grados, en oposición
> exacta a Urano en Acuario en la casa nueve"

Una frase, cinco datos que la lectora no sabe interpretar: qué es una
casa, qué es la casa **tres** en concreto, qué significa que dos planetas
estén "en oposición", qué son veinte grados y por qué importan. La
lectura gratuita tiene prohibidas esas cinco palabras precisamente porque
su lectora *"no sabe nada de astrología y no tiene por qué aprender: si
se lo sueltas, cierra la página"* (`prompts/system-free.md`). El informe
de pago se lo suelta durante 3.000 palabras.

La precisión no sobra — es el producto. Lo que falla es dónde vive: hoy
va incrustada en la prosa, donde estorba la lectura y además no se puede
comprobar. La decisión de fondo de este documento es **separar el dato de
la frase**: la prosa explica, una tira de datos por sección enseña, y el
lector puede mirar de una a otra.

## Decisiones tomadas

### 1. Registro: paridad con la lectura gratuita

En la prosa del informe solo sobreviven **planetas y signos** — *"las dos
únicas palabras que todo el mundo reconoce"*. Salen los grados, los
orbes, los nombres de aspecto, "retrógrado" y la numeración de casas. Las
casas se nombran por zona de la vida (`AREA_ES`), nunca por número.

Es literalmente la regla de `prompts/system-free.md`, ya probada en
producción durante tres baterías.

Descartado, en los dos extremos: mantener números de casa en prosa (son
la jerga que la lectura gratuita prohíbe con más énfasis: *"ni la casa
uno, ni la casa siete, ni ninguna otra"*), y quitar también planetas y
signos (mata el momento "¿cómo lo sabe?" y además deja ciega la
comprobación de signo falso, decisión 5).

### 2. `{{RULES_CHART}}` sale del prompt del informe

Ese fragmento existe para enseñar vocabulario técnico: cómo usar bien
"conjunción", "trígono", "retrógrado". Un prompt no puede recibirlo a la
vez que una lista de palabras prohibidas — el Addendum 8 documenta
exactamente ese error en el prompt gratuito y por qué se dividió el
fragmento.

Tras este cambio, `{{RULES_CHART}}` solo lo usa el teaser.

### 3. El dato llega ya traducido al modelo

`buildSectionMessages` deja de entregar JSON crudo. Entrega:

- planetas con signo y **zona de la vida**, nunca casa numerada;
- las relaciones que la sección tiene asignadas, ya redactadas como frase
  llana (decisión 4);
- **ni grados ni orbes.**

Es el principio rector del Addendum 6 aplicado al tier de pago: *no puede
escribir una jerga que nunca recibe, ni equivocarse en un orbe que nunca
ve*. `AREA_ES` ya lleva ese contrato escrito en su cabecera — *"la ÚNICA
forma en que la información de casa puede llegar a un prompt"* — y hasta
hoy el informe de pago era la excepción.

Esto no debilita el grounding: lo refuerza. La retrogradación inventada
del Addendum 12 y el orbe de 1,29° llamado "exacto" son errores que el
modelo no puede volver a cometer si nunca recibe la retrogradación ni el
orbe.

### 4. `RELATION_ES`: un conjunto cerrado de frases llanas

La lectura gratuita ya traduce las relaciones ("van de la mano", "tiran
cada uno para un lado", "va pegado a"). Ese vocabulario pasa a ser una
tabla explícita, `RELATION_ES`, con la misma forma que `ASPECT_ES`.

Es la pieza que mantiene comprobable el grounding (decisión 5). Como las
frases las escribimos nosotros, son tan detectables por regex como lo son
hoy "conjunción" u "oposición". Sin esta tabla, la prosa llana podría
afirmar que dos planetas chocan sin que nada lo verificara — que es la
misma clase de defecto que el Addendum 12 encontró ya entregado.

**Enmienda 2026-08-13 — `RELATION_ES` absorbe a `relationPhrase()`.**
`profile.ts` ya tiene un `relationPhrase()` que devuelve "van pegados" /
"tiran cada uno para un lado" / "van de la mano" para la lectura
gratuita. Son la misma idea escrita dos veces, y con la ficha de personaje
entrando en la misma pantalla serían tres formas de decir la misma
geometría. `RELATION_ES` pasa a ser la tabla única; `relationPhrase()`
se reescribe como una lectura de ella o desaparece.

La ficha de personaje consume `RELATION_ES` para su respaldo de rasgos
sin entrada revisada. Eso hace que **la ficha completa dependa de este
plan A**; la parcial de la lectura gratuita no, porque no lleva rasgos.

### 5. Qué le pasa a `groundingProblems()`

| Comprobación | Se apoya en | Después |
|---|---|---|
| Signo falso | "tu Venus en Leo" | **Intacta** — planetas y signos siguen en prosa |
| Retrogradación inventada | la palabra "retrógrado" | **Pasa a ser alarma de regla**: la palabra está prohibida, así que aparecer ya es la infracción |
| Aspecto ausente | "conjunción", "oposición"… | **Se reescribe contra `RELATION_ES`**: mismo algoritmo, otro vocabulario |

El algoritmo del tercer punto no cambia — una frase que nombra
exactamente dos planetas y una relación tiene que corresponder a una
relación real entre ellos. Solo cambia la lista de palabras que la
disparan.

**`fatal` no crece.** Sigue siendo vacío o truncado. El Addendum 12 midió
lo que cuesta escalar por algo que no es un error de hecho: 317-603 s y
$0,08 por sección, más lento y más caro que la llamada única que
sustituía.

### 6. La tira de datos, dentro de cada sección

Elegida sobre mockups con datos reales frente a un panel único al
principio y frente a marcadores + apéndice final.

Contiene solo lo que esa sección trata — `allocate.ts` ya decide qué
aspectos posee cada una, así que el reparto está hecho — y muestra:
planeta, glifo, signo, grado, la zona de la vida en palabras, y la
relación con su orbe.

Motivo de la elección: el momento de comprobar ocurre **junto a la
afirmación**. Un panel al principio deja al lector a 3.000 palabras de
distancia de la tabla cuando llega a la sección cinco. Coste aceptado:
ocupa alto vertical ocho veces.

**La tira va glosada, no solo maquetada.** Una tabla que diga "Venus ♌
20° casa 3" traslada la jerga en vez de quitarla; con "cómo hablas,
escribes y te mueves por tu barrio" al lado, informa.

**Tres de las ocho secciones no tienen aspectos asignados.** En
bilbao-2000, `allocateFeatures` deja vacías la 0 (`Tu retrato esencial`),
la 3 (`La puerta por la que entras al mundo`) y la 7 (`Claves para tu
camino`), por diseño de `CLAIMS`. Regla, entonces:

- las posiciones se muestran siempre que la sección hable de alguna
  (la 0 y la 3 tienen Sol, Luna y Ascendente: sí llevan tira);
- las relaciones solo aparecen si la sección las tiene asignadas;
- la 7 es síntesis y no introduce datos propios: **no lleva tira**.

Dicho de otro modo: `strip` es opcional, y cuando existe cualquiera de
sus dos listas puede venir vacía. Una sección sin nada que enseñar no
recibe `strip` en absoluto — nadie renderiza una caja vacía.

**Enmienda 2026-08-13 — los glifos van dibujados, no escritos.** Este
spec pedía el glifo del signo como texto con U+FE0E. La ficha de
personaje los dibuja como trazados SVG en línea, porque su exportación a
PNG no puede depender de una fuente de sistema (Addendum 13: el PNG
actual no sale ni en Fraunces ni en Plex). Si la tira conserva el texto y
la ficha usa trazados, Leo se dibuja de dos formas distintas en la misma
pantalla.

**La tira adopta los trazados.** Salen de un módulo compartido, y con
ello el apaño de U+FE0E desaparece de las dos superficies. Nada más de la
tira cambia.

### 7. Sin rueda astral

Descartada tras dibujarla con la geometría real de bilbao-2000.

Es un buen instrumento de **credibilidad** y uno malo de **comprensión**,
y lo que se pide aquí es comprensión: no responde a ninguna pregunta que
tenga la lectora, los glifos planetarios son un segundo alfabeto que hay
que aprender antes de que la rueda diga nada, y los números de casa del
1 al 12 son justo la jerga que la decisión 1 elimina.

Anotado como posible adorno posterior, nunca como el dispositivo que hace
entendible el informe.

**Enmienda 2026-08-13 — por qué la ficha de personaje no contradice
esto.** Se aprueba una ficha calculada como primera pantalla del informe,
y a primera vista parece justo lo que este apartado descarta. No lo es, y
conviene dejar escrita la diferencia antes de que alguien la lea como una
incoherencia.

La rueda se descartó por tres motivos concretos. La ficha no incurre en
ninguno:

| Motivo contra la rueda | La ficha |
|---|---|
| Exige **glifos planetarios**, un segundo alfabeto | Usa solo los **doce glifos de signo**, los que cualquiera ha visto en un horóscopo. Ningún glifo planetario, igual que la tira |
| Muestra **casas del 1 al 12**, la jerga que elimina la decisión 1 | No numera ninguna casa: zona de la vida en palabras, vía `AREA_CORTA_ES` |
| **No responde a ninguna pregunta** que traiga la lectora | Responde a la primera: quién soy yo aquí — clase, cómo se te ve, cómo eres por dentro, de qué estás hecho |

Lo que sigue descartado es la rueda: el instrumento que exige aprender un
alfabeto antes de decir nada.

### 8. La sección de amor conserva su forma propia

Del spec sustituido sobreviven, ya sin la tensión de registro que las
complicaba:

- **Gancho capturable** como primera frase, extraído con `firstSentence()`
  (`src/report.ts:241`, que se exporta) y presentado en tarjeta. Se retira
  del cuerpo: no puede verse dos veces.
- **Sin marca de agua.** La gratuita lleva `· tu lectura` porque su
  trabajo es circular en capturas; el comprador ya ha pagado. La pieza
  compartible del informe es la tarjeta 9:16 — que a partir del
  2026-08-13 **es la exportación de la ficha de personaje**, no la
  `ShareCard` de Sol/Luna/Ascendente. Misma ranura, misma ruta de
  rasterizado, más contenido.
- **Lista de compatibilidad** al cerrar la sección, tras la prosa.
- **El gancho está exento de nombrar su dato** y es **advisorio, nunca
  `fatal`**. Con la decisión 1 la exención casi desaparece: en registro
  llano el gancho ya no puede citar un grado aunque quiera.

### 9. El informe se lee solo

Se elimina del brief la premisa de que la lectura gratuita ya entregó
Venus, Descendente y signos compatibles. Deja de ser cierta para quien
llega por un enlace compartido, para quien abre el PDF medio año después
y para quien ve la lista impresa dentro del propio informe.

### 10. La sección no se distingue por su título

```ts
// Match ya existe en web/src/components/types.ts
export interface ReportSection {
  title: string;
  /** Prosa YA SIN el gancho: quien decora la sección lo retira de aquí. */
  body: string;
  /** Datos que ilustran ESTA sección. */
  strip?: { placements: StripPlacement[]; relations: StripRelation[] };
  hook?: string;
  matches?: { matches: Match[]; friction: Match };
}

export interface StripPlacement {
  // `planet`, no `body`: en la carta el campo se llama `body`, pero aquí
  // conviviría con `ReportSection.body`, que es la prosa. Dos cosas
  // distintas con el mismo nombre en la misma pantalla es una trampa.
  planet: string;        // "Venus"
  // Enmienda 2026-08-13: era `glyph: string` con U+FE0E. Ahora es la
  // CLAVE del trazado compartido, que ambas superficies dibujan igual.
  // Sigue siendo glifo de SIGNO: no hace falta un mapa de glifos
  // planetarios, no existe y la tira no lo usa.
  glyphKey: Sign;        // "Leo" -> trazado SVG del módulo compartido
  sign: string;          // "Leo"
  degree: number;        // signDegree (20.6), NUNCA la longitud absoluta
  area: string;          // AREA_ES[3]
  retrograde: boolean;
}
export interface StripRelation {
  a: string; b: string;  // "Venus", "Urano"
  phrase: string;        // RELATION_ES: "enfrentados"
  orb: number;           // 1.29
  hard: boolean;         // cobre si tira, latón si acompaña
}
```

**Enmienda 2026-08-13 — `ReportView` recibe además una ficha opcional.**
La ficha de personaje no es de una sección: es del informe entero. Entra
como propiedad de nivel superior, hermana de las secciones, no dentro de
`ReportSection`:

```ts
export interface ReportViewProps {
  sections: ReportSection[];
  /** Ficha de personaje. Ausente en la ruta de preview sin carta y
   *  mientras el informe se genera. Se renderiza si está. */
  card?: CharacterCard;
}
```

Es exactamente la misma regla que ya rige abajo — se renderiza si el
campo está, sin preguntar por título ni por índice — aplicada un nivel
más arriba.

`ReportView` **no ramifica por título ni por índice**: solo mira si los
campos están. Quien decide qué sección se decora es el llamante, y lo
hace por índice, como `SECTION_BRIEFS` desde plan 1. Ramificar por
`title === "Amor y vínculos"` se rompería en cuanto alguien reformulara
un título, y los títulos son copia de producto.

`ReportView` sigue siendo pura — sin fetch, sin APIs de navegador — para
que sirva a la ruta de preview, a la de entrega, al estado progresivo y a
Puppeteer.

### 11. Dos extracciones para que las capas no diverjan

La copia de compatibilidad se ensambla hoy dentro de
`web/src/app/api/chart/route.ts:50`. Pasa a `matchesFor(chart)`
compartida. La tarjeta del gancho vive dentro de `LoveHook.tsx`, acoplada
a la prosa; pasa a `HookCard({ quote, mark? })`.

## Flujo de datos

```
carta guardada ─┬─ allocateFeatures ──> relaciones de la sección
                │        │
                │        ├─ RELATION_ES ──> frase llana ──┐
                │        └─ orbe, grados ────────────┐    │
                ├─ AREA_ES ──> zona de la vida       │    │
                │                                    │    ├──> prompt
                │                                    │    │    (sin grados,
                │                                    │    │     sin orbes,
                │                                    │    │     sin casas)
                │                                    v    v
                └─ matchesFor ──────────────> tira de datos ──> ReportView
```

El prompt y la tira beben de la misma fuente y muestran **cosas
distintas a propósito**: el prompt recibe la relación en palabras y sin
número; la tira enseña el número que el modelo nunca vio.

## Orden de ejecución: tres planes

**Plan A — el registro.** Ocho briefs, `{{RULES_CHART}}` fuera,
`RELATION_ES`, `buildSectionMessages` traducido, `groundingProblems`
reescrito. Termina ejecutando `scripts/battery-sections.ts`.

**Plan B — la presentación.** Tira de datos, `HookCard`, `matchesFor`,
`ReportSection` decorado, sección de amor, trazados de glifos. Sin LLM,
sin proveedores, sin red.

**Plan C — la ficha de personaje** (2026-08-13, spec propio). Consume
`RELATION_ES` del plan A y los trazados de glifos del plan B, así que va
detrás de los dos.

**A va antes que B, y el orden importa.** El riesgo real de todo este
documento es de calidad de prosa, y solo la batería lo mide. Construir la
UI primero sería construir sobre una suposición no verificada — el mismo
argumento que puso el plan 1 antes que el resto del informe de pago
(Addendum 11).

**La mitad gratuita de la ficha no espera a nadie.** La ficha parcial de
la lectura gratuita no lleva rasgos, así que no toca `RELATION_ES` ni
depende de la batería: solo necesita su tabla de clases y
`AREA_CORTA_ES`, y se monta sobre el `/api/free` que ya está en
producción. Puede salir antes que el plan A sin comprometer nada de lo de
aquí.

## Qué se prueba

- `RELATION_ES` cubre todos los tipos de aspecto que produce
  `src/aspects.ts`, sin huecos.
- `buildSectionMessages` **no** filtra grados, orbes ni números de casa —
  la prueba que hace cumplir la decisión 3, escrita en negativo.
- `groundingProblems` detecta una relación llana inventada
  ("tu Sol y tu Plutón tiran cada uno para un lado" sin aspecto real) y
  acepta una verdadera.
- La palabra "retrógrado" en una sección se marca como infracción.
- `matchesFor` coincide con lo que devuelve hoy `/api/chart`.
- `ReportView`: renderiza tira, tarjeta y lista solo cuando se los dan;
  **nada extra** para una sección que no trae ninguno.
- `decorateLove` retira el gancho del cuerpo.
- Copia escrita a mano bajo `tests/copy.test.ts`, con la misma disciplina
  de género que la salida del modelo (Addendum 6).
- **Batería multi-carta**, tres cartas, bilbao-2000 de canario. Cuesta
  dinero y necesita red; no entra en `npm test`.

## Qué NO cambia

- La lectura gratuita: mismo prompt, mismo gate, misma presentación. Solo
  cede la definición de la tarjeta a `HookCard`.
- El teaser, único consumidor que queda de `{{RULES_CHART}}`.
- El motor de cálculo. Nada de esto toca `computeNatalChart`.
- La ausencia deliberada de gate de género en el tier de pago (decisión 6
  del spec de 2026-08-08).
- `fatal` en `validateSection`: vacío y truncado, nada más.

## Riesgos

- **Que V4 Pro no escriba buen español llano a esta escala.** Es el
  riesgo principal y no está medido. Todo lo que sabemos del registro
  llano es DeepSeek **Flash** sobre bloques de cuatro frases; nadie ha
  pedido nunca 3.000 palabras así a V4 Pro. El hallazgo de calidad del
  Addendum 12 era sobre el registro *técnico* y no se transfiere. Por eso
  el plan A termina en la batería y el plan B no empieza antes.
- **Que la prosa llana suene a horóscopo de revista.** Es el peligro
  exacto del que la marca huye: sin datos en la frase, lo que queda puede
  parecer genérico. La defensa es que el dato sigue delante del lector,
  en la tira, a la altura del párrafo — pero hay que leerlo en la batería,
  no darlo por hecho.
- **Que la tira se lea como una ficha técnica** y el lector la salte. Se
  mitiga con la glosa (decisión 6); se comprueba mirándola.
- **Ocho briefs reescritos es superficie de regresión grande.** La
  batería cubre tres cartas, no todas. Conviene releer las secciones, que
  es lo que el Addendum 12 recomienda tras haber confiado en un regex.
