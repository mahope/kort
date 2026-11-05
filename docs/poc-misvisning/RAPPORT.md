# PoC: misvisning på kortet og i printet (issue #38)

Gren: `poc/38-misvisning` (fra `main` e7aa242). Ikke til merge, ingen PR.

## Model og kilde
- **WMM2025** (NOAA/NCEI og BGS, offentligt domæne, gyldig 2025,0 til 2030,0) med egne indlejrede koefficienter i `src/lib/geo/declination.ts`. Ingen ny npm-pakke.
- Koefficienterne er kontrolleret mod NOAA's officielle `WMM.COF` (WMM2025COF.zip fra ncei.noaa.gov): 90 rækker, 0 afvigelser.
- Hvorfor egen kode: ca. 3 KB gz (7,8 KB rå kildekode inkl. 90 koefficientrækker). Pakken `geomagnetism@0.2.0` (Apache-2.0, ingen afhængigheder, ingen install-scripts, seneste version dec. 2024) indeholder fire epoker og er 72 KB udpakket, og den ville skulle vedligeholdes af en enkelt udvikler. Jeg har kun brugt den som uafhængig reference (hentet med `npm pack` i /tmp, ikke installeret i repoet). Konklusion for pakker: **lad være** med at installere.
- Udløb: en test fejler fra 1/1-2030, og modellen kaster `RangeError` uden for 2025-2030 (diagrammet udelades så, og tallet på skærmen skjules).

## Tabel: NOAA mod appen, 5/11-2026
**Vigtigt:** NOAA's beregner og web-API kræver nu en registreret nøgle (e-mail). Jeg har ikke oprettet en konto, så jeg har IKKE aflæst de tre punkter fra NOAA-beregneren. Kravet i #38 er derfor ikke opfyldt bogstaveligt; Mads skal indtaste tre værdier fra https://www.ngdc.noaa.gov/geomag/calculators/magcalc.shtml (konstanterne står øverst i `declination.test.ts`).
I stedet er algoritmen låst fast på to måder:
1. NOAA's officielle testværdier (`WMM2025_TEST_VALUES.txt`): 12 rækker, deklination afviger højst 0,02° (testen kræver <0,02°).
2. Uafhængig implementation (`geomagnetism@0.2.0`, samme koefficienter) for de tre punkter:

| Punkt | Reference | Appen | Afvigelse |
|---|---|---|---|
| København (55,6761 N, 12,5683 Ø) | 5,283° Ø | 5,28° Ø | < 0,02° |
| Skagen (57,7226 N, 10,5881 Ø) | 4,811° Ø | 4,81° Ø | < 0,02° |
| Rønne (55,1037 N, 14,7065 Ø) | 5,873° Ø | 5,87° Ø | < 0,02° |

(Appen: testen kræver afvigelse <0,02° og tåler højst 0,3° mod NOAA, når værdierne er indsat.)

## Hvad er vist hvor
- **Kortet:** i "Koordinat ved sigtekorset" en linje "Misvisning 4,6° Ø (2026)", opdateret når kortet har stået stille 200 ms (ca. `moveend`). Skærmbillede: `kort-app.png`.
- **Printet:** boks nederst til højre inde i kortfladen (marginen på 10 mm er for smal og bruges til gitterkoordinater): retvisende nord (solid), gitternord (stiplet; kun når gitteret er slået til, med meridiankonvergens fra gitterets zone), magnetisk nord, tal og årstal. Vinklerne er i rigtig størrelse, så de er små (ca. 3° og 5°). Diagrammet følger kortets drejning (bearing).
- **Indstilling:** "Misvisning i printet" i sidepanelet (standard: til), `printStore.showDeclination`.
- Tegnes på hver side i multi-page, med midtpunkt pr. side.

## Formater
Test (`declinationDiagram.test.ts`) tjekker for A5, A4, A3 og A2, stående og liggende, at boksen ligger inde i kortet og ikke rører skalabjælke (op til 40 mm fra venstre) eller nordpil (øverst til højre). Attributionen står i marginen under kortet og berøres ikke. Ingen kollisioner fundet i noget format.
Beviser i `docs/poc-misvisning/`: `pdf-A4-portrait`, `pdf-A4-landscape`, `pdf-A3-portrait`, `pdf-A2-portrait`, `pdf-A4-portrait-udengitter` (uden gitternord), `pdf-A4-portrait-drejet` (30° rotation), `detalje-A4-portrait`.
**Begrænsning:** PDF-siderne er genereret med den rigtige diagramfunktion og layout, men med en ensfarvet kortflade og stand-ins til skalabjælke/nordpil/attribution. Jeg har ikke kørt hele print-flowet i en browser (ingen Playwright på agent-worker, kun skærmbilledet af appen). Multi-page er kun dækket af koden (samme kald pr. side), ikke af en renderet fil.

## Kontrol
`npx vitest run`: `Tests  171 passed (171)`. `npm run build`: ok. `npx tsc --noEmit`: ren. `npm run lint`: `✖ 6 problems (0 errors, 6 warnings)`, alle 6 findes allerede på main (ingen i mine filer).

## Før produktion
- Indsæt rigtige NOAA-værdier for de tre punkter (kræver nøgle) og kør testen.
- Tjek diagrammet visuelt på et rigtigt print (A4-boks og læsbarhed af 4,5 pt-tekst; evt. større skrift på A2).
- Meridiankonvergens er førsteordens (fejl langt under 0,01° i Danmark); for Bornholm i zone-32-tilstand bruges zone 32 som gitteret.
- Vedligehold: ny WMM-model udkommer ved udgangen af 2029 (testen minder om det).
- Hvis rammens midtpunkt skal vises for hele kortet ved store formater, er én værdi nok i Danmark (variation under 1°).
- Overvej at gemme valget i URL/lokal lagring som øvrige indstillinger.

## Anbefaling til #38
Vis **begge**: tal på skærmen (billigt, nyttigt til kompas) og diagram i printet, med gitternord kun når gitteret er på. Brug **egne indlejrede WMM2025-koefficienter** (3 KB, ingen afhængighed, offentligt domæne) frem for pakke.

## Foreslået PR-titel (hvis det senere skal ind)
"Vis misvisning på kortet og i printet (WMM2025)"
