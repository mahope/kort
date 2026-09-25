import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import { normalize, parseIndex, searchStednavne } from "../search";

// Fixture: real rows cut from data/stednavne.tsv.gz (Danske Stednavne via
// DAWA stednavne2, snapshot Sep 2026).
const fixture = parseIndex(
  readFileSync(path.join(__dirname, "fixtures", "stednavne-sample.tsv"), "utf8")
);

const texts = (q: string, limit = 5) =>
  searchStednavne(fixture, q, limit).map((r) => `${r.text} (${r.description})`);

describe("normalize", () => {
  it("folds case, aa→å, accents and punctuation", () => {
    expect(normalize("Aabenraa")).toBe(normalize("åbenrå"));
    expect(normalize("  Skagen-Gren ")).toBe("skagen gren");
    expect(normalize("Café")).toBe("cafe");
  });
});

describe("parseIndex", () => {
  it("resolves lookup tables and coordinates", () => {
    const ry = fixture.entries.find((e) => e.name === "Ry")!;
    expect(ry.hovedtype).toBe("Bebyggelse");
    expect(ry.undertype).toBe("by");
    expect(ry.kommune).toBe("Skanderborg");
    expect(ry.lng).toBeCloseTo(9.77318, 5);
    expect(ry.lat).toBeCloseTo(56.08692, 5);
  });
});

describe("searchStednavne", () => {
  it("returns SearchResults with WGS84 [lng, lat] and unique ids", () => {
    const res = searchStednavne(fixture, "Himmelbjerget");
    expect(res.length).toBeGreaterThan(0);
    for (const r of res) {
      expect(r.type).toBe("place");
      const [lng, lat] = r.coordinates!;
      expect(lng).toBeGreaterThan(8);
      expect(lng).toBeLessThan(15.3);
      expect(lat).toBeGreaterThan(54.5);
      expect(lat).toBeLessThan(57.8);
    }
    expect(new Set(res.map((r) => r.id)).size).toBe(res.length);
  });

  it("ranks the notable Himmelbjerget (Ry) first", () => {
    expect(texts("Himmelbjerget")[0]).toBe("Himmelbjerget (bakke, Skanderborg)");
  });

  it("is case-insensitive and supports prefixes", () => {
    expect(texts("himmelbj")).toContain("Himmelbjerget (bakke, Skanderborg)");
    expect(texts("himmelbj")).toContain("Hotel Himmelbjerget (hotel, Skanderborg)");
  });

  it("ranks the big Rold Skov (Rebild) above the small one", () => {
    expect(texts("Rold Skov").slice(0, 2)).toEqual([
      "Rold Skov (skovPlantage, Rebild)",
      "Rold Skov (skovPlantage, Horsens)",
    ]);
  });

  it("finds Grenen by Skagen for 'Skagen Gren' (locality context)", () => {
    expect(texts("Skagen Gren")[0]).toBe("Grenen (odde, Frederikshavn)");
    expect(texts("Grenen Skagen")[0]).toBe("Grenen (odde, Frederikshavn)");
  });

  it("uses kommune names as context", () => {
    expect(texts("Grenen Varde")[0]).toBe("Grenen (næs, Varde)");
  });

  it("matches aa and å interchangeably", () => {
    expect(texts("Åbenrå")[0]).toBe("Aabenraa (by, Aabenraa)");
  });

  it("rejects too short queries and caps the result count", () => {
    expect(searchStednavne(fixture, "R")).toEqual([]);
    expect(searchStednavne(fixture, "  ")).toEqual([]);
    expect(searchStednavne(fixture, "gr", 3)).toHaveLength(3);
  });

  it("returns nothing for unknown names", () => {
    expect(searchStednavne(fixture, "Xyzzyqwerty")).toEqual([]);
  });
});

// The real bundled index: guards against a broken/truncated build of
// data/stednavne.tsv.gz and checks ranking on the full data set.
describe("bundled index (data/stednavne.tsv.gz)", () => {
  const full = parseIndex(
    gunzipSync(
      readFileSync(path.join(process.cwd(), "data", "stednavne.tsv.gz"))
    ).toString("utf8")
  );
  const top = (q: string) => {
    const r = searchStednavne(full, q)[0];
    return r && `${r.text} (${r.description})`;
  };

  it("contains the whole register", () => {
    expect(full.entries.length).toBeGreaterThan(140_000);
  });

  it.each([
    ["Himmelbjerget", "Himmelbjerget (bakke, Skanderborg)"],
    ["Rold Skov", "Rold Skov (skovPlantage, Rebild)"],
    ["Skagen Gren", "Grenen (odde, Frederikshavn)"],
    ["Skagen", "Skagen (by, Frederikshavn)"],
    ["Lille Bælt", "Lillebælt (sund, Middelfart)"],
  ])("top hit for %s", (q, expected) => {
    expect(top(q)).toBe(expected);
  });
});

describe("parseIndex line endings", () => {
  it("accepts CRLF (e.g. a Windows checkout of the fixture)", () => {
    const tsv = "#hovedtyper\tBebyggelse\r\n#undertyper\tby\r\n#kommuner\tSkanderborg\r\nRy\t0\t0\t0\t9.77318\t56.08692\t12\t1\r\n";
    const [ry] = parseIndex(tsv).entries;
    expect(ry.primary).toBe(true);
    expect(ry.kommune).toBe("Skanderborg");
  });
});
