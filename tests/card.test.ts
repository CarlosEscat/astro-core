import { describe, it, expect } from "vitest";
import { computeNatalChart } from "../src/chart";
import { resolveBirthUtc } from "../src/birthtime";
import { selectTraits } from "../src/card";
import type { Body, NatalChart } from "../src/types";

function chartFor(
  local: { year: number; month: number; day: number; hour: number; minute: number },
  lat: number, lon: number,
): NatalChart {
  const { utc } = resolveBirthUtc(local, lat, lon);
  return computeNatalChart({ utc, latitude: lat, longitude: lon });
}

// The three canonical battery charts, copied from scripts/battery-sections.ts:43-46.
// Keep them identical to that file — every measurement in HANDOVER is against these.
const madrid = chartFor({ year: 1992, month: 4, day: 15, hour: 10, minute: 30 }, 40.4168, -3.7038);
const buenosaires = chartFor({ year: 1985, month: 11, day: 2, hour: 11, minute: 20 }, -34.6037, -58.3816);
/** The canary. Leo Sun/Venus drags Spanish toward feminine participles. */
const bilbao = chartFor({ year: 2000, month: 7, day: 30, hour: 4, minute: 15 }, 43.263, -2.935);
const CHARTS = { madrid, buenosaires, bilbao };

const OUTER: Body[] = ["Uranus", "Neptune", "Pluto"];

describe("selectTraits", () => {
  it("never returns a generational pair", () => {
    for (const [name, chart] of Object.entries(CHARTS)) {
      const { rasgos, tensiones } = selectTraits(chart);
      for (const t of [...rasgos, ...tensiones]) {
        const bothOuter = OUTER.includes(t.pair[0]) && OUTER.includes(t.pair[1]);
        expect(bothOuter, `${name}: ${t.pair.join("-")}`).toBe(false);
      }
    }
  });

  it("respects the caps", () => {
    for (const chart of Object.values(CHARTS)) {
      const { rasgos, tensiones } = selectTraits(chart);
      expect(rasgos.length).toBeLessThanOrEqual(3);
      expect(tensiones.length).toBeLessThanOrEqual(2);
    }
  });

  it("keeps the tightest aspects first", () => {
    for (const chart of Object.values(CHARTS)) {
      const { rasgos, tensiones } = selectTraits(chart);
      for (const list of [rasgos, tensiones]) {
        const orbs = list.map((t) => t.orb);
        expect(orbs).toEqual([...orbs].sort((a, b) => a - b));
      }
    }
  });

  it("maps aspect type to tone", () => {
    for (const chart of Object.values(CHARTS)) {
      const { rasgos, tensiones } = selectTraits(chart);
      for (const t of [...rasgos, ...tensiones]) {
        if (t.aspect === "trine" || t.aspect === "sextile") expect(t.tone).toBe("armonioso");
        else if (t.aspect === "square" || t.aspect === "opposition") expect(t.tone).toBe("tenso");
        else expect(t.tone).toBe("fusion");
      }
    }
  });

  it("never puts a tense aspect in rasgos", () => {
    for (const chart of Object.values(CHARTS)) {
      for (const t of selectTraits(chart).rasgos) expect(t.tone).not.toBe("tenso");
    }
  });

  it("carries the real orb from the chart", () => {
    const { rasgos, tensiones } = selectTraits(bilbao);
    for (const t of [...rasgos, ...tensiones]) {
      const real = bilbao.aspects.find(
        (a) => a.a === t.pair[0] && a.b === t.pair[1] && a.type === t.aspect,
      );
      expect(real, `${t.pair.join("-")} must exist in the chart`).toBeDefined();
      expect(t.orb).toBe(real!.orb);
    }
  });

  it("finds traits on every fixture chart", () => {
    for (const [name, chart] of Object.entries(CHARTS)) {
      const { rasgos, tensiones } = selectTraits(chart);
      expect(rasgos.length + tensiones.length, name).toBeGreaterThan(0);
    }
  });
});
