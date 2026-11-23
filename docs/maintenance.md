# Maintenance

Recurring jobs for whoever maintains the data snapshots in this repo.

- **Place names (`data/stednavne.tsv.gz`):** rebuild from a Danske Stednavne
  export with `node scripts/build-stednavne-index.mjs <stednavne2.json>`. The
  register has not been updated since September 2025, so the snapshot is as
  current as the live data.
- **Sea and lake snapshots (`public/data/soekort/`):** rebuild with
  `DATAFORSYNINGEN_TOKEN=… node scripts/soekort/build-soekort-data.mjs`, then set
  `SOEKORT_RETRIEVED` in `src/constants/dataSources.ts` to the new date. Check
  the result with `node scripts/capture-soekort.mjs` after `npm run build`.
- **Country outlines (`src/lib/geo/regionPolygons.ts`):** built from Natural
  Earth with `scripts/build-region-polygons.mjs`.
- **Magnetic model:** WMM2025 is valid until 1 January 2030. Replace
  `data/wmm/` and the coefficients in `src/lib/geo/declination.ts` with WMM2030
  when NOAA publishes it (end of 2029); see [grids-and-declination.md](grids-and-declination.md).
- **Public tokens:** rotation is described in [tokens.md](tokens.md).
- **Dependencies:** Dependabot opens grouped PRs weekly; follow
  [dependency-security.md](dependency-security.md) (exact versions, at least three days old).
