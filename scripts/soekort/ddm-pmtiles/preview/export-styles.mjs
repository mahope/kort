// Writes the style samples as plain MapLibre style JSON (one per variant, screen
// sizes at 96 dpi) to docs/research/2026-11-egen-soekortstil/style/.
//
//   PMTILES=~/dev/soekort-ddm/work/soekort.pmtiles node scripts/soekort/ddm-pmtiles/preview/export-styles.mjs
//
// The attribution (download date, "not for navigation", DDM50 terms link) is
// read from the built file, so the styles carry exactly what the tiles say.
import { open, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PMTiles } from "pmtiles";
import { depthLayers, VARIANTS } from "./style.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, "../../../../docs/research/2026-11-egen-soekortstil/style");
// Proposed home of the file, next to kurver-5m.pmtiles (not uploaded yet).
const URL = "pmtiles://https://tiles.mahoje.dk/soekort.pmtiles";

const PMTILES_FILE = process.env.PMTILES || path.join(process.env.HOME, "dev/soekort-ddm/work/soekort.pmtiles");

/** pmtiles Source over a local file. */
class LocalFile {
  constructor(file) {
    this.file = file;
  }
  getKey() {
    return this.file;
  }
  async getBytes(offset, length) {
    const fh = await open(this.file);
    try {
      const buf = Buffer.alloc(length);
      const { bytesRead } = await fh.read(buf, 0, length, offset);
      return { data: buf.buffer.slice(buf.byteOffset, buf.byteOffset + bytesRead) };
    } finally {
      await fh.close();
    }
  }
}

const { attribution } = await new PMTiles(new LocalFile(PMTILES_FILE)).getMetadata();
if (!attribution || !/hentet \d{2}\.\d{2}\.\d{4}/.test(attribution) || !attribution.includes("href=\"https://dataforsyningen.dk/asset/PDF/rettigheder_vilkaar/")) {
  throw new Error(`${PMTILES_FILE}: attribution without download date or terms link: ${attribution}`);
}

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
        attribution,
      },
    },
    layers: [{ id: "background", type: "background", paint: { "background-color": "#deedff" } }, ...sea, ...lake, ...labels],
  };
  const file = path.join(OUT, `soekort-${variant}.json`);
  await writeFile(file, JSON.stringify(style, null, 2) + "\n");
  console.log(path.relative(process.cwd(), file));
}
