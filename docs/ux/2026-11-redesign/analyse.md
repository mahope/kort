# Analyse: funktioner og placering i dag

Status for kort.mahoje.dk og kort.solaris.dk den 23. november 2026 (`main` ved a1d2ad4). Skærmbillederne er taget af den kørende app over Mols Bjerge i 1440×900 og 390×844. De ligger i `skaermbilleder/nu-*.webp`.

## Hvor bor hvad

Appen har tre steder, man kan indstille ting: sidepanelet (på mobil et bottom sheet), Kortlag-menuen over kortet og selve kortet.

### Sidepanelet, altid synligt

| Rækkefølge | Indstilling | Bemærkning |
|---|---|---|
| 1 | Find sted | Adressevælger og stednavne |
| 2 | Målestok | 7 faste værdier og "Andet" |
| 3 | Papirformat | A5 til A0, A1/A0 har en note om trykkeri |
| 4 | Orientering | Stående eller liggende |
| 5 | "Dækker ca. 4,8 km × 6,9 km" | Afledt af de tre valg ovenfor |
| 6 | Basiskort | 7 radioknapper, kortstil som rullemenu ved Skærmkort |
| 7 | Koordinatgitter | Ved til: koordinatsystem (6), gitterstørrelse, kantkoordinater, talformat, zone |
| 8 | Misvisning i printet | Til som standard |
| 9 | Forhåndsvisning | Et tomt rektangel i papirets form |
| 10 | Værktøjer | 6 genveje: Tegn og mål, GPX og KML, Flere ark, Højdekurver og lag, Del link, Gem offline |
| 11 | "Alle indstillinger og værktøjer" | Slår avanceret tilstand til, huskes i `localStorage` |
| fod | Opsummering og "Download PDF" | Fast nederst |

### Sidepanelet i avanceret tilstand

Ti sektioner under hinanden. Panelet bliver 2.432 px højt på desktop (2,7 skærmhøjder) og 3.312 px på mobil (`nu-mahoje-1440x900-07-avanceret-bund.webp`).

| Sektion | Valg og funktioner | Kode |
|---|---|---|
| Kortlag | De samme 15 lag som i Kortlag-menuen, hvert med en skyder "Gennemsigtighed" | `OverlaySelector.tsx` |
| Import & Lag | Åbn GPX, KML eller GeoJSON (også ved at trække filen ind). Listen "Importerede lag" kan vise, skjule og slette hvert lag | `FileImport.tsx`, `ImportedLayerList.tsx` |
| Tegning & Mål | Tegneværktøj: punkt, linje, polygon, cirkel, rektangel og vælg. Fortryd og gentag, navn på hver tegning, stil (farve, tykkelse, linjestil, fyld), slet én eller alle. Mål: afstand eller areal | `DrawToolbar.tsx`, `StylePanel.tsx`, `MeasureTool.tsx` |
| Højdeprofil | Vises kun, når en tegnet eller importeret linje har højder | `ElevationProfile.tsx` |
| Eksport | Tegninger som GPX, KML eller GeoJSON, og "Kopiér GeoJSON" | `ExportPanel.tsx` |
| Udskrivning | Rotation (skyder og tal, -180° til 180°, nulstil). Opløsning 150, 200 eller 300 DPI. Nordpil og målestokslineal i printet (to afkrydsninger). Flersidet udskrift: ark på tværs (1-5), ark på langs (1-5), overlap 0-20 mm (standard 10 mm), advarsel når kortet er drejet, og samlet størrelse i cm | `BearingSelector.tsx`, `DpiSelector.tsx`, `PrintAids.tsx`, `MultiPageSelector.tsx` |
| Offline | Gem printrammen på zoom 12-16 med valgfri lag, fremdrift med pause og fortsæt, liste over gemte områder. Skærmkort, OpenStreetMap og kortene uden for Danmark kan ikke gemmes | `OfflinePanel.tsx` |
| Del | "Del kort" kopierer et link med sted, målestok, papir og lag | `ShareButton.tsx` |
| Bogmærker | Gem stedet, gå til et bogmærke, slet, og eksportér eller importér alle som fil | `BookmarksPanel.tsx` |
| Historik | Tidligere udskrifter: gå til samme kort igen, eller ryd hele historikken | `HistoryPanel.tsx` |

I prototyperne flytter alle valgene fra Udskrivning ind under printflowet ("Flere printvalg"). Overlap og advarslen om rotation står ved "Flere ark", fordi de kun gælder dér.

### Kortlag-menuen over kortet

7 basiskort (med stilknapper ved Skærmkort) og 15 ekstra lag: fire slags højdekurver, skyggekort, stednavne, matrikelskel, tre havdybdelag, sømærker, højdekurver Norge, sødybder, historiske indsøkort og skibsvrag. Hvert tændt lag får en skyder. Listen er 22 valg lang og skal scrolles (`nu-mahoje-1440x900-02-kortlag.webp` og `-03-kortlag-bund.webp`).

