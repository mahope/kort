import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { chartsInBounds, lakeChartDetails, lakeChartImageUrl, parseLakeCharts, type LakeChart } from "../lakeCharts";
import { soekortDataUrl, vectorOverlayLayers, vectorOverlaySource } from "../vectorOverlays";
import { OVERLAY_SOURCES } from "../sources";
import { DATAFORSYNINGEN_TOKEN } from "../styles";

const DIR = join(__dirname, "..", "..", "..", "..", "public", "data", "soekort");
const read = (name: string) => JSON.parse(readFileSync(join(DIR, name), "utf8"));

describe("sea and lake snapshots in public/data/soekort", () => {
  it("lake depths are whole-metre lines inside Denmark, dated", () => {
    const fc = read("soedybder.geojson");
    expect(fc.metadata.retrieved).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(fc.features.length).toBeGreaterThan(1000);
    for (const f of fc.features) {
      expect(f.geometry.type).toBe("LineString");
      expect(Number.isInteger(f.properties.d) && f.properties.d > 0).toBe(true);
      const [lng, lat] = f.geometry.coordinates[0];
      expect(lng).toBeGreaterThan(7.9);
      expect(lng).toBeLessThan(15.8);
      expect(lat).toBeGreaterThan(54.3);
      expect(lat).toBeLessThan(57.9);
    }
  });

  it("wrecks are points with no lifted or vanished wrecks left in", () => {
    const fc = read("vrag.geojson");
    expect(fc.features.length).toBeGreaterThan(1000);
    expect(fc.metadata.licence).toMatch(/CC BY 4\.0/);
    for (const f of fc.features) {
      expect(f.geometry.type).toBe("Point");
      if ("n" in f.properties) expect(f.properties.n).not.toMatch(/^N\/A$| Or /);
    }
  });

  it("the chart index points at the scans without a token, and Mossø i Rold Skov sits in Rold Skov", () => {
    const raw = readFileSync(join(DIR, "indsoekort.geojson"), "utf8");
    expect(raw).not.toContain("token=");
    const charts = parseLakeCharts(JSON.parse(raw));
    expect(charts.length).toBeGreaterThan(200);
    for (const c of charts) expect(c.iiif).toMatch(/^https:\/\/api\.dataforsyningen\.dk\/rest\/arkivkort\/iiif\/3\//);
    // The archive placed one copy at Mossø by Skanderborg (56.04 N); the scan shows Rold Skov.
    // It is also in the archive twice (1981 original, 1997 print): one marker.
    const rold = charts.filter((c) => c.title === "Mossø (Rold Skov)");
    expect(rold.length).toBe(1);
    for (const c of rold) expect(c.lat).toBeCloseTo(56.807, 2);
  });
});

const chart = (title: string, lng: number, lat: number, extra: Partial<LakeChart> = {}): LakeChart => ({
  id: title,
  title,
  iiif: `https://api.dataforsyningen.dk/rest/arkivkort/iiif/3/${title}`,
  lng,
  lat,
  ...extra,
});

describe("lake charts", () => {
  const bounds = { west: 9, east: 10, south: 56, north: 57 };

  it("picks the charts inside the print, nearest the centre first, each survey once, at most four", () => {
    const charts = [
      chart("Udenfor", 11, 56.5),
      chart("Kant", 9.05, 56.05),
      chart("Midt", 9.5, 56.5, { author: "Thorkild Høy", year: 1981 }),
      chart("Midt", 9.5, 56.5, { author: "Thorkild Høy", year: 1981, id: "kopi" }),
      chart("Nær", 9.6, 56.6),
      chart("A", 9.2, 56.2),
      chart("B", 9.3, 56.3),
    ];
    const picked = chartsInBounds(charts, bounds);
    expect(picked.map((c) => c.title)).toEqual(["Midt", "Nær", "B", "A"]);
    expect(chartsInBounds(charts, bounds, 10).map((c) => c.title)).toContain("Kant");
    expect(chartsInBounds(charts, bounds, 10).map((c) => c.title)).not.toContain("Udenfor");
  });

  it("asks the IIIF service for a JPEG of the wanted width, with the token", () => {
    const url = lakeChartImageUrl(chart("X", 9, 56), 1653.4);
    expect(url).toContain("/iiif/3/X/full/1653,/0/default.jpg?");
    expect(url).toContain(`token=${DATAFORSYNINGEN_TOKEN}`);
  });

  it("describes a chart by surveyor, year and scale", () => {
    expect(lakeChartDetails(chart("X", 9, 56, { author: "Thorkild Høy", year: 1981, scale: "1:4000" }))).toBe(
      "Thorkild Høy, 1981, 1:4000"
    );
    expect(lakeChartDetails(chart("X", 9, 56))).toBe("");
  });
});

describe("vector overlay layers", () => {
  it("serves each snapshot from our own origin", () => {
    expect(soekortDataUrl("vrag")).toBe("/data/soekort/vrag.geojson");
    expect(vectorOverlaySource("soedybder")).toEqual({
      type: "geojson",
      data: `${window.location.origin}/data/soekort/soedybder.geojson`,
    });
    for (const kind of ["soedybder", "indsoekort", "vrag"] as const) {
      expect(OVERLAY_SOURCES[kind].vector).toBe(kind);
    }
  });

  it("sizes lines and text in millimetres on paper, so 300 dpi matches the screen", () => {
    const screen = vectorOverlayLayers("soedybder", "s", 1, 1);
    const print = vectorOverlayLayers("soedybder", "s", 1, 300 / 25.4);
    const width = (ls: typeof screen) => (ls[0] as { paint: { "line-width": unknown[] } }).paint["line-width"];
    expect(width(screen)).toEqual(["case", ["==", ["%", ["get", "d"], 5], 0], 0.26, 0.13]);
    expect((width(print)[3] as number) / (width(screen)[3] as number)).toBeCloseTo(300 / 25.4);
    expect(screen.map((l) => l.type)).toEqual(["line", "symbol"]);
  });

  it("labels only named wrecks, and marks lake charts as historical", () => {
    const [, wreckLabel] = vectorOverlayLayers("vrag", "v", 1);
    expect((wreckLabel as { filter: unknown }).filter).toEqual(["has", "n"]);
    const [, chartLabel] = vectorOverlayLayers("indsoekort", "i", 1);
    expect(JSON.stringify((chartLabel as { layout: object }).layout)).toContain("Historisk indsøkort");
  });
});
