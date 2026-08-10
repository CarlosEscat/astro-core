# La sección de amor del informe de pago adopta la forma de la lectura gratuita

Fecha: 2026-08-10
Estado: **SUSTITUIDO** el mismo día por
`2026-08-10-paid-report-plain-language-design.md`.

> Su decisión 1 descartaba la paridad de registro — prosa técnica en el
> informe, prosa llana solo en la lectura gratuita. Esa decisión se
> revocó: el informe entero pasa a registro llano y los datos se
> muestran en una tira por sección. Las decisiones 2 a 9 de este
> documento siguen vivas y están absorbidas en el que lo sustituye.
> Se conserva por el registro de por qué se decidió lo contrario primero.

## Problema

`Amor y vínculos` (sección 4 del informe de pago) y `En el amor` (módulo
de la lectura gratuita) presentan el mismo tema de tres maneras
incompatibles a la vez. No es una diferencia de profundidad — que sería
deseable y es lo que justifica los 9,90 € — sino de forma:

| | Gratuita `En el amor` | De pago `Amor y vínculos` |
|---|---|---|
| **Visual** | Tarjeta con borde latón, «comillas españolas», marca de agua; construida para ser capturada | `<h2>` y párrafos, idéntica a las otras siete secciones |
| **Estructura** | Una frase gancho + exactamente tres frases; 80-110 palabras | Cuatro beats obligatorios; 350-480 palabras (medido 450-547) |
| **Registro** | Cero jerga: lista de palabras prohibidas, zonas de la vida en vez de números de casa | Nombra grados, casas y aspectos ("Venus en Leo en la casa tres, a veinte grados, en oposición a Urano") |

El comprador que llega desde la lectura gratuita encuentra el mismo tema
sin ninguna de las señales que reconoce. Se pierde además el activo de
distribución: el gancho de amor es la unidad capturable del producto
(Addendum 6) y el informe de pago no tiene ninguna.

## Decisiones tomadas

Cada una resuelve una bifurcación real. Las alternativas descartadas se
anotan porque volver a discutirlas sin datos nuevos es tiempo perdido.

### 1. Paridad de estructura y presentación, NO de registro

El informe de pago adopta la **forma** de la lectura gratuita — gancho
capturable, tarjeta, lista de compatibilidad — y conserva su **registro
técnico**: sigue nombrando grados, casas y aspectos.

Descartado: quitar la jerga también. La lectura gratuita prohíbe el
vocabulario técnico porque su lectora no sabe astrología y cerraría la
página (Addendum 6). El informe de pago vende exactamente lo contrario:
*"cada frase nombra la posición que la sustenta"* es la copia de venta y
el argumento del producto. Igualar el registro habría borrado la
diferencia por la que se paga.

### 2. El informe se lee solo

El brief actual abre diciéndole al modelo que la lectura gratuita ya
entregó Venus, Descendente y los signos compatibles, y que **no los
repita**. Esa premisa se elimina.

Motivo: deja de ser cierta en tres casos que ya existen o existirán —
el comprador que llega por un enlace compartido, el que abre el PDF seis
meses después, y ahora el que ve la lista de compatibilidad impresa
dentro del propio informe. Un artefacto que se vende suelto no puede
depender de que se haya visto otra cosa antes.

El brief pasa a decir que vaya más hondo que una lectura de Venus de
superficie, que es la intención real que la premisa codificaba.

Descartado: mantener el no-repetir y tratar la lista como dato mudo.
Más barato, pero el informe seguiría leyéndose como la segunda parte de
algo.

### 3. Disposición: gancho → prosa → compatibilidad

Elegida sobre mockups con contenido real (bilbao-2000). El lector recibe
el argumento y después los recibos, que es el orden de la lectura
gratuita (`En el amor`, luego `Con quién encajas`) y el que sobrevive
mejor a un salto de página en PDF.

