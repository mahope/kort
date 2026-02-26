import { create } from "zustand";
import type {
  PaperFormat,
  Orientation,
  ScalePreset,
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
  scale: ScalePreset;
  frameBounds: PrintFrameBounds | null;
  isGenerating: boolean;
  setPaperFormat: (format: PaperFormat) => void;
  setOrientation: (orientation: Orientation) => void;
  setScale: (scale: ScalePreset) => void;
  setFrameBounds: (bounds: PrintFrameBounds) => void;
  setIsGenerating: (isGenerating: boolean) => void;
}

export const usePrintStore = create<PrintStore>((set) => ({
  paperFormat: DEFAULT_PAPER_FORMAT,
  orientation: DEFAULT_ORIENTATION,
  scale: DEFAULT_SCALE,
  frameBounds: null,
  isGenerating: false,
  setPaperFormat: (paperFormat) => set({ paperFormat }),
  setOrientation: (orientation) => set({ orientation }),
  setScale: (scale) => set({ scale }),
  setFrameBounds: (frameBounds) => set({ frameBounds }),
  setIsGenerating: (isGenerating) => set({ isGenerating }),
}));
