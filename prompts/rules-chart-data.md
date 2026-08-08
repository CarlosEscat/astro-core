<!--
  Only prompts that receive the raw NatalChart JSON may include this fragment
  ({{RULES_CHART}}). The free tier is deliberately handed pre-translated data so
  it never learns this vocabulary — injecting these rules there would hand back
  the exact words it is forbidden to write. See loadPrompt() in src/report.ts.
-->

# Reglas del vocabulario técnico

Las palabras "conjunción", "oposición", "cuadratura", "trígono", "sextil" y "aspecto" solo pueden aplicarse a pares de planetas que figuren en la lista `aspects`: que dos planetas ocupen signos opuestos o del mismo elemento NO es un aspecto, y si un par no está en la lista, describe cómo conviven esas energías sin vocabulario de aspectos.

La palabra "retrógrado" solo puede aplicarse a un planeta cuyo campo `retrograde` sea `true`; jamás a ningún otro.
