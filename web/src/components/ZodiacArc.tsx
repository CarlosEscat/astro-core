/**
 * The instrument. Real geometry, not decoration: ticks every 2° of
 * ecliptic longitude, heavier rules on the 30° sign boundaries, glyphs
 * centred in their own sign. The wheel the reading is actually read from.
 */
const R = 620;
const CX = 500;
const CY = 680;
const SPAN = 52; // degrees either side of vertical that fit the viewBox

// U+FE0E forces text presentation — without it these render as colour
// emoji on macOS/iOS and the instrument turns into a sticker sheet.
const GLYPHS = ["♌︎", "♍︎", "♎︎", "♏︎"];

function point(deg: number, radius: number) {
  const rad = (deg * Math.PI) / 180;
  return [CX + radius * Math.sin(rad), CY - radius * Math.cos(rad)] as const;
}

export function ZodiacArc() {
  const ticks = [];
  for (let d = -SPAN; d <= SPAN; d += 2) {
    const isSign = Math.abs(d % 30) === 0;
    const [x1, y1] = point(d, R);
    const [x2, y2] = point(d, R - (isSign ? 24 : 11));
    ticks.push(
      <line
        key={d}
        x1={x1} y1={y1} x2={x2} y2={y2}
        className={isSign ? "tick tick--sign" : "tick"}
      />,
    );
  }

  const glyphs = [-45, -15, 15, 45].map((d, i) => {
    const [x, y] = point(d, R - 52);
    return (
      <text key={d} x={x} y={y} className="glyph">
        {GLYPHS[i]}
      </text>
    );
  });

  return (
    <svg
      className="instrument"
      viewBox="0 0 1000 250"
      preserveAspectRatio="xMidYMin slice"
      role="presentation"
      aria-hidden="true"
    >
      <path
        d={`M ${point(-SPAN, R)[0]} ${point(-SPAN, R)[1]} A ${R} ${R} 0 0 1 ${point(SPAN, R)[0]} ${point(SPAN, R)[1]}`}
        fill="none"
        stroke="var(--pista)"
        strokeWidth="1"
      />
      {ticks}
      {glyphs}
    </svg>
  );
}
