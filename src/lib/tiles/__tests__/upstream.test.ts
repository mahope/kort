import { describe, expect, it } from "vitest";
import { DATAFORSYNINGEN_TOKEN } from "@/lib/map/styles";
import { tileBBox3857, tileIntersects } from "../bbox";
import { DENMARK_TILE_BOUNDS, TILE_ROUTE_FORMATS, TILE_ROUTE_LAYERS } from "../routeLayers";
import { tileCacheControl, upstreamTileUrl } from "../upstream";

const TILE = { z: 14, x: 8672, y: 5084 };
const KEY = "k3y";

const params = (url: string) => new URL(url).searchParams;

describe("upstreamTileUrl with a Datafordeler key", () => {
  it.each([
    ["dtk25", "/DKtopokort/dtk_25/1.0.0/WMS", "dtk25"],
    ["historisk_hoeje", "/HoejeMaalebordsblade/topo20_hoeje_maalebordsblade/1.0.0/wms", "dtk_hoeje_maalebordsblade"],
    ["historisk_lave", "/LaveMaalebordsblade/topo20_lave_maalebordsblade/1.0.0/wms", "dtk_lave_maalebordsblade"],
    ["stednavne", "/STEDNAVN/Danske_Stednavne/1.0.0/WMS", "danske_stednavne"],
    ["contours", "/DHMNedboer/dhm/1.0.0/WMS", "dhm_kurve_0_5_m"],
    ["contours25", "/DHMNedboer/dhm/1.0.0/WMS", "dhm_kurve_traditionel"],
    ["hillshade", "/DHMNedboer/dhm/1.0.0/WMS", "dhm_terraen_skyggekort"],
  ] as const)("%s: one 256 px EPSG:3857 WMS tile", (layer, path, layers) => {
    const url = upstreamTileUrl(layer, TILE, "png", KEY);
    const u = new URL(url);
    expect(u.origin + u.pathname).toBe(`https://wms.datafordeler.dk${path}`);
    const p = u.searchParams;
    expect(p.get("LAYERS")).toBe(layers);
    expect(p.get("SRS")).toBe("EPSG:3857");
    expect(p.get("WIDTH")).toBe("256");
    expect(p.get("HEIGHT")).toBe("256");
    expect(p.get("FORMAT")).toBe("image/png");
    expect(p.get("TRANSPARENT")).toBe("TRUE");
    expect(p.get("BBOX")).toBe(tileBBox3857(TILE));
    expect(p.get("apikey")).toBe(KEY);
    expect(p.get("token")).toBeNull();
  });

  it("asks for opaque JPEG for the DTK25 screen tiles", () => {
    const p = params(upstreamTileUrl("dtk25", TILE, "jpg", KEY));
    expect(p.get("FORMAT")).toBe("image/jpeg");
    expect(p.get("TRANSPARENT")).toBe("FALSE");
  });

  it("uses the Web Mercator WMTS matrix set for the orthophoto", () => {
    const u = new URL(upstreamTileUrl("ortofoto", TILE, "jpg", KEY));
    expect(u.origin + u.pathname).toBe("https://wmts.datafordeler.dk/GeoDanmarkOrto/orto_foraar_webm/1.0.0/WMTS");
    expect(u.searchParams.get("TileMatrixSet")).toBe("DFD_GoogleMapsCompatible");
    expect(u.searchParams.get("TileMatrix")).toBe("14");
    expect(u.searchParams.get("TileRow")).toBe("5084");
    expect(u.searchParams.get("TileCol")).toBe("8672");
    expect(u.searchParams.get("format")).toBe("image/jpeg");
    expect(u.searchParams.get("apikey")).toBe(KEY);
  });
});

describe("upstreamTileUrl without a key (fallback)", () => {
  it.each([
    ["dtk25", "/dtk_25_DAF", "DTK25"],
    ["historisk_hoeje", "/topo20_hoeje_maalebordsblade_DAF", "dtk_hoeje_maalebordsblade"],
    ["historisk_lave", "/topo20_lave_maalebordsblade_DAF", "dtk_lave_maalebordsblade"],
    ["stednavne", "/danske_stednavne_DAF", "danske_stednavne"],
    ["contours", "/dhm_DAF", "dhm_kurve_0_5_m"],
    ["contours25", "/dhm_DAF", "dhm_kurve_traditionel"],
    ["hillshade", "/dhm_DAF", "dhm_terraen_skyggekort"],
  ] as const)("%s comes from today's Dataforsyningen service with the public token", (layer, path, layers) => {
    const u = new URL(upstreamTileUrl(layer, TILE, "png"));
    expect(u.origin + u.pathname).toBe(`https://api.dataforsyningen.dk${path}`);
    expect(u.searchParams.get("LAYERS")).toBe(layers);
    expect(u.searchParams.get("token")).toBe(DATAFORSYNINGEN_TOKEN);
    expect(u.searchParams.get("apikey")).toBeNull();
  });

  it("keeps the orthophoto on orto_foraar_webm_DAF", () => {
    const u = new URL(upstreamTileUrl("ortofoto", TILE, "jpg", undefined));
    expect(u.origin + u.pathname).toBe("https://api.dataforsyningen.dk/orto_foraar_webm_DAF");
    expect(u.searchParams.get("token")).toBe(DATAFORSYNINGEN_TOKEN);
  });
});

describe("tile route catalogue", () => {
  it("gives every layer a format and a long public cache lifetime", () => {
    for (const layer of TILE_ROUTE_LAYERS) {
      expect(TILE_ROUTE_FORMATS[layer].length).toBeGreaterThan(0);
      const cc = tileCacheControl(layer);
      expect(cc).toMatch(/^public, /);
      expect(Number(/max-age=(\d+)/.exec(cc)?.[1])).toBeGreaterThanOrEqual(7 * 24 * 3600);
      expect(cc).toContain("stale-while-revalidate=");
    }
  });

  it("covers Denmark from Skagen to Gedser and Christiansø, not Oslo", () => {
    const tileAt = (lng: number, lat: number, z: number) => {
      const n = 2 ** z;
      const r = (lat * Math.PI) / 180;
      return {
        z,
        x: Math.floor(((lng + 180) / 360) * n),
        y: Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n),
      };
    };
    for (const [lng, lat] of [[10.6, 57.74], [11.97, 54.56], [15.19, 55.32], [8.08, 55.56]]) {
      expect(tileIntersects(tileAt(lng, lat, 16), DENMARK_TILE_BOUNDS)).toBe(true);
    }
    expect(tileIntersects(tileAt(10.75, 59.91, 14), DENMARK_TILE_BOUNDS)).toBe(false);
  });
});
