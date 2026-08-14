import type { AspectType, Body, NatalChart } from "./types";

export type Tone = "armonioso" | "tenso" | "fusion";

export interface SelectedTrait {
  pair: [Body, Body];
  aspect: AspectType;
  orb: number;
  tone: Tone;
}

/**
 * Slow enough that their sign is shared by everyone born within years. They
 * never appear as a card row of their own, and an aspect between two of them is
 * not personal either — it is the signature of a birth cohort.
 */
const OUTER = new Set<Body>(["Uranus", "Neptune", "Pluto"]);

const MAX_RASGOS = 3;
const MAX_TENSIONES = 2;

/**
 * A conjunction gets its own tone rather than being folded into one of the
 * others: it is genuinely neither, and calling it harmonious would invent a
 * valence the geometry does not carry.
 */
function toneFor(type: AspectType): Tone {
  if (type === "trine" || type === "sextile") return "armonioso";
  if (type === "square" || type === "opposition") return "tenso";
  return "fusion";
}

/**
 * The chart's traits, tightest first. `detectAspects` already returns aspects
 * sorted by orb ascending, so this walks them in order and takes what fits.
 *
 * An aspect that finds no free slot is dropped. That is intended, not a loss:
 * by construction it is looser than everything already kept.
 */
export function selectTraits(chart: NatalChart): {
  rasgos: SelectedTrait[];
  tensiones: SelectedTrait[];
} {
  const rasgos: SelectedTrait[] = [];
  const tensiones: SelectedTrait[] = [];

  for (const a of chart.aspects) {
    if (OUTER.has(a.a) && OUTER.has(a.b)) continue;
    if (rasgos.length >= MAX_RASGOS && tensiones.length >= MAX_TENSIONES) break;

    const tone = toneFor(a.type);
    const trait: SelectedTrait = { pair: [a.a, a.b], aspect: a.type, orb: a.orb, tone };

    if (tone === "tenso") {
      if (tensiones.length < MAX_TENSIONES) tensiones.push(trait);
    } else if (tone === "armonioso") {
      if (rasgos.length < MAX_RASGOS) rasgos.push(trait);
    } else if (rasgos.length < MAX_RASGOS) {
      rasgos.push(trait);
    } else if (tensiones.length < MAX_TENSIONES) {
      tensiones.push(trait);
    }
  }

  return { rasgos, tensiones };
}
