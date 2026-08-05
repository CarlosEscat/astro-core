import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { NatalChart } from "./types";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export type Focus = "amor" | "trabajo" | "general";

export interface ReportRequest {
  chart: NatalChart;
  /** First name only — never surname, email, or birth data. */
  firstName?: string;
  focus?: Focus;
}

export interface ChatMessage {
  role: "system" | "user";
  content: string;
}

/** Strip fields the LLM doesn't need — smaller prompt, zero extra info. */
function chartForLLM(chart: NatalChart): object {
  return {
    houseSystem: chart.houseSystem,
    houseSystemFallback: chart.houseSystemFallback,
    planets: chart.planets.map(({ body, sign, signDegree, house, retrograde }) => ({
      body, sign, degree: Math.round(signDegree * 10) / 10, house, retrograde,
    })),
    angles: {
      ascendant: pick(chart.angles.ascendant),
      midheaven: pick(chart.angles.midheaven),
      descendant: pick(chart.angles.descendant),
    },
    houses: chart.houses.map(({ house, sign, signDegree }) => ({
      house, sign, degree: Math.round(signDegree * 10) / 10,
    })),
    // Cap at 12 aspects — enough material, keeps focus on the exact ones.
    aspects: chart.aspects.slice(0, 12),
  };
}

function pick(c: { sign: string; signDegree: number }) {
  return { sign: c.sign, degree: Math.round(c.signDegree * 10) / 10 };
}

function loadPrompt(name: string): string {
  return readFileSync(join(ROOT, "prompts", name), "utf8");
}

export function buildReportMessages(req: ReportRequest): ChatMessage[] {
  const parts = [
    `Carta natal (JSON):\n${JSON.stringify(chartForLLM(req.chart))}`,
  ];
  if (req.firstName) parts.push(`Nombre de pila: ${sanitizeName(req.firstName)}`);
  parts.push(`Enfoque elegido: ${req.focus ?? "general"}`);
  parts.push("Escribe ahora el informe completo siguiendo la estructura exacta.");

  return [
    { role: "system", content: loadPrompt("system-report.md") },
    { role: "user", content: parts.join("\n\n") },
  ];
}

export function buildTeaserMessages(req: ReportRequest): ChatMessage[] {
  const parts = [
    `Carta natal (JSON):\n${JSON.stringify(chartForLLM(req.chart))}`,
  ];
  if (req.firstName) parts.push(`Nombre de pila: ${sanitizeName(req.firstName)}`);
  parts.push("Escribe ahora la mini-lectura.");

  return [
    { role: "system", content: loadPrompt("system-teaser.md") },
    { role: "user", content: parts.join("\n\n") },
  ];
}

/** Defense-in-depth: a "first name" field is user input; keep it a name. */
function sanitizeName(raw: string): string {
  const cleaned = raw.replace(/[^\p{L}\p{M}' -]/gu, "").trim().slice(0, 40);
  return cleaned || "";
}

/**
 * Parse the report into its eight sections for rendering (web + PDF).
 * Returns null if the model broke the structure — caller should retry once.
 */
export const SECTION_TITLES = [
  "Tu retrato esencial",
  "El corazón de tu identidad",
  "Tu mundo emocional",
  "La puerta por la que entras al mundo",
  "Amor y vínculos",
  "Vocación y propósito",
  "Tus luces y tus sombras",
  "Claves para tu camino",
] as const;

export interface ParsedReport {
  sections: Array<{ title: string; body: string }>;
  wordCount: number;
}

/**
 * Mechanical output gate for teasers. Every check is verifiable against the
 * chart or the text alone — no LLM judgment involved. On failure the caller
 * should retry once (a retry costs a fraction of a cent) then flag.
 */
export interface TeaserValidation {
  ok: boolean;
  problems: string[];
}

const TEASER_MIN_WORDS = 110;
const TEASER_MAX_WORDS = 175;

const PLANET_ES: Record<string, string> = {
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
  for (const [es, en] of Object.entries(PLANET_ES)) {
    if (new RegExp(`\\b${es}\\b`, "u").test(lower)) found.add(en);
  }
  return [...found];
}

export function validateTeaser(text: string, chart: NatalChart): TeaserValidation {
  const problems: string[] = [];
  const trimmed = text.trim();

  const words = trimmed.split(/\s+/).filter(Boolean).length;
  if (words < TEASER_MIN_WORDS || words > TEASER_MAX_WORDS) {
    problems.push(`${words} palabras (rango ${TEASER_MIN_WORDS}-${TEASER_MAX_WORDS})`);
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

export function parseReport(markdown: string): ParsedReport | null {
  const sections: Array<{ title: string; body: string }> = [];
  for (let i = 0; i < SECTION_TITLES.length; i++) {
    const title = SECTION_TITLES[i];
    const start = markdown.indexOf(`## ${title}`);
    if (start === -1) return null;
    const from = start + title.length + 3;
    const next =
      i + 1 < SECTION_TITLES.length
        ? markdown.indexOf(`## ${SECTION_TITLES[i + 1]}`, from)
        : markdown.length;
    if (next === -1) return null;
    const body = markdown.slice(from, next).trim();
    if (body.length < 200) return null; // suspiciously short section
    sections.push({ title, body });
  }
  const wordCount = markdown.split(/\s+/).filter(Boolean).length;
  return { sections, wordCount };
}
