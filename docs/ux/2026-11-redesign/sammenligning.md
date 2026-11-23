# Sammenligning af de tre retninger

Alle tre prototyper ligger i `prototyper/` og åbnes direkte i browseren (`prototyper/index.html`). Skærmbillederne ligger i `skaermbilleder/` og er navngivet `<retning>-<desktop|mobil>-<nr>-<tilstand>.webp`.

## Fælles for alle tre

Det her er med i alle retningerne. Det kan også bygges alene, hvis ingen af retningerne vælges.

- **Én lagmodel med grupper og varianter.** De 15 lag bliver til 10 punkter i fire grupper: Terræn, Hav og sø, Navne og skel samt Gitter og kompas. "Højdekurver" har en variant (0,5 m, 2,5 m, 5 m med tal, 10 m med tal) i stedet for fire punkter, og "Havdybder" har Danmark eller Europa. URL-koderne (`ov=`) beholdes, så gamle links virker.
- **Basiskortet vælges ét sted**, som miniaturer med billede af kortet i stedet for en liste med navne.
- **Værktøjerne åbnes ét ad gangen** i sidepanelet med en tilbageknap. Avanceret tilstand og de seks genveje forsvinder.
- **Advarslen ved havlag** står både i lagpanelet og som skilt på kortet, som i dag. Krediteringen på kortet skifter med kilden.
- **Solaris** får en grå tekstfarve, der består AA (#6b6560 i stedet for #a8a29e), og den valgte tilstand får en mørk kant, så valget ikke kun vises med gul.
- Touch-mål på mindst 44 px, synligt fokus, piletaster i radiogrupper og faner, og Escape lukker paneler. Testscriptet `scripts/protos.mjs` fandt kun to slags mål under 44 px på mobil: linket "Datakilder" i krediteringen (25 px, som i dag) og krydset på et aktivt lag (40 px). Begge ligger over AA-minimum på 24 px.

Byggeomfang for det fælles grundlag: **3-4 dage**.

## A: Start med formålet

Sidepanelet spørger først "Hvad skal kortet bruges til?" med fem valg: Vandretur, Orientering, Sejlads og kano, Historisk og Eget valg. Et valg sætter baggrundskort, lag, målestok, papir og gitter. Under det står et kort med det aktuelle kort og de aktive lag og en knap til panelet "Kort og lag", som også åbnes fra kortet. Printvalgene kommer derefter, og "Flere printvalg" kan foldes ud.

Skærmbilleder: `a-desktop-01-start`, `-02-kort-og-lag`, `-03-formaal-sejlads`, `-04-print`, `-05-vaerktoej`, `-06-start-moerk`, `-07-solaris`, `-08-solaris-moerk` og mobil `a-mobil-01` til `-07`.

**Fordele**
- Ikke-tekniske brugere får et godt kort med ét klik og behøver ikke vide, hvad ækvidistance eller UTM er.
- Forvalgene lærer brugeren, hvad appen kan (sejlads, historiske kort), uden at der skal stå en forklaring.
- Lagpanelet er kun ét sted, og det står i det, hvilket formål der satte valgene.

**Ulemper**
- Forvalgene skal vedligeholdes, og de passer aldrig helt (orienteringsløbere vil have 1:15.000, hjemmeværnet MGRS).
- Det er uklart, hvad der sker med et formål, når man ændrer noget bagefter. Prototypen skifter til "Eget valg", men det kræver forklaring.
- Sidepanelet bliver længere på desktop, før man når printvalgene, og på mobil ligger målestok og papir under folden.

**Byggeomfang:** 3-4 dage oven på grundlaget, i alt **6-8 dage**.

**Det skal flyttes i koden:** nyt `src/constants/presets.ts` (kun eksisterende `OverlayId`'er, testet), en `PurposePicker` i `src/components/sidebar/`, formålet i `uiStore`. `MapControls.tsx` bliver en knap, der åbner et nyt `LayerPanel`. `LayerSelector.tsx` og `OverlaySelector.tsx` slås sammen til det panel.

## B: Ét samlet lagpanel

Sidepanelet får tre faner under søgefeltet: Print, Kortlag og Værktøjer. Print er åben fra start. Kortlag viser de aktive lag som chips, der kan slås fra med et kryds, baggrundskortene som miniaturer og de grupperede lag med søgning ("dybde", "skel", "gitter"). Knappen på kortet åbner Kortlag-fanen. Kortet har desuden et hurtigskift mellem fire baggrundskort på desktop. Fanen viser, hvor mange lag der er tændt.

Skærmbilleder: `b-desktop-01-start`, `-02-kortlag-soeg`, `-03-kortlag-aktive`, `-04-print-flere-valg`, `-05-vaerktoejer`, `-06-vaerktoej`, `-07-start-moerk`, `-08-solaris`, `-09-solaris-moerk` og mobil `b-mobil-01` til `-08`. `b-desktop-10-hurtigvalg-sejlads` og `b-mobil-10-hurtigvalg-sejlads` viser anbefalingen: B med formålene fra A som hurtigvalg øverst i Kortlag-fanen. Den er bygget ind i prototype B.

**Fordele**
- Løser den konkrete klage direkte: lagmenuen er kort, grupperet og kan søges i, og den kan rumme nye lag uden at vokse ud af skærmen.
- Printvalgene er stadig det første, man ser, som i dag. Ingen skal lære en ny arbejdsgang.
- Tydelig placering: alt om kortet under Kortlag, alt om papiret under Print, resten under Værktøjer.
- Mindst nyt i koden, og nemmest at teste.

**Ulemper**
- Faner skjuler indhold. Folk, der ikke ser fanen Kortlag, opdager måske ikke lagene. Tallet på fanen og knappen på kortet afhjælper det.
- Hjælper ikke den ikke-tekniske bruger med at vælge. Grupperne og beskrivelserne gør det lettere, men man skal stadig vide, hvad man vil have.
- Hurtigskiftet på kortet er en lille dublet af baggrundskortene i fanen (bevidst, fordi baggrund er det, der skiftes oftest).

**Byggeomfang:** 2-3 dage oven på grundlaget, i alt **5-7 dage**.

**Det skal flyttes i koden:** `Sidebar.tsx` deles i tre faner, `CollapsibleSection`, `ToolShortcuts` og `advancedMode` udgår. Lagsøgning med æøå-normalisering i `src/lib/` (testet). `ActiveLayerChips` og `BaseQuickSwitch` som nye komponenter. `MapControls.tsx` bliver en knap til fanen. `uiStore` får `activeTab` og `activeTool` i stedet for `advancedMode` og `focusSection`.

## C: Hvor, hvad, print

Sidepanelet er tre trin: Hvor (søg, min position, seneste kort, åbn GPX, bogmærker), Hvad (baggrundskort, lag i grupper og egne tegninger) og Print (forhåndsvisning af arket med kortudsnittet, målestok, papir og flere printvalg). Man kan hoppe frit mellem trinene, og hvert trin viser sit valg under nummeret. "Hent PDF" kan bruges fra alle trin. På print-trinnet bliver kortet uden for rammen mørkere.

Skærmbilleder: `c-desktop-01-hvor`, `-02-hvad`, `-03-print`, `-04-print-flere-ark`, `-05-vaerktoej`, `-06-hvad-moerk`, `-07-solaris-print`, `-08-solaris-moerk` og mobil `c-mobil-01` til `-07`.

**Fordele**
- Forhåndsvisningen viser det rigtige udsnit på papiret med margin, gitter og nordpil. Det er den største forbedring for nye brugere, og den fanger fejl, før PDF'en laves.
- "Seneste kort" øverst gør det let at printe det samme kort igen.
- Rækkefølgen svarer til, hvordan en ny bruger tænker.

**Ulemper**
- Trin gør vante brugere langsommere. De fleste kommer tilbage for at ændre målestok eller sted, og så er "Hvor" og "Hvad" i vejen.
- Det kræver en rigtig forhåndsvisning af kortet. I appen betyder det en lille ekstra MapLibre-gengivelse eller et billede fra PDF-motoren i `src/lib/pdf/`, hvilket er tungt på mobil.
- Det er den største omlægning, og den rører flest tests og skærmbilleder i README.

**Byggeomfang:** 4-6 dage oven på grundlaget, i alt **7-10 dage**. Forhåndsvisningen alene er 2-3 af dagene.

**Det skal flyttes i koden:** `Sidebar.tsx` bliver en trinstyring med tre trin-komponenter. `HistoryPanel.tsx` og `BookmarksPanel.tsx` bliver til listen "Seneste kort" i trin 1. `PrintPreview.tsx` skrives om til at vise kortudsnittet. Det kræver en lavopløst gengivelse fra `src/lib/pdf/` eller en statisk MapLibre. `MapControls.tsx` bliver en knap til trin 2.

## Overblik

| | A: Formål | B: Lagpanel | C: Trin |
|---|---|---|---|
| Løser den lange lagmenu | Ja | Ja, bedst (søgning) | Ja |
| Nye, ikke-tekniske brugere | Bedst | Middel | God |
| Vante brugere | God | Bedst | Langsommere |
| Mobil | God | God | God, men print-trinnet fylder hele skærmen |
| Ét sted til lag | Ja | Ja | Ja |
| Forhåndsvisning af printet | Nej | Nej | Ja |
| Vedligehold | Forvalg skal holdes ved lige | Lav | Forhåndsvisning skal følge PDF'en |
| Byggeomfang i alt | 6-8 dage | 5-7 dage | 7-10 dage |
| Risiko | Middel | Lav | Høj |

## Bevidste forenklinger i prototyperne

- Kortet er ét fast billede (zoom 13,1). Rammen er beregnet fra målestok og papir, men bliver skaleret ned, når den ikke kan være på skærmen. Kun nogle lag ændrer billedet (havdybder og sømærker, højdekurver, Skærmkortets stil).
- Søgning, zoom, position, tegning, import, offline og PDF er attrap. Knapperne viser en besked i stedet.
- Norge og Sverige er ikke med.
- Solaris bruger systemets skrift, som appen gør i dag.
