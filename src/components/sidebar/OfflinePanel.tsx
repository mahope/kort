"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMapStore } from "@/stores/mapStore";
import { usePrintStore } from "@/stores/printStore";
import { useOfflineStore, type OfflineArea } from "@/stores/offlineStore";
import { useUiStore } from "@/stores/uiStore";
import {
  areaTileUrls,
  checkStart,
  estimateBytes,
  formatBytes,
  isBaseLayerSaveable,
  offlineLayerIds,
  OFFLINE_MAX_ZOOM,
  OFFLINE_MIN_ZOOM,
  CONFIRM_TILE_COUNT,
  MAX_TILE_COUNT,
} from "@/lib/offline/tiles";
import { deleteTiles, downloadTiles, type DownloadProgress } from "@/lib/offline/download";

const LAYER_LABELS: Record<string, string> = {
  dtk25: "Topografisk kort",
  ortofoto: "Ortofoto",
  historisk_hoeje: "Høje Målebordsblade",
  historisk_lave: "Lave Målebordsblade",
  contours: "Højdekurver",
  hillshade: "Skyggekort",
  stednavne: "Stednavne",
  matrikel: "Matrikelskel",
};

type Phase = "idle" | "running" | "paused";

/** Urls used by other saved areas must survive when one area is removed. */
function urlsOnlyIn(area: OfflineArea, others: OfflineArea[]): string[] {
  const keep = new Set(others.flatMap((o) => areaTileUrls(o.bounds, o.layerIds)));
  return areaTileUrls(area.bounds, area.layerIds).filter((u) => !keep.has(u));
}

