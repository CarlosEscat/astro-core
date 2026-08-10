/**
 * Per-section battery. NOT part of `npm test` — it costs money and needs the
 * network. Measures the decision recorded in HANDOVER Addendum 10: whether
 * DeepSeek V4 Pro under per-section briefing holds quality against Kimi's
 * single-call baseline (2297-2630 words, 367-454 in section 5, $0.218-0.481,
 * ~5 minutes).
 *
 *   npx tsx --env-file=.env.local scripts/battery-sections.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { computeNatalChart } from "../src/chart";
import { resolveBirthUtc } from "../src/birthtime";
import { buildSectionMessages, composeReport, parseReport, SECTION_TITLES } from "../src/report";
import { allocateFeatures } from "../src/allocate";
import { briefFor } from "../src/sections";
import { repair, validateSection } from "../src/validate";
import type { NatalChart } from "../src/types";

const PRIMARY = "deepseek/deepseek-v4-pro";
const ESCALATION = "moonshotai/kimi-k3";
const PRIMARY_ATTEMPTS = 2;
/**
 * Both are reasoning models, and the whole HANDOVER lesson on this is that they
 * return HTTP 200 with EMPTY content when the budget runs out before they start
 * emitting (Kimi went empty at 24000 on the canary, then succeeded at 40000).
 * A 350-word section needs ~500 tokens; everything above that is reasoning
 * headroom, and headroom is free — you are billed for tokens used, not for the
 * budget. Do not lower these to "what the section needs".
 */
const MAX_TOKENS_PRIMARY = 16000;
const MAX_TOKENS_ESCALATION = 40000;
const OUT = "bakeoff-out/sections";

function chartFor(
  local: { year: number; month: number; day: number; hour: number; minute: number },
  latitude: number, longitude: number,
): NatalChart {
  const { utc } = resolveBirthUtc(local, latitude, longitude);
  return computeNatalChart({ utc, latitude, longitude });
}

const CASES = [
  { name: "madrid-1992", chart: chartFor({ year: 1992, month: 4, day: 15, hour: 10, minute: 30 }, 40.4168, -3.7038) },
  { name: "buenosaires-1985", chart: chartFor({ year: 1985, month: 11, day: 2, hour: 11, minute: 20 }, -34.6037, -58.3816) },
  // The canary. Leo Sun/Venus drags Spanish toward feminine participles.
  { name: "bilbao-2000", chart: chartFor({ year: 2000, month: 7, day: 30, hour: 4, minute: 15 }, 43.263, -2.935) },
];

interface Outcome {
  body: string;
  model: string;
  attempts: number;
  cost: number;
  seconds: number;
  genderMarks: string[];
}

interface CallResult {
  text: string;
  cost: number;
  /** Everything needed to diagnose an empty completion without re-running it. */
  diagnostics: string;
}

async function call(model: string, messages: unknown, maxTokens: number): Promise<CallResult> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: maxTokens }),
  });
  if (!res.ok) {
    return { text: "", cost: 0, diagnostics: `HTTP ${res.status}: ${(await res.text()).slice(0, 200)}` };
  }
  const data = await res.json();
  const choice = data.choices?.[0];
  const u = data.usage ?? {};
  // Never trust status alone — reasoning models return 200 with empty content.
  // The 2026-08-08 run logged only "VACÍO" and could not afterwards tell budget
  // exhaustion (finish_reason "length") from a provider fault ("stop", no
  // content), nor which host served it. Log it all, every call.
  return {
    text: choice?.message?.content ?? "",
    cost: u.cost ?? 0,
    diagnostics:
      `finish=${choice?.finish_reason}/${choice?.native_finish_reason ?? "?"}` +
      ` provider=${data.provider ?? "?"}` +
      ` prompt=${u.prompt_tokens} completion=${u.completion_tokens}` +
      ` reasoning=${u.completion_tokens_details?.reasoning_tokens ?? "?"}` +
      ` $${u.cost ?? "?"}`,
  };
}

