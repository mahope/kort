import type { MetadataRoute } from "next";
import { getBrand } from "@/config/brand";

export default function manifest(): MetadataRoute.Manifest {
  const brand = getBrand();
  const png = brand.id === "solaris";
  return {
    name: `${brand.siteName} - Topografisk Kortudskrivning`,
    short_name: brand.siteName,
    start_url: "/",
    display: "standalone",
    theme_color: brand.themeColor,
    background_color: "#ffffff",
    description: "Gratis dansk topografisk kortudskrivning som PDF",
    lang: "da",
    icons: png
      ? [
          {
            src: brand.logo.icon192,
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: brand.logo.icon512,
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ]
      : [
          {
            src: "/icons/icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
  };
}
