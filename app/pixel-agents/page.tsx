"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Send, Terminal, Bot, Pencil, Check } from "lucide-react";
import { SectionTitle } from "@/components/ui";

type Agent = {
  id: string;
  nombre: string;
  hair: string;
  shirt: string;
  rol: string;
  path: { x: number; y: number }[]; // recorrido en % de la sala
  dur: number;
};

const DEFAULTS: Agent[] = [
  {
    id: "distribuidor",
    nombre: "Distribuidor",
    hair: "#2a2f45",
    shirt: "#f89b24",
    rol: "Rotación equitativa",
    path: [
      { x: 30, y: 55 }, { x: 18, y: 40 }, { x: 38, y: 40 }, { x: 30, y: 70 }, { x: 30, y: 55 },
    ],
    dur: 16,
  },
  {
    id: "asignador",
    nombre: "Asignación",
    hair: "#5a3a1a",
    shirt: "#0f9d58",
    rol: "Decide según Miguel/Cata",
    path: [
      { x: 20, y: 72 }, { x: 42, y: 72 }, { x: 42, y: 88 }, { x: 20, y: 88 }, { x: 20, y: 72 },
    ],
    dur: 20,
  },
  {
    id: "zoho",
    nombre: "Zoho Sync",
    hair: "#1a1a1a",
    shirt: "#5b8def",
    rol: "Lee citas coordinadas",
    path: [
      { x: 70, y: 22 }, { x: 82, y: 22 }, { x: 78, y: 35 }, { x: 68, y: 30 }, { x: 70, y: 22 },
    ],
    dur: 18,
  },
  {
    id: "n8n",
    nombre: "N8N Notifier",
    hair: "#3a2a4a",
    shirt: "#a855f7",
    rol: "Avisa y pide aprobación",
    path: [
      { x: 74, y: 70 }, { x: 86, y: 70 }, { x: 86, y: 84 }, { x: 74, y: 84 }, { x: 74, y: 70 },
    ],
    dur: 22,
  },
];

const SWATCHES = ["#f89b24", "#1d429b", "#0f9d58", "#a855f7", "#06b6d4", "#dc2626", "#5b8def", "#e07d00"];
const HAIRS = ["#2a2f45", "#5a3a1a", "#1a1a1a", "#7a5230", "#9b6a3a", "#3a2a4a"];

/* Personaje 3/4 (sprite RPG) */
function Sprite({ hair, shirt }: { hair: string; shirt: string }) {
  return (
    <div className="relative" style={{ width: 18, imageRendering: "pixelated" }}>
      <div className="mx-auto h-[5px] w-[12px] rounded-t-[3px]" style={{ background: hair }} />
      <div className="mx-auto h-[5px] w-[12px] bg-[#f0c9a0]" />
      <div className="mx-auto -mt-[1px] h-[8px] w-[15px] rounded-[2px]" style={{ background: shirt }} />
      <div className="mx-auto -mt-[1px] flex w-[12px] justify-between">
        <motion.span className="block h-[5px] w-[4px] rounded-b-[1px] bg-[#2a2f45]" animate={{ y: [0, 1.2, 0] }} transition={{ duration: 0.34, repeat: Infinity }} />
        <motion.span className="block h-[5px] w-[4px] rounded-b-[1px] bg-[#2a2f45]" animate={{ y: [0, 1.2, 0] }} transition={{ duration: 0.34, repeat: Infinity, delay: 0.17 }} />
      </div>
      <div className="mx-auto mt-[1px] h-[3px] w-[14px] rounded-full bg-black/30 blur-[1px]" />
    </div>
  );
}

