"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { searchAddresses } from "@/lib/api/dawa";
import { useMapStore } from "@/stores/mapStore";
import type { SearchResult } from "@/types/map";

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const flyTo = useMapStore((s) => s.flyTo);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    const res = await searchAddresses(q);
    setResults(res);
    setIsOpen(res.length > 0);
    setActiveIndex(-1);
  }, []);

  const handleChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 300);
  };

  const selectResult = (result: SearchResult) => {
    setQuery(result.text);
    setIsOpen(false);
    flyTo(result.coordinates[0], result.coordinates[1]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      selectResult(results[activeIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor="search-input" className="block text-sm font-medium mb-1">
        Adressesogning
      </label>
      <input
        id="search-input"
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => results.length > 0 && setIsOpen(true)}
        placeholder="Sog efter adresse eller stednavn..."
        className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />
      {isOpen && (
        <ul className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-surface shadow-lg max-h-60 overflow-y-auto">
          {results.map((r, i) => (
            <li key={r.id}>
              <button
                type="button"
                className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 ${
                  i === activeIndex ? "bg-blue-50" : ""
                }`}
                onMouseDown={() => selectResult(r)}
              >
                <div className="font-medium">{r.text}</div>
                <div className="text-xs text-text-secondary">{r.description}</div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
