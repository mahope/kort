# Redesign af kortlag og print: designstudie

**Kort fortalt:** Lagmenuen over kortet er vokset til 22 valg, og basiskort og lag kan vælges to eller tre steder. Værktøjerne ligger bag "Alle indstillinger og værktøjer", som folder sidepanelet ud til 2,7 skærmhøjder. Studiet viser tre bud på, hvordan det kan samles. Alle tre lægger de 15 lag i fire grupper (10 punkter, fordi varianter af samme lag samles), giver basiskortet ét sted og åbner værktøjerne ét ad gangen.

- **A: Start med formålet.** Man vælger Vandretur, Orientering, Sejlads og kano, Historisk eller Eget valg, og så er kort, lag og målestok sat. Bedst for nye brugere. 6-8 dage.
- **B: Ét samlet lagpanel.** Faner til Print, Kortlag og Værktøjer. Lagene er grupperet, og man kan søge i dem. Tættest på i dag og mindst risiko. 5-7 dage.
- **C: Hvor, hvad, print.** Tre trin og en rigtig forhåndsvisning af arket. Mest nyt, langsommere for vante brugere. 7-10 dage.

**Anbefaling: B, med formålene fra A som en række hurtigvalg øverst i Kortlag-fanen.** B løser selve problemet, den lange og dobbelte lagmenu, med mindst omlægning, og søgningen gør, at der kan komme flere lag uden at menuen vokser igen. Printvalgene bliver stående øverst, hvor alle brugere starter i dag. Hurtigvalgene fra A giver spejdere og andre nye brugere et godt kort med ét klik uden at gøre panelet længere. Det giver ca. 7-9 dage i alt. Kombinationen kan ses i prototype B under fanen Kortlag (`skaermbilleder/b-desktop-10-hurtigvalg-sejlads.webp`). Forhåndsvisningen fra C er værd at bygge bagefter som en selvstændig opgave (2-3 dage), uanset hvilken retning der vælges.

## Valgmuligheder

1. A: Start med formålet (6-8 dage)
2. B: Ét samlet lagpanel (5-7 dage)
3. C: Hvor, hvad, print (7-10 dage)
4. B med hurtigvalg fra A (7-9 dage), anbefalet
5. Kun det fælles grundlag nu: saml lagene i grupper, fjern dubletterne og avanceret tilstand (3-4 dage)

Forhåndsvisningen fra C kan lægges oven på 1, 2, 4 og 5.

## Se prototyperne

Åbn `prototyper/index.html` direkte i browseren. Der skal ikke bygges noget. Hver retning har sin egen mappe (`a-formaal/`, `b-lagpanel/`, `c-trin/`) og deler kortbilleder, CSS og JavaScript i `prototyper/_delt/`. Nederst på hver side kan man skifte mellem Mahoje og Solaris og mellem lyst og mørkt tema. `?brand=solaris`, `?theme=dark` og `?ren=1` (uden prototype-bjælken) kan også sættes i adressen. Gør browservinduet smallere end 768 px for at se mobilversionen.

Kortet er et fast billede over Mols Bjerge, og søgning, tegning, offline og PDF er attrap. Se "Bevidste forenklinger" i `sammenligning.md`.

## Indhold

| Fil | Indhold |
|---|---|
| `analyse.md` | Alle funktioner i dag, hvor de bor, dubletter og det, der er svært at finde |
| `sammenligning.md` | Hver retning: fordele, ulemper, byggeomfang og hvad der skal flyttes i koden |
| `prototyper/` | De tre klikbare prototyper og en oversigtsside |
| `skaermbilleder/nu-*` | Appen i dag, desktop 1440×900 og mobil 390×844 |
| `skaermbilleder/a-*`, `b-*`, `c-*` | Prototyperne på desktop og mobil, lyst og mørkt, Mahoje og Solaris |
| `skaermbilleder/touchmaal-rapport.json` | Konsolfejl og touch-mål under 44 px pr. skærmbillede |
| `scripts/current.mjs` | Tager skærmbilleder af appen og kortbillederne til prototyperne |
| `scripts/protos.mjs` | Tager skærmbilleder af prototyperne og tjekker touch-mål |

Scripts køres med Playwright: `PW_DIR=<mappe med playwright> node scripts/protos.mjs <ud-mappe> [a|b|c]`.

## Kildeangivelse

Kortbillederne i `prototyper/_delt/kort/` er skærmbilleder fra kort.mahoje.dk: © Klimadatastyrelsen (CC BY 4.0), © OpenStreetMap-bidragydere (ODbL), sømærker © OpenSeaMap og dybder fra EMODnet Bathymetry (CC BY 4.0). Ikke til navigation. Danmarks Dybdemodel er ikke brugt i billederne. Prototyperne viser krediteringen på kortet med link til `/kilder`.

## In English

Design study for a UI/UX redesign of the layer menu, print settings and tools. Three clickable static prototypes (A: purpose presets, B: one grouped layer panel with search and tabs, C: a where/what/print step flow with a real print preview), an analysis of today's UI and a comparison with build estimates. Recommendation: B with A's presets as quick picks. No application code is changed.
