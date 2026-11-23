# Egen søkortstil, fase 1: dybdefliser og stilprøver

Research og prototype 23. november 2026, gren `research/egen-soekortstil`. Appen
er ikke ændret. Byggescript: [`scripts/soekort/ddm-pmtiles/`](../../../scripts/soekort/ddm-pmtiles/README.md).

## Kort fortalt (dansk)

- **Vi har nu egne dybdefliser for hele Danmark.** Én PMTiles-fil på 61,4 MB med
  dybdebånd, dybdekurver og dybdetal, bygget af Danmarks Dybdemodel (50 m) i
  danske farvande, EMODnet uden for og NOVANA-kurverne i 80 søer. Den bygges på
  cirka 21 minutter med ét script og uden nogen nøgle.
- **Dybdemodellen kan hentes frit som GeoTIFF.** Dataforsyningens side for
  datasættet er mærket "Uden brugerregistrering" og peger på et offentligt
  downloadlink hos Geodatastyrelsen (`ftp.sdfe.dk`, weblink). Der skal ikke
  bruges login.
- **Forskellen på papir er stor.** I dag tegner PDF'en Dybdemodellen som
  WMS-billeder, hvor 50 m-cellerne står som slørede firkanter ved 1:25.000, og
  der er hverken kurver eller tal. De nye lag er vektorer: glatte kurver, skarpe
  tal i 300 dpi og samme stregtykkelse i millimeter som resten af kortet.
- **Kystlinjen kommer fra baggrundskortet.** Dybdemodellens egen kyst er
  generaliseret til 1:100.000. Båndene går derfor 1 km ind over land og lægges
  under skærmkortets land, så det er skærmkortets præcise kyst, man ser.
- **Furesø har ingen dybdedata.** Hverken NOVANA eller Dybdemodellen dækker den,
  så prøven af Furesø viser kun baggrundskortet. Mossø i Rold Skov viser søstilen
  i stedet.
- **Licensen:** vilkårene giver en "i øvrigt ubegrænset brugsret" til at kopiere,
  offentliggøre og sammensætte data. De nævner ikke ændring med ord, men intet
  forbyder det. Krediteringen skal have hentedatoen (ikke "WMS-tjeneste") og
  "Model og data er ikke egnet til navigation". Se afsnit 4.
- **Dataforsyningen lukker 26. november**, og WMS'en `ddm` kommer først tilbage
  30. november med login. Egne fliser fjerner den afhængighed for dybderne.
  Skærmkortet er væk til første kvartal 2027, så fase 2 skal også klippe
  båndene til kysten for raster-baggrundskort (afsnit 6).

### Tre stilvarianter at vælge imellem

Alle tre bruger samme fil. Kun stilen er forskellig, så valget kan også blive
en indstilling i appen.

| | Variant | Hvem | Billede |
| --- | --- | --- | --- |
| **A** | **Klassisk søkort**: fem blå toner (0-2, 2-5, 5-10, 10-20 og over 20 m), lavt vand mørkest, dybt vand næsten hvidt. 2 m- og 5 m-kurverne er tykkere. Grundtal fra cirka 1:40.000, på skærm og papir. | Alle; ligner et papirsøkort | ![Klassisk](svendborgsund-egen-klassisk-skaerm.webp) |
| **B** | **Lavt vand (kano og kajak)**: de første 5 m meter for meter (0-1, 1-2, 2-3, 3-5), alt over 10 m hvidt, 1 m-kurver med tal. | Kano, kajak, jolle, spejdersejlads | ![Lavt vand](svendborgsund-egen-lavvande-skaerm.webp) |
| **C** | **Linjer (sparsomt blæk)**: kun to lyse toner (0-2 og 2-5 m), hvidt derefter, mørkere kurver med tal. | Laserprinter, sort/hvid-kopi | ![Linjer](svendborgsund-egen-linjer-skaerm.webp) |