Descartada la variante con la lista **antes** de la prosa: la sección
abría con dos cajas apiladas antes de una sola línea de texto. Descartada
también la tira compacta de solo tres fichas: ahorraba espacio a costa de
la copia cálida (*"alguien que dice que viene a las ocho y viene a las
ocho"*), que es la parte que hace humana a esa lista.

### 4. La tarjeta del informe no lleva marca de agua

En la lectura gratuita la tarjeta lleva `Destiny Reports · tu lectura`
porque su trabajo es circular en capturas de pantalla. El comprador ya ha
pagado; ahí la marca es ruido. La tarjeta compartible del informe es la
`ShareCard` 9:16, que sí la lleva.

### 5. El gancho está exento de nombrar su dato

Un gancho capturable no puede citar posiciones sin perder la gracia:
bilbao-2000 daría *«Quieres que te sorprendan, y luego castigas a quien
lo hace»*, que no nombra ni Venus ni casa ni grado.

El brief declara la excepción **explícitamente**, para que el modelo no
la resuelva por su cuenta acolchando la frase hasta dejarla sin filo. El
gancho es la tesis; las frases inmediatamente posteriores nombran los
datos que la sostienen.

Mecánicamente es seguro: `groundingProblems()` comprueba retrogradación
inventada, signo falso y aspecto ausente, y una frase que no afirma nada
sobre la carta no puede disparar ninguna de las tres.

Descartado: exigir que el gancho nombre una posición. Mantiene la promesa
literal para todas las frases, pero mete jerga justo en la línea diseñada
para circular fuera del producto.

### 6. El gancho se avisa, no se bloquea

Un gancho ausente o demasiado largo entra en `SectionCheck.problems`,
**nunca en `fatal`**.

Esta decisión es la lección del Addendum 12 aplicada antes de repetir el
error: escalar a Kimi por un defecto no factual costó 317-603 s y $0,08
por sección, y dejó la arquitectura más lenta y más cara que la llamada
única que sustituía. Un gancho flojo es un problema de clase longitud, no
de clase grounding. Solo lo vacío y lo truncado siguen siendo fatales.

### 7. La compatibilidad sale de la carta guardada

Se calcula desde el snapshot que acompaña al informe, nunca recalculando
desde los datos de nacimiento. Es la regla del spec de 2026-08-08: un
informe entregado tiene que seguir siendo auditable contra la carta
exacta que lo fundamentó. Coste LLM cero — es matemática local.

### 8. Dos extracciones para que las dos capas no diverjan

La copia de compatibilidad se ensambla hoy en línea dentro de
`web/src/app/api/chart/route.ts:50`. Si el informe monta la suya, las dos
se separarán en cuanto alguien toque una. Pasa a `matchesFor(chart)`
compartida, y ambas rutas la llaman.

La tarjeta del gancho vive dentro de `LoveHook.tsx`, acoplada a la prosa.
Pasa a `HookCard({ quote, mark? })`: la gratuita la usa con `mark`, el
informe sin él. Una sola definición de qué es esa tarjeta.

`firstSentence()` (`src/report.ts:241`) se exporta en lugar de
reimplementarse. Ya codifica el hallazgo del Addendum 7 — el modelo no
corta la línea después del gancho de forma fiable, así que la unidad es
la primera **frase**, no la primera línea.

### 9. La sección no se distingue por su título

`ReportSection` gana dos campos opcionales y `ReportView` renderiza lo
que le den:

```ts
// Match ya existe en web/src/components/types.ts
export interface ReportSection {
  title: string;
  /** Prosa YA SIN el gancho: quien decora la sección lo retira de aquí. */
  body: string;
  /** Primera frase, extraída del cuerpo original para la tarjeta. */
  hook?: string;
  matches?: { matches: Match[]; friction: Match };
}
```

**El gancho se retira del cuerpo, no se duplica.** Quien decora la
sección extrae la primera frase, la pone en `hook` y deja en `body` el
resto; si no, la frase se vería dos veces, una en la tarjeta y otra
abriendo la prosa. Es lo que ya hace `LoveHook` hoy por prefijo.

Las otras siete secciones llegan sin esos campos y no se renderiza nada
extra. **`ReportView` no ramifica por título ni por índice**: solo mira
si los campos están. Quien decide qué sección se decora es el llamante, y
lo hace por **índice** (4), que es como `SECTION_BRIEFS` identifica las
secciones desde plan 1. Ramificar por `title === "Amor y vínculos"` se
rompería en cuanto alguien reformulara un título, y los títulos son copia
de producto.

`ReportView` sigue siendo pura — sin fetch, sin APIs de navegador — para
que la misma pieza sirva a la ruta de preview, a la de entrega, al estado
progresivo y a Puppeteer.

## Cambios en el brief (`src/sections.ts`, índice 4)

Dos cambios, ningún beat nuevo:

1. La apertura deja de referirse a la lectura gratuita (decisión 2).
2. Se añade la instrucción de primera frase: **exactamente una frase**
   corta y rotunda que nombre la contradicción amorosa de esta persona,
   pensada para ser capturada, exenta de nombrar su dato (decisión 5).

El rango se queda en **350-480 palabras** (600 bajo foco `amor`). El
gancho añade ~20 palabras y la longitud es advisoria desde el Addendum
12, así que un exceso se registra y no se castiga. Subir el rango
invitaría a relitigar un número que ya tiene evidencia de tres baterías
detrás.

La instrucción se expresa en **frases, no en palabras**, porque el
Addendum 7 midió que los modelos obedecen recuentos de frases e ignoran
los de palabras. Es además un paso barato en la dirección del punto 3 que
el Addendum 12 dejó abierto.

## Flujo de datos

```
carta guardada ──> matchesFor(chart) ─────────────────┐
                                                      v
markdown ──> parseReport ──> {title, body}[] ──> decorateLove(secciones, chart)
             (sin tocar)                              │   índice 4:
                                                      │   hook = firstSentence(body)
                                                      │   body = body sin el gancho
                                                      v
                                                 ReportView
                                          HookCard · prosa · Matches
```

**`parseReport` no se modifica.** Sirve a las ocho secciones y lo
consumen además los scripts de batería y sus tests; meterle conocimiento
del gancho lo convertiría en específico de una sección. La decoración es
un paso posterior y aparte, sobre su salida.

En la ruta de preview (fase A, sin base de datos) no hay carta: solo un
fichero markdown. Recibe un mapa de fixtures **solo de desarrollo** con
los datos de nacimiento de las tres cartas de la batería, que ya están en
`scripts/battery-sections.ts:46`, y calcula la compatibilidad real de
cada una.

## Qué se prueba

- `firstSentence` exportada: párrafo sin saltos de línea, gancho seguido
  de más prosa, cuerpo de una sola frase.
- `matchesFor`: coincide con lo que devuelve hoy `/api/chart` para una
  carta conocida (la prueba que impide que las dos capas diverjan).
- `ReportView`: renderiza tarjeta cuando le dan `hook`, lista cuando le
  dan `matches`, y **nada extra** para una sección que no trae ninguno.
- `HookCard`: con `mark` y sin `mark`.
- `decorateLove`: pone el gancho en `hook`, lo quita de `body` — la frase
  no puede aparecer dos veces — y deja intactas las otras siete
  secciones.
- Batería multi-carta `scripts/battery-sections.ts` sobre las tres
  cartas, con bilbao-2000 de canario. **Cuesta dinero y necesita red**,
  así que no entra en `npm test`. CLAUDE.md la exige para cualquier
  cambio de prompt, y esto lo es.

Lo que la batería tiene que responder: si el gancho sale capturable o
sale acolchado; si la exención de la decisión 5 se contagia al resto de
la sección y afloja el grounding; y cuánto crece la sección con el gancho
dentro.

## Qué NO cambia

- Las otras siete secciones, sus briefs y sus rangos.
- La lectura gratuita: mismo prompt, mismo gate, misma presentación —
  solo cede la definición de la tarjeta a `HookCard`.
- `groundingProblems()` y la lista `fatal` de `validateSection`.
- La ausencia deliberada de gate de género en el tier de pago
  (decisión 6 del spec de 2026-08-08). El gancho es prosa de modelo y se
  registra, no se bloquea.

## Riesgos

- **El gancho sale sin filo.** Es el riesgo real: el mismo modelo escribe
  la frase capturable y los cuatro beats técnicos, y el registro del
  segundo puede arrastrar al primero. Solo lo mide la batería. Si pasa,
  la palanca es el brief, no un regex — el Addendum 7 ya demostró que un
  ejemplo literal dentro de un prompt vuelve copiado tal cual, así que la
  instrucción describe la forma del gancho sin dar una frase modelo.
- **La sección crece.** Ya es la más larga del informe (547 palabras en
  bilbao contra un techo de 552) y se le añade una frase más una lista.
  Advisorio por diseño, pero conviene mirarlo en la batería.
- **La ruta de preview acumula deuda de desarrollo.** El mapa de fixtures
  solo existe porque la fase A no tiene base de datos; la fase B lo
  sustituye por la carta real del pedido y hay que borrarlo entonces.
