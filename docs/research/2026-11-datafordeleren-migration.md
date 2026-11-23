# Dataforsyningen closures and the move to Datafordeleren (issue #5)

Research done on 23 November 2026. Nothing in the app was changed. Every live test was a `curl`
against the URLs the app uses today, with the public token from `src/lib/map/styles.ts`. The
token is not repeated here. No Datafordeler key was used, so anything that needs one is listed
under [Open points](#7-open-points).

## Summary

- **None of our layers is closed yet, but most of them go dark on 26 Nov 2026.** All the
  Dataforsyningen services Kort uses answered `200` with real images on 23 November 2026 (table
  in section 1). The only dead endpoint is `stednavne2` (`410 Gone`). The app no longer calls it,
  but a comment in `scripts/build-stednavne-index.mjs` still points to it.
- **The deciding source is KDS's notice of 3 Nov 2026 and its opening list.** Dataforsyningen
  moves to a new platform in a service window from **26 Nov 16:00 to 30 Nov 08:00**, when nothing
  is available. From 30 Nov 08:00 only "de mest kritiske tjenester" open; the rest open "i løbet
  af første kvartal 2027" ([KDS 3 Nov 2026][kds-nov], [opening list, 3 Nov 2026][open-list]).
  Gsearch closes on 26 Nov. For Kort that means:
  - **Opens 30 Nov:** `Forvaltning2` WMS (our cadastre alternative), `Ddm` WMS (sea depths),
    `Arkivmeta` API (lake-chart index) and `Kort25` WMS ("Danmarkskortet", see below).
  - **Opens in Q1 2027:** `Skaermkort_vector_tiles`, the Skærmkort base map (four styles).
    From 26 Nov until some day in Q1 2027, Skærmkort does not work. *Correction (23 Nov,
    section 8):* Kort's default base layer is DTK25 (`baseLayer: "dtk25"` in
    `src/stores/mapStore.ts`), not Skærmkort; `klassisk` is only the default *style* when a
    user picks Skærmkort.
  - **On neither list:** `dtk_25_DAF`, `orto_foraar_webm_DAF`, `topo20_*_DAF`,
    `danske_stednavne_DAF`, `dhm_DAF`, `forvaltning2_udv` and `dhm_wcs_DAF` (all on the closure
    list), and the `arkivkort` IIIF scans (on no list). The `dhm` WMS on the opening list is
    the climate product (`wms/dhm`, bluespot and flow layers), not our terrain contours and
    hillshade: asking it for `dhm_kurve_0_5_m`, `dhm_kurve_traditionel` or
    `dhm_terraen_skyggekort` returns an OGC service exception (tested 23 Nov). So DTK25,
    ortofoto, historic maps, place names and DHM should be treated as **gone from 26 Nov
    16:00**. That is an inference from the two lists, not an announced closure date.
- **The cadastre layer can be switched today with no new credential.** `forvaltning2_udv` gets no
  replacement on the closure list. But `wms/forvaltning2` on Dataforsyningen has the same
  `Matrikelskel` layer, takes the same token, supports EPSG:3857, returns byte-identical tiles
  (md5 checked on two tiles), and is on the 30 Nov opening list.