**Min anbefaling:** A som standard, B som valg for "lavt vand" i sidepanelet. C
er god til sparsomt blæk. Over DTK25 og luftfoto duer ingen af de tre endnu:
alle har dækkende bånd (C er hvid efter 5 m), og båndene går 1 km ind over
land. Indtil båndene er klippet til kysten, viser fase 2 kun kurver og tal over
raster-baggrundskort (afsnit 6).

Samme tre varianter i Det Sydfynske Øhav (1:50.000):
[klassisk](sydfynske-oehav-egen-klassisk-skaerm.webp),
[lavt vand](sydfynske-oehav-egen-lavvande-skaerm.webp),
[linjer](sydfynske-oehav-egen-linjer-skaerm.webp).

### Mads skal beslutte

1. Hvilken variant (A, B, C eller en kombination) fase 2 skal bygge ind.
2. Om filen må lægges på `tiles.mahoje.dk` (upload-kommandoen står i afsnit 5).
3. Om vi skal bede Geodatastyrelsen bekræfte, at afledte dybdekurver er i orden
   (afsnit 4). Vilkårene tillader det efter min læsning, men det blev nævnt som
   åbent spørgsmål i `marinekort-2026-11.md`.

## 1. Sample images: today against the new layers

Screen: 1440 x 900 px at the print scale's screen zoom (96 dpi). A4: a full page
at 300 dpi; "crop" is 1400 x 900 px of it at 100 % (119 x 76 mm on paper).
"Prod" is kort.mahoje.dk on 23 Nov 2026 with *Havdybder Danmark* and *Sødybder*
on; its A4 is page 1 of the app's own PDF at 300 dpi, rendered with `pdftoppm`.
"Ours" is the preview page (`scripts/soekort/ddm-pmtiles/preview/`) with the
same skærmkort and variant A.

| View | Prod screen | Our screen | Prod A4, crop | Our A4, crop | Full A4 pages |
| --- | --- | --- | --- | --- | --- |
| Svendborgsund 1:25.000 | ![](svendborgsund-prod-skaerm.webp) | ![](svendborgsund-egen-klassisk-skaerm.webp) | ![](svendborgsund-prod-a4-300dpi-udsnit.webp) | ![](svendborgsund-egen-klassisk-a4-300dpi-udsnit.webp) | [prod](svendborgsund-prod-a4-300dpi.webp), [ours](svendborgsund-egen-klassisk-a4-300dpi.webp) |
| Det Sydfynske Øhav 1:50.000 | ![](sydfynske-oehav-prod-skaerm.webp) | ![](sydfynske-oehav-egen-klassisk-skaerm.webp) | ![](sydfynske-oehav-prod-a4-300dpi-udsnit.webp) | ![](sydfynske-oehav-egen-klassisk-a4-300dpi-udsnit.webp) | [prod](sydfynske-oehav-prod-a4-300dpi.webp), [ours](sydfynske-oehav-egen-klassisk-a4-300dpi.webp) |
| Limfjorden ved Løgstør 1:50.000 | ![](limfjorden-loegstoer-prod-skaerm.webp) | ![](limfjorden-loegstoer-egen-klassisk-skaerm.webp) | ![](limfjorden-loegstoer-prod-a4-300dpi-udsnit.webp) | ![](limfjorden-loegstoer-egen-klassisk-a4-300dpi-udsnit.webp) | [prod](limfjorden-loegstoer-prod-a4-300dpi.webp), [ours](limfjorden-loegstoer-egen-klassisk-a4-300dpi.webp) |
| Kattegat ved Anholt 1:100.000 | ![](kattegat-anholt-prod-skaerm.webp) | ![](kattegat-anholt-egen-klassisk-skaerm.webp) | ![](kattegat-anholt-prod-a4-300dpi-udsnit.webp) | ![](kattegat-anholt-egen-klassisk-a4-300dpi-udsnit.webp) | [prod](kattegat-anholt-prod-a4-300dpi.webp), [ours](kattegat-anholt-egen-klassisk-a4-300dpi.webp) |
| Furesø 1:10.000 (no depth data) | ![](furesoe-prod-skaerm.webp) | ![](furesoe-egen-klassisk-skaerm.webp) | ![](furesoe-prod-a4-300dpi-udsnit.webp) | ![](furesoe-egen-klassisk-a4-300dpi-udsnit.webp) | [prod](furesoe-prod-a4-300dpi.webp), [ours](furesoe-egen-klassisk-a4-300dpi.webp) |
| Mossø i Rold Skov 1:10.000 (NOVANA) | ![](mossoe-rold-skov-prod-skaerm.webp) | ![](mossoe-rold-skov-egen-klassisk-skaerm.webp) | ![](mossoe-rold-skov-prod-a4-300dpi-udsnit.webp) | ![](mossoe-rold-skov-egen-klassisk-a4-300dpi-udsnit.webp) | [prod](mossoe-rold-skov-prod-a4-300dpi.webp), [ours](mossoe-rold-skov-egen-klassisk-a4-300dpi.webp) |
| Overview (EMODnet outside the model) | ![](oversigt-prod-skaerm.webp) | ![](oversigt-egen-klassisk-skaerm.webp) | | | |

