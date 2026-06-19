"use client";

import { useEffect, useRef, useState } from "react";

/* ── Paleta Windmar ── */
const C = {
  orange: "#F89B24",
  blue: "#1D429B",
  black: "#231F20",
  lblue: "#A6C3E6",
  grey: "#6D6E71",
  tgrey: "#A7A9AC",
  navy: "#21274E",
  beige: "#F6F1E6",
  skin: "#e7b48a",
  floorWork: "#e9e5dd",
  floorMgr: "#2e4f86",
  wall: "#1a2240",
};

export type Facing = "down" | "up" | "left" | "right";
export type AgentState = "walking" | "working" | "idle";

export type OfficeAgent = {
  id: string;
  nombre: string;
  sheet: string; // nombre del sprite en /agents/clean (ej. "agent1")
  genero: "h" | "m";
  hair: string;
  x: number; // %
  y: number; // %
  tx: number;
  ty: number;
  desk: { x: number; y: number };
  zone: { x0: number; y0: number; x1: number; y1: number };
  state: AgentState;
  facing: Facing;
  frame: number;
  wait: number;
  goingDesk: boolean;
};

/* ── Sprite del agente desde la hoja PNG real ── */
const ROW: Record<Facing, number> = { down: 0, up: 3, left: 2, right: 2 };

// metadatos de cada hoja: cols/rows y si es un strip (1 fila de frames)
export const SHEET_META: Record<string, { cols: number; rows: number; strip?: boolean }> = {
  agent1: { cols: 4, rows: 4 },
  agent2: { cols: 4, rows: 4 },
  agent3: { cols: 4, rows: 4 },
  agent4: { cols: 4, rows: 4 },
  leadH: { cols: 6, rows: 1, strip: true },
  leadM: { cols: 6, rows: 1, strip: true },
};
export const isStrip = (sheet: string) => !!SHEET_META[sheet]?.strip;

export function SpriteImg({
  sheet,
  facing = "down",
  frame = 0,
  w = 42,
}: {
  sheet: string;
  facing?: Facing;
  frame?: number;
  w?: number;
}) {
  const meta = SHEET_META[sheet] || { cols: 4, rows: 4 };
  const h = w * 1.5; // celda 64×96 = 2:3
  const row = meta.strip ? 0 : ROW[facing] ?? 0;
  const col = frame % meta.cols;
  const flip = !meta.strip && facing === "right";
  return (
    <div className="relative flex flex-col items-center">
      <div
        style={{
          width: w,
          height: h,
          backgroundImage: `url(/agents/clean/${sheet}.png)`,
          backgroundSize: `${w * meta.cols}px ${h * meta.rows}px`,
          backgroundPosition: `-${col * w}px -${row * h}px`,
          imageRendering: "pixelated",
          transform: flip ? "scaleX(-1)" : undefined,
        }}
      />
      <div style={{ width: w * 0.5, height: 4, marginTop: -2, background: "rgba(0,0,0,.28)", borderRadius: 99, filter: "blur(1px)" }} />
    </div>
  );
}

/* ── Mobiliario (bloques estilizados) ── */
function Desk({ x, y }: { x: number; y: number }) {
  return (
    <div className="absolute" style={{ left: `${x}%`, top: `${y}%` }}>
      <div style={{ width: 56, height: 30, background: "#fff", borderRadius: 4, border: `1px solid ${C.tgrey}`, boxShadow: "0 2px 0 rgba(0,0,0,.12)" }}>
        <div style={{ width: 16, height: 14, margin: "4px auto 0", background: C.navy, borderRadius: 2, borderBottom: `3px solid ${C.grey}` }}>
          <div style={{ width: 12, height: 8, margin: "2px auto", background: C.lblue, borderRadius: 1 }} />
        </div>
      </div>
      {/* silla azul */}
      <div style={{ width: 14, height: 14, margin: "2px auto 0", background: C.blue, borderRadius: 3, border: `1px solid ${C.navy}` }} />
    </div>
  );
}
function Shelf({ x, y }: { x: number; y: number }) {
  return (
    <div className="absolute flex gap-[2px] rounded-sm p-[2px]" style={{ left: `${x}%`, top: `${y}%`, background: "#cfd6e6" }}>
      {[C.orange, C.blue, C.lblue, C.grey, C.blue].map((c, i) => (
        <span key={i} style={{ width: 3, height: 16, background: c, borderRadius: 1 }} />
      ))}
    </div>
  );
}
function Plant({ x, y }: { x: number; y: number }) {
  return (
    <div className="absolute" style={{ left: `${x}%`, top: `${y}%` }}>
      <div style={{ width: 16, height: 14, background: "#2f7d4f", borderRadius: "50% 50% 40% 40%", margin: "0 auto" }} />
      <div style={{ width: 11, height: 8, background: "#fff", borderRadius: "0 0 3px 3px", margin: "0 auto", border: `1px solid ${C.tgrey}` }} />
    </div>
  );
}
function LogoFrame({ x, y }: { x: number; y: number }) {
  return (
    <div className="absolute grid place-items-center" style={{ left: `${x}%`, top: `${y}%`, width: 34, height: 22, background: "#fff", borderRadius: 3, border: `2px solid ${C.navy}` }}>
      <span style={{ color: C.blue, fontWeight: 900, fontSize: 12, lineHeight: 1 }}>W</span>
    </div>
  );
}

