import { describe, it, expect } from "vitest";
import { computeNatalChart } from "../src/chart";
import { resolveBirthUtc } from "../src/birthtime";
import {
  chartRuler, relationshipProfile, elementBalance, modalityBalance,
} from "../src/profile";

function chartFor(local: { year: number; month: number; day: number; hour: number; minute: number },
                  lat: number, lon: number) {
  const { utc } = resolveBirthUtc(local, lat, lon);
  return computeNatalChart({ utc, latitude: lat, longitude: lon });
}

/** Canary chart — breaks gender rules across all models (see HANDOVER Addendum 2). */
export const bilbao = chartFor({ year: 2000, month: 7, day: 30, hour: 4, minute: 15 }, 43.263, -2.935);

describe("chartRuler", () => {
  it("finds the ruler of the ascendant and its position", () => {
    const r = chartRuler(bilbao);
    expect(r.ascendant).toBe("Cancer");
    expect(r.body).toBe("Moon");
    expect(r.sign).toBe("Cancer");
    expect(r.house).toBe(2);
  });

  it("detects a ruler in its own sign", () => {
    expect(chartRuler(bilbao).inDomicile).toBe(true);
  });
});

describe("relationshipProfile", () => {
  it("reads the relationship axis from the descendant", () => {
    const p = relationshipProfile(bilbao);
    expect(p.descendant.sign).toBe("Capricorn");
    expect(p.rulerOfSeventh.body).toBe("Saturn");
    expect(p.rulerOfSeventh.sign).toBe("Taurus");
    expect(p.rulerOfSeventh.house).toBe(12);
  });

  it("carries Venus, Mars and Moon placements", () => {
    const p = relationshipProfile(bilbao);
    expect(p.venus.sign).toBe("Leo");
    expect(p.venus.house).toBe(3);
    expect(p.mars.sign).toBe("Cancer");
    expect(p.moon.sign).toBe("Cancer");
  });

  it("lists only aspects that actually involve Venus or Mars", () => {
    const p = relationshipProfile(bilbao);
    for (const a of p.venusAspects) expect([a.a, a.b]).toContain("Venus");
    for (const a of p.marsAspects) expect([a.a, a.b]).toContain("Mars");
    expect(p.venusAspects.some((a) => a.type === "opposition" &&
      [a.a, a.b].includes("Uranus"))).toBe(true);
  });

  it("reports an empty seventh house when nothing tenants it", () => {
    expect(relationshipProfile(bilbao).seventhHouseTenants).toEqual([]);
  });
});

describe("balances", () => {
  it("weights luminaries and angles above outer planets", () => {
    const b = elementBalance(bilbao);
    expect(b.total).toBeCloseTo(20.5, 5);
    expect(b.dominant).toBe("Agua");
    expect(b.weakest).toBe("Tierra");
    expect(b.totals.Tierra).toBeCloseTo(1, 5);
    expect(b.totals.Agua).toBeCloseTo(12, 5);
  });

  it("totals modality with the same weights", () => {
    const m = modalityBalance(bilbao);
    expect(m.total).toBeCloseTo(20.5, 5);
    expect(m.dominant).toBe("Cardinal");
  });

  it("keeps every element and modality key present even at zero", () => {
    const b = elementBalance(bilbao);
    expect(Object.keys(b.totals).sort()).toEqual(["Agua", "Aire", "Fuego", "Tierra"]);
    const m = modalityBalance(bilbao);
    expect(Object.keys(m.totals).sort()).toEqual(["Cardinal", "Fijo", "Mutable"]);
  });
});
