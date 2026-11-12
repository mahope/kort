# Mobil-UX, november 2026

Før/efter-billeder af hele flowet (søg sted, vælg målestok og papir, indstillinger, download PDF)
i begge brands (`mahoje` = kort.mahoje.dk, `solaris` = kort.solaris.dk) på 390×844 (lys og mørk),
360×800 og 1440×900. Filnavne: `<foer|efter>-<brand>-<viewport>-<trin>.jpg`.

"Før" er taget af de to live-sites 12/11-2026, "efter" af et lokalt produktionsbuild af branchen.
`*-touchmaal.json` lister synlige touch-mål under 44 px pr. trin (`small`) og PDF-tiden.

| Problem før | Rettelse |
| --- | --- |
| Søgning lander i zoom 14, så printrammen (fx 4,8 × 6,9 km) ligger uden for skærmen | Kortet flyver til en zoom, hvor hele rammen ses over bundarket (`flyToPrintArea`) |
| Kortets midte (og dermed rammen og sigtekorset) lå delvist under bundarket | Kortet får `padding.bottom` = arkets højde, sigtekorset følger med |
| Attribution-knappen tegnede fire (i)-ikoner og lå åben over zoomknapperne | Foldet sammen på touch, ét ikon, ingen overlap med "Find mig" |
| Søgeresultater blev skjult bag Download-knappen og tastaturet | Fokus i søgefeltet åbner arket helt og løfter feltet til toppen |
| Målestok og papir var native selects langt nede, under basiskortlisten | Store valgknapper (chips) lige under søgningen |
| Afkrydsningsfelter var 20 px høje | 44 px touch-mål på alle labels med checkbox |
| Tegning, GPX, flere ark, deling og offline var gemt bag "Avancerede indstillinger" | Synlige genveje under "Værktøjer", der åbner og scroller til sektionen |
| PDF-fremdrift kun som tekst | Fremdriftsbjælke i knappen (fliser og sider) |
| Stor brand-header og "Koordinat ved sigtekorset"-panel fyldte på mobil | Kompakt header og kort "Koordinat"-knap |

Scripts: `flow.mjs` (flowet og touch-mål) og `genvej.mjs` (genvejen "Flere ark" når frem med ét tryk).
De forventer Playwright i `/home/mads/dev/shots` på agent-worker; ret `createRequire`-stien ved anden maskine.
