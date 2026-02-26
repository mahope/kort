import { create } from "zustand";
import type {
  PaperFormat,
  Orientation,
  ScalePreset,
  DpiOption,
  PrintFrameBounds,
} from "@/types/print";
import { DEFAULT_SCALE } from "@/constants/scales";
import {
  DEFAULT_PAPER_FORMAT,
  DEFAULT_ORIENTATION,
} from "@/constants/paperFormats";

interface PrintStore {
  paperFormat: PaperFormat;
  orientation: Orientation;
  scale: number;
  dpi: DpiOption;
  frameBounds: PrintFrameBounds | null;
  isGenerating: boolean;
  multiPage: boolean;
  gridCols: number;
  gridRows: number;
  overlapMm: number;
  generatingPage: number;
  totalPages: number;
  setPaperFormat: (format: PaperFormat) => void;
  setOrientation: (orientation: Orientation) => void;
  setScale: (scale: number) => void;
  setDpi: (dpi: DpiOption) => void;
  setFrameBounds: (bounds: PrintFrameBounds) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  setMultiPage: (multiPage: boolean) => void;
  setGridCols: (cols: number) => void;
  setGridRows: (rows: number) => void;
  setOverlapMm: (mm: number) => void;
  setGeneratingPage: (page: number) => void;
  setTotalPages: (total: number) => void;
}

export const usePrintStore = create<PrintStore>((set) => ({
  paperFormat: DEFAULT_PAPER_FORMAT,
  orientation: DEFAULT_ORIENTATION,
  scale: DEFAULT_SCALE,
  dpi: 300,
  frameBounds: null,
  isGenerating: false,
  multiPage: false,
  gridCols: 2,
  gridRows: 2,
  overlapMm: 10,
  generatingPage: 0,
  totalPages: 0,
  setPaperFormat: (paperFormat) => set({ paperFormat }),
  setOrientation: (orientation) => set({ orientation }),
  setScale: (scale) => set({ scale }),
  setDpi: (dpi) => set({ dpi }),
  setFrameBounds: (frameBounds) => set({ frameBounds }),
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  setMultiPage: (multiPage) => set({ multiPage }),
  setGridCols: (gridCols) => set({ gridCols }),
  setGridRows: (gridRows) => set({ gridRows }),
  setOverlapMm: (overlapMm) => set({ overlapMm }),
  setGeneratingPage: (generatingPage) => set({ generatingPage }),
  setTotalPages: (totalPages) => set({ totalPages }),
}));
