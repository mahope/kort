import { describe, it, expect, afterEach } from "vitest";
import {
  DTK25_SOURCE,
  getBaseMapStyle,
  KARTVERKET_TOPO_SOURCE,
  NORDIC_TOPO_SOURCES,
  OPENTOPOMAP_SOURCE,
  OVERLAY_SOURCES,
  kartverketPrintMaxzoom,
  printTilesFor,
  printZoomLimit,
  usesNordicTopo,
} from "../sources";
import { MAP_STYLES } from "../styles";
import { offlineLayerIds } from "@/lib/offline/tiles";
import { deserializeState, serializeState } from "@/lib/url/urlState";
import { mapDataCredit, thirdPartyCredits } from "@/lib/pdf/generator";
import { useMapStore } from "@/stores/mapStore";

const JOTUNHEIMEN = { west: 8.25, east: 8.37, south: 61.6, north: 61.68 };
const DALSLAND = { west: 12.64, east: 12.76, south: 59.01, north: 59.09 };
const KOEBENHAVN = { west: 12.5, east: 12.62, south: 55.64, north: 55.72 };

describe("usesNordicTopo", () => {
  it("replaces the Danish base maps outside Denmark only", () => {
    for (const b of ["dtk25", "skaermkort", "ortofoto", "historisk_hoeje", "historisk_lave"] as const) {
      expect(usesNordicTopo(b, "nordic")).toBe(true);
      expect(usesNordicTopo(b, "dk")).toBe(false);
    }
  });

  it("keeps OpenStreetMap and Intet basiskort as chosen", () => {
    expect(usesNordicTopo("osm", "nordic")).toBe(false);
    expect(usesNordicTopo("none", "nordic")).toBe(false);
  });
});

describe("Nordic topo sources", () => {
  it("stacks OpenTopoMap under Kartverket", () => {
    expect(NORDIC_TOPO_SOURCES.map((s) => s.cfg)).toEqual([OPENTOPOMAP_SOURCE, KARTVERKET_TOPO_SOURCE]);
  });

  it("uses Kartverket's WMTS cache on screen and its WMS at paper resolution in the PDF", () => {
    expect(KARTVERKET_TOPO_SOURCE.tiles).toEqual([
      "https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png",
    ]);
    const [print] = printTilesFor(KARTVERKET_TOPO_SOURCE, 300);
    expect(print).toMatch(/^https:\/\/wms\.geonorge\.no\/skwms1\/wms\.topo\?/);
    expect(print).toContain("LAYERS=kd_hoydelag,");
    expect(print).toContain("MAP_RESOLUTION=300");
    expect(print).toContain("TRANSPARENT=TRUE"); // OpenTopoMap shows through outside Norway
    expect(print).toContain("BBOX={bbox-epsg-3857}");
  });

  it("rounds the paper resolution", () => {
    expect(printTilesFor(KARTVERKET_TOPO_SOURCE, 299.7)[0]).toContain("MAP_RESOLUTION=300");
  });

  it("requests Norwegian contours at the paper resolution too", () => {
    const cfg = OVERLAY_SOURCES.kurverNorge;
    expect(cfg.tiles[0]).not.toContain("MAP_RESOLUTION");
    expect(printTilesFor(cfg, 200)[0]).toContain("MAP_RESOLUTION=200");
    expect(cfg.tiles[0]).toContain("LAYERS=kd_hoydekurver,fkb_hoydekurver");
  });

  it("prints only Kartverket's own layers, never Geovekst (FKB) data", () => {
    for (const cfg of [KARTVERKET_TOPO_SOURCE, OVERLAY_SOURCES.kurverNorge]) {
      const [print] = printTilesFor(cfg, 300);
      const layers = new URL(print.replace("{bbox-epsg-3857}", "0")).searchParams.get("LAYERS")!.split(",");
      expect(layers.length).toBeGreaterThan(0);
      for (const layer of layers) {
        expect(layer).not.toBe("topo");
        expect(layer).not.toMatch(/^fkb/i);
      }
    }
  });

  it("keeps the PDF's WMS scale at or above 1:12.000, where FKB starts", () => {
    const wmsScale = (z: number, dpi: number) => ((40075016.686 / 256 / 2 ** z) * dpi) / 0.0254;
    for (const dpi of [100, 150, 200, 300]) {
      const z = kartverketPrintMaxzoom(dpi);
      expect(wmsScale(z, dpi)).toBeGreaterThanOrEqual(12000);
      expect(wmsScale(z + 1, dpi)).toBeLessThan(12000);
    }
    expect(kartverketPrintMaxzoom(300)).toBe(17);
    expect(printZoomLimit(KARTVERKET_TOPO_SOURCE, 150)).toEqual({ maxzoom: 16 });
    expect(printZoomLimit(OVERLAY_SOURCES.kurverNorge, 150)).toEqual({ maxzoom: 16 });
    expect(printZoomLimit(OPENTOPOMAP_SOURCE, 300)).toEqual({ maxzoom: 17 });
  });

  it("keeps the Danish print tiles exactly as before", () => {
    expect(printTilesFor(DTK25_SOURCE, 300)).toBe(DTK25_SOURCE.tiles);
  });

  it("never saves Kartverket or OpenTopoMap offline", () => {
    expect(KARTVERKET_TOPO_SOURCE.noOffline).toBe(true);
    expect(OPENTOPOMAP_SOURCE.noOffline).toBe(true);
    expect(offlineLayerIds("none", [{ id: "kurverNorge", enabled: true }])).toEqual([]);
  });

  it("credits both sources with their licences", () => {
    expect(KARTVERKET_TOPO_SOURCE.attribution).toContain("Kartverket");
    expect(KARTVERKET_TOPO_SOURCE.credit).toContain("CC BY 4.0");
    expect(OPENTOPOMAP_SOURCE.attribution).toContain("OpenStreetMap");
    expect(OPENTOPOMAP_SOURCE.attribution).toContain("SRTM");
    expect(OPENTOPOMAP_SOURCE.credit).toContain("OpenTopoMap (CC-BY-SA)");
  });
});

