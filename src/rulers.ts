import type { Body, Sign } from "./types";

export const SIGN_ORDER: Sign[] = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

/** Modern rulerships — the Spanish market expectation, matching Placidus default. */
export const RULER: Record<Sign, Body> = {
  Aries: "Mars", Taurus: "Venus", Gemini: "Mercury", Cancer: "Moon",
  Leo: "Sun", Virgo: "Mercury", Libra: "Venus", Scorpio: "Pluto",
  Sagittarius: "Jupiter", Capricorn: "Saturn", Aquarius: "Uranus",
  Pisces: "Neptune",
};

/** Kept for readings that want the classical ruler as a secondary voice. */
export const RULER_TRADITIONAL: Record<Sign, Body> = {
  ...RULER, Scorpio: "Mars", Aquarius: "Saturn", Pisces: "Jupiter",
};

export type Element = "Fuego" | "Tierra" | "Aire" | "Agua";
export type Modality = "Cardinal" | "Fijo" | "Mutable";

export const ELEMENT: Record<Sign, Element> = {
  Aries: "Fuego", Leo: "Fuego", Sagittarius: "Fuego",
  Taurus: "Tierra", Virgo: "Tierra", Capricorn: "Tierra",
  Gemini: "Aire", Libra: "Aire", Aquarius: "Aire",
  Cancer: "Agua", Scorpio: "Agua", Pisces: "Agua",
};

export const MODALITY: Record<Sign, Modality> = {
  Aries: "Cardinal", Cancer: "Cardinal", Libra: "Cardinal", Capricorn: "Cardinal",
  Taurus: "Fijo", Leo: "Fijo", Scorpio: "Fijo", Aquarius: "Fijo",
  Gemini: "Mutable", Virgo: "Mutable", Sagittarius: "Mutable", Pisces: "Mutable",
};

export function signIndex(sign: Sign): number {
  return SIGN_ORDER.indexOf(sign);
}

/** Distance in signs, taking the short way round: 0-6. */
export function signSeparation(a: Sign, b: Sign): number {
  const d = Math.abs(signIndex(a) - signIndex(b));
  return Math.min(d, 12 - d);
}

function atSeparation(sign: Sign, n: number): Sign[] {
  return SIGN_ORDER.filter((o) => o !== sign && signSeparation(sign, o) === n);
}

export const trineSigns = (sign: Sign): Sign[] => atSeparation(sign, 4);
export const sextileSigns = (sign: Sign): Sign[] => atSeparation(sign, 2);
export const squareSigns = (sign: Sign): Sign[] => atSeparation(sign, 3);

export function oppositeSign(sign: Sign): Sign {
  return SIGN_ORDER[(signIndex(sign) + 6) % 12];
}
