import { SOEKORT_URL } from "./style";

/**
 * Whether the Søkort PMTiles file answers at SOEKORT_URL. The file is uploaded to
 * tiles.mahoje.dk by hand (scripts/soekort-vektor/README.md, "Publish"), so an app
 * deployed before the upload would otherwise offer a base map that draws an empty
 * blue sheet. The pickers hide "Søkort" until this says yes.
 *
 * One small range request per page load; "pending" until it answers.
 */
export type SoekortAvailability = "pending" | "yes" | "no";

let state: SoekortAvailability = "pending";
let started = false;
const listeners = new Set<() => void>();

function set(next: SoekortAvailability) {
  state = next;
  for (const l of listeners) l();
}

/** Reads the first bytes: a PMTiles archive starts with the magic "PMTiles". */
export async function probeSoekort(url: string = SOEKORT_URL, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  try {
    const res = await fetchImpl(url, { headers: { Range: "bytes=0-6" } });
    if (res.status !== 206 && res.status !== 200) return false;
    const head = new Uint8Array(await res.arrayBuffer()).slice(0, 7);
    return new TextDecoder().decode(head) === "PMTiles";
  } catch {
    return false;
  }
}

/** Starts the probe once (browser only). */
export function startSoekortProbe(): void {
  if (started || typeof window === "undefined") return;
  started = true;
  probeSoekort().then((ok) => set(ok ? "yes" : "no"));
}

export function subscribeSoekortAvailability(listener: () => void): () => void {
  listeners.add(listener);
  startSoekortProbe();
  return () => listeners.delete(listener);
}

export function getSoekortAvailability(): SoekortAvailability {
  return state;
}

/** Test hook: forget the probe result. */
export function resetSoekortAvailabilityForTests(next: SoekortAvailability = "pending"): void {
  state = next;
  started = next !== "pending";
}
