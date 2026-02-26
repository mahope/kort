"use client";

import { SearchBar } from "@/components/search/SearchBar";
import { ScaleSelector } from "./ScaleSelector";
import { PaperFormatSelector } from "./PaperFormatSelector";
import { PrintButton } from "@/components/print/PrintButton";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useIsMobile } from "@/lib/hooks/useIsMobile";

function SidebarContent() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg font-bold">Kort.mahoje.dk</h1>
        <p className="text-xs text-gray-500">
          Gratis topografisk kortudskrivning
        </p>
      </div>
      <SearchBar />
      <ScaleSelector />
      <PaperFormatSelector />
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
