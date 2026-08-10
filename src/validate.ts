import type { Body, NatalChart } from "./types";
import type { FreeReading } from "./report";
import type { SectionBrief } from "./sections";
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
 * End-of-word assertion. JavaScript's `\b` is ASCII-only even under the /u
 * flag: it treats "ñ" and accented vowels as non-word characters and so finds
 * a boundary in the MIDDLE of a Spanish word. On the 2026-08-08 battery that
 * made "te hace soñar" match as the non-word "te hace so" and burn a retry.
 * Never use `\b` after a letter class in this file — use this.
 */
const WORD_END = "(?![\\p{L}\\p{N}])";
/** The same, in front of a word. */
const WORD_START = "(?<![\\p{L}\\p{N}])";

/**
 * Words that legitimately end in -o/-a after one of the verbs below without
 * agreeing with the reader. Same device as NEUTRAL_NOUNS: narrow the rule by
 * naming exceptions, never by weakening the pattern.
 */
const NEUTRAL_AFTER_VERB = "persona|gente|criatura|contigo|conmigo|consigo";
/** Fixed idioms where the -o/-a word is the object, not a predicate. */
const OBJECT_NOUNS = "daño|sombra|compa[ñn][íi]a|gracia|falta|caso|efecto|justicia";

/**
 * Reader-directed constructions that force gender agreement. A false positive
 * costs one cheap retry; a false negative ships a gendered reading.
 */
const GENDERED_READER = [
  new RegExp(`\\b(?:t[uú]|ti|s[ií])\\s+mism[oa]${WORD_END}`, "iu"),
  new RegExp(
    "\\b(?:ser|estar|verte|sentirte|sentirse|saberte|mostrarte)\\s+" +
    `(?:\\p{L}+(?:ad|id)|vist|hech|dich|puest|abiert|escrit|vuelt|satisfech)[oa]s?${WORD_END}`,
    "iu",
  ),
  // Two exclusions, both measured against real model output on the battery:
  //  - gerunds: -ando/-iendo never carries gender, so "estás buscando" is fine;
  //  - NEUTRAL_AFTER_VERB: "persona"/"gente" are feminine in form but neutral
  //    in reference, and are the very forms the rules fragment tells the model
  //    to use. Without this, "no es que seas una persona fría" burns a retry.
  //    "contigo"/"conmigo"/"consigo" are pronouns that merely end in -o, and
  //    "estás contigo" was rejected as a gendered adjective on the battery.
  // Mirrored in tests/copy.test.ts so hand-written copy meets the same standard.
  new RegExp(
    "\\b(?:eres|seas|fueras|ser[íi]as|est[áa]s|estabas|te\\s+sientes|te\\s+ves)\\s+" +
    "(?:m[áa]s\\s+|muy\\s+|tan\\s+|un[ao]\\s+|demasiado\\s+)?" +
    `(?!\\p{L}*(?:ando|iendo)${WORD_END})(?!(?:${NEUTRAL_AFTER_VERB})${WORD_END})` +
    `\\p{L}{4,}[oa]${WORD_END}`,
    "iu",
  ),
  new RegExp(
    "\\bte\\s+(?:hace|vuelve|convierte)\\s+(?:en\\s+)?(?:m[áa]s\\s+)?" +
    `(?!(?:${OBJECT_NOUNS})${WORD_END})\\p{L}+[oa]${WORD_END}`,
    "iu",
  ),
];

const GENDERED_PARTNER = [
  new RegExp(`\\btu\\s+(?:chico|chica|marido|mujer|novio|novia|pareja\\s+\\p{L}+[oa])${WORD_END}`, "iu"),
  new RegExp(
    `\\bquien\\s+(?:se\\s+)?\\p{L}+\\s+(?:envuelto|envuelta|comprendido|comprendida|amado|amada|perdido|perdida)${WORD_END}`,
    "iu",
  ),
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
    // Unicode boundaries, not \b: "solía" ends an ASCII word boundary right
    // after "sol", which made an ordinary verb register as the Sun.
    if (new RegExp(`${WORD_START}${es}${WORD_END}`, "u").test(lower)) found.add(en);
  }
  return [...found];
}

/**
 * Literal, deterministic rewrites of stock gendered phrasing. Applied before
 * the gate so a known slip costs no retry. Whitelist only: if a phrasing is
 * not on this list it goes to the gate untouched and gets rejected there.
 */
