import Link from "next/link";
import { ZodiacArc } from "@/components/ZodiacArc";

/**
 * Four elements: wordmark, headline, subhead, button.
 *
 * The subhead says the BENEFIT, never the method (spec decision 10). The old
 * "cada frase nombra la posición exacta que la sustenta" is gone — it is too
 * technical to earn its place at the moment someone decides whether to bother.
 * The engineering rule it described is untouched: validateTeaser() and
 * groundingProblems() still gate output.
 *
 * No step count and no time estimate either (spec decision 11). Do not add a
 * reassurance line back without a measured drop-off between / and
 * /crear/nombre.
 */
export default function Home() {
  return (
    <main className="landing">
      <ZodiacArc />
      <div className="shell">
        <p className="wordmark">Destiny Reports</p>

        <div className="hero">
          <h1>
            Crea tu carta.<br />
            <em>Descubre tu personaje.</em>
          </h1>
          <p>No es un horóscopo. Es tu carta, y no se parece a la de nadie.</p>
        </div>

        <Link className="cta" href="/crear/nombre">
          Empezar
        </Link>

        <p className="foot">
          Tu fecha y tu lugar de nacimiento no salen de este servidor: la carta
          se calcula aquí y solo viajan las posiciones ya calculadas.
        </p>
      </div>
    </main>
  );
}
