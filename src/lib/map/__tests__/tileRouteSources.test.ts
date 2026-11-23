import { afterEach, describe, expect, it } from "vitest";
import { getRasterBaseLayers, NORDIC_TOPO_SOURCES, OVERLAY_SOURCES } from "../sources";
import { thirdPartyCredits } from "@/lib/pdf/generator";
import { areaTileUrls } from "@/lib/offline/tiles";
import { DENMARK_TILE_BOUNDS, TILE_ROUTE_LAYERS } from "@/lib/tiles/routeLayers";
import { useMapStore } from "@/stores/mapStore";

const origin = window.location.origin;
const screen = getRasterBaseLayers("screen");
const print = getRasterBaseLayers("print");

const ROUTED: Record<string, string[]> = {
  ortofoto: [screen.ortofoto.tiles[0]],
  dtk25: [screen.dtk25.tiles[0], print.dtk25.tiles[0]],
  historisk_hoeje: [screen.historisk_hoeje.tiles[0]],
  historisk_lave: [screen.historisk_lave.tiles[0]],
  stednavne: OVERLAY_SOURCES.stednavne.tiles,
  contours: OVERLAY_SOURCES.contours.tiles,
  contours25: OVERLAY_SOURCES.contours25.tiles,
  hillshade: OVERLAY_SOURCES.hillshade.tiles,
};

describe("Danish layers through the tile route", () => {
  it("routes every layer the route serves, on screen and in the PDF", () => {
    expect(Object.keys(ROUTED).sort()).toEqual([...TILE_ROUTE_LAYERS].sort());
    for (const [layer, templates] of Object.entries(ROUTED)) {
      for (const t of templates) expect(t).toMatch(new RegExp(`^${origin}/api/tiles/${layer}/\\{z\\}/\\{x\\}/\\{y\\}\\.(png|jpg)$`));
    }
  });

  it("keeps the PDF at PNG and the screen DTK25 at JPEG, as before", () => {
    expect(print.dtk25.tiles[0]).toMatch(/\.png$/);
    expect(screen.dtk25.tiles[0]).toMatch(/\.jpg$/);
    expect(screen.ortofoto.tiles[0]).toMatch(/\.jpg$/);
    for (const id of ["stednavne", "contours", "contours25", "hillshade"] as const) {
      expect(OVERLAY_SOURCES[id].tiles[0]).toMatch(/\.png$/);
    }
  });

  it("limits the routed layers to Denmark, so MapLibre asks for nothing the route refuses", () => {
    for (const cfg of [screen.ortofoto, screen.dtk25, print.dtk25, screen.historisk_hoeje, screen.historisk_lave]) {
      expect(cfg.bounds).toEqual(DENMARK_TILE_BOUNDS);
    }
    for (const id of ["stednavne", "contours", "contours25", "hillshade"] as const) {
      expect(OVERLAY_SOURCES[id].bounds).toEqual(DENMARK_TILE_BOUNDS);
    }
  });

  it("never puts a Datafordeler host or key parameter in a client tile URL", () => {
    const all = [
      ...Object.values(screen),
      ...Object.values(print),
      ...Object.values(OVERLAY_SOURCES),
      ...NORDIC_TOPO_SOURCES.map((s) => s.cfg),
    ].flatMap((cfg) => [...cfg.tiles, ...(cfg.printTiles ? cfg.printTiles(300) : [])]);
    for (const url of all) {
      expect(url).not.toContain("datafordeler.dk");
      expect(url).not.toMatch(/apikey/i);
    }
  });

  it("saves offline areas from the route, same-origin", () => {
    const urls = areaTileUrls({ north: 56.22, south: 56.21, east: 10.57, west: 10.56 }, ["dtk25", "hillshade"]);
    expect(urls.length).toBeGreaterThan(0);
    for (const u of urls) expect(u.startsWith(`${origin}/api/tiles/`)).toBe(true);
  });
});

describe("cadastre (matrikel)", () => {
  const initial = useMapStore.getState();
  afterEach(() => useMapStore.setState({ overlays: initial.overlays }));

  it("comes from wms/forvaltning2 on Dataforsyningen", () => {
    expect(OVERLAY_SOURCES.matrikel.tiles[0]).toMatch(/^https:\/\/api\.dataforsyningen\.dk\/wms\/forvaltning2\?/);
    expect(OVERLAY_SOURCES.matrikel.tiles[0]).toContain("LAYERS=Matrikelskel");
    expect(OVERLAY_SOURCES.matrikel.tiles[0]).toContain("SRS=EPSG:3857");
  });

  it("credits Geodatastyrelsen on the map and in the PDF", () => {
    expect(OVERLAY_SOURCES.matrikel.attribution).toContain("Geodatastyrelsen");
    expect(OVERLAY_SOURCES.matrikel.attribution).not.toContain("Klimadatastyrelsen");
    useMapStore.setState({
      overlays: initial.overlays.map((o) => ({ ...o, enabled: o.id === "matrikel" })),
    });
    expect(thirdPartyCredits().credits).toContain("Matrikelskel: Geodatastyrelsen, CC BY 4.0");
  });
});
