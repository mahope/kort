import type { Metadata } from "next";
import { Analytics } from "@/components/Analytics";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kort.mahoje.dk - Gratis Topografisk Kortudskrivning",
  description:
    "Udskriv danske topografiske kort i høj kvalitet. Vælg målestok, papirformat og download som PDF. Gratis og uden login.",
  metadataBase: new URL("https://kort.mahoje.dk"),
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
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" href="/icons/icon.svg" />
      </head>
      <body className="antialiased">
        <Analytics />
        {children}
      </body>
    </html>
  );
}
