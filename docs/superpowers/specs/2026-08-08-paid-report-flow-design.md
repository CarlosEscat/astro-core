# Flujo del informe de pago

Fecha: 2026-08-08
Estado: aprobado, pendiente de plan de implementación

## Problema

El informe de pago existe como capa de prompts (`buildReportMessages`,
`prompts/system-report.md`, `parseReport`) pero **nunca ha salido de la
línea de comandos**. No hay ruta `/api/report`, ni componente, ni cobro,
ni entrega. Lo único que menciona el informe en `web/` es copia de venta
en `BirthForm.tsx:287`. Hasta hoy, los únicos informes generados los ha
escrito `scripts/battery-report.ts` a ficheros en disco.

Este documento define el camino completo del dinero: del gancho gratuito
al informe entregado. El esquema de Supabase se deriva de este flujo, no
al revés.

Dos hechos medidos condicionan todo el diseño:

1. **La lectura gratuita es síncrona y tarda ~9,5 s** (Addendum 7). El
   informe de pago con Kimi K3 tardaba ~5 min por carta.
2. **El 64% de los tokens de Kimi eran razonamiento** (8.851 de 13.844 en
   la única llamada donde se capturó el desglose). El cliente paga y
   espera por texto que nunca ve.

## Decisiones tomadas

Cada una resuelve una bifurcación real; las alternativas descartadas se
anotan porque volver a discutirlas sin datos nuevos es tiempo perdido.

### 1. Sin cuenta de usuario

El comprador vuelve a su informe por un enlace con token
(`/informe/<token>`), enviado por email. Stripe recoge el email en el
checkout. **No hay tabla de usuarios, ni login, ni contraseñas.**

Coherente con compra por impulso y pago único (decisión bloqueada). La
cuota del Oráculo, cuando llegue, cuelga del pedido, no de la persona.

### 2. Los datos de nacimiento solo se guardan al iniciar el pago

Al pulsar comprar se escribe una fila con los datos de nacimiento y
Stripe recibe **únicamente un id opaco** en `metadata`.

Quien nunca compra no deja rastro almacenado, y la fecha, hora y lugar de
nacimiento no llegan a un tercero. Es el mismo razonamiento del Addendum 4
(índice GeoNames propio para que ningún tercero vea una pulsación).
Meter los datos de nacimiento en `metadata` de Stripe habría sido más
simple y contradice esa postura.

### 3. Generación por secciones en paralelo, no una llamada larga

Ocho secciones en dos oleadas:

```
oleada 1:  secciones 1-7, concurrentes  → reloj de pared ≈ la más lenta
oleada 2:  sección 8, alimentada con las siete anteriores
```

La sección 8 (`Claves para tu camino`) es explícitamente una síntesis
—"Tres hilos concretos que unan todo lo anterior"— y **no puede
generarse en paralelo con lo que resume**. Las demás sí.

Qué recibe exactamente la sección 8: **la primera frase de cada una de
las siete anteriores más los rasgos que se le asignaron a cada una**, no
las 2.100 palabras completas. Basta para hilar sin inflar el prompt ni
invitar a copiar frases ya escritas.

Beneficio no obvio: **los fallos pasan a ser granulares y baratos**. Hoy
un `parseReport` nulo tira un informe entero. Por secciones se reintenta
una sección de ~300 palabras.

### 4. Reparto determinista de la carta antes de generar

El riesgo real del paralelismo es que siete llamadas independientes
elijan el mismo aspecto más exacto y el informe se repita. La sección 7
(`Tus luces y tus sombras`) pide "los dos o tres aspectos más exactos",
que colisiona por construcción con las secciones 2 y 3.

Antes de cualquier llamada, una **función pura reparte los rasgos de la
carta entre secciones**: la 7 recibe esos aspectos por nombre, y a la 2 y
la 3 se les dice que están tomados. Ninguna llamada decide qué le
pertenece.

Es el principio que ya funcionó en el Addendum 6: computar la estructura
y entregar al modelo una sola cosa elegida. Se prueba sin gastar un euro.

### 5. DeepSeek V4 Pro por sección; Kimi K3 como escalado

**Esto sustituye la decisión bloqueada de modelos de dos niveles**
(Kimi K3 de pago / DeepSeek Flash gratis) en lo que respecta al informe.

