# PoC #39: egne kortfliser som PMTiles

Dato 5/11-2026. Gren `poc/39-pmtiles`. Må ikke merges, ingen PR. Store filer ligger uden for git i `~/dev/data/poc-pmtiles/` på agent-worker.

## 1. Licens og vilkår

**Konklusion: DTK25 må lovligt kopieres, lagres og videredistribueres. Men PoC'en kunne ikke bygges af DTK25-fliser, fordi opgaven kun tillod appens offentlige token til "nogle få fliser". Derfor er PMTiles-pakken bygget af OpenStreetMap-data (ODbL). DTK25 er målt på 20 stikprøve-fliser, og resten er ekstrapoleret.**

| Spørgsmål | Svar | Kilde |
|---|---|---|
| (a) Hente i bulk | Ja for dataene. Vilkårene begrænser ikke antal. Tjenestens egne brugsgrænser (rate limit, token) fandt jeg ikke tal for og har ikke testet. | [Vilkår for brug af frie geografiske data, nov. 2022 (PDF)](https://www.SDFE.dk/Media/638052180760639799/Vilk%C3%A5r%20for%20brug%20af%20frie%20geografiske%20data%2C%20opdateret%20november%202022.pdf) |
| (b) Lagre | Ja | samme |
| (c) Videredistribuere fra egen server/CDN | Ja, samme vilkår gælder videre | samme |
| (d) Attribution | Kræves | samme |

Citater: "verdensomspændende, gratis, ikke-eksklusiv og i øvrigt ubegrænset brugsret" og "kopieres, distribueres og offentliggøres". Om videregivelse: "Ovennævnte vilkår gælder også, hvis brugeren videregiver data fra Myndigheden til tredjepart."

Attribution: teksten "Indeholder data fra Styrelsen for Dataforsyning og Infrastruktur", datasættets navn og enten hentetidspunkt eller at det er en datatjeneste. Brugeren skal også stille en kopi af vilkårene eller et link til rådighed for tredjepart. Navnet er fra 2022-vilkårene; myndigheden hedder i dag Klimadatastyrelsen, så formuleringen skal bekræftes.

DTK25 er på listen over frie data: [Bekendtgørelse om fri anvendelse af data (Retsinformation, PDF)](https://www.retsinformation.dk/api/pdf/144716). Citat: "stilles frit til rådighed for offentlige myndigheder, virksomheder og personer", med "DTK/Kort25" og "DTK/Skærmkort" under topografiske kort. Ortofoto er "FOT ortofoto". Dokumentet jeg hentede er mærket "BEK nr 1430 af 23/12/2012 (Historisk)" med senere ændring BEK 1405 af 30/11/2018. **Jeg har ikke kunnet bekræfte, at det er den gældende udgave** (Klimadatastyrelsen har overtaget området).

Risici i vilkårene: "Myndigheden garanterer ikke den fortsatte tilrådighedsstillelse af data", og de kan ændres når som helst (allerede downloadede data kan fortsat bruges på de gamle vilkår). Det er en reel fordel ved egne fliser: de overlever en nedlukning af WMS'en.

Ikke fundet/ikke undersøgt: om DTK25 kan hentes som filer (GeoTIFF) fra Dataforsyningen/Datafordeler. Det er den rigtige vej til en produktions-pyramide (GDAL til fliser, derefter PMTiles). At høste ca. 490.000 GetMap-kald fra live-WMS'en bør ikke gøres, og skal i hvert fald aftales. Det er et spørgsmål til Mads/Dataforsyningen.

**Kilden til PoC-pakken:** Protomaps' daglige basemap-build (`https://build.protomaps.com/20261103.pmtiles`, OSM-data, ODbL, schema "Protomaps Basemap" 4.15.2). Attribution "© OpenStreetMap" er indbygget i arkivets metadata og vist i testsiden. Kun de ønskede fliser er hentet med `pmtiles extract` (HTTP range, 2 tråde, 51 requests, 35 MB). OSM-vektordata er ikke et DTK25-kort og ligner det ikke: det er et andet produkt.

## 2. Pakken og byggetid

Kommando (go-pmtiles v1.31.2):

```
pmtiles extract https://build.protomaps.com/20261103.pmtiles nsj-vector.pmtiles \
  --bbox=11.9,55.8,12.6,56.2 --minzoom=0 --maxzoom=15 --download-threads=2
```

Byggetid 16 s. Resultat `nsj-vector.pmtiles`: **33,0 MB** (33.031.766 bytes), 5.780 adresserede fliser, gzip internt. Basemap'et har kun fliser til z15; z16 vises ved overzoom i klienten. Området er ca. 1.940 km² inkl. meget hav (Øresund og Kattegat).

| Zoom | Fliser | gz (est., gen-gzip) | Rå MVT |
|---|---|---|---|
| 0-9 | 13 | 0,94 MB | 1,3 MB |
| 10 | 9 | 0,40 MB | 0,58 MB |
| 11 | 25 | 0,82 MB | 1,2 MB |
| 12 | 81 | 1,8 MB | 2,4 MB |
| 13 | 306 | 4,1 MB | 5,3 MB |
| 14 | 1.122 | 7,7 MB | 9,9 MB |
| 15 | 4.224 | 17,5 MB | 29,0 MB |
| Sum | 5.780 | 33,2 MB | 49,8 MB |

(Filens 33,0 MB er mindre end summen, fordi identiske fliser deduplikeres.) Rå tal: `zoomstats-vector.txt`. Kommandoen til den tabel er `scripts/zoomstats.mjs` i datamappen. gz-kolonnen er genberegnet, fordi pmtiles-biblioteket pakker ud.

**Opdateringsvej:** vektor kan genbygges på 16 s pr. udsnit fra Protomaps' dagsbuild (eller selv med planetiler). For DTK25 findes ingen opdateringsrytme i det jeg har målt.

## 3. Målinger

Alt kørt på agent-worker mod localhost. Serveren er `docs/poc-pmtiles/serve.mjs` (Range, ETag, `Cache-Control: public, max-age=86400`). **Tallene er loopback og siger intet om CDN-latens**; de viser antal requests og bytes, ikke netværkstid.

| Mål | PMTiles (lokalt) | Live WMS DTK25 (20 kald, 0,7 s mellemrum, sekventielt) |
|---|---|---|
| Første flise | 12,6 ms (cold, inkl. header og rodmappe) | 150 til 300 ms (typisk, én udløber 1.673 ms) |
| 24 fliser (6x4 z14), cold | 32 ms, 25 requests, 420 KB på tråden | ikke målt (kun 9 fliser) |
| 24 fliser, warm (header og mapper cachet) | 16 ms, 24 requests, 403 KB | ikke målt. Ingen cache-headers, så hvert kald går igen. |
| Hele udsnittet z10-15 (5.767 fliser) | 1,5 s, 5.768 requests, 32,2 MB | ikke målt (bevidst, ingen belastning) |
| Størrelse pr. flise | vektor z14: gns. 7 KB gz over hele udsnittet, ca. 17 KB i bymidten (viewport-målingen) | PNG 130 til 183 KB (gns. 166 KB), JPEG 19 til 28 KB (gns. 25 KB) |
| Svarheaders | `Accept-Ranges: bytes`, `ETag`, `Cache-Control` (sat af min server) | **ingen** `Cache-Control`, `ETag`, `Last-Modified` eller `Accept-Ranges` |

Ni z14-fliser i træk fra WMS: PNG 3,3 s i alt (1,6 s uden udløberen), JPEG ca. 0,1 s hver. JPEG er 6,6 gange mindre end PNG for samme flise (bekræfter #26).

**Browser (Chrome headless, localhost, side `/poc-pmtiles?z=14`):** kortet er færdigindlæst efter ca. 1,2 s inkl. sideindlæsning (poll hvert 500 ms), 13 range requests, 282 KB. Skærmbillede: `screenshot-hilleroed-z14.png` (Hillerød, z14, rigtigt vektorkort med veje, bygninger, vand). Prøvet først med `--screenshot` og `--virtual-time-budget`: tog billedet før fliserne kom. Løst med råt CDP i stedet. Playwright 1.64.1 og Lighthouse findes ikke i `~/dev/data/audit-2026-11-05/tools` (mappen findes ikke på agent-worker), og `~/dev/pw-chrome.sh` mangler. Jeg brugte systemets `google-chrome` mod localhost. Lighthouse er ikke kørt.

**Sådan arbejder `pmtiles://`:** første request er `Range: bytes=0-16383` (header + rodmappe, 206). Derefter ét range-request pr. flise (typisk 15 til 36 KB i vektor), og ved behov en mappe-request. Fliserne i filen ligger i Hilbert-rækkefølge, så naboer ligger tæt. Mapper caches i `PMTiles`-instansen, så warm-kørslen sparer ét request. Kræver server med `Accept-Ranges`, `Content-Range` og, ved cross-origin, CORS med `Range`-header (og `ETag` eksponeret, så biblioteket opdager at filen er skiftet). På Cloudflare R2 og Bunny er det indbygget.

**Bundle:** pmtiles **4.5.0** (pinnet, udgivet 2026-08-10, 87 dage gammel). Vurdering: vedligeholdt af Protomaps (bdon), én afhængighed (`fflate`), ingen install-scripts (kun `build`/`test`), installeret med `--ignore-scripts`. Konklusion: installér med `--ignore-scripts`. Chunken indeholdende pmtiles og fflate er **39,5 KB rå, 14,8 KB gz**. Den ligger kun i `/poc-pmtiles`-ruten (dynamisk import); forsidens HTML refererer den ikke. Jeg har ikke målt en før/efter-sammenligning af forsidens JS, kun at der ikke er nogen reference.

Værktøjet `pmtiles` (go-pmtiles v1.31.2, 2026-07-22) er hentet som release-binary fra GitHub over TLS. **SHA256 er ikke verificeret mod en officiel checksumfil** (filen jeg hentede var tom for den platform).

**Lokal CSP:** appens CSP (`connect-src 'self' https:`) blokerer `http://localhost`. `next.config.ts` er ikke rørt. I stedet proxyer `serve.mjs` både Next og `/tiles/*` på samme origin (port 8099). `/poc-pmtiles` bruger `?src=<url>` til at pege på et andet arkiv. Produktion kræver, at CDN-domænet tilføjes til `connect-src` (og `img-src` for raster), samt CORS på CDN'et.

## 4. Danmark: størrelse og pris

Antagelser: Danmark ca. 43.000 km² land. En z14-flise ved 56°N dækker ca. 1,87 km² (256 px, ca. 9,6 m/px ved ækvator, ca. 5,3 m/px her), og hvert zoomtrin firedobler. DTK25 udstilles i 508 DPI (ca. 1,25 m/px), så z16 (ca. 1,3 m/px) er den nyttige øvre grænse.

| Lag | Antagelse | Størrelse DK | Sikkerhed |
|---|---|---|---|
| Vektor (OSM/Protomaps) z0-15 | 33 MB / 1.940 km² = 17 KB/km² (hav inkluderet i nævneren) | ca. **0,7 til 1,5 GB** | Middel. Byer er tungere end Nordsjælland. Protomaps' eget DK-udtræk bekræfter størrelsesordenen, men er ikke målt her. |
| Dataforsyningens Skærmkort (vektor) | ikke målt (kun 1 stikprøve ville kræve token-brug), forventes som OSM-vektor | ca. 1 til 3 GB | Lav |
| DTK25 JPEG, 256 px, z7-16 | ca. 491.000 fliser (z16: 368k, z15: 92k, z14: 23k, resten <10k) x 25 KB (målt på 9+1 fliser) | ca. **12 GB** (10 til 17 GB) | Middel. Havfliser sparet, byområder tungere. |
| DTK25 PNG | x 6,6 | ca. 80 GB | Middel |
| Ortofoto JPEG z7-16 | ca. 30 KB/flise (ikke målt; antaget) | ca. 15 GB; z17: ca. 60 GB; z18: ca. 235 GB | Lav, faktor 2 |

Ortofoto til print (z17-18) er det eneste lag, der bliver stort. Ikke realistisk i første omgang.

Priser (opslået 5/11-2026, intet bestilt):

| Leverandør | Pris | Kilde |
|---|---|---|
| Cloudflare R2 Standard | $0,015 pr. GB-md. Class A $4,50/mio., Class B $0,36/mio. (10 mio. Class B og 10 GB gratis pr. md.). **Ingen egress-gebyr.** | [R2 pricing](https://developers.cloudflare.com/r2/pricing/) |
| Hetzner Storage Box | BX11 1 TB: € 3,20/md., BX21 5 TB: € 10,90, BX31 10 TB: € 20,80 (ekskl. moms) | [Hetzner](https://www.hetzner.com/storage/storage-box/) |
| Bunny CDN | Standard: $0,01/GB (EU og Nordamerika), $0,03/GB (Asien og Oceanien) | [Bunny pricing](https://bunny.net/pricing/) |

Eksempler pr. måned:
- DTK25 JPEG (12 GB) + vektor (1,5 GB) på R2: 13,5 GB x $0,015 ≈ **$0,20**. Med 10 GB gratis ca. $0,05. Ortofoto z17 (60 GB) lægger ca. $0,90 til.
- Trafik: en sidevisning (24 JPEG-fliser) ≈ 0,6 MB. 100.000 visninger = 60 GB. R2: $0 egress. Operationer: ca. 25 requests pr. visning = 2,5 mio. Class B, inden for de 10 mio. gratis. Bunny: 60 GB x $0,01 = $0,60.
- Hetzner Storage Box er backup-lager (SFTP/WebDAV/SMB), ikke en HTTP-origin med range og cache. Bruges kun som kilde bag en server/CDN, og det er ikke undersøgt her.

Trafiktal for appen i dag kender jeg ikke. Tallene er regneeksempler.

Ikke prissat: tid og drift. Opbygning af DTK25-pyramiden (hentning, fliseskæring til z16, JPEG, opdatering) er arbejde; hvor meget afhænger af, om filer kan hentes (se afsnit 1).

## 5. Plan for offline (#36, #17)

Typisk printområde 10 x 10 km = 100 km² (skøn ud fra tallene ovenfor):

| Lag | Fliser | Størrelse |
|---|---|---|
| Vektor z0-15 | ca. 100 | ca. 1,7 MB |
| DTK25 JPEG z≤15 | ca. 280 | ca. 7 MB |
| DTK25 JPEG z≤16 | ca. 1.140 | ca. 28 MB |
| Ortofoto JPEG z≤17 | ca. 4.500 | ca. 135 MB (antaget 30 KB) |

Foreslået flow:
1. **Gem område:** brugeren tegner/vælger en ramme (printrammen kan genbruges). Appen beregner flisenavnene for bbox og zoom 10 til 16 og viser størrelsen før hentning.
2. **Hentning:** klienten bruger `pmtiles`-biblioteket mod den store fil (range requests, naboer ligger tæt i Hilbert-rækkefølge, så requests kan slås sammen). Hentes sekventielt eller 2 til 4 ad gangen, med fremdrift og mulighed for at afbryde.
3. **Lagring:** to varianter. (a) Fliserne skrives ét for ét i Cache API / IndexedDB, og en egen `Source` i pmtiles læser dér først. (b) Serveren eller et trin forud leverer et lille `pmtiles extract`-arkiv pr. område eller kommune, som gemmes som én blob i OPFS/IndexedDB og læses via en blob-baseret `Source`. (b) er mest robust, men kræver en server-ende. Anbefalet start: (a), fordi den ikke kræver ny server.
4. **Servicearbejderen (#36)** cacher app-skallen. Cache API kan ikke svare på Range-forespørgsler uden ekstra logik; derfor skal fliserne ikke ligge som rå arkiver i service workerens cache.
5. **Fald tilbage uden net:** kortlaget forsøger lokal lagring først; er fliseområdet dækket, vises kortet uden net. Uden dækning vises et tydeligt "ikke gemt offline"-felt og ikke et tomt kort. Print (PDF) bruger samme kilde, så udskrift af et gemt område virker også offline. `navigator.storage.persist()` anmodes ved første gem, ellers kan især iOS rydde lageret.

## 6. Anbefaling

**Anbefaling: C, men i to trin, og kun hvis licens og filadgang bekræftes.**

- Vektor/Skærmkort-pakken (afsnit 2-3) virker og er lille (ca. 1 til 3 GB for hele landet). Her giver egen hosting klar gevinst: cache-headers, få requests, mulig offline, uafhængighed af WMS-nedlukninger. Hosting koster få dollar pr. måned. Det er et lavt-risiko første skridt.
- DTK25 som JPEG-pyramide z7-16 er realistisk i størrelse (ca. 12 GB, under $1/md. på R2). Men den kræver, at råfiler kan hentes (ikke WMS-høst), og et opdateringsprojekt. Indtil det er afklaret er **A** (WMS + JPEG + service worker-cache, #26 og #36) den billigste vej til hurtigere og offline-kapabelt kort uden egen infrastruktur.
- Ortofoto ikke i egen pyramide.

**Beslutninger, der kræver Mads:**
1. Skal vi anvende OSM-vektor (anden stil end Skærmkort/DTK25) eller bygge Skærmkort selv ud fra Dataforsyningens egne vektorfliser (kræver afklaring af, hvordan de må downloades i bulk)?
2. Kontakt til Dataforsyningen/Klimadatastyrelsen: kan DTK25 hentes som filer, og er bekendtgørelsen om fri anvendelse stadig gældende? Er der brugsgrænser for tokens?
3. Hjemmeværnets afhængighed af egen infrastruktur (drift, overvågning): ok, eller skal WMS bevares som fallback?
4. Hosting (R2/Bunny/andet) og konto: ejer skal være Mahope, CVR 39413892.
5. Grænse for lager, som issuets beslutningsport kræver.

## Filer

- På grenen: `/poc-pmtiles` (side), `docs/poc-pmtiles/serve.mjs`, `measure.mjs`, `measure-output.txt`, `zoomstats-vector.txt`, skærmbillede. Afhængighed `pmtiles@4.5.0` i `package.json`. Standardadfærd uændret.
- Uden for git (`~/dev/data/poc-pmtiles/`): `nsj-vector.pmtiles`, `wms-sample/` (20 DTK25-fliser og headers), `lic/` (vilkårs-PDF'er, WMS-capabilities), `node/` (pmtiles-bibliotek til scripts), `bin/` (pmtiles CLI).
- Kør: `next build`, derefter `node docs/poc-pmtiles/measure.mjs <datamappe> <bibliotekmappe>`.
