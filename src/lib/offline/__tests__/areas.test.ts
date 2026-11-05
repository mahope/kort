import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { findMissingAreas, OFFLINE_CACHE_NAME } from "../areas";
import { areaTileUrls, offlineCacheKey } from "../tiles";
import type { OfflineArea } from "@/stores/offlineStore";

const bounds = { north: 56.11, south: 56.1, east: 10.21, west: 10.2 };
const area = (id: string, layerIds: string[]): OfflineArea => ({
  id,
  createdAt: 0,
  bounds,
  layerIds,
  tileCount: 1,
  bytes: 1,
});

function cacheWith(keys: Set<string>) {
  return { match: async (k: string) => (keys.has(k) ? ({} as Response) : undefined) };
}

describe("findMissingAreas", () => {
  it("flags an area whose sampled tiles are all gone", async () => {
    expect(await findMissingAreas([area("a", ["dtk25"])], cacheWith(new Set()))).toEqual(["a"]);
  });

  it("keeps an area while any sampled tile is cached", async () => {
    const urls = areaTileUrls(bounds, ["dtk25"]);
    const keys = new Set([offlineCacheKey(urls[0])]);
    expect(await findMissingAreas([area("a", ["dtk25"])], cacheWith(keys))).toEqual([]);
  });

  it("never flags an area without tile urls", async () => {
    expect(await findMissingAreas([area("a", [])], cacheWith(new Set()))).toEqual([]);
  });

  it("finds tiles stored under the token-free key", async () => {
    const [u] = areaTileUrls(bounds, ["dtk25"]);
    const withToken = `${u}${u.includes("?") ? "&" : "?"}token=abc`;
    expect(offlineCacheKey(withToken)).toBe(offlineCacheKey(u));
  });
});

// public/sw.js is a plain script with its own copy of the key function: run
// that very code and compare it with the page-side helper.
describe("service worker offline cache contract", () => {
  const sw = readFileSync("public/sw.js", "utf8");

  it("uses the same cache name as the page", () => {
    expect(sw).toContain(`const OFFLINE_CACHE = "${OFFLINE_CACHE_NAME}";`);
  });

  it("offlineKey in sw.js gives the same key as offlineCacheKey", () => {
    const src = sw.match(/function offlineKey\(url\) \{[\s\S]*?\n\}/)?.[0];
    expect(src).toBeTruthy();
    const offlineKey = new Function(`${src}; return offlineKey;`)() as (u: string) => string;
    const urls = [
      "https://api.dataforsyningen.dk/x?a=1&token=old&b=2",
      "https://api.dataforsyningen.dk/x?token=new",
      "https://api.dataforsyningen.dk/x?a=1",
      ...areaTileUrls(bounds, ["dtk25", "ortofoto", "contours"]).slice(0, 20),
    ];
    for (const u of urls) {
      expect(offlineKey(u)).toBe(offlineCacheKey(u));
      expect(offlineKey(u)).not.toContain("token");
    }
  });
});
