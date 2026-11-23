# Coordinate grids and magnetic declination

## Coordinate grids and point coordinates

Enable **Koordinatgitter**, then choose **UTM**, **MGRS · WGS84** or one of
**DKTM1-4 · ETRS89**. MGRS uses standard UTM zones (32 west of 12°E, 33 east
of it, including Copenhagen and Bornholm). Grid lines are clipped at zone
boundaries on screen and in single/multi-page PDFs. The existing Danish UTM
zone-32 convention is still available explicitly. Grid spacing, density
guards and heavier 10 km lines work in all systems. Edge labels include the
MGRS 100 km square letters and the kilometre digits within that square.
At 100 km boundaries, square letters use the line's exact UTM ordinate so
polyline interpolation cannot select the preceding square on screen or in PDFs.
On single- and multi-sheet PDFs, grid lines clipped at a frame edge are
labelled on that edge. Where crossings are close together, labels can shift
along the edge to stay readable and clear of one another and the frame
corners. A thin line in the margin connects each label to its grid crossing.
On multi-sheet PDFs the heading sits above the top labels.

**DKTM1-4** ("Dansk Transversal Mercator", EPSG:4093-4096) are four ETRS89
transverse Mercator zones used in Danish surveying. Unlike UTM's 6° zones,
each DKTM zone is defined to cover the whole country, so its grid is never
split at a zone boundary. Pick the zone that matches the area: DKTM1 for
Jutland west of ~9°45'E, DKTM2 for Jutland east of that plus Funen, DKTM3 for
Zealand and Lolland-Falster, DKTM4 for Bornholm — any zone is mathematically
valid anywhere in Denmark, but accuracy is best close to its own area.
Labels use the same metre-based short/full formatting as UTM.

The system choice is stored in localStorage and shared in the
`cs=utm|mgrs|dktm1|dktm2|dktm3|dktm4` URL parameter. Old `g=1` links still
select UTM. Open **Koordinat ved sigtekorset** and pan the map to read/copy
the same centre point as MGRS (1 m and 10 m), standard-zone UTM and decimal
latitude/longitude; a DKTM row is added there too when a DKTM zone is the
active grid system. This also works on mobile. The displayed precision
describes the coordinate format, not GPS/map accuracy.

MGRS conversion uses pinned `mgrs@2.2.0` from proj4js. Reference tests compare
Rådhuspladsen and Rønne against GeographicLib GeoConvert (WGS84, standard zone).
DKTM1-4 parameters are verified against the EPSG registry (epsg.io/4093-4096);
reference tests compare against PROJ (pyproj) at several Danish towns per zone.

## Magnetic declination

Declination (the angle between true north and magnetic north) is computed in the browser with the **World Magnetic Model WMM2025**.

- **Source:** NOAA/NCEI and British Geological Survey, [WMM2025COF.zip](https://www.ncei.noaa.gov/sites/default/files/2025-01/WMM2025COF.zip). An unchanged copy of `WMM.COF` is in `data/wmm/WMM2025.COF`, and the coefficients in `src/lib/geo/declination.ts` are taken from it.
- **Licence:** WMM is published by the US government (NOAA) and is in the public domain. No npm package and no external service is used.
- **Validity:** 1 Jan 2025 to 1 Jan 2030. From 2 Jul 2029 12:00 UTC (the last six months) the app warns that the model is about to expire. From 1 Jan 2030 declination is shown neither on the map nor in the PDF until `declination.ts` and `data/wmm/` are updated to WMM2030 (published at the end of 2029).
- **Checks:** `src/lib/geo/__tests__/declination.test.ts` compares against NOAA's official test values (`WMM2025_TEST_VALUES.txt`, error below 0.02°), checks that the coefficients are identical to `WMM.COF`, and tests the date limits.
- **Display:** "Koordinat ved sigtekorset" shows the declination for the centre of the map. The PDF diagram (bottom right of the map, can be turned off with **Misvisning i printet** under **Koordinatgitter**) draws true north, magnetic north and, when the grid is on, grid north (meridian convergence). Grid north is computed for the chosen grid (UTM, MGRS or DKTM1-4) at the centre of each sheet.
- **Performance:** the calculation is loaded on demand (dynamic import) and is not in the initial bundle.
