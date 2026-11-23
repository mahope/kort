// The sample views. `scale` is the print scale (A4 page at 300 dpi); the screen
// shot uses the same scale at 96 dpi unless `screenScale` says otherwise.
// `prod` is the query for kort.mahoje.dk (prod comparison, capture-prod.mjs).
export const SITES = [
  { name: "svendborgsund", title: "Svendborgsund", lat: 55.0505, lng: 10.6150, scale: 25000, variants: ["klassisk", "lavvande", "linjer"] },
  { name: "sydfynske-oehav", title: "Det Sydfynske Øhav", lat: 54.9300, lng: 10.5600, scale: 50000, variants: ["klassisk", "lavvande", "linjer"] },
  { name: "limfjorden-loegstoer", title: "Limfjorden ved Løgstør", lat: 56.9800, lng: 9.2200, scale: 50000 },
  { name: "kattegat-anholt", title: "Kattegat ved Anholt", lat: 56.7000, lng: 11.6500, scale: 100000 },
  { name: "furesoe", title: "Furesø", lat: 55.7980, lng: 12.4050, scale: 10000 },
  // Furesø has no NOVANA survey; Mossø i Rold Skov shows the lake style.
  { name: "mossoe-rold-skov", title: "Mossø i Rold Skov", lat: 56.8076, lng: 9.8862, scale: 10000 },
  // Overview: the EMODnet bands outside Danish waters, screen only.
  { name: "oversigt", title: "Oversigt", lat: 56.6, lng: 11.4, scale: 1500000, a4: false },
];
