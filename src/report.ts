import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { NatalChart } from "./types";
import { relationshipProfile, selectFeature } from "./profile";
import { AREA_ES } from "./copy/areas.es";
import { SIGN_ES } from "./copy/signs.es";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export type Focus = "amor" | "trabajo" | "general";

export interface ReportRequest {
  chart: NatalChart;
  /** First name only — never surname, email, or birth data. */
  firstName?: string;
  focus?: Focus;
  /**
   * Which chart feature the free reading writes about, by rank. Retries walk
   * this forward: a feature that trips the gender gate trips it every time,
   * so re-rolling the model on the same feature is wasted latency.
   */
  featureIndex?: number;
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

/**
 * Prompts are composed, not copy-pasted: the universal rules drifted between
 * files once already. A prompt opts in by putting {{RULES}} on its own line.
 */
function loadPrompt(name: string): string {
  const body = readFileSync(join(ROOT, "prompts", name), "utf8");
  if (!body.includes("{{RULES}}")) return body;
  const rules = readFileSync(join(ROOT, "prompts", "rules-universal.md"), "utf8");
  return body.replace("{{RULES}}", rules.trim());
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

export interface FreeReading {
  apertura: string;
  amor: string;
  /** First line of the love block — the screenshot unit. */
  hook: string;
}

/** Everything the model learns about the relationship axis, in plain Spanish. */
function loveFacts(chart: NatalChart) {
  const p = relationshipProfile(chart);
  const phrase = (t: string) =>
    t === "conjunction" ? "van pegados"
    : t === "opposition" || t === "square" ? "tiran cada uno para un lado"
    : "van de la mano";
  return {
    como_quieres: { planeta: "tu Venus", signo: SIGN_ES[p.venus.sign], zona: AREA_ES[p.venus.house] },
    a_quien_buscas: {
      signo: SIGN_ES[p.descendant.sign],
      nota: "es el signo que tienes justo enfrente: el tipo de persona hacia la que miras",
    },
    quien_manda_en_tus_relaciones: {
      signo: SIGN_ES[p.rulerOfSeventh.sign],
      zona: AREA_ES[p.rulerOfSeventh.house],
    },
    que_persigues: { planeta: "tu Marte", signo: SIGN_ES[p.mars.sign], zona: AREA_ES[p.mars.house] },
    // Only the relation phrase, never which planets: naming them invites the
    // model to attach the relation to the wrong pair. If the prose ever reads
    // too vague, add plain planet names — never aspect names.
    tensiones: [...p.venusAspects, ...p.marsAspects].map((a) => ({
      relacion: phrase(a.type),
    })),
  };
}

export function buildFreeMessages(req: ReportRequest): ChatMessage[] {
  const parts = [
    `rasgo:\n${JSON.stringify(selectFeature(req.chart, req.featureIndex ?? 0).payload)}`,
    `amor:\n${JSON.stringify(loveFacts(req.chart))}`,
  ];
  if (req.firstName) parts.push(`Nombre de pila: ${sanitizeName(req.firstName)}`);
  parts.push("Escribe ahora los dos bloques.");

  return [
    { role: "system", content: loadPrompt("system-free.md") },
    { role: "user", content: parts.join("\n\n") },
  ];
}

export function parseFree(markdown: string): FreeReading | null {
  const a = markdown.match(/#{1,3}\s*APERTURA\s*([\s\S]*?)(?=#{1,3}\s*AMOR|$)/i);
  const l = markdown.match(/#{1,3}\s*AMOR\s*([\s\S]*)$/i);
  if (!a || !l) return null;
  const apertura = a[1].trim();
  const amor = l[1].trim();
  if (!apertura || !amor) return null;
  return { apertura, amor, hook: firstSentence(amor) };
}

/**
 * The screenshot unit is one sentence, not one line. The model does not
 * reliably break the line after the hook — when it returns the love block as a
 * single paragraph, taking the first line hands the UI the whole block as a
 * display quote and leaves the body empty.
 */
function firstSentence(text: string): string {
  const line = text.split(/\n+/)[0].trim();
  const end = line.match(/^[\s\S]*?[.!?…](?=\s|$)/);
  return (end ? end[0] : line).trim();
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
 * The mechanical output gate lives in ./validate. Re-exported here because
 * callers (and tests) have always reached for it through this module.
 */
export { validateTeaser, validateProse } from "./validate";
export type { Validation, ProseOptions } from "./validate";

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
