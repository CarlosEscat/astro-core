/**
 * Retry bake-off cells that came back empty or truncated (reasoning models
 * can exhaust max_tokens before emitting content). Reads KEY.json itself so
 * the letter→model mapping never has to be looked at by a human — output
 * only ever names letters.
 *
 * Usage: OPENROUTER_API_KEY=... npx tsx retry-empties.ts
 */
import { readFileSync, writeFileSync, statSync } from "node:fs";
import { computeNatalChart } from "./src/chart";
import { buildReportMessages, parseReport } from "./src/report";
import type { BirthMoment } from "./src/types";

const TEST_CHARTS: Array<{ name: string; birth: BirthMoment }> = [
  { name: "madrid-1992", birth: { utc: new Date("1992-04-15T08:30:00Z"), latitude: 40.4168, longitude: -3.7038 } },
  { name: "buenosaires-1985", birth: { utc: new Date("1985-11-02T14:20:00Z"), latitude: -34.6037, longitude: -58.3816 } },
  { name: "bilbao-2000", birth: { utc: new Date("2000-07-28T20:45:00Z"), latitude: 43.263, longitude: -2.935 } },
];

const OUT = "bakeoff-out";
const RETRY_BELOW_BYTES = 2000;

async function callModel(model: string, messages: object[]): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    // 24000 instead of the original 6000: leaves room for reasoning tokens
    // before the visible completion. Same temperature as the main run.
    body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 24000 }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function main() {
  if (!process.env.OPENROUTER_API_KEY) {
    console.error("Set OPENROUTER_API_KEY first.");
    process.exit(1);
  }
  const key: Record<string, string> = JSON.parse(readFileSync(`${OUT}/KEY.json`, "utf8"));

  for (const tc of TEST_CHARTS) {
    const chart = computeNatalChart(tc.birth);
    const messages = buildReportMessages({ chart, firstName: "Lucía", focus: "general" });

    for (const letter of Object.keys(key)) {
      const path = `${OUT}/${tc.name}/${letter}.md`;
      if (statSync(path).size >= RETRY_BELOW_BYTES) continue;
      process.stdout.write(`${tc.name} / ${letter} retry ... `);
      try {
        const text = await callModel(key[letter], messages);
        const parsed = parseReport(text);
        writeFileSync(path, text);
        console.log(
          text.trim().length === 0
            ? "STILL EMPTY"
            : parsed
              ? `OK (${parsed.wordCount} palabras, 8/8 secciones)`
              : `got ${text.split(/\s+/).length} palabras, STRUCTURE BROKEN`,
        );
      } catch (e) {
        console.log(`ERROR: ${String(e).slice(0, 120)}`);
      }
    }
  }
  console.log("\nRetry pass done. Blinding intact — rank before opening KEY.json.");
}

main();