Razonamiento: el bake-off puntuó Kimi 54 y DeepSeek V4 Pro 49,5 sobre 55,
y la debilidad registrada de V4 Pro fue precisa — *"Fully grounded;
structure/length slips"*. Estructura y longitud son exactamente lo que la
generación por secciones le quita al modelo: cada llamada recibe un
encargo, un rango de palabras y unos emplazamientos asignados. **Parte
del margen del bake-off medía un problema que esta arquitectura elimina.**
El grounding, criterio eliminatorio, V4 Pro ya lo pasaba.

El argumento decisivo es la **velocidad**, no el coste. En el nivel de
pago el coste es un redondeo (decisión bloqueada: optimizar calidad de
prosa, no precio). Pero la espera sí es el problema.

| | Kimi, una llamada | DeepSeek V4 Pro, 8 llamadas |
|---|---|---|
| Reloj de pared | ~5 min | **~25-30 s** |
| Coste | 0,22-0,48 $ | ~0,04 $ |

**El fallback se invierte:** una sección que agota sus reintentos en
DeepSeek **escala a Kimi K3**. Así se conservan dos proveedores (un corte
de DeepSeek no para las ventas) y la red de seguridad de calidad. Una
sección que DeepSeek no clava degrada *hacia arriba*, y cuesta poco
porque es una sección, no un informe.

Por qué V4 Pro y no Flash: V4 Pro es el único DeepSeek medido sobre
informes completos. Flash solo se ha medido sobre bloques de ~200
palabras del nivel gratuito. Probar Flash por secciones es barato y queda
pendiente.

**Riesgo aceptado y explícito:** la prosa de pago pasa a ser de clase
49,5 en vez de 54, y que el encargo por secciones cierre esa diferencia
está *predicho*, no medido. La predicción está fundada (la debilidad
registrada era estructural), pero es una predicción. Mitiga el escalado a
Kimi. Re-correr el bake-off a ciegas por secciones sigue siendo barato.

### 6. Sin filtro de género en el nivel de pago

El nivel gratuito mantiene su puerta mecánica. El de pago **no**, y la
asimetría es deliberada:

- **El coste por rechazo difiere ~1000x**: 0,000375 $ contra 0,22-0,48 $.
- **La superficie difiere ~11x**: ~220 palabras contra ~2.400.

Multiplicado: con marcas de género en aproximadamente un cuarto de los
intentos gratuitos (~88% de probabilidad de 100 palabras limpias),
extrapolar a 2.400 palabras da `0,88^24 ≈ 0,05`. **Pasaría el 5% de los
informes.** Es una extrapolación, no una medición, pero es robusta en
dirección: aun a mitad de tasa se rechazaría el ~77%.

- **El gratuito tiene una palanca que el de pago no tiene**: reintentar
  rota el rasgo (`selectFeature(chart, index)`), que es lo que llevó
  bilbao de 1/6 a 6/6. Un informe reintentado son las mismas ocho
  secciones otra vez.
- **El radio de impacto difiere**: el gancho gratuito está diseñado para
  captura de pantalla; el informe lo lee en privado quien ya pagó.

En su lugar, el camino de pago:

- ejecuta `repair()` (reescrituras deterministas, coste cero);
- valida **solo estructura**, y por sección eso significa exactamente
  tres cosas: contenido no vacío, rango de palabras del encargo con
  margen, y puntuación final presente (una sección cortada a media frase
  es una generación truncada);
- **registra** marcas de género y longitud de sección en vez de
  rechazar, para conocer la tasa real tras las primeras ventas.

Ninguna comprobación de género, jerga ni clichés rechaza en el nivel de
pago. `validateProse` es del nivel gratuito y sus rangos de palabras
están calibrados para bloques de ~200 palabras: **no se reutiliza aquí**.

Si el registro muestra que es frecuente, la corrección es una regla de
prompt, no una regex — misma conclusión que la limitación de símiles del
Addendum 7.

### 7. Alcance

Dentro: checkout, cobro, generación en cola, página de espera, email,
render del informe y **tarjeta compartible**. La tarjeta se mantiene en
el MVP por decisión del Addendum 1 (valor de distribución), y aquí es
barata: `Signature.tsx` ya computa la rareza real; falta el formato 9:16
y el botón de compartir.

