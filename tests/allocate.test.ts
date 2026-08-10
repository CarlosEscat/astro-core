import { describe, it, expect } from "vitest";
import { computeNatalChart } from "../src/chart";
import { resolveBirthUtc } from "../src/birthtime";
import { allocateFeatures } from "../src/allocate";
import type { AspectRef } from "../src/allocate";

function chartFor(
  local: { year: number; month: number; day: number; hour: number; minute: number },
  latitude: number, longitude: number,
) {
  const { utc } = resolveBirthUtc(local, latitude, longitude);
  return computeNatalChart({ utc, latitude, longitude });
}

const madrid = chartFor({ year: 1992, month: 4, day: 15, hour: 10, minute: 30 }, 40.4168, -3.7038);
const bilbao = chartFor({ year: 2000, month: 7, day: 30, hour: 4, minute: 15 }, 43.263, -2.935);

const key = (r: AspectRef) => `${r.a}-${r.b}-${r.type}`;

describe("feature allocation", () => {
  it("returns one allocation per section", () => {
    expect(allocateFeatures(madrid)).toHaveLength(8);
  });

  // The whole point: two sections describing the same aspect is the failure
  // mode that made single-call generation safer than concurrent generation.
  it("never gives the same aspect to two sections", () => {
    for (const chart of [madrid, bilbao]) {
      const seen = new Set<string>();
      for (const alloc of allocateFeatures(chart)) {
        for (const ref of alloc.aspects) {
          expect(seen.has(key(ref))).toBe(false);
          seen.add(key(ref));
        }
      }
    }
  });

  it("gives the two most exact aspects to Tus luces y tus sombras", () => {
    const alloc = allocateFeatures(madrid);
    const tightest = madrid.aspects.slice(0, 2).map((a) => `${a.a}-${a.b}-${a.type}`);
    expect(alloc[6].aspects.map(key)).toEqual(tightest);
  });

  it("reserves for each section exactly what the others own", () => {
    const allocs = allocateFeatures(madrid);
    for (let i = 0; i < allocs.length; i++) {
      const mine = new Set(allocs[i].aspects.map(key));
      const others = allocs
        .filter((_, j) => j !== i)
        .flatMap((a) => a.aspects.map(key));
      expect(new Set(allocs[i].reserved.map(key))).toEqual(new Set(others));
      for (const r of allocs[i].reserved.map(key)) expect(mine.has(r)).toBe(false);
    }
  });

  it("gives the Sun section an aspect involving the Sun when one is free", () => {
    const alloc = allocateFeatures(madrid);
    for (const ref of alloc[1].aspects) {
      expect(ref.a === "Sun" || ref.b === "Sun").toBe(true);
    }
  });

  it("is deterministic", () => {
    expect(allocateFeatures(madrid)).toEqual(allocateFeatures(madrid));
  });

  it("survives a chart with almost no aspects", () => {
    const bare = { ...madrid, aspects: madrid.aspects.slice(0, 1) };
    const allocs = allocateFeatures(bare);
    expect(allocs).toHaveLength(8);
    expect(allocs.flatMap((a) => a.aspects)).toHaveLength(1);
  });
});
