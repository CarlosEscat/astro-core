import type { Aspect, AspectType, Body } from "./types";
import { separation, angleDiff, norm360 } from "./zodiac";
import { eclipticLongitude } from "./ephemeris";

interface AspectDef {
  type: AspectType;
  angle: number;
  orb: number; // max deviation in degrees
}

/** Conventional orbs; luminaries get a bonus (see orbFor). */
const ASPECTS: AspectDef[] = [
  { type: "conjunction", angle: 0, orb: 8 },
  { type: "opposition", angle: 180, orb: 8 },
  { type: "trine", angle: 120, orb: 7 },
  { type: "square", angle: 90, orb: 7 },
  { type: "sextile", angle: 60, orb: 5 },
];

const LUMINARIES = new Set<Body>(["Sun", "Moon"]);

function orbFor(def: AspectDef, a: Body, b: Body): number {
  return LUMINARIES.has(a) || LUMINARIES.has(b) ? def.orb + 2 : def.orb;
}

/**
 * Detect aspects among the given positions.
 * `positions` maps body -> ecliptic longitude at the birth instant.
 * `utc` is needed to determine applying vs separating (requires motion).
 */
export function detectAspects(
  positions: Map<Body, number>,
  utc: Date,
): Aspect[] {
  const bodies = [...positions.keys()];
  const out: Aspect[] = [];

  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i];
      const b = bodies[j];
      const sep = separation(positions.get(a)!, positions.get(b)!);

      let best: { def: AspectDef; orb: number } | null = null;
      for (const def of ASPECTS) {
        const orb = Math.abs(sep - def.angle);
        if (orb <= orbFor(def, a, b) && (!best || orb < best.orb)) {
          best = { def, orb };
        }
      }
      if (!best) continue;

      out.push({
        a,
        b,
        type: best.def.type,
        angle: best.def.angle,
        orb: round2(best.orb),
        applying: isApplying(a, b, best.def.angle, utc),
      });
    }
  }
  // Tightest aspects first — the LLM should mention those.
  return out.sort((x, y) => x.orb - y.orb);
}

/** Applying if the separation is moving toward the exact angle. */
function isApplying(a: Body, b: Body, exact: number, utc: Date): boolean {
  const H = 3600 * 1000;
  const sepNow = separation(
    eclipticLongitude(a, utc),
    eclipticLongitude(b, utc),
  );
  const sepLater = separation(
    eclipticLongitude(a, new Date(utc.getTime() + H)),
    eclipticLongitude(b, new Date(utc.getTime() + H)),
  );
  return Math.abs(sepLater - exact) < Math.abs(sepNow - exact);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
