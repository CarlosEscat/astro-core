import type { Body, NatalChart } from "./types";
import { SIGN_ES } from "./copy/signs.es";

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
  /** Set when the block legitimately carries its own heading. */
  allowHeading?: boolean;
  /**
   * Set for a complete block of prose, where stopping mid-sentence means the
   * generation was cut off. Off for fragments, which legitimately have no
   * closing punctuation.
   */
  requireTerminalPunctuation?: boolean;
  /**
   * Escape hatch for the legacy teaser, whose prompt still permits aspect
   * vocabulary. The free reading never sets this: it is handed no jargon, so
   * any jargon in its output means the model reached past the facts it was
   * given.
   */
  allowJargon?: boolean;
}

const TEASER_RANGE: ProseOptions = {
  minWords: 110,
  maxWords: 175,
  requireTerminalPunctuation: true,
  allowJargon: true,
};

/**
 * Words the reader does not know. The prose layer never receives any of these,
 * so their presence means the model reached for training data instead of the
 * facts it was handed.
 */
const JARGON = [
  "conjunción", "conjuncion", "oposición", "oposicion", "cuadratura",
  "trígono", "trigono", "sextil", "aspecto", "orbe", "regente", "regir",
  "domicilio", "exaltación", "retrógrad", "retrograd", "cúspide", "cuspide",
  "tránsito", "transito", "efeméride", "efemeride", "modalidad",
];

/** Model tics and any sample phrasing that has leaked out of a prompt. */
const CLICHES = [
  "casi telep", "una danza", "un pozo de", "coraza", "montaña rusa",
  "media naranja", "alma gemela", "energía magnética", "sin filtro",
  "fuegos artificiales", "llegue puntual", "eres de los que",
];

/**
 * Reader-directed constructions that force gender agreement. A false positive
 * costs one cheap retry; a false negative ships a gendered reading.
 */
const GENDERED_READER = [
  /\b(?:t[uú]|ti|s[ií])\s+mism[oa]\b/iu,
  /\b(?:ser|estar|verte|sentirte|sentirse|saberte|mostrarte)\s+(?:\p{L}+(?:ad|id)|vist|hech|dich|puest|abiert|escrit|vuelt|satisfech)[oa]s?\b/iu,
  // The gerund exclusion is load-bearing: -ando/-iendo never carries gender,
  // and without it every "estás buscando" burns a retry. Mirrored in
  // tests/copy.test.ts so hand-written copy is held to the same standard.
  /\b(?:eres|seas|fueras|ser[íi]as|est[áa]s|estabas|te\s+sientes|te\s+ves)\s+(?:m[áa]s\s+|muy\s+|tan\s+|un[ao]\s+|demasiado\s+)?(?!\p{L}*(?:ando|iendo)\b)\p{L}{4,}[oa]\b/iu,
  /\bte\s+(?:hace|vuelve|convierte)\s+(?:en\s+)?(?:m[áa]s\s+)?\p{L}+[oa]\b/iu,
];

const GENDERED_PARTNER = [
  /\btu\s+(?:chico|chica|marido|mujer|novio|novia|pareja\s+\p{L}+[oa])\b/iu,
  /\bquien\s+(?:se\s+)?\p{L}+\s+(?:envuelto|envuelta|comprendido|comprendida|amado|amada|perdido|perdida)\b/iu,
];

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

/**
 * Literal, deterministic rewrites of stock gendered phrasing. Applied before
 * the gate so a known slip costs no retry. Whitelist only: if a phrasing is
 * not on this list it goes to the gate untouched and gets rejected there.
 */
const REPAIRS: Array<[RegExp, string]> = [
  [/\bque\s+eres\s+[úu]nic[ao]\b/giu, "que no hay nadie como tú"],
  [/\beres\s+[úu]nic[ao]\b/giu, "no hay nadie como tú"],
  [/\bser\s+vist[ao]\b/giu, "que te miren"],
  [/\bser\s+admirad[ao]\b/giu, "que te admiren"],
  [/\bser\s+reconocid[ao]\b/giu, "que te reconozcan"],
  [/\bsentirte\s+querid[ao]\b/giu, "que te quieran"],
  [/\bsentirte\s+comprendid[ao]\b/giu, "que te entiendan"],
  [/\bni\s+t[úu]\s+mism[ao]\b/giu, "ni tú"],
  [/\beres\s+de\s+los\s+que\b/giu, "eres de quienes"],
];

export function repair(text: string): string {
  let out = text;
  for (const [re, replacement] of REPAIRS) out = out.replace(re, replacement);
  return out;
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

  if (opts.requireTerminalPunctuation && !/[.!?…»")]$/.test(trimmed)) {
    problems.push("texto truncado: no termina en puntuación final");
  }

  const lower = trimmed.toLowerCase();

  if (!opts.allowJargon) {
    for (const word of JARGON) {
      if (lower.includes(word)) problems.push(`jerga prohibida: "${word}"`);
    }
    if (/\bcasa\s*\d/i.test(trimmed)) problems.push("jerga prohibida: casa numerada");
  }

  for (const phrase of CLICHES) {
    if (lower.includes(phrase)) problems.push(`cliché prohibido: "${phrase}"`);
  }

  for (const re of GENDERED_READER) {
    const m = trimmed.match(re);
    if (m) problems.push(`marca de género: "${m[0]}"`);
  }
  for (const re of GENDERED_PARTNER) {
    const m = trimmed.match(re);
    if (m) problems.push(`género de la pareja: "${m[0]}"`);
  }

  if (!opts.allowHeading && /^\s*#{1,3}\s/m.test(trimmed)) {
    problems.push("encabezado emitido: la interfaz ya pone el título");
  }

  // A named sign must be the sign that planet actually occupies.
  const signClaim = /\b(?:tu\s+)?(Sol|Luna|Mercurio|Venus|Marte|J[úu]piter|Saturno|Urano|Neptuno|Plut[óo]n)\s+en\s+(\p{Lu}\p{L}+)/giu;
  for (const m of trimmed.matchAll(signClaim)) {
    const body = PLANET_TO_BODY[m[1].toLowerCase()];
    if (!body) continue;
    const actual = chart.planets.find((p) => p.body === body);
    if (!actual) continue;
    const actualEs = SIGN_ES[actual.sign];
    const claimed = m[2];
    // Only judge words that are actually sign names; "Venus en casa" is caught above.
    const isSignName = Object.values(SIGN_ES)
      .some((s) => s.toLowerCase() === claimed.toLowerCase());
    if (isSignName && claimed.toLowerCase() !== actualEs.toLowerCase()) {
      problems.push(`signo falso: ${m[1]} está en ${actualEs}, el texto dice ${claimed}`);
    }
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
