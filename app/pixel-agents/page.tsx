"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Terminal, Bot } from "lucide-react";
import { SectionTitle } from "@/components/ui";

type State = "working" | "thinking" | "sleeping";

const AGENTES = [
  { id: "distribuidor", nombre: "Distribuidor", color: "#f89b24", state: "working" as State, say: "Rotando turnos…", rol: "Motor de rotación equitativa" },
  { id: "zoho", nombre: "Zoho Sync", color: "#5b8def", state: "sleeping" as State, say: "Esperando acceso…", rol: "Lee citas coordinadas" },
  { id: "asignador", nombre: "Asignación", color: "#0f9d58", state: "thinking" as State, say: "Definiendo reglas…", rol: "Decide según Miguel/Cata" },
  { id: "n8n", nombre: "N8N Notifier", color: "#a855f7", state: "sleeping" as State, say: "Por conectar…", rol: "Avisa y pide aprobación" },
];

const STATE_LABEL: Record<State, { t: string; c: string }> = {
  working: { t: "Trabajando", c: "#0f9d58" },
  thinking: { t: "En diseño", c: "#e07d00" },
  sleeping: { t: "Inactivo", c: "#8b93ad" },
};

/* ── Personaje pixel-art (robot astronauta) ── */
function PixelBot({ color, state }: { color: string; state: State }) {
  const bob =
    state === "working"
      ? { y: [0, -4, 0] as number[], transition: { duration: 0.5, repeat: Infinity, ease: "easeInOut" as const } }
      : state === "thinking"
      ? { y: [0, -3, 0] as number[], transition: { duration: 1.8, repeat: Infinity, ease: "easeInOut" as const } }
      : { y: 0 };

  const px = { imageRendering: "pixelated" as const };

  return (
    <div className="relative flex flex-col items-center" style={{ width: 64 }}>
      {/* burbuja de estado */}
      {state === "sleeping" ? (
        <motion.div
          animate={{ y: [0, -6, 0], opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute -top-3 right-1 text-xs font-black"
          style={{ color: "#8b93ad" }}
        >
          z
        </motion.div>
      ) : (
        <motion.div
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          className="absolute -top-2.5 flex gap-0.5 rounded bg-black/40 px-1 py-0.5"
        >
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="block h-1 w-1 rounded-full"
              style={{ background: color }}
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </motion.div>
      )}

      <motion.div animate={bob} className="flex flex-col items-center">
        {/* antena */}
        <div className="h-1.5 w-1" style={{ background: color }} />
        <span className="-mt-2.5 mb-0.5 block h-1.5 w-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
        {/* casco */}
        <div className="relative h-6 w-7 rounded-md bg-[#d7deec]" style={px}>
          {/* visor */}
          <div className="absolute left-1 top-1.5 h-3 w-5 rounded-sm bg-[#10162b]">
            <motion.span
              className="absolute left-1 top-1 block h-1 w-1 rounded-full"
              style={{ background: color }}
              animate={state !== "sleeping" ? { opacity: [1, 0.2, 1] } : { opacity: 0.4 }}
              transition={{ duration: 1.6, repeat: Infinity }}
            />
            <motion.span
              className="absolute right-1 top-1 block h-1 w-1 rounded-full"
              style={{ background: color }}
              animate={state !== "sleeping" ? { opacity: [1, 0.2, 1] } : { opacity: 0.4 }}
              transition={{ duration: 1.6, repeat: Infinity, delay: 0.1 }}
            />
          </div>
        </div>
        {/* cuerpo */}
        <div className="-mt-0.5 h-4 w-6 rounded-sm" style={{ background: color, ...px }}>
          <div className="mx-auto mt-1 h-1.5 w-2 rounded-[1px] bg-white/40" />
        </div>
        {/* brazos / manos tecleando */}
        <div className="-mt-3 flex w-9 justify-between">
          <motion.span
            className="block h-2 w-1.5 rounded-sm"
            style={{ background: color }}
            animate={state === "working" ? { y: [0, 2, 0] } : {}}
            transition={{ duration: 0.28, repeat: Infinity }}
          />
          <motion.span
            className="block h-2 w-1.5 rounded-sm"
            style={{ background: color }}
            animate={state === "working" ? { y: [0, 2, 0] } : {}}
            transition={{ duration: 0.28, repeat: Infinity, delay: 0.14 }}
          />
        </div>
      </motion.div>

      {/* escritorio con monitor */}
      <div className="relative mt-0.5 flex h-7 w-16 items-start justify-center rounded-t-sm bg-[#2a3354]">
        <div className="mt-1 h-4 w-9 rounded-sm border border-white/15 bg-[#0c1226]">
          <motion.div
            className="mt-0.5 ml-1 h-0.5 rounded"
            style={{ background: color }}
            animate={state === "working" ? { width: [4, 22, 4] } : { width: 6 }}
            transition={{ duration: 1.1, repeat: Infinity }}
          />
          {state === "working" && (
            <motion.div
              className="ml-1 mt-0.5 h-0.5 rounded bg-white/40"
              animate={{ width: [10, 18, 10] }}
              transition={{ duration: 1.4, repeat: Infinity }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function PixelAgents() {
  const [target, setTarget] = useState("asignador");
  const [orden, setOrden] = useState("");
  const [log, setLog] = useState<{ t: string; msg: string }[]>([
    { t: "sistema", msg: "Oficina de agentes lista. Plataforma en Fase 1 (sin Zoho)." },
  ]);

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!orden.trim()) return;
    const ag = AGENTES.find((a) => a.id === target);
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
        <SectionTitle sub="Míralos trabajar y dáles órdenes en un solo lugar. Conexión Zoho + N8N en camino.">
          Pixel Agents
        </SectionTitle>
      </div>

      {/* ── La oficina ── */}
      <div className="exec-card overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-[var(--color-line)] px-4 py-2.5">
          <span className="exec-label">Oficina de agentes · Windmar</span>
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#34d399]">
            <motion.span className="block h-2 w-2 rounded-full bg-[#34d399]" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.4, repeat: Infinity }} />
            1 activo
          </span>
        </div>

        {/* sala */}
        <div
          className="relative px-6 py-10"
          style={{
            background:
              "linear-gradient(180deg,#141b35 0%,#0e1426 100%)",
            backgroundImage:
              "linear-gradient(180deg,#141b35,#0e1426), repeating-linear-gradient(0deg,transparent,transparent 31px,rgba(255,255,255,.03) 32px), repeating-linear-gradient(90deg,transparent,transparent 31px,rgba(255,255,255,.03) 32px)",
          }}
        >
          <div className="mx-auto grid max-w-2xl grid-cols-2 gap-x-8 gap-y-12 sm:grid-cols-4 sm:gap-y-0">
            {AGENTES.map((a, i) => {
              const st = STATE_LABEL[a.state];
              return (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="flex flex-col items-center"
                >
                  <PixelBot color={a.color} state={a.state} />
                  <div className="mt-2 text-center">
                    <div className="text-xs font-black text-white">{a.nombre}</div>
                    <div
                      className="mt-1 inline-block rounded-full px-2 py-0.5 text-[9px] font-bold"
                      style={{ background: `${st.c}22`, color: st.c }}
                    >
                      {st.t}
                    </div>
                    <div className="mt-1 max-w-[110px] text-[10px] leading-tight text-slate-400">{a.say}</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Consola de órdenes ── */}
      <div className="exec-card p-5">
        <h2 className="exec-label mb-3 flex items-center gap-1.5">
          <Terminal className="h-3.5 w-3.5" /> Dar una orden
        </h2>
        <form onSubmit={enviar} className="flex flex-col gap-2 sm:flex-row">
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] outline-none focus:border-wh-orange"
          >
            {AGENTES.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </select>
          <input
            value={orden}
            onChange={(e) => setOrden(e.target.value)}
            placeholder="Ej. Distribuir las citas coordinadas de hoy y notificar a Miguel"
            className="flex-1 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] outline-none focus:border-wh-orange focus:ring-2 focus:ring-wh-orange/20"
          />
          <button
            type="submit"
            className="flex items-center justify-center gap-2 rounded-lg bg-wh-orange px-4 py-2 text-sm font-bold text-white shadow-orange transition hover:brightness-105"
          >
            <Send className="h-4 w-4" /> Enviar
          </button>
        </form>

        <div className="mt-4 max-h-56 space-y-1.5 overflow-y-auto rounded-lg bg-[var(--color-subtle)] p-3 font-mono text-xs">
          {log.map((l, i) => (
            <div key={i} className="flex gap-2">
              <span className="shrink-0 font-bold" style={{ color: l.t === "tú" ? "#f89b24" : l.t === "agente" ? "#0f9d58" : "#6d6e71" }}>
                [{l.t}]
              </span>
              <span className="text-[var(--color-ink-soft)]">{l.msg}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-[var(--color-muted)]">
          Vista preliminar. Al conectar Zoho (solo-lectura) y N8N, los agentes ejecutarán y reportarán aquí en vivo.
        </p>
      </div>
    </div>
  );
}