async function generateSection(
  chart: NatalChart,
  section: number,
  allocation: ReturnType<typeof allocateFeatures>,
  priorOpenings?: string[],
): Promise<Outcome> {
  const brief = briefFor(section);
  const messages = buildSectionMessages({ chart, section, allocation, priorOpenings });
  const started = Date.now();
  let cost = 0;

  for (let attempt = 1; attempt <= PRIMARY_ATTEMPTS + 1; attempt++) {
    const escalated = attempt > PRIMARY_ATTEMPTS;
    const model = escalated ? ESCALATION : PRIMARY;
    const { text, cost: c, diagnostics } = await call(
      model, messages, escalated ? MAX_TOKENS_ESCALATION : MAX_TOKENS_PRIMARY,
    );
    cost += c;
    const seconds = (Date.now() - started) / 1000;

    if (!text.trim()) {
      console.log(`    ${brief.title} intento ${attempt} (${model}) VACÍO · ${diagnostics}`);
      continue;
    }

    const body = repair(text.trim());
    const verdict = validateSection(body, brief, chart);
    // Only empty or truncated output justifies another call. A long section is
    // accepted and logged: escalating over word count is what made the
    // 2026-08-10 run slower and dearer than the single call it replaced, and
    // on buenosaires it lost the report outright when Kimi overshot as well.
    if (verdict.fatal.length === 0) {
      if (!verdict.ok) console.log(`    ${brief.title} aceptada con aviso: ${verdict.problems.join("; ")}`);
      return { body, model, attempts: attempt, cost, seconds, genderMarks: verdict.genderMarks };
    }
    console.log(
      `    ${brief.title} intento ${attempt} (${model}) rechazado: ${verdict.fatal.join("; ")} · ${diagnostics}`,
    );
  }
  return {
    body: "", model: "", attempts: PRIMARY_ATTEMPTS + 1, cost,
    seconds: (Date.now() - started) / 1000, genderMarks: [],
  };
}

async function main() {
  if (!process.env.OPENROUTER_API_KEY) {
    console.error("Falta OPENROUTER_API_KEY (usa --env-file=.env.local)");
    process.exit(1);
  }
  mkdirSync(OUT, { recursive: true });

  for (const c of CASES) {
    console.log(`\n=== ${c.name} ===`);
    const started = Date.now();
    const allocation = allocateFeatures(c.chart);

    // Wave 1: sections 0-6 concurrently.
    const wave1 = await Promise.all(
      [0, 1, 2, 3, 4, 5, 6].map((s) => generateSection(c.chart, s, allocation)),
    );
    // Wave 2: the synthesis, fed the first sentence of each earlier section.
    // It cannot run in wave 1: it is a synthesis of the other seven.
    const openings = wave1.map((o) => (o.body.match(/^[\s\S]*?[.!?…](?=\s|$)/)?.[0] ?? "").trim());
    const wave2 = await generateSection(c.chart, 7, allocation, openings);

    const all = [...wave1, wave2];
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    const cost = all.reduce((s, o) => s + o.cost, 0);
    const escalated = all.filter((o) => o.model === ESCALATION).length;
    const marks = all.flatMap((o) => o.genderMarks);
    const missing = all.filter((o) => !o.body).length;

    console.log(`  ${seconds}s · $${cost.toFixed(4)} · escalados a Kimi: ${escalated}/8`);
    all.forEach((o, i) => console.log(
      `    ${i}. ${SECTION_TITLES[i]} — ` +
      (o.body ? `${o.body.split(/\s+/).filter(Boolean).length} palabras` : "SIN GENERAR") +
      `, ${o.attempts} intento(s), ${o.model || "—"}, ${o.seconds.toFixed(1)}s`,
    ));

    if (missing) {
      console.log(`  ${missing} secciones sin generar — informe incompleto, no se escribe`);
      continue;
    }

    const markdown = composeReport(all.map((o) => o.body));
    writeFileSync(`${OUT}/${c.name}.md`, markdown);
    const parsed = parseReport(markdown);

    console.log(`  parseReport: ${parsed ? `OK, ${parsed.wordCount} palabras` : "NULL"}`);
    console.log(`  marcas de género registradas: ${marks.length}${marks.length ? ` (${marks.slice(0, 5).join(", ")})` : ""}`);
  }
  console.log(`\nInformes en ${OUT}/ — léelos antes de dar esto por bueno.`);
}

main();
