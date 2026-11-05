# Sikkerhed

## Headere

Sættes i `next.config.ts` for alle ruter (Cloudflare foran).

| Header | Værdi / formål |
|---|---|
| `Content-Security-Policy` | Begrænset til kendte origins, se nedenfor |
| `Strict-Transport-Security` | 2 år, `includeSubDomains`, `preload` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `X-Frame-Options` / `frame-ancestors` | `SAMEORIGIN` / `'self'` |
| `Permissions-Policy` | kun `geolocation=(self)` |
| `Cross-Origin-Opener-Policy` | `same-origin` (målt: ingen popups eller `window.opener` bruges) |
| `X-Powered-By` | slået fra (`poweredByHeader: false`) |

### CSP

- `connect-src`, `img-src`: `'self'` plus `api.dataforsyningen.dk`, `cdn.dataforsyningen.dk`,
  `tile.openstreetmap.org` (img og connect), `adressevaelger.dk` og `analytics.holstjensen.eu` (kun connect).
  `img-src` har desuden `data:` og `blob:`.
- `font-src`: `'self' data:`. Kortets skrifttyper hentes som `.pbf`-glyphs via `connect-src`.
- `script-src`: `'self' 'unsafe-inline'`. `'unsafe-eval'` er fjernet; MapLibre 5 kører uden
  (verificeret med røgtesten nedenfor: 0 `securitypolicyviolation`). `'unsafe-inline'` er nødvendig
  for to inline scripts (tema og JSON-LD).
- Nyt eksternt domæne i koden kræver, at det tilføjes i `next.config.ts`.
  `src/config/securityHeaders.test.ts` fejler ved bart `https:`/`*`, `unsafe-eval` eller `X-Powered-By`.

### Røgtest

`scripts/csp-smoke.mjs` kører mod en LOKAL server (aldrig produktion) og dækker 6 basiskort, 4 overlays,
adresse- og stednavnesøgning, GPX-import, analytics-kald (mod mock) og PDF-download. Den fejler ved
`securitypolicyviolation` og har en kanariefugl, der beviser at detektoren virker.

```
npm run build && npx next start -p 3871 &
PLAYWRIGHT_DIR=<node_modules med playwright> BASE_URL=http://localhost:3871 node scripts/csp-smoke.mjs
```

## Rate limit på `/api/stednavne`

60 forespørgsler pr. minut pr. klient. Nøglen er `CF-Connecting-IP` (sat af Cloudflare), ellers
**sidste** `X-Forwarded-For`-værdi (den første kan klienten selv sætte). Ved overløb af nøgletabellen
fjernes kun de ældste vinduer. Tælleren ligger i processens hukommelse og nulstilles ved genstart.
