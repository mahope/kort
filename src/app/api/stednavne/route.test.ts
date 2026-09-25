import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { parseIndex } from "@/lib/stednavne/search";
import { GET } from "./route";

// Serve the recorded fixture instead of the full bundled index.
vi.mock("@/lib/stednavne/loadIndex", () => ({
  loadStednavneIndex: async () =>
    parseIndex(
      readFileSync(
        path.join(
          process.cwd(),
          "src/lib/stednavne/__tests__/fixtures/stednavne-sample.tsv"
        ),
        "utf8"
      )
    ),
}));

const call = (q: string | null, ip = "203.0.113.1") => {
  const url = new URL("http://localhost/api/stednavne");
  if (q !== null) url.searchParams.set("q", q);
  return GET(
    new NextRequest(url, { headers: { "x-forwarded-for": `${ip}, 10.0.0.1` } })
  );
};

describe("GET /api/stednavne", () => {
  it("returns SearchResults with cache headers", async () => {
    const res = await call("Rold Skov");
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("max-age=86400");
    const body = await res.json();
    expect(body[0]).toMatchObject({
      text: "Rold Skov",
      description: "skovPlantage, Rebild",
      type: "place",
      coordinates: [9.82769, 56.80449],
    });
  });

  it.each([[null], ["a"], [" b "], ["x".repeat(61)]])(
    "rejects invalid q=%s with 400",
    async (q) => {
      const res = await call(q);
      expect(res.status).toBe(400);
      expect(res.headers.get("cache-control")).toBe("no-store");
    }
  );

  it("rate-limits a single client with 429", async () => {
    const ip = "198.51.100.7";
    let last = await call("Skagen", ip);
    for (let i = 0; i < 60 && last.status === 200; i++) {
      last = await call("Skagen", ip);
    }
    expect(last.status).toBe(429);
    expect(Number(last.headers.get("retry-after"))).toBeGreaterThan(0);
    expect((await call("Skagen", "198.51.100.8")).status).toBe(200);
  });
});
