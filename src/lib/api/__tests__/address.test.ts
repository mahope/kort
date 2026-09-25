import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchPlaces, searchAddresses } from "../address";

afterEach(() => vi.unstubAllGlobals());

const place = {
  id: "stednavn-1",
  text: "Himmelbjerget",
  description: "bakke, Skanderborg",
  coordinates: [9.68545, 56.10405],
  type: "place",
};

describe("fetchPlaces", () => {
  it("calls the internal route, never DAWA", async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () => new Response(JSON.stringify([place]))
    );
    vi.stubGlobal("fetch", fetchMock);
    expect(await fetchPlaces("Himmelbjerget")).toEqual([place]);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/stednavne?q=Himmelbjerget");
  });

  it("skips the request for out-of-range queries", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await fetchPlaces("a")).toEqual([]);
    expect(await fetchPlaces("x".repeat(61))).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("drops malformed items", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify([place, { text: "x" }])))
    );
    expect(await fetchPlaces("Himmel")).toEqual([place]);
  });
});

describe("searchAddresses", () => {
  it("still returns addresses when place search fails (silent fallback)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.startsWith("/api/stednavne")) {
          return new Response("boom", { status: 503 });
        }
        return new Response(
          JSON.stringify({
            status: "ok",
            fund: [
              { id: "h1", type: "husnummer", titel: "Rådhuspladsen 1, 1550 København V" },
            ],
          })
        );
      })
    );
    const res = await searchAddresses("Rådhuspladsen 1");
    expect(res.map((r) => r.type)).toEqual(["address"]);
  });
});
