# Dataforsyningen closures and the move to Datafordeleren (issue #5)

Research done on 23 November 2026. Nothing in the app was changed. Every live test was a `curl`
against the URLs the app uses today, with the public token from `src/lib/map/styles.ts`. The
token is not repeated here. No Datafordeler key was used, so anything that needs one is listed
under [Open points](#7-open-points).

## Summary

- **None of our layers is closed yet.** All the Dataforsyningen services Kort uses answered
  `200` with real images on 23 November 2026 (table in section 1). The only dead endpoint is
  `stednavne2` (`410 Gone`). The app no longer calls it, but a comment in
  `scripts/build-stednavne-index.mjs` still points to it.
- **No closure dates are published for our services.** The closure list
  ([Oversigt_tjenester_lukkes.pdf][list], last updated 6 Oct 2026) names the services that will
  close. Klimadatastyrelsen said the first two waves would come in September and October
  ([news 18 Jun 2026][kds-jun]). So far the only closures have been Gsearch and the INSPIRE
  services, both on 29 Oct 2026 ([KDS 25 Sep 2026][kds-sep], [Dataforsyningen 5 Oct 2026][df-inspire]).
- **The next date is 26-30 November 2026.** Dataforsyningen moves to a new operating platform.
  The service window runs from **26 Nov 16:00 to 30 Nov 08:00**
  ([KDS 23 Oct 2026][kds-okt]; the move was first set for 2 November). The September notice
  said Dataforsyningen is unavailable during the window, so every Danish layer in Kort (DTK25,
  Skærmkort, ortofoto, historic maps, DHM, sea depths) goes dark for 3.5 days. KDS says users
  can carry on "as today" afterwards, but it does not say whether the services on the closure
  list move to the new platform. Gsearch did not move.
- **The cadastre layer can be switched today with no key.** `forvaltning2_udv` gets no
  replacement on the list. But `wms/forvaltning2` on Dataforsyningen (the listed replacement
  for `forvaltning`) has the same `Matrikelskel` layer, takes the same token, supports EPSG:3857,
  and returns byte-identical tiles (md5 checked on two tiles).
- **Every Datafordeler replacement needs an API key.** Without one you get `401` and a
  `DAF-AUTH-0005` error. Datafordeler calls the key "a private key", but it only opens
  unprotected (public) data. There is no domain or referrer restriction. The only restriction is
  an IP allowlist, which cannot work for browsers.
- **EPSG:3857 is very likely supported.** Our current `_DAF` services are the Datafordeler
  configurations served through Dataforsyningen, and their capabilities list EPSG:3857.
  OpenStreetMap's editor-layer-index lists EPSG:3857 for the Datafordeler `dtk_25` and `dhm`
  WMS, and the orthophoto WMTS has a `DFD_GoogleMapsCompatible` matrix set. This still needs
  confirming with a real key.
- **Licence is unchanged (CC BY 4.0), with one fix.** Datafordeler's terms say cadastre data
  (MAT) must credit **Geodatastyrelsen**, not Klimadatastyrelsen. Kort credits
  Klimadatastyrelsen for `matrikel` today.
- **Recommendation:** switch the cadastre layer now. Warn users about the 26-30 Nov window.
  Test everything on 30 Nov. Then move the five KDS layers to Datafordeleren behind a small
  server-side tile route with cache headers, and self-host the static layers (historic maps,
  place names) under #39.

## 1. What Kort calls today, and what happens to it

Tested on 23 Nov 2026, 256 px tiles in EPSG:3857 over Silkeborg, Mols and Copenhagen. "List #"
is the row in [Oversigt_tjenester_lukkes.pdf][list].

| Used in | Layer / call | Service today | List # | Closes? | Live test 23 Nov |
| --- | --- | --- | --- | --- | --- |
| `sources.ts` `DTK25_TILES_URL` (PDF, PNG) and screen (JPEG) | `dtk25` | WMS `dtk_25_DAF`, layer `DTK25` | 60 | Yes, replacement on Datafordeleren | 200, PNG 50-160 KB, JPEG 17-24 KB |
| `sources.ts` `ORTOFOTO_TILES_URL` | `ortofoto` | WMTS `orto_foraar_webm_DAF`, `DFD_GoogleMapsCompatible` | 82 | Yes, replacement on Datafordeleren | 200, JPEG 25-30 KB |
| `sources.ts` `HISTORISK_HOEJE_TILES_URL` | `historisk_hoeje` | WMS `topo20_hoeje_maalebordsblade_DAF` | 16 | Yes, replacement on Datafordeleren | 200, PNG ~190 KB |
| `sources.ts` `HISTORISK_LAVE_TILES_URL` | `historisk_lave` | WMS `topo20_lave_maalebordsblade_DAF` | 17 | Yes, replacement on Datafordeleren | 200, PNG ~170 KB |
| `sources.ts` `STEDNAVNE_TILES_URL` | `stednavne` | WMS `danske_stednavne_DAF` | 115 | Yes, replacement on Datafordeleren | 200, PNG 5-24 KB |
| `sources.ts` `MATRIKEL_TILES_URL` | `matrikel` | WMS `forvaltning2_udv`, layer `Matrikelskel` | 34 | Yes, **no replacement** | 200 (drawn from 1:8.000, i.e. zoom 17+) |
| `sources.ts` `DHM_WMS_BASE` | `contours`, `contours25`, `hillshade` | WMS `dhm_DAF` (`dhm_kurve_0_5_m`, `dhm_kurve_traditionel`, `dhm_terraen_skyggekort`) | 46 | Yes, replacement on Datafordeleren | 200; 2.5 m contours ~20-37 KB, hillshade ~56 KB |
| `sources.ts` `DDM_DEPTH_URL`, `DDM_RELIEF_URL` | `dybdemodel`, `havbund` | WMS `wms/ddm` | none | Not on the list | 200 (sea tile 100 KB) |
| `styles.ts` `MAP_STYLES` | `skaermkort` | Vector tiles `rest/skaermkort_vector_tiles/v1.0` + styles, glyphs and sprites on `cdn.dataforsyningen.dk` | none (only `skaermkort_vector_tiles_labs` #74 and `vectortiles_25832` #77 close) | Not on the list | 200 |
| `lakeCharts.ts` (indsøkort pages) | `indsoekort` scans | IIIF `rest/arkivkort/iiif/3/…` | none | Not on the list | 200 (`info.json`) |
| `scripts/soekort/build-soekort-data.mjs` | indsøkort index | REST `rest/arkivmeta/v3/kort` | none | Not on the list | 200 |
| `scripts/contours/kurver-dk.sh` (build only) | `kurver5`, `kurver10` source | WCS `dhm_wcs_DAF` | 53 | Yes, replacement on Datafordeleren (`dhm_wcs`) | 200 (capabilities) |
| `scripts/build-stednavne-index.mjs` (comment) | stednavne snapshot | REST `stednavne2` | none | **Already gone** | `410 Gone` |
| `src/lib/api/address.ts` | address search | Adressevælger | n/a | Not on Dataforsyningen; DAWA closed 1 Oct 2026 | (moved in #4) |
| `src/lib/pdf/` | all of the above | No own calls: the PDF renderer uses the same sources via `printTilesFor()` | | | |

The PDF and the offline feature use the same templates as the screen. Every change in
`sources.ts` therefore also changes the PDF (`src/lib/pdf/renderer.ts`) and offline saving
(`src/lib/offline/tiles.ts`, `public/sw.js`).

### Dates, with sources

| Date | What | Source |
| --- | --- | --- |
| 18 Jun 2026 | Dataforsyningen keeps most services, closes low-use ones in waves; "the first 2 waves in September and October"; done "towards the end of 2026" | [KDS: Vi fremtidssikrer Dataforsyningen][kds-jun] |
| 18 Jun, 8 Jul, 6 Oct 2026 | Closure list published, then updated (replacement column; INSPIRE; DAGI) | [Oversigt_tjenester_lukkes.pdf][list] |
| 25 Jun 2026 | Datafordeler: all non-modernised access (web user/service user, `services.datafordeler.dk` WMS/WMTS/WCS) stops **15 Jan 2027**; after that only API key or OAuth | [KDS: Paralleldrift ophører 15. januar 2027][kds-dafo] |
| 29 Oct 2026 16:00 | Gsearch closed; INSPIRE/HVD services stop on Dataforsyningen | [KDS 25 Sep 2026][kds-sep], [Dataforsyningen 5 Oct 2026][df-inspire] |
| 26 Nov 16:00 - 30 Nov 08:00 2026 | Service window: Dataforsyningen moves to a new platform (postponed from 2 Nov) | [KDS 23 Oct 2026][kds-okt], [Dataforsyningen news 5199][df-5199] |
| not announced | Closure of `dtk_25_DAF`, `orto_foraar_webm_DAF`, `topo20_*`, `danske_stednavne_DAF`, `dhm_DAF`, `forvaltning2_udv`, `dhm_wcs_DAF` | (no source; the list has no dates) |

The Dataforsyningen site is a JavaScript app. Its news items were read through the site's own
search index (`dataforsyningen.dk/es/news/_search`). The newest item is from 23 Oct 2026, and
nothing has been published since about the listed services.

## 2. Replacements on Datafordeleren

All URLs, access types and examples come from the service pages in
[Datafordeler's data overview][dafo-oversigt] and the Confluence page
["WMS-, WMTS- og WCS-tjenester"][dafo-wms]. Every page says the access is "API-key~OAuth".

| Our layer | Datafordeler service | Protocol | URL (key as `apikey=`) | EPSG:3857 |
| --- | --- | --- | --- | --- |
| `dtk25` | DTK25 Danmarks Topografiske Kortværk 1:25.000 | WMS 1.1.1/1.3.0, JPEG/PNG | `https://wms.datafordeler.dk/DKtopokort/dtk_25/1.0.0/WMS` | Very likely (see below); example uses `Layers=dtk25` |
| `ortofoto` | Ortofoto forår, Web Mercator | WMTS 1.0.0, JPEG | `https://wmts.datafordeler.dk/GeoDanmarkOrto/orto_foraar_webm/1.0.0/WMTS` | **Yes**: same `DFD_GoogleMapsCompatible` matrix set as today (page example) |
| `historisk_hoeje` | Høje Målebordsblade WMS | WMS | `https://wms.datafordeler.dk/HoejeMaalebordsblade/topo20_hoeje_maalebordsblade/1.0.0/wms` | Very likely; layer `dtk_hoeje_maalebordsblade` (as today) |
| `historisk_lave` | Lave Målebordsblade WMS | WMS | `https://wms.datafordeler.dk/LaveMaalebordsblade/topo20_lave_maalebordsblade/1.0.0/wms` | Very likely; layer `dtk_lave_maalebordsblade` (as today) |
| `stednavne` | Danske Stednavne WMS | WMS | `https://wms.datafordeler.dk/STEDNAVN/Danske_Stednavne/1.0.0/WMS` | Very likely; the group layer name is not confirmed (the page example uses the sublayer `skov`) |
| `contours`, `contours25`, `hillshade` | DHM-WMS | WMS | `https://wms.datafordeler.dk/DHMNedboer/dhm/1.0.0/WMS` | Very likely; editor-layer-index lists EPSG:3857 for this service |
| (alternative for `hillshade`) | Terræn skyggekort WMTS | WMTS, JPEG | `https://wmts.datafordeler.dk/DHMSkyggekort/dhm_terraen_skyggekort/1.0.0/WMTS` | **No**: matrix set `View1`, EPSG:25832 only (today's `_DAF` capabilities). Keep the WMS |
| `matrikel` | Matriklen2 gældende og foreløbig WMS | WMS | `https://wms.datafordeler.dk/MATRIKLEN2/MatGaeldendeOgForeloebigWMS/1.0.0/WMS` | Not confirmed; layer names differ (`Matrikelkommune_Gaeldende` in the example) |
| `matrikel` (better, no key) | Forvaltning2 on **Dataforsyningen** | WMS | `https://api.dataforsyningen.dk/wms/forvaltning2` with our token, layer `Matrikelskel` | **Yes**: tested, identical tiles |
| contour build | DHM-WCS | WCS 1.0.0, GeoTIFF | `https://wcs.datafordeler.dk/DHMNedboer/dhm_wcs/1.0.0/WCS` | n/a (we request EPSG:25832) |

**Why EPSG:3857 is "very likely":** the `_DAF` services we call today are Datafordeler's own
service configurations, served through Dataforsyningen. Their WMS capabilities list EPSG:3857
for every layer (checked for `dtk_25_DAF`, `topo20_*`, `danske_stednavne_DAF` and `dhm_DAF`).
[OpenStreetMap's editor-layer-index][eli-pr] has used the Datafordeler `dtk_25` and `dhm` WMS
since August 2026 with `available_projections` including EPSG:3857. The service pages only
show EPSG:25832 examples, and without a key the capabilities return `401`. So this is not
proven. It is the first thing to test once there is a key.

**Login:** you need a user in [Datafordeler Administration][dafo-admin] (MitID Erhverv or
email/password) and an *IT system* with an API key. A key lasts two years and can be renewed.
It becomes active 15 minutes after it is created, and it is shown only once. One key works
across all Datafordeler WMS services (confirmed by Ballerup Kommune in the
[OSM community thread][osm-thread]). CORS: a `401` answer already carries
`Access-Control-Allow-Origin: *`, so MapLibre can probably fetch tiles cross-origin. This was
not verified on a `200`.

## 3. Key in the browser or a proxy?

**What Datafordeler says** ([authentication methods][dafo-auth], [IP allowlist][dafo-ip]):

- "En API-key er en privat nøgle", but "API-keys … vil kun give adgang til ubeskyttet data
  (offentlig tilgængelige data)" and cannot open restricted data.
- The only way to limit a key is an IP allowlist. For public data it is optional, and when it
  is set, calls must come from the listed IPv4 ranges (/24 to /32). Browsers can never meet
  that, so a browser key cannot be restricted at all.
- The brugervilkår for KDS data and MAT only cover the data licence (CC BY 4.0). We found no
  rule in the terms against sharing the key, and no published rate limit or quota.

**Precedent:** since August 2026 OpenStreetMap's iD editor ships a Datafordeler API key, issued
and maintained by Ballerup Kommune, in the public editor-layer-index ([PR #2999][eli-pr],
[community thread][osm-thread]). KDS has not said whether it approves.

**Our own rule:** `docs/tokens.md` and `CLAUDE.md` say a Datafordeler key must never get a
`NEXT_PUBLIC_` name and that services needing a non-public key go through a server-side proxy.
A browser key therefore means changing that rule on purpose, not just adding a variable.

**Risks of a browser key:** anyone can copy it and put their traffic on Mahope's IT system.
If Datafordeler blocks the key for abuse, Kort goes dark with no warning. The key also expires
every two years, and a new one means a new build (`NEXT_PUBLIC_*` is baked in at build time).
A separate IT system used only for Kort limits the damage. The key in Bitwarden
("infra: Datafordeler API key") should not be reused for this.

**Proxy option (recommended):** a route such as `/api/tiles/[layer]` in the Next app. It adds
the key on the server and only accepts a fixed set of layers, the EPSG:3857 BBOX of one tile
inside Denmark, and the zoom range we use. It returns the image with `Cache-Control` (for
example 30 days for historic maps, 7 days for DTK25 and ortofoto). Datafordeler's raster tiles
carry no cache headers (#26), so the proxy also lets browsers, the service worker and
Cloudflare cache them, which helps #26, #36 and #39. Forks run their own key the same way they
set their own Dataforsyningen token today. A Cloudflare Worker could do the same job, but it
would sit outside this repo and only cover the domains that are proxied through Cloudflare.
`kort.solaris.dk` has not been checked.

### What a proxy costs in traffic

The app does not log tile traffic. Tiles go straight from the browser to Dataforsyningen, and
Traefik only sees Kort's own pages (about 260 requests an hour on 23 Nov, from `obs apps`). The
figures below are estimates built from measured tile sizes:

| | Tiles | Size per tile (measured) | Per event |
| --- | --- | --- | --- |
| Screen session, DTK25 + one overlay | ~150-300 (estimate) | 19 KB JPEG (+12-56 KB overlay) | ~3-8 MB |
| PDF, A4 at 300 dpi, DTK25 | 88-352 (measured in #39) | 121 KB PNG (50-160 KB) | ~10-40 MB |
| Offline area (`OFFLINE_MAX_ZOOM` 16) | up to 2,000 without confirmation, 20,000 max | 18-40 KB | up to ~40 MB, max ~400 MB |

| Scenario per month | Screen sessions | PDFs | Proxy traffic (out; the same comes in from Datafordeleren) | Requests |
| --- | --- | --- | --- | --- |
| Low | 1,000 | 200 | ~5-12 GB | ~0.2 M |
| High | 10,000 | 3,000 | ~60-150 GB | ~2-4 M |

Hetzner cloud servers include 20 TB of traffic a month, so bandwidth costs nothing in either
scenario. What matters is the extra load on the Next server, which streams tiles and holds up
to about 6-12 parallel requests per user. A Cloudflare Worker would fit within the free tier
(100,000 requests a day) in the low scenario, and the paid plan (USD 5 a month, 10 M requests)
in the high one (Cloudflare's public pricing; not checked again for this note). Caching
(`Cache-Control` + Cloudflare) cuts both, because WMS tiles at a fixed BBOX are deterministic.
PDFs of popular areas (training grounds, scout camps) hit the same tiles again and again.

## 4. Licence and credit

- **KDS data on Datafordeleren** (DTK, GeoDanmark Ortofoto, historic maps, DHM, Danske
  Stednavne, Skærmkortet): CC BY 4.0, "Klimadatastyrelsen - vilkår for brug af frie geografiske
  data (16.05.2024)", credit Klimadatastyrelsen ([terms page][dafo-vilkaar-kds]). This is the
  same licence as today, so `KDS_MAP_ATTRIBUTION` and `kdsPrintCredit` stay as they are.
- **Matriklen (MAT):** CC BY 4.0, "Du skal kreditere **Geodatastyrelsen**"
  ([terms page][dafo-vilkaar-mat]). This holds no matter whether we fetch it from Datafordeleren
  or from `wms/forvaltning2`.

Changes needed in `src/constants/dataSources.ts` when the layers move:

- `dtk25`, `ortofoto`, `maalebordsblade`, `dhm`, `stednavne`: `provider` becomes
  "Klimadatastyrelsen via Datafordeleren". `delivery` names the new service (for example
  "WMS (Datafordeleren, DKtopokort/dtk_25)" and "WMTS (Datafordeleren,
  GeoDanmarkOrto/orto_foraar_webm)") and, if we proxy, says "via kort.mahoje.dk's tile proxy".
  `licence` and `credit` stay `KDS_CC_BY`/`KDS_CREDIT`.
- `matrikel`: provider "Geodatastyrelsen via Dataforsyningen" and delivery
  "WMS (wms/forvaltning2, laget Matrikelskel)". The credit names Geodatastyrelsen, so the layer
  gets its own `attribution`/`credit` in `OVERLAY_SOURCES.matrikel` instead of
  "© Klimadatastyrelsen (Matrikelskel)", and the PDF footer must name Geodatastyrelsen when the
  layer is on.
- `kurver`: unchanged (derived from DHM); only the build source in `scripts/contours/` changes.

Changes needed in `NOTICE.md`: split the cadastre out of the KDS row into its own row
(Geodatastyrelsen, CC BY 4.0), and add "via Datafordeleren" for the moved layers.

Other places that change with the URLs (not licence, but easy to miss): the CSP in
`next.config.ts` (`wms.datafordeler.dk`, `wmts.datafordeler.dk`, unless everything goes through
our own proxy); `transformRequest` in `styles.ts`; `offlineCacheKey()` in
`src/lib/offline/tiles.ts` and `offlineKey` in `public/sw.js` (they strip `token`, and would also
have to strip `apikey`); the tile regex in `scripts/check-pdf-failures.mjs`; `docs/tokens.md`;
and `docs/security.md`.

## 5. Self-hosting instead (#39)

Kort already serves its own 5/10 m contours as one PMTiles file from `tiles.mahoje.dk`
(nginx on Dokploy, Cloudflare in front). Storage is estimated from Denmark's land area
(~43,000 km²) plus a 30 % coastal margin. That gives about 480,000 tiles at zoom 16 at 56° N,
and ~640,000 for zoom 0-16. Sizes per tile are the ones measured above.

| Layer | Changes | Self-host? | Estimated size | Why |
| --- | --- | --- | --- | --- |
| Høje + Lave Målebordsblade | Never (historic) | **Yes** | ~15-20 GB each to zoom 16 as JPEG/WebP (PNG today is ~190 KB a tile, ~120 GB) | Static, the biggest tiles we fetch, built once |
| Danske Stednavne | Frozen since Sept 2025 (stated on the Datafordeler page) | **Yes, as vector** | well under 1 GB (estimate) | We already ship the snapshot (`data/stednavne.tsv.gz`); labels in MapLibre look sharper in the PDF than a WMS PNG |
| Hillshade | Rarely (DHM updates) | Maybe | ~3-10 GB to zoom 15-16 (estimate) | Can be built from the same WCS run as the contours |
| DTK25 | Yearly-ish | Maybe later | ~12 GB JPEG to zoom 16; ~25 GB at print quality | Our most-used layer; the PDF needs zoom 16 at 1:25.000/300 dpi. Building it means the DTK raster file download (10 x 10 km GeoTIFF, API key), not scraping the WMS |
| Ortofoto | Every spring | No | ~75 GB to zoom 17, ~300 GB to zoom 18 | Too big, and new photos every year |
| Matrikel | Daily | No | | Stays live (`wms/forvaltning2`) |
| DHM 0.5 m contours | Rarely | No | Source file alone ~65 GB (Datafordeler) | Our own 5/10 m PMTiles already cover print use |

On Cloudflare R2, 50 GB costs about USD 0.75 a month with free egress (public price, not
checked again). On the current nginx host it costs only disk. The Dokploy host was at 52 % disk
use on 23 Nov (`obs servere`), and its total size was not checked.

## 6. Recommendation: step by step

Ordered by risk and date. Each step is a separate PR.

1. **Now (before 26 Nov): cadastre to `wms/forvaltning2`.** This is a one-line URL change in
   `sources.ts`. Fix the credit to Geodatastyrelsen at the same time (`sources.ts`,
   `dataSources.ts`, `NOTICE.md`, the PDF footer). It needs no key and is tested. Also fix the
   dead `stednavne2` comment in `scripts/build-stednavne-index.mjs`.
2. **Now: warn about 26-30 Nov.** Danish maps and PDFs will not work during the service window.
   A short notice on the map is enough (decision D2).
3. **Mads: create the key.** Make a Datafordeler IT system for Kort under Mahope
   (CVR 39413892) and an API key. Put it in Bitwarden under its own name, and keep it out of the
   repo.
4. **30 Nov after 08:00: test.** Rerun the live tests in section 1 against Dataforsyningen.
   With the new key, test the Datafordeler URLs in EPSG:3857: layer names (`dtk25`/`DTK25`,
   stednavne group layer), cache headers, CORS, and that the images match today's.
5. **Move the KDS layers to Datafordeleren**, all at once behind one flag. That covers DTK25
   (screen JPEG and PDF PNG), ortofoto (WMTS), Høje/Lave, Danske Stednavne and DHM
   (0.5/2.5 m contours and hillshade via the WMS). Use the key model from D1, and update
   `dataSources.ts`, `NOTICE.md`, the CSP, the offline cache key and the docs. Live-check both
   brands, as the repo requires. No date forces this yet, but Dataforsyningen can close any
   listed service from the next wave on, so it should be ready before then.
6. **Contour build script:** switch `scripts/contours/kurver-dk.sh` from `dhm_wcs_DAF` to
   `wcs.datafordeler.dk/DHMNedboer/dhm_wcs`, with the key read from an environment variable at
   build time. This only matters for the next rebuild.
7. **#39, after step 5:** self-host the historic maps and place names (and maybe hillshade).
   This removes the largest tiles and two of the five Datafordeler layers from the proxy.

## Decisions for Mads

**D1. How does the browser get Datafordeler tiles?**
- (a) Server-side tile route in Kort, with the key in a server env var and `Cache-Control`
  added. *Recommended:* it keeps the repo's key rule, adds caching, and forks run their own key.
- (b) Cloudflare Worker in front of Datafordeleren. Same effect, but it lives outside the repo
  and only covers domains proxied through Cloudflare.
- (c) A separate, public-by-design API key in the client (`NEXT_PUBLIC_DATAFORDELER_APIKEY`),
  like Ballerup's key in iD. Cheapest, but it means changing `docs/tokens.md`, and a blocked key
  takes the map down.
- (d) Self-host everything (#39 C) and use no Datafordeler at runtime.

**D2. The service window 26 Nov 16:00 - 30 Nov 08:00:**
- (a) Show a short notice in Kort for that period. *Recommended.*
- (b) Do nothing.
- (c) Switch to Datafordeleren before 26 Nov. Not realistic: no key has been tested yet.

**D3. Cadastre (`matrikel`):**
- (a) Switch to `wms/forvaltning2` on Dataforsyningen now, and credit Geodatastyrelsen.
  *Recommended.*
- (b) Datafordeler `MatGaeldendeOgForeloebigWMS` (needs the key, layer names not checked).
- (c) Remove the layer.

**D4. Timing for the KDS layers:**
- (a) Migrate right after the 30 Nov test, before any closure is announced. *Recommended.*
- (b) Wait until KDS publishes a date for the next wave.

**D5. DHM overlays (0.5 m and 2.5 m contours, hillshade):**
- (a) Keep them, via the Datafordeler DHM WMS. *Recommended* (same layers, no rebuild).
- (b) Drop the 0.5/2.5 m WMS contours in favour of our own 5/10 m PMTiles, and keep hillshade.

**D6. Self-hosting (#39) after the migration:**
- (a) Historic maps and place names (static data). *Recommended.*
- (b) Also DTK25 (~12-25 GB, yearly rebuild from the DTK raster download).
- (c) Nothing for now.

## 7. Open points

These need a Datafordeler API key or an answer from KDS:

1. EPSG:3857 on the Datafordeler WMS services (`dtk_25`, `topo20_*`, `Danske_Stednavne`, `dhm`),
   tested with `SRS=EPSG:3857` and 256 px tiles.
2. Exact layer names: `dtk25` vs `DTK25` vs `dtk_25`; the Danske Stednavne group layer; the
   Matriklen2 cadastre layer, if D3 (b) is chosen.
3. Whether Datafordeler tiles send `Cache-Control`/`ETag`, and whether CORS holds on a `200`.
4. Rate limits or fair-use rules for API keys (none published).
5. Whether KDS accepts a key in a public web client (D1 c). Datafordeler support:
   [datafordeler.dk/support][dafo-support].
6. Whether the listed services (`dtk_25_DAF` and the others) come back after the 30 Nov
   platform move, and when the next closure wave is. To be rerun on 30 Nov.
7. Whether `kort.solaris.dk` sits behind Cloudflare, which matters for D1 (b) and for caching.

[list]: https://dataforsyningen.dk/asset/PDF/Mapningstabel/Oversigt_tjenester_lukkes.pdf
[kds-jun]: https://www.klimadatastyrelsen.dk/om-klimadatastyrelsen/nyheder/nyhedsarkiv/2026/jun/vi-fremtidssikrer-dataforsyningen
[kds-dafo]: https://www.klimadatastyrelsen.dk/om-klimadatastyrelsen/nyheder/nyhedsarkiv/2026/jun/paralleldrift-paa-datafordeleren-ophoerer-den-15-januar-2027
[kds-sep]: https://www.klimadatastyrelsen.dk/om-klimadatastyrelsen/nyheder/nyhedsarkiv/2026/sep/dataforsyningen-flytter-til-ny-driftsplatform-2-november-2026
[kds-okt]: https://www.klimadatastyrelsen.dk/om-klimadatastyrelsen/nyheder/nyhedsarkiv/2026/okt/flytning-af-dataforsyningen-udskydes-til-d-30-november
[df-5199]: https://dataforsyningen.dk/news/5199
[df-inspire]: https://dataforsyningen.dk/news/5197
[dafo-oversigt]: https://datafordeler.dk/dataoversigt/
[dafo-wms]: https://confluence.kds.dk/display/DML/WMS-%2C+WMTS-+og+WCS-tjenester
[dafo-auth]: https://confluence.sdfi.dk/x/3wAnCw
[dafo-ip]: https://confluence.sdfi.dk/x/6AAnCw
[dafo-admin]: https://datafordeler.dk/media/lggned4a/20260219-datafordeler-administration.pdf
[dafo-vilkaar-kds]: https://datafordeler.dk/vejledning/brugervilkaar/kds-geografiske-data/
[dafo-vilkaar-mat]: https://datafordeler.dk/vejledning/brugervilkaar/ejendomsoplysninger-ebr-og-mat/
[dafo-support]: https://datafordeler.dk/support/kontakt/
[eli-pr]: https://github.com/osmlab/editor-layer-index/pull/2999
[osm-thread]: https://community.openstreetmap.org/t/aendringer-i-adgang-til-kds-skaermkort-fra-datafordeleren/144834
