import { describe, it, expect } from "vitest";
import { computeNatalChart } from "../src/chart";
import { resolveBirthUtc } from "../src/birthtime";
import { validateProse, validateSection, countGenderMarks, copyProblems, groundingProblems } from "../src/validate";
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
    expect(validateSection(words(220), brief, bilbao).ok).toBe(true);
  });

  it("rejects a section that is empty", () => {
    expect(validateSection("   ", brief, bilbao).ok).toBe(false);
  });

  it("rejects a section outside its word range", () => {
    expect(validateSection(words(80), brief, bilbao).ok).toBe(false);
    expect(validateSection(words(900), brief, bilbao).ok).toBe(false);
  });

  it("rejects a section cut off mid-sentence", () => {
    const truncated = Array.from({ length: 220 }, () => "palabra").join(" ");
    const v = validateSection(truncated, brief, bilbao);
    expect(v.ok).toBe(false);
    expect(v.problems.join(" ")).toMatch(/truncad/i);
  });

  // The paid tier reports gender marks, it does not reject on them.
  it("counts gender marks without rejecting", () => {
    const text = words(210).replace("palabra.", "estás cansada.");
    const v = validateSection(text, brief, bilbao);
    expect(v.ok).toBe(true);
    expect(v.genderMarks.length).toBeGreaterThan(0);
  });

  it("does not reject jargon, which the paid tier is allowed to use", () => {
    const text = words(210).replace("palabra.", "una conjunción de manual y un orbe estrechísimo.");
    expect(validateSection(text, brief, bilbao).ok).toBe(true);
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
      const v = validateSection(words(900), brief, bilbao);
      expect(v.ok).toBe(false);
      expect(v.problems.join(" ")).toMatch(/palabras/);
      expect(v.fatal).toHaveLength(0);
    });

    it("treats a short section as advisory too", () => {
      expect(validateSection(words(80), brief, bilbao).fatal).toHaveLength(0);
    });

    it("treats an empty section as fatal", () => {
      expect(validateSection("   ", brief, bilbao).fatal).not.toHaveLength(0);
    });

    it("treats a truncated section as fatal", () => {
      const truncated = Array.from({ length: 220 }, () => "palabra").join(" ");
      expect(validateSection(truncated, brief, bilbao).fatal.join(" ")).toMatch(/truncad/i);
    });

    it("leaves a clean section with nothing fatal and nothing to report", () => {
      const v = validateSection(words(220), brief, bilbao);
      expect(v.ok).toBe(true);
      expect(v.fatal).toHaveLength(0);
    });
  });

  /**
   * An invented retrogradation shipped in bakeoff-out/sections/madrid-1992.md
   * because validateSection checked length and truncation but never grounding
   * — while validateProse had caught exactly this class on the free tier all
   * along. Grounding is the rubric's eliminatory criterion and the only error
   * class the buyer can personally verify against their own chart, so it is
   * fatal: unlike length, another call can genuinely fix it.
   */
  describe("grounding is fatal", () => {
    const body = (claim: string) => words(210).replace("palabra.", claim);

    it("rejects an invented retrogradation", () => {
      // bilbao's retrogrades are Uranus, Neptune and Pluto — not Saturn.
      const v = validateSection(body("tu Saturno retrógrado en Tauro."), brief, bilbao);
      expect(v.ok).toBe(false);
      expect(v.fatal.join(" ")).toMatch(/retrogradación inventada/);
    });

    it("rejects a planet placed in the wrong sign", () => {
      const v = validateSection(body("tu Júpiter en Tauro te frena."), brief, bilbao);
      expect(v.fatal.join(" ")).toMatch(/signo falso/);
    });

    it("rejects an aspect the chart does not contain", () => {
      const v = validateSection(body("la cuadratura entre tu Luna y tu Saturno pesa."), brief, bilbao);
      expect(v.fatal.join(" ")).toMatch(/relación no presente/);
    });

    it("accepts claims that are true of the chart", () => {
      for (const claim of [
        "tu Júpiter en Géminis abre puertas.",          // real sign
        "tu Neptuno retrógrado en Acuario lo difumina.", // really retrograde
        "el trígono entre tu Júpiter y Neptuno sostiene.", // real aspect
      ]) {
        const v = validateSection(body(claim), brief, bilbao);
        expect(v.fatal, claim).toHaveLength(0);
      }
    });

    // This is the exact line that shipped, on the chart it shipped against.
    it("would have caught the madrid Mercury line", () => {
      const madrid = computeNatalChart({
        ...resolveBirthUtc({ year: 1992, month: 4, day: 15, hour: 10, minute: 30 }, 40.4168, -3.7038),
        latitude: 40.4168, longitude: -3.7038,
      });
      const v = validateSection(
        body("el hecho de que Mercurio esté retrógrado lo matiza."), briefFor(3), madrid,
      );
      expect(v.fatal.join(" ")).toMatch(/Mercury/);
    });
  });
});

describe("copyProblems", () => {
  it("passes clean reader-facing copy", () => {
    expect(copyProblems("cómo hablas y te mueves")).toEqual([]);
  });

  it("flags jargon", () => {
    expect(copyProblems("tu regente en domicilio")).toEqual([
      'jerga prohibida: "regente"',
      'jerga prohibida: "domicilio"',
    ]);
  });

  it("flags a cliché", () => {
    expect(copyProblems("sois alma gemela")).toEqual([
      'cliché prohibido: "alma gemela"',
    ]);
  });

  it("flags a numbered house", () => {
    expect(copyProblems("tu casa 7")).toContain("jerga prohibida: casa numerada");
  });

  it("imposes no length rule and needs no chart", () => {
    expect(copyProblems("el dinero")).toEqual([]);
  });
});

describe("groundingProblems on plain-language relations", () => {
  // Fixture facts, verified against the computed chart rather than assumed:
  // Venus-Urano IS an opposition (orb 1.29); Sol-Saturno is no aspect at all;
  // Sol-Plutón IS a trine (orb 3.05), so it is the wrong-family case, not the
  // absent one. The plan's draft had Sol-Plutón as absent — it is not.
  it("accepts a plain phrase for a relation that exists", () => {
    const text = "Tu Venus y tu Urano tiran cada uno para un lado.";
    expect(groundingProblems(text, bilbao)).toEqual([]);
  });

  it("rejects a plain phrase for a relation that does not exist", () => {
    const text = "Tu Sol y tu Saturno tiran cada uno para un lado.";
    const problems = groundingProblems(text, bilbao);
    expect(problems.some((p) => /no presente/i.test(p))).toBe(true);
  });

  it("rejects the wrong FAMILY of relation between a real pair", () => {
    // Venus-Urano is an opposition, so "van de la mano" is a false claim
    // about a real pair — the subtle case a human reader would miss.
    const text = "Tu Venus y tu Urano van de la mano.";
    const problems = groundingProblems(text, bilbao);
    expect(problems.some((p) => /no presente/i.test(p))).toBe(true);
  });

  it("accepts the right family for a real soft aspect", () => {
    // Sol-Plutón is a trine, and "van de la mano" is the phrase for it.
    expect(groundingProblems("Tu Sol y tu Plutón van de la mano.", bilbao)).toEqual([]);
  });

  it("ignores a sentence that names only one planet", () => {
    expect(groundingProblems("Tu Venus va de la mano con lo que quieres.", bilbao)).toEqual([]);
  });

  it("still catches the technical vocabulary, for the teaser", () => {
    const text = "Tu Sol y tu Saturno forman una oposición.";
    expect(groundingProblems(text, bilbao).some((p) => /no presente/i.test(p))).toBe(true);
  });
});