- **A stopgap base map with no new credential:** `wms/kort25` ("Kort25 er et multiskala
  baggrundskort, der i skala 1:25.000 afspejler DTK25") answers today with our token, lists
  EPSG:3857 and opens on 30 Nov. Its default rendering is much plainer than DTK25 (no names and
  no contours at zoom 14 and 16 in our test tiles over Silkeborg), so it is an emergency base map,
  not a DTK25 replacement for the PDF.
- **Login and key lifetime change on 30 Nov.** Every Dataforsyningen service will require a user
  login. Existing API keys move across with a 2-year lifetime that cannot be extended. New keys
  on a personal account live 14 days; keys under an organisation live up to 2 years
  ([KDS 3 Nov 2026][kds-nov]). Kort's public token must be rechecked on 30 Nov, and its
  replacement must be an organisation key.
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
- **Recommendation:** this cannot wait for 30 Nov. Create the Datafordeler key now and test it
  before 26 Nov 16:00. Switch the cadastre layer now. Put a fallback base map in place for the
  window and for the months without Skærmkort. Then move the KDS layers to Datafordeleren behind
  a small server-side tile route with cache headers, and self-host the static layers (historic
  maps, place names) under #39.

## 1. What Kort calls today, and what happens to it

Tested on 23 Nov 2026, 256 px tiles in EPSG:3857 over Silkeborg, Mols and Copenhagen. "List #"
is the row in [Oversigt_tjenester_lukkes.pdf][list]. "After 26 Nov" comes from the
[opening list of 3 Nov 2026][open-list].

| Used in | Layer / call | Service today | Closure list # | After 26 Nov (opening list, 3 Nov) | Live test 23 Nov |
| --- | --- | --- | --- | --- | --- |
| `sources.ts` `DTK25_TILES_URL` (PDF, PNG) and screen (JPEG) | `dtk25` | WMS `dtk_25_DAF`, layer `DTK25` | 60 | Not on the list: **gone from 26 Nov**; replacement on Datafordeleren | 200, PNG 50-160 KB, JPEG 17-24 KB |
| `sources.ts` `ORTOFOTO_TILES_URL` | `ortofoto` | WMTS `orto_foraar_webm_DAF`, `DFD_GoogleMapsCompatible` | 82 | Not on the list: **gone from 26 Nov**; replacement on Datafordeleren | 200, JPEG 25-30 KB |
| `sources.ts` `HISTORISK_HOEJE_TILES_URL` | `historisk_hoeje` | WMS `topo20_hoeje_maalebordsblade_DAF` | 16 | Not on the list: **gone from 26 Nov**; replacement on Datafordeleren | 200, PNG ~190 KB |
| `sources.ts` `HISTORISK_LAVE_TILES_URL` | `historisk_lave` | WMS `topo20_lave_maalebordsblade_DAF` | 17 | Not on the list: **gone from 26 Nov**; replacement on Datafordeleren | 200, PNG ~170 KB |
| `sources.ts` `STEDNAVNE_TILES_URL` | `stednavne` | WMS `danske_stednavne_DAF` | 115 | Not on the list: **gone from 26 Nov**; replacement on Datafordeleren | 200, PNG 5-24 KB |
| `sources.ts` `MATRIKEL_TILES_URL` | `matrikel` | WMS `forvaltning2_udv`, layer `Matrikelskel` | 34 | Not on the list, **no replacement**; `Forvaltning2` WMS opens 30 Nov | 200 (drawn from 1:8.000, i.e. zoom 17+) |
| `sources.ts` `DHM_WMS_BASE` | `contours`, `contours25`, `hillshade` | WMS `dhm_DAF` (`dhm_kurve_0_5_m`, `dhm_kurve_traditionel`, `dhm_terraen_skyggekort`) | 46 | Not on the list: **gone from 26 Nov** (the listed `dhm` WMS lacks these layers); replacement on Datafordeleren | 200; 2.5 m contours ~15-39 KB, hillshade ~52-56 KB |
| `sources.ts` `DDM_DEPTH_URL`, `DDM_RELIEF_URL` | `dybdemodel`, `havbund` | WMS `wms/ddm` | none | Opens 30 Nov | 200 (sea tile 100 KB) |
| `styles.ts` `MAP_STYLES` (default style `klassisk`) | `skaermkort` | Vector tiles `rest/skaermkort_vector_tiles/v1.0` + styles, glyphs and sprites on `cdn.dataforsyningen.dk` | none (only `skaermkort_vector_tiles_labs` #74 and `vectortiles_25832` #77 close) | **Opens in Q1 2027**: down from 26 Nov until then. `cdn.dataforsyningen.dk` is not mentioned | 200 |
| `lakeCharts.ts` `parseLakeCharts` (popup + PDF) | indsøkort manifest | IIIF `rest/arkivkort/iiif/3/<id>/info.json` | none | On neither list | 200 |
| `lakeCharts.ts` `lakeChartImageUrl` → `src/lib/pdf/lakeChartPages.ts` `fetchScan`, and the popup's download link | indsøkort scan image | IIIF Image API `rest/arkivkort/iiif/3/<id>/full/<w>,/0/default.jpg` (PDF asks for up to 2,400 px, the popup for 2,000 px) | none | On neither list: **unknown after 26 Nov**. If it fails, `fetchScan` returns `null` and the PDF silently has no lake-chart pages | 200 `image/jpeg`, 350-730 KB at 2,000-2,480 px wide (two charts), `Access-Control-Allow-Origin: https://kort.mahoje.dk`, `Cache-Control: max-age=2592000` |
| `scripts/soekort/build-soekort-data.mjs` | indsøkort index | REST `rest/arkivmeta/v3/kort` | none | `Arkivmeta` API opens 30 Nov | 200 |
| `scripts/contours/kurver-dk.sh` (build only) | `kurver5`, `kurver10` source | WCS `dhm_wcs_DAF` | 53 | Not on the list: gone from 26 Nov; replacement on Datafordeleren (`dhm_wcs`) | 200 (capabilities) |
| `scripts/build-stednavne-index.mjs` (comment) | stednavne snapshot | REST `stednavne2` | none | **Already gone** | `410 Gone` |
| `src/lib/api/address.ts` | address search | Adressevælger | n/a | Not on Dataforsyningen; DAWA closed 1 Oct 2026 | (moved in #4) |
| (fallback) | `kort25` (not used today) | WMS `wms/kort25`, layer `Kort25` | none | Opens 30 Nov | 200, PNG 11-16 KB; EPSG:3857 listed; much plainer than DTK25 |
| `src/lib/pdf/` | all of the above | No own tile calls: the PDF renderer uses the same sources via `printTilesFor()`. Its only direct call is the IIIF scan above | | | |

The PDF and the offline feature use the same templates as the screen. Every change in
`sources.ts` therefore also changes the PDF (`src/lib/pdf/renderer.ts`) and offline saving
(`src/lib/offline/tiles.ts`, `public/sw.js`).

### Dates, with sources

| Date | What | Source |
| --- | --- | --- |
| 18 Jun 2026 | Dataforsyningen keeps most services, closes low-use ones in waves; "the first 2 waves in September and October"; done "towards the end of 2026" | [KDS: Vi fremtidssikrer Dataforsyningen][kds-jun] |
| 18 Jun, 8 Jul, 6 Oct 2026 | Closure list published, then updated (replacement column; INSPIRE; DAGI) | [Oversigt_tjenester_lukkes.pdf][list] |
| 25 Jun 2026 | Datafordeler: all non-modernised access (web user/service user, `services.datafordeler.dk` WMS/WMTS/WCS) stops **15 Jan 2027**; after that only API key or OAuth | [KDS: Paralleldrift ophører 15. januar 2027][kds-dafo] |
| 29 Oct 2026 16:00 | INSPIRE/HVD services stop on Dataforsyningen (Gsearch was announced for the same day, later moved to 26 Nov) | [KDS 25 Sep 2026][kds-sep], [Dataforsyningen 5 Oct 2026][df-inspire] |
| 23 Oct 2026 | Platform move postponed from 2 Nov to a window of 26-30 Nov | [KDS 23 Oct 2026][kds-okt], [Dataforsyningen news 5199][df-5199] |
| 3 Nov 2026 | Opening list: 45 services open on 30 Nov, 29 in Q1 2027. Login on every service; new key lifetimes; Gsearch closes 26 Nov | [KDS 3 Nov 2026][kds-nov], [opening list][open-list] |
| **26 Nov 2026 16:00** | Service window starts. Nothing on Dataforsyningen answers. Services on the closure list and not on the opening list (all our `_DAF` layers, `forvaltning2_udv`, `dhm_wcs_DAF`) are not expected back | [KDS 3 Nov 2026][kds-nov] (inferred from both lists) |
| **30 Nov 2026 08:00** | `Forvaltning2`, `Ddm`, `Arkivmeta`, `Kort25` back on the new platform | [opening list][open-list] |
| Q1 2027 | `Skaermkort_vector_tiles` back (the Skærmkort base map) | [opening list][open-list] |
| 15 Jan 2027 | Old Datafordeler access stops (see above) | [KDS 25 Jun 2026][kds-dafo] |

Since early November the Dataforsyningen site cannot be updated ("Af sikkerhedsmæssige årsager
er det midlertidigt ikke muligt at opdatere dataforsyningen.dk"); news about the move is
published on klimadatastyrelsen.dk instead. The newest item in the Dataforsyningen search index
(`dataforsyningen.dk/es/news/_search`) is from 23 Oct 2026.

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
| `matrikel` (better, no new credential) | Forvaltning2 on **Dataforsyningen** | WMS | `https://api.dataforsyningen.dk/wms/forvaltning2` with our token, layer `Matrikelskel` | **Yes**: tested, identical tiles |
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
| Offline area (`OFFLINE_MAX_ZOOM` 16) | up to 2,000 without confirmation, 20,000 max | 18-40 KB | ~36-80 MB at 2,000 tiles, ~360-800 MB at 20,000 |

| Scenario per month | Screen sessions | PDFs | Proxy traffic (out; the same comes in from Datafordeleren) | Requests |
| --- | --- | --- | --- | --- |
| Low | 1,000 (3-8 GB) | 200 (2-8 GB) | ~5-16 GB | ~0.2-0.4 M |
| High | 10,000 (30-80 GB) | 3,000 (30-120 GB) | ~60-200 GB | ~1.8-4 M |

Both scenarios leave out offline saving and assume no cache. Every 100 offline areas a month
add ~4-80 GB, depending on whether users stay under the 2,000-tile confirmation (100 x 36-80 MB)
or go to the 20,000-tile maximum (100 x 360-800 MB). Hetzner cloud servers include 20 TB of
traffic a month, so bandwidth costs nothing even in the high scenario with heavy offline use. What matters is the extra load on the Next server, which streams tiles and holds up
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

The offline feature needs more than a new cache key. `public/sw.js` only sends three hosts
through `tileStrategy` (the cache-first branch that also serves saved areas): `api.dataforsyningen.dk`,
`tile.openstreetmap.org` and `cdn.dataforsyningen.dk`. Requests to any other host get no
service-worker handling at all. Same-origin requests fall through to a plain
`caches.match(...) || fetch(...)`: that only finds a saved tile when the stored key happens to
equal the request URL exactly, and it never caches tiles seen on screen. So:

- With a proxy (D1 a), `sw.js` needs a branch for the tile route's path (for example
  `url.origin === self.location.origin && url.pathname.startsWith("/api/tiles/")`) before the
  same-origin branch, routed to `tileStrategy`.
- With a browser key (D1 c), `wms.datafordeler.dk` and `wmts.datafordeler.dk` must be added to
  the host list.

Without that, a user can save an area and still get an empty map when they open it offline
(for Datafordeler hosts with certainty; for the proxy as soon as its URLs carry anything the
cache key strips). A test that runs the fetch handler on a proxied or
Datafordeler tile URL with the network off should guard this.

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

Ordered by closure date. Each step is a separate PR. The research was done on Monday 23 Nov, and
the service window opens on Thursday 26 Nov 16:00, so steps 1-4 have about three days.

1. **Today: Mads creates the key.** Make a Datafordeler IT system for Kort under Mahope
   (CVR 39413892) and an API key. It is active 15 minutes after it is created. Put it in
   Bitwarden under its own name, and keep it out of the repo. Datafordeleren is not named in
   the 3 Nov notice about the Dataforsyningen move, so it is expected to keep working through
   the window.
2. **Before 26 Nov: test the key.** The existing key ("infra: Datafordeler API key") can be used
   for this test if step 1 is not done yet. Test the Datafordeler URLs in EPSG:3857: layer names
   (`dtk25`/`DTK25`, the stednavne group layer), cache headers, CORS on a `200`, and that the
   images match today's (section 7, points 1-3).
3. **Before 26 Nov 16:00: cadastre to `wms/forvaltning2`.** A one-line URL change in
   `sources.ts`. Fix the credit to Geodatastyrelsen at the same time (`sources.ts`,
   `dataSources.ts`, `NOTICE.md`, the PDF footer). Tested today, and the service is on the
   30 Nov opening list. Also fix the dead `stednavne2` comment in
   `scripts/build-stednavne-index.mjs`.
4. **Before 26 Nov 16:00: a fallback base map and a notice (D2).** From 26 Nov the default
   style (Skærmkort) is gone until Q1 2027, and DTK25 is gone until step 5 is live. Point the
   default style at a layer that works, and show a short notice in the map about the window and
   the missing layers. Candidates: DTK25 via Datafordeleren if step 2 passes, `Kort25`
   (Dataforsyningen, back on 30 Nov, no new credential) or OpenTopoMap (works during the window
   too, but its rules forbid bulk fetching, so not for PDFs or offline).
5. **As soon as step 2 passes: move the KDS layers to Datafordeleren**, all at once behind one
   flag. That covers DTK25 (screen JPEG and PDF PNG), ortofoto (WMTS), Høje/Lave, Danske
   Stednavne and DHM (0.5/2.5 m contours and hillshade via the WMS). Use the key model from D1,
   and update `dataSources.ts`, `NOTICE.md`, the CSP, the offline cache key, the service worker's
   tile routing (section 4) and the docs. Live-check both brands, as the repo requires. Every
   day this is not live after 26 Nov, these layers are missing in Kort and its PDFs.
6. **30 Nov after 08:00: retest.** Rerun the live tests in section 1: the public token after
   the login change, `wms/forvaltning2`, `wms/ddm`, `wms/kort25`, the indsøkort IIIF image call
   (`full/<w>,/0/default.jpg`, not just `info.json`), and `cdn.dataforsyningen.dk` (styles,
   glyphs, sprites). Confirm that the `_DAF` services did not come back.
7. **Q1 2027: Skærmkort.** When `Skaermkort_vector_tiles` is back, switch the default style
   back (or keep DTK25 as the default, D7). Whether Datafordeleren offers Skærmkort in
   EPSG:3857 in the meantime was not researched.
8. **Contour build script:** switch `scripts/contours/kurver-dk.sh` from `dhm_wcs_DAF` to
   `wcs.datafordeler.dk/DHMNedboer/dhm_wcs`, with the key read from an environment variable at
   build time. This only matters for the next rebuild.
9. **#39, after step 5:** self-host the historic maps and place names (and maybe hillshade).
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

**D2. From 26 Nov 16:00 (window, then missing layers until the migration):**
- (a) Switch the KDS layers to Datafordeleren before 26 Nov, if the key test passes in time,
  plus a short notice for the window. *Recommended:* it is the only option that keeps DTK25 in
  the PDF.
- (b) Fallback base map (`Kort25` from 30 Nov, OpenTopoMap during the window) plus a notice
  that DTK25, ortofoto, historic maps and DHM are temporarily missing; migrate afterwards.
- (c) Only a notice.
- (d) Do nothing (the map is blank in Denmark from 26 Nov).

**D3. Cadastre (`matrikel`):**
- (a) Switch to `wms/forvaltning2` on Dataforsyningen now, and credit Geodatastyrelsen.
  *Recommended.*
- (b) Datafordeler `MatGaeldendeOgForeloebigWMS` (needs the key, layer names not checked).
- (c) Remove the layer.

**D4. Who confirms that the `_DAF` services are gone for good?**
- (a) Treat them as gone from 26 Nov and migrate without waiting. *Recommended:* they are on
  the closure list and on neither half of the opening list.
- (b) Also ask KDS (support@kds.dk) today, but do not wait for the answer.
- (c) Wait for the 30 Nov retest before migrating (risks at least four days without DTK25).

**D5. DHM overlays (0.5 m and 2.5 m contours, hillshade):**
- (a) Keep them, via the Datafordeler DHM WMS. *Recommended* (same layers, no rebuild).
- (b) Drop the 0.5/2.5 m WMS contours in favour of our own 5/10 m PMTiles, and keep hillshade.

**D6. Self-hosting (#39) after the migration:**
- (a) Historic maps and place names (static data). *Recommended.*
- (b) Also DTK25 (~12-25 GB, yearly rebuild from the DTK raster download).
- (c) Nothing for now.

**D7. Default base map once Skærmkort is back (Q1 2027):**
- (a) Back to Skærmkort klassisk, as today. *Recommended* (vector, sharp, lighter tiles).
- (b) Keep DTK25 as the default.

## 7. Open points

Points 1-3 were answered with a key on 23 Nov; see section 8. The rest still need an answer
from KDS:

1. EPSG:3857 on the Datafordeler WMS services (`dtk_25`, `topo20_*`, `Danske_Stednavne`, `dhm`),
   tested with `SRS=EPSG:3857` and 256 px tiles.
2. Exact layer names: `dtk25` vs `DTK25` vs `dtk_25`; the Danske Stednavne group layer; the
   Matriklen2 cadastre layer, if D3 (b) is chosen.
3. Whether Datafordeler tiles send `Cache-Control`/`ETag`, and whether CORS holds on a `200`.
4. Rate limits or fair-use rules for API keys (none published).
5. Whether KDS accepts a key in a public web client (D1 c). Datafordeler support:
   [datafordeler.dk/support][dafo-support].
6. Confirmation that the `_DAF` services do not come back after 30 Nov (inferred from the two
   lists, not announced), and whether the `arkivkort` IIIF scans, which are on neither list,
   come back with `Arkivmeta` on 30 Nov or later. If they do not, lake-chart pages silently drop
   out of the PDF and the popup's download link fails.
7. Whether `cdn.dataforsyningen.dk` (Skærmkort styles, glyphs, sprites) stays up during the
   window and until Q1 2027.
8. Whether Kort's public Dataforsyningen token still works after the 30 Nov login change.
9. Whether `kort.solaris.dk` sits behind Cloudflare, which matters for D1 (b) and for caching.

## 8. Tested with a Datafordeler key (23 Nov 2026)

Done while building the tile route (`/api/tiles`, PR for #5). One 256 px EPSG:3857 tile per
layer over Mols Bjerge at zoom 14 and 17, the old `_DAF` URL against the Datafordeler URL:

- **EPSG:3857 works on every service** (`dtk_25`, `topo20_hoeje/lave`, `Danske_Stednavne`,
  `dhm`, and the orthophoto WMTS with `DFD_GoogleMapsCompatible`).
- **The tiles are byte-identical** (same md5) to today's `_DAF` tiles for DTK25 (PNG and JPEG),
  orthophoto, Høje and Lave Målebordsblade, Danske Stednavne and all three DHM layers. The
  cadastre on `wms/forvaltning2` is identical to `forvaltning2_udv` too.
- **Layer names:** DTK25 is `dtk25` (the current edition; `dtk_25` is the group with every
  year since 2002 and draws differently). The Danske Stednavne group layer is
  `danske_stednavne`, as on Dataforsyningen. DHM keeps `dhm_kurve_0_5_m`,
  `dhm_kurve_traditionel` and `dhm_terraen_skyggekort`. `STYLES=` (empty) works everywhere.
- **Headers:** WMS answers carry no `Cache-Control` or `ETag`; the orthophoto WMTS sends
  `Cache-Control: max-age=172800`. `Access-Control-Allow-Origin: *` on a `200` as well.
- **GetCapabilities writes the caller's API key into every `OnlineResource` URL** in its answer.
  A proxy must never pass capabilities (or any non-image answer) on to the browser.

[list]: https://dataforsyningen.dk/asset/PDF/Mapningstabel/Oversigt_tjenester_lukkes.pdf
[kds-jun]: https://www.klimadatastyrelsen.dk/om-klimadatastyrelsen/nyheder/nyhedsarkiv/2026/jun/vi-fremtidssikrer-dataforsyningen
[kds-dafo]: https://www.klimadatastyrelsen.dk/om-klimadatastyrelsen/nyheder/nyhedsarkiv/2026/jun/paralleldrift-paa-datafordeleren-ophoerer-den-15-januar-2027
[kds-sep]: https://www.klimadatastyrelsen.dk/om-klimadatastyrelsen/nyheder/nyhedsarkiv/2026/sep/dataforsyningen-flytter-til-ny-driftsplatform-2-november-2026
[kds-nov]: https://www.klimadatastyrelsen.dk/om-klimadatastyrelsen/nyheder/nyhedsarkiv/2026/okt/dataforsyningen-flytter-til-ny-driftsplatform-det-betyder-det-for-dig-som-anvender
[open-list]: https://www.klimadatastyrelsen.dk/Media/639293065271429338/oversigt-over-abne-tjenester_dataforsyningen.pdf
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
