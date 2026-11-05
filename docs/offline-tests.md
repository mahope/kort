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
