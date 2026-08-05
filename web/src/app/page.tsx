import { BirthForm } from "@/components/BirthForm";
import { ZodiacArc } from "@/components/ZodiacArc";

export default function Home() {
  return (
    <main>
      <ZodiacArc />
      <div className="shell">
        <p className="wordmark">Destiny Reports</p>

        <div className="hero">
          <h1>
            Tu carta natal, <em>leída de verdad</em>.
          </h1>
          <p>
            Calculamos tu carta con precisión astronómica y la leemos con una
            regla estricta: cada frase nombra la posición exacta que la
            sustenta. Nada que valga para cualquiera. Empieza por tu lectura
            gratuita.
          </p>
        </div>

        <BirthForm />

        <p className="foot">
          Tu fecha y tu lugar de nacimiento no salen de este servidor: la carta
          se calcula aquí y solo viajan las posiciones ya calculadas.
        </p>
      </div>
    </main>
  );
}
