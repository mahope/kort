import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Om Kort.mahoje.dk - Gratis Topografisk Kortudskrivning",
  description:
    "Hvorfor jeg lavede kort.mahoje.dk - en gratis service til at udskrive danske topografiske kort som PDF. Lavet af Mads Holst Jensen, freelance WordPress-udvikler fra Odense.",
};

export default function AboutPage() {
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

        <h1 className="text-3xl font-bold mb-2">Om Kort.mahoje.dk</h1>
        <p className="text-text-secondary mb-10">
          En gratis service til udskrivning af danske topografiske kort
        </p>

        <div className="space-y-10 text-[15px] leading-relaxed">
          {/* Author section */}
          <section className="flex flex-col sm:flex-row gap-6 items-start">
            <Image
              src="https://mahoje.dk/images/mads/about-portrait.webp"
              alt="Mads Holst Jensen"
              width={120}
              height={120}
              className="rounded-xl object-cover shrink-0"
            />
            <div>
              <h2 className="text-lg font-semibold mb-2">Mads Holst Jensen</h2>
              <p className="text-text-secondary">
                Jeg hedder Mads, bor i Odense og har bygget hjemmesider siden 2006.
                Til daglig driver jeg{" "}
                <a
                  href="https://mahoje.dk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary-hover underline underline-offset-2"
                >
                  mahoje.dk
                </a>
                , hvor jeg hjælper virksomheder med WordPress-udvikling, WooCommerce,
                SEO, sikkerhed, hastighed og AI-optimering. Ved siden af det er jeg
                spejder og far, og det er netop derfra ideen til dette projekt kom.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">Hvorfor dette projekt?</h2>
            <p className="text-text-secondary">
              Som spejder har jeg gennem mange ture oplevet, at der manglede en nem
              og gratis mulighed for at udskrive et ordentligt topografisk kort. Da
              min søn og jeg skulle ud og gå fem kilometer sammen, ville jeg gerne
              have et rigtigt kort med &mdash; ikke bare en telefon &mdash; for at
              lære ham at læse kort og finde vej i naturen. Det viste sig, at der
              ikke fandtes en god, gratis dansk service til det. Så jeg byggede en.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">Hvad kan den?</h2>
            <ul className="space-y-2 text-text-secondary">
              <li className="flex gap-2">
                <span className="text-primary mt-0.5">&#10003;</span>
                Udskriv danske topografiske kort som PDF i flere målestoksforhold
              </li>
              <li className="flex gap-2">
                <span className="text-primary mt-0.5">&#10003;</span>
                Vælg mellem papirformater fra A5 til A2, stående eller liggende
              </li>
              <li className="flex gap-2">
                <span className="text-primary mt-0.5">&#10003;</span>
                UTM-gitter med koordinater &mdash; til orientering i felten
              </li>
              <li className="flex gap-2">
                <span className="text-primary mt-0.5">&#10003;</span>
                Højdekurver, skyggekort, matrikelskel og stednavne som overlay
              </li>
              <li className="flex gap-2">
                <span className="text-primary mt-0.5">&#10003;</span>
                Importer GPX- og GeoJSON-ruter og print dem direkte
              </li>
              <li className="flex gap-2">
                <span className="text-primary mt-0.5">&#10003;</span>
                Tegn og mål direkte på kortet
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">Altid gratis</h2>
            <p className="text-text-secondary">
              Kort.mahoje.dk er gratis og kommer altid til at forblive det. Ingen
              login, ingen tracking, ingen cookies. Kortdata kommer fra{" "}
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

          <section>
            <h2 className="text-lg font-semibold mb-3">Open source</h2>
            <p className="text-text-secondary">
              Kildekoden er frit tilgængelig. Du kan selv hoste den på din egen
              server, bidrage med forbedringer eller bare kigge under motorhjelmen.
            </p>
            <a
              href="https://github.com/mahoje/kort"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-3 rounded-lg bg-surface-secondary px-4 py-2.5 text-sm font-medium hover:bg-border transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              github.com/mahoje/kort
            </a>
          </section>

          {/* Mahoje.dk section */}
          <section className="rounded-xl bg-surface-secondary p-6">
            <h2 className="text-lg font-semibold mb-3">Brug for en hjemmeside?</h2>
            <p className="text-text-secondary mb-4">
              Til daglig bygger jeg hurtige, SEO-optimerede WordPress-sider for
              virksomheder. Har du brug for en ny hjemmeside, en WooCommerce-butik,
              hjælp med sikkerhed, hastighed eller AI-optimering? Så kig forbi min
              freelance-side.
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {["WordPress", "WooCommerce", "SEO", "Hastighed", "Sikkerhed", "AI", "Plugin-udvikling"].map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-background px-3 py-1 text-xs text-text-secondary"
                >
                  {tag}
                </span>
              ))}
            </div>
            <a
              href="https://mahoje.dk"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover transition-colors"
            >
              Besøg mahoje.dk
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </a>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">Kontakt</h2>
            <p className="text-text-secondary">
              Har du feedback, fejlrapporter eller forslag til nye funktioner? Opret
              gerne et{" "}
              <a
                href="https://github.com/mahoje/kort/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary-hover underline underline-offset-2"
              >
                issue på GitHub
              </a>
              , eller skriv til mig på{" "}
              <a
                href="mailto:mads@mahoje.dk"
                className="text-primary hover:text-primary-hover underline underline-offset-2"
              >
                mads@mahoje.dk
              </a>
              .
            </p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-border text-xs text-text-muted">
          Kortdata &copy; Klimadatastyrelsen |{" "}
          <a href="https://dataforsyningen.dk/" target="_blank" rel="noopener noreferrer" className="hover:text-text-secondary">
            Dataforsyningen
          </a>{" "}
          | Lavet af{" "}
          <a href="https://mahoje.dk" target="_blank" rel="noopener noreferrer" className="hover:text-text-secondary">
            Mads Holst Jensen
          </a>
        </div>
      </div>
    </div>
  );
}
