import type { AspectType } from "../types";

/**
 * How two planets get along, in words the reader already owns. This is the
 * ONLY form in which a relation may reach a prompt — the model never sees
 * "oposición" or an orb, which is why it cannot write either.
 *
 * The set is CLOSED on purpose. Because we author these phrases,
 * groundingProblems() can verify a plain-language relation claim exactly the
 * way it verifies "conjunción" today. Prose describing a relation in any other
 * words would be unverifiable, so nothing else may be used.
 *
 * Five aspect types collapse onto three phrases: the reader does not need the
 * distinction between a trine and a sextile, only between "these help each
 * other" and "these fight".
 */
export const RELATION_ES: Record<AspectType, string> = {
  conjunction: "van pegados",
  opposition: "tiran cada uno para un lado",
  square: "tiran cada uno para un lado",
  trine: "van de la mano",
  sextile: "van de la mano",
};

export interface Relation {
  /** The canonical phrase, as handed to the model. */
  phrase: string;
  /** Detector. Loose enough to survive the model conjugating around it. */
  match: RegExp;
  types: AspectType[];
}

/**
 * Detection is deliberately looser than the canonical phrase: the model is
 * given the phrase but writes its own sentence, so "tira cada uno para su
 * lado" has to count. Erring toward matching is the safe direction — a false
 * positive costs a flagged section a human then reads, a false negative ships
 * an invented relation (Addendum 9's rule, applied to a new vocabulary).
 *
 * None of the three anchors on the verb. Anchoring on "va/van" would miss
 * "parecen IR de la mano" and "acaban IR pegados" — the model is writing its
 * own sentence, and an invented relation that escapes the check is exactly the
 * defect class that shipped in Addendum 12. Each pattern instead keys on the
 * part of the idiom that carries the meaning and appears nowhere else in
 * ordinary prose about a chart.
 *
 * The residual false positives ("te gusta ir de la mano por la calle") are
 * harmless because groundingProblems only consults these once a sentence names
 * exactly two planets.
 */
export const RELATIONS: Relation[] = [
  {
    phrase: RELATION_ES.conjunction,
    match: /pegad[oa]s?/iu,
    types: ["conjunction"],
  },
  {
    // Not /cada\s+uno/ alone: "cada uno de tus planetas" is ordinary prose.
    phrase: RELATION_ES.opposition,
    match: /cada\s+uno\s+para/iu,
    types: ["opposition", "square"],
  },
  {
    phrase: RELATION_ES.trine,
    match: /de\s+la\s+mano/iu,
    types: ["trine", "sextile"],
  },
];
