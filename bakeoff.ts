/**
 * Model bake-off harness.
 *
 * Generates the SAME reports from multiple models via OpenRouter, writes each
 * output under an anonymous letter (A.md, B.md, ...) and keeps the
 * letter→model mapping in a separate key file you must not open until you
 * have ranked the outputs. Blind or it doesn't count.
 *
 * Usage:
 *   OPENROUTER_API_KEY=sk-... npx tsx bakeoff.ts
 *
 * Then read bakeoff-out/<chart>/[A-E].md, rank them per rubric.md,
 * and only afterwards open bakeoff-out/KEY.json.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { computeNatalChart } from "./src/chart";
import { buildReportMessages, parseReport } from "./src/report";
import type { BirthMoment } from "./src/types";

// ——— Candidates. Pin exact provider routes after a model wins (fp8 vs bf16
//     serving differs between hosts — re-verify the winner on its final host).
// Verified against openrouter.ai/api/v1/models on 2026-07-30.
const MODELS = [
  "moonshotai/kimi-k3",
  "deepseek/deepseek-v4-pro", // v4 split into -pro/-flash; -pro for the paid tier
  "z-ai/glm-5.2",
  "mistralai/mistral-small-2603", // newest Mistral Small; there is no "-4"
  "anthropic/claude-haiku-4.5", // quality baseline
];

// ——— Three test charts with deliberately different chart "textures".
const TEST_CHARTS: Array<{ name: string; birth: BirthMoment }> = [
  { // Tight aspects era (Uranus–Neptune conjunction)
    name: "madrid-1992",
    birth: { utc: new Date("1992-04-15T08:30:00Z"), latitude: 40.4168, longitude: -3.7038 },
  },
  { // Southern hemisphere, different season logic
    name: "buenosaires-1985",
    birth: { utc: new Date("1985-11-02T14:20:00Z"), latitude: -34.6037, longitude: -58.3816 },
  },
  { // High-ish latitude, evening birth
    name: "bilbao-2000",
    birth: { utc: new Date("2000-07-28T20:45:00Z"), latitude: 43.263, longitude: -2.935 },
  },
];

const OUT = "bakeoff-out";
const LETTERS = "ABCDEFGHIJ";

async function callModel(model: string, messages: object[]): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 6000 }),
  });
  if (!res.ok) throw new Error(`${model}: HTTP ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function main() {
  if (!process.env.OPENROUTER_API_KEY) {
    console.error("Set OPENROUTER_API_KEY first.");
    process.exit(1);
  }
  mkdirSync(OUT, { recursive: true });

  // Shuffle model→letter so the letter order carries no information.
  // Fisher-Yates — a comparator returning random() - 0.5 is not a uniform
  // shuffle, and a biased letter order leaks information into the blinding.
  const shuffled = [...MODELS];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const key: Record<string, string> = {};
  shuffled.forEach((m, i) => (key[LETTERS[i]] = m));

  // Write the key up front: if the run dies halfway through, outputs without a
  // mapping are unrankable and the spend is wasted. Just don't open it early.
  writeFileSync(`${OUT}/KEY.json`, JSON.stringify(key, null, 2));

  for (const tc of TEST_CHARTS) {
    const dir = `${OUT}/${tc.name}`;
    mkdirSync(dir, { recursive: true });
    const chart = computeNatalChart(tc.birth);
    const messages = buildReportMessages({ chart, firstName: "Lucía", focus: "general" });

    for (const [letter, model] of Object.entries(key)) {
      process.stdout.write(`${tc.name} / ${letter} ... `);
      try {
        const text = await callModel(model, messages);
        const parsed = parseReport(text);
        const status = parsed
          ? `OK (${parsed.wordCount} palabras, 8/8 secciones)`
          : "STRUCTURE BROKEN";
        writeFileSync(`${dir}/${letter}.md`, text);
        console.log(status);
      } catch (e) {
        writeFileSync(`${dir}/${letter}.md`, `ERROR: ${e}`);
        console.log("ERROR");
      }
    }
  }

  console.log(`\nDone. Rank blind using rubric.md, THEN open ${OUT}/KEY.json.`);
}

main();
