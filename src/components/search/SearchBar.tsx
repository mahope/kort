"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { searchAddresses, resolveCoordinates } from "@/lib/api/address";
import { useMapStore } from "@/stores/mapStore";
import { useUiStore } from "@/stores/uiStore";
import type { SearchResult } from "@/types/map";

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const flyTo = useMapStore((s) => s.flyTo);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const searchVersionRef = useRef(0);
  const listboxId = "search-listbox";

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setIsOpen(false);
      setHasSearched(false);
      setHasError(false);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const version = ++searchVersionRef.current;
    try {
      const res = await searchAddresses(q);
      if (version !== searchVersionRef.current) return;
      setResults(res);
      setHasError(false);
      setIsOpen(true);
      setHasSearched(true);
      setActiveIndex(-1);
    } catch {
      if (version !== searchVersionRef.current) return;
      setResults([]);
      setHasError(true);
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
      setHasError(false);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    debounceRef.current = setTimeout(() => doSearch(value), 300);
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
    setHasSearched(false);
    setHasError(false);
    setIsLoading(false);
    searchVersionRef.current++;
    inputRef.current?.focus();
  };

  const selectResult = async (result: SearchResult) => {
    setQuery(result.text);
    setIsOpen(false);
    if (result.coordinates) {
      flyTo(result.coordinates[0], result.coordinates[1]);
      return;
    }
    // Adressevælger results carry no coordinates — resolve them on select.
    setIsLoading(true);
    try {
      const coords = await resolveCoordinates(result);
      if (coords) {
        flyTo(coords[0], coords[1]);
      } else {
        useUiStore.getState().addToast("error", "Kunne ikke finde adressens placering");
      }
    } catch {
      useUiStore.getState().addToast("error", "Kunne ikke slå adressen op");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen && hasSearched) setIsOpen(true);
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (results.length === 0) return;
      e.preventDefault();
      // Select the highlighted result, or the first one if none is highlighted.
      selectResult(results[activeIndex >= 0 ? activeIndex : 0]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  // Keep the highlighted option scrolled into view.
  useEffect(() => {
    if (activeIndex < 0) return;
    document
      .getElementById(`search-option-${activeIndex}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

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
        Adressesøgning
      </label>
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
        </svg>
        <input
          id="search-input"
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          aria-activedescendant={activeIndex >= 0 ? `search-option-${activeIndex}` : undefined}
          aria-autocomplete="list"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => hasSearched && setIsOpen(true)}
          placeholder="Søg efter adresse eller stednavn..."
          className="w-full rounded-lg border border-border pl-8 pr-16 py-2 text-sm bg-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {isLoading && (
          <svg
            className="absolute right-8 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-text-muted"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {query.length > 0 && (
          <button
            type="button"
            onClick={clearSearch}
            aria-label="Ryd søgning"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full text-text-muted hover:bg-surface-secondary hover:text-text-secondary"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      {showDropdown && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-surface shadow-lg max-h-60 overflow-y-auto"
        >
          {hasError ? (
            <li className="px-3 py-2 text-sm text-danger">
              Kunne ikke søge — tjek din forbindelse og prøv igen
            </li>
          ) : results.length > 0 ? (
            results.map((r, i) => (
              <li key={r.id} id={`search-option-${i}`} role="option" aria-selected={i === activeIndex}>
                <button
                  type="button"
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    i === activeIndex ? "bg-primary/10" : "hover:bg-surface-secondary"
                  }`}
                  onMouseEnter={() => setActiveIndex(i)}
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
