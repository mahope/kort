import { expect, it, vi } from "vitest";
import { baseLayersOf } from "../SoekortLayers";
import { soekortAnchors } from "@/lib/map/soekortStyle";

vi.mock("maplibre-gl", () => ({ default: {}, addProtocol: () => {} }));

/** A map with a skærmkort, the søkort already in it, and raster and contour overlays on top. */
function fakeMap() {
  const layers: Record<string, { type: string; source?: string }> = {
    vand_hav: { type: "fill", source: "vector-source" },
    "soekort-overlay-areas-sea-z5": { type: "fill", source: "soekort-overlay" },
    linje_færgerute: { type: "line", source: "vector-source" },
    vand_sø: { type: "fill", source: "vector-source" },
    veje: { type: "line", source: "vector-source" },
    tekst_by: { type: "symbol", source: "vector-source" },
    "hillshade-overlay-layer": { type: "raster", source: "hillshade-overlay" },
    "kurver5-overlay-line": { type: "line", source: "kurver5-overlay" },
  };
  const sources: Record<string, { type: string; url?: string }> = {
    "vector-source": { type: "vector", url: "https://api.dataforsyningen.dk/topo_skaermkort" },
    "soekort-overlay": { type: "vector", url: "pmtiles://https://tiles.mahoje.dk/soekort.pmtiles" },
    "kurver5-overlay": { type: "vector", url: "pmtiles://https://tiles.mahoje.dk/kurver-5m.pmtiles" },
    "hillshade-overlay": { type: "raster" },
  };
  return {
    getLayersOrder: () => Object.keys(layers),
    getLayer: (id: string) => layers[id],
    getSource: (id: string) => sources[id],
  } as unknown as Parameters<typeof baseLayersOf>[0];
}

it("finds the skærmkort's insertion points past the layers the app added", () => {
  expect(baseLayersOf(fakeMap()).map((l) => l.id)).toEqual(["vand_hav", "linje_færgerute", "vand_sø", "veje", "tekst_by"]);
  expect(soekortAnchors(baseLayersOf(fakeMap()))).toEqual({ sea: "linje_færgerute", lake: "veje", labels: "tekst_by" });
});
