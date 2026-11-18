import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { LayerSpecification } from "maplibre-gl";
import { buildSoekortStyle, DEPTH_BANDS, SOEKORT_ICONS, SOEKORT_SOURCE_ID, SOEKORT_TOKENS, SOEKORT_URL } from "../style";
import { getBaseMapStyle, isSeaBaseLayer } from "@/lib/map/sources";
import { pmtilesArchive } from "@/lib/map/contours";
import { thirdPartyCredits } from "@/lib/pdf/generator";
import { deserializeState, serializeState } from "@/lib/url/urlState";
import { useMapStore } from "@/stores/mapStore";

const SCRIPT = readFileSync(join(process.cwd(), "scripts/soekort-vektor/build-soekort-tiles.sh"), "utf8");
const screen = buildSoekortStyle();
const layer = (style: ReturnType<typeof buildSoekortStyle>, id: string) =>
  style.layers.find((l) => l.id === id) as LayerSpecification & { layout?: Record<string, unknown>; paint?: Record<string, unknown> };

describe("Søkort style", () => {
  it("only reads layers the build script writes", () => {
    // tippecanoe's "-L name:file" arguments in build-soekort-tiles.sh
    const built = new Set([...SCRIPT.matchAll(/-L (\w+):/g)].map((m) => m[1]));
    const used = screen.layers.flatMap((l) => ("source-layer" in l && l["source-layer"] ? [l["source-layer"]] : []));
    expect(used.length).toBeGreaterThan(10);
    for (const name of used) expect(built, `source-layer ${name}`).toContain(name);
  });

  it("colours every depth band the script cuts, and nothing else", () => {
    // gdal_contour -p -fl ... for the bands; deeper than 50 m is the background.
    const levels = /gdal_contour -q -p [^\n]*-fl ([-\d ]+)/.exec(SCRIPT)![1].trim().split(/\s+/).map(Number);
    const bands = levels.filter((l) => l <= 0 && l > -50).map((l) => Math.abs(l)).sort((a, b) => a - b);
    expect(DEPTH_BANDS).toEqual(bands);
    // Shallow water is the strongest blue: each band is lighter than the one above it.
    const lightness = DEPTH_BANDS.map((d) => parseInt(SOEKORT_TOKENS.colors.depth[String(d) as "0"].slice(1, 3), 16));
    expect([...lightness].sort((a, b) => a - b)).toEqual(lightness);
  });

  it("reads our own PMTiles and Dataforsyningen's glyphs", () => {
    expect(screen.sources[SOEKORT_SOURCE_ID]).toMatchObject({ type: "vector", url: `pmtiles://${SOEKORT_URL}` });
    expect(SOEKORT_URL).toMatch(/^https:\/\/tiles\.mahoje\.dk\/soekort-v\d+\.pmtiles$/);
    expect(screen.glyphs).toMatch(/cdn\.dataforsyningen\.dk/);
  });

  it("scales lines and text with the paper, so a 300 dpi PDF matches the screen", () => {
    const print = buildSoekortStyle(300 / 25.4);
    const ratio = 300 / 96;
    for (const id of ["sk-sounding", "sk-water-label"]) {
      const a = layer(screen, id).layout!["text-size"];
      const b = layer(print, id).layout!["text-size"];
      if (typeof a === "number") expect(b as number).toBeCloseTo(a * ratio, 2);
      else expect(JSON.stringify(b)).not.toEqual(JSON.stringify(a));
    }
    expect(layer(print, "sk-coast").paint!["line-width"] as number).toBeCloseTo(
      (layer(screen, "sk-coast").paint!["line-width"] as number) * ratio,
      2
    );
    // Sounding text is 2 mm on paper at any dpi.
    expect(layer(print, "sk-sounding").layout!["text-size"]).toBeCloseTo((SOEKORT_TOKENS.mm.soundingText * 300) / 25.4, 2);
  });

  it("puts the beach on the land side of OSM's coastline (land is on its left)", () => {
    expect(layer(screen, "sk-beach").paint!["line-offset"]).toBeLessThan(0);
  });

  it("asks only for the icons it draws itself", () => {
    const wanted = JSON.stringify(screen.layers.map((l) => (l as { layout?: Record<string, unknown> }).layout?.["icon-image"]));
    for (const id of Object.values(SOEKORT_ICONS)) expect(wanted).toContain(id);
  });
});

describe("Søkort as a base map", () => {
  const initial = useMapStore.getState();
  afterEach(() => useMapStore.setState({ baseLayer: initial.baseLayer, overlays: initial.overlays }));

  it("gives the live map the same style object on every render", () => {
    expect(getBaseMapStyle("soekort", "klassisk")).toBe(getBaseMapStyle("soekort", "klassisk"));
    expect(getBaseMapStyle("soekort", "klassisk", 5)).not.toBe(getBaseMapStyle("soekort", "klassisk"));
  });

  it("is a sea base map with the warning and every source on the PDF", () => {
    expect(isSeaBaseLayer("soekort")).toBe(true);
    expect(isSeaBaseLayer("dtk25")).toBe(false);
    useMapStore.setState({ baseLayer: "soekort", overlays: initial.overlays.map((o) => ({ ...o, enabled: false })) });
    const c = thirdPartyCredits();
    expect(c.notForNavigation).toBe(true);
    const text = c.credits.join(" ");
    for (const s of ["EMODnet Bathymetry", "OpenStreetMap", "Natura 2000", "vilkår for brug af danske offentlige data", "UK Hydrographic Office"]) {
      expect(text).toContain(s);
    }
  });

  it("survives a share link", () => {
    expect(deserializeState(serializeState({ baseLayer: "soekort" })).baseLayer).toBe("soekort");
  });

  it("finds the archive behind a pmtiles:// request, for header and tiles alike", () => {
    expect(pmtilesArchive(`pmtiles://${SOEKORT_URL}`)).toBe(SOEKORT_URL);
    expect(pmtilesArchive(`pmtiles://${SOEKORT_URL}/12/2170/1250`)).toBe(SOEKORT_URL);
  });
});
