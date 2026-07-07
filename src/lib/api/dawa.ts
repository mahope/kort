import type { SearchResult } from "@/types/map";

const DAWA_BASE = "https://api.dataforsyningen.dk";
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
  if (query.length < 2) return [];

  const [addressResults, placeResults] = await Promise.allSettled([
    fetchAddresses(query),
    fetchPlaces(query),
  ]);

  const addresses =
    addressResults.status === "fulfilled" ? addressResults.value : [];
  const places =
    placeResults.status === "fulfilled" ? placeResults.value : [];

  return [...addresses, ...places].slice(0, 10);
}

interface DawaAddress {
  tekst: string;
  adresse: {
    id: string;
    postnr: string;
    postnrnavn: string;
    x: number;
    y: number;
  };
}

async function fetchAddresses(query: string): Promise<SearchResult[]> {
  const url = `${DAWA_BASE}/adresser/autocomplete?q=${encodeURIComponent(query)}&per_side=5`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) return [];

  const data: DawaAddress[] = await res.json();
  return data.map((item) => ({
    id: item.adresse.id,
    text: item.tekst,
    description: `${item.adresse.postnr} ${item.adresse.postnrnavn}`,
    coordinates: [item.adresse.x, item.adresse.y] as [number, number],
    type: "address" as const,
  }));
}

interface DawaPlace {
  navn: string;
  sted: {
    id: string;
    undertype: string;
    visueltcenter: [number, number];
    kommuner: Array<{ navn: string }>;
  };
}

async function fetchPlaces(query: string): Promise<SearchResult[]> {
  const url = `${DAWA_BASE}/stednavne2/autocomplete?q=${encodeURIComponent(query)}&per_side=5`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) return [];

  const data: DawaPlace[] = await res.json();
  return data.map((item) => ({
    id: item.sted.id,
    text: item.navn,
    description: [item.sted.undertype, item.sted.kommuner?.[0]?.navn]
      .filter(Boolean)
      .join(", "),
    coordinates: [
      item.sted.visueltcenter[0],
      item.sted.visueltcenter[1],
    ] as [number, number],
    type: "place" as const,
  }));
}
