# Søkort og havdata: marinekort.dk og hvad kort.mahoje.dk kan bruge

Research 18. november 2026, gren `feat/soekort-kilder`.

## Kort fortalt

- **marinekort.dk kunne ikke læses direkte.** Hele sitet ligger bag en Cloudflare-udfordring (`cf-mitigated: challenge`), og robots.txt udelukker AI-crawlere (ClaudeBot, anthropic-ai, GPTBot m.fl.) med `Content-Signal: ai-train=no, use=reference`. Jeg har ikke forsøgt at komme uden om det. Attributionssiden er derfor ikke læst. Det, der står nedenfor om marinekort.dk, bygger på offentlige spor (søgeresultater, App Store-beskrivelsen og certifikat-logs) og er markeret som udledt.
- **De officielle danske søkort kan vi ikke bruge.** ENC- og papirsøkort er Geodatastyrelsens ophavsret og sælges (ENC via IC-ENC's forhandlere). Gengivelse kræver en særskilt reproduktionstilladelse. Det kræver Mads, se nedenfor.
- **Vi har allerede de frie havkilder, der findes.** Danmarks Dybdemodel (GST), EMODnet Bathymetry og OpenSeaMap-sømærker var på kortet i forvejen.
- **Nyt i denne gren:** laget *Havbundens relief* fra Dybdemodellens skyggekort (`ddm_50m_skyggekort_overdrevet`). Licensen er den samme som for dybdefarverne, og det kræver ingen ny nøgle. Over DTK25 viser det havbundens form og lader DTK25's egne havtekster og dybdekurver stå. Det gør dybdefarvelaget ikke.
- **Kreditering rettet:** Klimadatastyrelsens data har været under CC BY 4.0 siden 16. maj 2024, men kortet og PDF'en nævnte ikke licensen. Det gør de nu, og de linker til den nye side `/kilder`.
- **Største næste skridt (M):** egne dybdekurver med tal i print-kvalitet fra Dybdemodellens GeoTIFF, bygget som vores 5/10 m-højdekurver. Det kræver først, at Geodatastyrelsen bekræfter, at afledte kurver er i orden (se "Kræver Mads").

## 1. marinekort.dk

### Hvad sitet viser (fra offentlige beskrivelser)

Ifølge sitets egen beskrivelse i søgeresultater og App Store er marinekort.dk et gratis browser-søkort over Danmark med:

- dybder ("bygger blandt andet på officielle data"),
- live AIS-skibstrafik,
- Natura 2000-områder,
- Efterretninger for Søfarende (EfS),
- vind og vejr,
- søer (fx Furesø, tilføjet til kajak og fiskeri),
- ruteplanlægning og en iOS-app.

Det skriver selv, at det ikke må bruges til primær navigation.

### Teknik (udledt, ikke verificeret)

Certifikat-logs (crt.sh) viser disse underdomæner, som tyder på en opdelt arkitektur:

| Underdomæne | Sandsynlig rolle |
| --- | --- |
| `maps.marinekort.dk` | Selve kortappen ("Interaktivt Digitalt Søkort over Danmark") |
| `xyz.marinekort.dk`, `origin-tiles.marinekort.dk` | Egen flise-server (XYZ-fliser) med en origin bag Cloudflare-cachen |
| `weather.marinekort.dk` | Vejrdata (sandsynligvis DMI's frie data) |
| `auth.marinekort.dk`, `storage.marinekort.dk` | Login og lagring (gemte ruter) |

`/sitemap-index.xml` er det navn, som fx Astros sitemap-integration bruger, men det er ikke bevis. Kortbiblioteket (MapLibre, OpenLayers eller Leaflet), og om de selv renderer S-57, kunne ikke afgøres uden at omgå adgangskontrollen.

Sandsynlige kilder til deres lag, ud fra hvad der findes frit:

| Lag på marinekort.dk | Sandsynlig kilde | Status hos os |
| --- | --- | --- |
| Dybder | Geodatastyrelsen, Danmarks Dybdemodel 50 m | Har vi (dybdefarver + nu havbundsrelief) |
| Sømærker | OpenSeaMap/OSM, eller egne data | Har vi (OpenSeaMap) |
| AIS | Søfartsstyrelsen/Beredskabsstyrelsen (historisk gratis, live koster) eller AIS-aggregator | Ikke relevant for print |
| Natura 2000 | Miljøstyrelsen (MiljøGIS WMS) | Ikke på kortet, se anbefaling 6 |
| EfS | Søfartsstyrelsens Niord REST-API | Ikke relevant for print |
| Vejr | DMI frie data (CC BY 4.0) | Ikke relevant for print |

## 2. Kilder: format, licens og vilkår

| Kilde | Udbyder | Format | Licens og vilkår | Nøgle | Opdatering |
| --- | --- | --- | --- | --- | --- |
| Officielle søkort (ENC, S-57) | Geodatastyrelsen | S-57 celler, papir | Ophavsret. ENC købes via IC-ENC VAR; gengivelse kræver reproduktionstilladelse (policyogsalg@gst.dk) | Køb | Løbende rettelser |
| Danmarks Dybdemodel 50 m (DDM50) | Geodatastyrelsen via Dataforsyningen | WMS `wms/ddm` (lag: `ddm_50m_dybde`, `ddm_50m_dybde_relief`, `ddm_50m_skyggekort_overdrevet`, `ddm_50m_aar`, `ddm_50m_kilde`), GeoTIFF i EPSG:3034 | Egne vilkår (maj 2024): gratis, må kopieres, distribueres, offentliggøres, sammensættes og bruges kommercielt. Ikke til navigation. Kreditering: "Indeholder data fra Geodatastyrelsen, Danmarks Dybdemodel, 50 m opløsning" + dato eller "Indeholder WMS-tjeneste" + "Model og data er ikke egnet til navigation". Vilkårene skal stilles til rådighed (link) | Gratis Dataforsyningen-token (har vi) | Version 2.0, august 2024 |
| EMODnet Bathymetry | EU (EMODnet) | WMS `ows.emodnet-bathymetry.eu` (`emodnet:mean_*`, `emodnet:contours`), WCS/download | CC BY 4.0. Ikke til navigation | Ingen | Ca. hvert andet år (DTM 2024) |
| EMODnet-dybdekurver | EU (EMODnet) | WMS `emodnet:contours` | CC BY 4.0. Kun 50, 100, 200, 500 m ... så næsten intet i danske farvande | Ingen | Som ovenfor |
| OpenSeaMap sømærker | OpenSeaMap / OSM-bidragydere | PNG-fliser `tiles.openseamap.org/seamark` | Data ODbL, fliser CC BY-SA. Frivilligt drevet server uden formel brugspolitik; behandles som OSM's: ingen masse-download | Ingen | Løbende |
| Skibsruter (Waterway Link) | Søfartsstyrelsen via Dataforsyningen (INSPIRE) | WMS `wms/sfs_waterway_inspire` (`TN.WaterTransportNetwork.WaterwayLink`) | Capabilities: `Fees: none`, `AccessConstraints: none`. Datasættets licens er ikke angivet | Dataforsyningen-token | Ukendt |
| Ankerpladser, kapsejladsbaner | Søfartsstyrelsen | WMS via geodata-info.dk (adresse ikke fundet) | Ukendt | Ukendt | Ukendt |
| EfS og navigationsadvarsler | Søfartsstyrelsen | REST (Niord) | Offentlige meddelelser | Ingen | Ugentligt/løbende |
| AIS | Søfartsstyrelsen / Beredskabsstyrelsen | CSV (historisk), stream (live) | Historisk gratis; live betalt (tidligere 1.800-5.600 kr./år) | Aftale for live | Løbende |
| Klimadatastyrelsens kort (DTK25, skærmkort, ortofoto, DHM, stednavne, matrikel) | Klimadatastyrelsen via Dataforsyningen | WMS, WMTS, vector tiles | CC BY 4.0 fra 16. maj 2024. Kreditér "Klimadatastyrelsen" og licensen, gerne med link til dataforsyningen.dk/data | Gratis token (har vi) | Løbende |

Kilder: [GST søkort og marine data](https://gst.dk/data-og-kort/soekort-og-marine-data), [DDM50-vilkår (PDF)](https://gst.dk/ansvarsomraader/soekort-og-marine-data/soeopmaaling-og-dybdedata/danmarks-dybdemodel), [Klimadatastyrelsen vilkår og priser](https://www.klimadatastyrelsen.dk/om-klimadatastyrelsen/vilkaar-og-priser), [EMODnet terms of use](https://emodnet.ec.europa.eu/en/terms-use-emodnet-online-services-data-and-data-products), [Søfartsstyrelsen download data](https://www.dma.dk/safety-at-sea/navigational-information/download-data), [Søfartsstyrelsen AIS-data](https://www.dma.dk/safety-at-sea/navigational-information/ais-data), GetCapabilities for `wms/ddm`, `wms/sfs_waterway_inspire` og EMODnet hentet 18/11-2026.

## 3. Hvad kort.mahoje.dk har i dag

Alle havlag ligger i `src/lib/map/sources.ts` og er rasterfliser, som MapLibre henter direkte i browseren:

| Lag | Kilde | Hentes som | Offline | PDF |
| --- | --- | --- | --- | --- |
| Havdybder Danmark | DDM50 `ddm_50m_dybde_relief` | WMS 256 px, EPSG:3857, offentligt Dataforsyningen-token | Nej (kreditering kræver dato ved download) | Ja, med DDM-kreditering og "IKKE TIL NAVIGATION" |
| Havbundens relief (ny) | DDM50 `ddm_50m_skyggekort_overdrevet` | Som ovenfor | Nej | Ja, deler kreditering med dybdelaget |
| Havdybder Europa | EMODnet `emodnet:mean_multicolour`, omfarvet til blå | WMS 256 px | Nej | Ja |
| Sømærker | OpenSeaMap | XYZ PNG, maxzoom 18 (forstørres over) | Nej | Ja |
| DTK25 | Klimadatastyrelsen | WMS | Ja | Ja. DTK25 har selv kystnære dybdekurver og navne på grunde og render |

Når et havlag er slået til, viser appen "Ikke til navigation" på kortet, i sidepanelet og på PDF'en.

## 4. Anbefalinger

Indsats: S = under en dag, M = et par dage, L = en uge eller mere.

| # | Anbefaling | Giver | Licens | Indsats | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | Havbundens relief fra DDM50 som valgfrit lag | Havbundens former (render, grunde, dybe huller) over DTK25 uden at skjule DTK25's tekster og kurver | DDM50-vilkår, som dybdelaget | S | **Gjort i denne gren** |
| 2 | CC BY 4.0 i krediteringen + siden `/kilder` | Opfylder Klimadatastyrelsens licens; ét sted at vise alle kilder og vilkår | - | S | **Gjort i denne gren** |
| 3 | Egne dybdekurver (fx 2, 5, 10, 20 m) med dybdetal fra DDM50-GeoTIFF som PMTiles, bygget med samme pipeline som højdekurverne (`scripts/contours/`) | Skarpe vektorkurver i enhver dpi, rolige på print, kan gemmes offline (eget host). Det er det, der får kortet til at ligne et søkort på papir | DDM50-vilkårene nævner kopiering, offentliggørelse og sammensætning, men ikke "ændring". Kræver bekræftelse fra GST. Krediteringen skal så have download-datoen i stedet for "WMS-tjeneste" | M | Prototype bygget 23/11: [2026-11-egen-soekortstil](2026-11-egen-soekortstil/README.md). GST-bekræftelse kræver stadig Mads |
| 4 | Egne sømærker som vektor fra OSM-data (`seamark:*` fra et Danmark-udtræk) i PMTiles | Sømærker i print-kvalitet, kan gemmes offline, ingen belastning af OpenSeaMaps frivillige server, fri styling (sort/hvid print) | ODbL (OSM). Symbolerne skal tegnes selv eller hentes fra et CC BY-SA-sæt | L | Forslag |
| 5 | Skibsruter fra Søfartsstyrelsen (WMS `sfs_waterway_inspire`) | De store ruter (T-ruten, Storebælt) som tynde linjer | Gebyrfrit og uden adgangsbegrænsning ifølge capabilities, men licensen er ikke angivet. Spørg Søfartsstyrelsen først | S | Afklar licens |
| 6 | Natura 2000, fuglebeskyttelses- og vildtreservater (Miljøstyrelsen, MiljøGIS WMS) | Relevant for kajak og jollesejlere: hvor man må sejle og gå i land | Miljøstyrelsens data er frie; tjek vilkår og kreditering | S | Forslag |
| 7 | 512 px WMS-fliser (`WIDTH=512&HEIGHT=512`, `tileSize: 512`) for DDM og EMODnet | Fire gange færre kald, hurtigere skærm og PDF | - | S | Forslag; mål effekten først |
| 8 | Egen server-side proxy med cache for WMS-fliser (`/api/tiles/...`) | Token ud af klienten, cache tæt på brugeren, færre kald mod Dataforsyningen. Gør det også muligt at gemme DDM offline med en download-dato i krediteringen | - | M | Forslag |
| 9 | Print-stil for havet: valgfri sort/hvid-variant (dybdekurver og relief i gråtoner) | Bedre på laserprintere og kopimaskiner end blå flader | - | S-M | Forslag, oven på 3 |
| 10 | EfS, AIS og vejr | Live-data hører hjemme i en navigationsapp, ikke på et udskrevet kort | - | - | Fravalgt |

### Hvorfor ikke bare gøre som marinekort.dk?

marinekort.dk er en planlægnings- og live-app (AIS, vejr, EfS, ruter med login). kort.mahoje.dk laver papirkort. Vores fordel er print: fuld opløsning op til 300 dpi, UTM/MGRS-gitter, misvisning, gulvkort over flere ark og offline. Det, der flytter os mest på søkort, er derfor vektorlag i print-kvalitet (anbefaling 3, 4 og 9), ikke flere live-lag.

## Kræver Mads

1. **Officielle søkort (ENC/papir) fra Geodatastyrelsen.** Kræver en individuel reproduktionstilladelse (og sandsynligvis betaling): [reproduktionstilladelse](https://gst.dk/data-og-kort/koeb-af-data-og-kort/priser-og-vilkaar/reproduktionstilladelse), policyogsalg@gst.dk. Ikke implementeret.
2. **Egne dybdekurver fra DDM50 (anbefaling 3).** Spørg Geodatastyrelsen (policyogsalg@gst.dk), om afledte dybdekurver må offentliggøres under DDM50-vilkårene, og med hvilken kreditering. GeoTIFF'en hentes gratis på [dataforsyningen.dk/data/4817](https://dataforsyningen.dk/data/4817) med Mads' eksisterende Dataforsyningen-bruger.
3. **Skibsruter (anbefaling 5).** Spørg Søfartsstyrelsen om licensen for datasættet bag `sfs_waterway_inspire`.

Det nye lag i denne gren bruger det Dataforsyningen-token, som appen allerede har (`NEXT_PUBLIC_DATAFORSYNINGEN_TOKEN`, se `docs/tokens.md`). Der skal ikke oprettes nogen ny nøgle.

## Runde 2 (18. november 2026): indsøkort, sødybder, vrag og DDM-vilkår

Mads har indsat marinekort.dk/attribution, så listen over deres datasæt er nu kendt. Denne runde gennemgår dem, der giver mening på et udskrevet kort til kano, kajak og sejlads.

### Bygget

| Lag | Kilde og distribution | Licens og kreditering | Hentet |
| --- | --- | --- | --- |
| Sødybder (dybdekurver pr. hele meter med tal) | Miljøstyrelsen/SGAV, "Dybdekort over danske søer (NOVANA)" via Danmarks Miljøportal. WFS `geodata.fvm.dk/geoserver/NOVANA`, lag `Soe_dybdekort_konturer` (0,5 m-bånd som polygoner, 144 MB). Forenklet til hele meter med 1,5 m tolerance: 1,3 MB GeoJSON i `public/data/soekort/` | Danmarks Miljøportals "Vilkår for brug af danske offentlige data": gratis, må ændres og bruges kommercielt. Kildetekst: "Indeholder data, som benyttes i henhold til vilkår for brug af danske offentlige data". Datasættet "må ikke anvendes til navigation eller sejlads" | 18/11-2026 |
| Historiske indsøkort | Geodatastyrelsen, kortværket "Indsøkort" i arkivet bag historiskekort.dk: `api.dataforsyningen.dk/rest/arkivmeta/v3/kort?kortvaerk=Indsøkort` (264 skanninger, 231 opmålinger) og billederne via IIIF (`/rest/arkivkort/iiif/3/…`, CORS og CSP er i orden). Kortene er ikke georefererede, så laget er en markør pr. sø, og PDF'en får de skannede kort som ekstra sider (højst fire) | CC BY 4.0 (Dataforsyningens vilkår). Skanningerne bærer "© Kort & Matrikelstyrelsen … Opmålt af Thorkild Høy" | 18/11-2026 |
| Skibsvrag | EMODnet Human Activities, WFS `emodnet:wwshipwrecks` (UKHO-udtræk). 1.838 vrag i boksen 7,5-15,8 Ø / 54,3-58,0 N; hævede, ikke genfundne og tvivlsomme vrag er udeladt | CC BY 4.0 (EMODnet), UKHO-data under Open Government Licence v3.0, som kræver kreditering af UKHO | 18/11-2026 |

Fund undervejs:

- **EMODnet Heritage Shipwrecks har ingen vrag i Danmark.** Laget `emodnet:heritageshipwrecks` dækker Frankrig, Irland, Italien, UK m.fl. (7.073 vrag, 0 i den danske boks). Vragene omkring Skandinavien ligger i `wwshipwrecks`.
- **Indsøkortenes placering er arkivets søomrids**, ikke en georeferering. Et automatisk tjek mod Danske Stednavne fandt én reel fejl: posten "Mossø" (århus) er en kopi af kortet over Mossø i Rold Skov (fil `is_110c`), men har omridset af Mossø ved Skanderborg. Den er rettet i `CHART_FIXES` i byggescriptet. Tjekkets øvrige advarsler (Tranemose i Ringkøbing amt, Rude Skov-søerne og Hampen Sø) er navnesammenfald og korrekte.
- **NOVANA dækker 80 søer**, mest små søer og nye vådområder, men også Tjele Langsø, Hinge Sø og Mossø i Rold Skov. Furesø, Esrum Sø og de store søer er ikke opmålt endnu; dér er indsøkortet det, der findes. Kurverne for Mossø svarer til Thorkild Høys kort fra 1981.

### Danmarks Dybdemodel: vilkårene tjekket

Vilkårsdokumentet (maj 2024, sagsnr. 340-3058) kræver et synligt sted på mediet: (1) "Indeholder data fra Geodatastyrelsen, Danmarks Dybdemodel, 50 m opløsning", (2) hentedato eller "Indeholder WMS-tjeneste", (3) "Model og data er ikke egnet til navigation". Desuden skal en kopi af vilkårene stilles til rådighed, evt. via et link, og brugen må ikke se ud som om Geodatastyrelsen anbefaler os.

Vores lag `dybdemodel` og `havbund` er DDM50 (`wms/ddm`, `ddm_50m_dybde_relief` og `ddm_50m_skyggekort_overdrevet`) og opfyldte 1-3 på kortet og i PDF'en. Linket gik til gst.dk's side om Dybdemodellen, hvor vilkårsdokumentet er første link. Det er rettet: kortet, sidepanelet og `/kilder` linker nu direkte til vilkårsdokumentet hos Dataforsyningen. PDF'en beholder den korte gst.dk-adresse, fordi dokumentets URL er 190 tegn %-koder. Vi videredistribuerer ikke DDM-data (WMS live, ingen offline-gemning), så kravet om hentedato gælder ikke.

### Vurderet og fravalgt

| Kilde | Hvorfor ikke |
| --- | --- |
| EMODnet-dybdekurver (`emodnet:contours`) | Kun 50, 100, 200 og 500 m … og tegnes hvide. Intet i Kattegat og Bælterne, lidt i Skagerrak. Dybdemodellen og EMODnet-dybdefarverne, som vi har, viser mere |
| EMODnet Bathymetry som nyt lag | Vi har allerede `emodnet:mean_multicolour` (laget Havdybder Europa). DDM50 er finere i danske farvande; EMODnet bruges kun udenfor |
| Forsvarets skyde- og øvelsesområder | Findes som åbne polygoner (ArcGIS `maritime.gst.dk/…/tojdvhtipl_v2/MapServer`, Forsvarets Joint GEOMETOC Support Centre), men metadata siger kun "Opendata" uden licens, og områderne har ingen navne eller numre i data. Skal afklares med Forsvaret, før det bygges. Om et område er aktivt, står alligevel kun i Efterretninger for Søfarende |
| AIS, vejr, bølger, vandstand, navigationsadvarsler | Live-data hører ikke til et papirkort |
| Dybdekurver for Skanderborg Sø (Skanderborg Kommune) | Kommunale vilkår og én sø. Det historiske indsøkort over Skanderborgsøerne er med |
| Officielle søkort (ENC/papir) | Uændret: ophavsret og salg, kræver reproduktionstilladelse |

Skærmbilleder: `docs/screenshots/soekort-runde2/` (Mossø i Rold Skov 1:5.000, Tjele Langsø 1:25.000, Øresund ud for Hellebæk 1:50.000, bilagssiderne og `/kilder`).