const REPAIRS: Array<[RegExp, string]> = ([
  ["que\\s+eres\\s+[úu]nic[ao]", "que no hay nadie como tú"],
  ["eres\\s+[úu]nic[ao]", "no hay nadie como tú"],
  ["ser\\s+vist[ao]", "que te miren"],
  ["ser\\s+admirad[ao]", "que te admiren"],
  ["ser\\s+reconocid[ao]", "que te reconozcan"],
  ["sentirte\\s+querid[ao]", "que te quieran"],
  ["sentirte\\s+comprendid[ao]", "que te entiendan"],
  // "tú mismo/a" and "ti mismo/a" are pure intensifiers: dropping the
  // agreement word costs nothing semantically and saves a ~5 s retry. These
  // were the single most frequent gender rejection on the live battery.
  ["t[úu]\\s+mism[ao]", "tú"],
  ["ti\\s+mism[ao]", "ti"],
  ["eres\\s+de\\s+los\\s+que", "eres de quienes"],
] as Array<[string, string]>).map(
  ([src, to]) => [new RegExp(`${WORD_START}${src}${WORD_END}`, "giu"), to],
);

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
      .filter(([es]) => new RegExp(`${WORD_START}${es}${WORD_END}`, "iu").test(sentence))
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

const APERTURA_RANGE: ProseOptions = {
  minWords: 100, maxWords: 140, requireTerminalPunctuation: true,
};
/**
 * Wider than the prompt asks for: the model overshoots consistently. Measured
 * on the live battery, four-sentence love blocks land at 105-150 words against
 * an 80-110 ask, so 135 is where the gate stops rejecting prose that is merely
 * a little long rather than broken. The screenshot unit is the hook line, not
 * the block, so length past the ask costs the product nothing — whereas each
 * rejection costs ~5 s and risks serving an error page.
 */
const AMOR_RANGE: ProseOptions = {
  minWords: 70, maxWords: 135, requireTerminalPunctuation: true,
};

export interface SectionCheck {
  ok: boolean;
  problems: string[];
  /** Reported, never a rejection reason on the paid tier. */
  genderMarks: string[];
}

/** Every reader-directed gender mark in the text, for logging only. */
export function countGenderMarks(text: string): string[] {
  const found: string[] = [];
  for (const re of GENDERED_READER) {
    const m = text.match(new RegExp(re.source, "giu"));
    if (m) found.push(...m);
  }
  return found;
}

/**
 * Structure only: non-empty, inside the brief's word range with a margin, and
 * finished rather than cut off. No gender, jargon or cliché check — the free
 * tier's gate works because a rejection there costs $0.000375 and can rotate to
 * a different chart feature on retry. Neither is true of a paid section, and
 * extrapolating the free tier's per-block rate across 2,400 words leaves ~5% of
 * reports passing. Marks are counted and logged instead; if the log shows the
 * problem is frequent, the fix is a prompt rule, not a regex.
 */
export function validateSection(text: string, brief: SectionBrief): SectionCheck {
  const problems: string[] = [];
  const trimmed = text.trim();
  const words = trimmed.split(/\s+/).filter(Boolean).length;
  // The free tier measured that models overshoot word budgets consistently;
  // a 15% margin stops a merely-long section costing a paid retry.
  const floor = Math.round(brief.minWords * 0.85);
  const ceiling = Math.round(brief.maxWords * 1.15);

  if (!trimmed) problems.push("sección vacía");
  else {
    if (words < floor || words > ceiling) {
      problems.push(`${words} palabras (rango ${floor}-${ceiling})`);
    }
    if (!/[.!?…]["»)]?$/.test(trimmed)) problems.push("texto truncado: no termina en puntuación final");
  }

  return { ok: problems.length === 0, problems, genderMarks: countGenderMarks(trimmed) };
}

export function validateFree(reading: FreeReading, chart: NatalChart): Validation {
  const a = validateProse(reading.apertura, chart, APERTURA_RANGE);
  const l = validateProse(reading.amor, chart, AMOR_RANGE);
  return {
    ok: a.ok && l.ok,
    problems: [
      ...a.problems.map((p) => `apertura: ${p}`),
      ...l.problems.map((p) => `amor: ${p}`),
    ],
  };
}
