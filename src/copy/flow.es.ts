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

export const NOMBRE_ES = {
  /** `{nombre}` is replaced with what they typed. */
  conNombre: "Vale, {nombre}. Vamos a ver quién eres.",
  sinNombre: "Sin nombre, entonces. Igual funciona.",
};

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

export interface HourBucket {
  /** Exclusive upper bound, 0-24. */
  untilHour: number;
  linea: string;
}

/**
 * Question 3's reaction. Qualitative on purpose: the place is not known yet,
 * so the Ascendant cannot be computed. These say that the hour matters
 * without claiming to know where it lands.
 */
export const HORA_ES: HourBucket[] = [
  { untilHour: 6, linea: "De madrugada. El cielo estaba en su punto más callado." },
  { untilHour: 9, linea: "Al amanecer. El horizonte se movía deprisa a esa hora." },
  { untilHour: 13, linea: "Por la mañana, con el Sol subiendo por el lado que se ve." },
  { untilHour: 17, linea: "Con el Sol arriba, en la parte más pública del cielo." },
  { untilHour: 21, linea: "Por la tarde. El cielo empezaba a darse la vuelta." },
  { untilHour: 24, linea: "Casi de noche. Eso empuja tu Ascendente al otro extremo." },
];

/**
 * "HH:MM" → the line for its bucket. Anything unparseable gets the last
 * bucket rather than undefined: a missing reaction breaks the flow, a
 * slightly wrong one does not.
 */
export function horaReaccion(time: string): string {
  const hour = Number(time.slice(0, 2));
  const bucket = Number.isFinite(hour)
    ? HORA_ES.find((b) => hour < b.untilHour)
    : undefined;
  return (bucket ?? HORA_ES[HORA_ES.length - 1]).linea;
}

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