Fuera: **PDF** (Puppeteer, spec propia) y **chat Oráculo** (post-MVP).

### 8. Proveedores

- **Cola: Inngest.** Los step functions encajan con la forma de dos
  oleadas: fan-out sobre siete secciones, barrera, oleada 2. Reintentos
  por paso, control de concurrencia y replay cuando algo falla de
  madrugada. Gran parte de la lógica de reintento es configuración.
- **Email: Resend.** Un email transaccional por venta. La ergonomía pesa
  más que el ajuste fino de entregabilidad a este volumen.

## Flujo end-to-end

```
Lectura gratuita (sin estado, como hoy)
   │
   ▼
[CTA: "Quiero mi informe completo — 9,90 €"]
   │
   ▼
POST /api/checkout
   • orders: status=pending_payment, product_code='report_v1',
     datos de nacimiento, focus, token
   • Stripe Session, metadata={order_id}, Bizum activo
   • success_url = /informe/<token>
   ▼
Checkout alojado en Stripe  ← recoge el email
   │
   ▼
POST /api/webhooks/stripe   (checkout.session.completed)
   • verifica firma
   • idempotente: si ya está pagado → 200 y nada más
   • status=paid, guarda email, encola, devuelve 200 RÁPIDO
   ▼
Inngest
   • claim condicional paid → generating
   • reparto determinista de rasgos
   • oleada 1: secciones 1-7 concurrentes
   • oleada 2: sección 8
   • cada sección: DeepSeek V4 Pro → reintentos → escalado a Kimi
   • cada sección se guarda al completarse
   • todas listas → status=ready → email (Resend)
   ▼
/informe/<token>
   paid | generating → render progresivo, hace polling
   ready            → informe completo + tarjeta compartible
   failed           → mensaje honesto
```

### Por qué el webhook no genera

Stripe reintenta los webhooks que no responden rápido, y un handler lento
produciría trabajos duplicados. El webhook solo marca pagado y encola.

### Por qué el token se crea en el checkout

Permite que `success_url` apunte ya a `/informe/<token>`: el comprador
aterriza en su propia página de espera, no en un "gracias" genérico. El
email lleva el mismo enlace para quien cierre la pestaña.

### Por qué la cola sigue estando justificada a 30 segundos

La arquitectura asíncrona se diseñó para una espera de 5-7 minutos. A ~30
segundos ese motivo casi desaparece, pero se mantiene por otros:

- el webhook de Stripe debe responder en segundos igualmente;
- la entrega at-least-once y el claim condicional evitan doble generación
  (y doble gasto);
- reintentos y escalado por sección necesitan estado durable;
- el comprador puede cerrar la pestaña.

Lo que cambia es que **el email deja de ser la entrega principal y pasa a
ser una red de seguridad**. La página de espera se rellena
progresivamente en ~30 s, más cerca de la experiencia del nivel gratuito
que de un "te avisamos por email".

## Estados del pedido

| Estado | Significado | Transición |
|---|---|---|
| `pending_payment` | fila creada, sesión de Stripe abierta | → `paid` o `expired` |
| `paid` | webhook confirmado, trabajo encolado | → `generating` |
| `generating` | worker lo ha reclamado | → `ready` o `failed` |
| `ready` | todas las secciones guardadas, email enviado | terminal |
| `failed` | DeepSeek y Kimi agotados en alguna sección | terminal |
| `expired` | checkout abandonado; barrido lo limpia | terminal |

La página de espera hace polling cada **2 s** mientras el estado sea
`paid` o `generating`, y para al llegar a `ready` o `failed`. Un barrido
diario marca `expired` los `pending_payment` de más de **24 h** y borra
sus datos de nacimiento: quien no llegó a pagar no debe dejar datos
sensibles almacenados indefinidamente (decisión 2).

## Datos (Supabase)

Se deriva del flujo. Sigue el Addendum 3 punto 3: los pedidos llevan
`product_code` y el acceso se modela como entitlements, porque
retrofitarlo es caro.

**`orders`**
- `id`, `token` — 32 bytes de `crypto.randomBytes` en base64url, único,
  indexado. Es la **única** credencial del informe, así que la entropía
  no es negociable y la ruta va con rate limit.
