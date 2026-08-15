import type { Body, Sign } from "../types";

/** Planet names in Spanish. Both tiers may write these. */
export const PLANET_ES: Record<Body, string> = {
  Sun: "Sol", Moon: "Luna", Mercury: "Mercurio", Venus: "Venus", Mars: "Marte",
  Jupiter: "Júpiter", Saturn: "Saturno", Uranus: "Urano", Neptune: "Neptuno",
  Pluto: "Plutón",
};

export const SIGN_ES: Record<Sign, string> = {
  Aries: "Aries", Taurus: "Tauro", Gemini: "Géminis", Cancer: "Cáncer",
  Leo: "Leo", Virgo: "Virgo", Libra: "Libra", Scorpio: "Escorpio",
  Sagittarius: "Sagitario", Capricorn: "Capricornio", Aquarius: "Acuario",
  Pisces: "Piscis",
};

/** U+FE0E keeps these as engraved text rather than colour emoji on Apple platforms. */
export const SIGN_GLYPH: Record<Sign, string> = {
  Aries: "♈︎", Taurus: "♉︎", Gemini: "♊︎", Cancer: "♋︎",
  Leo: "♌︎", Virgo: "♍︎", Libra: "♎︎", Scorpio: "♏︎",
  Sagittarius: "♐︎", Capricorn: "♑︎", Aquarius: "♒︎", Pisces: "♓︎",
};

/** Reads after "Quién eres cuando estás a gusto: ". */
export const SUN_ES: Record<Sign, string> = {
  Aries: "vas de frente y sin rodeos; si algo te apetece, ya estás en marcha.",
  Taurus: "vas a tu ritmo y no te mueve nadie; disfrutas de lo que se toca.",
  Gemini: "te enciendes hablando; necesitas curiosear y luego contarlo.",
  Cancer: "cuidas de los tuyos, y ahí es donde te crece el ánimo.",
  Leo: "te gusta que se te note, y no tienes por qué disimularlo.",
  Virgo: "te crece el ánimo cuando algo queda bien hecho y en su sitio.",
  Libra: "estás a gusto cuando hay buen ambiente y las cosas están igualadas.",
  Scorpio: "vas a fondo o no vas; lo tibio te aburre enseguida.",
  Sagittarius: "necesitas horizonte: planes, viajes, cosas por aprender.",
  Capricorn: "te crece el ánimo cuando construyes algo que dura.",
  Aquarius: "estás a gusto cuando haces las cosas a tu manera, aunque chirríe.",
  Pisces: "te enciendes con lo que te emociona, no con lo que te conviene.",
};

/** Reads after "Lo que necesitas para estar en paz: ". */
export const MOON_ES: Record<Sign, string> = {
  Aries: "moverte y soltarlo pronto; guardártelo te pudre el día.",
  Taurus: "calma, rutina y que no te cambien los planes a última hora.",
  Gemini: "hablarlo con alguien; si no lo cuentas, no lo entiendes.",
  Cancer: "tu gente, tu hogar, tus cosas. Sin eso no funcionas.",
  Leo: "que te hagan caso de verdad, no de pasada.",
  Virgo: "tener las cosas resueltas; el desorden te pone de los nervios.",
  Libra: "que no haya tensión alrededor; la bronca te deja mal cuerpo días.",
  Scorpio: "confiar del todo o nada; los términos medios te inquietan.",
  Sagittarius: "aire y libertad; si te aprietan, te vas.",
  Capricorn: "sentir que hay un plan y que aguanta.",
  Aquarius: "tu espacio; que te dejen respirar sin dar explicaciones.",
  Pisces: "silencio y un rato a solas para que se te pase.",
};

/** Reads after "Cómo te ve quien acaba de conocerte: ". */
export const ASC_ES: Record<Sign, string> = {
  Aries: "vas de cara y con prisa; se nota cuando llegas.",
  Taurus: "das calma; transmites que no hay ninguna urgencia.",
  Gemini: "caes bien enseguida y hablas con cualquiera.",
  Cancer: "das cercanía, pero no te abres a la primera.",
  Leo: "entras y se nota; ocupas sitio sin tener que pedirlo.",
  Virgo: "das sensación de orden y de estar pendiente del detalle.",
  Libra: "gustas de entrada; suavizas el ambiente sin querer.",
  Scorpio: "impones un poco; parece que estás midiendo.",
  Sagittarius: "das buen rollo y ganas de plan.",
  Capricorn: "pareces mayor de lo que eres y das confianza.",
  Aquarius: "chocas un poco al principio, y justo eso engancha.",
  Pisces: "das dulzura y cuesta situarte del todo.",
};

/** The plain line shown above the receipt in the compatibility module. */
export const PARTNER_ES: Record<Sign, string> = {
  Aries: "Te tira la gente con arranque, que decide rápido y no le da mil vueltas.",
  Taurus: "Necesitas calma y cero drama. Que las cosas vayan despacio, pero que vayan.",
  Gemini: "Te engancha quien te hace reír hablando y no repite conversación.",
  Cancer: "Te tira quien cuida de verdad: que pregunte, que se acuerde, que esté.",
  Leo: "Te engancha quien tiene luz propia y no la esconde.",
  Virgo: "Te tira quien se ocupa de las cosas sin que haya que pedirlo.",
  Libra: "Te engancha quien pone paz y hace fácil el día a día.",
  Scorpio: "Te tira la gente intensa, que va a fondo o no va.",
  Sagittarius: "Te engancha quien te propone planes y tira de ti.",
  Capricorn: "Te enganchan las personas serias, con su vida montada. Alguien que dice que viene a las ocho y viene a las ocho.",
  Aquarius: "Te tira quien va por libre y no te pide explicaciones.",
  Pisces: "Te engancha quien te entiende sin que tengas que explicarte.",
};
