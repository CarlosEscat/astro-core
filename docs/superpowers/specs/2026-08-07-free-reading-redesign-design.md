# Rediseño de la lectura gratuita

Fecha: 2026-08-07
Estado: aprobado, pendiente de plan de implementación

## Problema

La lectura gratuita se percibe genérica y sin gancho. Diagnóstico hecho
sobre salida real (dos cartas, pipeline de producción), no sobre
suposiciones:

1. **Monotonía estructural.** `prompts/system-teaser.md` impone tres
   tiempos fijos (Sol-Luna-Asc → aspecto más exacto → hilo suelto). Dos
   teasers seguidos delatan la plantilla.
2. **Un solo bloque de ~140 palabras.** Nada que recorrer, nada que
   explorar, nada que capturar en pantalla.
3. **No responde a lo que la gente viene a preguntar**: amor,
   compatibilidad.
4. **Muletillas del modelo repetidas entre usuarios.** Dos cartas
   distintas produjeron "casi telepática" de forma independiente.
5. **Registro técnico.** El público objetivo no sabe astrología. "El
   regente de tu casa 7 es Saturno" expulsa al lector.
6. **Precisión sin significado.** `Sol ♌︎ Leo 7°12'` no dice nada a
   quien no sabe leerlo.

La prosa **sí** estaba bien anclada a la carta: el problema nunca fue el
grounding, que ya funciona.

## Decisiones tomadas

| Decisión | Elección |
|---|---|
| Sección de amor gratuita | Corta (~70-110 palabras), con frase-gancho viral. El análisis largo se queda en el informe de pago. |
| Compatibilidad | Derivada del Descendente + regente de casa 7 + Venus/Marte/Luna, **no** del Sol. |
| Composición gratuita | Teaser + amor corto + módulos calculados. |
| Registro | Lenguaje corriente. Cero jerga en la prosa generada. |
| Presupuesto | Dentro de $0,0011–0,0015 por lectura entregada (Addendum 2). |
| Informe de pago | Sección 5 reenfocada para no solapar con el amor gratuito. |

## Principio rector

**El modelo nunca deriva estructura; solo interpreta hechos ya
calculados.**

Evidencia que lo fundamenta: cuando se pidió al teaser que *encontrara*
el rasgo más singular de la carta (cúmulos, planetas sin aspectos,
orbes exactos), inventó los tres — afirmó a Júpiter en Tauro cuando
está en Géminis, llamó "exacta" a una conjunción de 6,35°, y declaró a
Mercurio sin aspectos teniendo conjunción con la Luna. La sección de
amor, que recibió el perfil ya calculado, salió limpia.

Corolario: **tampoco recibe vocabulario técnico.** Se le entregan zonas
de vida en lenguaje llano y relaciones entre planetas descritas en
castellano corriente. No puede escribir jerga porque nunca la ve, y no
puede equivocarse en un orbe que jamás le llega.

## Arquitectura

Dos capas con economías distintas:

- **Capa calculada** — matemática determinista sobre `NatalChart`.
  ~0 ms, coste cero, imposible de alucinar, testeable.
- **Capa de prosa** — una sola llamada al LLM que recibe hechos ya
  derivados y los traduce a lenguaje humano.

### 1. `src/rulers.ts` (nuevo)

Mapa signo → planeta regente. **Regencias modernas** como primarias
(Escorpio→Plutón, Acuario→Urano, Piscis→Neptuno), tradicionales en un
campo secundario. Coherente con Placidus por defecto y con la práctica
del mercado español.

### 2. `src/profile.ts` (nuevo)

Funciones puras, sin I/O:

| Función | Devuelve |
|---|---|
| `relationshipProfile(chart)` | Descendente, regente de casa 7 con su posición, Venus, Marte, Luna, planetas en casa 7, aspectos de Venus y Marte |
| `compatibleSigns(chart)` | Los 12 signos puntuados, con la razón de cada contribución |
| `frictionSign(chart)` | El signo en cuadratura al eje Asc–Desc |
| `elementBalance(chart)` / `modalityBalance(chart)` | Recuentos ponderados, dominante y **ausente** |
| `chartRuler(chart)` | Regente del Ascendente, su signo y zona, si está en domicilio |
| `chartFeatures(chart)` | Menú cerrado de rasgos: cúmulos por signo y por casa, planetas sin aspectos, aspecto más estrecho, elemento casi ausente, regente en domicilio |
| `signature(chart)` | Combinación Sol–Luna–Asc y su rareza |

**Pesos de compatibilidad** (cada contribución arrastra su razón en
texto):

