import { SIGN_ES, SIGN_GLYPH } from "@core/copy/signs.es";
import type { BigThree } from "./types";
import { formatDegree } from "@/lib/format";

const ROLES = [
  ["Sol", "sun"], ["Luna", "moon"], ["Ascendente", "ascendant"],
] as const;

export function Readout({ big }: { big: BigThree }) {
  return (
    <div className="readout">
      {ROLES.map(([label, key]) => {
        const p = big[key];
        return (
          <div key={key}>
            <div className="rt">
              <span className="role">{label}</span>
              <span className="sym">{SIGN_GLYPH[p.sign]}</span>
              <span className="sign">{SIGN_ES[p.sign]}</span>
              <span className="deg">{formatDegree(p.degree)}</span>
            </div>
            <p className="gloss">{p.gloss}</p>
          </div>
        );
      })}
    </div>
  );
}
