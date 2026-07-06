import type { MetadataRoute } from "next";
import { getBrand } from "@/config/brand";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${getBrand().baseUrl}/sitemap.xml`,
  };
}
