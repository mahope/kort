import { describe, it, expect } from "vitest";
import { probeSoekort } from "../availability";

function answer(status: number, body: string): typeof fetch {
  return (async () => new Response(body, { status })) as unknown as typeof fetch;
}

describe("probeSoekort", () => {
  it("says yes for a PMTiles archive", async () => {
    expect(await probeSoekort("https://x/a.pmtiles", answer(206, "PMTiles\u0003"))).toBe(true);
  });

  it("says no for a 404, an HTML page or a network error", async () => {
    expect(await probeSoekort("https://x/a.pmtiles", answer(404, "PMTiles"))).toBe(false);
    expect(await probeSoekort("https://x/a.pmtiles", answer(200, "<html>"))).toBe(false);
    const down = (async () => {
      throw new TypeError("offline");
    }) as unknown as typeof fetch;
    expect(await probeSoekort("https://x/a.pmtiles", down)).toBe(false);
  });
});
