"use client";

import type { LayerStyle } from "@/stores/importStore";

interface StylePanelProps {
  style: LayerStyle;
  onUpdate: (style: Partial<LayerStyle>) => void;
}

export function StylePanel({ style, onUpdate }: StylePanelProps) {
  return (
    <div className="ml-6 mt-1 space-y-2 text-xs">
      <div className="flex items-center gap-2">
        <label className="text-text-muted w-14">Farve</label>
        <input
          type="color"
          value={style.lineColor}
          onChange={(e) =>
            onUpdate({ lineColor: e.target.value, fillColor: e.target.value })
          }
          className="w-6 h-6 rounded border border-border cursor-pointer"
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-text-muted w-14">Tykkelse</label>
        <input
          type="range"
          min={1}
          max={8}
          step={1}
          value={style.lineWidth}
          onChange={(e) => onUpdate({ lineWidth: Number(e.target.value) })}
          className="flex-1 h-1 accent-primary"
        />
        <span className="text-text-secondary w-6 text-right">{style.lineWidth}px</span>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-text-muted w-14">Linjestil</label>
        <select
          value={style.lineStyle}
          onChange={(e) =>
            onUpdate({ lineStyle: e.target.value as LayerStyle["lineStyle"] })
          }
          className="rounded border border-border px-1 py-0.5 text-xs bg-surface"
        >
          <option value="solid">Solid</option>
          <option value="dashed">Stiplet</option>
          <option value="dotted">Prikket</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-text-muted w-14">Fyld</label>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={Math.round(style.fillOpacity * 100)}
          onChange={(e) =>
            onUpdate({ fillOpacity: Number(e.target.value) / 100 })
          }
          className="flex-1 h-1 accent-primary"
        />
        <span className="text-text-secondary w-6 text-right">
          {Math.round(style.fillOpacity * 100)}%
        </span>
      </div>
    </div>
  );
}
