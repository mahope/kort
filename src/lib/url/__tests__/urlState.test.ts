import { describe, it, expect } from "vitest";
import { serializeState, deserializeState } from "../urlState";

describe("serializeState → deserializeState round-trip", () => {
  it("preserves a full state through a round-trip", () => {
    const input = {
      lat: 56.15678,
      lng: 10.21079,
      zoom: 12.3,
      bearing: 45,
      baseLayer: "ortofoto" as const,
      style: "moerkt" as const,
      scale: 25000,
      paperFormat: "A3" as const,
      orientation: "landscape" as const,
      dpi: 200 as const,
    };
    const round = deserializeState(serializeState(input));

    expect(round.lat).toBeCloseTo(input.lat, 4);
    expect(round.lng).toBeCloseTo(input.lng, 4);
    expect(round.zoom).toBeCloseTo(input.zoom, 1);
    expect(round.bearing).toBe(45);
    expect(round.baseLayer).toBe("ortofoto");
    expect(round.style).toBe("moerkt");
    expect(round.scale).toBe(25000);
    expect(round.paperFormat).toBe("A3");
    expect(round.orientation).toBe("landscape");
    expect(round.dpi).toBe(200);
  });

  it("omits bearing when zero", () => {
    const qs = serializeState({ bearing: 0 });
    expect(qs).not.toContain("b=");
  });

  it("uses short codes for layer and style", () => {
    const qs = serializeState({ baseLayer: "skaermkort", style: "klassisk" });
    expect(qs).toContain("l=sk");
    expect(qs).toContain("v=kl");
  });
});

describe("overlays / UTM grid / multipage in URL", () => {
  it("round-trips enabled overlays with opacity", () => {
    const qs = serializeState({
      overlays: [
        { id: "contours", opacity: 1 },
        { id: "hillshade", opacity: 0.5 },
      ],
    });
    expect(qs).toContain("ov=");
    const round = deserializeState(qs);
    expect(round.overlays).toEqual([
      { id: "contours", opacity: 1 },
      { id: "hillshade", opacity: 0.5 },
    ]);
  });

  it("omits the overlay param when none are enabled", () => {
    expect(serializeState({ overlays: [] })).not.toContain("ov=");
  });

  it("ignores unknown overlay codes", () => {
    expect(deserializeState("ov=zz-100").overlays).toBeUndefined();
  });

  it("round-trips the UTM grid flag", () => {
    expect(serializeState({ showUtmGrid: true })).toContain("g=1");
    expect(deserializeState("g=1").showUtmGrid).toBe(true);
    expect(deserializeState("").showUtmGrid).toBeUndefined();
  });

  it("round-trips UTM grid options (spacing, labels, format, zone)", () => {
    const qs = serializeState({
      showUtmGrid: true,
      gridSpacing: 1000,
      showGridLabels: false,
      gridLabelFormat: "full",
      utmZoneMode: "std",
    });
    const round = deserializeState(qs);
    expect(round.gridSpacing).toBe(1000);
    expect(round.showGridLabels).toBe(false);
    expect(round.gridLabelFormat).toBe("full");
    expect(round.utmZoneMode).toBe("std");
  });

  it("keeps grid defaults out of the URL and ignores bad spacings", () => {
    const qs = serializeState({
      showUtmGrid: true,
      gridSpacing: "auto",
      showGridLabels: true,
      gridLabelFormat: "short",
      utmZoneMode: "dk",
    });
    expect(qs).toBe("g=1");
    expect(serializeState({ showUtmGrid: false, gridSpacing: 1000 })).not.toContain("gs=");
    expect(deserializeState("g=1&gs=1234").gridSpacing).toBeUndefined();
    expect(deserializeState("g=1&gs=100").gridSpacing).toBe(100);
  });

  it("round-trips multipage grid settings", () => {
    const qs = serializeState({ multiPage: true, gridCols: 3, gridRows: 2 });
    const round = deserializeState(qs);
    expect(round.multiPage).toBe(true);
    expect(round.gridCols).toBe(3);
    expect(round.gridRows).toBe(2);
  });

  it("ignores out-of-range grid dimensions", () => {
    const round = deserializeState("mp=1&gc=99&gr=0");
    expect(round.multiPage).toBe(true);
    expect(round.gridCols).toBeUndefined();
    expect(round.gridRows).toBeUndefined();
  });
});

