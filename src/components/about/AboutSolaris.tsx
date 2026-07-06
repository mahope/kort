import Link from "next/link";
import { getBrand } from "@/config/brand";

export default function AboutSolaris() {
  const brand = getBrand("solaris");
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary-hover transition-colors mb-10"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Tilbage til kortet
        </Link>

        <h1 className="text-3xl font-bold mb-2">Om {brand.siteName}</h1>
        <p className="text-text-secondary mb-10">
          En gratis service til udskrivning af danske topografiske kort
        </p>

        <div className="space-y-10 text-[15px] leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold mb-3">Hvorfor?</h2>
            <p className="text-text-secondary">
              Vi er Solaris, en spejdergruppe under Det Danske Spejderkorps. På
              ture og til orientering har vi tit manglet en nem, gratis måde at
              udskrive et ordentligt topografisk kort &mdash; et rigtigt kort på
              papir, til at lære at læse kort og finde vej i naturen. Der fandtes
              ikke en god dansk service til det, så vi fik den bygget. Den er
              gratis og forbliver det.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">Hvad kan den?</h2>
            <ul className="space-y-2 text-text-secondary">
              {[
                "Udskriv danske topografiske kort som PDF i flere målestoksforhold",
                "Vælg mellem papirformater fra A5 til A2, stående eller liggende",
                "UTM-gitter med koordinater — til orientering i felten",
                "Højdekurver, skyggekort, matrikelskel og stednavne som overlay",
                "Importer GPX- og GeoJSON-ruter og print dem direkte",
                "Tegn og mål direkte på kortet",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="text-primary mt-0.5">&#10003;</span>
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">Altid gratis</h2>
            <p className="text-text-secondary">
              {brand.siteName} er gratis og kommer altid til at forblive det.
              Ingen login, ingen cookies. Vi bruger{" "}
              <a
                href="https://plausible.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary-hover underline underline-offset-2"
              >
                Plausible Analytics
              </a>{" "}
              til anonym, cookieless brugsstatistik. Kortdata kommer fra{" "}
              <a
                href="https://dataforsyningen.dk/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary-hover underline underline-offset-2"
              >
                Dataforsyningen
              </a>{" "}
              (Klimadatastyrelsen), som stiller frie offentlige geodata til
              rådighed for alle.
            </p>
          </section>

          <section className="rounded-xl bg-surface-secondary p-6">
            <h2 className="text-lg font-semibold mb-3">Bygget af mahoje.dk</h2>
            <p className="text-text-secondary mb-4">
              Denne kortprinter er udviklet og drevet af{" "}
              <a
                href={brand.credit.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary-hover underline underline-offset-2"
              >
                mahoje.dk
              </a>{" "}
              &mdash; som også har bygget den bagvedliggende{" "}
              <a
                href={brand.github}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary-hover underline underline-offset-2"
              >
                open source-kode
              </a>
              . Tak for det!
            </p>
            <a
              href={brand.credit.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-on-primary hover:bg-primary-hover transition-colors"
            >
              Besøg mahoje.dk
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </a>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-border text-xs text-text-muted">
          Kortdata &copy; Klimadatastyrelsen |{" "}
          <a
            href="https://dataforsyningen.dk/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-text-secondary"
          >
            Dataforsyningen
          </a>{" "}
          | {brand.credit.label}
        </div>
      </div>
    </div>
  );
}
