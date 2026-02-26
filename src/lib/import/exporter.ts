/**
 * Export features as GeoJSON string.
 */
export function exportAsGeoJSON(
  features: GeoJSON.Feature[]
): string {
  const fc: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features,
  };
  return JSON.stringify(fc, null, 2);
}

/**
 * Export features as GPX string.
 * Supports waypoints (Points) and tracks (LineStrings/MultiLineStrings).
 */
export function exportAsGPX(features: GeoJSON.Feature[]): string {
  let waypoints = "";
  let tracks = "";

  for (const feature of features) {
    const geom = feature.geometry;
    const name = (feature.properties?.name as string) || "";

    if (geom.type === "Point") {
      const [lon, lat, ele] = geom.coordinates;
      waypoints += `  <wpt lat="${lat}" lon="${lon}">`;
      if (name) waypoints += `<name>${escapeXml(name)}</name>`;
      if (ele !== undefined) waypoints += `<ele>${ele}</ele>`;
      waypoints += `</wpt>\n`;
    } else if (geom.type === "LineString") {
      tracks += trackFromCoords(geom.coordinates, name);
    } else if (geom.type === "MultiLineString") {
      tracks += trackFromCoords(geom.coordinates.flat(), name);
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="kort.mahoje.dk"
  xmlns="http://www.topografix.com/GPX/1/1">
${waypoints}${tracks}</gpx>`;
}

function trackFromCoords(
  coords: number[][],
  name: string
): string {
  let xml = "  <trk>\n";
  if (name) xml += `    <name>${escapeXml(name)}</name>\n`;
  xml += "    <trkseg>\n";
  for (const c of coords) {
    xml += `      <trkpt lat="${c[1]}" lon="${c[0]}"`;
    if (c[2] !== undefined) {
      xml += `><ele>${c[2]}</ele></trkpt>\n`;
    } else {
      xml += " />\n";
    }
  }
  xml += "    </trkseg>\n  </trk>\n";
  return xml;
}

/**
 * Export features as KML string.
 */
export function exportAsKML(features: GeoJSON.Feature[]): string {
  let placemarks = "";

  for (const feature of features) {
    const geom = feature.geometry;
    const name = (feature.properties?.name as string) || "";

    placemarks += "    <Placemark>\n";
    if (name) placemarks += `      <name>${escapeXml(name)}</name>\n`;

    if (geom.type === "Point") {
      placemarks += `      <Point><coordinates>${geom.coordinates[0]},${geom.coordinates[1]}</coordinates></Point>\n`;
    } else if (geom.type === "LineString") {
      placemarks += `      <LineString><coordinates>${coordsToKml(geom.coordinates)}</coordinates></LineString>\n`;
    } else if (geom.type === "Polygon") {
      placemarks += `      <Polygon><outerBoundaryIs><LinearRing><coordinates>${coordsToKml(geom.coordinates[0])}</coordinates></LinearRing></outerBoundaryIs></Polygon>\n`;
    } else if (geom.type === "MultiLineString") {
      placemarks += "      <MultiGeometry>\n";
      for (const line of geom.coordinates) {
        placemarks += `        <LineString><coordinates>${coordsToKml(line)}</coordinates></LineString>\n`;
      }
      placemarks += "      </MultiGeometry>\n";
    }

    placemarks += "    </Placemark>\n";
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Eksport fra kort.mahoje.dk</name>
${placemarks}  </Document>
</kml>`;
}

function coordsToKml(coords: number[][]): string {
  return coords.map((c) => `${c[0]},${c[1]}${c[2] !== undefined ? `,${c[2]}` : ""}`).join(" ");
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Copy text to clipboard.
 */
export async function copyToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

/**
 * Trigger a file download in the browser.
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
