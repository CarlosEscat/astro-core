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

import { compatibleSigns, frictionSign, topMatches } from "../src/profile";
import { SIGN_ORDER, squareSigns } from "../src/rulers";

/** Same day and place as bilbao, six hours later: same Sun, different Ascendant. */
const bilbaoLater = chartFor({ year: 2000, month: 7, day: 30, hour: 10, minute: 15 }, 43.263, -2.935);

describe("compatibleSigns", () => {
  it("scores all twelve signs and sorts them descending", () => {
    const scored = compatibleSigns(bilbao);
    expect(scored).toHaveLength(12);
    expect(new Set(scored.map((s) => s.sign))).toEqual(new Set(SIGN_ORDER));
    for (let i = 1; i < scored.length; i++) {
      expect(scored[i - 1].score).toBeGreaterThanOrEqual(scored[i].score);
    }
  });

  it("puts the descendant sign first and explains why", () => {
    const top = compatibleSigns(bilbao)[0];
    expect(top.sign).toBe("Capricorn");
    expect(top.score).toBe(40);
    expect(top.reasons[0]).toContain("justo enfrente");
  });

  it("scores the sign holding the ruler of the seventh", () => {
    const taurus = compatibleSigns(bilbao).find((s) => s.sign === "Taurus")!;
    // 25 (Saturn, ruler of the 7th, sits there) + 7 (sextile to Mars in Cancer)
    expect(taurus.score).toBe(32);
  });

  it("weights the sun lowest of all the signals", () => {
    // Sagittarius gets 15 from Venus in Leo and only 5 from the Sun in Leo.
    const sag = compatibleSigns(bilbao).find((s) => s.sign === "Sagittarius")!;
    expect(sag.score).toBe(20);
    expect(sag.reasons).toHaveLength(2);
  });

  it("attaches a jargon-free reason to every contribution", () => {
    const jargon = /regente|casa\s*\d|tr[íi]gono|sextil|cuadratura|conjunci[óo]n|oposici[óo]n|orbe/i;
    for (const s of compatibleSigns(bilbao)) {
      for (const r of s.reasons) expect(r).not.toMatch(jargon);
    }
  });

  it("gives different answers for the same sun sign under a different ascendant", () => {
    expect(bilbaoLater.planets.find((p) => p.body === "Sun")!.sign).toBe("Leo");
    expect(bilbao.planets.find((p) => p.body === "Sun")!.sign).toBe("Leo");
    expect(bilbaoLater.angles.ascendant.sign).not.toBe(bilbao.angles.ascendant.sign);
    // This is the product's whole argument. If it ever stops being true, shout.
    expect(topMatches(bilbaoLater).map((s) => s.sign))
      .not.toEqual(topMatches(bilbao).map((s) => s.sign));
  });

  it("breaks ties by strongest single contribution, then zodiac order", () => {
    const scored = compatibleSigns(bilbao);
    const aries = scored.findIndex((s) => s.sign === "Aries");
    const sag = scored.findIndex((s) => s.sign === "Sagittarius");
    // Both score 20 with identical composition; Aries precedes Sagittarius.
    expect(aries).toBeLessThan(sag);
  });
});

describe("frictionSign", () => {
  it("squares the relationship axis", () => {
    const f = frictionSign(bilbao);
    expect(squareSigns("Capricorn")).toContain(f.sign);
    expect(f.sign).toBe("Aries");
  });

  it("picks the square sign you are also drawn to", () => {
    const scored = compatibleSigns(bilbao);
    const [a, b] = squareSigns("Capricorn");
    const scoreOf = (s: string) => scored.find((x) => x.sign === s)!.score;
    const expected = scoreOf(a) >= scoreOf(b) ? a : b;
    expect(frictionSign(bilbao).sign).toBe(expected);
  });

  it("explains itself without jargon", () => {
    expect(frictionSign(bilbao).reason).not.toMatch(/cuadratura|eje|Ascendente/i);
  });
});

describe("topMatches", () => {
  it("returns three signs and never the friction sign", () => {
    const top = topMatches(bilbao);
    expect(top).toHaveLength(3);
    expect(top.map((s) => s.sign)).not.toContain(frictionSign(bilbao).sign);
  });

  it("skips signs that scored nothing rather than padding", () => {
    for (const s of topMatches(bilbao)) expect(s.score).toBeGreaterThan(0);
  });
});
