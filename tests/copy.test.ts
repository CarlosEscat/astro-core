import { describe, it, expect } from "vitest";
import { AREA_ES, AREA_CORTA_ES } from "../src/copy/areas.es";
import { SIGN_ES, SIGN_GLYPH, SUN_ES, MOON_ES, ASC_ES, PARTNER_ES } from "../src/copy/signs.es";
import { CLASS_ES } from "../src/copy/classes.es";
import { SIGN_ORDER } from "../src/rulers";
import { copyProblems, countGenderMarks } from "../src/validate";
import {
  CLASE_REACCION_ES, CUSPIDE_ES, DIAL_ES,
  HORA_DESCONOCIDA_ES, ERRORES_ES,
} from "../src/copy/flow.es";

const TABLES = { SUN_ES, MOON_ES, ASC_ES, PARTNER_ES, SIGN_ES, SIGN_GLYPH };

describe("area copy", () => {
  it("covers all twelve houses", () => {
    for (let h = 1; h <= 12; h++) {
      expect(AREA_ES[h]).toBeTruthy();
      expect(AREA_ES[h].length).toBeGreaterThan(10);
    }
  });

  it("never mentions a house number", () => {
    for (let h = 1; h <= 12; h++) expect(AREA_ES[h]).not.toMatch(/casa\s*\d|\bcasa\b/i);
  });
});

describe("sign copy", () => {
  it("covers all twelve signs in every table", () => {
    for (const [name, table] of Object.entries(TABLES)) {
      for (const sign of SIGN_ORDER) {
        expect(table[sign], `${name}.${sign}`).toBeTruthy();
      }
    }
  });

  it("keeps glyphs as engraved text, not colour emoji", () => {
    for (const sign of SIGN_ORDER) expect(SIGN_GLYPH[sign]).toContain("︎");
  });

  it("uses no astrology jargon in reader-facing lines", () => {
    const jargon = /regente|domicilio|casa\s*\d|tr[íi]gono|sextil|cuadratura|conjunci[óo]n|oposici[óo]n|orbe|retr[óo]grad/i;
    for (const table of [SUN_ES, MOON_ES, ASC_ES, PARTNER_ES]) {
      for (const sign of SIGN_ORDER) expect(table[sign]).not.toMatch(jargon);
    }
  });

  it("never names a sign inside its own description", () => {
    for (const table of [SUN_ES, MOON_ES, ASC_ES, PARTNER_ES]) {
      for (const sign of SIGN_ORDER) {
        expect(table[sign].toLowerCase()).not.toContain(SIGN_ES[sign].toLowerCase());
      }
    }
  });
});

describe("copy gender neutrality", () => {
  // Same shapes the output gate applies to the model. Hand-written copy is
  // held to the identical standard.
  const GENDERED = [
    /\b(?:t[uú]|ti|s[ií])\s+mism[oa]\b/iu,
    /\b(?:ser|estar|verte|sentirte|sentirse)\s+(?:\p{L}+(?:ad|id)|vist|hech|dich|puest|abiert)[oa]s?\b/iu,
    // The gerund exclusion is load-bearing: -ando/-iendo never carries gender,
    // and without it every "estás buscando" reads as a gendered adjective.
    /\b(?:eres|seas|fueras|est[áa]s)\s+(?:m[áa]s\s+|muy\s+|tan\s+|un[ao]\s+)?(?!\p{L}*(?:ando|iendo)\b)\p{L}{4,}[oa]\b/iu,
    /\bte\s+(?:hace|vuelve|convierte)\s+(?:en\s+)?(?:m[áa]s\s+)?\p{L}+[oa]\b/iu,
    /\b(?:juntos|solos|cansad[oa]s?|tranquil[oa]s?)\b/iu,
  ];

  it("has no gendered agreement aimed at the reader", () => {
    for (const table of [SUN_ES, MOON_ES, ASC_ES, PARTNER_ES]) {
      for (const sign of SIGN_ORDER) {
        for (const re of GENDERED) {
          expect(table[sign], `${sign}: ${table[sign]}`).not.toMatch(re);
        }
      }
    }
  });
});

