/**
 * The twelve houses in words a reader already owns. This is the ONLY form in
 * which house information is allowed to reach a prompt — the model never sees
 * a house number, which is why it cannot write one.
 */
export const AREA_ES: Record<number, string> = {
  1: "cómo te presentas y el cuerpo con el que vas por el mundo",
  2: "el dinero, tus cosas y lo que consideras tuyo",
  3: "cómo hablas, escribes y te mueves por tu barrio",
  4: "tu hogar, tu familia y de dónde vienes",
  5: "lo que haces por gusto: crear, ligar, jugar",
  6: "tu día a día, el trabajo cotidiano y tus rutinas",
  7: "tus relaciones de tú a tú y con quién te emparejas",
  8: "lo que compartes a fondo con otra persona y lo que te transforma",
  9: "lo que crees, lo que estudias y lo lejos que viajas",
  10: "tu cara pública y a qué te dedicas delante de la gente",
  11: "tus amistades, tus grupos y lo que quieres para el futuro",
  12: "lo que pasa a puerta cerrada, contigo a solas",
};

/**
 * The same twelve areas, short enough to sit in a card row. DISPLAY ONLY —
 * never hand this to a model. A model given the terse phrasing writes terse,
 * and AREA_ES's length is what makes the prose readable. The no-house-number
 * rule is identical: this table exists so the card never has to print "casa 3".
 */
export const AREA_CORTA_ES: Record<number, string> = {
  1: "cómo te presentas",
  2: "el dinero y lo tuyo",
  3: "cómo hablas y te mueves",
  4: "tu hogar y tu familia",
  5: "lo que haces por gusto",
  6: "tu día a día",
  7: "con quién te emparejas",
  8: "lo que compartes a fondo",
  9: "lo que crees y estudias",
  10: "tu cara pública",
  11: "tus amistades y tus grupos",
  12: "lo que llevas a solas",
};