| Señal | Peso |
|---|---|
| Signo del Descendente | 40 |
| Signo del regente de la casa 7 | 25 |
| Signo de cada planeta en casa 7 | 20 |
| Trígono / sextil al signo de Venus | 15 / 10 |
| Trígono / sextil al signo de Marte | 10 / 7 |
| Mismo elemento que la Luna | 8 |
| **Trígono / sextil al signo del Sol** | **5 / 3** |

El Sol pesa deliberadamente lo mínimo: es el argumento del producto
expresado en números. Dos personas del mismo signo solar con
Ascendentes distintos obtienen respuestas distintas — y eso es un test.

**Ponderación de elementos y modalidades**: Sol 3, Luna 3, Ascendente 3,
Medio Cielo 2, Mercurio/Venus/Marte 2, Júpiter/Saturno 1,
Urano/Neptuno/Plutón 0,5.

`compatibleSigns` devuelve los doce puntuados. La selección de los tres
que se muestran ocurre en la presentación, no en el cálculo.

**Empates**: se resuelven por la contribución individual más alta y, si
persisten, por orden zodiacal. En la carta canario Aries y Sagitario
empatan a 20 con la misma composición, así que la regla tiene que ser
explícita o el resultado depende del orden de iteración.

**Colisión resuelta**: un signo puede puntuar alto y ser a la vez el
signo de fricción (en la carta canario, Aries, con 20 puntos). Regla: el
signo de fricción se excluye de los tres primeros y se presenta aparte,
bajo su propio epígrafe. No es incompatibilidad, es la fricción que
mueve.

