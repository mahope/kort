import type { SearchResult } from "@/types/map";

// In-memory search over a snapshot of Danske Stednavne (see
// scripts/build-stednavne-index.mjs for why this is a snapshot and not a live
// service). Pure functions only — loading the file lives in ./loadIndex.ts so
// this module can be tested with small fixtures.

export const QUERY_MIN_LENGTH = 2;
export const QUERY_MAX_LENGTH = 60;

export interface StednavnEntry {
  /** Row number in the index; stable within one index build. */
  row: number;
  name: string;
  norm: string;
  /** norm without spaces, so "lille bælt" also finds "Lillebælt". */
  compact: string;
  tokens: string[];
  hovedtype: string;
  undertype: string;
  kommune: string;
  lng: number;
  lat: number;
  /** log2 of the bbox diagonal in metres — a notability proxy. */
  size: number;
  primary: boolean;
}

export interface StednavnIndex {
  entries: StednavnEntry[];
  /** normalised kommune name → original spelling */
  kommuner: Map<string, string>;
}

/**
 * Normalise for matching: case-insensitive, "aa" ≡ "å" (Aabenraa/Åbenrå),
 * foreign accents folded, punctuation treated as word breaks.
 */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFC")
    .replace(/aa/g, "å")
    .replace(/[éèêë]/g, "e")
    .replace(/[áàâä]/g, "a")
    .replace(/ö/g, "ø")
    .replace(/[üú]/g, "u")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function parseIndex(tsv: string): StednavnIndex {
  const lines = tsv.split(/\r?\n/);
  const table = (prefix: string): string[] => {
    const line = lines.find((l) => l.startsWith(prefix + "\t"));
    if (!line) throw new Error(`stednavne index: missing ${prefix} header`);
    return line.split("\t").slice(1);
  };
  const hovedtyper = table("#hovedtyper");
  const undertyper = table("#undertyper");
  const kommuneNames = table("#kommuner");

  const entries: StednavnEntry[] = [];
  for (const line of lines) {
    if (!line || line.startsWith("#")) continue;
    const [name, h, u, k, lng, lat, size, primary] = line.split("\t");
    const norm = normalize(name);
    if (!norm) continue;
    entries.push({
      row: entries.length,
      name,
      norm,
      compact: norm.replace(/ /g, ""),
      tokens: norm.split(" "),
      hovedtype: hovedtyper[Number(h)] ?? "",
      undertype: undertyper[Number(u)] ?? "",
      kommune: k === "" ? "" : kommuneNames[Number(k)] ?? "",
      lng: Number(lng),
      lat: Number(lat),
      size: Number(size) || 0,
      primary: primary === "1",
    });
  }
  const kommuner = new Map(kommuneNames.map((n) => [normalize(n), n]));
  return { entries, kommuner };
}

// Nudge the ranking toward what people search for on a topographic map;
// buildings (80k of the 145k names) otherwise crowd out landscape features.
const TYPE_BONUS: Record<string, number> = {
  Bebyggelse: 8,
  Landskabsform: 4,
  Naturareal: 4,
  Sø: 4,
  Farvand: 3,
  Seværdighed: 3,
  Vandløb: 2,
  "Andentopografi punkt": -2,
  Fortidsminde: -4,
  Bygning: -6,
};

function baseScore(e: StednavnEntry): number {
  return (
    e.size * 3 +
    (TYPE_BONUS[e.hovedtype] ?? 0) +
    (e.primary ? 4 : 0) -
    e.name.length * 0.1
  );
}

/** Every query token must be a prefix of some token in the name. */
function tokensMatch(entryTokens: string[], queryTokens: string[]): boolean {
  return queryTokens.every((q) => entryTokens.some((t) => t.startsWith(q)));
}

function matchTier(
  e: StednavnEntry,
  qNorm: string,
  qCompact: string,
  qTokens: string[]
): number {
  if (e.norm === qNorm) return 3;
  if (e.norm.startsWith(qNorm)) return 2;
  if (tokensMatch(e.tokens, qTokens) || e.compact.startsWith(qCompact)) return 1;
  return 0;
}

function distanceKm(aLng: number, aLat: number, bLng: number, bLat: number) {
  const dx = (aLng - bLng) * 111.32 * Math.cos(((aLat + bLat) / 2) * (Math.PI / 180));
  const dy = (aLat - bLat) * 110.54;
  return Math.hypot(dx, dy);
}

