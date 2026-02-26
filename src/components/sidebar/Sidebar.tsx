"use client";

import { useState } from "react";
import { SearchBar } from "@/components/search/SearchBar";
import { LayerSelector } from "./LayerSelector";
import { OverlaySelector } from "./OverlaySelector";
import { ScaleSelector } from "./ScaleSelector";
import { PaperFormatSelector } from "./PaperFormatSelector";
import { DpiSelector } from "./DpiSelector";
import { PrintButton } from "@/components/print/PrintButton";
import { BottomSheet } from "@/components/ui/BottomSheet";
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
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          {title}
        </span>
        <svg
          className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
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
        <p className="text-xs text-gray-500">
          Gratis topografisk kortudskrivning
        </p>
      </div>

      <SearchBar />

      <CollapsibleSection title="Kortlag">
        <LayerSelector />
        <OverlaySelector />
      </CollapsibleSection>

      <CollapsibleSection title="Udskrivning">
        <ScaleSelector />
        <PaperFormatSelector />
        <DpiSelector />
      </CollapsibleSection>

      <PrintButton />

      <p className="text-[10px] text-gray-400 mt-4">
        Kortdata &copy; Klimadatastyrelsen
      </p>
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
