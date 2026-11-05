"use client";

import { useState, useEffect } from "react";
import { SearchBar } from "@/components/search/SearchBar";
import { LayerSelector } from "./LayerSelector";
import { OverlaySelector } from "./OverlaySelector";
import { ScaleSelector } from "./ScaleSelector";
import { PaperFormatSelector } from "./PaperFormatSelector";
import { CoverageInfo } from "./CoverageInfo";
import { PrintPreview } from "./PrintPreview";
import { DpiSelector } from "./DpiSelector";
import { BearingSelector } from "./BearingSelector";
import { MultiPageSelector } from "./MultiPageSelector";
import { PrintButton } from "@/components/print/PrintButton";
import { getBrand } from "@/config/brand";
import { FileImport } from "./FileImport";
import { ImportedLayerList } from "./ImportedLayerList";
import { DrawToolbar } from "./DrawToolbar";
import { MeasureTool } from "./MeasureTool";
import { ExportPanel } from "./ExportPanel";
import { ElevationProfile } from "./ElevationProfile";
import { BookmarksPanel } from "./BookmarksPanel";
import { HistoryPanel } from "./HistoryPanel";
import { ShareButton } from "./ShareButton";
import { UtmGridSettings } from "./UtmGridSettings";
import { OfflinePanel } from "./OfflinePanel";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { MahojeWordmark } from "@/components/ui/MahojeWordmark";
import { useUiStore } from "@/stores/uiStore";

function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-1 pointer-coarse:min-h-11"
      >
        <span className="text-xs font-semibold text-text-muted">
          {title}
        </span>
        <svg
          className={`w-3.5 h-3.5 text-text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && <div className="mt-2 space-y-3">{children}</div>}
    </div>
  );
}

function AdvancedToggleButton({ advanced, onToggle }: { advanced: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors py-1 pointer-coarse:min-h-11"
    >
      {advanced ? (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
          Skjul avancerede indstillinger
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
          Avancerede indstillinger
        </>
      )}
    </button>
  );
}

function SidebarContent() {
  const advancedMode = useUiStore((s) => s.advancedMode);
  const setAdvancedMode = useUiStore((s) => s.setAdvancedMode);

  // Sync advancedMode from localStorage after hydration
  useEffect(() => {
    try {
      if (localStorage.getItem("advancedMode") === "true") {
        setAdvancedMode(true);
      }
    } catch {}
  }, [setAdvancedMode]);

  const brand = getBrand();

  return (
    <div className="space-y-4">
      {brand.id === "mahoje" ? (
        <div className="border-b border-border pb-3 md:pb-4">
          <a
            href={brand.credit.url}
            className="inline-flex text-[19px] text-foreground hover:text-text-secondary transition-colors"
            aria-label="Mahoje, til mahoje.dk"
          >
            <MahojeWordmark />
          </a>
          <h1 className="mt-3 text-[22px] md:mt-4 md:text-[26px] text-foreground">Topografiske kort</h1>
          <p className="mt-1 text-sm text-text-secondary">{brand.tagline}</p>
        </div>
      ) : (
      <div>
        <h1 className="text-lg font-bold">{brand.siteName}</h1>
        <p className="text-xs text-text-secondary">{brand.tagline}</p>
        {brand.id === "solaris" && (
          <a
            href={brand.credit.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-text-muted hover:text-text-secondary underline underline-offset-2"
          >
            {brand.credit.label}
          </a>
        )}
      </div>
      )}

      <SearchBar />

      <LayerSelector />

      <UtmGridSettings />

      <ScaleSelector />
      <PaperFormatSelector />
      <CoverageInfo />
      <PrintPreview />

      <AdvancedToggleButton
        advanced={advancedMode}
        onToggle={() => setAdvancedMode(!advancedMode)}
      />

      {advancedMode && (
        <>
          <CollapsibleSection title="Kortlag">
            <OverlaySelector />
          </CollapsibleSection>

          <CollapsibleSection title="Import & Lag">
            <FileImport />
            <ImportedLayerList />
          </CollapsibleSection>

          <CollapsibleSection title="Tegning & Mål" defaultOpen={false}>
            <DrawToolbar />
            <MeasureTool />
          </CollapsibleSection>

          <ElevationProfile />

          <ExportPanel />

          <CollapsibleSection title="Udskrivning">
            <BearingSelector />
            <DpiSelector />
            <MultiPageSelector />
          </CollapsibleSection>

          <CollapsibleSection title="Offline" defaultOpen={false}>
            <OfflinePanel />
          </CollapsibleSection>

          <ShareButton />

          <CollapsibleSection title="Bogmærker" defaultOpen={false}>
            <BookmarksPanel />
          </CollapsibleSection>

          <CollapsibleSection title="Historik" defaultOpen={false}>
            <HistoryPanel />
          </CollapsibleSection>
        </>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex flex-wrap items-center gap-x-2 text-xs text-text-muted">
          <span>Kortdata &copy; Klimadatastyrelsen</span>
          <span>&middot;</span>
          <a href="/om" className="inline-flex items-center justify-center pointer-coarse:min-h-11 pointer-coarse:min-w-11 hover:text-text-secondary underline underline-offset-2">Om</a>
          {brand.id === "mahoje" && (
            <>
              <span>&middot;</span>
              <a href={brand.credit.url} className="inline-flex items-center pointer-coarse:min-h-11 hover:text-text-secondary underline underline-offset-2">
                mahoje.dk
              </a>
            </>
          )}
        </div>
        <ThemeToggle />
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <BottomSheet footer={<PrintButton />}>
      <SidebarContent />
    </BottomSheet>
  );
}