describe("getBaseMapStyle outside Denmark", () => {
  it("swaps the vector Skærmkort for the raster background", () => {
    expect(getBaseMapStyle("skaermkort", "klassisk")).toBe(MAP_STYLES.klassisk.url);
    expect(getBaseMapStyle("skaermkort", "klassisk", true)).toEqual(getBaseMapStyle("dtk25", "klassisk"));
  });
});

describe("kurverNorge in the URL", () => {
  it("round-trips", () => {
    const qs = serializeState({ overlays: [{ id: "kurverNorge", opacity: 1 }] });
    expect(deserializeState(qs).overlays).toEqual([{ id: "kurverNorge", opacity: 1 }]);
  });

  it("accepts a view in Norway and northern Sweden", () => {
    expect(deserializeState("c=61.64,8.31,13")).toMatchObject({ lat: 61.64, lng: 8.31, zoom: 13 });
    expect(deserializeState("c=67.9,18.54,12")).toMatchObject({ lat: 67.9, lng: 18.54, zoom: 12 });
  });
});

describe("PDF credits outside Denmark", () => {
  const initial = useMapStore.getState();
  afterEach(() => useMapStore.setState({ baseLayer: initial.baseLayer, overlays: initial.overlays }));

  it("keeps the Danish footer in Denmark", () => {
    expect(mapDataCredit("dtk25", { region: "dk", bounds: KOEBENHAVN })).toBeUndefined();
  });

  it("names the Nordic source the print shows", () => {
    expect(mapDataCredit("dtk25", { region: "nordic", bounds: JOTUNHEIMEN })).toBe("Kortdata: Kartverket");
    expect(mapDataCredit("skaermkort", { region: "nordic", bounds: DALSLAND })).toBe("Kortdata: OpenTopoMap/OpenStreetMap");
    expect(mapDataCredit("osm", { region: "nordic", bounds: DALSLAND })).toBe("Kortdata: OpenStreetMap-bidragydere");
    expect(mapDataCredit("none", { region: "nordic", bounds: JOTUNHEIMEN })).toBe("Intet basiskort");
  });

  it("puts the licence lines in the credits box", () => {
    useMapStore.setState({ baseLayer: "dtk25" });
    expect(thirdPartyCredits({ region: "nordic", bounds: JOTUNHEIMEN }).credits).toEqual([KARTVERKET_TOPO_SOURCE.credit]);
    expect(thirdPartyCredits({ region: "nordic", bounds: DALSLAND }).credits).toEqual([OPENTOPOMAP_SOURCE.credit]);
    expect(thirdPartyCredits({ region: "dk", bounds: KOEBENHAVN }).credits).toEqual([]);
  });

  it("credits Kartverket's contours when only they are printed", () => {
    useMapStore.setState({
      baseLayer: "none",
      overlays: initial.overlays.map((o) => (o.id === "kurverNorge" ? { ...o, enabled: true } : o)),
    });
    expect(thirdPartyCredits({ region: "nordic", bounds: JOTUNHEIMEN }).credits).toEqual([OVERLAY_SOURCES.kurverNorge.credit]);
  });
});
