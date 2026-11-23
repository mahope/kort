import type { Metadata } from "next";
import { getBrand } from "@/config/brand";
import AboutMahoje from "@/components/about/AboutMahoje";
import AboutSolaris from "@/components/about/AboutSolaris";

const brand = getBrand();

export const metadata: Metadata = {
  title: `Om ${brand.siteName} - Gratis Topografisk Kortudskrivning`,
  description: `Om ${brand.siteName} - en gratis service til at udskrive danske topografiske kort som PDF.`,
  alternates: { canonical: "/om" },
};

export default function AboutPage() {
  return (
    <main className="pointer-coarse:[&_a]:inline-flex pointer-coarse:[&_a]:min-h-11 pointer-coarse:[&_a]:min-w-11 pointer-coarse:[&_a]:max-w-full pointer-coarse:[&_a]:items-center pointer-coarse:[&_a]:align-middle">{getBrand().id === "solaris" ? <AboutSolaris /> : <AboutMahoje />}</main>
  );
}
