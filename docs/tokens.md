# Offentlige API-tokens

## Hvilke tokens er offentlige by design

Kortet henter fliser og adresser direkte fra browseren, så to tokens ligger i klient-JS og er synlige for alle brugere. Det er et bevidst valg, og repoet er offentligt:

| Variabel | Bruges til | Fil |
| --- | --- | --- |
| `NEXT_PUBLIC_DATAFORSYNINGEN_TOKEN` | Kortfliser og WMS fra Dataforsyningen | `src/lib/map/styles.ts` |
| `NEXT_PUBLIC_ADRESSEVAELGER_TOKEN` | Adressevælger (adresser, KDS) | `src/lib/api/address.ts` |

Begge er gratis, offentlige tokens med en fallback i kildekoden, så projektet virker uden opsætning. Hemmelige nøgler (fx en tjenestebruger til Datafordeleren) må **aldrig** gives et `NEXT_PUBLIC_`-navn eller lægges i klientkoden. Kræver en tjeneste en ikke-offentlig nøgle, skal kaldet gå via en server-side proxy.

## Datafordeler-nøglen (server-side)

| Variabel | Bruges til | Hvor |
| --- | --- | --- |
| `DATAFORDELER_API_KEY` | De danske rasterlag fra Datafordeleren: DTK25, ortofoto, Høje/Lave Målebordsblade, Danske Stednavne, DHM-kurver (0,5/2,5 m) og skyggekort | Kun på serveren, i flise-routen `src/app/api/tiles/[layer]/[z]/[x]/[y]/route.ts` |

Dataforsyningen lukker de `_DAF`-tjenester, kortet brugte, fra 26. november 2026 (se `docs/research/2026-11-datafordeleren-migration.md`). Afløserne på Datafordeleren kræver en API-nøgle, og den kan ikke begrænses til et domæne. Derfor henter browseren de danske lag fra vores egen route, `/api/tiles/<lag>/<z>/<x>/<y>.<png|jpg>`, og routen sætter nøglen på hos serveren:

- **Runtime, ikke build.** Nøglen læses ved hvert kald fra `process.env`, så den sættes som almindelig miljøvariabel på containeren (Dokploy: "Environment", ikke build-argument). Et nyt eller roteret nøglesæt kræver kun en genstart, intet nyt build. Læg den aldrig i Dockerfile, build-argumenter eller `.env` i repoet.
- **Ingen åben proxy.** Kun lagene i `src/lib/tiles/routeLayers.ts`, én 256 px-flise i EPSG:3857 ad gangen, z 0-22, inden for Danmark og ingen query-parametre. Værter og lagnavne ligger fast i `src/lib/tiles/upstream.ts`; klienten kan hverken vælge vært, BBOX, størrelse eller format ud over `png`/`jpg` pr. lag.
- **Nøglen forlader ikke serveren.** Fejl svarer med en kort tekst og `no-store`, aldrig med upstream-URL'en. Loggen nævner kun lag, status og fejltype. Datafordelerens GetCapabilities skriver nøglen ind i sine egne URL'er, så routen sender kun billeder (`image/png`/`image/jpeg`) videre.
- **Uden nøgle** (forks, lokal udvikling) henter routen de samme fliser fra Dataforsyningens tidligere tjenester med det offentlige token. Fliserne er byte-identiske (tjekket 23/11-2026 på alle lag). Det virker, indtil tjenesterne lukker. Svar-headeren `X-Tile-Source` siger `datafordeler` eller `dataforsyningen`.
- **Cache:** `Cache-Control: public` med 7 dage for DTK25 og ortofoto og 30 dage for historiske kort, stednavne og DHM, plus `stale-while-revalidate`. Browser, service worker og Cloudflare kan dermed cache fliserne; Datafordeleren sender selv ingen cache-headere for WMS.
- **Rate limit:** 3.000 fliser pr. minut pr. IP (se `docs/security.md`).

Brug en nøgle fra et IT-system, der kun bruges til kortet, så et misbrug eller en spærring ikke rammer andre systemer. En nøgle lever i to år; skift den i miljøet og genstart.

Lokalt: `DATAFORDELER_API_KEY=… npm run dev` (eller i `.env.local`). Tjek i browserens netværksfane, at ingen request indeholder nøglen.

## Rotation

`NEXT_PUBLIC_*`-variabler bages ind ved build, så et nyt token kræver et nyt build, men ingen kodeændring:

1. Hent et nyt token hos Klimadatastyrelsen (Dataforsyningen) eller tjenesteudbyderen.
2. Sæt variablen som build-argument. I Dokploy: som build-argument (ikke kun som runtime-miljøvariabel). Med compose: i `.env` eller shell.
3. Byg og deploy. Dockerfile og `docker-compose.yml` sender begge variabler videre som `ARG`/`ENV`.
4. Verificér i browserens netværksfane, at fliser og adresser hentes med det nye token.

`environment:` i `docker-compose.yml` har ingen effekt på klientkoden ved runtime, fordi værdierne allerede er bagt ind ved build. Kun build-argumenterne tæller; sæt du kun runtime-miljøet, er tokenet ikke skiftet.

Lokalt: sæt variablerne i `.env.local` og genstart `npm run dev`.

Tomme eller manglende argumenter giver fallbacken i kildekoden. Bliver fallbacken trukket tilbage, skal build-argumentet sættes.

## Vagt mod nye nøgler

Testen `src/lib/map/__tests__/public-tokens.test.ts` scanner `src/` og fejler, hvis et token- eller nøgle-lignende literal står i andre filer end `styles.ts` og `address.ts` (tilladelseslisten står i testen). Tilføj en ny offentlig token ved at udvide listen bevidst.

Vagten scanner kildekoden, ikke den byggede bundle, og springer `__tests__`-mapper over (de havner ikke i klienten). Den fanger lange hex-strenge, JWT-lignende strenge, `Bearer`/`Basic`-literals, `?token=`-literals og værdier tildelt navne med token/key/secret/password. En nøgle i en variabel med et andet navn og et andet format kan slippe igennem.
