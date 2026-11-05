import { describe, it, expect } from "vitest";
import {
  tilesForBounds,
  tileBBox3857,
  expandTileUrl,
  areaTileUrls,
  offlineLayerIds,
  checkStart,
  estimateBytes,
  lngLatToTile,
} from "../tiles";
import { groundExtentToBounds, calculatePrintArea } from "@/lib/geo/calculations";
import { DTK25_SCREEN_TILES_URL } from "@/lib/map/sources";

describe("offline tiles", () => {
  it("maps lng/lat to the known tile", () => {
    // x = (12.5683+180)/360*1024 = 547.8, so tile 547.
    expect(lngLatToTile(12.5683, 55.6761, 10)).toEqual({ z: 10, x: 547, y: 320 });
  });

  it("formats the bbox exactly like MapLibre's WMS token", () => {
    expect(tileBBox3857({ z: 0, x: 0, y: 0 })).toBe(
      "-20037508.342789244,-20037508.342789244,20037508.342789244,20037508.342789244"
    );
    const [minX, minY, maxX, maxY] = tileBBox3857({ z: 1, x: 1, y: 0 }).split(",").map(Number);
    expect([minX, minY]).toEqual([0, 0]);
    expect(maxX).toBeCloseTo(20037508.342789244, 6);
    expect(maxY).toBeCloseTo(20037508.342789244, 6);
  });

  it("expands the DTK25 screen template to a JPEG WMS url", () => {
    const url = expandTileUrl(DTK25_SCREEN_TILES_URL, { z: 13, x: 4390, y: 2560 });
    expect(url).toContain("FORMAT=image/jpeg");
    expect(url).toContain("TRANSPARENT=FALSE");
    expect(url).not.toContain("{");
  });

  it("an A4 frame at 1:25.000 is a few hundred tiles on z13-16", () => {
    const area = calculatePrintArea("A4", "portrait", 25000);
    const bounds = groundExtentToBounds(10.2, 56.1, area.groundWidthM, area.groundHeightM);
    const tiles = tilesForBounds(bounds, 13, 16);
    expect(tiles.length).toBeGreaterThan(300);
    expect(tiles.length).toBeLessThan(600);
    expect(tiles.every((t) => t.z >= 13 && t.z <= 16)).toBe(true);
  });

  it("builds deduplicated urls per layer and skips unsaveable base layers", () => {
    const bounds = { north: 56.11, south: 56.1, east: 10.21, west: 10.2 };
    expect(offlineLayerIds("osm", [{ id: "contours", enabled: true }])).toEqual(["contours"]);
    expect(offlineLayerIds("skaermkort", [])).toEqual([]);
    const ids = offlineLayerIds("dtk25", [
      { id: "contours", enabled: true },
      { id: "matrikel", enabled: false },
    ]);
    expect(ids).toEqual(["dtk25", "contours"]);
    const perLayer = tilesForBounds(bounds).length;
    const urls = areaTileUrls(bounds, ids);
    expect(urls.length).toBe(perLayer * 2);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("requires confirmation above 2,000 tiles or 100 MB and warns on quota", () => {
    expect(checkStart(400, estimateBytes(400, ["dtk25"]), 1e9)).toEqual({
      needsConfirm: false,
      tooLarge: false,
      exceedsQuota: false,
    });
    expect(checkStart(2001, 1, null).needsConfirm).toBe(true);
    expect(checkStart(10, 101 * 1024 * 1024, null).needsConfirm).toBe(true);
    expect(checkStart(400, 50e6, 10e6).exceedsQuota).toBe(true);
    expect(checkStart(400, 50e6, null).exceedsQuota).toBe(false);
    expect(checkStart(20001, 1, null).tooLarge).toBe(true);
  });
});
