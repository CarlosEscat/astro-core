import { describe, it, expect } from "vitest";
import { AREA_ES } from "../src/copy/areas.es";
import { SIGN_ES, SIGN_GLYPH, SUN_ES, MOON_ES, ASC_ES, PARTNER_ES } from "../src/copy/signs.es";
import { SIGN_ORDER } from "../src/rulers";

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
