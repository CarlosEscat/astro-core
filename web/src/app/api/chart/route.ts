import { NextRequest, NextResponse } from "next/server";
import {
  chartFromBirthData, chartRuler, elementBalance, frictionSign, signature,
  topMatches, ASC_ES, MOON_ES, PARTNER_ES, SUN_ES,
} from "@/lib/astro";

export const runtime = "nodejs";

/**
 * Pure local math (~milliseconds, no LLM). Lets the UI show the exact
 * placements the instant the form is submitted, while the interpretation
 * is still being written — the precision arrives first, which is also
 * the product's whole argument.
 */
export async function POST(req: NextRequest) {
  const { date, time, latitude, longitude } = await req.json();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "") || !/^\d{2}:\d{2}$/.test(time ?? "")) {
    return NextResponse.json({ error: "Fecha u hora no válidas." }, { status: 400 });
  }
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return NextResponse.json({ error: "Elige un lugar de la lista." }, { status: 400 });
  }

  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const { chart, timeZone } = chartFromBirthData(
    { year, month, day, hour, minute },
    latitude,
    longitude,
  );

  const sun = chart.planets.find((p) => p.body === "Sun")!;
  const moon = chart.planets.find((p) => p.body === "Moon")!;
  const elements = elementBalance(chart);
  const ruler = chartRuler(chart);
  const friction = frictionSign(chart);

  return NextResponse.json({
    timeZone,
    bigThree: {
      sun: { sign: sun.sign, degree: sun.signDegree, gloss: SUN_ES[sun.sign] },
      moon: { sign: moon.sign, degree: moon.signDegree, gloss: MOON_ES[moon.sign] },
      ascendant: {
        sign: chart.angles.ascendant.sign,
        degree: chart.angles.ascendant.signDegree,
        gloss: ASC_ES[chart.angles.ascendant.sign],
      },
    },
    matches: topMatches(chart).map((m) => ({
      sign: m.sign, say: PARTNER_ES[m.sign], why: m.reasons[0],
    })),
    friction: { sign: friction.sign, say: PARTNER_ES[friction.sign], why: friction.reason },
    elements: { totals: elements.totals, dominant: elements.dominant,
                weakest: elements.weakest, total: elements.total },
    ruler: { body: ruler.body, sign: ruler.sign, inDomicile: ruler.inDomicile },
    signature: signature(chart),
  });
}
