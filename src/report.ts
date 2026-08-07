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
