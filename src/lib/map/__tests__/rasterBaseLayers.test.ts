import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BASE_LAYERS } from "@/constants/baseLayers";
import {
  DTK25_SCREEN_SOURCE,
  DTK25_SOURCE,
  getRasterBaseLayers,
} from "../sources";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [full] : [];
  });
}

describe("raster base layers", () => {
  it("covers every selectable base map except the vector skaermkort", () => {
    const expected = BASE_LAYERS.map((l) => l.value).filter((v) => v !== "skaermkort");
    expect(Object.keys(getRasterBaseLayers("screen")).sort()).toEqual([...expected].sort());
    expect(Object.keys(getRasterBaseLayers("print")).sort()).toEqual([...expected].sort());
  });

  it("differs between screen and print only for DTK25", () => {
    const screen = getRasterBaseLayers("screen");
    const print = getRasterBaseLayers("print");
    expect(screen.dtk25).toBe(DTK25_SCREEN_SOURCE);
    expect(print.dtk25).toBe(DTK25_SOURCE);
    for (const key of Object.keys(screen).filter((k) => k !== "dtk25")) {
      expect(screen[key]).toBe(print[key]);
    }
  });

  it("is defined in one place only", () => {
    const definitions = sourceFiles(join(process.cwd(), "src")).filter((f) =>
      /(const|let)\s+RASTER_BASE_LAYERS\s*(:[^=]+)?=\s*\{/.test(readFileSync(f, "utf8"))
    );
    expect(definitions).toEqual([]);
  });
});
