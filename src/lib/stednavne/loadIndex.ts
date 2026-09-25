import { readFile } from "node:fs/promises";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import { parseIndex, type StednavnIndex } from "./search";

// Relative to the app root (process.cwd() both in `next start` and in the
// standalone Docker image). next.config.ts traces the file into the
// standalone output for the /api/stednavne route.
export const STEDNAVNE_INDEX_PATH = path.join("data", "stednavne.tsv.gz");

let cached: Promise<StednavnIndex> | null = null;

/** Load and parse the index once per server process. */
export function loadStednavneIndex(): Promise<StednavnIndex> {
  if (!cached) {
    cached = readFile(path.join(process.cwd(), STEDNAVNE_INDEX_PATH))
      .then((gz) => parseIndex(gunzipSync(gz).toString("utf8")))
      .catch((err) => {
        cached = null; // allow a retry on the next request
        throw err;
      });
  }
  return cached;
}