/* Bloques de mobiliario */
function Desk({ x, y }: { x: number; y: number }) {
  return (
    <div className="absolute" style={{ left: `${x}%`, top: `${y}%` }}>
      <div className="h-5 w-9 rounded-[3px] border border-black/30 bg-[#7a4a22]">
        <div className="ml-1 mt-0.5 h-3 w-3 rounded-[2px] border border-black/40 bg-[#0c1226]">
          <div className="ml-0.5 mt-1 h-0.5 w-2 rounded bg-[#5b8def]/80" />
        </div>
      </div>
    </div>
  );
}
function Shelf({ x, y }: { x: number; y: number }) {
  return (
    <div className="absolute flex gap-0.5 rounded-[2px] bg-[#5a3a1a] p-0.5" style={{ left: `${x}%`, top: `${y}%` }}>
      {["#dc2626", "#0f9d58", "#5b8def", "#f59e0b"].map((c, i) => (
        <span key={i} className="block h-4 w-1 rounded-[1px]" style={{ background: c }} />
      ))}
    </div>
  );
}
function Plant({ x, y }: { x: number; y: number }) {
  return (
    <div className="absolute" style={{ left: `${x}%`, top: `${y}%` }}>
      <div className="mx-auto h-3 w-3 rounded-full bg-[#2f7d4f]" />
      <div className="mx-auto h-1.5 w-2 rounded-b-[2px] bg-[#b9763a]" />
    </div>
  );
}