describe("short area copy", () => {
  it("covers all twelve houses", () => {
    for (let h = 1; h <= 12; h++) expect(AREA_CORTA_ES[h]).toBeTruthy();
  });

  it("stays short enough for a card row", () => {
    for (let h = 1; h <= 12; h++) {
      const words = AREA_CORTA_ES[h].split(/\s+/).length;
      expect(words, `house ${h}`).toBeLessThanOrEqual(6);
    }
  });

  it("never numbers a house and never says casa", () => {
    for (let h = 1; h <= 12; h++) {
      expect(AREA_CORTA_ES[h]).not.toMatch(/\d/);
      expect(AREA_CORTA_ES[h]).not.toMatch(/\bcasa\b/i);
    }
  });

  it("carries no jargon or cliché", () => {
    for (let h = 1; h <= 12; h++) expect(copyProblems(AREA_CORTA_ES[h])).toEqual([]);
  });

  it("does not repeat the long form", () => {
    for (let h = 1; h <= 12; h++) expect(AREA_CORTA_ES[h]).not.toBe(AREA_ES[h]);
  });
});

describe("class copy", () => {
  it("covers all twelve signs", () => {
    for (const sign of SIGN_ORDER) expect(CLASS_ES[sign]).toBeTruthy();
  });

  it("gives every sign a distinct class", () => {
    expect(new Set(Object.values(CLASS_ES)).size).toBe(12);
  });

  it("carries no gender mark", () => {
    for (const sign of SIGN_ORDER) {
      expect(countGenderMarks(CLASS_ES[sign]), sign).toEqual([]);
    }
  });

  it("carries no jargon or cliché", () => {
    for (const sign of SIGN_ORDER) expect(copyProblems(CLASS_ES[sign])).toEqual([]);
  });

  it("uses no article, so it cannot inflect", () => {
    for (const sign of SIGN_ORDER) {
      expect(CLASS_ES[sign], sign).not.toMatch(/^(el|la|los|las)\s/i);
    }
  });

  it("is a single word, keeping one register", () => {
    for (const sign of SIGN_ORDER) {
      expect(CLASS_ES[sign].split(/\s+/), sign).toHaveLength(1);
    }
  });

  // The frozen-table risk, made mechanical. A name that inflects (-o/-a, as in
  // médico/médica) ships a gendered reading to every reader of that sign, and
  // nothing catches it at runtime — that is the whole point of freezing the
  // table. Every invariable Spanish agent noun here ends in -ista, -ega or -e
  // (combatiente, navegante, orfebre), so the ending IS the guarantee.
  // countGenderMarks cannot do this job: its patterns all need a verb or
  // pronoun in front, which a bare noun never supplies.
  it("uses only endings that cannot inflect for gender", () => {
    for (const sign of SIGN_ORDER) {
      expect(CLASS_ES[sign], sign).toMatch(/(?:ISTA|EGA|E)$/);
    }
  });
});

describe("flow copy", () => {
  it("has a reaction for all twelve classes", () => {
    for (const sign of SIGN_ORDER) {
      expect(CLASE_REACCION_ES[sign], sign).toBeTruthy();
    }
    expect(Object.keys(CLASE_REACCION_ES)).toHaveLength(12);
  });

  it("has six dial lines, and the placeholders they promise", () => {
    expect(DIAL_ES).toHaveLength(6);
    const all = DIAL_ES.join(" ");
    for (const token of ["{coords}", "{ciudad}", "{fecha}"]) {
      expect(all, token).toContain(token);
    }
  });

  // The epicene rule. These are second-person Spanish, which is exactly where
  // gendered participles get in.
  it("is free of gendered and jargon copy", () => {
    const lines = [
      ...Object.values(CLASE_REACCION_ES),
      ...DIAL_ES,
      ...Object.values(ERRORES_ES),
      CUSPIDE_ES,
      HORA_DESCONOCIDA_ES,
    ];
    const bad = lines.flatMap((line) => copyProblems(line).map((p) => `${line} → ${p}`));
    expect(bad).toEqual([]);
  });
});
