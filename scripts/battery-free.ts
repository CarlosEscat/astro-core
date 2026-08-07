/**
 * Multi-chart battery for the free reading. NOT part of `npm test` — it costs
 * money and needs the network. CLAUDE.md mandates running this for any prompt
 * change; bilbao-2000 is the canary that breaks gender rules across models.
 *
 *   npx tsx --env-file=.env.local scripts/battery-free.ts
 */
import { computeNatalChart } from "../src/chart";
import { resolveBirthUtc } from "../src/birthtime";
import { buildFreeMessages, parseFree } from "../src/report";
import { repair, validateFree } from "../src/validate";
import type { NatalChart } from "../src/types";

const MODEL = "deepseek/deepseek-v4-flash";
const RUNS_PER_CHART = 6;
/** Mirrors the /api/free route: a retry costs ~$0.00015 and ~5 s. */
const MAX_ATTEMPTS = 6;

interface Case { name: string; chart: NatalChart }

function chartFor(
  local: { year: number; month: number; day: number; hour: number; minute: number },
  latitude: number,
  longitude: number,
): NatalChart {
  const { utc } = resolveBirthUtc(local, latitude, longitude);
  return computeNatalChart({ utc, latitude, longitude });
}

const CASES: Case[] = [
  {
    name: "madrid-1992",
    chart: chartFor({ year: 1992, month: 4, day: 15, hour: 10, minute: 30 }, 40.4168, -3.7038),
  },
  {
    name: "buenosaires-1985",
    chart: chartFor({ year: 1985, month: 11, day: 2, hour: 11, minute: 20 }, -34.6037, -58.3816),
  },
  {
    // The canary. Leo Sun/Venus pulls Spanish toward feminine participles.
    name: "bilbao-2000",
    chart: chartFor({ year: 2000, month: 7, day: 30, hour: 4, minute: 15 }, 43.263, -2.935),
  },
];

async function callModel(messages: object[]): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.8,
      max_tokens: 8000,
      // Reasoning off: 4-8s vs 12-60s, identical cost, and the reasoning
      // bursts were what produced empty completions.
      reasoning: { enabled: false },
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  // Never trust status alone — reasoning models return 200 with empty content.
  return data.choices?.[0]?.message?.content ?? "";
}

async function main() {
  if (!process.env.OPENROUTER_API_KEY) {
    console.error("Falta OPENROUTER_API_KEY (usa --env-file=.env.local)");
    process.exit(1);
  }

  const summary: Array<{ name: string; passed: number; total: number }> = [];
  const wordCounts: number[] = [];

  let attemptsUsed = 0;
  let attemptsPassed = 0;

  for (const c of CASES) {
    let passed = 0;
    console.log(`\n=== ${c.name} ===`);

    // One "run" is one reader: the full delivery path, retries included.
    for (let run = 1; run <= RUNS_PER_CHART; run++) {
      console.log(`  lector ${run}/${RUNS_PER_CHART}:`);

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        // Rotate the feature as retries go: a feature that trips the gate
        // trips it every time, so re-rolling on the same one is wasted.
        const featureIndex = attempt - 1;
        const messages = buildFreeMessages({ chart: c.chart, featureIndex });
        process.stdout.write(`    intento ${attempt} (rasgo ${featureIndex}) ... `);
        attemptsUsed++;
        try {
          const raw = await callModel(messages);
          if (!raw.trim()) { console.log("VACÍO"); continue; }

          const parsed = parseFree(repair(raw));
          if (!parsed) { console.log("ESTRUCTURA ROTA"); continue; }

          const verdict = validateFree(parsed, c.chart);
          const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
          wordCounts.push(words(parsed.apertura), words(parsed.amor));

          if (verdict.ok) {
            passed++;
            attemptsPassed++;
            console.log(`OK (${words(parsed.apertura)}/${words(parsed.amor)} palabras)`);
            if (run === 1) console.log(`       gancho: «${parsed.hook}»`);
            break;
          }
          console.log(`RECHAZADO — ${verdict.problems.join(" | ")}`);
        } catch (err) {
          console.log(`ERROR: ${(err as Error).message.slice(0, 160)}`);
        }
      }
    }
    summary.push({ name: c.name, passed, total: RUNS_PER_CHART });
  }

  console.log(`\nIntentos totales: ${attemptsUsed} · aceptados a la primera o tras rotar: ${attemptsPassed}`);

  console.log("\n===== LECTURAS ENTREGADAS (con reintentos, como en producción) =====");
  for (const s of summary) {
    console.log(`  ${s.name.padEnd(20)} ${s.passed}/${s.total}`);
  }
  const totalPassed = summary.reduce((n, s) => n + s.passed, 0);
  const total = summary.reduce((n, s) => n + s.total, 0);
  console.log(`  ${"TOTAL".padEnd(20)} ${totalPassed}/${total}`);
}

main();