describe("deserializeState validation", () => {
  it("ignores an unknown base layer code", () => {
    expect(deserializeState("l=bogus").baseLayer).toBeUndefined();
  });

  it("ignores an unknown style code", () => {
    expect(deserializeState("v=bogus").style).toBeUndefined();
  });

  it("accepts a full layer value as well as its code", () => {
    expect(deserializeState("l=of").baseLayer).toBe("ortofoto");
    expect(deserializeState("l=ortofoto").baseLayer).toBe("ortofoto");
  });

  it("rejects an out-of-whitelist paper format", () => {
    expect(deserializeState("f=A0").paperFormat).toBeUndefined();
    expect(deserializeState("f=A4").paperFormat).toBe("A4");
  });

  it("rejects an out-of-whitelist dpi", () => {
    expect(deserializeState("d=999").dpi).toBeUndefined();
    expect(deserializeState("d=300").dpi).toBe(300);
  });

  it("ignores a non-positive scale", () => {
    expect(deserializeState("s=-1").scale).toBeUndefined();
    expect(deserializeState("s=0").scale).toBeUndefined();
  });

  it("ignores malformed center coordinates", () => {
    const state = deserializeState("c=abc,def");
    expect(state.lat).toBeUndefined();
    expect(state.lng).toBeUndefined();
  });
});

describe("coordinate system links", () => {
  it("round trips MGRS, even with the grid hidden", () => {
    expect(deserializeState(serializeState({ gridSystem: "mgrs" })).gridSystem).toBe("mgrs");
  });
  it("keeps old grid links in UTM and ignores unknown systems", () => {
    expect(deserializeState("?g=1").gridSystem).toBe("utm");
    expect(deserializeState("?cs=invalid").gridSystem).toBeUndefined();
  });
});

describe("deserializeState validation of numeric params", () => {
  const view = (qs: string) => {
    const s = deserializeState(qs);
    return { lat: s.lat, lng: s.lng, zoom: s.zoom };
  };
  const none = { lat: undefined, lng: undefined, zoom: undefined };

  it("accepts a valid view", () => {
    expect(view("c=56,10,13")).toEqual({ lat: 56, lng: 10, zoom: 13 });
  });
  it("drops latitude 999", () => {
    expect(view("c=999,10,13")).toEqual(none);
  });
  it("drops Infinity coordinates", () => {
    expect(view("c=Infinity,10,5")).toEqual(none);
    expect(view("c=56,-Infinity,5")).toEqual(none);
    expect(view("c=56,10,Infinity")).toEqual(none);
  });
  it("drops zoom 99 and negative zoom", () => {
    expect(view("c=56,10,99")).toEqual(none);
    expect(view("c=56,10,-5")).toEqual(none);
  });
  it("accepts zoom boundaries 0 and 22", () => {
    expect(view("c=56,10,0").zoom).toBe(0);
    expect(view("c=56,10,22").zoom).toBe(22);
    expect(view("c=56,10,22.1")).toEqual(none);
  });
  it("drops longitude beyond 180 and latitude beyond 90", () => {
    expect(view("c=56,181,5")).toEqual(none);
    expect(view("c=91,10,5")).toEqual(none);
    expect(view("c=-91,10,5")).toEqual(none);
  });
  it("drops coordinates outside the map's maxBounds", () => {
    expect(view("c=-33.9,18.4,10")).toEqual(none);
  });
  it("drops empty or non-numeric parts", () => {
    expect(view("c=56,,5")).toEqual(none);
    expect(view("c=56,10,abc")).toEqual(none);
  });
  it("rejects scale 1, 0.0001, 1e12, Infinity and negatives", () => {
    for (const s of ["1", "0.0001", "1e12", "Infinity", "-25000", "0"]) {
      expect(deserializeState(`s=${s}`).scale).toBeUndefined();
    }
  });
  it("accepts presets and custom scale boundaries", () => {
    for (const s of [10000, 25000, 500000, 1000, 1000000]) {
      expect(deserializeState(`s=${s}`).scale).toBe(s);
    }
  });
  it("drops non-finite bearing", () => {
    expect(deserializeState("b=Infinity").bearing).toBeUndefined();
    expect(deserializeState("b=abc").bearing).toBeUndefined();
  });
  it("normalizes huge bearing into [-180, 180]", () => {
    const b = deserializeState("b=1e9").bearing!;
    expect(b).toBeGreaterThanOrEqual(-180);
    expect(b).toBeLessThanOrEqual(180);
  });
  it("normalizes bearing 190, -190, 360 and keeps 180", () => {
    expect(deserializeState("b=190").bearing).toBe(-170);
    expect(deserializeState("b=-190").bearing).toBe(170);
    expect(deserializeState("b=360").bearing).toBe(0);
    expect(deserializeState("b=180").bearing).toBe(180);
    expect(deserializeState("b=-180").bearing).toBe(-180);
  });
});
