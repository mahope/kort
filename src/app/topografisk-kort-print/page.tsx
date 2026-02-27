import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Udskriv Topografisk Kort som PDF - Gratis Dansk Kortudskrivning",
  description:
    "Print danske topografiske kort i høj kvalitet som PDF. Vælg målestok fra 1:10.000 til 1:500.000, papirformat A5-A2 med UTM-gitter. Gratis, uden login.",
  alternates: {
    canonical: "/topografisk-kort-print",
  },
  openGraph: {
    title: "Udskriv Topografisk Kort som PDF - Gratis",
    description:
      "Print danske topografiske kort i høj kvalitet. Vælg målestok, papirformat og download som PDF med UTM-gitter.",
  },
};

const FAQ_ITEMS = [
  {
    q: "Hvad er et topografisk kort?",
    a: "Et topografisk kort viser landskabets form med højdekurver, veje, bygninger, skove og vandløb. Det bruges til vandreture, orientering, spejder og planlægning i naturen.",
  },
  {
    q: "Hvilke målestoksforhold kan jeg vælge?",
    a: "Du kan vælge mellem 1:10.000, 1:25.000, 1:50.000, 1:100.000, 1:250.000 og 1:500.000. Til vandreture og orientering er 1:25.000 eller 1:50.000 mest brugt.",
  },
  {
    q: "Hvad er UTM-gitter, og hvorfor er det nyttigt?",
    a: "UTM-gitteret er et koordinatsystem der deler kortet op i firkanter. Det bruges til at angive præcise positioner i felten, f.eks. ved orientering, eftersøgning eller militære øvelser.",
  },
  {
    q: "Hvilke papirformater understøttes?",
    a: "A5, A4, A3 og A2 i både stående og liggende format. PDF'en genereres i den nøjagtige størrelse, så du kan printe direkte.",
  },
  {
    q: "Koster det noget at bruge?",
    a: "Nej. Kort.mahoje.dk er helt gratis og kræver ingen login eller konto. Kortdata kommer fra Dataforsyningen (Klimadatastyrelsen), som er frit tilgængelige offentlige geodata.",
  },
  {
    q: "Kan jeg importere mine egne ruter?",
    a: "Ja. Du kan importere GPX-, GeoJSON- og KML-filer direkte i kortet og printe dem sammen med det topografiske kort.",
  },
  {
    q: "Virker det på mobil?",
    a: "Ja. Siden er responsiv og fungerer på både desktop og mobil. Du kan finde det rigtige kortudsnit på telefonen og downloade PDF'en til senere print.",
  },
];

