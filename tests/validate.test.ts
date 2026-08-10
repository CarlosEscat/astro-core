import { describe, it, expect } from "vitest";
import { computeNatalChart } from "../src/chart";
import { resolveBirthUtc } from "../src/birthtime";
import { validateProse, validateSection, countGenderMarks } from "../src/validate";
import { briefFor } from "../src/sections";

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

  // Same ASCII-\b root cause: "solía" ends the boundary at "sol" because "í"
  // is not an ASCII word character, so the Sun looked like it was named.
  it("does not find a planet inside an ordinary Spanish word", () => {
    const v = validateProse(
      "Eso que solía estar retrógrado ya no te frena.",
      bilbao, { ...RANGE, allowJargon: true },
    );
    expect(v.problems.join(" | ")).not.toContain("retrogradación inventada");
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

  // JavaScript's \b is ASCII-only even under /u, so it reads "ñ" and accented
  // vowels as non-word characters and finds a boundary inside a Spanish word.
  // "te hace soñar" was rejected as the non-word "te hace so" on the live
  // 2026-08-08 battery, burning a ~5 s retry for nothing.
  it.each([
    "te hace soñar con otra vida",
    "eso te hace daño y lo sabes",
    "te hace compañía cuando nadie más está",
    "te hace sombra sin darse cuenta",
    "te hace gracia que insistan",
    "te hace falta que te lo recuerden",
  ])("does not mistake a noun or infinitive for a gendered adjective: %s", (text) => {
    expect(problems(text)).not.toContain("marca de género");
  });

  // "contigo" ends in -o and was read as a masculine adjective. Observed as
  // `apertura: marca de género: "estás contigo"` on the same battery.
  it.each([
    "cuando estás contigo la cosa cambia",
    "lo que no dices ni estando conmigo",
    "quien no carga consigo esa historia",
  ])("does not read a pronoun as a gendered adjective: %s", (text) => {
    expect(problems(text)).not.toContain("marca de género");
  });

  // A false negative ships a gendered reading, which is worse than a retry:
  // the fixes above must not blunt the rule they sit inside.
  it.each([
    "eso te hace más profundo de lo que pareces",
    "te hace cauta con quien se acerca",
    "cuando estás cansada se te nota",
    "no es que seas directo, es que no filtras",
  ])("still rejects real gendered phrasing: %s", (text) => {
    expect(problems(text)).toContain("marca de género");
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

describe("per-section validation", () => {
  const brief = briefFor(3); // 200-250 words
  const words = (n: number) => Array.from({ length: n }, () => "palabra").join(" ") + ".";

  it("accepts a section inside its range", () => {
    expect(validateSection(words(220), brief).ok).toBe(true);
  });

  it("rejects a section that is empty", () => {
    expect(validateSection("   ", brief).ok).toBe(false);
  });

  it("rejects a section outside its word range", () => {
    expect(validateSection(words(80), brief).ok).toBe(false);
    expect(validateSection(words(900), brief).ok).toBe(false);
  });

  it("rejects a section cut off mid-sentence", () => {
    const truncated = Array.from({ length: 220 }, () => "palabra").join(" ");
    const v = validateSection(truncated, brief);
    expect(v.ok).toBe(false);
    expect(v.problems.join(" ")).toMatch(/truncad/i);
  });

  // The paid tier reports gender marks, it does not reject on them.
  it("counts gender marks without rejecting", () => {
    const text = words(210).replace("palabra.", "estás cansada.");
    const v = validateSection(text, brief);
    expect(v.ok).toBe(true);
    expect(v.genderMarks.length).toBeGreaterThan(0);
  });

  it("does not reject jargon, which the paid tier is allowed to use", () => {
    const text = words(210).replace("palabra.", "una conjunción exacta con Saturno retrógrado.");
    expect(validateSection(text, brief).ok).toBe(true);
  });

  it("countGenderMarks finds real marks and ignores clean prose", () => {
    expect(countGenderMarks("cuando estás cansada se te nota")).toHaveLength(1);
    expect(countGenderMarks("eres alguien que se guarda las cosas")).toHaveLength(0);
  });

  // Measured on the 2026-08-10 battery: all 16 rejections in 39 live calls
  // were word count, and each one escalated to Kimi — 5-10x the latency and
  // ~50x the cost to fix prose that was merely long. Length is advisory; only
  // empty and truncated output is worth spending another call on.
  describe("fatal vs advisory", () => {
    it("treats a long section as a problem but not a fatal one", () => {
      const v = validateSection(words(900), brief);
      expect(v.ok).toBe(false);
      expect(v.problems.join(" ")).toMatch(/palabras/);
      expect(v.fatal).toHaveLength(0);
    });

    it("treats a short section as advisory too", () => {
      expect(validateSection(words(80), brief).fatal).toHaveLength(0);
    });

    it("treats an empty section as fatal", () => {
      expect(validateSection("   ", brief).fatal).not.toHaveLength(0);
    });

    it("treats a truncated section as fatal", () => {
      const truncated = Array.from({ length: 220 }, () => "palabra").join(" ");
      expect(validateSection(truncated, brief).fatal.join(" ")).toMatch(/truncad/i);
    });

    it("leaves a clean section with nothing fatal and nothing to report", () => {
      const v = validateSection(words(220), brief);
      expect(v.ok).toBe(true);
      expect(v.fatal).toHaveLength(0);
    });
  });
});
