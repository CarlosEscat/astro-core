import type { AspectType, Body, NatalChart, Sign } from "./types";
import { elementBalance, signature, type Balance } from "./profile";
import type { Element } from "./rulers";
import { CLASS_ES } from "./copy/classes.es";
import { AREA_CORTA_ES } from "./copy/areas.es";
import { SUN_ES, MOON_ES, ASC_ES } from "./copy/signs.es";

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

/** Seven rows on the full card: the five personal planets plus Jupiter and Saturn. */
const SHOWN_PLANETS = 7;

/**
 * What the free reading is allowed to know. The paid blocks are ABSENT, not
 * hidden: a struct that carried them and let the client hide them would leave
 * the paid report readable in devtools.
 *
 * Note there is no `house` anywhere — only `area`. Decision 1 of the
 * plain-language spec removes house numbering from every reader-facing surface,
 * and the cheapest way to honour that is never to carry the number out here.
 */
export interface FreeCard {
  clase: { sign: Sign; nombre: string; signDegree: number; gloss: string };
  seVe: { sign: Sign; signDegree: number; gloss: string; approximate: boolean };
  porDentro: { sign: Sign; signDegree: number; area: string; gloss: string };
  afinidad: Balance<Element>;
  rareza: { oneIn: number };
  /** Counts only — enough to render locked rows honestly. */
  bloqueado: { rasgos: number; tensiones: number; planetas: number };
}

export interface FreeCardOptions {
  /**
   * False when the person skipped the birth hour and 12:00 was assumed.
   * The Ascendant is then a guess, and the card says so rather than printing
   * it as fact.
   *
   * Deliberately narrow: porDentro.area comes from the Moon's HOUSE and is
   * just as hour-derived, but it is NOT hedged. That is spec decision 8,
   * reaffirmed on 2026-08-22 after the gap was raised.
   */
  hourKnown?: boolean;
}

export function freeCard(chart: NatalChart, opts: FreeCardOptions = {}): FreeCard {
  const sun = chart.planets.find((p) => p.body === "Sun")!;
  const moon = chart.planets.find((p) => p.body === "Moon")!;
  const asc = chart.angles.ascendant;
  const { rasgos, tensiones } = selectTraits(chart);

  return {
    clase: {
      sign: sun.sign, nombre: CLASS_ES[sun.sign],
      signDegree: sun.signDegree, gloss: SUN_ES[sun.sign],
    },
    seVe: {
      sign: asc.sign, signDegree: asc.signDegree, gloss: ASC_ES[asc.sign],
      approximate: opts.hourKnown === false,
    },
    porDentro: {
      sign: moon.sign, signDegree: moon.signDegree,
      area: AREA_CORTA_ES[moon.house], gloss: MOON_ES[moon.sign],
    },
    afinidad: elementBalance(chart),
    rareza: { oneIn: signature(chart).oneIn },
    bloqueado: {
      rasgos: rasgos.length,
      tensiones: tensiones.length,
      planetas: SHOWN_PLANETS,
    },
  };
}
