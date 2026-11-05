import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

const root = __dirname;
const repo = path.resolve(root, "..");

// Next inlines NEXT_PUBLIC_* at build time; replicate with `define`.
const pub = (k: string) => JSON.stringify(process.env[k]);

export default defineConfig({
  root,
  publicDir: path.resolve(repo, "public"),
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(repo, "src") } },
  define: {
    "process.env.NEXT_PUBLIC_BRAND": pub("NEXT_PUBLIC_BRAND"),
    "process.env.NEXT_PUBLIC_DATAFORSYNINGEN_TOKEN": pub("NEXT_PUBLIC_DATAFORSYNINGEN_TOKEN"),
    "process.env.NEXT_PUBLIC_ADRESSEVAELGER_TOKEN": pub("NEXT_PUBLIC_ADRESSEVAELGER_TOKEN"),
  },
  css: { postcss: repo }, // reuse postcss.config.mjs (@tailwindcss/postcss)
  build: { outDir: path.resolve(root, "dist"), emptyOutDir: true },
  server: { fs: { allow: [repo] } },
});
