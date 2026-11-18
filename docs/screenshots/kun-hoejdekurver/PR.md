# Tilføj kortvisning og PDF uden basiskort

Vælg **Intet basiskort** under **Basiskort**. Kortvisningen og PDF’en får hvid baggrund med de valgte ekstra lag. Vælg fx 5 m- eller 10 m-højdekurver til et orienteringsløb. Basiskortvalget følger med i delingslinket. Når basiskortet er slået fra, er målestokslineal, nordpil og misvisningsdiagram som standard slået fra i PDF’en. Målestokslineal og nordpil kan vælges under **Alle indstillinger og værktøjer → Udskrivning**.

Build, typecheck, lint og alle 338 Vitest-tests består. Playwright genindlæste kortet med valget gemt i URL’en og eksporterede begge PDF’er. Eksporten sendte 70 forespørgsler efter basiskortfliser med DTK25 valgt og 0 med **Intet basiskort**. Begge eksporter hentede højdekurver. Regressionstests dækker skiftet af basiskort i kortkomponenten og valg af hjælpemidler på enkeltark og flersidede PDF’er.

## Himmelbjerget i 1:5.000 med 5 m-højdekurver

| | Med basiskort | Uden basiskort |
| --- | --- | --- |
| Kortvisning | ![Kortvisning med basiskort](https://github.com/mahope/kort/blob/feat/kun-hoejdekurver/docs/screenshots/kun-hoejdekurver/kort-med-basiskort.jpg?raw=1) | ![Kortvisning uden basiskort](https://github.com/mahope/kort/blob/feat/kun-hoejdekurver/docs/screenshots/kun-hoejdekurver/kort-uden-basiskort.jpg?raw=1) |
| PDF-forhåndsvisning | ![PDF med basiskort](https://github.com/mahope/kort/blob/feat/kun-hoejdekurver/docs/screenshots/kun-hoejdekurver/print-med-basiskort.jpg?raw=1) | ![PDF uden basiskort](https://github.com/mahope/kort/blob/feat/kun-hoejdekurver/docs/screenshots/kun-hoejdekurver/print-uden-basiskort.jpg?raw=1) |