### På kortet

Zoom, nulstil nord, min position, målestokslinje, kreditering med link til `/kilder`, koordinat ved sigtekorset, zoom til printområde, skiltet "Må ikke bruges til navigation" ved havlag, popup ved indsøkort og tastaturgenveje til tegneværktøjerne.

## Dubletter

1. **Basiskortet kan vælges to steder**, i Kortlag-menuen og i sidepanelet, med to forskellige kontroller til kortstilen (knapper i menuen, rullemenu i panelet).
2. **De ekstra lag har tre indgange**: Kortlag-menuen, sektionen "Kortlag" i avanceret tilstand og genvejen "Højdekurver og lag", som åbner avanceret tilstand og hopper til sektionen. Samme skyder hedder "Synlighed" i menuen og "Gennemsigtighed" i panelet.
3. **Genvejene og avanceret tilstand peger på det samme.** Fem af seks genveje åbner bare avanceret tilstand og ruller ned. Det er en lappeløsning på, at værktøjerne var svære at finde.
4. **Printet beskrives fire gange**: rammens mærke på kortet, "Dækker ca.", det tomme forhåndsrektangel og opsummeringen over knappen. Kun opsummeringen og "Dækker ca." siger noget, man ikke kan se i forvejen.
5. **Fire måder at gemme på**: Bogmærker, Historik, Del link og Gem offline ligger hver for sig, og to af dem kun i avanceret tilstand.

## Svært at finde eller forstå

- **Højdekurver kommer i fire varianter** med ækvidistancen som navn ("0,5 m", "2,5 m, roligere"). Man skal vide, hvad ækvidistance er, for at vælge. "Højdekurver Norge" vises også, når kortet står i Danmark.
- **Havlagene er navngivet efter kilden** (EMODnet, Dybdemodel 50 m) i stedet for efter, hvad man ser. Tre lag viser næsten det samme.
- **Flere ark, rotation, opløsning og nordpil** ligger under "Udskrivning" i avanceret tilstand. "Flere ark" har en genvej, de andre har ikke.
- **Bogmærker og historik** findes kun i avanceret tilstand, selvom de er det, en spejderleder bruger, når samme kort skal printes igen.
- **Avanceret tilstand huskes.** Har man slået den til én gang, møder man den lange liste ved næste besøg.
- **På mobil åbner Kortlag-menuen i den lille kortflade over arket** (ca. 440 px høj på 390×844). Listen scrolles i et lille vindue, og sigtekorset ligger oven på teksten (`nu-mahoje-390x844-02-kortlag.webp`).
- **Forhåndsvisningen viser ikke kortet**, kun papirets form. Den hjælper ikke med at afgøre, om udsnittet er rigtigt.
- **Solaris:** `--text-muted` (#a8a29e) giver 2,5:1 mod hvid og består ikke AA. Den bruges til små tekster som "Bygget af mahoje.dk". Solaris har ingen brandskrift og falder tilbage til systemets skrift.

## Hvem bruger hvad

| Brugere | Typisk kort | Det de leder efter |
|---|---|---|
| Spejdere og spejderledere | 1:25.000 eller 1:10.000, A4, UTM-gitter | Gitter, misvisning, flere ark til gulvkort, samme kort igen |
| Orienteringsløbere og trænere | 1:10.000 eller 1:15.000, kurver for hver 2,5 m | Kurver, skyggekort, dæmpet baggrund |
| Vandrere | 1:25.000 eller 1:50.000 | Topografisk kort, GPX-rute, højdeprofil, offline |
| Kano, kajak og sejlere | 1:50.000, liggende | Havdybder, sømærker, sødybder |
| Hjemmeværnet | MGRS, 1:25.000 | Koordinatsystem, kantkoordinater |

Fællesnævneren er, at næsten alle ændrer målestok og papir, og at de fleste kun skal bruge ét eller to ekstra lag. Lagmenuen er i dag bygget til den sjældne bruger, der vil se alle 15 på én gang.

## Konsekvenser for redesignet

1. Ét sted til kort og lag. Basiskortet skal kun kunne vælges ét sted.
2. Lagene grupperes efter formål (Terræn, Hav og sø, Navne og skel, Gitter og kompas), og varianter af samme lag samles i ét punkt med et valg indeni. De 15 lag bliver til 10 punkter, og gitteret flytter ind som den 11. Højdekurver Norge bliver en del af "Højdekurver" og skifter selv kilde i Norge.
3. Værktøjerne åbnes ét ad gangen, i stedet for at avanceret tilstand folder alt ud.
4. Printvalgene bliver ved med at være det første, man ser. Det var en bevidst beslutning i `Sidebar.tsx`, og den holder stadig.
5. Forhåndsvisningen skal enten vise kortet eller fjernes.
