import type { Body, NatalChart } from "./types";

/**
 * Mechanical output gate. Every check is verifiable against the chart or the
 * text alone — no LLM judgment involved. On failure the caller should retry
 * (a retry costs a fraction of a cent) then flag.
 */
export interface Validation {
  ok: boolean;
  problems: string[];
}

export interface ProseOptions {
  minWords: number;
  maxWords: number;
}

const TEASER_RANGE: ProseOptions = { minWords: 110, maxWords: 175 };

const PLANET_TO_BODY: Record<string, Body> = {
  sol: "Sun", luna: "Moon", mercurio: "Mercury", venus: "Venus", marte: "Mars",
  "júpiter": "Jupiter", jupiter: "Jupiter", saturno: "Saturn", urano: "Uranus",
  neptuno: "Neptune", "plutón": "Pluto", pluton: "Pluto",
};

const ASPECT_ES: Record<string, string> = {
  "conjunción": "conjunction", conjuncion: "conjunction",
  "oposición": "opposition", oposicion: "opposition",
  cuadratura: "square",
  "trígono": "trine", trigono: "trine", trino: "trine",
  sextil: "sextile",
};

// Gendered agreement aimed at the reader. Sentences about planets can trip
// these too ("una Luna que necesita ser vista") — acceptable: a false
// positive costs one cheap retry, a false negative ships a gendered teaser.
const GENDERED_PATTERNS = [
  /\b(?:t[uú]|ti|s[ií])\s+mism[oa]\b/iu,
  /\b(?:ser|estar|verte|sentirte|sentirse|saberte|mostrarte)\s+(?:\p{L}+(?:ad|id)|vist|hech|dich|puest|abiert|escrit|vuelt|satisfech)[oa]s?\b/iu,
];

function sentencesOf(text: string): string[] {
  return text.split(/(?<=[.!?…])\s+/);
}

function planetsIn(fragment: string): string[] {
  const lower = fragment.toLowerCase();
  const found = new Set<string>();
  for (const [es, en] of Object.entries(PLANET_TO_BODY)) {
    if (new RegExp(`\\b${es}\\b`, "u").test(lower)) found.add(en);
  }
  return [...found];
}

/** The original teaser gate, unchanged in behaviour. */
export function validateTeaser(text: string, chart: NatalChart): Validation {
  return validateProse(text, chart, TEASER_RANGE);
}

export function validateProse(
  text: string,
  chart: NatalChart,
  opts: ProseOptions,
): Validation {
  const problems: string[] = [];
  const trimmed = text.trim();

  const words = trimmed.split(/\s+/).filter(Boolean).length;
  if (words < opts.minWords || words > opts.maxWords) {
    problems.push(`${words} palabras (rango ${opts.minWords}-${opts.maxWords})`);
  }

  if (!/[.!?…»")]$/.test(trimmed)) {
    problems.push("texto truncado: no termina en puntuación final");
  }

  for (const pattern of GENDERED_PATTERNS) {
    const m = trimmed.match(pattern);
    if (m) problems.push(`posible marca de género: "${m[0]}"`);
  }

  // "retrógrado" may only follow a planet whose retrograde flag is true.
  const retro = new Set<string>(
    chart.planets.filter((p) => p.retrograde).map((p) => p.body),
  );
  for (const m of trimmed.matchAll(/((?:\p{L}+[\s,]+){1,4})retr[oó]grad[oa]s?/giu)) {
    for (const planet of planetsIn(m[1])) {
      if (!retro.has(planet)) {
        problems.push(`retrogradación inventada: ${planet} no está retrógrado`);
      }
    }
  }

  // An aspect keyword in a sentence naming exactly two planets must match a
  // real aspect of that type between them. Other counts are unattributable.
  for (const sentence of sentencesOf(trimmed)) {
    const types = Object.entries(ASPECT_ES)
      .filter(([es]) => new RegExp(`\\b${es}\\b`, "iu").test(sentence))
      .map(([, en]) => en);
    if (types.length === 0) continue;
    const mentioned = planetsIn(sentence);
    if (mentioned.length !== 2) continue;
    const [p1, p2] = mentioned;
    const matches = chart.aspects.some(
      (a) =>
        types.includes(a.type) &&
        ((a.a === p1 && a.b === p2) || (a.a === p2 && a.b === p1)),
    );
    if (!matches) {
      problems.push(`aspecto no presente en la carta: ${p1}-${p2} (${types.join("/")})`);
    }
  }

  return { ok: problems.length === 0, problems };
}
