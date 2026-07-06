export type BrandId = "mahoje" | "solaris";

export interface Brand {
  id: BrandId;
  siteName: string; // "Kort.solaris.dk"
  domain: string; // "kort.solaris.dk"
  baseUrl: string; // "https://kort.solaris.dk"
  description: string;
  ogDescription: string;
  tagline: string; // "Gratis topografisk kortudskrivning"
  keywords: string[];
  logo: { icon192: string; icon512: string; wordmark: string; favicon: string };
  themeColor: string; // manifest + <meta theme-color>
  analyticsDomain: string;
  og: { title: string; gradient: string };
  credit: { label: string; url: string; short: string };
  github: string;
  jsonLdAuthor: { name: string; url: string };
}

const KEYWORDS = [
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
];

const BRANDS: Record<BrandId, Brand> = {
  mahoje: {
    id: "mahoje",
    siteName: "Kort.mahoje.dk",
    domain: "kort.mahoje.dk",
    baseUrl: "https://kort.mahoje.dk",
    description:
      "Udskriv danske topografiske kort i høj kvalitet. Vælg målestok, papirformat og download som PDF. Gratis og uden login.",
    ogDescription:
      "Udskriv danske topografiske kort i høj kvalitet. Vælg målestok, papirformat og download som PDF.",
    tagline: "Gratis topografisk kortudskrivning",
    keywords: KEYWORDS,
    logo: {
      icon192: "/icons/icon.svg",
      icon512: "/icons/icon.svg",
      wordmark: "",
      favicon: "/icon.svg",
    },
    themeColor: "#2563eb",
    analyticsDomain: "kort.mahoje.dk",
    og: {
      title: "Kort.mahoje.dk",
      gradient:
        "linear-gradient(135deg, #1e3a5f 0%, #1e40af 50%, #2563eb 100%)",
    },
    credit: {
      label: "Lavet af Mads Holst Jensen",
      url: "https://mahoje.dk",
      short: "kort.mahoje.dk",
    },
    github: "https://github.com/mahope/kort",
    jsonLdAuthor: { name: "Mads Holst Jensen", url: "https://mahoje.dk" },
  },
  solaris: {
    id: "solaris",
    siteName: "Kort.solaris.dk",
    domain: "kort.solaris.dk",
    baseUrl: "https://kort.solaris.dk",
    description:
      "Udskriv danske topografiske kort i høj kvalitet. Vælg målestok, papirformat og download som PDF. Gratis og uden login. En service fra spejderforeningen Solaris.",
    ogDescription:
      "Udskriv danske topografiske kort i høj kvalitet. Vælg målestok, papirformat og download som PDF.",
    tagline: "Gratis topografisk kortudskrivning",
    keywords: KEYWORDS,
    logo: {
      icon192: "/brand/solaris/icon-192.png",
      icon512: "/brand/solaris/icon-512.png",
      wordmark: "/brand/solaris/wordmark.png",
      favicon: "/brand/solaris/icon-192.png",
    },
    themeColor: "#f4d425",
    analyticsDomain: "kort.solaris.dk",
    og: {
      title: "Kort.solaris.dk",
      gradient:
        "linear-gradient(135deg, #171717 0%, #3d3a1a 55%, #f4d425 100%)",
    },
    credit: {
      label: "Bygget af mahoje.dk",
      url: "https://mahoje.dk",
      short: "kort.solaris.dk",
    },
    github: "https://github.com/mahope/kort",
    jsonLdAuthor: { name: "mahoje.dk", url: "https://mahoje.dk" },
  },
};

export function resolveBrandId(raw: string | undefined): BrandId {
  return raw === "solaris" ? "solaris" : "mahoje";
}

export function getBrand(id?: BrandId): Brand {
  const resolved = id ?? resolveBrandId(process.env.NEXT_PUBLIC_BRAND);
  return BRANDS[resolved];
}
