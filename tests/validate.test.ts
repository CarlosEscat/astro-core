import { describe, it, expect } from "vitest";
import { computeNatalChart } from "../src/chart";
import { resolveBirthUtc } from "../src/birthtime";
import { validateProse } from "../src/validate";

const { utc } = resolveBirthUtc({ year: 2000, month: 7, day: 30, hour: 4, minute: 15 }, 43.263, -2.935);
const bilbao = computeNatalChart({ utc, latitude: 43.263, longitude: -2.935 });

const RANGE = { minWords: 1, maxWords: 500 };
const check = (text: string) => validateProse(text, bilbao, RANGE);
const problems = (text: string) => check(text).problems.join(" | ");

describe("jargon ban", () => {
  it.each([
    "forman una conjunción exacta",
    "ese trígono entre tu Sol y Plutón",
    "el regente de tu casa 7 es Saturno",
    "Mercurio en Cáncer en la casa 1",
    "con apenas 1,29º de orbe",
    "Plutón retrógrado en Escorpio",
  ])("rejects %s", (text) => {
    expect(check(text).ok).toBe(false);
  });

  it("allows plain planet and sign names", () => {
    expect(check("Tu Venus en Leo quiere que te miren.").ok).toBe(true);
  });
});

describe("cliché ban", () => {
  it("rejects the model's favourite phrases", () => {
    expect(problems("una intuición casi telepática")).toContain("cliché");
    expect(problems("una danza entre dos necesidades")).toContain("cliché");
    expect(problems("bajo esa coraza emocional")).toContain("cliché");
  });

  it("rejects sample lines copied out of the prompt", () => {
    expect(problems("quieres fuegos artificiales con alguien que llegue puntual"))
      .toContain("cliché");
  });
});

describe("false placement claims", () => {
  it("catches a planet placed in the wrong sign", () => {
    // Jupiter is in Gemini, not Taurus.
    expect(problems("tu Júpiter en Tauro")).toContain("signo");
  });

  it("accepts a correct sign claim", () => {
    expect(check("tu Júpiter en Géminis").ok).toBe(true);
  });
});

describe("gendered phrasing aimed at the reader", () => {
  it.each([
    "te convierte en una diplomática innata",
    "eso te hace más profundo de lo que pareces",
    "no es que seas tacaño con el dinero",
    "cuando estás emocionado se te nota",
    "que te digan que eres única",
    "ni tú misma lo ves del todo",
    "necesitas ser vista",
  ])("rejects %s", (text) => {
    expect(check(text).ok).toBe(false);
  });

  it("accepts the neutral rewrite", () => {
    expect(check("necesitas que te miren y que te lo digan").ok).toBe(true);
    expect(check("eres alguien que se guarda las cosas").ok).toBe(true);
  });
});

describe("partner gendering", () => {
  it("rejects gendering the other person", () => {
    expect(check("quien se siente envuelto por tu calidez").ok).toBe(false);
    expect(check("cuando tu chica te lo pide").ok).toBe(false);
  });

  it("accepts neutral forms", () => {
    expect(check("quien tienes delante no siempre lo entiende").ok).toBe(true);
  });
});

describe("headings", () => {
  it("rejects a heading when the interface already prints one", () => {
    expect(problems("## En el amor\n\nTu Venus en Leo.")).toContain("encabezado");
  });

  it("allows headings when asked to", () => {
    const v = validateProse("## APERTURA\n\nTexto.", bilbao, { ...RANGE, allowHeading: true });
    expect(v.problems.join(" ")).not.toContain("encabezado");
  });
});

describe("word range", () => {
  it("reports counts outside the range", () => {
    expect(problems("corto")).toBe("");
    const v = validateProse("una dos tres", bilbao, { minWords: 5, maxWords: 10 });
    expect(v.problems.join(" ")).toContain("palabras");
  });
});

import { repair } from "../src/validate";

describe("repair", () => {
  it.each([
    ["que eres única", "que no hay nadie como tú"],
    ["necesitas ser vista", "necesitas que te miren"],
    ["quieres ser admirada", "quieres que te admiren"],
    ["sentirte comprendida", "que te entiendan"],
    ["ni tú misma lo ves", "ni tú lo ves"],
    ["eres de los que guardan", "eres de quienes guardan"],
  ])("rewrites %s", (input, expected) => {
    expect(repair(input)).toContain(expected);
  });

  it("turns a rejected text into a passing one", () => {
    const before = "Tu Venus en Leo necesita ser vista y que te lo digan.";
    expect(check(before).ok).toBe(false);
    expect(check(repair(before)).ok).toBe(true);
  });

  it("leaves clean text untouched", () => {
    const clean = "Tu Venus en Leo necesita que te miren.";
    expect(repair(clean)).toBe(clean);
  });

  it("does not attempt semantic repair of unknown phrasing", () => {
    const unknown = "no es que seas tacaño con el dinero";
    expect(repair(unknown)).toBe(unknown);
    expect(check(repair(unknown)).ok).toBe(false);
  });
});
