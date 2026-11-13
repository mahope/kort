"use client";

import { useState, useEffect, useRef } from "react";
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
import { PrintSummaryLine } from "@/components/print/PrintSummaryLine";
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
  id,
  title,
  defaultOpen = true,
  children,
}: {
  id?: string;
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const ref = useRef<HTMLDivElement>(null);
  const focusSection = useUiStore((s) => s.focusSection);
  const setFocusSection = useUiStore((s) => s.setFocusSection);

  // A tool shortcut asked for this section: open it (state adjusted during
  // render) and bring it into view once it is in the DOM.
  if (id && focusSection === id && !isOpen) setIsOpen(true);
  useEffect(() => {
    if (!id || focusSection !== id) return;
    setFocusSection(null);
    requestAnimationFrame(() => ref.current?.scrollIntoView({ block: "start", behavior: "smooth" }));
  }, [id, focusSection, setFocusSection]);

  return (
    <div ref={ref} id={id ? `sektion-${id}` : undefined} className="scroll-mt-2">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-1 pointer-coarse:min-h-11"
      >
        <span className="text-xs font-semibold text-text-secondary">
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

const TOOL_SHORTCUTS: { id: string; label: string; icon: string }[] = [
  { id: "tegning", label: "Tegn og mål", icon: "M15.232 5.232l3.536 3.536M9 13l6.232-6.232a2.5 2.5 0 113.536 3.536L12.536 16.536 8 18l1-4.5z" },
  { id: "import", label: "GPX og KML", icon: "M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M17 8l-5-5-5 5M12 3v12" },
  { id: "udskrivning", label: "Flere ark", icon: "M4 5h7v7H4zM13 5h7v7h-7zM4 14h7v6H4zM13 14h7v6h-7z" },
  { id: "kortlag", label: "Højdekurver og lag", icon: "M12 3l9 5-9 5-9-5 9-5zm-9 9l9 5 9-5" },
  { id: "del", label: "Del link", icon: "M8.684 13.342a3 3 0 100-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" },
  { id: "offline", label: "Gem offline", icon: "M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15zm9-3v6m0 0l-3-3m3 3l3-3" },
];

/**
 * Always-visible shortcuts to the tools that live under "Avancerede
 * indstillinger", so they can be found without knowing the toggle exists.
 */
function ToolShortcuts() {
  const setAdvancedMode = useUiStore((s) => s.setAdvancedMode);
  const setFocusSection = useUiStore((s) => s.setFocusSection);
  const setSheetPosition = useUiStore((s) => s.setSheetPosition);
  const open = (id: string) => {
    setAdvancedMode(true);
    setSheetPosition("max");
    setFocusSection(id);
  };
  return (
    <div>
      <h2 className="mb-1 text-sm font-medium">Værktøjer</h2>
      <div className="grid grid-cols-3 gap-1.5">
        {TOOL_SHORTCUTS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => open(t.id)}
            className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg border border-border bg-surface px-1 py-1.5 text-center text-xs leading-tight text-foreground transition-colors hover:bg-surface-secondary focus-visible:outline-2 focus-visible:outline-primary"
          >
            <svg className="h-5 w-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d={t.icon} />
            </svg>
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function AdvancedToggleButton({ advanced, onToggle }: { advanced: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-1 text-sm font-medium text-text-secondary underline-offset-2 hover:text-foreground hover:underline transition-colors py-1 pointer-coarse:min-h-11"
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
          Alle indstillinger og værktøjer
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
        <div className="border-b border-border pb-3 max-md:flex max-md:items-baseline max-md:justify-between max-md:gap-3 md:pb-4">
          <a
            href={brand.credit.url}
            className="inline-flex text-[19px] text-foreground hover:text-text-secondary transition-colors max-md:order-2 max-md:min-h-11 max-md:items-center max-md:text-[16px]"
            aria-label="Mahoje, til mahoje.dk"
          >
            <MahojeWordmark />
          </a>
          <h1 className="text-[20px] md:mt-4 md:text-[26px] text-foreground">Topografiske kort</h1>
          <p className="mt-1 text-sm text-text-secondary max-md:hidden">{brand.tagline}</p>
        </div>
      ) : (
      <div>
        <h1 className="text-lg font-bold">{brand.siteName}</h1>
        <p className="text-xs text-text-secondary max-md:hidden">{brand.tagline}</p>
        {brand.id === "solaris" && (
          <a
            href={brand.credit.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-text-muted hover:text-text-secondary underline underline-offset-2 max-md:hidden"
          >
            {brand.credit.label}
          </a>
        )}
      </div>
      )}

      <SearchBar />

      {/* The print choices come first: they are what every user changes. */}
      <ScaleSelector />
      <PaperFormatSelector />
      <CoverageInfo />

      <LayerSelector />

      <UtmGridSettings />

      <PrintPreview />

      <ToolShortcuts />

      <AdvancedToggleButton
        advanced={advancedMode}
        onToggle={() => setAdvancedMode(!advancedMode)}
      />

      {advancedMode && (
        <>
          <CollapsibleSection id="kortlag" title="Kortlag">
            <OverlaySelector />
          </CollapsibleSection>

          <CollapsibleSection id="import" title="Import & Lag">
            <FileImport />
            <ImportedLayerList />
          </CollapsibleSection>

          <CollapsibleSection id="tegning" title="Tegning & Mål" defaultOpen={false}>
            <DrawToolbar />
            <MeasureTool />
          </CollapsibleSection>

          <ElevationProfile />

          <ExportPanel />

          <CollapsibleSection id="udskrivning" title="Udskrivning">
            <BearingSelector />
            <DpiSelector />
            <MultiPageSelector />
          </CollapsibleSection>

          <CollapsibleSection id="offline" title="Offline" defaultOpen={false}>
            <OfflinePanel />
          </CollapsibleSection>

          <CollapsibleSection id="del" title="Del">
            <ShareButton />
          </CollapsibleSection>

          <CollapsibleSection id="bogmaerker" title="Bogmærker" defaultOpen={false}>
            <BookmarksPanel />
          </CollapsibleSection>

          <CollapsibleSection id="historik" title="Historik" defaultOpen={false}>
            <HistoryPanel />
          </CollapsibleSection>
        </>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex flex-wrap items-center gap-x-2 text-xs text-text-muted">
          <span>Kortdata &copy; Klimadatastyrelsen</span>
          <span>&middot;</span>
          <a href="/om" className="inline-flex items-center justify-center pointer-coarse:min-h-11 pointer-coarse:min-w-11 hover:text-text-secondary underline underline-offset-2">Om</a>
          {brand.id === "solaris" && (
            <>
              <span className="md:hidden">&middot;</span>
              <a href={brand.credit.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center pointer-coarse:min-h-11 hover:text-text-secondary underline underline-offset-2 md:hidden">
                {brand.credit.label}
              </a>
            </>
          )}
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
    <BottomSheet
      footer={
        <>
          <PrintSummaryLine />
          <PrintButton />
        </>
      }
    >
      <SidebarContent />
    </BottomSheet>
  );
}
