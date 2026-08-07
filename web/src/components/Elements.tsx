import { ELEMENT } from "@core/rulers";
import { SIGN_ES } from "@core/copy/signs.es";
import type { Elements as E, Match } from "./types";

const ORDER = ["Fuego", "Tierra", "Aire", "Agua"] as const;

export function Elements({ elements, matches }: { elements: E; matches: Match[] }) {
  const max = Math.max(...ORDER.map((k) => elements.totals[k]));
  const echo = matches.filter((m) => ELEMENT[m.sign] === elements.weakest);
  const n = (x: number) => x.toLocaleString("es-ES", { maximumFractionDigits: 1 });

  return (
    <>
      <div className="bars">
        {ORDER.slice().sort((a, b) => elements.totals[b] - elements.totals[a]).map((k) => (
          <div className="bar" key={k}>
            <span className="bar__name">{k}</span>
            <span className="bar__track">
              <span
                className={`bar__fill${k === elements.weakest ? " low" : ""}`}
                style={{ width: `${(elements.totals[k] / max) * 100}%` }}
              />
            </span>
            <span className="bar__val">{n(elements.totals[k])}</span>
          </div>
        ))}
      </div>
      <p className="verdict">
        Tu mezcla se va casi toda a {elements.dominant.toLowerCase()}. De{" "}
        {elements.weakest.toLowerCase()} tienes {n(elements.totals[elements.weakest])} de{" "}
        {n(elements.total)}.
      </p>
      {echo.length >= 2 && (
        <p className="verdict punch">
          Y ahora fíjate: los signos con los que mejor encajas,{" "}
          <strong>{echo.map((m) => SIGN_ES[m.sign]).join(" y ")}</strong>, son justo de{" "}
          {elements.weakest.toLowerCase()}. Buscas fuera lo que no llevas dentro.
        </p>
      )}
    </>
  );
}
