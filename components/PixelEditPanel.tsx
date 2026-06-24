"use client";

// Panel de edición propio (estilo del app) para la oficina HD — reemplaza el
// EditorToolbar del repo (que dependía de CSS que no tenemos). Usa las mismas
// acciones del motor (handleToolChange, handleFurnitureTypeChange, etc.).
import { useState } from "react";
import { MousePointer2, Sofa, Grid3x3, Square, Eraser, Undo2, Redo2 } from "lucide-react";
import { EditTool } from "@/lib/pixel/types";
import { getActiveCategories, getCatalogByCategory } from "@/lib/pixel/layout/furnitureCatalog";

const TOOLS = [
  { tool: EditTool.SELECT, label: "Seleccionar / Mover", icon: MousePointer2 },
  { tool: EditTool.FURNITURE_PLACE, label: "Colocar mueble", icon: Sofa },
  { tool: EditTool.TILE_PAINT, label: "Pintar piso", icon: Grid3x3 },
  { tool: EditTool.WALL_PAINT, label: "Pintar pared", icon: Square },
  { tool: EditTool.ERASE, label: "Borrar (tile)", icon: Eraser },
];

export default function PixelEditPanel({ editor, activeTool, selectedType, onChanged }: {
  editor: any; activeTool: string; selectedType: string; onChanged: () => void;
}) {
  const cats = getActiveCategories();
  const [cat, setCat] = useState(cats[0]?.id ?? "desks");
  const items = getCatalogByCategory(cat as any);

  const btn = (active: boolean) =>
    `flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
      active ? "bg-wh-orange text-white shadow-orange" : "border border-[var(--color-line)] text-[var(--color-muted)] hover:text-[var(--color-ink)]"
    }`;

  return (
    <div className="space-y-3">
      <div>
        <div className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)]">Herramientas</div>
        <div className="space-y-1">
          {TOOLS.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.tool} onClick={() => { editor.handleToolChange(t.tool); onChanged(); }} className={btn(activeTool === t.tool)}>
                <Icon className="h-3.5 w-3.5 shrink-0" /> {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTool === EditTool.FURNITURE_PLACE && (
        <div>
          <div className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)]">Muebles</div>
          <div className="mb-2 flex flex-wrap gap-1">
            {cats.map((c) => (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                className={`rounded px-2 py-0.5 text-[10px] font-bold transition ${cat === c.id ? "bg-wh-blue text-white" : "border border-[var(--color-line)] text-[var(--color-muted)]"}`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="max-h-60 space-y-1 overflow-y-auto pr-1">
            {items.map((it: any) => (
              <button
                key={it.type}
                onClick={() => { editor.handleFurnitureTypeChange(it.type); onChanged(); }}
                className={`w-full rounded-md border px-2 py-1 text-left text-[11px] font-semibold transition ${
                  selectedType === it.type ? "border-wh-orange bg-wh-orange/10 text-wh-orange" : "border-[var(--color-line)] text-[var(--color-ink)] hover:border-wh-blue"
                }`}
              >
                {it.label || it.type}
              </button>
            ))}
            {items.length === 0 && <div className="text-[11px] text-[var(--color-muted)]">Sin muebles en esta categoría.</div>}
          </div>
          <p className="mt-1 text-[10px] text-[var(--color-muted)]">Elige un mueble y haz clic en la oficina para colocarlo. R lo rota.</p>
        </div>
      )}

      <div className="flex gap-1 border-t border-[var(--color-line)] pt-2">
        <button onClick={() => { editor.handleUndo(); onChanged(); }} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-[var(--color-line)] py-1.5 text-xs font-bold text-[var(--color-muted)] hover:text-[var(--color-ink)]" title="Deshacer (Ctrl+Z)">
          <Undo2 className="h-3.5 w-3.5" /> Deshacer
        </button>
        <button onClick={() => { editor.handleRedo(); onChanged(); }} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-[var(--color-line)] py-1.5 text-xs font-bold text-[var(--color-muted)] hover:text-[var(--color-ink)]" title="Rehacer (Ctrl+Y)">
          <Redo2 className="h-3.5 w-3.5" /> Rehacer
        </button>
      </div>
      <p className="text-[10px] text-[var(--color-muted)]">Los cambios se guardan solos en este navegador.</p>
    </div>
  );
}
