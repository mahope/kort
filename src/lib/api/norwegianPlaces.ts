import type { SearchResult } from "@/types/map";

// Norwegian place names: Kartverket's Sentralt stedsnavnregister (SSR) via its
// open API (CC BY 4.0, no key, CORS open). Coordinates come as EUREF89
// geographic (EPSG:4258), which is WGS84 for a map. Sweden has no free
// equivalent without an account, so it is not searched.
const STEDSNAVN_URL = "https://api.kartverket.no/stedsnavn/v1/navn";
const MAX_QUERY = 60;
const MAX_HITS = 4;
const REQUEST_TIMEOUT_MS = 5000;

interface StedsnavnHit {
  skrivemåte?: string;
  navneobjekttype?: string;
  stedsnummer?: number;
  kommuner?: { kommunenavn?: string }[];
  representasjonspunkt?: { nord?: number; øst?: number };
}

export function norwegianPlacesUrl(query: string): string {
  // Trailing * = prefix search, so "Galdhøp" finds Galdhøpiggen while typing.
  const params = new URLSearchParams({
    sok: `${query}*`,
    utkoordsys: "4258",
    treffPerSide: String(MAX_HITS),
    side: "1",
  });
  return `${STEDSNAVN_URL}?${params}`;
}

export async function fetchNorwegianPlaces(query: string): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 3 || q.length > MAX_QUERY) return [];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(norwegianPlacesUrl(q), { signal: controller.signal });
    if (!res.ok) return [];
    const data: { navn?: unknown } = await res.json();
    if (!Array.isArray(data?.navn)) return [];
    return (data.navn as StedsnavnHit[]).flatMap((hit) => {
      const lat = hit.representasjonspunkt?.nord;
      const lng = hit.representasjonspunkt?.øst;
      if (typeof hit.skrivemåte !== "string" || typeof lat !== "number" || typeof lng !== "number") return [];
      const kommune = hit.kommuner?.[0]?.kommunenavn;
      const kind = hit.navneobjekttype ?? "Sted";
      return [
        {
          id: `no-${hit.stedsnummer ?? `${lat},${lng}`}`,
          text: hit.skrivemåte,
          description: `${kind}${kommune ? `, ${kommune}` : ""}, Norge`,
          coordinates: [lng, lat] as [number, number],
          type: "place" as const,
        } satisfies SearchResult,
      ];
    });
  } finally {
    clearTimeout(timer);
  }
}
