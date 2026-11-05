import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

// renderer.ts retries errored tiles through MapLibre's private
// style.tileManagers[..]._reloadTile. Fail loudly if an upgrade removes it.
describe("maplibre-gl private API used for tile retries", () => {
  it("still exposes tileManagers and _reloadTile", () => {
    const file = createRequire(import.meta.url).resolve("maplibre-gl");
    const src = readFileSync(file, "utf8");
    expect(src).toContain("_reloadTile");
    expect(src).toContain("tileManagers");
  });
});
