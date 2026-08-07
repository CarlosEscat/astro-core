import { SIGN_ES, SIGN_GLYPH } from "@core/copy/signs.es";
import type { ChartResponse } from "./types";

export function Signature({ sig }: { sig: ChartResponse["signature"] }) {
  const row = [sig.sun, sig.moon, sig.ascendant]
    .map((s) => `${SIGN_GLYPH[s]} ${SIGN_ES[s]}`).join(" · ");
  return (
    <div className="card sig">
      <span className="sig__label">Tu combinación</span>
      <p className="sig__combo">{row}</p>
      <p className="sig__stat">1 de {sig.oneIn.toLocaleString("es-ES")} combinaciones posibles</p>
    </div>
  );
}
