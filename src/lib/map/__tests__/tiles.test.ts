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

  it("yields exactly one token for every DTK25 tile URL", () => {
    for (const src of [DTK25_SOURCE, DTK25_SCREEN_SOURCE]) {
      expect(countToken(transformRequest(src.tiles[0]).url)).toBe(1);
    }
  });
});

describe("DTK25 sources", () => {
  it("keeps the print source as transparent PNG", () => {
    expect(DTK25_SOURCE.tiles).toEqual([DTK25_TILES_URL]);
    expect(DTK25_TILES_URL).toContain("FORMAT=image/png");
    expect(DTK25_TILES_URL).toContain("TRANSPARENT=TRUE");
    expect(DTK25_TILES_URL).toBe(
      `https://api.dataforsyningen.dk/dtk_25_DAF?service=WMS&version=1.1.1&request=GetMap` +
        `&SRS=EPSG:3857&WIDTH=256&HEIGHT=256&LAYERS=DTK25&STYLES=default` +
        `&TRANSPARENT=TRUE&FORMAT=image/png&token=${DATAFORSYNINGEN_TOKEN}&BBOX={bbox-epsg-3857}`
    );
  });

  it("serves the screen source as opaque JPEG from the same layer", () => {
    const url = DTK25_SCREEN_SOURCE.tiles[0];
    expect(url).toContain("FORMAT=image/jpeg");
    expect(url).toContain("TRANSPARENT=FALSE");
    expect(url).toContain("LAYERS=DTK25");
    expect(url).not.toContain("image/png");
  });
});
