import type { Sign } from "./types";
import { SUN_SIGN_BY_DAY } from "./sunsign-table";

export interface SunSignGuess {
  sign: Sign | null;
  certain: boolean;
}

/**
 * The Sun's sign for a birth DATE alone, before the hour or the place are
 * known — so the onboarding flow can name a class at question 2.
 *
 * Returns `certain: false` on days where the Sun changes sign for some year
 * or some timezone. On those days the caller MUST NOT name a sign: the whole
 * point is that this can never contradict computeNatalChart later. 45 of the
 * 366 calendar days are guarded this way; see scripts/build-sunsign-table.ts.
 *
 * Deliberately imports no ephemeris — this runs in the browser, and pulling in
 * astronomy-engine would put the whole thing in the landing bundle.
 */
export function sunSignForDate(iso: string): SunSignGuess {
  const m = /^\d{4}-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return { sign: null, certain: false };
  const sign = SUN_SIGN_BY_DAY[`${m[1]}-${m[2]}`];
  return sign ? { sign, certain: true } : { sign: null, certain: false };
}
