import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

// tileRetry.ts (PDF and screen) retries errored tiles through MapLibre's
// private style.tileManagers[..]._removeTile and map._update. Fail loudly if an
// upgrade removes them.
describe("maplibre-gl private API used for tile retries", () => {
  it("still exposes tileManagers, _removeTile and _update", () => {
    // maplibre-gl 6 is ESM-only: resolve the package.json and read the bundle.
    const pkg = createRequire(import.meta.url).resolve("maplibre-gl/package.json");
    const src = readFileSync(join(dirname(pkg), "dist", "maplibre-gl.mjs"), "utf8");
    expect(src).toContain("_removeTile");
    expect(src).toContain("_update(");
    expect(src).toContain("tileManagers");
    // dropTilesOutside (lagskift på skærmen) lists the held tiles.
    expect(src).toContain("getIds()");
  });
});
