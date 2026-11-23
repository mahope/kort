import { describe, it, expect, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import {
  DDM_TERMS_PAGE_URL,
  DDM_TERMS_URL,
  OVERLAY_SOURCES,
  REPLACED_BY_SOEKORT,
  SEA_OVERLAYS,
  SOEKORT_CREDITS,
  SOEKORT_OFFLINE_HOSTS,
  overlayInMenu,
  soekortCredits,
  soekortOffline,
} from "../sources";
import { deserializeState, serializeState } from "@/lib/url/urlState";
import { thirdPartyCredits } from "@/lib/pdf/generator";
import { areaTilePlan, layerTileUrl, offlineLayerIds } from "@/lib/offline/tiles";
import { DATA_SOURCES } from "@/constants/dataSources";
import { useMapStore } from "@/stores/mapStore";

describe("søkort layer", () => {
  it("credits Dybdemodellen with the download date, not the WMS, plus the terms and not for navigation", () => {
    const ddm = SOEKORT_CREDITS.ddm;
    expect(ddm).toContain("Indeholder data fra Geodatastyrelsen, Danmarks Dybdemodel, 50 m opløsning, hentet 23.11.2026");
    expect(ddm).not.toContain("WMS-tjeneste");
    expect(ddm).toContain("Model og data er ikke egnet til navigation");
    expect(ddm).toContain(`Vilkår: ${DDM_TERMS_PAGE_URL}`);
    const map = OVERLAY_SOURCES.soekort.attribution;
    expect(map).toContain("hentet 23.11.2026");
    expect(map).toContain(`href='${DDM_TERMS_URL}'`);
    expect(map).toContain("Model og data er ikke egnet til navigation");
    expect(map).toContain("EMODnet Bathymetry");
    // NOVANA: the whole credit sentence, as in the PDF.
    expect(map.replace(/<[^>]+>/g, "")).toContain("Indeholder data, som benyttes i henhold til vilkår for brug af danske offentlige data");
    expect(OVERLAY_SOURCES.soekort.notForNavigation).toBe(true);
    expect(SEA_OVERLAYS).toContain("soekort");
  });

  it("prints only the credits of the sources in the frame", () => {
    expect(soekortCredits(new Set(["ddm"]))).toEqual([SOEKORT_CREDITS.ddm]);
    expect(soekortCredits(new Set(["novana"]))[0]).toMatch(/NOVANA.*vilkår for brug af danske offentlige data/);
    expect(soekortCredits(new Set(["emodnet", "ddm"]))).toEqual([SOEKORT_CREDITS.ddm, SOEKORT_CREDITS.emodnet]);
    expect(soekortCredits(new Set())).toEqual([]);
    // Unknown (nothing reported): all three.
    expect(soekortCredits()).toHaveLength(3);
  });

  it("lists the depth tiles on /kilder with the download date", () => {
    const s = DATA_SOURCES.find((d) => d.layers?.includes("soekort"));
    expect(s?.retrieved).toBe("2026-11-23");
    expect(s?.licenceUrl).toBe(DDM_TERMS_URL);
    expect(s?.credit).toContain("hentet 23.11.2026");
    expect(s?.notForNavigation).toBe(true);
  });
});

describe("søkort in the PDF credit box", () => {
  const initial = useMapStore.getState();
  afterEach(() => useMapStore.setState({ baseLayer: initial.baseLayer, overlays: initial.overlays }));
  const only = (id: string) => initial.overlays.map((o) => ({ ...o, enabled: o.id === id }));

  it("names a lake print's NOVANA source, not Dybdemodellen", () => {
    useMapStore.setState({ overlays: only("soekort") });
    const c = thirdPartyCredits(undefined, new Set(["novana"]));
    expect(c.notForNavigation).toBe(true);
    expect(c.credits).toEqual([SOEKORT_CREDITS.novana]);
  });

  it("still says not for navigation when the frame holds no depth data", () => {
    useMapStore.setState({ overlays: only("soekort") });
    expect(thirdPartyCredits(undefined, new Set())).toEqual({ credits: [], notForNavigation: true });
  });
});

describe("old links to the replaced depth layers", () => {
  it("open the søkort instead, at its own opacity", () => {
    expect(deserializeState("ov=dd-75").overlays).toEqual([{ id: "soekort" }]);
    expect(deserializeState("ov=sd-100,hb-50").overlays).toEqual([{ id: "soekort" }, { id: "havbund", opacity: 0.5 }]);
    // Several old layers give one søkort.
    expect(deserializeState("ov=hb-50,hd-60,dd-75,sm-85").overlays).toEqual([
      { id: "havbund", opacity: 0.5 },
      { id: "soekort" },
      { id: "soemaerker", opacity: 0.85 },
    ]);
  });

  it("keep EMODnet outside Denmark, where the søkort file ends at 59° N", () => {
    expect(deserializeState("c=59.90000,10.70000,10.0&ov=hd-60").overlays).toEqual([
      { id: "soekort" },
      { id: "havdybder", opacity: 0.6 },
    ]);
    expect(deserializeState("c=55.05000,10.60000,12.0&ov=hd-60").overlays).toEqual([{ id: "soekort" }]);
  });

  it("keep a new link's own søkort opacity when an old code is there too", () => {
    expect(deserializeState("ov=dd-75,sk-80").overlays).toEqual([{ id: "soekort", opacity: 0.8 }]);
    expect(deserializeState("ov=sk-80,dd-75").overlays).toEqual([{ id: "soekort", opacity: 0.8 }]);
  });

  it("round-trip the søkort and its shallow-water variant", () => {
    const overlays = [{ id: "soekort" as const, opacity: 0.9 }];
    const qs = serializeState({ overlays, soekortVariant: "lavvande" });
    expect(qs).toContain("sv=lv");
    expect(deserializeState(qs)).toMatchObject({ overlays, soekortVariant: "lavvande" });
    // The default and a variant without the layer stay out of the link.
    expect(serializeState({ overlays, soekortVariant: "klassisk" })).not.toContain("sv=");
    expect(serializeState({ overlays: [], soekortVariant: "lavvande" })).not.toContain("sv=");
    expect(deserializeState("sv=zz").soekortVariant).toBeUndefined();
  });

  it("ignore codes that are only Object's own properties", () => {
    for (const code of ["constructor", "toString", "__proto__", "hasOwnProperty"]) {
      const s = deserializeState(`ov=sk,${code}&sv=${code}&l=${code}&v=${code}`);
      expect(s.overlays, code).toEqual([{ id: "soekort" }]);
      expect(s.soekortVariant, code).toBeUndefined();
      expect(s.baseLayer, code).toBeUndefined();
      expect(s.style, code).toBeUndefined();
    }
  });

  it("round-trip EMODnet chosen without the søkort, outside Denmark", () => {
    const overlays = [{ id: "havdybder" as const, opacity: 0.6 }];
    const qs = serializeState({ lat: 59.9, lng: 10.7, zoom: 10, overlays });
    expect(qs).toContain("ov=he-60");
    expect(deserializeState(qs).overlays).toEqual(overlays);
  });
});

describe("the overlay menu", () => {
  it("hides the replaced layers, but EMODnet only in Denmark", () => {
    for (const id of REPLACED_BY_SOEKORT) expect(overlayInMenu(id, false, "dk"), id).toBe(false);
    expect(overlayInMenu("havdybder", false, "nordic")).toBe(true);
    expect(overlayInMenu("dybdemodel", false, "nordic")).toBe(false);
    expect(overlayInMenu("soekort", false, "dk")).toBe(true);
    expect(overlayInMenu("havbund", false, "dk")).toBe(true);
  });

  it("lists a replaced layer while it is on, so it can be switched off", () => {
    expect(overlayInMenu("dybdemodel", true, "dk")).toBe(true);
  });
});

describe("saving the søkort offline", () => {
  const mols = { north: 56.22, south: 56.21, east: 10.57, west: 10.56 };

  it("is only offered when the service worker saves from the file's host", () => {
    expect(soekortOffline("https://tiles.mahoje.dk/soekort.pmtiles")).toHaveProperty("offlineFile.url", "https://tiles.mahoje.dk/soekort.pmtiles");
    expect(soekortOffline("https://tiles.example.org/soekort.pmtiles")).toEqual({ noOffline: true });
    expect(soekortOffline("http://tiles.mahoje.dk/soekort.pmtiles")).toEqual({ noOffline: true });
    expect(soekortOffline("/soekort.pmtiles")).toEqual({ noOffline: true });
    // The two host lists stay the same.
    const sw = readFileSync("public/sw.js", "utf8").match(/const OFFLINE_FILE_HOSTS = (\[[^\]]*\]);/)?.[1];
    expect(JSON.parse(sw!)).toEqual(SOEKORT_OFFLINE_HOSTS);
  });

  it("saves the one file instead of tiles, counted once with its size", () => {
    const ids = offlineLayerIds("dtk25", [{ id: "soekort", enabled: true }]);
    expect(ids).toEqual(["dtk25", "soekort"]);
    const withFile = areaTilePlan(mols, ids);
    const without = areaTilePlan(mols, ["dtk25"]);
    expect(withFile.urls.filter((u) => u.endsWith(".pmtiles"))).toEqual(["https://tiles.mahoje.dk/soekort.pmtiles"]);
    expect(withFile.urls.length).toBe(without.urls.length + 1);
    expect(withFile.bytes - without.bytes).toBe(64_584_452);
    expect(layerTileUrl("soekort", { z: 14, x: 8672, y: 5084 })).toBeNull();
  });

  it("keeps the replaced WMS layers out of offline saving", () => {
    const ids = offlineLayerIds("dtk25", REPLACED_BY_SOEKORT.map((id) => ({ id, enabled: true })));
    expect(ids).toEqual(["dtk25"]);
  });
});
