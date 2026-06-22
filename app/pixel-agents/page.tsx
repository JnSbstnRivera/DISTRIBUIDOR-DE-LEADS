"use client";

import { useEffect, useRef, useState } from "react";
import {
  Send, Terminal, Bot, Plus, Trash2, Users, LayoutGrid,
  FlipHorizontal2, RotateCcw, Maximize2, Image as ImageIcon, DoorOpen, Minus, Settings2,
  ChevronDown, ChevronUp, Activity, Check, Pencil,
} from "lucide-react";
import { SectionTitle } from "@/components/ui";
import PixelOffice, { SpriteImg, type OfficeAgent } from "@/components/PixelOffice";
import {
  FURN_CATALOG, FLOOR_TILES, TINTS, DEFAULT_LAYOUT, uid, deriveSeats, walkableGrid, bfs,
  randomWalkable, nearestWalkable, MIN_COLS, MAX_COLS, MIN_ROWS, MAX_ROWS,
  type OfficeLayout, type FurnCat,
} from "@/lib/office";

const SHEETS = ["char_0", "char_1", "char_2", "char_3", "char_4", "char_5"];
const TICK = 120; // ms
const SPEED = 0.25; // tiles por tick

function rnd(a: number, b: number) { return a + (b - a) * Math.random(); }

type Mini = { id: string; nombre: string; sheet: string };

const DEFAULT_MINI: Mini[] = [
  { id: "distribuidor", nombre: "Distribuidor", sheet: "char_0" },
  { id: "asignador", nombre: "Asignación", sheet: "char_1" },
  { id: "zoho", nombre: "Zoho Sync", sheet: "char_2" },
  { id: "n8n", nombre: "N8N Notifier", sheet: "char_3" },
  { id: "gerente", nombre: "Gerente", sheet: "char_4" },
  { id: "calidad", nombre: "Calidad", sheet: "char_5" },
];

function build(mini: Mini[], layout: OfficeLayout): OfficeAgent[] {
  const seats = deriveSeats(layout);
  const walk = walkableGrid(layout);
  return mini.map((m, i) => {
    const seat = seats[i] ?? null;
    const start = seat ?? randomWalkable(walk) ?? { col: 1, row: 1 };
    return {
      id: m.id, nombre: m.nombre, sheet: m.sheet || "char_0",
      col: start.col, row: start.row, path: [], seat,
      state: "idle", facing: "down", frame: 0, wait: Math.round(rnd(8, 40)), goingSeat: false,
    };
  });
}
const miniOf = (list: OfficeAgent[]): Mini[] => list.map((a) => ({ id: a.id, nombre: a.nombre, sheet: a.sheet }));

function saveAgents(mini: Mini[]) { try { localStorage.setItem("pixelOfficeAgents", JSON.stringify(mini)); } catch {} }
function saveLayout(l: OfficeLayout) { try { localStorage.setItem("pixelOfficeLayoutV2", JSON.stringify(l)); } catch {} }

const CAT_LABEL: Record<FurnCat, string> = {
  escritorio: "Escritorios", silla: "Sillas / sofás", almacenaje: "Almacenaje", planta: "Plantas", pared: "Pared", deco: "Decoración", electronica: "Electrónica",
};
const CAT_ORDER: FurnCat[] = ["escritorio", "electronica", "silla", "almacenaje", "planta", "pared", "deco"];
const TINT_KEYS = Object.keys(TINTS); // ninguno/madera/azul/verde/neutro

type Tab = "agentes" | "muebles" | "areas" | "tamano" | "logo";

