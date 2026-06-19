"use client";

import { useEffect, useState } from "react";
import { Send, Terminal, Bot, Pencil, Check, Plus, Trash2 } from "lucide-react";
import { SectionTitle } from "@/components/ui";
import PixelOffice, { SpriteImg, type OfficeAgent } from "@/components/PixelOffice";

// modelos animation-ready (repo pixel-agents): caminata natural
const SHEETS = ["char_0", "char_1", "char_2", "char_3", "char_4", "char_5"];

function rnd(a: number, b: number) {
  return a + (b - a) * Math.random();
}

// Oficinas (cuartos): zona donde deambulan + escritorios donde se sientan
export const ROOMS: Record<string, { label: string; zone: { x0: number; y0: number; x1: number; y1: number }; desks: { x: number; y: number }[] }> = {
  work: { label: "Workspace", zone: { x0: 8, y0: 22, x1: 52, y1: 88 }, desks: [ { x: 16, y: 30 }, { x: 44, y: 30 }, { x: 16, y: 68 }, { x: 44, y: 68 } ] },
  meet: { label: "Sala de reunión", zone: { x0: 70, y0: 16, x1: 95, y1: 42 }, desks: [ { x: 80, y: 26 }, { x: 88, y: 26 } ] },
  mgr: { label: "Gerencia", zone: { x0: 68, y0: 60, x1: 95, y1: 90 }, desks: [ { x: 82, y: 72 }, { x: 74, y: 72 } ] },
};

function mk(id: string, nombre: string, sheet: string, room: string, deskIdx = 0): OfficeAgent {
  const r = ROOMS[room] || ROOMS.work;
  const desk = r.desks[deskIdx % r.desks.length];
  return {
    id, nombre, sheet, room, desk, zone: r.zone,
    x: desk.x, y: desk.y, tx: desk.x, ty: desk.y,
    state: "idle", facing: "down", frame: 0, wait: 0, goingDesk: false,
  };
}

type Mini = { id: string; nombre: string; sheet: string; room: string };

const DEFAULT_MINI: Mini[] = [
  { id: "distribuidor", nombre: "Distribuidor", sheet: "char_0", room: "work" },
  { id: "asignador", nombre: "Asignación", sheet: "char_1", room: "work" },
  { id: "zoho", nombre: "Zoho Sync", sheet: "char_2", room: "work" },
  { id: "n8n", nombre: "N8N Notifier", sheet: "char_3", room: "work" },
  { id: "gerente", nombre: "Gerente", sheet: "char_4", room: "mgr" },
  { id: "calidad", nombre: "Calidad", sheet: "char_5", room: "meet" },
];

// construye los agentes (asigna escritorio por orden dentro de cada cuarto)
function build(mini: Mini[]): OfficeAgent[] {
  const counts: Record<string, number> = {};
  return mini.map((s) => {
    const r = s.room || "work";
    counts[r] = (counts[r] ?? -1) + 1;
    return mk(s.id, s.nombre, s.sheet || "char_0", r, counts[r]);
  });
}
const miniOf = (list: OfficeAgent[]): Mini[] => list.map((a) => ({ id: a.id, nombre: a.nombre, sheet: a.sheet, room: a.room }));
function save(mini: Mini[]) {
  try { localStorage.setItem("pixelOfficeAgents", JSON.stringify(mini)); } catch {}
}

const DEFAULTS = build(DEFAULT_MINI);

