import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kort.mahoje.dk - Gratis Topografisk Kortudskrivning",
  description:
    "Udskriv danske topografiske kort i høj kvalitet. Vælg målestok, papirformat og download som PDF. Gratis og uden login.",
  openGraph: {
    title: "Kort.mahoje.dk - Gratis Topografisk Kortudskrivning",
    description:
      "Udskriv danske topografiske kort i høj kvalitet. Vælg målestok, papirformat og download som PDF.",
    locale: "da_DK",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="da">
      <body className="antialiased">{children}</body>
    </html>
  );
}
