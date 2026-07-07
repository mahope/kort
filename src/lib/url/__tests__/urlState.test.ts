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
