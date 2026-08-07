import type { Aspect, Body, NatalChart, Sign } from "./types";
import {
  ELEMENT, MODALITY, RULER, type Element, type Modality,
} from "./rulers";

export interface Placement {
  body: Body;
  sign: Sign;
  house: number;
  degree: number;
  retrograde: boolean;
}

export interface ChartRuler {
  ascendant: Sign;
  body: Body;
  sign: Sign;
  house: number;
  degree: number;
  /** True when the ruler sits in the sign it rules. */
  inDomicile: boolean;
}

export interface RelationshipProfile {
  descendant: { sign: Sign; degree: number };
  rulerOfSeventh: Placement;
  venus: Placement;
  mars: Placement;
  moon: Placement;
  seventhHouseTenants: Placement[];
  venusAspects: Aspect[];
  marsAspects: Aspect[];
}

export interface Balance<K extends string> {
  totals: Record<K, number>;
  dominant: K;
  weakest: K;
  total: number;
}

/**
 * How loudly each body speaks in an element/modality count. The angles are
 * included because a chart's feel is set as much by the ascendant as by the sun.
 */
export const WEIGHT: Record<Body, number> = {
  Sun: 3, Moon: 3, Mercury: 2, Venus: 2, Mars: 2,
  Jupiter: 1, Saturn: 1, Uranus: 0.5, Neptune: 0.5, Pluto: 0.5,
};
const ASCENDANT_WEIGHT = 3;
const MIDHEAVEN_WEIGHT = 2;

function planet(chart: NatalChart, body: Body): Placement {
  const p = chart.planets.find((x) => x.body === body)!;
  return {
    body: p.body, sign: p.sign, house: p.house,
    degree: p.signDegree, retrograde: p.retrograde,
  };
}

export function chartRuler(chart: NatalChart): ChartRuler {
  const ascendant = chart.angles.ascendant.sign;
  const body = RULER[ascendant];
  const p = planet(chart, body);
  return {
    ascendant, body, sign: p.sign, house: p.house, degree: p.degree,
    inDomicile: RULER[p.sign] === body,
  };
}

export function relationshipProfile(chart: NatalChart): RelationshipProfile {
  const dsc = chart.angles.descendant;
  const involves = (a: Aspect, body: Body) => a.a === body || a.b === body;
  return {
    descendant: { sign: dsc.sign, degree: dsc.signDegree },
    rulerOfSeventh: planet(chart, RULER[dsc.sign]),
    venus: planet(chart, "Venus"),
    mars: planet(chart, "Mars"),
    moon: planet(chart, "Moon"),
    seventhHouseTenants: chart.planets
      .filter((p) => p.house === 7)
      .map((p) => planet(chart, p.body)),
    venusAspects: chart.aspects.filter((a) => involves(a, "Venus")),
    marsAspects: chart.aspects.filter((a) => involves(a, "Mars")),
  };
}

function balance<K extends string>(
  chart: NatalChart,
  table: Record<Sign, K>,
  keys: K[],
): Balance<K> {
  const totals = Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;
  for (const p of chart.planets) totals[table[p.sign]] += WEIGHT[p.body];
  totals[table[chart.angles.ascendant.sign]] += ASCENDANT_WEIGHT;
  totals[table[chart.angles.midheaven.sign]] += MIDHEAVEN_WEIGHT;

  const ranked = keys.slice().sort((a, b) => totals[b] - totals[a]);
  return {
    totals,
    dominant: ranked[0],
    weakest: ranked[ranked.length - 1],
    total: keys.reduce((sum, k) => sum + totals[k], 0),
  };
}

export function elementBalance(chart: NatalChart): Balance<Element> {
  return balance<Element>(chart, ELEMENT, ["Fuego", "Tierra", "Aire", "Agua"]);
}

export function modalityBalance(chart: NatalChart): Balance<Modality> {
  return balance<Modality>(chart, MODALITY, ["Cardinal", "Fijo", "Mutable"]);
}
