/**
 * Build data/cities.json.gz from the GeoNames cities500 dump.
 *
 * Inputs (download fresh, they are not committed):
 *   https://download.geonames.org/export/dump/cities500.zip  → cities500.txt
 *   https://download.geonames.org/export/dump/admin1CodesASCII.txt
 *
 * Usage: npx tsx scripts/build-cities.ts <cities500.txt> <admin1.txt>
 *
 * Output row: [name, latitude, longitude, countryCode, admin1Name, population]
 * Names are stored as-is (local names); the search module normalizes accents
 * at load time. Refresh roughly yearly.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { gzipSync } from "node:zlib";

const [citiesPath, admin1Path] = process.argv.slice(2);
if (!citiesPath || !admin1Path) {
  console.error("Usage: npx tsx scripts/build-cities.ts <cities500.txt> <admin1CodesASCII.txt>");
  process.exit(1);
}

// admin1CodesASCII names are English; the UI is es-ES. Translate the
// Spanish regions (the only ones customers will read constantly).
const ES_REGIONS: Record<string, string> = {
  "ES.07": "Islas Baleares",
  "ES.32": "Navarra",
  "ES.51": "Andalucía",
  "ES.52": "Aragón",
  "ES.53": "Islas Canarias",
  "ES.54": "Castilla-La Mancha",
  "ES.55": "Castilla y León",
  "ES.56": "Cataluña",
  "ES.59": "País Vasco",
  "ES.60": "Comunidad Valenciana",
};

const admin1: Record<string, string> = {};
for (const line of readFileSync(admin1Path, "utf8").split("\n")) {
  const [code, name] = line.split("\t");
  if (code && name) admin1[code] = ES_REGIONS[code] ?? name;
}

type Row = [string, number, number, string, string, number];
const rows: Row[] = [];
for (const line of readFileSync(citiesPath, "utf8").split("\n")) {
  const f = line.split("\t");
  if (f.length < 15) continue;
  const name = f[1];
  const lat = Number(f[4]);
  const lon = Number(f[5]);
  const country = f[8];
  const region = admin1[`${country}.${f[10]}`] ?? "";
  const population = Number(f[14]) || 0;
  if (!name || Number.isNaN(lat) || Number.isNaN(lon) || !country) continue;
  rows.push([name, lat, lon, country, region, population]);
}

// Largest first so the search can early-rank without a full sort.
rows.sort((a, b) => b[5] - a[5]);

mkdirSync("data", { recursive: true });
writeFileSync("data/cities.json.gz", gzipSync(JSON.stringify(rows), { level: 9 }));
console.log(`${rows.length} cities → data/cities.json.gz`);