export default function PixelAgents() {
  const [agents, setAgents] = useState<Agent[]>(DEFAULTS);
  const [edit, setEdit] = useState(false);
  const [target, setTarget] = useState("distribuidor");
  const [orden, setOrden] = useState("");
  const [log, setLog] = useState<{ t: string; msg: string }[]>([
    { t: "sistema", msg: "Oficina de agentes activa. Personalízalos con el botón Editar." },
  ]);

  // persistencia local de nombre/colores
  useEffect(() => {
    try {
      const raw = localStorage.getItem("pixelAgents");
      if (raw) {
        const saved = JSON.parse(raw) as Partial<Agent>[];
        setAgents((prev) =>
          prev.map((a) => {
            const s = saved.find((x) => x.id === a.id);
            return s ? { ...a, nombre: s.nombre ?? a.nombre, hair: s.hair ?? a.hair, shirt: s.shirt ?? a.shirt } : a;
          })
        );
      }
    } catch {}
  }, []);

  function update(id: string, patch: Partial<Agent>) {
    setAgents((prev) => {
      const next = prev.map((a) => (a.id === id ? { ...a, ...patch } : a));
      try {
        localStorage.setItem(
          "pixelAgents",
          JSON.stringify(next.map((a) => ({ id: a.id, nombre: a.nombre, hair: a.hair, shirt: a.shirt })))
        );
      } catch {}
      return next;
    });
  }

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Bot className="h-5 w-5 text-wh-orange" />
        <SectionTitle sub="Oficina top-down: mira a tus agentes caminar y trabajar. Personalízalos a tu gusto (como la extensión de VS Code).">
          Pixel Agents
        </SectionTitle>
      </div>

      {/* OFICINA */}
      <div className="exec-card overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-[var(--color-line)] px-4 py-2.5">
          <span className="exec-label">Oficina de agentes · Windmar</span>
          <button
            onClick={() => setEdit((e) => !e)}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
              edit ? "bg-wh-orange text-white" : "border border-[var(--color-line)] text-[var(--color-muted)] hover:text-[var(--color-ink)]"
            }`}
          >
            {edit ? <Check className="h-3 w-3" /> : <Pencil className="h-3 w-3" />}
            {edit ? "Listo" : "Editar"}
          </button>
        </div>

        {/* sala top-down */}
        <div
          className="relative w-full"
          style={{
            height: 380,
            background: "#0e1426",
          }}
        >
          {/* zona trabajo (madera) */}
          <div className="absolute" style={{ left: "4%", top: "8%", width: "52%", height: "86%", background: "#8a5a2b", backgroundImage: "repeating-linear-gradient(90deg,rgba(0,0,0,.08) 0 2px,transparent 2px 26px)", borderRadius: 6 }} />
          {/* cocina (tile) */}
          <div className="absolute" style={{ left: "60%", top: "8%", width: "36%", height: "34%", background: "#d8d4cc", backgroundImage: "repeating-linear-gradient(0deg,rgba(0,0,0,.06) 0 1px,transparent 1px 22px),repeating-linear-gradient(90deg,rgba(0,0,0,.06) 0 1px,transparent 1px 22px)", borderRadius: 6 }} />
          {/* sala reunión (azul) */}
          <div className="absolute" style={{ left: "60%", top: "48%", width: "36%", height: "46%", background: "#2e5a8a", borderRadius: 6 }} />

          {/* mobiliario */}
          <Shelf x={8} y={9} /> <Shelf x={20} y={9} /> <Shelf x={34} y={9} />
          <Desk x={12} y={30} /> <Desk x={36} y={30} />
          <Desk x={12} y={78} /> <Desk x={36} y={78} />
          <Plant x={6} y={86} /> <Plant x={50} y={20} /> <Plant x={90} y={88} />
          {/* cocina props */}
          <div className="absolute h-6 w-4 rounded-[2px] bg-[#c8ccd2]" style={{ left: "62%", top: "11%" }} />
          <div className="absolute h-3 w-3 rounded-full border-2 border-[#2a2f45] bg-white" style={{ left: "78%", top: "10%" }} />
          {/* mesa reunión */}
          <div className="absolute h-8 w-12 rounded-[3px] bg-[#6b4a8a]" style={{ left: "70%", top: "64%" }} />
          <Shelf x={64} y={52} /> <Shelf x={84} y={52} />

          {/* AGENTES caminando */}
          {agents.map((a) => (
            <motion.div
              key={a.id}
              className="absolute z-10"
              style={{ width: 18 }}
              animate={{ left: a.path.map((p) => `${p.x}%`), top: a.path.map((p) => `${p.y}%`) }}
              transition={{ duration: a.dur, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/55 px-1 text-[8px] font-bold text-white">
                {a.nombre}
              </div>
              <Sprite hair={a.hair} shirt={a.shirt} />
            </motion.div>
          ))}
        </div>
      </div>

      {/* EDITOR */}
      {edit && (
        <div className="exec-card p-5">
          <h2 className="exec-label mb-3 flex items-center gap-1.5">
            <Pencil className="h-3.5 w-3.5" /> Personalizar agentes
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {agents.map((a) => (
              <div key={a.id} className="flex items-center gap-3 rounded-lg bg-[var(--color-subtle)] p-3">
                <Sprite hair={a.hair} shirt={a.shirt} />
                <div className="flex-1 space-y-2">
                  <input
                    value={a.nombre}
                    onChange={(e) => update(a.id, { nombre: e.target.value })}
                    className="w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-1 text-sm font-semibold text-[var(--color-ink)] outline-none focus:border-wh-orange"
                  />
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="mr-1 text-[10px] text-[var(--color-muted)]">Camisa</span>
                    {SWATCHES.map((c) => (
                      <button key={c} onClick={() => update(a.id, { shirt: c })} className="h-4 w-4 rounded-full ring-1 ring-black/20" style={{ background: c, outline: a.shirt === c ? "2px solid var(--color-ink)" : "none" }} />
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="mr-1 text-[10px] text-[var(--color-muted)]">Pelo</span>
                    {HAIRS.map((c) => (
                      <button key={c} onClick={() => update(a.id, { hair: c })} className="h-4 w-4 rounded-full ring-1 ring-black/20" style={{ background: c, outline: a.hair === c ? "2px solid var(--color-ink)" : "none" }} />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-[var(--color-muted)]">Los cambios se guardan en tu navegador.</p>
        </div>
      )}

      {/* CONSOLA */}
      <div className="exec-card p-5">
        <h2 className="exec-label mb-3 flex items-center gap-1.5">
          <Terminal className="h-3.5 w-3.5" /> Dar una orden
        </h2>
        <form onSubmit={enviar} className="flex flex-col gap-2 sm:flex-row">
          <select value={target} onChange={(e) => setTarget(e.target.value)} className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] outline-none focus:border-wh-orange">
            {agents.map((a) => (
              <option key={a.id} value={a.id}>{a.nombre}</option>
            ))}
          </select>
          <input value={orden} onChange={(e) => setOrden(e.target.value)} placeholder="Ej. Distribuir las citas coordinadas de hoy y notificar a Miguel" className="flex-1 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] outline-none focus:border-wh-orange focus:ring-2 focus:ring-wh-orange/20" />
          <button type="submit" className="flex items-center justify-center gap-2 rounded-lg bg-wh-orange px-4 py-2 text-sm font-bold text-white shadow-orange transition hover:brightness-105">
            <Send className="h-4 w-4" /> Enviar
          </button>
        </form>
        <div className="mt-4 max-h-48 space-y-1.5 overflow-y-auto rounded-lg bg-[var(--color-subtle)] p-3 font-mono text-xs">
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
