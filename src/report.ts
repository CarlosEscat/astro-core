import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { NatalChart } from "./types";
import type { SectionAllocation } from "./allocate";
import { briefFor } from "./sections";
import { relationshipProfile, selectFeature } from "./profile";
import { AREA_ES } from "./copy/areas.es";
import { SIGN_ES, PLANET_ES } from "./copy/signs.es";
import { RELATION_ES } from "./copy/relations.es";

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
 * files once already. A prompt opts in by putting a placeholder on its own line.
 *
 * Two fragments, because the split is not cosmetic. {{RULES}} holds what every
 * tier owes the reader (grounding, gender, content bans). {{RULES_CHART}} holds
 * the technical-vocabulary rules, and ONLY prompts that receive the raw chart
 * JSON may have it: the free tier is handed pre-translated data precisely so it
 * never learns the jargon, and injecting these rules there would hand back the
 * very words it is forbidden to write.
 */
const FRAGMENTS: Record<string, string> = {
  "{{RULES}}": "rules-universal.md",
  "{{RULES_CHART}}": "rules-chart-data.md",
};

/** HTML comments in a fragment are notes to the next editor, not to the model. */
function fragment(file: string): string {
  return readFileSync(join(ROOT, "prompts", file), "utf8")
    .replace(/<!--[\s\S]*?-->/g, "")
    .trim();
}

function loadPrompt(name: string): string {
  let body = readFileSync(join(ROOT, "prompts", name), "utf8");
  for (const [placeholder, file] of Object.entries(FRAGMENTS)) {
    if (!body.includes(placeholder)) continue;
    body = body.replace(placeholder, fragment(file));
  }
  return body;
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

export interface SectionRequest {
  chart: NatalChart;
  /** 0-7 */
  section: number;
  allocation: SectionAllocation[];
  firstName?: string;
  focus?: Focus;
  /** Section 7 only: the first sentence of each earlier section, in order. */
  priorOpenings?: string[];
}

/**
 * Everything a paid section learns about the chart, already in plain Spanish.
 *
 * This is Addendum 6's governing principle applied to the paid tier: compute
 * the structure, hand over one translated thing. The model cannot write a house
 * number it never receives, cannot name an aspect it is never given, and cannot
 * misstate an orb it never sees — which retires the invented retrogradation and
 * the 1.29° "oposición exacta" that Addendum 12 found already delivered, rather
 * than detecting them after the fact.
 *
 * Planets and signs survive because both tiers keep them: they are the two
 * words every reader already owns.
 */
function sectionFacts(chart: NatalChart, mine: SectionAllocation) {
  const place = (p: NatalChart["planets"][number]) => ({
    planeta: `tu ${PLANET_ES[p.body]}`,
    signo: SIGN_ES[p.sign],
    zona: AREA_ES[p.house],
  });

  return {
    posiciones: chart.planets.map(place),
    asciende_en: SIGN_ES[chart.angles.ascendant.sign],
    cara_publica_en: SIGN_ES[chart.angles.midheaven.sign],
    // Relations carry the phrase and the pair, never the type or the orb.
    tensiones_tuyas: mine.aspects.map((a) => ({
      entre: [`tu ${PLANET_ES[a.a]}`, `tu ${PLANET_ES[a.b]}`],
      relacion: RELATION_ES[a.type],
    })),
    no_son_tuyas: mine.reserved.map((a) => ({
      entre: [`tu ${PLANET_ES[a.a]}`, `tu ${PLANET_ES[a.b]}`],
    })),
  };
}

/**
 * One call per section. The model is handed a single brief, one word range and
 * the aspects it owns, so the things V4 Pro slipped on in the bake-off —
 * structure and length — stop being its job at all.
 */
export function buildSectionMessages(req: SectionRequest): ChatMessage[] {
  const brief = briefFor(req.section, req.focus);
  const mine = req.allocation[req.section];

  const parts = [
    `Datos de la carta, ya en lenguaje llano:\n${JSON.stringify(sectionFacts(req.chart, mine))}`,
    `Sección: ${brief.title}`,
    `Extensión: entre ${brief.minWords} y ${brief.maxWords} palabras.`,
    `Encargo:\n${brief.brief}`,
  ];

  if (mine.reserved.length) {
    parts.push("Los pares que aparecen en `no_son_tuyas` pertenecen a otras secciones: no los desarrolles aquí ni los menciones de pasada.");
  }
  if (req.priorOpenings?.length) {
    parts.push(
      "Primera frase de cada sección anterior, para que hiles sin repetir:\n" +
      req.priorOpenings.map((s, i) => `${i + 1}. ${s}`).join("\n"),
    );
  }
  if (req.firstName) parts.push(`Nombre de pila: ${sanitizeName(req.firstName)}`);
  parts.push("Escribe ahora esa sección, sin encabezado.");

  return [
    { role: "system", content: loadPrompt("system-section.md") },
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

/**
 * Reassemble section bodies into the markdown parseReport understands.
 * A model told not to emit a heading sometimes emits one anyway; stripping it
 * here is cheaper than a retry, and a duplicated heading breaks the parser.
 */
export function composeReport(bodies: string[]): string {
  if (bodies.length !== SECTION_TITLES.length) {
    throw new RangeError(`Se esperaban ${SECTION_TITLES.length} secciones, llegaron ${bodies.length}`);
  }
  return SECTION_TITLES.map((title, i) => {
    const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const body = bodies[i].replace(new RegExp(`^#{1,3}[ \\t]*${escaped}[ \\t]*$`, "im"), "").trim();
    return `## ${title}\n\n${body}`;
  }).join("\n\n");
}

/**
 * A heading on its own line, at any level the model might emit. A literal
 * `indexOf("## " + title)` lost four otherwise-good reports in the bake-off to
 * a model that answered with `#` or `###`; regenerating a paid report over a
 * hash count is not a defensible cost. Requiring the whole line keeps the
 * parser from mistaking a title quoted mid-sentence for a section start.
 */
function headingAt(markdown: string, title: string, from: number) {
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^#{1,3}[ \\t]*${escaped}[ \\t]*$`, "im");
  const m = re.exec(markdown.slice(from));
  return m ? { start: from + m.index, end: from + m.index + m[0].length } : null;
}

export function parseReport(markdown: string): ParsedReport | null {
  const sections: Array<{ title: string; body: string }> = [];
  let cursor = 0;
  for (let i = 0; i < SECTION_TITLES.length; i++) {
    const here = headingAt(markdown, SECTION_TITLES[i], cursor);
    if (!here) return null;
    const next =
      i + 1 < SECTION_TITLES.length
        ? headingAt(markdown, SECTION_TITLES[i + 1], here.end)
        : null;
    if (i + 1 < SECTION_TITLES.length && !next) return null;
    const body = markdown.slice(here.end, next ? next.start : markdown.length).trim();
    if (body.length < 200) return null; // suspiciously short section
    sections.push({ title: SECTION_TITLES[i], body });
    cursor = here.end;
  }
  const wordCount = markdown.split(/\s+/).filter(Boolean).length;
  return { sections, wordCount };
}
