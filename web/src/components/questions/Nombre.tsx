"use client";

import { useState } from "react";
import { useBirthAnswers } from "@/hooks/useBirthAnswers";

/**
 * Question 1. No reaction (spec decision 3 of the reskin): the name is stored
 * and pays off later, on the card and in the reveal, where it means more.
 *
 * Asked plainly, with no "opcional" label — a character has a name — but the
 * escape link means nobody is walled out at step one. The CTA is inert until
 * the box has a name in it.
 */
export function Nombre({ onNext }: { onNext: () => void }) {
  const { answers, set } = useBirthAnswers();
  const [typed, setTyped] = useState<string | null>(null);

  // Derived, not synced: `typed` is null until the box is touched, so a name
  // answered earlier shows through once storage has been read.
  const firstName = typed ?? answers.firstName ?? "";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const name = firstName.trim();
    if (!name) return;
    set({ firstName: name });
    onNext();
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

      <button type="submit" className="submit" disabled={!firstName.trim()}>
        Siguiente
      </button>

      <button type="button" className="escape" onClick={skip}>
        Prefiero no decirlo
      </button>
    </form>
  );
}
