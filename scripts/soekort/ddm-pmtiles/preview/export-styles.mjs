// Writes the style samples as plain MapLibre style JSON (one per variant, screen
// sizes at 96 dpi) to docs/research/2026-11-egen-soekortstil/style/.
//
//   node scripts/soekort/ddm-pmtiles/preview/export-styles.mjs
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { depthLayers, VARIANTS } from "./style.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, "../../../../docs/research/2026-11-egen-soekortstil/style");
// Proposed home of the file, next to kurver-5m.pmtiles (not uploaded yet).
const URL = "pmtiles://https://tiles.mahoje.dk/soekort.pmtiles";

await mkdir(OUT, { recursive: true });
for (const [variant, v] of Object.entries(VARIANTS)) {
  const { sea, lake, labels } = depthLayers("dybder", { variant });
  const style = {
    version: 8,
    name: `Søkort: ${v.label}`,
    metadata: {
      "kort:about":
        "Depth layers only, sizes for the screen (96 dpi). In a base map: the 'sea' layers go right after the sea polygon, " +
        "the 'lake' layers after the lake fills, the labels below the place names (see withDepth in style.mjs). " +
        "For print, regenerate with depthLayers(id, { variant, pxPerMm: dpi / 25.4 }).",
      "kort:groups": { sea: sea.map((l) => l.id), lake: lake.map((l) => l.id), labels: labels.map((l) => l.id) },
    },
    glyphs: "https://cdn.dataforsyningen.dk/assets/vector_tiles_assets/latest/glyphs/{fontstack}/{range}.pbf",
    sources: {
      dybder: {
        type: "vector",
        url: URL,
        attribution:
          "Indeholder data fra Geodatastyrelsen, Danmarks Dybdemodel, 50 m opløsning, hentet [dato]. Model og data er ikke egnet til navigation. " +
          "EMODnet Bathymetry (CC BY 4.0). Sødybder: Danmarks Miljøportal (NOVANA)",
      },
    },
    layers: [{ id: "background", type: "background", paint: { "background-color": "#deedff" } }, ...sea, ...lake, ...labels],
  };
  const file = path.join(OUT, `soekort-${variant}.json`);
  await writeFile(file, JSON.stringify(style, null, 2) + "\n");
  console.log(path.relative(process.cwd(), file));
}
