# Offline-test

Playwright-scriptet `tests/e2e/offline.mjs` starter `next start` lokalt og
tjekker service workeren: registrering (10 kørsler), cachede `/_next/static/`-filer,
fliskache (højst 10 % netværkstræf ved warm load), offline-åbning af `/`, `/om` og
dyblinks, samt at en ukendt sti viser `offline.html`.

```bash
npm run build
PLAYWRIGHT_DIR=/sti/til/node_modules node tests/e2e/offline.mjs
```

`PLAYWRIGHT_DIR` skal pege på en `node_modules` med `playwright` (ikke en
afhængighed i repoet). Fliskald til Dataforsyningen mockes, så der ikke kræves token.

TODO: Afsnittet hører hjemme i README under "Tests"; README er ikke rørt her pga. den igangværende MGRS-gren.

## Gem området (issue #36)

`tests/e2e/offline-area.mjs` tester "Offline"-sektionen mod en mock-server:
plan med antal og størrelse, højst 6 samtidige requests, pause, afbryd (fjerner
delvist hentede fliser), fuld hentning, offline-panorering/zoom inden for området
(alle fliser besvares 200 fra cachen) og sletning. Sæt `SHOT_DIR` for skærmbilleder.

```bash
PLAYWRIGHT_DIR=/sti/til/node_modules node tests/e2e/offline-area.mjs
```

Gemte fliser ligger i cachen `topoprint-offline-v2`, adskilt fra `topoprint-tiles-v3`
(loft 3.000), så de aldrig trimmes væk. Områdelisten ligger i localStorage (`offline-areas`).

### Afgrænsninger

- Der gemmes skærmfliser (DTK25 som JPEG) i zoom 12-16 for printrammen plus 25 % kant på hver side, så kanterne af kortet også virker offline. Gemmes kun med synlig baggrund (Topografisk kort, Ortofoto, Målebordsblade) og valgte overlays; OSM og skærmkortet (vektor) gemmes ikke.
- **PDF offline understøttes ikke.** PDF'en renderes ved printopløsning, og MapLibre vælger selv hvilke fliser (og zoom) der skal bruges; de gemte skærmfliser (zoom 12-16) kan ikke garanteres at dække dem, og skærmkortets stil, glyffer og sprites hentes online. Rendereren afviser derfor PDF uden net med "PDF kræver internet, også for gemte områder", og panelet siger det samme. Dækket af vitest (`renderer.test.ts`).
- Cache-nøglen er flise-URL'en uden `token`, så gemte områder overlever en tokenrotation.
- Ved 429/503 stopper hentningen; områdelisten viser, hvor mange fliser der mangler. Genstart ved at gemme området igen.
- Ved start fjernes områder fra listen, hvis browseren har ryddet deres fliser (tre stikprøver; områder uden fliser røres ikke). Cachen hedder `topoprint-offline-v2`; den gamle `-v1` (nøgler med token) slettes af service workeren ved aktivering, så ingen forældreløse poster bliver tilbage, og områder gemt dér forsvinder fra listen.
- Ved 429/503 tælles de fliser, der aldrig blev sendt, som manglende.
- Hentningen holder en `navigator.locks`-lås, også under pause: en anden fane, der vil gemme et område, venter, til den første er færdig eller afbrudt.

