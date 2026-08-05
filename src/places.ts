import { existsSync, readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Birth-place autocomplete over a bundled GeoNames cities500 index
 * (data/cities.json.gz, built by scripts/build-cities.ts). Entirely
 * local: no third-party API sees what the user types.
 *
 * Ranking: Spain first, then Spanish-speaking countries, then the rest;
 * by population within each tier. The rows are pre-sorted by population
 * at build time.
 */
export interface Place {
  name: string;
  region: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  population: number;
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Spanish-speaking markets after Spain itself.
const HISPANIC = new Set([
  "AR", "BO", "CL", "CO", "CR", "CU", "DO", "EC", "GT", "HN", "MX",
  "NI", "PA", "PE", "PR", "PY", "SV", "UY", "VE", "GQ",
]);

function tier(countryCode: string): number {
  if (countryCode === "ES") return 2;
  return HISPANIC.has(countryCode) ? 1 : 0;
}

function normalize(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

type Row = [string, number, number, string, string, number];

let index: Array<{ norm: string; row: Row }> | null = null;

/**
 * The data file lives at <repo>/data/cities.json.gz. When this module is
 * bundled (Next.js), import.meta.url points into the build output, so fall
 * back to cwd-relative candidates (web/ runs with cwd=web).
 */
function dataPath(): string {
  const candidates = [
    join(ROOT, "data", "cities.json.gz"),
    join(process.cwd(), "data", "cities.json.gz"),
    join(process.cwd(), "..", "data", "cities.json.gz"),
  ];
  const found = candidates.find(existsSync);
  if (!found) throw new Error(`cities.json.gz not found; tried:\n${candidates.join("\n")}`);
  return found;
}

function load(): Array<{ norm: string; row: Row }> {
  if (!index) {
    const rows: Row[] = JSON.parse(gunzipSync(readFileSync(dataPath())).toString("utf8"));
    index = rows.map((row) => ({ norm: normalize(row[0]), row }));
  }
  return index;
}

export function searchPlaces(query: string, limit = 8): Place[] {
  const q = normalize(query.trim());
  if (q.length < 2) return [];

  // Match at the start of the name or of any later word in it.
  const matches: Array<{ t: number; row: Row }> = [];
  for (const { norm, row } of load()) {
    if (norm.startsWith(q) || norm.includes(" " + q)) {
      matches.push({ t: tier(row[3]), row });
    }
  }
  // Stable sort by tier only: build order is already population-desc.
  matches.sort((a, b) => b.t - a.t);

  // Spain leads, but must not monopolize the list: tiny ES villages
  // shouldn't push Santiago de Chile off a "santiago" search. Cap each
  // tier's slots, then refill remaining space in tier order.
  const cap = Math.max(1, Math.ceil(limit * 0.6));
  const perTier = new Map<number, number>();
  const chosen: typeof matches = [];
  const overflow: typeof matches = [];
  for (const m of matches) {
    const used = perTier.get(m.t) ?? 0;
    if (chosen.length < limit && used < cap) {
      chosen.push(m);
      perTier.set(m.t, used + 1);
    } else {
      overflow.push(m);
    }
  }
  chosen.push(...overflow.slice(0, limit - chosen.length));

  return chosen.map(({ row }) => ({
    name: row[0],
    latitude: row[1],
    longitude: row[2],
    countryCode: row[3],
    region: row[4],
    population: row[5],
  }));
}