export function OfflinePanel() {
  const baseLayer = useMapStore((s) => s.baseLayer);
  const overlays = useMapStore((s) => s.overlays);
  const frameBounds = usePrintStore((s) => s.frameBounds);
  const areas = useOfflineStore((s) => s.areas);
  const addArea = useOfflineStore((s) => s.addArea);
  const removeArea = useOfflineStore((s) => s.removeArea);
  const addToast = useUiStore((s) => s.addToast);

  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  // Confirmation holds for one specific plan: changing it asks again.
  const [confirmedFor, setConfirmedFor] = useState<string | null>(null);
  const [available, setAvailable] = useState<number | null>(null);
  const pausedRef = useRef(false);
  const cancelledRef = useRef(false);

  const layerIds = useMemo(() => offlineLayerIds(baseLayer, overlays), [baseLayer, overlays]);
  const urls = useMemo(
    () => (frameBounds ? areaTileUrls(frameBounds, layerIds) : []),
    [frameBounds, layerIds]
  );
  const estimated = estimateBytes(urls.length / Math.max(1, layerIds.length), layerIds);
  const check = checkStart(urls.length, estimated, available);

  // Free quota, re-read whenever the plan changes (and after a run).
  useEffect(() => {
    let alive = true;
    navigator.storage?.estimate?.().then((e) => {
      if (alive && e.quota !== undefined && e.usage !== undefined) {
        setAvailable(Math.max(0, e.quota - e.usage));
      }
    });
    return () => {
      alive = false;
    };
  }, [urls.length, phase, areas.length]);

  const planKey = `${urls.length}:${layerIds.join(",")}`;
  const confirmed = confirmedFor === planKey;

  const baseSaveable = isBaseLayerSaveable(baseLayer);
  const supported = typeof navigator !== "undefined" && "serviceWorker" in navigator;
  const canStart =
    supported &&
    phase === "idle" &&
    urls.length > 0 &&
    !check.tooLarge &&
    (!check.needsConfirm || confirmed);

  const start = async () => {
    if (!frameBounds) return;
    pausedRef.current = false;
    cancelledRef.current = false;
    setPhase("running");
    setProgress({ done: 0, failed: 0, total: urls.length, bytes: 0 });
    try {
      await navigator.storage?.persist?.();
      const res = await downloadTiles(
        urls,
        { cancelled: () => cancelledRef.current, paused: () => pausedRef.current },
        setProgress
      );
      if (res.cancelled) {
        const draft: OfflineArea = {
          id: "",
          createdAt: 0,
          bounds: frameBounds,
          layerIds,
          tileCount: 0,
          bytes: 0,
        };
        const removable = new Set(urlsOnlyIn(draft, useOfflineStore.getState().areas));
        await deleteTiles(res.storedUrls.filter((u) => removable.has(u)));
        addToast("info", "Hentningen blev afbrudt, og de hentede fliser er fjernet");
      } else if (res.done === 0) {
        addToast("error", "Ingen fliser kunne hentes. Tjek forbindelsen og prøv igen");
      } else {
        addArea({
          id: `${Date.now()}`,
          createdAt: Date.now(),
          bounds: frameBounds,
          layerIds,
          tileCount: res.done,
          bytes: res.bytes,
        });
        addToast(
          res.failed > 0 ? "error" : "success",
          res.failed > 0
            ? `Området er gemt, men ${res.failed} fliser kunne ikke hentes`
            : "Området er gemt til offline brug"
        );
      }
    } catch (err) {
      addToast("error", `Kunne ikke gemme området: ${(err as Error).message}`);
    } finally {
      setPhase("idle");
      setProgress(null);
    }
  };

  const remove = async (area: OfflineArea) => {
    const others = areas.filter((a) => a.id !== area.id);
    try {
      await deleteTiles(urlsOnlyIn(area, others));
      removeArea(area.id);
    } catch (err) {
      addToast("error", `Kunne ikke slette området: ${(err as Error).message}`);
    }
  };

  const pct = progress ? Math.round(((progress.done + progress.failed) / Math.max(1, progress.total)) * 100) : 0;

  return (
    <div className="space-y-3">
      {!supported && (
        <p className="text-xs text-text-muted">Din browser understøtter ikke offline-kort.</p>
      )}

      {!baseSaveable && (
        <p className="text-xs text-text-secondary" role="note">
          {baseLayer === "osm"
            ? "OpenStreetMap-fliser må ikke hentes i bulk, så baggrundskortet gemmes ikke."
            : "Skærmkortet kan ikke gemmes offline. Vælg fx Topografisk kort eller Ortofoto."}
        </p>
      )}

      {layerIds.length > 0 && frameBounds && (
        <div className="text-xs text-text-secondary space-y-1">
          <p>
            Printrammen på zoom {OFFLINE_MIN_ZOOM}–{OFFLINE_MAX_ZOOM}:{" "}
            <span className="font-medium text-foreground">{urls.length.toLocaleString("da-DK")} fliser</span>,
            ca. <span className="font-medium text-foreground">{formatBytes(estimated)}</span>
          </p>
          <p className="text-text-muted">
            Lag: {layerIds.map((id) => LAYER_LABELS[id] ?? id).join(", ")}
            {available !== null && <> · Ledig plads: {formatBytes(available)}</>}
          </p>
        </div>
      )}

      {check.exceedsQuota && phase === "idle" && (
        <p className="text-xs text-red-600 dark:text-red-400" role="alert">
          Der er sandsynligvis ikke plads nok i browseren til at gemme det her. Vælg færre lag, et mindre
          papirformat eller en større målestok.
        </p>
      )}
      {check.tooLarge && (
        <p className="text-xs text-red-600 dark:text-red-400" role="alert">
          Området er for stort (over {MAX_TILE_COUNT.toLocaleString("da-DK")} fliser). Vælg et mindre område.
        </p>
      )}
      {check.needsConfirm && !check.tooLarge && phase === "idle" && (
        <label className="flex items-start gap-2 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmedFor(e.target.checked ? planKey : null)}
            className="mt-0.5 accent-primary"
          />
          <span>
            Jeg vil hente {urls.length > CONFIRM_TILE_COUNT ? "mere end 2.000 fliser" : "over 100 MB"} (
            {urls.length.toLocaleString("da-DK")} fliser, ca. {formatBytes(estimated)})
          </span>
        </label>
      )}

      {phase === "idle" ? (
        <button
          type="button"
          disabled={!canStart}
          onClick={start}
          className="px-3 py-1.5 rounded text-xs bg-primary text-on-primary hover:bg-primary-hover transition-colors disabled:opacity-50 pointer-coarse:min-h-11"
        >
          Gem området
        </button>
      ) : (
        <div className="space-y-2">
          <progress
            value={pct}
            max={100}
            aria-label="Fremdrift for hentning af fliser"
            className="w-full h-2"
          />
          <p className="text-xs text-text-secondary" aria-live="polite">
            {progress?.done ?? 0} af {progress?.total ?? 0} fliser · {formatBytes(progress?.bytes ?? 0)}
            {progress && progress.failed > 0 ? ` · ${progress.failed} fejlede` : ""}
            {phase === "paused" ? " · sat på pause" : ""}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                pausedRef.current = phase === "running";
                setPhase(phase === "running" ? "paused" : "running");
              }}
              className="px-2 py-1 rounded text-xs border border-border hover:border-text-muted transition-colors pointer-coarse:min-h-11"
            >
              {phase === "running" ? "Pause" : "Fortsæt"}
            </button>
            <button
              type="button"
              onClick={() => {
                cancelledRef.current = true;
              }}
              className="px-2 py-1 rounded text-xs border border-border hover:border-text-muted transition-colors pointer-coarse:min-h-11"
            >
              Afbryd
            </button>
          </div>
        </div>
      )}

      {areas.length > 0 && (
        <ul className="space-y-1" aria-label="Gemte områder">
          {areas.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-2 text-xs">
              <span>
                {new Date(a.createdAt).toLocaleDateString("da-DK", { day: "numeric", month: "short", year: "numeric" })}
                {" · "}
                {a.layerIds.map((id) => LAYER_LABELS[id] ?? id).join(", ")}
                <span className="text-text-muted">
                  {" · "}
                  {a.tileCount.toLocaleString("da-DK")} fliser, {formatBytes(a.bytes)}
                </span>
              </span>
              <button
                type="button"
                onClick={() => remove(a)}
                disabled={phase !== "idle"}
                className="px-2 py-1 rounded border border-border hover:border-text-muted transition-colors disabled:opacity-50 pointer-coarse:min-h-11"
              >
                Slet
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[10px] text-text-muted">
        Fliserne hentes højst seks ad gangen fra Dataforsyningen og bruges af kortet uden net.
      </p>
    </div>
  );
}
