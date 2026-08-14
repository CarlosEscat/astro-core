import { describe, it, expect } from "vitest";
import { computeNatalChart } from "../src/chart";
import { resolveBirthUtc } from "../src/birthtime";
import { selectTraits, freeCard } from "../src/card";
import { elementBalance } from "../src/profile";
import { AREA_CORTA_ES } from "../src/copy/areas.es";
import { SUN_ES, MOON_ES, ASC_ES } from "../src/copy/signs.es";
import type { Aspect, AspectType, Body, NatalChart } from "../src/types";

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

  /**
   * The fusion-overflow fallback: a conjunction that finds `rasgos` full takes a
   * free `tensiones` slot instead of being dropped. None of the three fixture
   * charts can reach this state — in every one of them `rasgos` and `tensiones`
   * fill in an order that hits the break first — so it needs a built chart.
   * Aspects are ordered by ascending orb because that is what detectAspects
   * guarantees and what selectTraits relies on.
   */
  it("gives a fusion trait a tensiones slot when rasgos is full", () => {
    const aspect = (a: Body, b: Body, type: AspectType, orb: number): Aspect =>
      ({ a, b, type, angle: 0, orb, applying: false });
    const chart = {
      aspects: [
        aspect("Sun", "Jupiter", "trine", 1),
        aspect("Moon", "Venus", "sextile", 2),
        aspect("Mercury", "Mars", "trine", 3),
        aspect("Saturn", "Mars", "square", 4),
        aspect("Venus", "Mercury", "conjunction", 5),
      ],
    } as unknown as NatalChart;

    const { rasgos, tensiones } = selectTraits(chart);
    expect(rasgos).toHaveLength(3);
    expect(rasgos.every((t) => t.tone === "armonioso")).toBe(true);
    expect(tensiones).toHaveLength(2);
    expect(tensiones[1].tone).toBe("fusion");
    expect(tensiones[1].pair).toEqual(["Venus", "Mercury"]);
  });
});

describe("freeCard", () => {
  it("reads the class from the sun sign", () => {
    // bilbao-2000 is the Leo Sun chart (battery-sections.ts:45). If this fails,
    // the fixture differs from the note — fix the expectation, not the code.
    const { clase } = freeCard(bilbao);
    expect(clase.sign).toBe("Leo");
    expect(clase.nombre).toBe("ARTISTA");
  });

  it("reads how the reader is seen from the ascendant", () => {
    const card = freeCard(bilbao);
    expect(card.seVe.sign).toBe("Cancer");
    expect(card.seVe.signDegree).toBeGreaterThanOrEqual(0);
    expect(card.seVe.signDegree).toBeLessThan(30);
  });

  it("reads the inner world from the moon, as a life area", () => {
    // The canary's Moon is in Cancer, house 2 — asserted in tests/profile.test.ts.
    const card = freeCard(bilbao);
    expect(card.porDentro.sign).toBe("Cancer");
    expect(card.porDentro.area).toBe(AREA_CORTA_ES[2]);
  });

  it("carries the glosses Readout used to render", () => {
    const card = freeCard(bilbao);
    expect(card.clase.gloss).toBe(SUN_ES.Leo);
    expect(card.porDentro.gloss).toBe(MOON_ES.Cancer);
    expect(card.seVe.gloss).toBe(ASC_ES.Cancer);
  });

  it("carries a degree for each of the three, as Readout did", () => {
    const card = freeCard(bilbao);
    for (const d of [card.clase.signDegree, card.seVe.signDegree, card.porDentro.signDegree]) {
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThan(30);
    }
  });

  it("never exposes a house number", () => {
    for (const chart of Object.values(CHARTS)) {
      expect(JSON.stringify(freeCard(chart))).not.toMatch(/"house"/);
    }
  });

  it("omits the paid blocks entirely rather than hiding them", () => {
    const card = freeCard(bilbao) as unknown as Record<string, unknown>;
    for (const key of ["rasgos", "tensiones", "planetas", "definitorio"]) {
      expect(card[key], key).toBeUndefined();
    }
  });

  it("reports the real locked counts", () => {
    for (const chart of Object.values(CHARTS)) {
      const { rasgos, tensiones } = selectTraits(chart);
      const card = freeCard(chart);
      expect(card.bloqueado.rasgos).toBe(rasgos.length);
      expect(card.bloqueado.tensiones).toBe(tensiones.length);
      expect(card.bloqueado.planetas).toBe(7);
    }
  });

  it("carries the element distribution unchanged", () => {
    const card = freeCard(bilbao);
    expect(card.afinidad).toEqual(elementBalance(bilbao));
  });

  it("carries the computed rarity", () => {
    expect(freeCard(bilbao).rareza.oneIn).toBe(1728);
  });
});
