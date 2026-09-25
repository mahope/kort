import type { SearchResult } from "@/types/map";
import { utmToLatlng } from "@/lib/geo/utm";

// Address search: Klimadatastyrelsens Adressevælger (DAWA's replacement).
// DAWA (dawa.aws.dk / api.dataforsyningen.dk/adresser) is being decommissioned
// in 2026. Adressevælger is phonetic and returns only an id + betegnelse; the
// coordinates require a follow-up ID lookup and are delivered in EPSG:25832
// (ETRS89 / UTM zone 32N), which we convert to WGS84 for the map.
const ADRESSEVAELGER_BASE = "https://adressevaelger.dk";
// Shared public token — KDS has not enabled user management yet. Overridable.
const ADRESSEVAELGER_TOKEN =
  process.env.NEXT_PUBLIC_ADRESSEVAELGER_TOKEN || "adressevaelger123";

// Place-name search (lakes, hills, forests, ...) goes through our own
// /api/stednavne route, which searches a bundled Danske Stednavne snapshot
// and returns WGS84 SearchResults. DAWA's stednavne2 closes 1 Oct 2026.
const STEDNAVNE_ENDPOINT = "/api/stednavne";
const STEDNAVNE_MAX_QUERY = 60;

// EPSG:25832 covers all of Denmark (Bornholm included) in UTM zone 32.
const DK_UTM_ZONE = 32;
const REQUEST_TIMEOUT_MS = 5000;

/** fetch with an abort-based timeout so a hanging request can't spin forever. */
async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function searchAddresses(query: string): Promise<SearchResult[]> {
  if (query.trim().length < 2) return [];

  const [addressResults, placeResults] = await Promise.allSettled([
    fetchAdressevaelger(query),
    fetchPlaces(query),
  ]);

  const addresses =
    addressResults.status === "fulfilled" ? addressResults.value : [];
  const places =
    placeResults.status === "fulfilled" ? placeResults.value : [];

  return [...addresses, ...places].slice(0, 10);
}

interface AdressevaelgerHit {
  id: string;
  type: "husnummer" | "adresse" | "navngivenvej" | "navngivenvejpostnummer";
  titel: string;
  vejnavn?: string;
  postnr?: string;
  postdistrikt?: string;
}

async function fetchAdressevaelger(query: string): Promise<SearchResult[]> {
  const url = `${ADRESSEVAELGER_BASE}/husnumre/soeg?tekst=${encodeURIComponent(
    query
  )}&token=${ADRESSEVAELGER_TOKEN}&maksimum=6`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) return [];

  const data: { status: string; fund?: AdressevaelgerHit[] } = await res.json();
  if (data.status !== "ok" || !Array.isArray(data.fund)) return [];

  return data.fund.map((hit) => {
    // A concrete house number: resolve coordinates by ID lookup on select.
    if (hit.type === "husnummer" || hit.type === "adresse") {
      return {
        id: hit.id,
        text: hit.titel,
        description: "Adresse",
        coordinates: null,
        type: "address" as const,
        lookup: { kind: hit.type, id: hit.id },
      } satisfies SearchResult;
    }
    // A street aggregate (street × postal district): resolve by looking up a
    // representative house number on select.
    return {
      id: hit.id,
      text: hit.titel,
      description: "Vej",
      coordinates: null,
      type: "address" as const,
      lookup: { kind: "vej", vejnavn: hit.vejnavn ?? "", postnr: hit.postnr ?? "" },
    } satisfies SearchResult;
  });
}

export async function fetchPlaces(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2 || q.length > STEDNAVNE_MAX_QUERY) return [];
  const res = await fetchWithTimeout(
    `${STEDNAVNE_ENDPOINT}?q=${encodeURIComponent(q)}`
  );
  if (!res.ok) return [];

  const data: unknown = await res.json();
  if (!Array.isArray(data)) return [];
  return data.filter(
    (r): r is SearchResult =>
      typeof r?.id === "string" &&
      typeof r?.text === "string" &&
      Array.isArray(r?.coordinates) &&
      r.coordinates.length === 2
  );
}

/**
 * Resolve a search result to WGS84 [lng, lat]. Place names already carry
 * coordinates; Adressevælger results are resolved lazily (on select) so we
 * don't fire an ID lookup for every keystroke.
 */
export async function resolveCoordinates(
  result: SearchResult
): Promise<[number, number] | null> {
  if (result.coordinates) return result.coordinates;
  const lookup = result.lookup;
  if (!lookup) return null;

  if (lookup.kind === "husnummer" || lookup.kind === "adresse") {
    return lookupHusnummerCoordinates(lookup.kind, lookup.id);
  }
  // Street aggregate: fly to a representative house number on that street.
  return lookupStreetCoordinates(lookup.vejnavn, lookup.postnr);
}

interface OpslagPoint {
  adgangspunkt?: { koordinater?: { x: number; y: number } };
}

/** Read the EPSG:25832 access point from an opslag response and convert it. */
function pointToWgs84(husnummer?: OpslagPoint): [number, number] | null {
  const k = husnummer?.adgangspunkt?.koordinater;
  if (!k || typeof k.x !== "number" || typeof k.y !== "number") return null;
  const { lng, lat } = utmToLatlng(k.x, k.y, DK_UTM_ZONE);
  return [lng, lat];
}

async function lookupHusnummerCoordinates(
  kind: "husnummer" | "adresse",
  id: string
): Promise<[number, number] | null> {
  const endpoint = kind === "adresse" ? "adresser" : "husnumre";
  const url = `${ADRESSEVAELGER_BASE}/${endpoint}/${id}?token=${ADRESSEVAELGER_TOKEN}`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) return null;
  const data = await res.json();
  // husnumre/{id} → { husnummer: {...} }; adresser/{id} → { adresse: { husnummer } }
  const husnummer = data.husnummer ?? data.adresse?.husnummer;
  return pointToWgs84(husnummer);
}

async function lookupStreetCoordinates(
  vejnavn: string,
  postnr: string
): Promise<[number, number] | null> {
  if (!vejnavn) return null;
  // Phonetic search only returns concrete house numbers once a number is part
  // of the query, so probe low numbers and prefer the requested postal code.
  for (const probe of ["1", "2"]) {
    const url = `${ADRESSEVAELGER_BASE}/husnumre/soeg?tekst=${encodeURIComponent(
      `${vejnavn} ${probe}`
    )}&token=${ADRESSEVAELGER_TOKEN}&maksimum=15`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) continue;
    const data: { fund?: AdressevaelgerHit[] } = await res.json();
    const hits = (data.fund ?? []).filter((f) => f.type === "husnummer");
    if (hits.length === 0) continue;
    const match =
      hits.find((f) => postnr && f.titel.includes(postnr)) ?? hits[0];
    return lookupHusnummerCoordinates("husnummer", match.id);
  }
  return null;
}