const CONTEXT_RADIUS_KM = 20;

interface Locality {
  lng?: number;
  lat?: number;
  kommune?: string;
}

/**
 * Resolve a phrase such as "skagen" to a locality: a town/district with that
 * exact name (largest first) or a kommune. `allowPrefix` is set when the
 * phrase ends with the token still being typed.
 */
function findLocalities(
  index: StednavnIndex,
  phrase: string,
  allowPrefix: boolean
): Locality[] {
  const found: Locality[] = [];
  const kommune = index.kommuner.get(phrase);
  if (kommune) found.push({ kommune });
  const towns = index.entries
    .filter(
      (e) =>
        e.hovedtype === "Bebyggelse" &&
        (e.undertype === "by" || e.undertype === "bydel") &&
        (e.norm === phrase || (allowPrefix && e.norm.startsWith(phrase)))
    )
    .sort((a, b) => b.size - a.size)
    .slice(0, 3);
  for (const t of towns) found.push({ lng: t.lng, lat: t.lat });
  return found;
}

/**
 * "Skagen Gren" → Grenen near Skagen. Split the query into a locality part
 * (leading or trailing words) and a name part, and return names matching the
 * name part inside that locality, nearest first.
 */
function contextMatches(
  index: StednavnIndex,
  qTokens: string[]
): { entry: StednavnEntry; distance: number }[] {
  const hits = new Map<StednavnEntry, number>();
  for (let k = 1; k < qTokens.length; k++) {
    const splits: [string[], string[], boolean][] = [
      // [locality, name, locality contains the token being typed]
      [qTokens.slice(0, k), qTokens.slice(k), false],
      [qTokens.slice(qTokens.length - k), qTokens.slice(0, qTokens.length - k), true],
    ];
    for (const [localityTokens, nameTokens, allowPrefix] of splits) {
      const localities = findLocalities(index, localityTokens.join(" "), allowPrefix);
      if (localities.length === 0) continue;
      for (const e of index.entries) {
        if (!tokensMatch(e.tokens, nameTokens)) continue;
        for (const loc of localities) {
          let d: number | null = null;
          if (loc.kommune !== undefined) {
            if (e.kommune === loc.kommune) d = CONTEXT_RADIUS_KM;
          } else if (loc.lng !== undefined && loc.lat !== undefined) {
            const km = distanceKm(e.lng, e.lat, loc.lng, loc.lat);
            if (km <= CONTEXT_RADIUS_KM) d = km;
          }
          if (d !== null && d < (hits.get(e) ?? Infinity)) hits.set(e, d);
        }
      }
    }
  }
  return [...hits].map(([entry, distance]) => ({ entry, distance }));
}

export function toSearchResult(e: StednavnEntry): SearchResult {
  return {
    id: `stednavn-${e.row}`,
    text: e.name,
    description: [e.undertype, e.kommune].filter(Boolean).join(", "),
    coordinates: [e.lng, e.lat],
    type: "place",
  };
}

export function searchStednavne(
  index: StednavnIndex,
  query: string,
  limit = 5
): SearchResult[] {
  const qNorm = normalize(query.slice(0, QUERY_MAX_LENGTH));
  if (qNorm.length < QUERY_MIN_LENGTH) return [];
  const qTokens = qNorm.split(" ");
  const qCompact = qNorm.replace(/ /g, "");

  const scored: { e: StednavnEntry; tier: number; score: number }[] = [];
  for (const e of index.entries) {
    const tier = matchTier(e, qNorm, qCompact, qTokens);
    if (tier > 0) scored.push({ e, tier, score: baseScore(e) });
  }

  if (scored.length < limit && qTokens.length > 1) {
    const seen = new Set(scored.map((s) => s.e));
    for (const { entry, distance } of contextMatches(index, qTokens)) {
      if (seen.has(entry)) continue;
      // Below all direct hits; nearer and more notable first.
      scored.push({ e: entry, tier: 0, score: baseScore(entry) - distance * 2 });
    }
  }

  scored.sort((a, b) => b.tier - a.tier || b.score - a.score);
  return scored.slice(0, limit).map(({ e }) => toSearchResult(e));
}
