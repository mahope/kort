# Søkort, phase 2: screenshots

23 Nov 2026. **Before** is production (kort.mahoje.dk / kort.solaris.dk) with
the old depth layers (`ov=dd,sd`: Dybdemodel WMS and NOVANA lake lines).
**After** is this branch (`next start`) with the new layer *Søkort*, in both
styles: `klassisk` (default) and `lavvande` (`sv=lv`). Base map: skærmkort,
A4 portrait, 300 dpi. Made with `scripts/soekort/capture-fase2.mjs` and
`capture-fase2-panel.mjs`.

Per view and brand: `-desktop` (1440 x 900), `-mobil` (390 x 844), `-a4`
(page 1 of the app's own PDF, rendered at 300 dpi with `pdftoppm`, shown at
half size) and `-a4-udsnit` (1400 x 900 px of that page at 100 %).

| View | Before | Klassisk | Lavt vand |
| --- | --- | --- | --- |
| Svendborgsund 1:25.000 | ![](mahoje-svendborgsund-foer-desktop.webp) | ![](mahoje-svendborgsund-klassisk-desktop.webp) | ![](mahoje-svendborgsund-lavvande-desktop.webp) |
| A4 crop | ![](mahoje-svendborgsund-foer-a4-udsnit.webp) | ![](mahoje-svendborgsund-klassisk-a4-udsnit.webp) | ![](mahoje-svendborgsund-lavvande-a4-udsnit.webp) |
| Det Sydfynske Øhav 1:50.000 | ![](mahoje-sydfynske-oehav-foer-desktop.webp) | ![](mahoje-sydfynske-oehav-klassisk-desktop.webp) | ![](mahoje-sydfynske-oehav-lavvande-desktop.webp) |
| A4 crop | ![](mahoje-sydfynske-oehav-foer-a4-udsnit.webp) | ![](mahoje-sydfynske-oehav-klassisk-a4-udsnit.webp) | ![](mahoje-sydfynske-oehav-lavvande-a4-udsnit.webp) |
| Limfjorden ved Løgstør 1:50.000 | ![](mahoje-limfjorden-loegstoer-foer-desktop.webp) | ![](mahoje-limfjorden-loegstoer-klassisk-desktop.webp) | ![](mahoje-limfjorden-loegstoer-lavvande-desktop.webp) |
| A4 page | ![](mahoje-limfjorden-loegstoer-foer-a4.webp) | ![](mahoje-limfjorden-loegstoer-klassisk-a4.webp) | ![](mahoje-limfjorden-loegstoer-lavvande-a4.webp) |
| Furesø 1:10.000 (no depth data) | ![](mahoje-furesoe-foer-desktop.webp) | ![](mahoje-furesoe-klassisk-desktop.webp) | ![](mahoje-furesoe-lavvande-desktop.webp) |

kort.solaris.dk has the same files with the prefix `solaris-`, for example
[before](solaris-sydfynske-oehav-foer-desktop.webp) and
[after](solaris-sydfynske-oehav-klassisk-desktop.webp) in Det Sydfynske Øhav.

The style choice in the map's layer menu:
[desktop](mahoje-panel-desktop.webp), [mobile](mahoje-panel-mobil.webp),
[Solaris desktop](solaris-panel-desktop.webp), [Solaris mobile](solaris-panel-mobil.webp).

Over a raster base map only the contours and numbers are drawn, because the
bands reach 1 km past the model's coast: [DTK25, Svendborgsund](mahoje-svendborgsund-klassisk-dtk25-desktop.webp)
([mobile](mahoje-svendborgsund-klassisk-dtk25-mobil.webp)).

What to look for:

- **PDF credit box:** the new layer names Dybdemodellen with "hentet
  23.11.2026" instead of "Indeholder WMS-tjeneste", and EMODnet or NOVANA only
  where the print holds their data (Limfjorden: Dybdemodellen only). Furesø has
  no depth data, so the box only has the navigation warning.
- **Coast:** the bands lie under the skærmkort's land, so the coastline is the
  base map's, not the model's.
- **Furesø** has no NOVANA survey and is not in the depth model: both before
  and after show only the base map's lake.
