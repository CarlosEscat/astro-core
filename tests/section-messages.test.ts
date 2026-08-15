import { describe, it, expect } from "vitest";
import { computeNatalChart } from "../src/chart";
import { resolveBirthUtc } from "../src/birthtime";
import { buildSectionMessages } from "../src/report";
import { allocateFeatures } from "../src/allocate";
import { PLANET_ES } from "../src/copy/signs.es";

const { utc } = resolveBirthUtc({ year: 1992, month: 4, day: 15, hour: 10, minute: 30 }, 40.4168, -3.7038);
const chart = computeNatalChart({ utc, latitude: 40.4168, longitude: -3.7038 });
const allocation = allocateFeatures(chart);
const build = (section: number, extra = {}) =>
  buildSectionMessages({ chart, section, allocation, ...extra });

describe("section message builder", () => {
  it("returns a system and a user message", () => {
    const msgs = build(1);
    expect(msgs).toHaveLength(2);
    expect(msgs[0].role).toBe("system");
    expect(msgs[1].role).toBe("user");
  });

  // Asserted as the whole sentence, not as bare numbers: the chart JSON is in
  // the same message and a loose "350" can match a degree or an orb.
  it("names the section and its word range in the user message", () => {
    const user = build(4)[1].content;
    expect(user).toContain("Amor y vínculos");
    expect(user).toContain("Extensión: entre 350 y 480 palabras.");
  });

  it("grows the range under a matching focus", () => {
    expect(build(4, { focus: "amor" })[1].content).toContain("Extensión: entre 350 y 600 palabras.");
  });

  // The contract survives the register change, but the names do not: bodies
  // reach the model in Spanish now, and the reservation is one instruction
  // pointing at `no_son_tuyas` rather than a printed list of aspect lines.
  it("hands the section its allocated relations and names what is reserved", () => {
    const user = build(6)[1].content;
    for (const ref of allocation[6].aspects) expect(user).toContain(PLANET_ES[ref.a]);
    expect(user).toContain("no_son_tuyas");
    expect(user.toLowerCase()).toContain("no los desarrolles");
  });

  it("gives the synthesis section the earlier openings", () => {
    const user = build(7, { priorOpenings: ["Abre así.", "Y luego así."] })[1].content;
    expect(user).toContain("Abre así.");
    expect(user).toContain("Y luego así.");
  });

  it("carries the universal rules but NOT the chart-data vocabulary", () => {
    const system = build(0)[0].content;
    expect(system).toContain("No asumas ni indiques el género de la persona");
    expect(system).not.toContain("figuren en la lista `aspects`");
    expect(system).not.toContain('La palabra "retrógrado" solo puede aplicarse');
    expect(system).not.toMatch(/\{\{[A-Z_]+\}\}/);
  });

  it("tells the model how many paragraphs to write", () => {
    expect(build(7)[1].content).toMatch(/Estructura: entre 3 y 4 párrafos\./);
  });

  it("asks a grown section for more paragraphs", () => {
    expect(build(4, { focus: "amor" })[1].content)
      .toMatch(/Estructura: entre 5 y 6 párrafos\./);
  });

  it("never asks the model to emit the heading", () => {
    const system = build(0)[0].content;
    expect(system.toLowerCase()).toContain("sin encabezado");
  });

  it("carries no PII beyond a sanitized first name", () => {
    const all = build(0, { firstName: "Lucía<script>" }).map((m) => m.content).join(" ");
    expect(all).toContain("Lucía");
    expect(all).not.toContain("<script>");
    expect(all).not.toContain("1992");
    expect(all).not.toContain("40.41");
  });

  it("rejects an out-of-range section", () => {
    expect(() => build(8)).toThrow();
  });
});

describe("the section prompt receives no technical data", () => {
  const user = (section: number) => build(section)[1].content;

  // Fixture is madrid-1992, computed not guessed: Venus is in Aries (not Leo),
  // no planet occupies house 3 (so no "barrio" gloss), section 4 owns two
  // sextiles (so "van de la mano", not "tiran cada uno para un lado"), and
  // Júpiter and Plutón are the retrograde bodies.
  it("names houses as life areas, never as numbers", () => {
    const text = user(4);
    expect(text).toContain("tus amistades, tus grupos y lo que quieres para el futuro");
    expect(text).not.toMatch(/casas?\s*\d/iu);
    expect(text).not.toMatch(/"house"/);
  });

  // Written in the negative on purpose: this is the assertion that enforces
  // "it cannot misstate an orb it never sees".
  it("hands over no degrees and no orbs", () => {
    const text = user(4);
    expect(text).not.toContain("orbe");
    expect(text).not.toMatch(/\d+([.,]\d+)?\s*°/u);
    expect(text).not.toMatch(/"degree"/);
    expect(text).not.toMatch(/"orb"/);
  });

  it("renders allocated relations as plain phrases, not aspect names", () => {
    const text = user(4);
    expect(text).toContain("van de la mano");
    for (const word of ["conjunción", "oposición", "cuadratura", "trígono", "sextil"]) {
      expect(text.toLowerCase()).not.toContain(word);
    }
  });

  it("never leaks the retrograde flag", () => {
    const all = [0, 1, 2, 3, 4, 5, 6, 7].map(user).join("\n");
    expect(all.toLowerCase()).not.toContain("retrógrad");
    expect(all).not.toMatch(/"retrograde"/);
  });

  it("still names planets and signs, which both tiers keep", () => {
    const text = user(4);
    expect(text).toContain("Venus");
    expect(text).toContain("Aries");
  });

  it("still reserves the other sections' relations", () => {
    const text = user(4);
    expect(text).toMatch(/no los desarrolles/i);
  });
});
