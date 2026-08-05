# Rúbrica de evaluación a ciegas

Puntúa cada informe de 1 a 5 en cada criterio ANTES de abrir KEY.json.
Lee los tres informes de cada modelo (una carta distinta cada vez) —
un modelo puede brillar en una carta y romperse en otra.

## 1. Naturalidad del español (peso ×3)
¿Suena a una astróloga española escribiendo con oficio, o a traducción?
Señales de fallo: calcos del inglés ("es importante notar que"), voseo o
mexicanismos inesperados, conectores robóticos ("Además, cabe destacar"),
tuteo inconsistente. Un 5 = lo leerías en voz alta sin tropezar.

## 2. Anclaje en la carta (peso ×3)
Elige 5 afirmaciones al azar y compáralas con el JSON de la carta.
¿Cada una nombra una posición real? ¿Alguna posición está INVENTADA?
Una sola posición inventada = máximo 2 en este criterio, da igual lo
bonito que escriba. Es el criterio eliminatorio.

## 3. Especificidad anti-Barnum (peso ×2)
Tapa la posición citada en 5 frases: ¿la frase seguiría valiendo para
cualquiera? Si la mayoría sobreviven al borrado, es horóscopo de revista.
Un 5 = las frases pierden el sentido sin su dato.

## 4. Efecto "¿cómo lo sabe?" (peso ×2)
¿El retrato esencial tiene al menos un momento que sorprende de verdad?
Subjetivo y crucial: es lo que convierte y lo que se comparte.

## 5. Estructura y extensión (peso ×1)
8/8 secciones con los títulos exactos (el script ya lo comprueba),
longitud en rango, secciones equilibradas, cierre memorable.

## Puntuación final
Suma ponderada sobre 55. Descarta cualquier modelo con un 1-2 en el
criterio 2 aunque gane en total. Si dos modelos empatan ±3 puntos,
gana el más barato; re-verifica al ganador en su host definitivo
(el servido en bf16 puede diferir del fp8 que probaste).
