// Type-only: report.ts imports briefFor from here, so a value import would
// close a runtime cycle. Nothing in this file needs the titles at runtime.
import type { SECTION_TITLES, Focus } from "./report";

/**
 * The eight section briefs, lifted from `# Estructura del informe` in
 * prompts/system-report.md. The content is unchanged — only its location and
 * shape are: per-section generation needs each brief addressable on its own,
 * with its word range as numbers rather than as a sentence the model has to
 * parse out of prose.
 */
export interface SectionBrief {
  index: number;
  title: (typeof SECTION_TITLES)[number];
  minWords: number;
  maxWords: number;
  /** What this section must cover, in Spanish, as it reaches the model. */
  brief: string;
  /** The focus that makes this section grow, and the ceiling it grows to. */
  growsOn?: Focus;
  grownMax?: number;
}

export const SECTION_BRIEFS: SectionBrief[] = [
  {
    index: 0, title: "Tu retrato esencial", minWords: 250, maxWords: 300,
    brief:
      "El gancho del informe. Teje Sol, Luna y Ascendente en un retrato " +
      "unificado que produzca el efecto \"¿cómo lo sabe?\". Abre con la " +
      "tensión o la armonía más llamativa entre los tres. No los describas " +
      "por separado: describe cómo conviven.",
  },
  {
    index: 1, title: "El corazón de tu identidad", minWords: 250, maxWords: 300,
    brief:
      "Tu Sol: signo, casa y los aspectos que se te asignan abajo. Qué te da " +
      "vida, dónde brillas, qué te apaga.",
  },
  {
    index: 2, title: "Tu mundo emocional", minWords: 250, maxWords: 300,
    brief:
      "Tu Luna. Cómo sientes, qué necesitas para sentirte en casa, cómo " +
      "reaccionas cuando algo te duele.",
  },
  {
    index: 3, title: "La puerta por la que entras al mundo", minWords: 200, maxWords: 250,
    brief:
      "Tu Ascendente y su regente si su posición está en el JSON. La primera " +
      "impresión que causas y el papel que la vida te invita a ensayar.",
  },
  {
    // 350-480, not the 300-350 the prompt file carried. That range was never
    // achievable: this brief asks for four distinct beats, and the section
    // overshot it on every chart and every model — 348-563 on the 2026-08-10
    // per-section battery, 367-454 and 394-431 under the old single-call
    // architecture (Addenda 7 and 8). The range now says what four beats cost.
    index: 4, title: "Amor y vínculos", minWords: 350, maxWords: 480,
    growsOn: "amor", grownMax: 600,
    brief:
      "La lectura gratuita ya le ha dado tres cosas: su Venus por signo y por " +
      "zona de la vida, su Descendente, y los signos con los que mejor encaja. " +
      "No las repitas: aquí vas más hondo. Cubre, en prosa continua y no como " +
      "lista: el patrón que se repite de una relación a otra y en qué momento " +
      "se tuerce siempre; los aspectos duros que se te asignan abajo leídos " +
      "como dinámicas entre dos personas y nunca como etiquetas; la distancia " +
      "entre lo que dice buscar en voz alta y a quién elige de hecho; la casa " +
      "ocho y la Luna, la intimidad y qué necesita para soltar del todo. " +
      "Cierra explicando cómo se trabaja ese patrón, con agencia.",
  },
  {
    index: 5, title: "Vocación y propósito", minWords: 300, maxWords: 350,
    growsOn: "trabajo", grownMax: 450,
    brief:
      "Medio Cielo, casa diez, Saturno y los planetas en casas dos, seis y " +
      "diez. Hacia dónde apunta tu ambición, qué estilo de trabajo te " +
      "sostiene, qué reconocimiento buscas.",
  },
  {
    index: 6, title: "Tus luces y tus sombras", minWords: 300, maxWords: 350,
    brief:
      "Los aspectos que se te asignan abajo, leídos en profundidad. Cada " +
      "tensión presentada con su regalo: qué fuerza esconde y cómo se canaliza.",
  },
  {
    index: 7, title: "Claves para tu camino", minWords: 200, maxWords: 250,
    brief:
      "Síntesis final. Tres hilos concretos que unan las secciones anteriores, " +
      "formulados como invitaciones prácticas, no como órdenes ni promesas. " +
      "Te doy la primera frase de cada sección anterior para que hiles sin " +
      "repetirlas. Cierra con una frase memorable propia de esta carta.",
  },
];

export function briefFor(index: number, focus?: Focus): SectionBrief {
  const base = SECTION_BRIEFS[index];
  if (!base) throw new RangeError(`No existe la sección ${index}`);
  if (focus && base.growsOn === focus && base.grownMax) {
    return { ...base, maxWords: base.grownMax };
  }
  return base;
}
