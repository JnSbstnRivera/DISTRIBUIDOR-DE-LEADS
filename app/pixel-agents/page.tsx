"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Terminal, Bot, Pencil, Check } from "lucide-react";
import { SectionTitle } from "@/components/ui";
import PixelOffice, { AgentSprite, type OfficeAgent } from "@/components/PixelOffice";

const HAIRS = ["#2a2f45", "#5a3a1a", "#1a1a1a", "#7a5230", "#caa14a", "#3a2a4a"];

// zona = caja donde el agente deambula (en %), desk = punto donde se sienta
function mk(
  id: string,
  nombre: string,
  genero: "h" | "m",
  hair: string,
  desk: { x: number; y: number },
  zone: { x0: number; y0: number; x1: number; y1: number }
): OfficeAgent {
  return {
    id, nombre, genero, hair, desk, zone,
    x: desk.x, y: desk.y, tx: desk.x, ty: desk.y,
    state: "working", facing: "up", frame: 0, wait: 40, goingDesk: true,
  };
}

const WORK = { x0: 8, y0: 22, x1: 52, y1: 88 };
const MGR = { x0: 68, y0: 60, x1: 95, y1: 90 };
const MEET = { x0: 70, y0: 16, x1: 95, y1: 42 };

const DEFAULTS: OfficeAgent[] = [
  mk("distribuidor", "Distribuidor", "h", "#5a3a1a", { x: 16, y: 30 }, WORK),
  mk("asignador", "Asignación", "m", "#5a3a1a", { x: 44, y: 30 }, WORK),
  mk("zoho", "Zoho Sync", "h", "#1a1a1a", { x: 16, y: 68 }, WORK),
  mk("n8n", "N8N Notifier", "m", "#caa14a", { x: 44, y: 68 }, WORK),
  mk("gerente", "Gerente", "h", "#2a2f45", { x: 80, y: 72 }, MGR),
  mk("calidad", "Calidad", "m", "#7a5230", { x: 82, y: 28 }, MEET),
];

function rnd(a: number, b: number) {
  return a + (b - a) * Math.random();
}

export default function PixelAgents() {
  const [agents, setAgents] = useState<OfficeAgent[]>(DEFAULTS);
  const [edit, setEdit] = useState(false);
  const [target, setTarget] = useState("distribuidor");
  const [orden, setOrden] = useState("");
  const [log, setLog] = useState<{ t: string; msg: string }[]>([
    { t: "sistema", msg: "Oficina Windmar activa. Los agentes caminan y trabajan; personalízalos con Editar." },
  ]);
  const tick = useRef(0);

  // cargar personalización
  useEffect(() => {
    try {
      const raw = localStorage.getItem("pixelOfficeAgents");
      if (raw) {
        const saved = JSON.parse(raw) as Partial<OfficeAgent>[];
        setAgents((prev) =>
          prev.map((a) => {
            const s = saved.find((x) => x.id === a.id);
            return s ? { ...a, nombre: s.nombre ?? a.nombre, genero: (s.genero as any) ?? a.genero, hair: s.hair ?? a.hair } : a;
          })
        );
      }
    } catch {}
  }, []);

  // bucle de simulación (movimiento + estados)
  useEffect(() => {
    const iv = setInterval(() => {
      tick.current++;
      setAgents((prev) =>
        prev.map((a) => {
          let { x, y, tx, ty, state, facing, frame, wait, goingDesk } = a;
          if (state === "walking") {
            const dx = tx - x, dy = ty - y;
            const d = Math.hypot(dx, dy);
            if (d < 1.6) {
              if (goingDesk) { state = "working"; facing = "up"; wait = Math.round(rnd(45, 110)); x = a.desk.x; y = a.desk.y; }
              else { state = "idle"; facing = "down"; wait = Math.round(rnd(15, 40)); }
            } else {
              const sp = 1.6;
              x += (dx / d) * sp; y += (dy / d) * sp;
              facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
              frame = (frame + 1) % 2;
            }
          } else {
            wait--;
            if (wait <= 0) {
              if (Math.random() < 0.55) { tx = a.desk.x; ty = a.desk.y; goingDesk = true; }
              else { tx = rnd(a.zone.x0, a.zone.x1); ty = rnd(a.zone.y0, a.zone.y1); goingDesk = false; }
              state = "walking";
            }
          }
          return { ...a, x, y, tx, ty, state, facing, frame, wait, goingDesk };
        })
      );
    }, 130);
    return () => clearInterval(iv);
  }, []);

  function update(id: string, patch: Partial<OfficeAgent>) {
    setAgents((prev) => {
      const next = prev.map((a) => (a.id === id ? { ...a, ...patch } : a));
      try {
        localStorage.setItem(
          "pixelOfficeAgents",
          JSON.stringify(next.map((a) => ({ id: a.id, nombre: a.nombre, genero: a.genero, hair: a.hair })))
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
          <h2 className="exec-label mb-3 flex items-center gap-1.5">
            <Pencil className="h-3.5 w-3.5" /> Personalizar agentes
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {agents.map((a) => (
              <div key={a.id} className="flex items-center gap-3 rounded-lg bg-[var(--color-subtle)] p-3">
                <div className="scale-90">
                  <AgentSprite genero={a.genero} hair={a.hair} facing="down" walking={false} sitting={false} />
                </div>
                <div className="flex-1 space-y-2">
                  <input
                    value={a.nombre}
                    onChange={(e) => update(a.id, { nombre: e.target.value })}
                    className="w-full rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-1 text-sm font-semibold text-[var(--color-ink)] outline-none focus:border-wh-orange"
                  />
                  <div className="flex items-center gap-2">
                    <div className="flex overflow-hidden rounded-md border border-[var(--color-line)] text-[11px] font-bold">
                      <button onClick={() => update(a.id, { genero: "h" })} className={`px-2 py-1 ${a.genero === "h" ? "bg-wh-blue text-white" : "text-[var(--color-muted)]"}`}>Hombre</button>
                      <button onClick={() => update(a.id, { genero: "m" })} className={`px-2 py-1 ${a.genero === "m" ? "bg-wh-blue text-white" : "text-[var(--color-muted)]"}`}>Mujer</button>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      {HAIRS.map((c) => (
                        <button key={c} onClick={() => update(a.id, { hair: c })} className="h-4 w-4 rounded-full ring-1 ring-black/20" style={{ background: c, outline: a.hair === c ? "2px solid var(--color-ink)" : "none" }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-[var(--color-muted)]">La gorra W, el polo azul y el pantalón beige son fijos (identidad Windmar). Los cambios se guardan en tu navegador.</p>
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
