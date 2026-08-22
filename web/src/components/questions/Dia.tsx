"use client";

import { useState } from "react";
import { useBirthAnswers } from "@/hooks/useBirthAnswers";
import { sunSignForDate } from "@core/sunsign";
import { CLASS_ES } from "@core/copy/classes.es";
import { CLASE_REACCION_ES, CUSPIDE_ES } from "@core/copy/flow.es";

/**
 * Question 2, and the first real payoff. The reward is the CLASS, not the sign
 * (spec decision 3): CLASS_ES already ships, so Leo arrives as ARTISTA.
 *
 * On one of the 45 guarded days sunSignForDate returns certain:false and this
 * MUST NOT name a class — the reveal would otherwise contradict the card
 * twenty seconds later. The cusp line is the honest alternative, and it reads
 * as suspense rather than as a failure.
 */
export function Dia({ onNext }: { onNext: () => void }) {
  const { answers, set } = useBirthAnswers();
  const [typed, setTyped] = useState<string | null>(null);
  const [shown, setShown] = useState(false);

  // Derived, not synced: `typed` is null until the box is touched, so a date
  // answered earlier shows through on its own once storage has been read.
  // Copying it into state in an effect would be the same value in two places.
  const date = typed ?? answers.date ?? "";

  const guess = shown ? sunSignForDate(date) : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    set({ date });
    setShown(true);
  }

  return (
    <form className="pregunta" onSubmit={submit} noValidate>
      <div className="field">
        <label className="pregunta__q" htmlFor="dia">¿Qué día naciste?</label>
        <input
          id="dia"
          type="date"
          min="1900-01-01"
          max="2030-12-31"
          value={date}
          onChange={(e) => { setTyped(e.target.value); setShown(false); }}
        />
      </div>

      {guess && (
        <div className="reaccion" aria-live="polite">
          {guess.certain && guess.sign ? (
            <>
              <p className="reaccion__clase">{CLASS_ES[guess.sign]}</p>
              <p>{CLASE_REACCION_ES[guess.sign]}</p>
            </>
          ) : (
            <p>{CUSPIDE_ES}</p>
          )}
        </div>
      )}

      {shown ? (
        <button type="button" className="submit" onClick={onNext}>Seguir</button>
      ) : (
        <button type="submit" className="submit">Siguiente</button>
      )}
    </form>
  );
}
