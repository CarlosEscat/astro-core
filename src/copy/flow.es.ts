import type { Sign } from "../types";

/**
 * Everything the onboarding flow says back to the person answering it.
 *
 * All of it is static. The flow makes no LLM call — that property is
 * inherited from the character card (Addendum 15) and it is what makes these
 * lines safe to write at all: nothing here can hallucinate.
 *
 * Second person, epicene by construction. tests/copy.test.ts gates every line
 * through copyProblems().
 */

/**
 * Shown under the class name at question 2. The class itself comes from
 * CLASS_ES, which already ships — Leo arrives as ARTISTA.
 *
 * Third person about what the character does, never an adjective about the
 * person: an adjective is where the gender agreement gets in.
 */
export const CLASE_REACCION_ES: Record<Sign, string> = {
  Aries: "Va primero y pregunta después.",
  Taurus: "Lo que construye, aguanta.",
  Gemini: "Cambia de idea porque se le ocurren más.",
  Cancer: "La gente le cuenta cosas que no cuenta.",
  // "en el que lo ponen" would assume a masculine object. copyProblems()
  // checks adjectives and participles, not object pronouns, so it passes
  // either way — this one has to be caught by reading it.
  Leo: "Ocupa todo el sitio que le dan.",
  Virgo: "Ve el fallo antes que nadie.",
  Libra: "Sostiene lo que a otros se les cae.",
  Scorpio: "Mira hasta el fondo y no aparta la vista.",
  Sagittarius: "Se va lejos y vuelve con algo.",
  Capricorn: "Juega a largo y gana tarde.",
  Aquarius: "No le vale porque sí.",
  Pisces: "Se entera de cosas que nadie ha dicho.",
};

/**
 * The 45 calendar days where the Sun changes sign (see src/sunsign.ts).
 * On those days the flow MUST NOT name a class — this line goes instead, and
 * the reveal at the end does the naming once the real chart exists.
 */
export const CUSPIDE_ES =
  "Ese día el Sol estaba cambiando de signo. Tu hora decide de qué lado caes.";

/**
 * The reveal. `{coords}`, `{ciudad}` and `{fecha}` are filled from the
 * person's own answers — a progress bar that echoes back your city reads as
 * real computation in a way a spinner cannot.
 *
 * Every line names something that GENUINELY RUNS. Do not add invented stats
 * like "calculando nivel de carisma" (spec decision 7): the product does not
 * compute carisma, and this is the surface that has to look honest.
 */
export const DIAL_ES: readonly string[] = [
  "Fijando tus coordenadas: {coords}",
  "Comprobando qué hora era de verdad en {ciudad} el {fecha}",
  "Calculando las posiciones de los planetas",
  "Levantando las doce casas",
  "Midiendo los ángulos entre ellos",
  "Comparando tus elementos con 8.000 cartas",
];

/** Printed on the card when the hour was skipped (spec decision 8). */
export const HORA_DESCONOCIDA_ES =
  "Sin la hora exacta no podemos fijar esto. Está en tu partida de nacimiento.";

export const ERRORES_ES = {
  lugarVacio: "No encontramos ese sitio. Prueba con el municipio más cercano.",
  conexion: "No hemos podido conectar. Inténtalo otra vez.",
  datos: "Hay algo que no cuadra en ese dato.",
  lectura: "La lectura no ha llegado. Tu carta está bien, solo falta el texto.",
};
