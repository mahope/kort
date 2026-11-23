import { describe, expect, it } from "vitest";
import { DATAFORSYNINGEN_TOKEN, transformRequest } from "../styles";
import { DTK25_SCREEN_SOURCE, DTK25_SOURCE, DTK25_TILES_URL } from "../sources";

const countToken = (url: string) => (url.match(/token=/g) ?? []).length;

describe("transformRequest", () => {
  it("adds the token to Dataforsyningen API URLs without one", () => {
    const { url } = transformRequest("https://api.dataforsyningen.dk/foo?a=1");
    expect(url).toBe(`https://api.dataforsyningen.dk/foo?a=1&token=${DATAFORSYNINGEN_TOKEN}`);
  });

  it("starts the query string when the URL has none", () => {
    const { url } = transformRequest("https://api.dataforsyningen.dk/foo");
    expect(url).toBe(`https://api.dataforsyningen.dk/foo?token=${DATAFORSYNINGEN_TOKEN}`);
  });

  it("does not add a second token when one is already present", () => {
    const input = `https://api.dataforsyningen.dk/foo?token=abc&x=1`;
    expect(transformRequest(input).url).toBe(input);
  });

  it("leaves other hosts untouched", () => {
    expect(transformRequest("https://tile.openstreetmap.org/1/2/3.png").url).toBe(
      "https://tile.openstreetmap.org/1/2/3.png"
    );
  });

  it("leaves the tile route's URLs without token or key (the route adds them)", () => {
    for (const src of [DTK25_SOURCE, DTK25_SCREEN_SOURCE]) {
      const url = transformRequest(src.tiles[0]).url;
      expect(countToken(url)).toBe(0);
      expect(url).not.toContain("apikey");
    }
  });
});

describe("DTK25 sources", () => {
  it("keeps the print source as PNG through the tile route", () => {
    expect(DTK25_SOURCE.tiles).toEqual([DTK25_TILES_URL]);
    expect(DTK25_TILES_URL).toBe(`${window.location.origin}/api/tiles/dtk25/{z}/{x}/{y}.png`);
  });

  it("serves the screen source as opaque JPEG from the same layer", () => {
    expect(DTK25_SCREEN_SOURCE.tiles).toEqual([`${window.location.origin}/api/tiles/dtk25/{z}/{x}/{y}.jpg`]);
  });
});
