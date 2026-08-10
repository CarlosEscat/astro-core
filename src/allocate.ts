import type { Aspect, AspectType, Body, NatalChart } from "./types";

/** An aspect stripped to what a section brief needs to name it. */
export interface AspectRef {
  a: Body;
  b: Body;
  type: AspectType;
  orb: number;
}

export interface SectionAllocation {
  /** Aspects this section owns and should build on. */
  aspects: AspectRef[];
  /** Aspects owned by other sections. This one must not use them. */
  reserved: AspectRef[];
}

const ref = (a: Aspect): AspectRef => ({ a: a.a, b: a.b, type: a.type, orb: a.orb });
const involves = (a: Aspect, bodies: Body[]) => bodies.includes(a.a) || bodies.includes(a.b);

/**
 * Which bodies each section may claim, and how many aspects it gets. Sections
 * absent from this table (0, 3, 7) work from placements or from the other
 * sections' openings, not from aspects of their own.
 *
 * Order matters: section 6 is listed first because it is defined as "the most
 * exact aspects of the chart", so it must claim before anyone else narrows the
 * pool.
 */
const CLAIMS: Array<{ section: number; bodies: Body[] | "any"; count: number }> = [
  { section: 6, bodies: "any", count: 2 },
  { section: 1, bodies: ["Sun"], count: 1 },
  { section: 2, bodies: ["Moon"], count: 1 },
  { section: 4, bodies: ["Venus", "Mars"], count: 2 },
  { section: 5, bodies: ["Saturn"], count: 1 },
];

/**
 * Hand each section the aspects it owns before any LLM call happens. Seven
 * concurrent calls with no coordination would all reach for the tightest
 * aspect in the chart; nothing about avoiding that needs a model, so nothing
 * about it involves one. Same principle as the free tier's selectFeature:
 * compute the structure, hand the model one chosen thing.
 */
export function allocateFeatures(chart: NatalChart): SectionAllocation[] {
  const owned: AspectRef[][] = Array.from({ length: 8 }, () => []);
  const taken = new Set<Aspect>();

  // chart.aspects arrives sorted most-exact-first (src/aspects.ts), so "take
  // the next free one" is already "take the most exact free one".
  for (const claim of CLAIMS) {
    for (const aspect of chart.aspects) {
      if (owned[claim.section].length >= claim.count) break;
      if (taken.has(aspect)) continue;
      if (claim.bodies !== "any" && !involves(aspect, claim.bodies)) continue;
      taken.add(aspect);
      owned[claim.section].push(ref(aspect));
    }
  }

  const key = (r: AspectRef) => `${r.a}-${r.b}-${r.type}`;
  const all = owned.flat();
  return owned.map((aspects) => {
    const mine = new Set(aspects.map(key));
    return { aspects, reserved: all.filter((r) => !mine.has(key(r))) };
  });
}
