"use client";

import { useState } from "react";
import { useBirthAnswers } from "@/hooks/useBirthAnswers";
import { sunSignForDate } from "@core/sunsign";
import { CLASS_ES } from "@core/copy/classes.es";
import { CLASE_REACCION_ES, CUSPIDE_ES } from "@core/copy/flow.es";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

/**
 * Question 2, and the first real payoff. Date and hour share one card because
 * they ask about the same event; the reward is the CLASS, not the sign —
 * CLASS_ES already ships, so Leo arrives as ARTISTA.
 *
 * The class appears the moment the date validates, with no press:
 * sunSignForDate is synchronous and the date input completes on its own.
 * On one of the 45 guarded days it returns certain:false and this MUST NOT
 * name a class — the reveal would otherwise contradict the card twenty
 * seconds later.
 *
 * The hour's escape link is spec decision 8: an unknown hour is answerable,
 * 12:00 is assumed, and the CARD says so rather than printing a possibly-wrong
 * Ascendant. Skipping marks the hour answered but does NOT advance — the date
 * may still be empty. The assumed 12:00 is never shown back in the box.
 */
export function Cuando({ onNext }: { onNext: () => void }) {
  const { answers, set } = useBirthAnswers();
  const [typedDate, setTypedDate] = useState<string | null>(null);
  const [typedTime, setTypedTime] = useState<string | null>(null);

  // Derived, not synced: `typed` is null until the box is touched, so answers
  // written earlier show through once storage has been read. Copying them into
  // state in an effect would be the same value in two places.
  const date = typedDate ?? answers.date ?? "";
  const time = typedTime ?? (answers.hourKnown === false ? "" : answers.time ?? "");

  // Skipped is fully derived: the pill writes hourKnown:false to storage, and
  // typing a real hour clears it because `typedTime` takes precedence.
  const hourSkipped = typedTime === null && answers.hourKnown === false;

  const validDate = DATE_RE.test(date);
  const validTime = TIME_RE.test(time);
  const guess = validDate ? sunSignForDate(date) : null;
  const canAdvance = validDate && (validTime || hourSkipped);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canAdvance) return;
    if (hourSkipped) {
      // The skip pill already wrote time + hourKnown; only the date is new.
      set({ date });
    } else {
      set({ date, time, hourKnown: true });
    }
    onNext();
  }

  function skip() {
    set({ time: "12:00", hourKnown: false });
  }

  return (
    <form className="pregunta" onSubmit={submit} noValidate>
      <div className="row">
        <div className="field">
          <label className="pregunta__q" htmlFor="dia">¿Qué día naciste?</label>
          <input
            id="dia"
            type="date"
            min="1900-01-01"
            max="2030-12-31"
            value={date}
            onChange={(e) => setTypedDate(e.target.value)}
          />
        </div>

        <div className="field">
          <label className="pregunta__q" htmlFor="hora">¿A qué hora naciste?</label>
          <input
            id="hora"
            type="time"
            value={time}
            onChange={(e) => setTypedTime(e.target.value)}
          />
          {hourSkipped && <span className="hint">Sin hora exacta</span>}
        </div>
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

      <button type="submit" className="submit" disabled={!canAdvance}>
        Siguiente
      </button>

      {!hourSkipped && (
        <button type="button" className="escape" onClick={skip}>
          No la sé exacta
        </button>
      )}
    </form>
  );
}