export default function PixelAgents() {
  const [agents, setAgents] = useState<OfficeAgent[]>(DEFAULTS);
  const [edit, setEdit] = useState(false);
  const [target, setTarget] = useState("distribuidor");
  const [orden, setOrden] = useState("");
  const [log, setLog] = useState<{ t: string; msg: string }[]>([
    { t: "sistema", msg: "Oficina Windmar lista. Agentes quietos hasta definir la secuencia de leads." },
  ]);

  // cargar roster guardado (soporta agregar/quitar)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("pixelOfficeAgents");
      if (raw) {
        const saved = JSON.parse(raw) as Mini[];
        if (Array.isArray(saved) && saved.length) setAgents(build(saved));
      }
    } catch {}
  }, []);

  // Simulación: caminar (ciclo de 3 frames natural) → sentarse a trabajar → idle.
  useEffect(() => {
    const iv = setInterval(() => {
      setAgents((prev) =>
        prev.map((a) => {
          let { x, y, tx, ty, state, facing, wait, goingDesk } = a;
          const frame = a.frame + 1; // avanza animación (caminar o teclear)
          if (state === "walking") {
            const dx = tx - x, dy = ty - y;
            const d = Math.hypot(dx, dy);
            if (d < 1.2) {
              if (goingDesk) { state = "working"; facing = "up"; x = a.desk.x; y = a.desk.y; wait = Math.round(rnd(60, 140)); }
              else { state = "idle"; facing = "down"; wait = Math.round(rnd(25, 60)); }
            } else {
              const sp = 1.0;
              x += (dx / d) * sp; y += (dy / d) * sp;
              facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
            }
          } else {
            wait--;
            if (wait <= 0) {
              if (Math.random() < 0.6) { tx = a.desk.x; ty = a.desk.y; goingDesk = true; }
              else { tx = rnd(a.zone.x0, a.zone.x1); ty = rnd(a.zone.y0, a.zone.y1); goingDesk = false; }
              state = "walking";
            }
          }
          return { ...a, x, y, tx, ty, state, facing, frame, wait, goingDesk };
        })
      );
    }, 200);
    return () => clearInterval(iv);
  }, []);

  // editar nombre / modelo / cuarto (reconstruye para reubicar escritorio)
  function update(id: string, patch: Partial<Mini>) {
    setAgents((prev) => {
      const mini = miniOf(prev).map((m) => (m.id === id ? { ...m, ...patch } : m));
      save(mini);
      return build(mini);
    });
  }
  function addAgent() {
    setAgents((prev) => {
      const mini = [...miniOf(prev), { id: "a" + Date.now(), nombre: "Nuevo agente", sheet: "char_0", room: "work" }];
      save(mini);
      return build(mini);
    });
  }
  function removeAgent(id: string) {
    setAgents((prev) => {
      const mini = miniOf(prev).filter((m) => m.id !== id);
      save(mini);
      return build(mini);
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
        <SectionTitle sub="Oficina Windmar top-down: agentes con gorra W, polo azul y pantalón beige caminando y trabajando. Personalízalos a tu gusto.">
          Pixel Agents
        </SectionTitle>
      </div>

      <div className="exec-card overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-[var(--color-line)] px-4 py-2.5">
          <span className="exec-label">Oficina de agentes · Windmar Home</span>
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
        <div className="p-3">
          <PixelOffice agents={agents} />
        </div>
      </div>

      {edit && (
        <div className="exec-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="exec-label flex items-center gap-1.5">
              <Pencil className="h-3.5 w-3.5" /> Agentes y oficinas ({agents.length})
            </h2>
            <button
              onClick={addAgent}
              className="flex items-center gap-1.5 rounded-lg bg-wh-orange px-2.5 py-1 text-[11px] font-bold text-white shadow-orange transition hover:brightness-105"
            >
              <Plus className="h-3 w-3" /> Agregar agente
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {agents.map((a) => (
              <div key={a.id} className="flex items-start gap-3 rounded-lg bg-[var(--color-subtle)] p-3">
                <SpriteImg sheet={a.sheet} facing="down" frame={0} scale={0.55} />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      value={a.nombre}
                      onChange={(e) => update(a.id, { nombre: e.target.value })}
                      placeholder="Función / nombre"
                      className="w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-1 text-sm font-semibold text-[var(--color-ink)] outline-none focus:border-wh-orange"
                    />
                    <button
                      onClick={() => removeAgent(a.id)}
                      title="Quitar agente"
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[var(--color-muted)] transition hover:bg-red-500/15 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {/* oficina / cuarto */}
                  <div className="flex gap-1">
                    {Object.entries(ROOMS).map(([key, r]) => (
                      <button
                        key={key}
                        onClick={() => update(a.id, { room: key })}
                        className={`flex-1 rounded-md px-1.5 py-1 text-[10px] font-bold transition ${a.room === key ? "bg-wh-blue text-white" : "border border-[var(--color-line)] text-[var(--color-muted)] hover:text-[var(--color-ink)]"}`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                  {/* modelo */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {SHEETS.map((s) => (
                      <button
                        key={s}
                        onClick={() => update(a.id, { sheet: s })}
                        className="rounded-md p-0.5"
                        style={{ outline: a.sheet === s ? "2px solid var(--color-wh-orange)" : "1px solid var(--color-line)" }}
                        title={s}
                      >
                        <SpriteImg sheet={s} facing="down" frame={0} scale={0.4} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-[var(--color-muted)]">
            Agrega/quita agentes, elige su función (nombre), el cuarto (oficina) y el modelo. Se guarda en tu navegador.
          </p>
        </div>
      )}

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
