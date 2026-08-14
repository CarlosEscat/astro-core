import type { Sign } from "../types";

/**
 * The sun sign as a character class. Every name is EPICENE — one form for any
 * reader — and the card renders them without an article, which is the only
 * part that would inflect. Do not "improve" one of these into a noun that
 * takes -o/-a: that ships a gendered reading, which the universal rules forbid
 * and no runtime gate protects, because this table is frozen.
 *
 * One register throughout: agent nouns, never impersonal metaphors. A set that
 * mixes ALQUIMISTA with HOGUERA reads as two products.
 */
export const CLASS_ES: Record<Sign, string> = {
  Aries: "COMBATIENTE",
  Taurus: "ORFEBRE",
  Gemini: "INTÉRPRETE",
  Cancer: "CONFIDENTE",
  Leo: "ARTISTA",
  Virgo: "ALQUIMISTA",
  Libra: "EQUILIBRISTA",
  Scorpio: "VIDENTE",
  Sagittarius: "NAVEGANTE",
  Capricorn: "ESTRATEGA",
  Aquarius: "DISIDENTE",
  Pisces: "ERRANTE",
};
