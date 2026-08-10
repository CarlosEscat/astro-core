import { describe, it, expect } from "vitest";
import { computeNatalChart } from "../src/chart";
import { resolveBirthUtc } from "../src/birthtime";
import { buildSectionMessages } from "../src/report";
import { allocateFeatures } from "../src/allocate";

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

  it("names the section and its word range in the user message", () => {
    const user = build(4)[1].content;
    expect(user).toContain("Amor y vínculos");
    expect(user).toContain("300");
    expect(user).toContain("350");
  });

  it("grows the range under a matching focus", () => {
    expect(build(4, { focus: "amor" })[1].content).toContain("450");
  });

  it("hands the section its allocated aspects and names what is reserved", () => {
    const user = build(6)[1].content;
    for (const ref of allocation[6].aspects) expect(user).toContain(ref.a);
    expect(user.toLowerCase()).toContain("no uses");
  });

  it("gives the synthesis section the earlier openings", () => {
    const user = build(7, { priorOpenings: ["Abre así.", "Y luego así."] })[1].content;
    expect(user).toContain("Abre así.");
    expect(user).toContain("Y luego así.");
  });

  it("carries both rule fragments, since it receives the chart JSON", () => {
    const system = build(0)[0].content;
    expect(system).toContain("No asumas ni indiques el género de la persona");
    expect(system).toContain("figuren en la lista `aspects`");
    expect(system).not.toMatch(/\{\{[A-Z_]+\}\}/);
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
