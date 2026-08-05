import { NextRequest, NextResponse } from "next/server";
import { chartFromBirthData, buildTeaserMessages, validateTeaser } from "@/lib/astro";

export const runtime = "nodejs";

const MODEL = "deepseek/deepseek-v4-flash";
const MAX_ATTEMPTS = 3; // one generation + up to two retries

interface Body {
  firstName?: string;
  /** YYYY-MM-DD */
  date?: string;
  /** HH:MM, 24h, birth-local wall clock */
  time?: string;
  latitude?: number;
  longitude?: number;
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Body;
  const { firstName, date, time, latitude, longitude } = body;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return badRequest("Falta la fecha de nacimiento.");
  if (!time || !/^\d{2}:\d{2}$/.test(time)) return badRequest("Falta la hora de nacimiento.");
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return badRequest("Elige un lugar de nacimiento de la lista.");
  }

  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);

  const { chart } = chartFromBirthData(
    { year, month, day, hour, minute },
    latitude,
    longitude,
  );

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Falta OPENROUTER_API_KEY en el servidor." }, { status: 500 });
  }

  const messages = buildTeaserMessages({ chart, firstName });
  let lastProblems: string[] = [];

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 8000,
        // Reasoning off: measured 4-8s vs 12-60s, identical cost, and it
        // passed the gate at least as often. The unpredictable reasoning
        // bursts were also what produced empty completions.
        reasoning: { enabled: false },
      }),
    });
    if (!res.ok) {
      return NextResponse.json({ error: "El oráculo no responde. Inténtalo de nuevo." }, { status: 502 });
    }
    const data = await res.json();
    const text: string = data.choices?.[0]?.message?.content ?? "";
    const verdict = validateTeaser(text, chart);
    if (verdict.ok) {
      return NextResponse.json({ teaser: text.trim(), chart: bigThree(chart), attempts: attempt });
    }
    lastProblems = verdict.problems;
    console.warn(`teaser gate rejected attempt ${attempt}:`, verdict.problems.join("; "));
  }

  // Every attempt failed the gate. Never ship ungrounded copy.
  console.warn("teaser gate failed after retries:", lastProblems);
  return NextResponse.json(
    { error: "No hemos podido preparar una lectura fiable ahora mismo. Vuelve a intentarlo." },
    { status: 503 },
  );
}

/** The three placements the reader recognizes, for the instrument readout. */
function bigThree(chart: ReturnType<typeof chartFromBirthData>["chart"]) {
  const find = (body: string) => chart.planets.find((p) => p.body === body)!;
  const sun = find("Sun");
  const moon = find("Moon");
  return {
    sun: { sign: sun.sign, degree: sun.signDegree, house: sun.house },
    moon: { sign: moon.sign, degree: moon.signDegree, house: moon.house },
    ascendant: {
      sign: chart.angles.ascendant.sign,
      degree: chart.angles.ascendant.signDegree,
    },
  };
}
