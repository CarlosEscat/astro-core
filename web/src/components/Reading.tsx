"use client";

import { CharacterCardView } from "./CharacterCard";
import { CharacterCardShare } from "./CharacterCardShare";
import { Matches } from "./Matches";
import { LoveHook } from "./LoveHook";
import { ERRORES_ES } from "@core/copy/flow.es";
import type { ChartResponse, FreeReading } from "./types";

interface Props {
  profile: ChartResponse;
  free: FreeReading | null;
  /** True when /api/free failed. The card is unaffected — it is local math. */
  freeFailed: boolean;
  firstName?: string;
  onRetryReading: () => void;
}

/**
 * Everything below the card, lifted out of BirthForm unchanged.
 *
 * The one addition is the reading-only retry. A failed /api/free must never
 * send anyone back through four questions: the chart is already computed and
 * recomputing it is free. HANDOVER records the old behaviour — all four error
 * paths landing in the same place — as a defect; this is the fix.
 */
export function Reading({ profile, free, freeFailed, firstName, onRetryReading }: Props) {
  const prosa = (contenido: React.ReactNode) => {
    if (free) return contenido;
    if (freeFailed) {
      return (
        <div className="prose">
          <p>{ERRORES_ES.lectura}</p>
          <button type="button" className="escape" onClick={onRetryReading}>
            Reintentar la lectura
          </button>
        </div>
      );
    }
    return <p className="writing"><span>Leyendo tu carta</span></p>;
  };

  return (
    <section className="reading" aria-live="polite">
      <CharacterCardView card={profile.card} firstName={firstName} />

      {/* Love sits second: it is the shareable unit. */}
      <section className="module">
        <h2 className="module__title">En el amor</h2>
        {prosa(free ? <LoveHook hook={free.hook} prose={free.amor} /> : null)}
      </section>

      <section className="module">
        <h2 className="module__title">Con quién encajas</h2>
        <Matches matches={profile.matches} friction={profile.friction}
                 weakest={profile.elements.weakest} />
      </section>

      <section className="module">
        <h2 className="module__title">Lo que más pesa en tu carta</h2>
        {prosa(
          free ? (
            <div className="prose">
              {free.apertura.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
            </div>
          ) : null,
        )}
      </section>

      <CharacterCardShare card={profile.card} firstName={firstName} />

      {free && <div className="next-step">
        <h2>Esto es solo la superficie</h2>
        <p>
          El informe completo son ocho secciones y unas 2.000 palabras sobre
          tu identidad, tu mundo emocional, tus vínculos y tu vocación, con
          la misma regla: cada frase nombra la posición que la sustenta.{" "}
          <span className="price">9,90 €</span>, pago único.
        </p>
        <p className="soon">Disponible muy pronto</p>
      </div>}
    </section>
  );
}
