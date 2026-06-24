"use client";

// Oficina HD (motor canvas del repo) — ESTÁTICA en su cuadro, editor al costado,
// y gestión libre de agentes con su estado abajo. Sin zoom +/- (tamaño único).
import { useEffect, useRef, useState } from "react";
import { Pencil, Check, Trash2, UserPlus, X } from "lucide-react";
import { OfficeCanvas } from "@/lib/pixel/components/OfficeCanvas";
import { EditorState } from "@/lib/pixel/editor/editorState";
import { OfficeState } from "@/lib/pixel/engine/officeState";
import { useEditorActions } from "@/lib/pixel/hooks/useEditorActions";
import { useEditorKeyboard } from "@/lib/pixel/hooks/useEditorKeyboard";
import { loadPixelAssets } from "@/lib/pixel/loadAssets";
import PixelEditPanel from "@/components/PixelEditPanel";

const TILE = 16;
const editorState = new EditorState();
let osRef: OfficeState | null = null;
function getOfficeState(): OfficeState {
  if (!osRef) osRef = new OfficeState();
  return osRef;
}

type AgentMeta = { id: number; nombre: string };
const ESTADO: Record<string, { t: string; c: string }> = {
  type: { t: "Trabajando", c: "#0f9d58" },
  walk: { t: "Caminando", c: "#1d429b" },
  idle: { t: "En su puesto", c: "#6d6e71" },
};

