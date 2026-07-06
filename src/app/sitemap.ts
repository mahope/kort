import type { MetadataRoute } from "next";
import { getBrand } from "@/config/brand";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getBrand().baseUrl;

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/om`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/topografisk-kort-print`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
  ];
}
