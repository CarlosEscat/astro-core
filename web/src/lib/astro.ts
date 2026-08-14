import "server-only";
import { resolveBirthUtc, type BirthLocalTime } from "@core/birthtime";
import { computeNatalChart } from "@core/chart";
import type { NatalChart } from "@core/types";

/**
 * Server-side entry point from form input to chart. The timezone contract
 * lives here: birth-local wall time + coordinates → historical UTC instant
 * → chart. Never convert birth times in the browser.
 */
export function chartFromBirthData(
  local: BirthLocalTime,
  latitude: number,
  longitude: number,
): { chart: NatalChart; timeZone: string; offsetMinutes: number } {
  const resolved = resolveBirthUtc(local, latitude, longitude);
  const chart = computeNatalChart({
    utc: resolved.utc,
    latitude,
    longitude,
  });
  return { chart, timeZone: resolved.timeZone, offsetMinutes: resolved.offsetMinutes };
}

export { buildFreeMessages, parseFree } from "@core/report";
export type { FreeReading } from "@core/report";
export { validateFree, repair } from "@core/validate";
export {
  relationshipProfile, topMatches, frictionSign, elementBalance,
  modalityBalance, chartRuler, signature,
} from "@core/profile";
export { SIGN_ES, SIGN_GLYPH, SUN_ES, MOON_ES, ASC_ES, PARTNER_ES } from "@core/copy/signs.es";
export { freeCard, selectTraits } from "@core/card";
export type { FreeCard, SelectedTrait, Tone } from "@core/card";