- `product_code` — `'report_v1'`
- `status` — enum de la tabla anterior
- datos de nacimiento: `birth_date`, `birth_time`, `latitude`,
  `longitude`, `first_name` (opcional, saneado), `focus`
- `email` (nulo hasta el webhook), `stripe_session_id`, `paid_at`
- `chart` (JSONB) — instantánea de la carta calculada, escrita al
  generar. **No se recalcula al leer**: si el motor cambia, un informe
  entregado debe seguir siendo auditable contra la carta exacta sobre la
  que se fundó. La afirmación central del producto es que cada frase
  nombra un emplazamiento real.
- `created_at`, `updated_at`

**`report_sections`**
- `order_id`, `index` (0-7), `title`, `body`
- `model` (qué modelo la escribió: revela cuánto se escala a Kimi),
  `attempts`, `cost`, `gender_marks` (registro, no rechazo),
  `word_count`
- único por `(order_id, index)` — hace idempotente el reintento

**`entitlements`**
- `order_id`, `kind` (`'report_access'`, más adelante `'oracle_quota'`),
  `value` (JSONB), `expires_at` (nulo = sin caducidad)
- Un SKU nuevo es una fila más un fichero de prompt, sin migración.

## Errores

| Fallo | Respuesta |
|---|---|
| HTTP no-2xx del proveedor | reintento con backoff (Inngest) |
| HTTP 200 con contenido vacío | reintento; es el modo documentado en el Addendum 2 |
| sección vacía, fuera de rango o truncada | reintento |
| sección agota **2** reintentos en DeepSeek | escala a Kimi K3 (**1** intento) |
| escalado también falla | `failed`, alerta, mensaje honesto; reembolso **manual** |
| webhook duplicado | no-op por idempotencia |
| trabajo entregado dos veces | claim condicional `paid → generating` |

Techo por sección: 3 llamadas (2 DeepSeek + 1 Kimi). Peor caso absoluto
con las ocho secciones escalando: ~8 × 0,03 $ de Kimi por sección, muy
por debajo de los 0,22-0,48 $ de un informe Kimi de una sola llamada.
Los reintentos aquí no son un riesgo económico; en la arquitectura
anterior sí lo eran.

El reembolso automático se descarta deliberadamente: automatizar un
camino para un evento que puede no dispararse nunca es especulativo, y a
este volumen una respuesta humana a un fallo raro es mejor servicio.

## Corrección pendiente que entra aquí

`parseReport` exige `## ` exacto (`src/report.ts:201`, `indexOf`
literal). Un modelo que emita `#` convierte un informe válido en un
reintento pagado; el bake-off perdió cuatro informes buenos por esto.
Está en la lista de pendientes de HANDOVER, son tres líneas, y reduce
reintentos de pago directamente.

Con generación por secciones `parseReport` deja de ser el validador
principal (cada sección se valida sola), pero sigue usándose para
componer y verificar el informe completo.

## Pruebas

- **Puras, sin red**: reparto determinista de rasgos (ninguna sección
  reclama el mismo aspecto; cobertura completa de la carta), máquina de
  estados, generación e unicidad de tokens.
- **Webhook**: verificación de firma, idempotencia ante entrega
  duplicada, rechazo de firmas inválidas.
- **Worker**: con proveedor simulado — reintento en vacío, escalado a
  Kimi tras agotar, guardado parcial visible en la página de espera.
- **Batería (cuesta dinero, fuera de `npm test`)**: por secciones sobre
  las tres cartas, con bilbao-2000 de canario. Mide reloj de pared,
  coste real, tasa de escalado a Kimi y marcas de género registradas.
  Es la primera medición honesta de la decisión 5.

## Pendiente de medir

1. **Calidad por secciones de V4 Pro** frente a Kimi de una llamada.
   Bake-off a ciegas, mismo rubric, mismas tres cartas.
2. **Coste real**: ocho llamadas llevan cada una la carta y las reglas
   (~3.400 tokens de prompt). El caché de prefijo debería neutralizarlo,
   pero hay que medirlo.
3. **Esfuerzo de razonamiento**: aplica por sección y compone con todo lo
   anterior. El Addendum 5 ya demostró la ganancia en el teaser.
4. **Flash por secciones**: barato de probar una vez existan las
   secciones.