export default function LandingPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Hero */}
      <header className="bg-gradient-to-b from-primary/5 to-background">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h1 className="text-4xl font-bold mb-4">
            Udskriv topografiske kort som PDF
          </h1>
          <p className="text-lg text-text-secondary mb-8 max-w-xl mx-auto">
            Gratis dansk kortudskrivning i høj kvalitet. Vælg målestok,
            papirformat og download med UTM-gitter &mdash; klar til print.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-white hover:bg-primary-hover transition-colors"
          >
            Start kortudskrivning
            <svg
              className="w-5 h-5"
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
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-16">
        {/* Features */}
        <section className="py-12">
          <h2 className="text-2xl font-bold mb-8 text-center">
            Alt hvad du behøver til turen
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {[
              {
                title: "6 målestoksforhold",
                desc: "Fra detaljeret 1:10.000 til overblik 1:500.000. Vælg det der passer til din tur.",
              },
              {
                title: "UTM-gitter og koordinater",
                desc: "Præcist koordinatgitter på kortet til orientering, eftersøgning og positionsangivelse.",
              },
              {
                title: "A5 til A2 papirformat",
                desc: "Stående eller liggende. PDF'en matcher det nøjagtige papirformat.",
              },
              {
                title: "Højdekurver og skyggekort",
                desc: "Tilføj højdekurver, skyggekort, matrikelskel og stednavne som overlay.",
              },
              {
                title: "Importer ruter",
                desc: "Indlæs GPX, GeoJSON og KML-filer og print dem direkte på kortet.",
              },
              {
                title: "Multi-page print",
                desc: "Udskriv store områder over flere sider med overlap, til sammenhængende kort.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl bg-surface-secondary p-5"
              >
                <h3 className="font-semibold mb-1">{feature.title}</h3>
                <p className="text-sm text-text-secondary">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Use cases */}
        <section className="py-12 border-t border-border">
          <h2 className="text-2xl font-bold mb-6">Hvem bruger det?</h2>
          <div className="space-y-4 text-[15px] text-text-secondary">
            <p>
              <strong className="text-foreground">Spejdere og orienteringsløbere</strong>{" "}
              bruger det til at printe kort med UTM-gitter til ture, poster og
              øvelser. Med 1:25.000 får du det perfekte detaljeniveau til
              terrænnavigation.
            </p>
            <p>
              <strong className="text-foreground">Vandrefolk og naturelskere</strong>{" "}
              printer kort til dagture og længere vandringer. Et fysisk kort er
              uundværligt når telefonen løber tør for strøm eller mangler
              dækning.
            </p>
            <p>
              <strong className="text-foreground">Lærere og forældre</strong>{" "}
              bruger det til at lære børn at læse kort og forstå landskabet.
              Print et kort over nærområdet og tag på opdagelse.
            </p>
            <p>
              <strong className="text-foreground">Jægere og fiskere</strong>{" "}
              printer detaljerede kort over terræn, matrikelskel og adgangsveje
              til deres områder.
            </p>
          </div>
        </section>

        {/* How it works */}
        <section className="py-12 border-t border-border">
          <h2 className="text-2xl font-bold mb-6">Sådan gør du</h2>
          <ol className="space-y-4">
            {[
              "Find dit område ved at søge efter en adresse eller navigere på kortet.",
              "Vælg målestok og papirformat. Print-rammen viser præcist hvad der udskrives.",
              "Tilføj evt. UTM-gitter, højdekurver, ruter eller tegninger.",
              "Tryk Download PDF. Kortet genereres direkte i din browser.",
            ].map((step, i) => (
              <li key={i} className="flex gap-4">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white text-sm font-bold shrink-0">
                  {i + 1}
                </span>
                <p className="text-text-secondary pt-1">{step}</p>
              </li>
            ))}
          </ol>
          <div className="mt-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover transition-colors"
            >
              Prøv det nu &mdash; det er gratis
            </Link>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-12 border-t border-border">
          <h2 className="text-2xl font-bold mb-6">Ofte stillede spørgsmål</h2>
          <div className="space-y-6">
            {FAQ_ITEMS.map((item) => (
              <div key={item.q}>
                <h3 className="font-semibold mb-1">{item.q}</h3>
                <p className="text-sm text-text-secondary">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Data sources */}
        <section className="py-12 border-t border-border">
          <h2 className="text-2xl font-bold mb-4">Kortdata</h2>
          <p className="text-text-secondary text-[15px]">
            Alle kort kommer fra{" "}
            <a
              href="https://dataforsyningen.dk/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary-hover underline underline-offset-2"
            >
              Dataforsyningen
            </a>{" "}
            (Klimadatastyrelsen). Det inkluderer topografiske skærmkort, ortofoto,
            højdekurver, matrikelskel og stednavne. Alle data er frie offentlige
            geodata. Adressesøgning drives af{" "}
            <a
              href="https://dawadocs.dataforsyningen.dk/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary-hover underline underline-offset-2"
            >
              DAWA API
            </a>
            .
          </p>
        </section>

        {/* CTA footer */}
        <section className="py-12 border-t border-border text-center">
          <h2 className="text-xl font-bold mb-2">Klar til at printe?</h2>
          <p className="text-text-secondary mb-6">
            Ingen login, ingen betaling. Bare kort.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-white hover:bg-primary-hover transition-colors"
          >
            Gå til kortet
          </Link>
          <p className="mt-6 text-xs text-text-muted">
            <Link
              href="/om"
              className="hover:text-text-secondary underline underline-offset-2"
            >
              Om projektet
            </Link>
            {" "}&middot;{" "}
            <a
              href="https://github.com/mahoje/kort"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-text-secondary underline underline-offset-2"
            >
              Open source
            </a>
            {" "}&middot;{" "}
            Lavet af{" "}
            <a
              href="https://mahoje.dk"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-text-secondary underline underline-offset-2"
            >
              Mads Holst Jensen
            </a>
          </p>
        </section>
      </main>
    </div>
  );
}
