import type { Metadata } from "next";
import { Analytics } from "@/components/Analytics";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Kort.mahoje.dk - Gratis Topografisk Kortudskrivning",
    template: "%s | Kort.mahoje.dk",
  },
  description:
    "Udskriv danske topografiske kort i høj kvalitet. Vælg målestok, papirformat og download som PDF. Gratis og uden login.",
  metadataBase: new URL("https://kort.mahoje.dk"),
  alternates: {
    canonical: "/",
  },
  keywords: [
    "topografisk kort",
    "kort udskrivning",
    "PDF kort",
    "Danmark kort",
    "gratis kort",
    "UTM gitter",
    "orientering",
    "spejder kort",
    "vandrekort",
    "Dataforsyningen",
  ],
  authors: [{ name: "Mads Holst Jensen", url: "https://mahoje.dk" }],
  creator: "Mads Holst Jensen",
  openGraph: {
    title: "Kort.mahoje.dk - Gratis Topografisk Kortudskrivning",
    description:
      "Udskriv danske topografiske kort i høj kvalitet. Vælg målestok, papirformat og download som PDF.",
    locale: "da_DK",
    type: "website",
    url: "https://kort.mahoje.dk",
    siteName: "Kort.mahoje.dk",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kort.mahoje.dk - Gratis Topografisk Kortudskrivning",
    description:
      "Udskriv danske topografiske kort i høj kvalitet som PDF. Gratis og uden login.",
  },
};

const themeScript = `(function(){try{var t=localStorage.getItem('theme');var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme:dark)').matches);if(d)document.documentElement.classList.add('dark')}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="da" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563eb" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/icon.svg" />
      </head>
      <body className="antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "Kort.mahoje.dk",
              url: "https://kort.mahoje.dk",
              description:
                "Gratis webapplikation til udskrivning af danske topografiske kort som PDF. Vælg målestok, papirformat og download - helt uden login.",
              applicationCategory: "UtilityApplication",
              operatingSystem: "Web",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "DKK",
              },
              author: {
                "@type": "Person",
                name: "Mads Holst Jensen",
                url: "https://mahoje.dk",
              },
              inLanguage: "da",
              isAccessibleForFree: true,
            }),
          }}
        />
        <Analytics />
        {children}
      </body>
    </html>
  );
}
