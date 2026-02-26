"use client";

import { useState } from "react";
import { SearchBar } from "@/components/search/SearchBar";
import { LayerSelector } from "./LayerSelector";
import { OverlaySelector } from "./OverlaySelector";
import { ScaleSelector } from "./ScaleSelector";
import { PaperFormatSelector } from "./PaperFormatSelector";
import { DpiSelector } from "./DpiSelector";
import { BearingSelector } from "./BearingSelector";
import { MultiPageSelector } from "./MultiPageSelector";
import { PrintButton } from "@/components/print/PrintButton";
import { FileImport } from "./FileImport";
import { ImportedLayerList } from "./ImportedLayerList";
import { DrawToolbar } from "./DrawToolbar";
import { MeasureTool } from "./MeasureTool";
import { ExportPanel } from "./ExportPanel";
import { BookmarksPanel } from "./BookmarksPanel";
import { HistoryPanel } from "./HistoryPanel";
import { ShareButton } from "./ShareButton";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useIsMobile } from "@/lib/hooks/useIsMobile";

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
        className="flex w-full items-center justify-between py-1"
      >
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">
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

function SidebarContent() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold">Kort.mahoje.dk</h1>
        <p className="text-xs text-text-secondary">
          Gratis topografisk kortudskrivning
        </p>
      </div>

      <SearchBar />

      <CollapsibleSection title="Kortlag">
        <LayerSelector />
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

      <ExportPanel />

      <CollapsibleSection title="Udskrivning">
        <ScaleSelector />
        <PaperFormatSelector />
        <BearingSelector />
        <DpiSelector />
        <MultiPageSelector />
      </CollapsibleSection>

      <PrintButton />
      <ShareButton />

      <CollapsibleSection title="Bogmærker" defaultOpen={false}>
        <BookmarksPanel />
      </CollapsibleSection>

      <CollapsibleSection title="Historik" defaultOpen={false}>
        <HistoryPanel />
      </CollapsibleSection>

      <div className="flex items-center justify-between mt-4">
        <p className="text-[10px] text-text-muted">
          Kortdata &copy; Klimadatastyrelsen
        </p>
        <ThemeToggle />
      </div>
    </div>
  );
}

export function Sidebar() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <BottomSheet>
        <SidebarContent />
      </BottomSheet>
    );
  }

  return (
    <aside className="w-80 shrink-0 border-r border-sidebar-border bg-sidebar-bg overflow-y-auto p-4">
      <SidebarContent />
    </aside>
  );
}
