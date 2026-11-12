import { describe, it, expect } from "vitest";
import { zoomToFitGround } from "../fitZoom";

const mpp = (zoom: number, lat: number) =>
  (40075016.686 * Math.cos((lat * Math.PI) / 180)) / (512 * 2 ** zoom);

describe("zoomToFitGround", () => {
  it("fits the limiting dimension at the requested fill", () => {
    // A4 portrait at 1:25.000 is 4.75 x 6.93 km on the ground.
    const z = zoomToFitGround(4750, 6925, 390, 500, 56.8);
    const m = mpp(z, 56.8);
    expect(6925 / m).toBeCloseTo(500 * 0.85, 0);
    expect(4750 / m).toBeLessThanOrEqual(390 * 0.85);
  });

  it("zooms in for a smaller area and out for a narrower viewport", () => {
    const big = zoomToFitGround(4750, 6925, 390, 500, 56);
    const small = zoomToFitGround(1900, 2770, 390, 500, 56);
    expect(small).toBeCloseTo(big + Math.log2(2.5), 5);
    expect(zoomToFitGround(4750, 6925, 200, 500, 56)).toBeLessThan(big);
  });

  it("clamps to the zoom range and survives an empty viewport", () => {
    expect(zoomToFitGround(10, 10, 1000, 1000, 56)).toBe(17);
    expect(zoomToFitGround(5e6, 5e6, 300, 300, 56)).toBe(5);
    expect(zoomToFitGround(4750, 6925, 0, 500, 56)).toBe(17);
  });
});

describe("rotatedExtent", () => {
  it("grows the frame's bounding box when the map is turned", async () => {
    const { rotatedExtent } = await import("@/lib/map/focusPrintArea");
    expect(rotatedExtent(100, 200, 0)).toEqual({ widthM: 100, heightM: 200 });
    const q = rotatedExtent(100, 200, 90);
    expect(q.widthM).toBeCloseTo(200, 6);
    expect(q.heightM).toBeCloseTo(100, 6);
    const d = rotatedExtent(100, 200, 45);
    expect(d.widthM).toBeCloseTo(300 * Math.SQRT1_2, 6);
  });
});
