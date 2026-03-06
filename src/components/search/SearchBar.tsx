"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { searchAddresses } from "@/lib/api/dawa";
import { useMapStore } from "@/stores/mapStore";
import type { SearchResult } from "@/types/map";

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const flyTo = useMapStore((s) => s.flyTo);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const searchVersionRef = useRef(0);
  const listboxId = "search-listbox";

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setIsOpen(false);
      setHasSearched(false);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const version = ++searchVersionRef.current;
    try {
      const res = await searchAddresses(q);
      if (version !== searchVersionRef.current) return;
      setResults(res);
      setIsOpen(true);
      setHasSearched(true);
      setActiveIndex(-1);
    } catch {
      if (version !== searchVersionRef.current) return;
      setResults([]);
      setIsOpen(true);
      setHasSearched(true);
    } finally {
      if (version === searchVersionRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const handleChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 2) {
      setResults([]);
      setIsOpen(false);
      setHasSearched(false);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
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

  const showDropdown = isOpen && (isLoading || hasSearched);

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor="search-input" className="block text-sm font-medium mb-1">
        Adressesogning
      </label>
      <div className="relative">
        <input
          id="search-input"
          type="text"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          aria-activedescendant={activeIndex >= 0 ? `search-option-${activeIndex}` : undefined}
          aria-autocomplete="list"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => hasSearched && setIsOpen(true)}
          placeholder="Sog efter adresse eller stednavn..."
          className="w-full rounded-lg border border-border px-3 py-2 pr-8 text-sm bg-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {isLoading && (
          <svg
            className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-text-muted"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
      </div>
      {showDropdown && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-surface shadow-lg max-h-60 overflow-y-auto"
        >
          {results.length > 0 ? (
            results.map((r, i) => (
              <li key={r.id} id={`search-option-${i}`} role="option" aria-selected={i === activeIndex}>
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
            ))
          ) : !isLoading ? (
            <li className="px-3 py-2 text-sm text-text-muted">Ingen resultater fundet</li>
          ) : null}
        </ul>
      )}
    </div>
  );
}
