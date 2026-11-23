import { describe, it, expect } from "vitest";
import { padBounds } from "../bounds";

describe("padBounds", () => {
  const bounds = { north: 56.2, south: 56.0, east: 10.4, west: 10.0 };

  it("grows every side by the ratio of the frame size", () => {
    const p = padBounds(bounds, 0.5);
    expect(p.west).toBeCloseTo(9.8, 10);
    expect(p.east).toBeCloseTo(10.6, 10);
    expect(p.south).toBeCloseTo(55.9, 10);
    expect(p.north).toBeCloseTo(56.3, 10);
  });

  it("returns the bounds unchanged for ratio 0 and does not mutate the input", () => {
    expect(padBounds(bounds, 0)).toEqual(bounds);
    padBounds(bounds, 0.25);
    expect(bounds).toEqual({ north: 56.2, south: 56.0, east: 10.4, west: 10.0 });
  });
});
