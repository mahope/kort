"use client";

import { usePrintStore } from "@/stores/printStore";
import { PAPER_FORMATS } from "@/constants/paperFormats";

const MAX_W = 190;
const MAX_H = 120;

/**
 * Proportional preview of the printed sheet(s): a rectangle in the paper's
 * aspect ratio, subdivided into the multi-page grid when enabled — so the user
 * can see the layout (and page count) before generating the PDF.
 */
export function PrintPreview() {
  const paperFormat = usePrintStore((s) => s.paperFormat);
  const orientation = usePrintStore((s) => s.orientation);
  const multiPage = usePrintStore((s) => s.multiPage);
  const gridCols = usePrintStore((s) => s.gridCols);
  const gridRows = usePrintStore((s) => s.gridRows);

  const dims = PAPER_FORMATS[paperFormat];
  let sheetW = dims.widthMm;
  let sheetH = dims.heightMm;
  if (orientation === "landscape") [sheetW, sheetH] = [sheetH, sheetW];

  const cols = multiPage ? gridCols : 1;
  const rows = multiPage ? gridRows : 1;
  const totalW = sheetW * cols;
  const totalH = sheetH * rows;

  const scale = Math.min(MAX_W / totalW, MAX_H / totalH);
  const pxW = Math.round(totalW * scale);
  const pxH = Math.round(totalH * scale);
  const pageCount = cols * rows;

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="grid gap-px rounded-sm bg-border p-px shadow-sm"
        style={{
          width: pxW,
          height: pxH,
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
        }}
        aria-hidden="true"
      >
        {Array.from({ length: pageCount }).map((_, i) => (
          <div key={i} className="bg-surface" />
        ))}
      </div>
      <p className="text-[10px] text-text-muted">
        {paperFormat} {orientation === "portrait" ? "stående" : "liggende"}
        {multiPage ? ` · ${cols}×${rows} = ${pageCount} sider` : ""}
      </p>
    </div>
  );
}
