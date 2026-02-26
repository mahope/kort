export type PaperFormat = "A5" | "A4" | "A3" | "A2";

export type Orientation = "portrait" | "landscape";

export type ScalePreset = 10000 | 25000 | 50000 | 100000 | 250000 | 500000;

export interface PrintArea {
  paperWidthMm: number;
  paperHeightMm: number;
  groundWidthM: number;
  groundHeightM: number;
}

export interface PrintFrameBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface PdfLayout {
  pageWidthMm: number;
  pageHeightMm: number;
  marginMm: number;
  mapWidthMm: number;
  mapHeightMm: number;
  canvasWidth: number;
  canvasHeight: number;
}
