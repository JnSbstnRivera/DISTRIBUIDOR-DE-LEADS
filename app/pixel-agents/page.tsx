"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Bot,
  Send,
  Database,
  Workflow,
  Shuffle,
  Terminal,
  CircleDot,
} from "lucide-react";
import { SectionTitle } from "@/components/ui";

type Estado = "activo" | "diseño" | "pendiente";

const AGENTES = [
  {
    id: "distribuidor",
    nombre: "Agente Distribuidor",
    rol: "Motor de rotación equitativa por zona / canal y citas del día",
    icon: Shuffle,
    color: "#f89b24",
    estado: "activo" as Estado,
    ultimo: "Rotación lista en las 6 zonas + 6 canales",
  },
  {
    id: "zoho",
    nombre: "Agente Zoho Sync",
    rol: "Lee las citas coordinadas (Lead Status = Cita coordinada) y sus campos",
    icon: Database,
    color: "#1d429b",
    estado: "pendiente" as Estado,
    ultimo: "Esperando acceso de solo-lectura (Andrés)",
  },
  {
    id: "asignador",
    nombre: "Agente de Asignación",
    rol: "Decide a quién asignar según los criterios de Miguel y Cata",
    icon: Bot,
    color: "#0f9d58",
    estado: "diseño" as Estado,
    ultimo: "Reglas en definición (deal owner → consultor → gerente → distribuidor)",
  },
  {
    id: "n8n",
    nombre: "Agente N8N Notificador",
    rol: "Avisa por Teams/correo la distribución y pide aprobación a Miguel",
    icon: Workflow,
    color: "#7c3aed",
    estado: "pendiente" as Estado,
    ultimo: "Flujo por construir (notifica → aprueba/rechaza)",
  },
];

const ESTADO_STYLE: Record<Estado, { label: string; color: string }> = {
  activo: { label: "Activo", color: "#0f9d58" },
  diseño: { label: "En diseño", color: "#e07d00" },
  pendiente: { label: "Pendiente", color: "#6d6e71" },
};

export default function PixelAgents() {
  const [target, setTarget] = useState("asignador");
  const [orden, setOrden] = useState("");
  const [log, setLog] = useState<{ t: string; msg: string }[]>([
    { t: "sistema", msg: "Centro de agentes inicializado. Plataforma en Fase 1 (sin Zoho)." },
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

  const activos = AGENTES.filter((a) => a.estado === "activo").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Bot className="h-5 w-5 text-wh-orange" />
        <SectionTitle sub="Centro de agentes: míralos trabajar y dáles órdenes en un solo lugar. Conexión Zoho + N8N en camino.">
          Pixel Agents
        </SectionTitle>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="exec-card p-4">
          <div className="exec-label">Agentes</div>
          <div className="kpi-number mt-1 text-3xl font-black text-[var(--color-ink)]">{AGENTES.length}</div>
        </div>
        <div className="exec-card p-4">
          <div className="exec-label">Activos</div>
          <div className="kpi-number mt-1 text-3xl font-black text-[#0f9d58]">{activos}</div>
        </div>
        <div className="exec-card p-4">
          <div className="exec-label">Por conectar</div>
          <div className="kpi-number mt-1 text-3xl font-black text-[#e07d00]">{AGENTES.length - activos}</div>
        </div>
      </div>

      {/* Grid de agentes */}
      <div className="grid gap-4 md:grid-cols-2">
        {AGENTES.map((a, i) => {
          const Icon = a.icon;
          const st = ESTADO_STYLE[a.estado];
          return (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="exec-card p-4"
            >
              <div className="flex items-start gap-3">
                <span
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-xl"
                  style={{ background: `${a.color}1f`, color: a.color }}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="truncate text-sm font-black text-[var(--color-ink)]">{a.nombre}</h3>
                    <span
                      className="flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
                      style={{ background: `${st.color}1f`, color: st.color }}
                    >
                      {a.estado === "activo" ? (
                        <motion.span
                          animate={{ opacity: [1, 0.3, 1] }}
                          transition={{ duration: 1.4, repeat: Infinity }}
                        >
                          <CircleDot className="h-3 w-3" />
                        </motion.span>
                      ) : (
                        <CircleDot className="h-3 w-3" />
                      )}
                      {st.label}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--color-muted)]">{a.rol}</p>
                  <p className="mt-2 text-[11px] text-[var(--color-ink-soft)]">{a.ultimo}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Consola de órdenes */}
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

        {/* Actividad */}
        <div className="mt-4 max-h-64 space-y-1.5 overflow-y-auto rounded-lg bg-[var(--color-subtle)] p-3 font-mono text-xs">
          {log.map((l, i) => (
            <div key={i} className="flex gap-2">
              <span
                className="shrink-0 font-bold"
                style={{ color: l.t === "tú" ? "#f89b24" : l.t === "agente" ? "#0f9d58" : "#6d6e71" }}
              >
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
