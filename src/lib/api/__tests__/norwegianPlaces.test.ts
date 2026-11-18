import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchNorwegianPlaces, norwegianPlacesUrl } from "../norwegianPlaces";
import { searchAddresses } from "../address";

afterEach(() => vi.unstubAllGlobals());

const galdhoepiggen = {
  skrivemåte: "Galdhøpiggen",
  navneobjekttype: "Fjell",
  stedsnummer: 123,
  kommuner: [{ kommunenavn: "Lom" }],
  representasjonspunkt: { nord: 61.63644, øst: 8.31248 },
};

describe("norwegianPlacesUrl", () => {
  it("asks Kartverket for a prefix search in geographic coordinates", () => {
    const url = new URL(norwegianPlacesUrl("Galdhøp"));
    expect(url.origin + url.pathname).toBe("https://api.kartverket.no/stedsnavn/v1/navn");
    expect(url.searchParams.get("sok")).toBe("Galdhøp*");
    expect(url.searchParams.get("utkoordsys")).toBe("4258");
  });
});

describe("fetchNorwegianPlaces", () => {
  it("maps hits to place results with [lng, lat]", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ navn: [galdhoepiggen] }))));
    expect(await fetchNorwegianPlaces("Galdhøp")).toEqual([
      {
        id: "no-123",
        text: "Galdhøpiggen",
        description: "Fjell, Lom, Norge",
        coordinates: [8.31248, 61.63644],
        type: "place",
      },
    ]);
  });

  it("drops hits without a name or a point", async () => {
    const broken = [{ skrivemåte: "Uten punkt" }, { representasjonspunkt: { nord: 60, øst: 9 } }];
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ navn: [...broken, galdhoepiggen] }))));
    expect((await fetchNorwegianPlaces("Galdhøp")).map((r) => r.text)).toEqual(["Galdhøpiggen"]);
  });

  it("skips short queries and survives an error response", async () => {
    const fetchMock = vi.fn(async () => new Response("nope", { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await fetchNorwegianPlaces("Ga")).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await fetchNorwegianPlaces("Galdhøp")).toEqual([]);
  });
});

describe("searchAddresses with Norway", () => {
  it("lists Danish results first and keeps room for Norwegian places", async () => {
    const danishPlaces = Array.from({ length: 12 }, (_, i) => ({
      id: `dk-${i}`,
      text: `Sted ${i}`,
      description: "sø",
      coordinates: [10, 56],
      type: "place",
    }));
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.startsWith("/api/stednavne")) return new Response(JSON.stringify(danishPlaces));
        if (url.startsWith("https://api.kartverket.no")) return new Response(JSON.stringify({ navn: [galdhoepiggen] }));
        return new Response(JSON.stringify({ status: "ok", fund: [] }));
      })
    );
    const res = await searchAddresses("Galdhøp");
    expect(res).toHaveLength(9);
    expect(res[0].id).toBe("dk-0");
    expect(res[res.length - 1].text).toBe("Galdhøpiggen");
  });
});
