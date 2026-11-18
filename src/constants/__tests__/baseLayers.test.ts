import { describe, it, expect } from "vitest";
import { BASE_LAYERS, baseLayerLabel, baseLayerOptions, isBaseLayerSelected, NORDIC_TOPO_OPTION } from "../baseLayers";

describe("base layer options per region", () => {
  it("offers every base map in Denmark, as before", () => {
    expect(baseLayerOptions("dk")).toBe(BASE_LAYERS);
  });

  it("offers one topo map instead of the Danish maps outside Denmark", () => {
    const options = baseLayerOptions("nordic");
    // Søkort is our own chart and also covers the Swedish side of Kattegat and Øresund.
    expect(options.map((o) => o.value)).toEqual(["dtk25", "osm", "soekort", "none"]);
    expect(options[0]).toBe(NORDIC_TOPO_OPTION);
    expect(options.some((o) => o.hasStyles)).toBe(false); // no Skærmkort style picker
  });

  it("counts any Danish map as the topo map outside Denmark", () => {
    for (const chosen of ["ortofoto", "skaermkort", "historisk_lave", "dtk25"] as const) {
      expect(isBaseLayerSelected(NORDIC_TOPO_OPTION, chosen, "nordic")).toBe(true);
      expect(baseLayerLabel(chosen, "nordic")).toBe(NORDIC_TOPO_OPTION.label);
    }
    const osm = baseLayerOptions("nordic").find((o) => o.value === "osm")!;
    expect(isBaseLayerSelected(osm, "osm", "nordic")).toBe(true);
    expect(isBaseLayerSelected(NORDIC_TOPO_OPTION, "osm", "nordic")).toBe(false);
    expect(baseLayerLabel("osm", "nordic")).toBe("OpenStreetMap");
    expect(baseLayerLabel("ortofoto", "dk")).toBe("Ortofoto (luftfoto)");
  });
});
