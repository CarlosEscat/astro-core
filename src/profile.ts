import type { Aspect, Body, NatalChart, Sign } from "./types";
import {
  ELEMENT, MODALITY, RULER, type Element, type Modality,
} from "./rulers";

/** Planet names as a reader says them — the only technical words allowed out. */
const PLANET_ES: Record<Body, string> = {
  Sun: "el Sol", Moon: "la Luna", Mercury: "Mercurio", Venus: "Venus",
  Mars: "Marte", Jupiter: "Júpiter", Saturn: "Saturno", Uranus: "Urano",
  Neptune: "Neptuno", Pluto: "Plutón",
};

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

import {
  SIGN_ORDER, signIndex, sextileSigns, squareSigns, trineSigns,
} from "./rulers";
import { SIGN_ES } from "./copy/signs.es";

export interface SignScore {
  sign: Sign;
  score: number;
  /** Plain-language receipts, shown under the match in the UI. */
  reasons: string[];
}

export interface Friction {
  sign: Sign;
  reason: string;
}

/**
 * Weights are the product's astrological opinion, written down on purpose.
 * The sun is worth least of everything: sun-sign compatibility is the thing
 * this product exists to be better than.
 */
const W = {
  descendant: 40,
  rulerOfSeventh: 25,
  seventhTenant: 20,
  venusTrine: 15,
  venusSextile: 10,
  marsTrine: 10,
  marsSextile: 7,
  moonElement: 8,
  sunTrine: 5,
  sunSextile: 3,
} as const;

export function compatibleSigns(chart: NatalChart): SignScore[] {
  const tally = new Map<Sign, { score: number; best: number; reasons: string[] }>();
  const add = (sign: Sign, score: number, reason: string) => {
    const cur = tally.get(sign) ?? { score: 0, best: 0, reasons: [] };
    cur.score += score;
    cur.best = Math.max(cur.best, score);
    cur.reasons.push(reason);
    tally.set(sign, cur);
  };

  const p = relationshipProfile(chart);
  const es = (s: Sign) => SIGN_ES[s];

  add(p.descendant.sign, W.descendant,
    `${es(p.descendant.sign)} es el signo que tienes justo enfrente`);

  const r7 = p.rulerOfSeventh;
  add(r7.sign, W.rulerOfSeventh,
    `${es(r7.sign)} es donde está ${PLANET_ES[r7.body]}, el que manda en tus relaciones`);

  for (const t of p.seventhHouseTenants) {
    add(t.sign, W.seventhTenant,
      `tienes ${PLANET_ES[t.body]} en la zona de la pareja, en ${es(t.sign)}`);
  }

  for (const s of trineSigns(p.venus.sign)) {
    add(s, W.venusTrine, `tu Venus en ${es(p.venus.sign)} se lleva bien con ${es(s)}`);
  }
  for (const s of sextileSigns(p.venus.sign)) {
    add(s, W.venusSextile, `tu Venus en ${es(p.venus.sign)} encaja con ${es(s)}`);
  }
  for (const s of trineSigns(p.mars.sign)) {
    add(s, W.marsTrine, `tu Marte en ${es(p.mars.sign)} empuja en la misma dirección que ${es(s)}`);
  }
  for (const s of sextileSigns(p.mars.sign)) {
    add(s, W.marsSextile, `tu Marte en ${es(p.mars.sign)} encaja con ${es(s)}`);
  }
  for (const s of trineSigns(p.moon.sign)) {
    add(s, W.moonElement, `tu Luna en ${es(p.moon.sign)} está a gusto con ${es(s)}`);
  }

  const sun = chart.planets.find((x) => x.body === "Sun")!;
  for (const s of trineSigns(sun.sign)) {
    add(s, W.sunTrine, `tu Sol en ${es(sun.sign)} se lleva bien con ${es(s)}`);
  }
  for (const s of sextileSigns(sun.sign)) {
    add(s, W.sunSextile, `tu Sol en ${es(sun.sign)} encaja con ${es(s)}`);
  }

  return SIGN_ORDER
    .map((sign) => {
      const t = tally.get(sign);
      return { sign, score: t?.score ?? 0, best: t?.best ?? 0, reasons: t?.reasons ?? [] };
    })
    .sort((a, b) =>
      b.score - a.score ||
      b.best - a.best ||
      signIndex(a.sign) - signIndex(b.sign))
    .map(({ sign, score, reasons }) => ({ sign, score, reasons }));
}

/**
 * Of the two signs square to the relationship axis, the one you also score
 * highly for. Attraction and friction in the same place is the interesting case.
 */
export function frictionSign(chart: NatalChart): Friction {
  const scored = compatibleSigns(chart);
  const scoreOf = (s: Sign) => scored.find((x) => x.sign === s)!.score;
  const candidates = squareSigns(chart.angles.descendant.sign);
  const sign = candidates
    .slice()
    .sort((a, b) => scoreOf(b) - scoreOf(a) || signIndex(a) - signIndex(b))[0];
  return {
    sign,
    reason: `${SIGN_ES[sign]} te lleva la contraria: te atrae y te descoloca a la vez`,
  };
}