export default function PixelAgents() {
  const [layout, setLayout] = useState<OfficeLayout>(DEFAULT_LAYOUT);
  const [agents, setAgents] = useState<OfficeAgent[]>(() => build(DEFAULT_MINI, DEFAULT_LAYOUT));
  const [tab, setTab] = useState<Tab>("agentes");
  const [editing, setEditing] = useState(false); // modo edición (off = solo ver a los agentes)
  const [live, setLive] = useState<{ fuente: string; total: number; sinConsultor: number } | null>(null);
  const [selFurn, setSelFurn] = useState<string | null>(null);
  const [selRoom, setSelRoom] = useState<string | null>(null);
  const [selLogo, setSelLogo] = useState<string | null>(null);
  const [selAgent, setSelAgent] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [target, setTarget] = useState("distribuidor");
  const [orden, setOrden] = useState("");
  const [log, setLog] = useState<{ t: string; msg: string }[]>([
    { t: "sistema", msg: "Oficina Windmar lista. Haz clic en un agente o mueble para editarlo. Los agentes recorren toda la oficina." },
  ]);

  const walkRef = useRef(walkableGrid(DEFAULT_LAYOUT));
  const panelRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef<Set<string>>(new Set()); // agentes con trabajo real → van a su escritorio

  // ── Datos en vivo de Zoho → estado real de los agentes ──
  useEffect(() => {
    const pull = async () => {
      try {
        const r = await fetch("/api/zoho/leads", { cache: "no-store" });
        const j = await r.json();
        const leads: { decision?: { via?: string } }[] = j.leads || [];
        const sinConsultor = leads.filter((l) => l.decision?.via === "distribuidor").length;
        setLive({ fuente: j.fuente, total: leads.length, sinConsultor });
      } catch {}
    };
    pull();
    const iv = setInterval(pull, 45000);
    const onVis = () => { if (document.visibilityState === "visible") pull(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(iv); document.removeEventListener("visibilitychange", onVis); };
  }, []);

  // cargar layout + roster guardados
  useEffect(() => {
    let l = DEFAULT_LAYOUT;
    try {
      const rawL = localStorage.getItem("pixelOfficeLayoutV2");
      if (rawL) { const p = JSON.parse(rawL); if (p?.cols && p?.rooms && p?.furniture && p.rev === DEFAULT_LAYOUT.rev) l = p; }
    } catch {}
    let mini = DEFAULT_MINI;
    try {
      const rawA = localStorage.getItem("pixelOfficeAgents");
      if (rawA) { const p = JSON.parse(rawA) as Mini[]; if (Array.isArray(p) && p.length) mini = p.map((m) => ({ id: m.id, nombre: m.nombre, sheet: m.sheet })); }
    } catch {}
    setLayout(l);
    setAgents(build(mini, l));
    walkRef.current = walkableGrid(l);
  }, []);

  // recomputar caminable + reasignar asientos al cambiar el layout
  useEffect(() => {
    const walk = walkableGrid(layout);
    walkRef.current = walk;
    const seats = deriveSeats(layout);
    setAgents((prev) => prev.map((a, i) => {
      const seat = seats[i] ?? null;
      let { col, row } = a;
      const onSeat = seat && Math.round(col) === seat.col && Math.round(row) === seat.row;
      if (!onSeat && !walk[Math.round(row)]?.[Math.round(col)]) {
        const n = nearestWalkable(walk, Math.round(col), Math.round(row));
        if (n) { col = n.col; row = n.row; }
      }
      return { ...a, seat, col, row, path: [], state: a.state === "walking" ? "idle" : a.state, wait: Math.round(rnd(4, 20)) };
    }));
  }, [layout]);

  // simulación: caminar (BFS por toda la oficina) → sentarse a trabajar → idle
  useEffect(() => {
    const iv = setInterval(() => {
      setAgents((prev) => prev.map((a) => {
        let { col, row, path, state, facing, wait, goingSeat, seat } = a;
        const frame = a.frame + 1;
        const walk = walkRef.current;
        if (state === "walking") {
          if (path.length) {
            const tgt = path[0];
            const dc = tgt.col - col, dr = tgt.row - row;
            const dist = Math.hypot(dc, dr) || 1;
            if (dist <= SPEED) {
              col = tgt.col; row = tgt.row; path = path.slice(1);
              const n = path[0];
              if (n) facing = n.col > col ? "right" : n.col < col ? "left" : n.row > row ? "down" : "up";
            } else {
              col += (dc / dist) * SPEED; row += (dr / dist) * SPEED;
              facing = Math.abs(dc) > Math.abs(dr) ? (dc > 0 ? "right" : "left") : dr > 0 ? "down" : "up";
            }
          }
          if (!path.length) {
            if (goingSeat) { state = "working"; facing = "down"; if (seat) { col = seat.col; row = seat.row; } wait = Math.round(rnd(60, 150)); }
            else { state = "idle"; facing = "down"; wait = Math.round(rnd(25, 70)); }
          }
        } else {
          wait--;
          if (wait <= 0) {
            // si el agente tiene trabajo real (Zoho), va a su escritorio; si no, deambula
            const goSeat = !!seat && (busyRef.current.has(a.id) ? Math.random() < 0.85 : Math.random() < 0.45);
            const goal = goSeat ? seat! : randomWalkable(walk);
            if (goal) {
              const extra = seat ? new Set([`${seat.col},${seat.row}`]) : undefined;
              const p = bfs(walk, { col: Math.round(col), row: Math.round(row) }, goal, goSeat ? extra : undefined);
              if (p && p.length) {
                path = p; state = "walking"; goingSeat = goSeat;
                const n = p[0];
                facing = n.col > col ? "right" : n.col < col ? "left" : n.row > row ? "down" : "up";
              } else { wait = Math.round(rnd(20, 50)); }
            } else { wait = Math.round(rnd(20, 50)); }
          }
        }
        return { ...a, col, row, path, state, facing, wait, goingSeat, frame };
      }));
    }, TICK);
    return () => clearInterval(iv);
  }, []);

  // ── Agentes ──
  function updAgent(id: string, patch: Partial<Mini>) {
    setAgents((prev) => {
      const mini = miniOf(prev).map((m) => (m.id === id ? { ...m, ...patch } : m));
      saveAgents(mini);
      return prev.map((a) => (a.id === id ? { ...a, ...patch } : a));
    });
  }
  function addAgent() {
    setAgents((prev) => {
      const mini = [...miniOf(prev), { id: "a" + Date.now(), nombre: "Nuevo agente", sheet: "char_0" }];
      saveAgents(mini);
      return build(mini, layout);
    });
  }
  function removeAgent(id: string) {
    setAgents((prev) => {
      const mini = miniOf(prev).filter((m) => m.id !== id);
      saveAgents(mini);
      return build(mini, layout);
    });
  }

  // ── Layout ──
  function commit(next: OfficeLayout) { setLayout(next); saveLayout(next); }
  function moveFurn(id: string, col: number, row: number) { commit({ ...layout, furniture: layout.furniture.map((f) => (f.id === id ? { ...f, col, row } : f)) }); }
  function addFurn(type: string) { const id = uid("f"); commit({ ...layout, furniture: [...layout.furniture, { id, type, col: 3, row: 3 }] }); setTab("muebles"); setSelFurn(id); }
  function mirrorFurn(id: string) { commit({ ...layout, furniture: layout.furniture.map((f) => (f.id === id ? { ...f, mirrored: !f.mirrored } : f)) }); }
  function removeFurn(id: string) { commit({ ...layout, furniture: layout.furniture.filter((f) => f.id !== id) }); setSelFurn(null); }

  function moveRoom(id: string, col: number, row: number) { commit({ ...layout, rooms: layout.rooms.map((r) => (r.id === id ? { ...r, col, row } : r)) }); }
  function resizeRoom(id: string, w: number, h: number) { commit({ ...layout, rooms: layout.rooms.map((r) => (r.id === id ? { ...r, w, h } : r)) }); }
  function updRoom(id: string, patch: Partial<{ label: string; tile: string; tint: string }>) { commit({ ...layout, rooms: layout.rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)) }); }
  function addRoom() { const id = uid("room"); const c = Math.min(layout.cols - 8, 2), r = Math.min(layout.rows - 6, 2); commit({ ...layout, rooms: [...layout.rooms, { id, label: "Nueva área", col: c, row: r, w: 8, h: 6, tile: "floor_0" }] }); setSelRoom(id); }
  function removeRoom(id: string) { commit({ ...layout, rooms: layout.rooms.filter((r) => r.id !== id) }); setSelRoom(null); }

  function setSize(cols: number, rows: number) { commit({ ...layout, cols: Math.max(MIN_COLS, Math.min(MAX_COLS, cols)), rows: Math.max(MIN_ROWS, Math.min(MAX_ROWS, rows)) }); }

  function moveLogo(id: string, col: number, row: number) { commit({ ...layout, logos: (layout.logos ?? []).map((l) => (l.id === id ? { ...l, col, row } : l)) }); }
  function resizeLogo(id: string, w: number, h: number) { commit({ ...layout, logos: (layout.logos ?? []).map((l) => (l.id === id ? { ...l, w, h } : l)) }); }
  function addLogo(src: string) { if (!src.trim()) return; const id = uid("logo"); commit({ ...layout, logos: [...(layout.logos ?? []), { id, src: src.trim(), col: 2, row: 2, w: 6, h: 4, frame: true }] }); setTab("logo"); setSelLogo(id); setLogoUrl(""); }
  function removeLogo(id: string) { commit({ ...layout, logos: (layout.logos ?? []).filter((l) => l.id !== id) }); setSelLogo(null); }

  function resetLayout() { commit(DEFAULT_LAYOUT); setSelFurn(null); setSelRoom(null); setSelLogo(null); }

  // ── Click-para-editar desde el lienzo (abre el panel si estaba contraído) ──
  function pickFurniture(id: string) { setEditing(true); setTab("muebles"); setSelFurn(id); setSelRoom(null); setSelLogo(null); }
  function pickAgent(id: string) { setEditing(true); setTab("agentes"); setSelAgent(id); panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }
  function pickRoom(id: string) { setEditing(true); setTab("areas"); setSelRoom(id); }
  function pickLogo(id: string) { setEditing(true); setTab("logo"); setSelLogo(id); }
  function clearSelection() { setSelFurn(null); setSelRoom(null); setSelLogo(null); }

  const selRoomObj = layout.rooms.find((r) => r.id === selRoom);
  const selFurnObj = layout.furniture.find((f) => f.id === selFurn);

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!orden.trim()) return;
    const ag = agents.find((a) => a.id === target);
    setLog((l) => [
      { t: "tú", msg: `→ ${ag?.nombre}: ${orden.trim()}` },
      { t: "agente", msg: `${ag?.nombre} recibió la orden (se ejecutará al conectar Zoho/N8N).` },
      ...l,
    ]);
    setOrden("");
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "agentes", label: `Agentes (${agents.length})`, icon: <Users className="h-3.5 w-3.5" /> },
    { key: "muebles", label: `Muebles (${layout.furniture.length})`, icon: <LayoutGrid className="h-3.5 w-3.5" /> },
    { key: "areas", label: `Áreas (${layout.rooms.length})`, icon: <DoorOpen className="h-3.5 w-3.5" /> },
    { key: "tamano", label: "Tamaño", icon: <Maximize2 className="h-3.5 w-3.5" /> },
    { key: "logo", label: "Logo", icon: <ImageIcon className="h-3.5 w-3.5" /> },
  ];

  // ── Actividad en vivo de los agentes ──
  const ESTADO: Record<string, { t: string; c: string }> = {
    working: { t: "Trabajando", c: "#0f9d58" },
    walking: { t: "Caminando", c: "#1d429b" },
    idle: { t: "Disponible", c: "#6d6e71" },
  };
  function areaDe(a: OfficeAgent) {
    const c = Math.round(a.col), r = Math.round(a.row);
    const rm = layout.rooms.find((x) => c >= x.col && c < x.col + x.w && r >= x.row && r < x.row + x.h);
    return rm?.label ?? "—";
  }

  // estado en vivo por agente (burbuja) derivado de los datos reales de Zoho
  const liveStatus: Record<string, string> = {};
  if (live) {
    liveStatus.zoho = live.fuente === "zoho" ? `Zoho · ${live.total}` : `Demo · ${live.total}`;
    liveStatus.distribuidor = live.sinConsultor > 0 ? `Distribuir ${live.sinConsultor}` : "Al día";
    liveStatus.asignador = live.sinConsultor > 0 ? "Asignando…" : "Disponible";
    liveStatus.calidad = "Revisando citas";
  }
  // agentes "ocupados" → en la simulación van a su escritorio a trabajar
  const busy = new Set<string>();
  if (live) {
    if (live.fuente === "zoho") busy.add("zoho");
    if (live.sinConsultor > 0) { busy.add("distribuidor"); busy.add("asignador"); }
  }
  busyRef.current = busy;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Bot className="h-5 w-5 text-wh-orange" />
        <SectionTitle sub="Oficina Windmar top-down. Haz clic sobre un agente o mueble para editarlo; el panel de abajo controla todo. Los agentes recorren toda la oficina esquivando muebles.">
          Pixel Agents
        </SectionTitle>
      </div>

      {/* Oficina */}
      <div className="exec-card overflow-hidden p-0">
        <div className="flex items-center justify-between gap-2 border-b border-[var(--color-line)] px-4 py-2.5">
          <span className="exec-label">Oficina de agentes · Windmar Home</span>
          <div className="flex items-center gap-3">
            {live && (
              <span className="flex items-center gap-1.5 text-[10px] font-bold">
                <span className={`h-1.5 w-1.5 rounded-full ${live.fuente === "zoho" ? "bg-green-500" : "bg-[var(--color-muted)]"}`} />
                <span style={{ color: live.fuente === "zoho" ? "#0f9d58" : "#6d6e71" }}>{live.fuente === "zoho" ? "Zoho en vivo" : "Demo"}</span>
                <span className="text-[var(--color-muted)]">· {live.total} citas · {live.sinConsultor} a distribuir</span>
              </span>
            )}
            <button
              onClick={() => setEditing((v) => !v)}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${editing ? "bg-wh-orange text-white shadow-orange" : "border border-[var(--color-line)] text-[var(--color-muted)] hover:text-[var(--color-ink)]"}`}
            >
              {editing ? <><Check className="h-3 w-3" /> Dejar de editar</> : <><Pencil className="h-3 w-3" /> Editar</>}
            </button>
          </div>
        </div>
        <div className="p-3">
          <div className="mx-auto max-w-[1000px]">
            <PixelOffice
              layout={layout}
              agents={agents}
              editing={editing}
              status={liveStatus}
              areasMode={editing && tab === "areas"}
              selFurn={selFurn}
              selRoom={selRoom}
              selLogo={selLogo}
              onPickFurniture={pickFurniture}
              onMoveFurniture={moveFurn}
              onPickAgent={pickAgent}
              onPickRoom={pickRoom}
              onMoveRoom={moveRoom}
              onResizeRoom={resizeRoom}
              onPickLogo={pickLogo}
              onMoveLogo={moveLogo}
              onResizeLogo={resizeLogo}
              onClearSelection={clearSelection}
            />
          </div>
          <p className="mt-2 text-center text-[11px] text-[var(--color-muted)]">
            {!editing
              ? "Solo viendo a los agentes. Pulsa “Editar” (arriba a la derecha) para personalizar la oficina."
              : tab === "areas"
              ? "Modo edición · Áreas: arrastra/redimensiona las secciones."
              : "Modo edición: haz clic en un agente o mueble para seleccionarlo, o arrastra los muebles."}
          </p>
        </div>
      </div>

      {/* Actividad en vivo de los agentes */}
      <div className="exec-card p-4">
        <div className="mb-3 flex items-center gap-1.5">
          <Activity className="h-4 w-4 text-wh-orange" />
          <span className="exec-label flex-1">Actividad de agentes · en vivo</span>
          <span className="text-[10px] text-[var(--color-muted)]">{live?.fuente === "zoho" ? `Zoho en vivo · ${live.total} citas` : "modo demo"}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {agents.map((a) => {
            const st = ESTADO[a.state] ?? ESTADO.idle;
            return (
              <button key={a.id} onClick={() => pickAgent(a.id)} className="flex items-center gap-2 rounded-lg border border-[var(--color-line)] bg-[var(--color-subtle)] p-2 text-left transition hover:border-wh-orange">
                <SpriteImg sheet={a.sheet} facing={a.facing} frame={a.frame} walking={a.state === "walking"} working={a.state === "working"} scale={0.32} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[11px] font-bold text-[var(--color-ink)]">{a.nombre}</div>
                  <div className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: st.c }} />
                    <span className="truncate text-[10px] text-[var(--color-muted)]">{st.t} · {areaDe(a)}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Panel de personalización (abajo, contraíble) */}
      <div ref={panelRef} className="exec-card overflow-hidden p-0">
        <button
          onClick={() => setEditing((v) => !v)}
          className="flex w-full items-center gap-1.5 border-b border-[var(--color-line)] px-4 py-2.5 transition hover:bg-[var(--color-subtle)]"
        >
          <Settings2 className="h-4 w-4 text-wh-orange" />
          <span className="exec-label flex-1 text-left">Personalizar oficina</span>
          <span className="text-[10px] text-[var(--color-muted)]">{editing ? "Dejar de editar" : "Editar"}</span>
          {editing ? <ChevronUp className="h-4 w-4 text-[var(--color-muted)]" /> : <ChevronDown className="h-4 w-4 text-[var(--color-muted)]" />}
        </button>
        {editing && (
        <div className="flex flex-wrap gap-1 border-b border-[var(--color-line)] p-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-bold transition ${tab === t.key ? "bg-wh-blue text-white" : "text-[var(--color-muted)] hover:bg-[var(--color-subtle)] hover:text-[var(--color-ink)]"}`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        )}

        {editing && (
        <div className="p-4">
          {/* AGENTES */}
          {tab === "agentes" && (
            <>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="exec-label">Agentes</h3>
                <button onClick={addAgent} className="flex items-center gap-1.5 rounded-lg bg-wh-orange px-2.5 py-1 text-[11px] font-bold text-white shadow-orange transition hover:brightness-105">
                  <Plus className="h-3 w-3" /> Agregar
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {agents.map((a) => (
                  <div key={a.id} className={`flex items-start gap-3 rounded-lg border p-3 transition ${selAgent === a.id ? "border-wh-orange bg-wh-orange/5" : "border-transparent bg-[var(--color-subtle)]"}`}>
                    <SpriteImg sheet={a.sheet} facing="down" frame={0} scale={0.5} />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          value={a.nombre}
                          onChange={(e) => updAgent(a.id, { nombre: e.target.value })}
                          placeholder="Función / nombre"
                          className="w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-1 text-sm font-semibold text-[var(--color-ink)] outline-none focus:border-wh-orange"
                        />
                        <button onClick={() => removeAgent(a.id)} title="Quitar agente" className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[var(--color-muted)] transition hover:bg-red-500/15 hover:text-red-500">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {SHEETS.map((s) => (
                          <button key={s} onClick={() => updAgent(a.id, { sheet: s })} className="rounded-md p-0.5" style={{ outline: a.sheet === s ? "2px solid var(--color-wh-orange)" : "1px solid var(--color-line)" }} title={s}>
                            <SpriteImg sheet={s} facing="down" frame={0} scale={0.36} />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-[var(--color-muted)]">Cada agente toma un escritorio libre. Agrega escritorios en “Muebles” para más puestos. Tip: haz clic en un agente dentro de la oficina para resaltarlo aquí.</p>
            </>
          )}

          {/* MUEBLES */}
          {tab === "muebles" && (
            <>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="exec-label">Mobiliario</h3>
                <button onClick={resetLayout} className="flex items-center gap-1.5 rounded-lg border border-[var(--color-line)] px-2.5 py-1 text-[11px] font-bold text-[var(--color-muted)] transition hover:text-[var(--color-ink)]">
                  <RotateCcw className="h-3 w-3" /> Restaurar
                </button>
              </div>
              {selFurnObj ? (
                <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg bg-[var(--color-subtle)] p-2.5">
                  <span className="text-xs font-bold text-[var(--color-ink)]">{FURN_CATALOG[selFurnObj.type]?.label ?? selFurnObj.type}</span>
                  <span className="text-[10px] text-[var(--color-muted)]">seleccionado</span>
                  <div className="ml-auto flex gap-1.5">
                    <button onClick={() => mirrorFurn(selFurnObj.id)} className="flex items-center gap-1 rounded-md border border-[var(--color-line)] px-2 py-1 text-[11px] font-bold text-[var(--color-muted)] transition hover:text-[var(--color-ink)]">
                      <FlipHorizontal2 className="h-3 w-3" /> Espejar
                    </button>
                    <button onClick={() => removeFurn(selFurnObj.id)} className="flex items-center gap-1 rounded-md border border-red-500/40 px-2 py-1 text-[11px] font-bold text-red-500 transition hover:bg-red-500/15">
                      <Trash2 className="h-3 w-3" /> Borrar
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mb-4 text-[11px] text-[var(--color-muted)]">Toca un mueble del catálogo para agregarlo y arrástralo en la oficina. O haz clic en uno ya puesto para espejar/borrar.</p>
              )}
              <div className="space-y-3">
                {CAT_ORDER.map((cat) => {
                  const items = Object.entries(FURN_CATALOG).filter(([, c]) => c.cat === cat);
                  if (!items.length) return null;
                  return (
                    <div key={cat}>
                      <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)]">{CAT_LABEL[cat]}</div>
                      <div className="flex flex-wrap gap-2">
                        {items.map(([type, c]) => (
                          <button key={type} onClick={() => addFurn(type)} title={`Agregar ${c.label}`} className="group flex flex-col items-center gap-1 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] p-2 transition hover:border-wh-orange">
                            <div className="grid h-10 w-10 place-items-center">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={`/agents/pixel/office/${type}.png`} alt={c.label} style={{ maxWidth: 36, maxHeight: 36, imageRendering: "pixelated" }} />
                            </div>
                            <span className="text-[9px] font-semibold text-[var(--color-muted)] group-hover:text-[var(--color-ink)]">{c.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ÁREAS */}
          {tab === "areas" && (
            <>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="exec-label">Secciones / áreas</h3>
                <button onClick={addRoom} className="flex items-center gap-1.5 rounded-lg bg-wh-orange px-2.5 py-1 text-[11px] font-bold text-white shadow-orange transition hover:brightness-105">
                  <Plus className="h-3 w-3" /> Agregar
                </button>
              </div>
              <p className="mb-3 text-[11px] text-[var(--color-muted)]">Arrastra/redimensiona la sección en la oficina (handle naranja). Las adyacentes quedan conectadas (los agentes cruzan).</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {layout.rooms.map((r) => (
                  <div key={r.id} className={`rounded-lg border p-2.5 ${selRoom === r.id ? "border-wh-orange bg-wh-orange/5" : "border-[var(--color-line)] bg-[var(--color-subtle)]"}`} onClick={() => setSelRoom(r.id)}>
                    <div className="flex items-center gap-2">
                      <input
                        value={r.label}
                        onChange={(e) => updRoom(r.id, { label: e.target.value })}
                        className="w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-1 text-sm font-semibold text-[var(--color-ink)] outline-none focus:border-wh-orange"
                      />
                      <button onClick={(e) => { e.stopPropagation(); removeRoom(r.id); }} title="Borrar sección" className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[var(--color-muted)] transition hover:bg-red-500/15 hover:text-red-500">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="mt-2 space-y-1.5">
                      <span className="text-[10px] text-[var(--color-muted)]">{r.w}×{r.h} · piso</span>
                      <div className="flex flex-wrap items-center gap-1">
                        {FLOOR_TILES.map((ft) => (
                          <button key={ft} onClick={(e) => { e.stopPropagation(); updRoom(r.id, { tile: ft }); }} title={ft} className="rounded p-0.5" style={{ outline: r.tile === ft ? "2px solid var(--color-wh-orange)" : "1px solid var(--color-line)" }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={`/agents/pixel/office/${ft}.png`} alt={ft} style={{ width: 16, height: 16, imageRendering: "pixelated", filter: r.tint ? TINTS[r.tint] : undefined }} />
                          </button>
                        ))}
                      </div>
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-[10px] text-[var(--color-muted)]">tinte:</span>
                        {TINT_KEYS.map((tk) => (
                          <button key={tk} onClick={(e) => { e.stopPropagation(); updRoom(r.id, { tint: tk }); }} className={`rounded px-1.5 py-0.5 text-[9px] font-bold capitalize transition ${(r.tint ?? "ninguno") === tk ? "bg-wh-blue text-white" : "border border-[var(--color-line)] text-[var(--color-muted)]"}`}>
                            {tk}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {selRoomObj && <p className="mt-3 text-[11px] text-wh-orange">Editando “{selRoomObj.label}” — arrástrala/redimensiónala en la oficina.</p>}
            </>
          )}

          {/* TAMAÑO */}
          {tab === "tamano" && (
            <>
              <h3 className="exec-label mb-3">Tamaño de la oficina</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {([["Columnas (ancho)", layout.cols, (v: number) => setSize(v, layout.rows), MIN_COLS, MAX_COLS],
                   ["Filas (alto)", layout.rows, (v: number) => setSize(layout.cols, v), MIN_ROWS, MAX_ROWS]] as const).map(([label, val, set, min, max]) => (
                  <div key={label} className="rounded-lg bg-[var(--color-subtle)] p-3">
                    <div className="mb-2 text-xs font-bold text-[var(--color-ink)]">{label}</div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => set(val - 2)} disabled={val <= min} className="grid h-8 w-8 place-items-center rounded-md border border-[var(--color-line)] text-[var(--color-ink)] transition hover:border-wh-orange disabled:opacity-40">
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="min-w-[3ch] text-center text-lg font-black text-wh-orange">{val}</span>
                      <button onClick={() => set(val + 2)} disabled={val >= max} className="grid h-8 w-8 place-items-center rounded-md border border-[var(--color-line)] text-[var(--color-ink)] transition hover:border-wh-orange disabled:opacity-40">
                        <Plus className="h-4 w-4" />
                      </button>
                      <span className="text-[10px] text-[var(--color-muted)]">{min}–{max}</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-[var(--color-muted)]">Amplía o reduce la oficina y luego ajusta las secciones en “Áreas” para llenar el espacio.</p>
            </>
          )}

          {/* LOGO */}
          {tab === "logo" && (
            <>
              <h3 className="exec-label mb-3">Logo pixel-art</h3>
              <p className="mb-3 text-[11px] text-[var(--color-muted)]">
                Pega la URL o data URL de tu logo y agrégalo; luego arrástralo/redimensiónalo en la oficina.
                Si me pasas la imagen por el chat, la guardo en <code>/public/agents/pixel/</code>.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="/agents/pixel/mi-logo.png  o  data:image/png;base64,…" className="flex-1 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] outline-none focus:border-wh-orange" />
                <button onClick={() => addLogo(logoUrl)} className="flex items-center justify-center gap-2 rounded-lg bg-wh-orange px-4 py-2 text-sm font-bold text-white shadow-orange transition hover:brightness-105">
                  <Plus className="h-4 w-4" /> Agregar logo
                </button>
              </div>
              {(layout.logos ?? []).length > 0 && (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {(layout.logos ?? []).map((l) => (
                    <div key={l.id} className={`flex items-center gap-3 rounded-lg border p-2 ${selLogo === l.id ? "border-wh-orange" : "border-[var(--color-line)]"}`} onClick={() => setSelLogo(l.id)}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={l.src} alt="logo" style={{ width: 36, height: 36, objectFit: "contain", imageRendering: "pixelated" }} />
                      <span className="flex-1 truncate text-[11px] text-[var(--color-muted)]">{l.src.startsWith("data:") ? "(data URL)" : l.src} · {l.w}×{l.h}</span>
                      <button onClick={(e) => { e.stopPropagation(); removeLogo(l.id); }} className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[var(--color-muted)] transition hover:bg-red-500/15 hover:text-red-500">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        )}
      </div>

      {/* Consola de órdenes */}
      <div className="exec-card p-5">
        <h2 className="exec-label mb-3 flex items-center gap-1.5">
          <Terminal className="h-3.5 w-3.5" /> Dar una orden
        </h2>
        <form onSubmit={enviar} className="flex flex-col gap-2 sm:flex-row">
          <select value={target} onChange={(e) => setTarget(e.target.value)} className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] outline-none focus:border-wh-orange">
            {agents.map((a) => (<option key={a.id} value={a.id}>{a.nombre}</option>))}
          </select>
          <input value={orden} onChange={(e) => setOrden(e.target.value)} placeholder="Ej. Distribuir las citas coordinadas de hoy y notificar a Miguel" className="flex-1 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] outline-none focus:border-wh-orange focus:ring-2 focus:ring-wh-orange/20" />
          <button type="submit" className="flex items-center justify-center gap-2 rounded-lg bg-wh-orange px-4 py-2 text-sm font-bold text-white shadow-orange transition hover:brightness-105">
            <Send className="h-4 w-4" /> Enviar
          </button>
        </form>
        <div className="mt-4 max-h-40 space-y-1.5 overflow-y-auto rounded-lg bg-[var(--color-subtle)] p-3 font-mono text-xs">
          {log.map((l, i) => (
            <div key={i} className="flex gap-2">
              <span className="shrink-0 font-bold" style={{ color: l.t === "tú" ? "#f89b24" : l.t === "agente" ? "#0f9d58" : "#6d6e71" }}>[{l.t}]</span>
              <span className="text-[var(--color-ink-soft)]">{l.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
