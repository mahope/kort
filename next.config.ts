import type { NextConfig } from "next";

// Origins the app actually talks to (code + observed traffic, 5/11-2026).
// Keep in sync with src/lib/map and src/lib/api; see docs/security.md.
const DATAFORSYNINGEN_API = "https://api.dataforsyningen.dk";
const DATAFORSYNINGEN_CDN = "https://cdn.dataforsyningen.dk";
const ADRESSEVAELGER = "https://adressevaelger.dk";
const OSM_TILES = "https://tile.openstreetmap.org";
const ANALYTICS = "https://analytics.holstjensen.eu";
// Optional sea layers (see src/lib/map/sources.ts).
const EMODNET = "https://ows.emodnet-bathymetry.eu";
const OPENSEAMAP = "https://tiles.openseamap.org";
// Our own 5/10 m contours (PMTiles, read with range requests; src/lib/map/contours.ts).
const KORT_TILES = "https://tiles.mahoje.dk";

// The app has two inline <script>s (theme + JSON-LD), so script-src keeps
// 'unsafe-inline'. MapLibre runs its workers from blob: URLs. Network-facing
// directives are limited to the origins above instead of any https: host.
export const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${DATAFORSYNINGEN_API} ${DATAFORSYNINGEN_CDN} ${OSM_TILES} ${EMODNET} ${OPENSEAMAP}`,
  "font-src 'self' data:",
  `connect-src 'self' ${DATAFORSYNINGEN_API} ${DATAFORSYNINGEN_CDN} ${ADRESSEVAELGER} ${OSM_TILES} ${EMODNET} ${OPENSEAMAP} ${KORT_TILES} ${ANALYTICS}`,
  "worker-src 'self' blob:",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

export const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Geolocation is used by the "find me" button; everything else is off.
  {
    key: "Permissions-Policy",
    value: "geolocation=(self), camera=(), microphone=(), payment=()",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // The place-name index is read with fs at runtime; make sure it is copied
  // into the standalone output (and thus the Docker image).
  outputFileTracingIncludes: {
    "/api/stednavne": ["./data/stednavne.tsv.gz"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "mahoje.dk",
      },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