What the comparison shows:

- **Today's PDF** prints the DDM WMS (`ddm_50m_dybde_relief`) as an image. At
  1:25.000 and 300 dpi each 50 m cell is 2 mm on paper, so the sound is a
  pattern of soft squares. Dark means deep in that ramp, it carries no
  numbers, and it lies on top of the land along the coast.
- **The new layers** are vectors: 0.16-0.26 mm lines, 1.75 mm numbers that
  follow the contours, and bands that stop at the base map's coastline.
- **Values agree.** The Svendborgsund channel looks black in the WMS and only
  mid-blue in ours; the raw model has 4-10 m there (sampled at three points),
  which is the 5-10 m band. The WMS ramp stretches the colours per tile.
- **Furesø** has no survey in NOVANA (the WFS returns no features in its
  bounding box), and the depth model covers the sea only. Both maps therefore
  show only the base map. The historical lake chart (*Indsøkort*) is the only
  depth source for Furesø today.

## 2. Method

Details, steps and timings: [`scripts/soekort/ddm-pmtiles/README.md`](../../../scripts/soekort/ddm-pmtiles/README.md). In short:

1. Download the 2024 model (GeoTIFF, EPSG:3034, Float32, depth positive down
   from DKMSL 2022) from Geodatastyrelsen's public weblink. Dataforsyningen's
   own index marks dataset 4817 "Uden brugerregistrering" and links the weblink
   as its HTTP download; the WMS is listed separately.
2. Extend the bands 1 km past the model's generalised coast (nearest value), so
   they reach under the base map's land; contours keep the model's extent.
3. Three zoom tiers (5-8, 9-11, 12-14), each contoured from its own smoothed
   grid (blur 300, 90 and 40 m; the finest tier is resampled to 25 m with a
   cubic spline first). Contouring a smooth surface interpolates within cells,
   so lines never follow the 50 m cell edges, and no tier is just a
   simplified copy of another.
4. Bands (`depth_areas`) and lines (`depth_contours`) from the same grid with
   GDAL, so band edges lie exactly on the lines. Labels (`depth_labels`): contour
   numbers on straight stretches with a precomputed angle, shoal soundings
   (local minima at least 1 m above the surroundings) and a sparse grid of
   soundings, values truncated to 0.1 m towards the shallow side.
5. EMODnet (CC BY 4.0) where the model has no data, with coarser levels (5,
   10, 20, 50, 100, 200 m). NOVANA's band polygons for lakes.
6. tippecanoe per tier, joined into one file (zoom 5-14). At 300 dpi, zoom 14
   is about 1:25.000; larger scales overzoom the same smooth geometry.

Things that did not work, or that I left out:

