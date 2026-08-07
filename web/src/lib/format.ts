/** 10.1 → 10°06′ — the notation an astrologer actually writes. */
export function formatDegree(decimal: number): string {
  const d = Math.floor(decimal);
  const m = Math.round((decimal - d) * 60);
  return m === 60 ? `${d + 1}°00′` : `${d}°${String(m).padStart(2, "0")}′`;
}
