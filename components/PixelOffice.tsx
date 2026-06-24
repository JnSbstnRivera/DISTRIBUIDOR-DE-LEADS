"use client";

import { useEffect, useRef, useState } from "react";
import { FURN_CATALOG, SPR, TINTS, type OfficeLayout, type Room, type Furn, type LogoItem } from "@/lib/office";

/* ── Paleta Windmar ── */
const C = { orange: "#F89B24", navy: "#21274E", wall: "#1a2240" };

export type Facing = "down" | "up" | "left" | "right";
export type AgentState = "walking" | "working" | "idle" | "sitting";

// Agente en coordenadas de tile (col,row flotantes para interpolar el paso).
export type OfficeAgent = {
  id: string; nombre: string; sheet: string;
  col: number; row: number;
  path: { col: number; row: number }[];
  seat: { col: number; row: number } | null;
  seatFace: Facing; // de perfil/espaldas al sentarse
  home?: { x0: number; y0: number; x1: number; y1: number }; // cuarto donde deambula (no cruza muros)
  state: AgentState; facing: Facing; frame: number; wait: number; goingSeat: boolean;
};

/* ── Sprites de personaje ── */
type SheetMeta = {
  cols: number; rows: number; fw: number; fh: number; dispH: number; base: string;
  dir: { down: number; up: number; left?: number; right?: number };
  walk: number[]; idle: number; type?: number[];
};
const CHAR: Omit<SheetMeta, "base"> = {
  cols: 7, rows: 3, fw: 16, fh: 32, dispH: 104,
  dir: { down: 0, up: 1, right: 2 }, walk: [0, 1, 2], idle: 1, type: [3, 4],
};
export const SHEET_META: Record<string, SheetMeta> = {
  char_0: { ...CHAR, base: "/agents/pixel/" }, char_1: { ...CHAR, base: "/agents/pixel/" },
  char_2: { ...CHAR, base: "/agents/pixel/" }, char_3: { ...CHAR, base: "/agents/pixel/" },
  char_4: { ...CHAR, base: "/agents/pixel/" }, char_5: { ...CHAR, base: "/agents/pixel/" },
};

const SIT_OFFSET = 0.16; // baja un poco al sentarse
// Escala NATIVA como el repo Pixel Agents: personaje = 1 tile de ancho, muebles a su footprint exacto.
const AGENT_SCALE = 1.0;
const FURN_SCALE = 1.0;

export function SpriteImg({
  sheet, facing = "down", frame = 0, walking = false, working = false, seated = false, scale = 1, w,
}: {
  sheet: string; facing?: Facing; frame?: number; walking?: boolean; working?: boolean; seated?: boolean; scale?: number; w?: number;
}) {
  const m = SHEET_META[sheet] || SHEET_META.char_0;
  const dispW = w != null ? w : (m.dispH * scale * m.fw) / m.fh;
  const dispH = (dispW * m.fh) / m.fw;

  let row = m.dir.down;
  let flip = false;
  if (facing === "up") row = m.dir.up;
  else if (facing === "down") row = m.dir.down;
  else if (facing === "right") { if (m.dir.right != null) row = m.dir.right; else { row = m.dir.left!; flip = true; } }
  else if (facing === "left") { if (m.dir.left != null) row = m.dir.left; else { row = m.dir.right!; flip = true; } }

  const typeFrames = m.type ?? [m.idle];
  const col = working ? typeFrames[frame % typeFrames.length] : walking ? m.walk[frame % m.walk.length] : m.idle;
  // sentado (trabajando o quieto) baja al asiento; quieto usa el frame idle
  const sitOffset = working || seated ? dispH * SIT_OFFSET : 0;

  return (
    <div className="relative flex flex-col items-center" style={{ transform: flip ? "scaleX(-1)" : undefined }}>
      <div
        style={{
          width: dispW, height: dispH, transform: `translateY(${sitOffset}px)`,
          backgroundImage: `url(${m.base}${sheet}.png)`,
          backgroundSize: `${dispW * m.cols}px ${dispH * m.rows}px`,
          backgroundPosition: `-${col * dispW}px -${row * dispH}px`,
          imageRendering: "pixelated",
        }}
      />
      <div style={{ width: dispW * 0.55, height: 3, marginTop: -2, background: "rgba(0,0,0,.3)", borderRadius: 99, filter: "blur(1px)" }} />
    </div>
  );
}

