import { describe, expect, it } from "vitest";
import { isInServiceWindow, SERVICE_WINDOW_TEXT } from "../serviceWindow";

// Danish time is CET (UTC+1) in late November.
describe("Dataforsyningen service window notice", () => {
  it.each([
    ["2026-11-26T14:59:59Z", false],
    ["2026-11-26T15:00:00Z", true],
    ["2026-11-28T12:00:00Z", true],
    ["2026-11-30T06:59:59Z", true],
    ["2026-11-30T07:00:00Z", false],
    ["2026-12-15T12:00:00Z", false],
    ["2026-11-23T12:00:00Z", false],
  ])("at %s: %s", (iso, shown) => {
    expect(isInServiceWindow(Date.parse(iso))).toBe(shown);
  });

  it("says it briefly, in plain Danish", () => {
    expect(SERVICE_WINDOW_TEXT.length).toBeLessThan(140);
    expect(SERVICE_WINDOW_TEXT).not.toMatch(/WMS|API|token|server|Datafordeler/i);
  });
});
