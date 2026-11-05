import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

// renderer.ts retries errored tiles through MapLibre's private
// style.tileManagers[..]._reloadTile. Fail loudly if an upgrade removes it.
describe("maplibre-gl private API used for tile retries", () => {
  it("still exposes tileManagers and _reloadTile", () => {
    // maplibre-gl 6 is ESM-only: resolve the package.json and read the bundle.
    const pkg = createRequire(import.meta.url).resolve("maplibre-gl/package.json");
    const src = readFileSync(join(dirname(pkg), "dist", "maplibre-gl.mjs"), "utf8");
    expect(src).toContain("_reloadTile");
    expect(src).toContain("tileManagers");
  });
});