/* z-index por fila inferior: lo más abajo se pinta encima (sentarse natural). */
function zFromRow(bottomRow: number) { return 100 + Math.round(bottomRow * 10); }

type DragState =
  | { kind: "furn"; id: string; gdc: number; gdr: number }
  | { kind: "room"; id: string; mode: "move" | "resize"; gdc: number; gdr: number }
  | { kind: "logo"; id: string; mode: "move" | "resize"; gdc: number; gdr: number }
  | null;

export default function PixelOffice({
  layout, agents,
  areasMode = false,
  selFurn = null, selRoom = null, selLogo = null,
  onPickFurniture, onMoveFurniture,
  onPickAgent,
  onPickRoom, onMoveRoom, onResizeRoom,
  onPickLogo, onMoveLogo, onResizeLogo,
  onClearSelection,
  editing = false,
  status = {},
}: {
  layout: OfficeLayout;
  agents: OfficeAgent[];
  areasMode?: boolean;
  editing?: boolean; // solo permite arrastrar/editar cuando está activo
  status?: Record<string, string>; // estado en vivo por agente (burbuja)
  selFurn?: string | null;
  selRoom?: string | null;
  selLogo?: string | null;
  onPickFurniture?: (id: string) => void;
  onMoveFurniture?: (id: string, col: number, row: number) => void;
  onPickAgent?: (id: string) => void;
  onPickRoom?: (id: string) => void;
  onMoveRoom?: (id: string, col: number, row: number) => void;
  onResizeRoom?: (id: string, w: number, h: number) => void;
  onPickLogo?: (id: string) => void;
  onMoveLogo?: (id: string, col: number, row: number) => void;
  onResizeLogo?: (id: string, w: number, h: number) => void;
  onClearSelection?: () => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [wPx, setWPx] = useState(820);
  const drag = useRef<DragState>(null);
  const { cols, rows } = layout;
  const tile = wPx / cols;

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWPx(el.clientWidth || 820));
    ro.observe(el);
    setWPx(el.clientWidth || 820);
    return () => ro.disconnect();
  }, []);

  function tileFromEvent(e: { clientX: number; clientY: number }) {
    const r = boxRef.current!.getBoundingClientRect();
    return { c: ((e.clientX - r.left) / r.width) * cols, r: ((e.clientY - r.top) / r.height) * rows };
  }

  function startFurnDrag(e: React.PointerEvent, f: Furn) {
    e.preventDefault(); e.stopPropagation();
    onPickFurniture?.(f.id);
    const t = tileFromEvent(e);
    drag.current = { kind: "furn", id: f.id, gdc: t.c - f.col, gdr: t.r - f.row };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }
  function startLogoDrag(e: React.PointerEvent, lg: LogoItem, mode: "move" | "resize") {
    e.preventDefault(); e.stopPropagation();
    onPickLogo?.(lg.id);
    const t = tileFromEvent(e);
    drag.current = { kind: "logo", id: lg.id, mode, gdc: t.c - lg.col, gdr: t.r - lg.row };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }
  function startRoomDrag(e: React.PointerEvent, room: Room, mode: "move" | "resize") {
    if (!editing || !areasMode) return;
    e.preventDefault(); e.stopPropagation();
    onPickRoom?.(room.id);
    const t = tileFromEvent(e);
    drag.current = { kind: "room", id: room.id, mode, gdc: t.c - room.col, gdr: t.r - room.row };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }

  function onMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const t = tileFromEvent(e);
    const clamp = (v: number, max: number) => Math.max(0, Math.min(max, v));
    if (d.kind === "furn") {
      const cat = FURN_CATALOG[layout.furniture.find((f) => f.id === d.id)?.type ?? ""];
      const tw = cat?.tw ?? 1, th = cat?.th ?? 1;
      onMoveFurniture?.(d.id, clamp(Math.round(t.c - d.gdc), cols - tw), clamp(Math.round(t.r - d.gdr), rows - th));
    } else if (d.kind === "room") {
      const room = layout.rooms.find((r) => r.id === d.id);
      if (!room) return;
      if (d.mode === "move") onMoveRoom?.(d.id, clamp(Math.round(t.c - d.gdc), cols - room.w), clamp(Math.round(t.r - d.gdr), rows - room.h));
      else onResizeRoom?.(d.id, Math.max(3, Math.min(cols - room.col, Math.round(t.c - room.col + 0.5))), Math.max(3, Math.min(rows - room.row, Math.round(t.r - room.row + 0.5))));
    } else if (d.kind === "logo") {
      const lg = layout.logos?.find((l) => l.id === d.id);
      if (!lg) return;
      if (d.mode === "move") onMoveLogo?.(d.id, clamp(Math.round(t.c - d.gdc), cols - lg.w), clamp(Math.round(t.r - d.gdr), rows - lg.h));
      else onResizeLogo?.(d.id, Math.max(1, Math.min(cols - lg.col, Math.round(t.c - lg.col + 0.5))), Math.max(1, Math.min(rows - lg.row, Math.round(t.r - lg.row + 0.5))));
    }
  }
  function onUp() { drag.current = null; }

  return (
    <div
      ref={boxRef}
      className="relative w-full overflow-hidden rounded-xl select-none"
      style={{ aspectRatio: `${cols} / ${rows}`, background: C.wall, border: `4px solid ${C.navy}` }}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerDown={() => editing && onClearSelection?.()}
    >
      {/* Logo Pixel Agents — discreto en la esquina inferior izquierda, solo el ícono */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/agents/pixel/pixel-agents-icon.png" alt="" className="pointer-events-none absolute" style={{ left: 8, bottom: 8, width: 20, height: 20, imageRendering: "pixelated", borderRadius: 4, opacity: 0.8, zIndex: 9000 }} />

      {/* Áreas (pisos) */}
      {layout.rooms.map((room) => {
        const sel = areasMode && selRoom === room.id;
        return (
          <div
            key={room.id}
            onPointerDown={(e) => startRoomDrag(e, room, "move")}
            className="absolute overflow-hidden"
            style={{
              left: room.col * tile, top: room.row * tile, width: room.w * tile, height: room.h * tile,
              zIndex: 2,
              border: `2px solid ${sel ? C.orange : C.navy}`,
              cursor: editing && areasMode ? "grab" : "default",
              pointerEvents: editing && areasMode ? "auto" : "none",
            }}
          >
            {/* piso (solo este lleva el tinte, para no teñir la etiqueta) */}
            <div className="absolute inset-0" style={{ backgroundImage: `url(${SPR}${room.tile}.png)`, backgroundSize: `${tile}px ${tile}px`, imageRendering: "pixelated", filter: room.tint ? TINTS[room.tint] : undefined }} />
            {/* pared trasera 3D (cap superior claro + cara navy + sombra base) — donde cuelgan cuadros y estantes */}
            <div
              className="pointer-events-none absolute left-0 right-0 top-0"
              style={{
                height: Math.round(tile * 0.95),
                background: `linear-gradient(180deg, #3c4a86 0%, #3c4a86 30%, #262e57 31%, #1c2247 100%)`,
                borderBottom: `${Math.max(2, tile * 0.12)}px solid #11152b`,
                boxShadow: "inset 0 2px 0 rgba(255,255,255,.08)",
                zIndex: 3,
              }}
            />
            <span className="pointer-events-none absolute left-1 top-1 rounded-sm px-1.5 py-0.5 text-[9px] font-bold" style={{ background: C.navy, color: C.orange, border: `1px solid ${C.orange}`, zIndex: 50 }}>
              {room.label}
            </span>
            {sel && (
              <div onPointerDown={(e) => startRoomDrag(e, room, "resize")} title="Redimensionar" className="absolute" style={{ right: -7, bottom: -7, width: 14, height: 14, background: C.orange, border: "2px solid #fff", borderRadius: 3, cursor: "nwse-resize", zIndex: 60 }} />
            )}
          </div>
        );
      })}

      {/* Mobiliario (z-sort por fila inferior, escala visual anclada al borde inferior) */}
      {layout.furniture.map((f) => {
        const cat = FURN_CATALOG[f.type];
        if (!cat) return null;
        const sel = selFurn === f.id;
        const z = zFromRow(f.row + cat.th);
        // electrónica (monitores) se renderiza compacta para que se vea como pantalla sobre el escritorio, no como torre
        const scl = cat.cat === "electronica" ? 0.8 : FURN_SCALE;
        const fw = cat.tw * tile, fh = cat.th * tile;
        const sw = fw * scl, sh = fh * scl;
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={f.id}
            src={`${SPR}${f.type}.png`}
            alt={cat.label}
            draggable={false}
            onPointerDown={(e) => startFurnDrag(e, f)}
            className="absolute"
            style={{
              left: f.col * tile + (fw - sw) / 2, top: f.row * tile + (fh - sh), width: sw, height: sh,
              imageRendering: "pixelated", zIndex: sel ? 8000 : z,
              transform: f.mirrored ? "scaleX(-1)" : undefined,
              cursor: editing ? "grab" : "default",
              pointerEvents: editing ? "auto" : "none",
              outline: sel ? `2px dashed ${C.orange}` : undefined, outlineOffset: 2,
              touchAction: "none",
            }}
          />
        );
      })}

      {/* Logos pixel-art */}
      {(layout.logos ?? []).map((lg) => {
        const sel = selLogo === lg.id;
        const z = zFromRow(lg.row + lg.h);
        return (
          <div
            key={lg.id}
            onPointerDown={(e) => startLogoDrag(e, lg, "move")}
            className="absolute"
            style={{
              left: lg.col * tile, top: lg.row * tile, width: lg.w * tile, height: lg.h * tile,
              zIndex: sel ? 8000 : z, cursor: editing ? "grab" : "default",
              pointerEvents: editing ? "auto" : "none",
              outline: sel ? `2px dashed ${C.orange}` : undefined, outlineOffset: 2, touchAction: "none",
              // marco tipo cuadro colgado en la pared
              ...(lg.frame ? { background: "#fff", border: `${Math.max(2, tile * 0.18)}px solid ${C.navy}`, padding: tile * 0.12, boxShadow: "2px 3px 0 rgba(0,0,0,.35)" } : {}),
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lg.src} alt="logo" draggable={false} style={{ width: "100%", height: "100%", objectFit: "contain", imageRendering: "pixelated" }} />
            {sel && (
              <div onPointerDown={(e) => startLogoDrag(e, lg, "resize")} title="Redimensionar" className="absolute" style={{ right: -7, bottom: -7, width: 14, height: 14, background: C.orange, border: "2px solid #fff", borderRadius: 3, cursor: "nwse-resize" }} />
            )}
          </div>
        );
      })}

      {/* Agentes — clic para editar; z-sort por la fila de los pies */}
      {agents.map((a) => {
        const sittingNow = a.state === "working" || a.state === "sitting";
        const z = zFromRow(a.row + 1 + (sittingNow ? 0.5 : 0.9));
        return (
          <div
            key={a.id}
            onPointerDown={(e) => { if (!editing) return; e.stopPropagation(); onPickAgent?.(a.id); }}
            className="absolute"
            style={{
              left: (a.col + 0.5) * tile, top: (a.row + 1) * tile,
              transform: "translate(-50%,-100%)", transition: "left .12s linear, top .12s linear", zIndex: z, cursor: editing ? "pointer" : "default",
            }}
          >
            <SpriteImg sheet={a.sheet} facing={a.facing} frame={a.frame} walking={a.state === "walking"} working={a.state === "working"} seated={a.state === "sitting"} w={tile * AGENT_SCALE} />
          </div>
        );
      })}

      {/* Etiquetas + burbuja de estado en vivo — capa superior */}
      {agents.map((a) => {
        const spriteH = tile * AGENT_SCALE * 2;
        const st = status[a.id];
        return (
          <div key={`lbl_${a.id}`} className="pointer-events-none absolute flex flex-col items-center gap-0.5" style={{ left: (a.col + 0.5) * tile, top: (a.row + 1) * tile, transform: `translate(-50%,calc(-100% - ${spriteH}px))`, zIndex: 8500 }}>
            {st && (
              <span className="whitespace-nowrap rounded px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ background: a.state === "working" ? "#0f9d58" : "#1d429b" }}>
                {st}
              </span>
            )}
            <span className="whitespace-nowrap rounded bg-black/65 px-1.5 py-0.5 text-[9px] font-bold text-white">{a.nombre}</span>
          </div>
        );
      })}
    </div>
  );
}
