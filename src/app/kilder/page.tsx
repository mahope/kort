import type { Metadata } from "next";
import Link from "next/link";
import { getBrand } from "@/config/brand";
import { DATA_SOURCES, DECLINED_SOURCES } from "@/constants/dataSources";
import { NAVIGATION_WARNING, SEA_DATA_NOTE } from "@/lib/map/sources";

const brand = getBrand();

export const metadata: Metadata = {
  title: `Datakilder og hvordan kortet er bygget - ${brand.siteName}`,
  description: `Hvor kortdata på ${brand.siteName} kommer fra, hvilke licenser de har, hvordan de krediteres, og hvordan kortet og PDF'en er bygget.`,
  alternates: { canonical: "/kilder" },
};

const linkClass = "text-primary hover:text-primary-hover underline underline-offset-2";

/** "18. november 2026" from an ISO date, without depending on the server's locale data. */
function formatDate(iso: string): string {
  const months = ["januar", "februar", "marts", "april", "maj", "juni", "juli", "august", "september", "oktober", "november", "december"];
  const [y, m, d] = iso.split("-").map(Number);
  return `${d}. ${months[m - 1]} ${y}`;
}

const TECH: { name: string; text: string }[] = [
  {
    name: "Kortet i browseren",
    text: "MapLibre GL JS tegner kortet med WebGL. Basiskort og lag hentes som fliser direkte fra kilderne: vector tiles til Skærmkortet, WMS og WMTS til de øvrige kort, og PMTiles til vores egne højdekurver og Søkortet. Sødybder, vrag og indsøkort-markører er små GeoJSON-filer på vores egen server.",
  },
  {
    name: "PDF'en",
    text: "PDF'en laves i din browser. En skjult kortinstans tegner udsnittet i den fulde opløsning (op til 300 dpi), og jsPDF lægger kortet, gitter, nordpil, målestok, misvisning og kreditering på siden. Intet kort sendes til en server.",
  },
  {
    name: "Egne højdekurver",
    text: "5 og 10 m-kurverne er beregnet fra Danmarks Højdemodel, glattet og samlet i én PMTiles-fil. Browseren henter kun de bidder af filen, der skal bruges, så der ikke skal køre en kortserver.",
  },
  {
    name: "Søkortet",
    text: "Basiskortet Søkort er vores eget vektorkort: dybdebånd, dybdekurver og dybdetal beregnet fra EMODnets dybdemodel, land og kyst fra OpenStreetMap og Natura 2000 fra Miljøportalen, samlet i én PMTiles-fil og tegnet i en rolig stil, der er lavet til print. Tekst og streger måles i millimeter på papiret, så de har samme størrelse i en PDF på 150 og 300 dpi.",
  },
  {
    name: "Søgning",
    text: "Adresser kommer fra Adressevælger. Stednavne søges i et øjebliksbillede af Danske Stednavne, som ligger på vores egen server, fordi DAWA lukker. Norske stednavne kommer fra Kartverkets stednavne-API.",
  },
  {
    name: "Rammen omkring",
    text: "Next.js og React, Tailwind CSS og Zustand. Koden er open source.",
  },
];

