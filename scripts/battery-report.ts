/**
 * Paid-report battery. NOT part of `npm test` — three Kimi K3 reports cost
 * ~$0.65. Confirms section 5 no longer restates the free reading and that
 * parseReport still returns non-null after the brief was rewritten.
 *
 *   npx tsx --env-file=.env.local scripts/battery-report.ts
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { computeNatalChart } from "../src/chart";
import { resolveBirthUtc } from "../src/birthtime";
import { buildReportMessages, parseReport, SECTION_TITLES } from "../src/report";
import type { NatalChart } from "../src/types";

const MODEL = "moonshotai/kimi-k3";
/** Reasoning model: returns EMPTY content at lower budgets. */
const MAX_TOKENS = 24000;
const OUT = "bakeoff-out/section5";

function chartFor(
  local: { year: number; month: number; day: number; hour: number; minute: number },
  latitude: number,
  longitude: number,
): NatalChart {
  const { utc } = resolveBirthUtc(local, latitude, longitude);
  return computeNatalChart({ utc, latitude, longitude });
}

const CASES: Array<{ name: string; chart: NatalChart }> = [
  { name: "madrid-1992", chart: chartFor({ year: 1992, month: 4, day: 15, hour: 10, minute: 30 }, 40.4168, -3.7038) },
  { name: "buenosaires-1985", chart: chartFor({ year: 1985, month: 11, day: 2, hour: 11, minute: 20 }, -34.6037, -58.3816) },
  { name: "bilbao-2000", chart: chartFor({ year: 2000, month: 7, day: 30, hour: 4, minute: 15 }, 43.263, -2.935) },
];

/** Phrases the free reading now owns. Section 5 restating them is the failure. */
const FREE_TIER_ECHO = [
  /tu Venus en \p{Lu}\p{L}+/iu,
  /signo que tienes justo enfrente/iu,
  /(?:signos|personas) con (?:los|las) que (?:mejor )?encajas/iu,
];

async function main() {
  if (!process.env.OPENROUTER_API_KEY) {
    console.error("Falta OPENROUTER_API_KEY (usa --env-file=.env.local)");
    process.exit(1);
  }
  mkdirSync(OUT, { recursive: true });

  for (const c of CASES) {
    process.stdout.write(`${c.name} ... `);
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: buildReportMessages({ chart: c.chart, focus: "general" }),
        temperature: 0.7,
        max_tokens: MAX_TOKENS,
      }),
    });
    if (!res.ok) { console.log(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`); continue; }

    const data = await res.json();
    const text: string = data.choices?.[0]?.message?.content ?? "";
    // Never trust status alone — reasoning models spend the budget and return
    // HTTP 200 with empty content.
    if (!text.trim()) { console.log("VACÍO"); continue; }

    writeFileSync(`${OUT}/${c.name}.md`, text);
    const parsed = parseReport(text);
    if (!parsed) { console.log(`parseReport NULL (${text.split(/\s+/).length} palabras) → ${OUT}/${c.name}.md`); continue; }

    const section = parsed.sections[4];
    const words = section.body.split(/\s+/).filter(Boolean).length;
    const echoes = FREE_TIER_ECHO.filter((re) => re.test(section.body));

    console.log(
      `OK · ${parsed.wordCount} palabras · sección 5 "${section.title}" ${words} palabras · ` +
      (echoes.length ? `REPITE LO GRATUITO: ${echoes.map((r) => r.source).join(" | ")}` : "sin solapamiento"),
    );
    console.log(`    cost: $${data.usage?.cost ?? "?"} → ${OUT}/${c.name}.md`);
  }
  console.log(`\nSecciones completas guardadas en ${OUT}/ — léelas antes de dar esto por bueno.`);
}

main();
