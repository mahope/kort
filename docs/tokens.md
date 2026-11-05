# Offentlige API-tokens

## Hvilke tokens er offentlige by design

Kortet henter fliser og adresser direkte fra browseren, så to tokens ligger i klient-JS og er synlige for alle brugere. Det er et bevidst valg, og repoet er offentligt:

| Variabel | Bruges til | Fil |
| --- | --- | --- |
| `NEXT_PUBLIC_DATAFORSYNINGEN_TOKEN` | Kortfliser og WMS fra Dataforsyningen | `src/lib/map/styles.ts` |
| `NEXT_PUBLIC_ADRESSEVAELGER_TOKEN` | Adressevælger (adresser, KDS) | `src/lib/api/address.ts` |

Begge er gratis, offentlige tokens med en fallback i kildekoden, så projektet virker uden opsætning. Hemmelige nøgler (fx en tjenestebruger til Datafordeleren) må **aldrig** gives et `NEXT_PUBLIC_`-navn eller lægges i klientkoden. Kræver en tjeneste en ikke-offentlig nøgle, skal kaldet gå via en server-side proxy.

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