**Rareza**: formulación combinatoria honesta ("1 de 1.728 combinaciones
Sol–Luna–Ascendente"), nunca un porcentaje inventado. Un Monte Carlo
sobre horas y latitudes aleatorias daría un percentil real; queda
anotado, no se construye ahora.

### 3. `src/copy/areas.es.ts` (nuevo)

Las doce casas en lenguaje corriente. **Es lo único que el modelo
recibe sobre casas — nunca un número.**

```
1  cómo te presentas y el cuerpo con el que vas por el mundo
2  el dinero, tus cosas y lo que consideras tuyo
3  cómo hablas, escribes y te mueves por tu barrio
4  tu casa, tu familia y de dónde vienes
5  lo que haces por gusto: crear, ligar, jugar
6  tu día a día, el trabajo cotidiano y tus rutinas
7  tus relaciones de tú a tú y con quién te emparejas
8  lo que compartes a fondo con otra persona y lo que te transforma
9  lo que crees, lo que estudias y lo lejos que viajas
10 tu cara pública y a qué te dedicas de cara a la gente
11 tus amistades, tus grupos y lo que quieres para el futuro
12 lo que pasa a puerta cerrada, contigo a solas
```

Los aspectos viajan igualmente traducidos: conjunción → "van pegados";
oposición y cuadratura → "tiran cada uno para un lado"; trígono y
sextil → "van de la mano".

### 4. `prompts/rules-universal.md` (nuevo, fragmento compartido)

Grounding, neutralidad de género, prohibiciones de contenido y lista de
clichés. Se compone en `loadPrompt()` con el cuerpo específico de cada
producto. `HANDOVER.md:370` lo señalaba como "hacer en el próximo toque
de prompts"; con tres prompts vivos la deriva es inevitable si no se
hace ahora.

### 5. `prompts/system-free.md` (nuevo, sustituye a `system-teaser.md`)

Una sola llamada devuelve dos bloques con encabezados literales:

- `## APERTURA` — sobre **un** rasgo que le entregamos ya elegido.
  Explica cómo se nota en la vida real, en situaciones cotidianas. No
  repite Sol/Luna/Ascendente: la pantalla ya los muestra.
- `## AMOR` — primera línea: una frase corta y rotunda que nombre la
  contradicción amorosa, pensada para captura de pantalla. Después dos
  o tres frases llanas. Termina en seco.

**Longitudes: lo que se pide y lo que se acepta son distintos a
propósito.** El modelo se pasa de largo de forma sistemática, así que se
le pide por debajo del límite real del gate:

| Bloque | Se pide en el prompt | Acepta el gate |
|---|---|---|
| Apertura | 100-140 | 100-140 |
| Amor | 70-100 ("el máximo es estricto: cuéntalas") | 70-120 |

Medido: pidiendo 70-110 devolvió 118, 127 y 131 palabras en tres
tiradas. Pidiendo 70-100 con la instrucción de contarlas, entró en
rango.

Motivo de la llamada única: el prompt domina el coste (~1.950 tokens de
entrada frente a ~370 de salida). Dos llamadas duplican la carga de
entrada. Una sola también reduce latencia frente a dos en paralelo.

Selección del rasgo: **la elegimos nosotros**, por orden de prioridad
(cúmulo en casa > cúmulo en signo > planeta sin aspectos > elemento
ausente > regente en domicilio > aspecto más estrecho). Entregarle un
menú provocó que fundiera dos rasgos en una afirmación falsa.

**Ningún ejemplo literal en el prompt.** Una frase de muestra ("quieres
fuegos artificiales con alguien que llegue puntual") apareció copiada
tal cual en la salida. Todo ejemplo en un prompt es una muletilla en
potencia.

### 6. Validación — `src/validate.ts`

`validateTeaser()` se generaliza a `validateProse(text, chart, opts)`.
Comprobaciones, todas mecánicas:

| Comprobación | Estado |
|---|---|
| Rango de palabras por bloque | existe, parametrizar |
| Truncamiento | existe |
| Retrogradación inventada | existe |
| Aspecto inventado | existe (queda como red de seguridad) |
| **Jerga prohibida** (19 términos + `casa <número>`) | nuevo |
| **Clichés y muletillas** | nuevo |
| **Signo falso** (`tu Venus en X` contra la carta) | nuevo |
| **Casa falsa** | nuevo |
| **Sustantivo con género** (`eres un/una`, `te convierte en un/una`) | nuevo |
| **Adjetivo predicativo con género** (`eres\|seas\|fueras\|estás\|te sientes + adj. en -o/-a`) | nuevo |
| **Género de la pareja** (`tu chico`, `quien se siente envuelto`) | nuevo |
| **Encabezado emitido** cuando la interfaz ya lo pone | nuevo |

**Pasada de reparación previa al reintento.** Lista blanca de
sustituciones exactas y deterministas, aplicada antes de evaluar el
gate para no gastar un reintento en un fallo trivial:

```
"que eres única"      → "que no hay nadie como tú"
"ser vista"           → "que te miren"
"ser admirada"        → "que te admiren"
"sentirte comprendida"→ "que te entiendan"
"ni tú misma"         → "ni tú"
"eres de los que"     → "eres de quienes"
```

Solo sustituciones literales. Nunca reparación semántica.

## Composición de la lectura gratuita

| # | Módulo | Origen |
|---|---|---|
| 01 | Tus tres signos, con una glosa en lenguaje llano por posición | calculado + copy |
| 02 | En el amor: frase-gancho destacada + 3 frases | prosa |
| 03 | Con quién encajas: 3 signos + el que te desordena | calculado |
| 04 | Agua, fuego, aire y tierra | calculado |
| 05 | Lo primero que salta | prosa |
| 06 | Tu combinación + rareza (base de la tarjeta compartible) | calculado |
| 07 | Upsell | estático |

Patrón de presentación en los módulos calculados: **frase llana
delante, recibo técnico debajo en mono pequeño.** La precisión queda
visible como prueba sin estorbar la lectura.

El módulo "eje del vínculo" que se prototipó queda **eliminado**: era lo
más técnico de la página y su contenido cabe dentro de "Con quién
encajas".

Todo el copy de plantilla obedece la regla de género igual que la
salida del LLM. En el prototipo se coló un encabezado "De qué vas
cargado"; las tablas de copy entran en los tests.

## Informe de pago: reenfoque de la sección 5

`## Amor y vínculos` conserva título y posición (`SECTION_TITLES` está
bajo test), pero cambia de contenido para no repetir lo gratuito.

Fuera (ya lo cubre la lectura gratuita): describir Venus por signo y
casa, presentar el Descendente, listar signos compatibles.

Dentro:
- El patrón que se repite a lo largo del tiempo y cómo empieza cada
  ciclo.
- Aspectos duros de Venus y Marte a Saturno, Plutón, Urano y Neptuno,
  leídos como dinámica relacional, no como etiqueta.
- Lo que se proyecta en la otra persona: la distancia entre lo que se
  pide en voz alta y a quién se elige de hecho.
- La casa 8 y la Luna: intimidad, dependencia, qué se necesita para
  entregarse de verdad — territorio que lo gratuito no toca.
- Cierre sobre cómo se trabaja el patrón, preservando agencia.

Extensión sin cambios (300-350 palabras, 450 con enfoque "amor").

## API y latencia

```
POST /api/chart   ~80 ms  → tres signos + perfil calculado completo
POST /api/free    ~5-20 s → apertura + amor, gate y reintentos
```

`/api/teaser` se sustituye por `/api/free`. El cliente lanza `/api/chart`
primero y pinta la página densa de inmediato; la prosa aterriza después
en sus dos huecos. Es el mismo hallazgo de `HANDOVER.md:429`, ahora
soportando mucho más contenido.

`MAX_ATTEMPTS` sube de 3 a 6: un reintento cuesta $0,00015 y la carta
canario consume varios.

## Coste

| Concepto | Medido |
|---|---|
| Intento limpio | $0,000150 |
| Entregado, 4 intentos | $0,000541 |
| Presupuesto Addendum 2 | $0,0011–0,0015 ✓ |

Módulos calculados: $0.

## Riesgo principal

**El gate de género es el cuello de botella real del tier gratuito — no
el coste ni la latencia.** En la carta canario rechazó 3 de 4 intentos
("seas tacaño", "estás emocionado", "eres única", "eres una persona").
El coste es irrelevante; la latencia no: cada reintento son ~5 s, y una
tanda entera fallida sirve una página de error.

Mitigaciones ya prototipadas: regla predicativa ampliada, pasada de
reparación determinista, presupuesto de 6 intentos. **Falta medir la
tasa real de aprobación sobre la batería multi-carta antes de lanzar**,
con bilbao-2000 como canario (`CLAUDE.md`).

## Pruebas

`npm test` debe seguir en verde (42 → ~65).

- `profile.ts` es puro: se prueba contra las tres cartas de referencia.
  Aserción clave: **mismo Sol y distinto Ascendente ⇒ signos compatibles
  distintos** — es el foso del producto, conviene que falle ruidosamente
  si se rompe.
- Tablas de regencias completas para los doce signos; detección de
  elemento ausente; el signo de fricción nunca aparece en el ranking.
- Validador: corpus de casos malos reales capturados en el diagnóstico
  ("una diplomática innata", "te hace más profundo", "seas tacaño",
  "Júpiter en Tauro" con Júpiter en Géminis).
- Tablas de copy: sin marcas de género.
- Batería multi-carta para el prompt nuevo y para la sección 5.
- `npm run example` debe seguir funcionando: vitest en verde no prueba
  la ruta tsx.

## Ficheros

```
src/
  rulers.ts              nuevo
  profile.ts             nuevo
  validate.ts            nuevo (extrae y amplía el gate de report.ts)
  copy/areas.es.ts       nuevo
  copy/signs.es.ts       nuevo (glosas llanas por signo y por rol)
  report.ts              buildFreeMessages, parseFree; el gate se va a validate.ts
prompts/
  rules-universal.md     nuevo
  system-free.md         nuevo (sustituye system-teaser.md)
  system-report.md       compone el fragmento; sección 5 reenfocada
web/src/
  app/api/chart/route.ts devuelve el perfil completo
  app/api/free/route.ts  nuevo (sustituye api/teaser)
  components/…           módulos nuevos
tests/
  profile.test.ts, validate.test.ts, copy.test.ts nuevos
  report.test.ts         ampliado
```

## Secuencia

El alcance es grande para un solo tramo. Orden sugerido, cada paso
verificable por sí mismo:

1. `rulers.ts` + `profile.ts` + `copy/` con sus tests. Puro, sin red,
   sin tocar nada existente.
2. `validate.ts`: extraer el gate actual sin cambiar comportamiento
   (tests siguen verdes), después añadir las comprobaciones nuevas
   contra el corpus de casos malos.
3. `rules-universal.md` + composición en `loadPrompt()`, sin cambiar el
   contenido de las reglas. Los tests que afirman que ambos prompts
   contienen la regla de género deben seguir pasando.
4. `system-free.md` + `buildFreeMessages` + `parseFree`, con batería
   multi-carta.
5. `/api/chart` ampliado y `/api/free`; retirar `/api/teaser`.
6. Módulos de UI.
7. Sección 5 del informe de pago, con su propia batería multi-carta.

Los pasos 1-3 no cambian nada de cara al usuario y pueden entrar sin
riesgo. El comportamiento visible cambia en el 4.

## Pendiente de decidir

**Registro del informe de pago.** Este spec deja el informe de pago con
su regla actual de nombrar posiciones de forma verificable, porque quien
ha pagado tiene más paciencia y la verificabilidad es el argumento del
producto. Pero el tier gratuito pasa a ser radicalmente más llano, y el
salto entre ambos será perceptible. Decidir por separado si el informe
adopta también el patrón "frase llana delante, dato detrás" o mantiene
su registro actual.
