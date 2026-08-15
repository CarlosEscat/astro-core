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
  /**
   * How many paragraphs this section is asked for. Structural counts are
   * obeyed where word budgets are ignored (Addendum 7); this is what stops a
   * section arriving as one 286-word block (Addendum 13).
   *
   * Set against OBSERVED lengths rather than the nominal range: every section
   * overshoots, so a count derived from `maxWords` would under-deliver
   * paragraphs exactly when the section runs long and needs them most.
   */
  paragraphs: readonly [number, number];
  /** Used instead of `paragraphs` when `growsOn` matches the focus. */
  grownParagraphs?: readonly [number, number];
}

export const SECTION_BRIEFS: SectionBrief[] = [
  {
    index: 0, title: "Tu retrato esencial", minWords: 250, maxWords: 300,
    paragraphs: [3, 4],
    brief:
      "El gancho del informe. Teje su Sol, su Luna y su forma de asomarse al " +
      "mundo en un retrato unificado que produzca el efecto \"¿cómo lo sabe?\". " +
      "Abre con la tensión o la armonía más llamativa entre los tres. No los " +
      "describas por separado: describe cómo conviven.",
  },
  {
    index: 1, title: "El corazón de tu identidad", minWords: 250, maxWords: 300,
    paragraphs: [3, 4],
    brief:
      "Su Sol: el signo, la zona de la vida donde cae y las tensiones que se " +
      "te asignan. Qué le da vida, dónde brilla, qué le apaga.",
  },
  {
    index: 2, title: "Tu mundo emocional", minWords: 250, maxWords: 300,
    paragraphs: [3, 4],
    brief:
      "Su Luna. Cómo siente, qué necesita para sentirse en casa, cómo " +
      "reacciona cuando algo le duele.",
  },
  {
    index: 3, title: "La puerta por la que entras al mundo", minWords: 200, maxWords: 250,
    paragraphs: [3, 4],
    brief:
      "Cómo se asoma al mundo: la primera impresión que causa y el papel que " +
      "la vida le invita a ensayar.",
  },
  {
    // 350-480, not the 300-350 the prompt file carried. That range was never
    // achievable: this brief asks for four distinct beats, and the section
    // overshot it on every chart and every model — 348-563 on the 2026-08-10
    // per-section battery, 367-454 and 394-431 under the old single-call
    // architecture (Addenda 7 and 8). The range now says what four beats cost.
    index: 4, title: "Amor y vínculos", minWords: 350, maxWords: 480,
    growsOn: "amor", grownMax: 600,
    paragraphs: [4, 5], grownParagraphs: [5, 6],
    brief:
      "Ve más hondo que una lectura de superficie de su Venus. Cubre, en prosa " +
      "continua y no como lista: el patrón que se repite de una relación a " +
      "otra y en qué momento se tuerce siempre; las tensiones que se te " +
      "asignan leídas como dinámicas entre dos personas y nunca como " +
      "etiquetas; la distancia entre lo que dice buscar en voz alta y a quién " +
      "elige de hecho; la intimidad y qué necesita para soltar del todo. " +
      "Cierra explicando cómo se trabaja ese patrón, con agencia.",
  },
  {
    index: 5, title: "Vocación y propósito", minWords: 300, maxWords: 350,
    growsOn: "trabajo", grownMax: 450,
    paragraphs: [3, 4], grownParagraphs: [4, 5],
    brief:
      "Su cara pública, lo que se le da bien sostener en el día a día y lo que " +
      "construye para que dure. Hacia dónde apunta su ambición, qué estilo de " +
      "trabajo le sostiene, qué reconocimiento busca.",
  },
  {
    // 4-5 paragraphs, not the 3-4 its word range alone would suggest: this is
    // Addendum 13's repeat offender, delivered at 441-454 words in only 2-3
    // paragraphs on all three charts.
    index: 6, title: "Tus luces y tus sombras", minWords: 300, maxWords: 350,
    paragraphs: [4, 5],
    brief:
      "Las tensiones que se te asignan, leídas en profundidad. Cada una " +
      "presentada con su regalo: qué fuerza esconde y cómo se canaliza.",
  },
  {
    // Floor of 3 on a 200-250 range: this is the section that produced the
    // 286-word single block, and a floor of 2 would still permit half of it.
    index: 7, title: "Claves para tu camino", minWords: 200, maxWords: 250,
    paragraphs: [3, 4],
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
    return {
      ...base,
      maxWords: base.grownMax,
      // A longer section needs more paragraphs, not longer ones.
      paragraphs: base.grownParagraphs ?? base.paragraphs,
    };
  }
  return base;
}
