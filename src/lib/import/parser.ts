import { gpx, kml } from "@tmcw/togeojson";
import type { ImportedLayer, LayerStyle } from "@/stores/importStore";

const DEFAULT_STYLE: LayerStyle = {
  lineColor: "#2563eb",
  lineWidth: 3,
  lineStyle: "solid",
  fillColor: "#2563eb",
  fillOpacity: 0.2,
};

let layerCounter = 0;

export async function parseFile(file: File): Promise<ImportedLayer> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  const text = await file.text();

  let geojson: GeoJSON.FeatureCollection;

  switch (ext) {
    case "gpx":
      geojson = parseGPX(text);
      break;
    case "kml":
      geojson = parseKML(text);
      break;
    case "geojson":
    case "json":
      geojson = parseGeoJSON(text);
      break;
    default:
      throw new Error(`Filtypen .${ext} understøttes ikke. Brug .gpx, .kml eller .geojson`);
  }

  if (!geojson.features || geojson.features.length === 0) {
    throw new Error("Filen indeholder ingen gyldige features");
  }

  layerCounter++;
  return {
    id: `import-${Date.now()}-${layerCounter}`,
    name: file.name,
    geojson,
    visible: true,
    style: { ...DEFAULT_STYLE },
  };
}

function parseGPX(text: string): GeoJSON.FeatureCollection {
  const doc = new DOMParser().parseFromString(text, "text/xml");
  const errorNode = doc.querySelector("parsererror");
  if (errorNode) {
    throw new Error("Ugyldig GPX-fil: XML-parsingsfejl");
  }
  return gpx(doc) as GeoJSON.FeatureCollection;
}

function parseKML(text: string): GeoJSON.FeatureCollection {
  const doc = new DOMParser().parseFromString(text, "text/xml");
  const errorNode = doc.querySelector("parsererror");
  if (errorNode) {
    throw new Error("Ugyldig KML-fil: XML-parsingsfejl");
  }
  return kml(doc) as GeoJSON.FeatureCollection;
}

function parseGeoJSON(text: string): GeoJSON.FeatureCollection {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Ugyldig GeoJSON: JSON-parsingsfejl");
  }

  const obj = parsed as Record<string, unknown>;

  if (obj.type === "FeatureCollection" && Array.isArray(obj.features)) {
    return obj as unknown as GeoJSON.FeatureCollection;
  }

  if (obj.type === "Feature" && obj.geometry) {
    return {
      type: "FeatureCollection",
      features: [obj as unknown as GeoJSON.Feature],
    };
  }

  throw new Error("Ugyldig GeoJSON: Skal være FeatureCollection eller Feature");
}