export default function PixelOffice({ agents }: { agents: OfficeAgent[] }) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-xl"
      style={{ aspectRatio: "1.9 / 1", background: C.wall, border: `4px solid ${C.navy}` }}
    >
      {/* Pisos / cuartos */}
      <div className="absolute" style={{ left: "2%", top: "4%", width: "58%", height: "92%", background: C.floorWork, backgroundImage: "repeating-linear-gradient(0deg,rgba(0,0,0,.04) 0 1px,transparent 1px 28px),repeating-linear-gradient(90deg,rgba(0,0,0,.04) 0 1px,transparent 1px 28px)", borderRadius: 4 }} />
      <div className="absolute" style={{ left: "63%", top: "4%", width: "35%", height: "44%", background: C.floorMgr, borderRadius: 4 }} />
      <div className="absolute" style={{ left: "63%", top: "52%", width: "35%", height: "44%", background: C.floorMgr, borderRadius: 4 }} />

      {/* Workspace props */}
      <Shelf x={8} y={6} /> <Shelf x={18} y={6} /> <Shelf x={30} y={6} />
      <Plant x={5} y={6} /> <Plant x={42} y={6} />
      {/* water cooler / clock / printer */}
      <div className="absolute" style={{ left: "50%", top: "6%", width: 12, height: 22, background: C.lblue, borderRadius: 3, border: `1px solid ${C.navy}` }} />
      <div className="absolute rounded-full bg-white" style={{ left: "56%", top: "6%", width: 16, height: 16, border: `2px solid ${C.navy}` }} />
      <div className="absolute" style={{ left: "44%", top: "7%", width: 18, height: 14, background: C.grey, borderRadius: 2 }} />
      <LogoFrame x={37} y={6} />
      {/* desks */}
      <Desk x={10} y={28} /> <Desk x={38} y={28} />
      <Desk x={10} y={66} /> <Desk x={38} y={66} />
      <Plant x={5} y={88} /> <Plant x={52} y={88} />

      {/* Meeting room (arriba dcha) */}
      <LogoFrame x={80} y={8} />
      <Shelf x={88} y={9} />
      <div className="absolute" style={{ left: "76%", top: "26%", width: 44, height: 18, background: "#fff", borderRadius: 4, border: `1px solid ${C.tgrey}` }} />
      <Plant x={68} y={10} /> <Plant x={92} y={36} />

      {/* Manager room (abajo dcha) */}
      <LogoFrame x={80} y={54} />
      <div className="absolute" style={{ left: "74%", top: "70%", width: 50, height: 20, background: "#fff", borderRadius: 4, border: `1px solid ${C.tgrey}` }} />
      <Shelf x={66} y={56} /> <Shelf x={90} y={56} />
      <Plant x={66} y={88} /> <Plant x={92} y={88} />

      {/* Agentes */}
      {agents.map((a) => (
        <div
          key={a.id}
          className="absolute z-10"
          style={{ left: `${a.x}%`, top: `${a.y}%`, transform: "translate(-50%,-100%)", transition: "left .12s linear, top .12s linear" }}
        >
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/55 px-1 text-[8px] font-bold text-white">
            {a.nombre}
          </div>
          <SpriteImg sheet={a.sheet} facing={a.facing} frame={a.frame} w={42} />
        </div>
      ))}
    </div>
  );
}