export default function PixelOfficeHD({ height = 560 }: { height?: number }) {
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loadedAssets, setLoadedAssets] = useState<any>(null);
  const [agents, setAgents] = useState<AgentMeta[]>([]);
  const [zoom, setZoom] = useState(2);
  const [boxH, setBoxH] = useState(height);
  const [, force] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);

  const editor = useEditorActions(getOfficeState, editorState);

  useEditorKeyboard(
    editor.isEditMode, editorState,
    () => { editor.handleDeleteSelected(); force((n) => n + 1); },
    editor.handleRotateSelected, editor.handleToggleState,
    editor.handleUndo, editor.handleRedo,
    () => force((n) => n + 1),
    () => { editor.handleToggleEditMode(); force((n) => n + 1); },
  );

  // Carga inicial + agentes por defecto
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { layout, loadedAssets } = await loadPixelAssets();
        if (cancelled) return;
        if (!layout) { setErr("No se pudo cargar el layout."); return; }
        const os = getOfficeState();
        os.rebuildFromLayout(layout);
        editor.setLastSavedLayout(layout);
        setLoadedAssets(loadedAssets);
        // Tamaño PROMEDIO sin scroll: el zoom se limita a una altura máxima que
        // entra en pantalla; el cuadro queda exacto al tamaño de la oficina (sin
        // márgenes). Integer zoom para que el pixel-art quede nítido.
        const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
        const maxH = 440; // tope para que no haya scroll vertical
        const z = Math.max(1, Math.floor((maxH * dpr) / (layout.rows * TILE)));
        setZoom(z);
        setBoxH((layout.rows * TILE * z) / dpr);
        // arranca con 4 agentes; el usuario agrega/quita los que quiera
        const seed: AgentMeta[] = [];
        for (let i = 0; i < 4; i++) { os.addAgent(i); seed.push({ id: i, nombre: `Agente ${i + 1}` }); }
        nextId.current = 4;
        setAgents(seed);
        setReady(true);
      } catch (e) {
        setErr(String((e as Error).message || e));
      }
    })();
    return () => { cancelled = true; };
    // Cargar UNA sola vez al montar (no depende de editor, que se recrea cada render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresca el estado de los agentes (lista de abajo) periódicamente
  useEffect(() => {
    if (!ready) return;
    const iv = setInterval(() => force((n) => n + 1), 900);
    return () => clearInterval(iv);
  }, [ready]);

  function addAgent() {
    const os = getOfficeState();
    const id = nextId.current++;
    os.addAgent(id);
    setAgents((a) => [...a, { id, nombre: `Agente ${a.length + 1}` }]);
  }
  function removeAgent(id: number) {
    getOfficeState().removeAgent(id);
    setAgents((a) => a.filter((x) => x.id !== id));
  }
  function rename(id: number, nombre: string) {
    setAgents((a) => a.map((x) => (x.id === id ? { ...x, nombre } : x)));
  }

  const officeState = getOfficeState();
  const selUid = editorState.selectedFurnitureUid;
  const selColor = selUid
    ? (officeState.getLayout().furniture.find((f) => f.uid === selUid)?.color ?? null)
    : null;

  return (
    <div className="space-y-3">
      {/* controles de edición */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => { editor.handleToggleEditMode(); force((n) => n + 1); }}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
            editor.isEditMode ? "bg-wh-orange text-white shadow-orange" : "border border-[var(--color-line)] text-[var(--color-muted)] hover:text-[var(--color-ink)]"
          }`}
        >
          {editor.isEditMode ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
          {editor.isEditMode ? "Listo" : "Editar oficina"}
        </button>
        {editor.isEditMode && selUid && (
          <button
            onClick={() => { editor.handleDeleteSelected(); force((n) => n + 1); }}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white transition hover:brightness-105"
            style={{ background: "#c0392b" }}
            title="Borrar el mueble seleccionado (o tecla Supr)"
          >
            <Trash2 className="h-3.5 w-3.5" /> Borrar selección
          </button>
        )}
        {editor.isEditMode && <span className="text-[11px] text-[var(--color-muted)]">Clic = seleccionar · arrastra = mover · Supr = borrar · R = rota · guarda solo</span>}
      </div>

      {/* cuadro estático + editor al costado */}
      <div className="flex gap-3">
        <div ref={wrapRef} className="exec-card relative flex-1 overflow-hidden p-0" style={{ height: boxH }}>
          {err && <div className="p-4 text-sm font-semibold text-red-500">Error: {err}</div>}
          {!ready && !err && <div className="p-4 text-sm text-[var(--color-muted)]">Cargando oficina HD…</div>}
          {ready && !err && (
            <>
              <OfficeCanvas
                officeState={officeState}
                onClick={(id: number) => { officeState.selectedAgentId = id; force((n) => n + 1); }}
                isEditMode={editor.isEditMode}
                editorState={editorState}
                onEditorTileAction={editor.handleEditorTileAction}
                onEditorEraseAction={editor.handleEditorEraseAction}
                onEditorSelectionChange={() => force((n) => n + 1)}
                onDeleteSelected={editor.handleDeleteSelected}
                onRotateSelected={editor.handleRotateSelected}
                onDragMove={editor.handleDragMove}
                editorTick={editor.editorTick}
                zoom={zoom}
                onZoomChange={() => { /* tamaño único — zoom fijo */ }}
                panRef={editor.panRef}
              />
            </>
          )}
        </div>

        {/* panel de edición AL COSTADO (propio, estilo del app) */}
        {editor.isEditMode && ready && (
          <aside className="exec-card relative w-64 shrink-0 overflow-y-auto p-3" style={{ height: boxH }}>
            <PixelEditPanel
              editor={editor}
              activeTool={editorState.activeTool}
              selectedType={editorState.selectedFurnitureType}
              onChanged={() => force((n) => n + 1)}
            />
          </aside>
        )}
      </div>

      {/* PANEL DE AGENTES (abajo): control total + estado en vivo */}
      <div className="exec-card p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-bold text-[var(--color-ink)]">Agentes ({agents.length})</span>
          <button onClick={addAgent} className="flex items-center gap-1.5 rounded-lg bg-wh-orange px-3 py-1.5 text-xs font-bold text-white shadow-orange transition hover:brightness-105">
            <UserPlus className="h-3.5 w-3.5" /> Agregar agente
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {agents.map((a) => {
            const ch = officeState.characters.get(a.id);
            const est = ESTADO[ch?.state ?? "idle"] ?? ESTADO.idle;
            return (
              <div key={a.id} className="flex items-center gap-2 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-1.5">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: est.c }} />
                <div className="min-w-0 flex-1">
                  <input
                    value={a.nombre}
                    onChange={(e) => rename(a.id, e.target.value)}
                    className="w-full bg-transparent text-xs font-semibold text-[var(--color-ink)] outline-none"
                  />
                  <div className="text-[10px]" style={{ color: est.c }}>{est.t}</div>
                </div>
                <button onClick={() => removeAgent(a.id)} title="Quitar agente" className="grid h-5 w-5 shrink-0 place-items-center rounded text-[var(--color-muted)] hover:text-red-500">
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
          {agents.length === 0 && <div className="col-span-full py-2 text-center text-xs text-[var(--color-muted)]">Sin agentes — usa “Agregar agente”.</div>}
        </div>
      </div>
    </div>
  );
}
