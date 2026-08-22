"use client";

import { useState } from "react";
import { useBirthAnswers } from "@/hooks/useBirthAnswers";
import { NOMBRE_ES } from "@core/copy/flow.es";

/**
 * Question 1. No astrology is available yet, so the reaction is framing only.
 *
 * Asked plainly, with no "opcional" label — a character has a name (spec
 * decision 4) — but the escape link means nobody is walled out at step one,
 * before any value has been delivered.
 */
export function Nombre({ onNext }: { onNext: () => void }) {
  const { answers, set } = useBirthAnswers();
  const [typed, setTyped] = useState<string | null>(null);
  const [reaccion, setReaccion] = useState<string | null>(null);

  // Derived, not synced: `typed` is null until the box is touched, so a name
  // answered earlier shows through once storage has been read.
  const firstName = typed ?? answers.firstName ?? "";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const name = firstName.trim();
    if (!name) return;
    set({ firstName: name });
    setReaccion(NOMBRE_ES.conNombre.replace("{nombre}", name));
  }

  function skip() {
    set({ firstName: undefined });
    onNext();
  }

  return (
    <form className="pregunta" onSubmit={submit} noValidate>
      <div className="field">
        <label className="pregunta__q" htmlFor="nombre">¿Cómo te llamas?</label>
        <input
          id="nombre"
          type="text"
          autoComplete="given-name"
          value={firstName}
          onChange={(e) => setTyped(e.target.value)}
        />
      </div>

      {reaccion && <p className="reaccion" aria-live="polite">{reaccion}</p>}

      {reaccion ? (
        <button type="button" className="submit" onClick={onNext}>Seguir</button>
      ) : (
        <button type="submit" className="submit">Siguiente</button>
      )}

      {!reaccion && (
        <button type="button" className="escape" onClick={skip}>
          Prefiero no decirlo
        </button>
      )}
    </form>
  );
}
