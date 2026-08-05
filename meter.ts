/**
 * Metered cost check (post-bake-off, blinding already lifted):
 *  1. deepseek/deepseek-v4-pro — one full report (madrid) → exact billed cost
 *  2. deepseek/deepseek-v4-flash — teaser on all three charts → exact billed
 *     cost + output quality for the free tier
 *
 * Usage: OPENROUTER_API_KEY=... npx tsx meter.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { computeNatalChart } from "./src/chart";
import { buildReportMessages, buildTeaserMessages, parseReport } from "./src/report";
import type { BirthMoment } from "./src/types";

const CHARTS: Array<{ name: string; birth: BirthMoment }> = [
  { name: "madrid-1992", birth: { utc: new Date("1992-04-15T08:30:00Z"), latitude: 40.4168, longitude: -3.7038 } },
  { name: "buenosaires-1985", birth: { utc: new Date("1985-11-02T14:20:00Z"), latitude: -34.6037, longitude: -58.3816 } },
  { name: "bilbao-2000", birth: { utc: new Date("2000-07-28T20:45:00Z"), latitude: 43.263, longitude: -2.935 } },
];

async function call(model: string, messages: object[], maxTokens: number) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: maxTokens }),
  });
  if (!res.ok) throw new Error(`${model}: HTTP ${res.status} ${await res.text()}`);
  const data = await res.json();
  const u = data.usage ?? {};
  return {
    text: (data.choices?.[0]?.message?.content ?? "") as string,
    cost: u.cost as number | undefined,
    promptTokens: u.prompt_tokens,
    completionTokens: u.completion_tokens,
    reasoningTokens: u.completion_tokens_details?.reasoning_tokens ?? 0,
  };
}

async function main() {
  if (!process.env.OPENROUTER_API_KEY) {
    console.error("Set OPENROUTER_API_KEY first.");
    process.exit(1);
  }
  mkdirSync("bakeoff-out/teaser-flash", { recursive: true });

  // 1. V4 Pro, full report, madrid
  {
    const chart = computeNatalChart(CHARTS[0].birth);
    const messages = buildReportMessages({ chart, firstName: "Lucía", focus: "general" });
    const r = await call("deepseek/deepseek-v4-pro", messages, 24000);
    const parsed = parseReport(r.text);
    console.log(
      `v4-pro full report (madrid): $${r.cost} | ${r.promptTokens} prompt + ${r.completionTokens} completion (${r.reasoningTokens} reasoning) | ` +
        (parsed ? `OK ${parsed.wordCount} palabras` : "STRUCTURE BROKEN"),
    );
  }

  // 2. V4 Flash, teaser, all three charts
  let flashTotal = 0;
  for (const tc of CHARTS) {
    const chart = computeNatalChart(tc.birth);
    const messages = buildTeaserMessages({ chart, firstName: "Lucía" });
    const r = await call("deepseek/deepseek-v4-flash", messages, 8000);
    flashTotal += r.cost ?? 0;
    writeFileSync(`bakeoff-out/teaser-flash/${tc.name}.md`, r.text);
    const words = r.text.trim().split(/\s+/).length;
    console.log(
      `v4-flash teaser (${tc.name}): $${r.cost} | ${r.promptTokens} prompt + ${r.completionTokens} completion (${r.reasoningTokens} reasoning) | ${words} palabras`,
    );
  }
  console.log(`v4-flash teaser average: $${(flashTotal / CHARTS.length).toFixed(6)}`);
}

main();
