import { computeNatalChart } from "./src/chart";

// Example: birth in Madrid, 1992-04-15 10:30 local (CEST, UTC+2) → 08:30 UTC
// NOTE: the caller resolves timezone→UTC; this layer is deliberately UTC-only.
const chart = computeNatalChart({
  utc: new Date("1992-04-15T08:30:00Z"),
  latitude: 40.4168,
  longitude: -3.7038,
});

console.log(`House system: ${chart.houseSystem}`);
console.log(`ASC ${chart.angles.ascendant.label}  |  MC ${chart.angles.midheaven.label}\n`);
for (const p of chart.planets) {
  const rx = p.retrograde ? " ℞" : "";
  console.log(`${p.body.padEnd(8)} ${p.label.padEnd(18)} house ${String(p.house).padStart(2)}${rx}`);
}
console.log(`\nTightest aspects:`);
for (const a of chart.aspects.slice(0, 5)) {
  console.log(`  ${a.a} ${a.type} ${a.b}  (orb ${a.orb}°, ${a.applying ? "applying" : "separating"})`);
}
console.log(`\nJSON size for LLM: ${JSON.stringify(chart).length} chars`);