export default function SourcesPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link
          href="/"
          prefetch={false}
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary-hover transition-colors mb-10"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Tilbage til kortet
        </Link>

        <h1 className="text-3xl font-bold mb-2">Datakilder og hvordan kortet er bygget</h1>
        <p className="text-text-secondary mb-10">
          Alt, hvad du ser på kortet og i PDF&apos;en, kommer fra frie, offentlige data. Her står hvor de kommer fra, hvilke
          licenser de har, og hvordan vi krediterer dem.
        </p>

        <div className="space-y-12 text-[15px] leading-relaxed">
          <section aria-labelledby="kilder">
            <h2 id="kilder" className="text-lg font-semibold mb-4">
              Datakilder
            </h2>
            <ul className="space-y-4">
              {DATA_SOURCES.map((s) => (
                <li key={s.id} id={s.id} className="rounded-lg border border-border p-4">
                  <h3 className="font-semibold">{s.name}</h3>
                  <p className="text-sm text-text-secondary mb-2">{s.provider}</p>
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-[9rem_1fr]">
                    <dt className="font-medium">Bruges til</dt>
                    <dd className="text-text-secondary">{s.usedFor}</dd>
                    <dt className="font-medium">Hentes som</dt>
                    <dd className="text-text-secondary">{s.delivery}</dd>
                    <dt className="font-medium">Licens</dt>
                    <dd className="text-text-secondary">
                      <a href={s.licenceUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
                        {s.licence}
                      </a>
                    </dd>
                    <dt className="font-medium">Kreditering</dt>
                    <dd className="text-text-secondary">{s.credit}</dd>
                    {s.retrieved && (
                      <>
                        <dt className="font-medium">Hentet</dt>
                        <dd className="text-text-secondary">
                          {formatDate(s.retrieved)} (øjebliksbillede på vores server)
                        </dd>
                      </>
                    )}
                  </dl>
                  {s.notForNavigation && <p className="mt-2 text-sm font-semibold">{NAVIGATION_WARNING}</p>}
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="hav">
            <h2 id="hav" className="text-lg font-semibold mb-3">
              Søkort og havdata
            </h2>
            <p className="text-text-secondary mb-3">
              De officielle danske søkort (papirkort og elektroniske ENC-søkort) laves af Geodatastyrelsen. De er
              ophavsretligt beskyttede og sælges, så dem viser vi ikke. Hav- og søkortlagene her bygger på frie data:
              dybder og havbundens relief fra Danmarks Dybdemodel, grovere dybder fra EMODnet uden for danske farvande,
              sømærker fra OpenSeaMap, som frivillige kortlægger, dybdekurver i 80 søer fra Miljøstyrelsens
              overvågning, vrag fra EMODnet og Geodatastyrelsens historiske indsøkort. Basiskortet Søkort samler det
              meste i ét roligt kort med dybdebånd og dybdetal, beregnet af os fra EMODnets dybdemodel.
            </p>
            <p className="mb-3 rounded border border-border p-3 font-semibold">
              {NAVIGATION_WARNING} {SEA_DATA_NOTE}
            </p>
            <p className="text-text-secondary mb-3">
              Vi henter, omregner og forenkler data, så de kan vises og udskrives: kurver bliver glattet, punkter
              udtyndet og skannede kort formindsket. Noget kan derfor være unøjagtigt, forældet eller mangle. Advarslen
              står i appen, på kortet og på PDF&apos;en, så længe et af lagene er slået til.
            </p>
            <h3 className="font-semibold mb-2">Kilder vi har valgt fra</h3>
            <ul className="list-disc space-y-1 pl-5 text-sm text-text-secondary">
              {DECLINED_SOURCES.map((d) => (
                <li key={d.name}>
                  <span className="font-medium text-foreground">{d.name}:</span> {d.reason}
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="norden">
            <h2 id="norden" className="text-lg font-semibold mb-3">
              Norge og Sverige
            </h2>
            <p className="text-text-secondary mb-3">
              Flytter du kortet til Norge eller Sverige, skifter det selv kilde ud fra midten af kortet. I Norge viser det
              Kartverkets topografiske kort, og i Sverige og langs grænsen OpenTopoMap, som bygger på OpenStreetMap og
              højdedata fra SRTM og Sonny. Gitter, misvisning og PDF virker som i Danmark, med UTM-zone 32 til 35 som på en GPS.
            </p>
            <p className="text-text-secondary">
              Lantmäteriet har ikke et gratis, detaljeret webkort: det gratis oversigtskort er for groft til print i 1:25.000 og
              lukker 31. december 2026, og det detaljerede koster penge. Derfor bruger vi OpenTopoMap i Sverige. De danske
              lag (fx DHM-højdekurver og matrikelskel) har ingen data uden for Danmark.
            </p>
          </section>

          <section aria-labelledby="kreditering">
            <h2 id="kreditering" className="text-lg font-semibold mb-3">
              Sådan krediterer vi
            </h2>
            <p className="text-text-secondary">
              Kortet viser kilderne nederst til venstre (tryk på i&apos;et på mobilen). PDF&apos;en har
              &quot;Kortdata: Klimadatastyrelsen, CC BY 4.0&quot; og en henvisning til denne side i foden, og andre
              kilder end Klimadatastyrelsen står i en boks øverst på kortet. Uden for Danmark står Kartverket eller
              OpenTopoMap i foden i stedet. Bruger du selv kortene videre, gælder
              kildernes licenser også for dig: kreditér kilderne og nævn licensen.
            </p>
          </section>

          <section aria-labelledby="teknik">
            <h2 id="teknik" className="text-lg font-semibold mb-3">
              Hvordan kortet er bygget
            </h2>
            <dl className="space-y-3">
              {TECH.map((t) => (
                <div key={t.name}>
                  <dt className="font-medium">{t.name}</dt>
                  <dd className="text-text-secondary">{t.text}</dd>
                </div>
              ))}
            </dl>
            <p className="text-text-secondary mt-3">
              Kildekoden ligger på{" "}
              <a href={brand.github} target="_blank" rel="noopener noreferrer" className={linkClass}>
                GitHub
              </a>
              . Mangler en kilde, eller er en kreditering forkert, så skriv gerne et issue.
            </p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-border text-xs text-text-muted">
          <Link href="/om" className="hover:text-text-secondary underline underline-offset-2">
            Om {brand.siteName}
          </Link>
        </div>
      </div>
    </main>
  );
}
