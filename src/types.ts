/**
 * Canonical chart contract.
 * This JSON is the ONLY thing the LLM interpretation layer ever sees.
 * No PII: no name, no email, no raw birth date/place — only derived positions.
 */

export type Body =
  | "Sun" | "Moon" | "Mercury" | "Venus" | "Mars"
  | "Jupiter" | "Saturn" | "Uranus" | "Neptune" | "Pluto";

export type Sign =
  | "Aries" | "Taurus" | "Gemini" | "Cancer" | "Leo" | "Virgo"
  | "Libra" | "Scorpio" | "Sagittarius" | "Capricorn" | "Aquarius" | "Pisces";

export type AspectType =
  | "conjunction" | "opposition" | "trine" | "square" | "sextile";

export type HouseSystem = "placidus" | "whole-sign" | "equal";

/** Birth moment, already resolved to a UTC instant by the caller.
 *  Timezone/geocoding resolution is deliberately OUTSIDE this layer. */
export interface BirthMoment {
  /** UTC instant of birth */
  utc: Date;
  /** Geographic latitude in degrees, north positive. */
  latitude: number;
  /** Geographic longitude in degrees, east positive. */
  longitude: number;
}

export interface PlanetPosition {
  body: Body;
  /** Tropical ecliptic longitude, 0–360, equinox of date. */
  longitude: number;
  sign: Sign;
  /** Degree within sign, 0–30. */
  signDegree: number;
  /** Pretty form, e.g. "14°32′ Scorpio" */
  label: string;
  retrograde: boolean;
  /** House number 1–12 (per the chart's house system). */
  house: number;
}

export interface HouseCusp {
  house: number;       // 1–12
  longitude: number;   // ecliptic longitude of the cusp
  sign: Sign;
  signDegree: number;
  label: string;
}

export interface Aspect {
  a: Body;
  b: Body;
  type: AspectType;
  /** Exact angle of the aspect type (0, 60, 90, 120, 180). */
  angle: number;
  /** Deviation from exact, in degrees (always >= 0). */
  orb: number;
  /** true if the faster body is approaching exactness. */
  applying: boolean;
}

export interface Angles {
  ascendant: HouseCusp;   // house 1 cusp
  midheaven: HouseCusp;   // house 10 cusp
  descendant: HouseCusp;  // house 7 cusp
  imumCoeli: HouseCusp;   // house 4 cusp
}

export interface NatalChart {
  houseSystem: HouseSystem;
  /** True when |latitude| was too extreme for Placidus and we fell back. */
  houseSystemFallback: boolean;
  planets: PlanetPosition[];
  houses: HouseCusp[];
  angles: Angles;
  aspects: Aspect[];
  /** Obliquity of the ecliptic used, degrees (for reproducibility). */
  obliquity: number;
  /** Local sidereal time at birth, degrees (for reproducibility). */
  siderealTime: number;
}
