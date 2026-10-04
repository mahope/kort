import localFont from "next/font/local";

// Mahojes to skrifter, samme subset-WOFF2 som mahoje.dk (src/fonts/).
// Bruges kun, når brandet er mahoje; Solaris beholder systemfonten.

/** Overskrifter og ordmærke. */
export const brygada = localFont({
  src: "../fonts/brygada-1918-latin.woff2",
  variable: "--font-brygada",
  weight: "400 700",
  adjustFontFallback: "Times New Roman",
  display: "swap",
});

/** Brødtekst og UI. Fallbacken er metrikjusteret i globals.css. */
export const schibsted = localFont({
  src: "../fonts/schibsted-grotesk-latin.woff2",
  variable: "--font-schibsted",
  weight: "400 700",
  adjustFontFallback: false,
  display: "swap",
});