export function topMatches(chart: NatalChart, n = 3): SignScore[] {
  const friction = frictionSign(chart).sign;
  return compatibleSigns(chart)
    .filter((s) => s.sign !== friction && s.score > 0)
    .slice(0, n);
}

import { AREA_ES } from "./copy/areas.es";
// One geometry, one wording. This file used to carry its own relationPhrase()
// returning these same three strings; the character-card spec calls that "one
// idea written twice" and requires the fold, so the free tier, the paid prose
// and the card cannot describe a conjunction three different ways on one page.
import { RELATION_ES } from "./copy/relations.es";

export type FeatureKind =
  | "cumulo-casa"
  | "cumulo-signo"
  | "sin-aspectos"
  | "elemento-ausente"
  | "regente-domicilio"
  | "aspecto-estrecho";

export interface ChartFeature {
  kind: FeatureKind;
  /** Lower sorts first. */
  priority: number;
  /** Plain-Spanish payload — this is what the model actually receives. */
  payload: Record<string, unknown>;
}

const PRIORITY: Record<FeatureKind, number> = {
  "cumulo-casa": 1,
  "cumulo-signo": 2,
  "sin-aspectos": 3,
  "elemento-ausente": 4,
  "regente-domicilio": 5,
  "aspecto-estrecho": 6,
};

const MIN_STELLIUM = 3;
const ABSENT_ELEMENT_THRESHOLD = 2;

export function chartFeatures(chart: NatalChart): ChartFeature[] {
  const out: ChartFeature[] = [];
  const push = (kind: FeatureKind, payload: Record<string, unknown>) =>
    out.push({ kind, priority: PRIORITY[kind], payload });

  const byHouse = new Map<number, Body[]>();
  const bySign = new Map<Sign, Body[]>();
  for (const p of chart.planets) {
    byHouse.set(p.house, [...(byHouse.get(p.house) ?? []), p.body]);
    bySign.set(p.sign, [...(bySign.get(p.sign) ?? []), p.body]);
  }

  for (const [house, bodies] of byHouse) {
    if (bodies.length < MIN_STELLIUM) continue;
    push("cumulo-casa", {
      zona: AREA_ES[house],
      planetas: bodies.map((b) => PLANET_ES[b]),
      significa: "ahí se le va casi toda la energía",
    });
  }

  for (const [sign, bodies] of bySign) {
    if (bodies.length < MIN_STELLIUM) continue;
    push("cumulo-signo", {
      signo: SIGN_ES[sign],
      planetas: bodies.map((b) => PLANET_ES[b]),
      significa: "esa forma de ser tiñe todo lo demás",
    });
  }

  const aspected = new Set<Body>();
  for (const a of chart.aspects) { aspected.add(a.a); aspected.add(a.b); }
  for (const p of chart.planets) {
    if (aspected.has(p.body)) continue;
    push("sin-aspectos", {
      planeta: PLANET_ES[p.body],
      signo: SIGN_ES[p.sign],
      zona: AREA_ES[p.house],
      significa: "eso funciona por su cuenta, sin negociar con el resto",
    });
  }

  const elements = elementBalance(chart);
  if (elements.totals[elements.weakest] < ABSENT_ELEMENT_THRESHOLD) {
    push("elemento-ausente", {
      falta: elements.weakest,
      significa: "es justo lo que le cuesta y lo que va buscando fuera",
    });
  }

  const ruler = chartRuler(chart);
  if (ruler.inDomicile) {
    push("regente-domicilio", {
      planeta: PLANET_ES[ruler.body],
      signo: SIGN_ES[ruler.sign],
      zona: AREA_ES[ruler.house],
      significa: "juega en casa: manda desde su propio terreno",
    });
  }

  const tightest = chart.aspects[0];
  if (tightest) {
    push("aspecto-estrecho", {
      planetas: [PLANET_ES[tightest.a], PLANET_ES[tightest.b]],
      relacion: RELATION_ES[tightest.type],
      significa: "es el lazo más fuerte de toda la carta",
    });
  }

  return out.sort((a, b) => a.priority - b.priority);
}

/**
 * One feature, chosen by us. Handing the model a menu made it fuse two
 * features into a claim that was true of neither.
 *
 * `index` lets a retry loop move down the ranking. Some features are gender
 * traps in Spanish — the canary chart's money stellium drags every attempt
 * toward "no es que seas agarrada" — and re-rolling the model on an unchanged
 * prompt just hits the same trap again. Clamped, so a caller can retry past
 * the end of the list without special-casing.
 */
export function selectFeature(chart: NatalChart, index = 0): ChartFeature {
  const features = chartFeatures(chart);
  return features[Math.min(index, features.length - 1)];
}

export interface Signature {
  sun: Sign;
  moon: Sign;
  ascendant: Sign;
  /** Honest combinatorial rarity: 12 x 12 x 12. Not a made-up percentage. */
  oneIn: number;
}

export function signature(chart: NatalChart): Signature {
  return {
    sun: chart.planets.find((p) => p.body === "Sun")!.sign,
    moon: chart.planets.find((p) => p.body === "Moon")!.sign,
    ascendant: chart.angles.ascendant.sign,
    oneIn: 12 * 12 * 12,
  };
}
