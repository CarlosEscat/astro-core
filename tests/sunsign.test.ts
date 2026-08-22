import { describe, it, expect } from "vitest";
import { sunSignForDate } from "../src/sunsign";
import { computeNatalChart } from "../src/chart";
import { SUN_SIGN_BY_DAY } from "../src/sunsign-table";
import type { Sign } from "../src/types";

/** The Sun's sign from a real chart at a given UTC instant. */
function sunSignAt(utc: Date): Sign {
  const chart = computeNatalChart({ utc, latitude: 43.26, longitude: -2.93 });
  return chart.planets.find((p) => p.body === "Sun")!.sign;
}

describe("sunSignForDate", () => {
  it("names a sign on a day that is safely mid-sign", () => {
    expect(sunSignForDate("2000-07-28")).toEqual({ sign: "Leo", certain: true });
  });

  it("returns no sign when the day is not certain", () => {
    const guarded = Object.entries(SUN_SIGN_BY_DAY).find(([, v]) => v === null)!;
    const [key] = guarded;
    expect(sunSignForDate(`2000-${key}`)).toEqual({ sign: null, certain: false });
  });

  it("guards the days around a sign boundary", () => {
    // Leo begins on 22 or 23 July depending on the year, so the days either
    // side cannot be claimed. 28 July can.
    expect(sunSignForDate("2000-07-22").certain).toBe(false);
    expect(sunSignForDate("2000-07-23").certain).toBe(false);
    expect(sunSignForDate("2000-07-28").certain).toBe(true);
  });

  it("rejects a malformed date rather than guessing", () => {
    expect(sunSignForDate("nonsense")).toEqual({ sign: null, certain: false });
    expect(sunSignForDate("")).toEqual({ sign: null, certain: false });
    expect(sunSignForDate("2000-7-8")).toEqual({ sign: null, certain: false });
  });

  // THE PROPERTY THAT MATTERS. If this fails, the flow can announce ARTISTA
  // at question 2 and then hand back a card reading CONFIDENTE at question 4.
  // Explicit timeout: this runs thousands of real chart computations and takes
  // ~2s alone, which drifted past vitest's 5s default under parallel load and
  // made the whole suite flaky. Slow is fine; intermittent is not.
  it("never disagrees with computeNatalChart when it claims certainty", () => {
    const disagreements: string[] = [];
    for (let year = 1900; year <= 2030; year += 11) {
      for (let month = 1; month <= 12; month++) {
        for (const day of [1, 9, 17, 21, 22, 23, 24, 28]) {
          const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const guess = sunSignForDate(iso);
          if (!guess.certain) continue;
          // The bracket's own bounds plus the middle. The extremes are what
          // the guard is built on, so they are the offsets that can break it.
          for (const offset of [-12, 0, 14]) {
            const utc = new Date(Date.UTC(year, month - 1, day, 12, 0) - offset * 3600_000);
            // computeNatalChart rejects UTC years outside 1900-2100, so
            // 1900-01-01 east of Greenwich resolves to an instant it will not
            // chart. The property only has to hold where a chart can exist.
            if (utc.getUTCFullYear() < 1900 || utc.getUTCFullYear() > 2100) continue;
            const actual = sunSignAt(utc);
            if (actual !== guess.sign) {
              disagreements.push(`${iso} @${offset}: said ${guess.sign}, chart says ${actual}`);
            }
          }
        }
      }
    }
    expect(disagreements).toEqual([]);
  }, 30_000);

  // The extremes of the bracket, which the sampled property test above steps
  // over: local midnight at UTC+14 and local 23:59 at UTC-12.
  it("holds at both ends of the widest possible bracket", () => {
    const iso = "2000-07-28";
    const guess = sunSignForDate(iso);
    expect(guess.certain).toBe(true);
    const earliest = new Date(Date.UTC(2000, 6, 28, 0, 0) - 14 * 3600_000);
    const latest = new Date(Date.UTC(2000, 6, 28, 23, 59) + 12 * 3600_000);
    expect(sunSignAt(earliest)).toBe(guess.sign);
    expect(sunSignAt(latest)).toBe(guess.sign);
  });

  it("covers every calendar day including 29 February", () => {
    expect(Object.keys(SUN_SIGN_BY_DAY)).toHaveLength(366);
    expect(SUN_SIGN_BY_DAY["02-29"]).toBeDefined();
  });
});
