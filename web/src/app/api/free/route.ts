import { NextRequest, NextResponse } from "next/server";
import {
  chartFromBirthData, buildFreeMessages, parseFree, repair, validateFree,
} from "@/lib/astro";

export const runtime = "nodejs";

const MODEL = "deepseek/deepseek-v4-flash";
const MAX_ATTEMPTS = 6; // a retry costs ~$0.00015; the canary chart needs them

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

  let lastProblems: string[] = [];

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    // Rotate the chart feature as retries go. A feature that trips the gender
    // gate trips it on every re-roll — measured on the canary chart, where the
    // money stellium pulled all six attempts toward a gendered adjective.
    // Rotating took bilbao-2000 from 1/6 to 6/6.
    const messages = buildFreeMessages({ chart, firstName, featureIndex: attempt - 1 });

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL, messages, temperature: 0.8, max_tokens: 8000,
        // Reasoning off: 4-8s vs 12-60s, identical cost, and the reasoning
        // bursts were what produced empty completions.
        reasoning: { enabled: false },
      }),
    });
    if (!res.ok) {
      return NextResponse.json({ error: "El oráculo no responde. Inténtalo de nuevo." }, { status: 502 });
    }
    const data = await res.json();
    const text: string = data.choices?.[0]?.message?.content ?? "";
    // Never trust status alone — reasoning models can return HTTP 200 with
    // empty content after spending the whole budget.
    if (!text.trim()) { lastProblems = ["respuesta vacía"]; continue; }

    const parsed = parseFree(repair(text));
    if (!parsed) { lastProblems = ["estructura rota"]; continue; }

    const verdict = validateFree(parsed, chart);
    if (verdict.ok) return NextResponse.json({ ...parsed, attempts: attempt });

    lastProblems = verdict.problems;
    console.warn(`free gate rejected attempt ${attempt}:`, verdict.problems.join("; "));
  }

  console.warn("free gate failed after retries:", lastProblems);
  return NextResponse.json(
    { error: "No hemos podido preparar una lectura fiable ahora mismo. Vuelve a intentarlo." },
    { status: 503 },
  );
}
