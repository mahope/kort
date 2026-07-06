import type { Metadata } from "next";
import { Analytics } from "@/components/Analytics";
import { getBrand, resolveBrandId } from "@/config/brand";
import "./globals.css";

const brand = getBrand();

export const metadata: Metadata = {
  title: {
    default: `${brand.siteName} - Gratis Topografisk Kortudskrivning`,
    template: `%s | ${brand.siteName}`,
  },
  description: brand.description,
  metadataBase: new URL(brand.baseUrl),
  alternates: { canonical: "/" },
  keywords: brand.keywords,
  authors: [brand.jsonLdAuthor],
  creator: brand.jsonLdAuthor.name,
  openGraph: {
    title: `${brand.siteName} - Gratis Topografisk Kortudskrivning`,
    description: brand.ogDescription,
    locale: "da_DK",
    type: "website",
    url: brand.baseUrl,
    siteName: brand.siteName,
  },
  twitter: {
    card: "summary_large_image",
    title: `${brand.siteName} - Gratis Topografisk Kortudskrivning`,
    description:
      "Udskriv danske topografiske kort i høj kvalitet som PDF. Gratis og uden login.",
  },
  icons: {
    icon: brand.logo.favicon,
    apple: brand.logo.icon192,
  },
};

const themeScript = `(function(){try{var t=localStorage.getItem('theme');var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme:dark)').matches);if(d)document.documentElement.classList.add('dark')}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const brandId = resolveBrandId(process.env.NEXT_PUBLIC_BRAND);
  return (
    <html lang="da" data-brand={brandId} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <meta name="theme-color" content={brand.themeColor} />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className="antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: brand.siteName,
              url: brand.baseUrl,
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
                ...brand.jsonLdAuthor,
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
