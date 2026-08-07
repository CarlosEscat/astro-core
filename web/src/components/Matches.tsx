import { SIGN_ES, SIGN_GLYPH } from "@core/copy/signs.es";
import type { Match } from "./types";

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

export function Matches({ matches, friction }: { matches: Match[]; friction: Match }) {
  return (
    <>
      {matches.map((m, i) => (
        <Fit key={m.sign} rank={String(i + 1).padStart(2, "0")} m={m} />
      ))}
      <div className="friction">
        <span className="label">El que te desordena</span>
        <Fit rank="—" m={friction} />
      </div>
    </>
  );
}
