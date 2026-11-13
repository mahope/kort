import { describe, it, expect } from "vitest";
import {
  frameAreaShare,
  isFrameTooSmallToSee,
  maskOpacityForAreaShare,
  SMALL_FRAME_AREA_SHARE,
} from "../printFrameVisibility";

describe("frameAreaShare", () => {
  it("is 1 when the frame exactly fills the viewport", () => {
    // 1000 x 1000 px at 1 m/px fills a 1000 x 1000 m frame.
    expect(frameAreaShare(1000, 1000, 1000, 1000, 1)).toBeCloseTo(1, 10);
  });

  it("scales with ground area, inversely with metres-per-pixel squared", () => {
    expect(frameAreaShare(500, 500, 1000, 1000, 1)).toBeCloseTo(0.25, 10);
    // Doubling metres-per-pixel halves the frame's pixel size on each axis,
    // so its on-screen area (and thus the share) drops to a quarter.
    expect(frameAreaShare(1000, 1000, 1000, 1000, 2)).toBeCloseTo(0.25, 10);
  });

  it("is 0 for a degenerate viewport or scale", () => {
    expect(frameAreaShare(1000, 1000, 0, 1000, 1)).toBe(0);
    expect(frameAreaShare(1000, 1000, 1000, 0, 1)).toBe(0);
    expect(frameAreaShare(1000, 1000, 1000, 1000, 0)).toBe(0);
  });
});

describe("isFrameTooSmallToSee", () => {
  it("flags shares below the default 10% threshold", () => {
    expect(isFrameTooSmallToSee(0.05)).toBe(true);
    expect(isFrameTooSmallToSee(0.3)).toBe(false);
    expect(isFrameTooSmallToSee(SMALL_FRAME_AREA_SHARE)).toBe(false);
  });

  it("honours a custom threshold", () => {
    expect(isFrameTooSmallToSee(0.15, 0.2)).toBe(true);
    expect(isFrameTooSmallToSee(0.25, 0.2)).toBe(false);
  });
});

describe("maskOpacityForAreaShare", () => {
  it("stays at full opacity once the frame is comfortably visible", () => {
    expect(maskOpacityForAreaShare(1)).toBe(0.3);
    expect(maskOpacityForAreaShare(SMALL_FRAME_AREA_SHARE)).toBe(0.3);
  });

  it("fades smoothly to 0 as the frame shrinks below the threshold", () => {
    expect(maskOpacityForAreaShare(SMALL_FRAME_AREA_SHARE / 2)).toBeCloseTo(0.15, 10);
    expect(maskOpacityForAreaShare(0)).toBe(0);
  });

  it("supports a custom full opacity and threshold", () => {
    expect(maskOpacityForAreaShare(0.1, { full: 0.5, threshold: 0.2 })).toBeCloseTo(0.25, 10);
  });
});
