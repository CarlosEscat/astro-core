import { NextRequest, NextResponse } from "next/server";
import { chartFromBirthData } from "@/lib/astro";

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

  const find = (body: string) => chart.planets.find((p) => p.body === body)!;
  const sun = find("Sun");
  const moon = find("Moon");

  return NextResponse.json({
    timeZone,
    sun: { sign: sun.sign, degree: sun.signDegree, house: sun.house },
    moon: { sign: moon.sign, degree: moon.signDegree, house: moon.house },
    ascendant: {
      sign: chart.angles.ascendant.sign,
      degree: chart.angles.ascendant.signDegree,
    },
  });
}