- **GDAL only polygonises between the given levels.** The first build had no
  0-1 m band and nothing deeper than 200 m. The fix is open-ended levels
  (`-1000` and `100000`) for the polygons only.
- **Seabed relief** (a discreet hillshade) is not in the vector file. The
  existing *Havbundens relief* WMS layer can stay for now. An own raster
  hillshade PMTiles from the same grid is a small addition for phase 2.
- **Italic depth numbers** were tried first, as on many charts, but Open Sans
  Italic's "1" reads as a "7" at 1.75 mm, so the numbers are upright.

### Design notes

There are two conventions for depth colours, and they are opposite:

- **Paper charts** (INT 1 / IHO S-4 section B-411, "Depth contours and shallow
  water tint"): blue tint for shallow water inside a chosen contour, deep water
  white. Danger is what stands out. Navionics-style chart plotters do the same
  with a "safety depth": shallower areas tinted blue, deeper areas white
  ([Raymarine], [Lowrance HDS manual]).
- **Bathymetric maps** (EMODnet, the DDM WMS we use today, Kartverket's
  *Sjøkart - Dybdedata* WMS): darker with depth. Kartverket's presentation
  rules for that dataset go from RGB 219,250,255 at 5-10 m to 184,237,255 at
  50-100 m, with grey contours (173,173,173) ([Kartverket tegneregler]).

For kayaks, canoes, dinghies and planning a sail the question is "where is it
shallow?", so all three variants follow the paper-chart convention: shallow is
darkest. The colours are our own: a blue ramp with clear steps between bands,
with the skærmkort's land (`#fffff2`) still different from the near-white
deep water. They have not been tested on a real printer yet. Numbers are
1.6-1.75 mm, close to the app's other map text (1.8-1.9 mm); the 2 and 5 m
lines (1-3 m in variant B) are 0.26 mm, others 0.1-0.16 mm. Contour numbers
have a white halo that breaks the line, as the gap on a paper chart. Place
names win label collisions.

[Raymarine]: https://docs.raymarine.com/81406/en-US/latest/DepthSettingsMenu-5E1C94A7.html
[Lowrance HDS manual]: https://manualsonline.com/manuals/mfg/lowrance_electronics/hds5_1.html?p=61
[Kartverket tegneregler]: https://register.geonorge.no/data/documents/Tegneregler_Sj%C3%B8kart%20-%20Dybdedata_v1_presentasjonsregler-sjokart-dybdedata_.pdf

## 3. Style sample (JSON)

[`style/soekort-klassisk.json`](style/soekort-klassisk.json),
[`style/soekort-lavvande.json`](style/soekort-lavvande.json),
[`style/soekort-linjer.json`](style/soekort-linjer.json): the depth layers
only, at screen sizes (96 dpi), valid against the MapLibre style spec
(`validateStyleMin`). They are generated from
`scripts/soekort/ddm-pmtiles/preview/style.mjs`, which takes `pxPerMm` like
`src/lib/map/vectorOverlays.ts` does: text and line sizes are millimetres on
paper, and zoom thresholds move with the dpi (1:25.000 is zoom 12.7 on screen
and 14.3 at 300 dpi, and shows the same things at both). On screen, sizes have a
pixel floor (text never under 10 px), which never applies at print dpi.

At the same scale the PDF loads tiles 1.6 zoom levels deeper than the screen,
so it can get a finer data tier (1 m and 3 m bands, soundings) than the
screen. `style.mjs` therefore splits every layer per data tier (`DATA_TIERS`,
mirroring `TIERS` in `build.py`), shifts each tier's zoom range like the other
thresholds and shows only the levels that tier has on screen; finer bands
take the colour of the band around them. A test simulates both renderers and
requires the same bands, lines and numbers. Shoal soundings therefore start at
zoom 12 (about 1:40.000), where the screen gets them.

The layers come in three groups, and the order in the base map matters:

| Group | Layers | Goes |
| --- | --- | --- |
| sea | bands, minor, major and safety contours (`src` not `novana`) | right after the skærmkort's sea polygon `vand_hav`, so land and coast are drawn on top |
| lake | the same for `src = novana` | after the skærmkort's lake fills (`vand_sø*`) |
| labels | contour numbers (major, and minor only where minor lines show), shoal soundings, grid soundings | above all fills and roads, below the base map's place names |

## 4. Licence and credit

**Danmarks Dybdemodel, 50 m (DDM50).** Terms: "Vilkår og betingelser for brug af
marine data indeholdt i Danmarks Dybdemodel 50 m opløsning", sagsnr. 340-3058,
last updated May 2024 (downloaded with the data, also linked as
`DDM_TERMS_URL` in `src/lib/map/sources.ts`). Quoted from the Danish original:

> Geodatastyrelsen giver, under hensyntagen til nedenstående afsnit Vilkår for
> brug og Kildeangivelse, en verdensomspændende, gratis, ikke-eksklusiv, og i
> øvrigt ubegrænset brugsret til marine data, som frit kan:
> • kopieres, distribueres og offentliggøres
> • sammensættes med andet materiale/data
> • bruges kommercielt og ikke-kommercielt

> Data fra DDM50 må ikke anvendes til navigation eller navigationsmæssige formål.
>
> DDM50 må ikke anvendes på en måde, så det kan fremstå som om Geodatastyrelsen
> godkender, støtter, anbefaler eller på anden måde markedsfører brugeren,
> brugerens produkter eller tjenester.

> Der skal stilles en kopi af nærværende vilkår, evt. ved hjælp af et link, til
> rådighed for tredjemand. Vilkårene er også gældende, når tredjemand benytter
> sig af data fra DDM50.

> […] det er derfor en betingelse for brug af data fra DDM50, at der et synligt
> sted på distributionsmediet er angivet følgende:
> 1. "Indeholder data fra Geodatastyrelsen, Danmarks Dybdemodel, 50 m opløsning".
> 2. "[Dato]" for hvornår datasæt er hentet hos Geodatastyrelsen eller
>    "Indeholder WMS-tjeneste" såfremt WMS-tjeneste er benyttet
> 3. "Model og data er ikke egnet til navigation"

The English version says the same ("a worldwide, free, non-exclusive, and
otherwise unlimited right of use … copied, distributed, and published;
combined with other materials/data"). Reading:

- Publishing contours and bands derived from the model, combined with other
  map data, fits "otherwise unlimited right of use" plus "combined with other
  materials/data". The terms do not use the word "modify" (*ændre*), and they
  set no condition against it. I read that as allowed. Earlier research
  (`docs/research/marinekort-2026-11.md`) suggested a short confirmation from
  Geodatastyrelsen (policyogsalg@gst.dk); that is still the safe step before
  launch, and it is a question for Mads, not a blocker for building.
- **Credit changes** from "Indeholder WMS-tjeneste" to the download date:
  "Indeholder data fra Geodatastyrelsen, Danmarks Dybdemodel, 50 m opløsning,
  hentet 23.11.2026. Model og data er ikke egnet til navigation." The build
  writes this, with the date and a link to the terms ("Der skal stilles en kopi
  af nærværende vilkår, evt. ved hjælp af et link, til rådighed for
  tredjemand"), into the PMTiles attribution, so someone who fetches the hosted
  file directly gets the terms with it. Keep the link to the
  terms (on the map and on `/kilder`) and "IKKE TIL NAVIGATION" on the PDF.
- "Data, der allerede er downloadet, når de nye vilkår træder i kraft, kan
  fortsat anvendes på de hidtil gældende vilkår": keep the source file and its
  date with each build.

**EMODnet Bathymetry:** CC BY 4.0, credit "EMODnet Bathymetry", not for
navigation (as today's *Havdybder Europa*).

**NOVANA lake depths:** "Vilkår for brug af danske offentlige data" (free, may be
changed and used commercially), credit "Indeholder data, som benyttes i henhold
til vilkår for brug af danske offentlige data", and "må ikke anvendes til
navigation eller sejlads" (as today's *Sødybder*).

Every feature carries `src` (`ddm`, `emodnet`, `novana`), so phase 2 can show
each credit only where its data is on the map or the page.

## 5. Hosting

Not uploaded. The existing 5/10 m contours are served from
`https://tiles.mahoje.dk/kurver-5m.pmtiles` (Dokploy app `kort-tiles`, nginx
with range requests and CORS, Cloudflare in front; `scripts/contours/README.md`).
The depth file goes next to it the same way:

```sh
scp ~/dev/soekort-ddm/work/soekort.pmtiles hetzner-main:/opt/kort-tiles/html/soekort.pmtiles.ny
ssh hetzner-main 'mv /opt/kort-tiles/html/soekort.pmtiles.ny /opt/kort-tiles/html/soekort.pmtiles'
curl -sI -H 'Range: bytes=0-127' https://tiles.mahoje.dk/soekort.pmtiles   # expect 206
```

61.4 MB is in the same range as the contour file. The app would read the URL
from a new `NEXT_PUBLIC_SOEKORT_URL` (default `https://tiles.mahoje.dk/soekort.pmtiles`),
as `NEXT_PUBLIC_CONTOURS_URL` does. `tiles.mahoje.dk` is already in the CSP.

## 6. Plan for phase 2 (integration)

The other job (the quick tidy-up of the sea layers) changes the same layers, so
phase 2 starts after it lands.

1. **New overlay `soekort`** in `src/lib/map/sources.ts`, built like the 5 m
   contours (`contours.ts`: pmtiles protocol, `ensurePmtilesProtocol`), with
   its layers in a TypeScript port of `style.mjs` next to `vectorOverlays.ts`.
   One overlay replaces three of today's:

   | Today | Becomes |
   | --- | --- |
   | `dybdemodel` (DDM WMS `ddm_50m_dybde_relief`) | `soekort` bands, contours and numbers (`src = ddm`) |
   | `emodnet` (*Havdybder Europa*, WMS) | the same overlay (`src = emodnet`); Norway north of 59° N still needs the WMS or a later build |
   | `soedybder` (GeoJSON in `public/data/soekort/`) | the same overlay (`src = novana`); the GeoJSON can go once nothing else reads it |
   | `havbund` (relief WMS) | stays for now; later an own hillshade PMTiles from the same grid |

   A style choice (A, B, C) in the sidebar, or one fixed variant.
2. **Layer order.** On the skærmkort, insert the sea group after `vand_hav` and
   the lake group after the lake fills (as `withDepth` does). Overlays today are
   simply added on top, so this needs a `beforeId` per layer in `MapContainer`
   and in `src/lib/pdf/renderer.ts`.
3. **Raster base maps (DTK25, ortofoto, OpenStreetMap, Kort25) and the coming
   months without skærmkort** (Dataforsyningen's service window from 26 Nov,
   skærmkort back in Q1 2027, see `2026-11-datafordeleren-migration.md`). There
   is no land polygon to hide the 1 km fill under, so the bands must be clipped
   to a real coastline in the build: GeoDanmark's coastline or DAGI land
   polygons (both CC BY 4.0, Klimadatastyrelsen; check where they are
   downloadable after the move to Datafordeleren). Until then no variant works
   over raster maps as it is: all three have opaque bands (variant C is white
   beyond 5 m) that would cover land and photo up to 1 km past the model's
   coast. Over raster base maps, draw only the contours and numbers (leave out
   the `areas` layers) until the bands are clipped.
4. **PDF.** `renderMapToImage` already passes `pxPerMm`; the layers take it.
   Credit: replace the DDM "Indeholder WMS-tjeneste" sentence by the download
   date from the file's attribution (or a constant written by the build), add
   EMODnet/NOVANA when their `src` is in the frame (query rendered features).
   Keep "IKKE TIL NAVIGATION" and the terms link.
5. **`/kilder` and `dataSources.ts`:** a new entry for the depth tiles with the
   three sources, the DDM terms link and the download date; update `NOTICE.md`.
   The data-sources test then covers it.
6. **Offline.** Unlike OpenTopoMap and Kartverket, our own file may be cached
   offline: DDM50 may be copied and distributed, and the credit carries the
   download date. Check with `docs/offline-tests.md` and `src/lib/offline/`.
7. **Tests:** layer order on the skærmkort (sea after `vand_hav`, lakes after
   `vand_sø*`, labels below the first place name), `pxPerMm` scaling and zoom
   shift, minor labels hidden with their lines, credit per `src`, and a style
   spec validation of every variant.
8. **Screenshots** (desktop, mobile, PDF) in both brands, as for any UI change.
9. **Upload and switch**: upload the file (section 5), set the env var, deploy,
   live-check both domains, then remove the WMS layers.

Rebuild when Geodatastyrelsen publishes a new model (the build warns when the
file's sha256 changes) or the NOVANA survey grows.

## 7. Limits and open points

- A 50 m model, averaged and partly interpolated (readme: "not targeted for
  safety of navigation"). Smoothing moves values near steep slopes by up to
  about 1 m (0.4-1.0 m at four points in Svendborgsund). Soundings show the unsmoothed model
  value, still a model value, not a survey.
- Narrow waters (harbours, canals, small sounds) where the model has no cells
  get only the extended band, no contours.
- Furesø, Esrum Sø and the other big lakes have no depth survey in NOVANA.
- EMODnet in the file reaches 59° N (Skagerrak, the Swedish west coast, the
  western Baltic); the Oslofjord is not covered.
- `ftp.sdfe.dk` and its weblink are not on the Dataforsyningen closure list
  that `2026-11-datafordeleren-migration.md` covers, but nothing says they stay
  either. Archive the GeoTIFF (sha256 in the build script) with the tiles.
- Peak memory of the build was not measured.

## Sources

- Geodatastyrelsen: [Danmarks Dybdemodel](https://gst.dk/ansvarsomraader/soekort-og-marine-data/soeopmaaling-og-dybdedata/danmarks-dybdemodel), [Denmark's Depth Model (2024)](https://eng.gst.dk/danish-hydrographic-office/denmark-depth-model), [dataset 4817 on Dataforsyningen](https://dataforsyningen.dk/data/4817), terms and readme from the download folder (fetched 23 Nov 2026).
- EMODnet: [terms of use](https://emodnet.ec.europa.eu/en/terms-use-emodnet-online-services-data-and-data-products), WCS `ows.emodnet-bathymetry.eu`.
- IHO S-4, section B-411 (via [IHO CSPCWG letter, 2005](https://legacy.iho.int/mtg_docs/com_wg/CSPCWG/CSPCWG_MISC/CSPCWG_Letters/2005/CSPCWG_L16-05_B-400_to_429_round_4.pdf)); [NOAA US Chart No. 1](https://www.nauticalcharts.noaa.gov/publications/docs/us-chart-1/ChartNo1.pdf).
- Kartverket: [Tegneregler Sjøkart - Dybdedata](https://register.geonorge.no/data/documents/Tegneregler_Sj%C3%B8kart%20-%20Dybdedata_v1_presentasjonsregler-sjokart-dybdedata_.pdf), [Symboler og forkortelser i norske sjøkart](https://kartverket.no/globalassets/nautiske-publikasjoner/symboler-og-forkortelser-i-norske-sjokart.pdf).
- Chart plotters: [Raymarine depth settings](https://docs.raymarine.com/81406/en-US/latest/DepthSettingsMenu-5E1C94A7.html), [Lowrance HDS Navionics settings](https://manualsonline.com/manuals/mfg/lowrance_electronics/hds5_1.html?p=61).
