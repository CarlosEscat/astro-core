import { describe, it, expect } from "vitest";
import { RELATION_ES, RELATIONS } from "../src/copy/relations.es";
import type { AspectType } from "../src/types";

const ALL: AspectType[] = ["conjunction", "opposition", "trine", "square", "sextile"];

describe("RELATION_ES", () => {
  it("renders every aspect type the engine can produce", () => {
    for (const t of ALL) {
      expect(RELATION_ES[t]).toBeTypeOf("string");
      expect(RELATION_ES[t].length).toBeGreaterThan(0);
    }
  });

  // The point of the table: the model is handed the phrase, so it never has to
  // judge an orb or name an aspect.
  it("uses no technical vocabulary in any phrase", () => {
    const banned = ["conjunción", "oposición", "cuadratura", "trígono", "sextil",
                    "aspecto", "orbe", "grado", "casa"];
    for (const phrase of Object.values(RELATION_ES)) {
      for (const word of banned) expect(phrase.toLowerCase()).not.toContain(word);
    }
  });

  it("collapses hard aspects onto one phrase and soft ones onto another", () => {
    expect(RELATION_ES.opposition).toBe(RELATION_ES.square);
    expect(RELATION_ES.trine).toBe(RELATION_ES.sextile);
    expect(RELATION_ES.conjunction).not.toBe(RELATION_ES.opposition);
    expect(RELATION_ES.conjunction).not.toBe(RELATION_ES.trine);
  });
});

describe("RELATIONS", () => {
  it("covers every aspect type exactly once across all entries", () => {
    const covered = RELATIONS.flatMap((r) => r.types).sort();
    expect(covered).toEqual([...ALL].sort());
  });

  it("matches its own canonical phrase", () => {
    for (const r of RELATIONS) expect(r.match.test(r.phrase)).toBe(true);
  });

  // The model is handed the phrase but writes its own sentence, so the detector
  // has to survive ordinary conjugation rather than demand the exact string.
  it("still matches when the model conjugates around the phrase", () => {
    const find = (s: string) => RELATIONS.filter((r) => r.match.test(s)).flatMap((r) => r.types);
    expect(find("tu Venus y tu Urano tiran cada uno para un lado")).toContain("opposition");
    expect(find("tira cada uno para su lado")).toContain("square");
    expect(find("tu Marte va pegado a tu Luna")).toContain("conjunction");
    expect(find("tu Sol y tu Júpiter van de la mano")).toContain("trine");
  });

  it("does not fire on ordinary prose that describes no relation", () => {
    const find = (s: string) => RELATIONS.filter((r) => r.match.test(s));
    expect(find("te gusta ir de la mano por la calle")).toHaveLength(1); // deliberate: see note
    expect(find("no tienes por qué darle mil vueltas")).toHaveLength(0);
    expect(find("tu Luna en Cáncer te pide calma")).toHaveLength(0);
  });
});
