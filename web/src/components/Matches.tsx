import { ELEMENT } from "@core/rulers";
import { SIGN_ES, SIGN_GLYPH } from "@core/copy/signs.es";
import type { ElementName, Match } from "./types";

function Fit({ rank, m }: { rank: string; m: Match }) {
  return (
    <div className="fit">
      <div className="fit__head">
        <span className="fit__rank">{rank}</span>
        <span className="fit__sym">{SIGN_GLYPH[m.sign]}</span>
        <span className="fit__name">{SIGN_ES[m.sign]}</span>
      </div>
      <p className="fit__say">{m.say}</p>
      <p className="fit__why">{m.why}</p>
    </div>
  );
}

export function Matches({
  matches, friction, weakest,
}: { matches: Match[]; friction: Match; weakest: ElementName }) {
  return (
    <>
      {matches.map((m, i) => (
        <Fit key={m.sign} rank={String(i + 1).padStart(2, "0")} m={m} />
      ))}
      <div className="friction">
        <span className="label">El que te desordena</span>
        <Fit rank="—" m={friction} />
      </div>
      {matches.filter((m) => ELEMENT[m.sign] === weakest).length >= 2 && (
        <p className="verdict punch">
          Y ahora fíjate: los signos con los que mejor encajas,{" "}
          <strong>
            {matches.filter((m) => ELEMENT[m.sign] === weakest)
              .map((m) => SIGN_ES[m.sign]).join(" y ")}
          </strong>
          , son justo de {weakest.toLowerCase()}. Buscas fuera lo que no llevas
          dentro.
        </p>
      )}
    </>
  );
}
