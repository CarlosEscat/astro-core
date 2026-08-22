"use client";

import { useState } from "react";
import { useBirthAnswers } from "@/hooks/useBirthAnswers";
import { horaReaccion } from "@core/copy/flow.es";

/**
 * Question 3. The reaction is qualitative on purpose: the place is not known
 * yet, so the Ascendant cannot be computed. These lines say the hour matters
 * without claiming to know where it lands.
 *
 * The escape link is spec decision 8 — an unknown hour is answerable, 12:00 is
 * assumed, and the CARD says so rather than printing a possibly-wrong
 * Ascendant as fact.
 */
export function Hora({ onNext }: { onNext: () => void }) {
  const { answers, set } = useBirthAnswers();
  const [typed, setTyped] = useState<string | null>(null);
  const [linea, setLinea] = useState<string | null>(null);

  // Derived, not synced. The assumed 12:00 is deliberately NOT shown back: it
  // was never their answer, and seeing it filled in would look like the flow
  // decided they were born at midday.
  const time = typed ?? (answers.hourKnown === false ? "" : answers.time ?? "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{2}:\d{2}$/.test(time)) return;
    set({ time, hourKnown: true });
    setLinea(horaReaccion(time));
  }

  function skip() {
    set({ time: "12:00", hourKnown: false });
    onNext();
  }

  return (
    <form className="pregunta" onSubmit={submit} noValidate>
      <div className="field">
        <label className="pregunta__q" htmlFor="hora">¿A qué hora naciste?</label>
        <input
          id="hora"
          type="time"
          value={time}
          onChange={(e) => { setTyped(e.target.value); setLinea(null); }}
        />
      </div>

      {linea && <p className="reaccion" aria-live="polite">{linea}</p>}

      {linea ? (
        <button type="button" className="submit" onClick={onNext}>Seguir</button>
      ) : (
        <button type="submit" className="submit">Siguiente</button>
      )}

      {!linea && (
        <button type="button" className="escape" onClick={skip}>
          No la sé exacta
        </button>
      )}
    </form>
  );
}
