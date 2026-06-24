"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Radio, Send, Tag, Ban } from "lucide-react";
import { SectionTitle } from "@/components/ui";

export default function Canales() {
  const [data, setData] = useState<any>(null);
  const [canal, setCanal] = useState<string>("");
  const [leadRef, setLeadRef] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const r = await fetch("/api/canales", { cache: "no-store" });
    const j = await r.json();
    setData(j);
    if (!canal && j.canales.length) setCanal(j.canales[0].codigo);
  }
  useEffect(() => {
    load();
  }, []);

  const canalInfo = useMemo(
    () => data?.canales.find((c: any) => c.codigo === canal),
    [data, canal]
  );
  const ranking = data && canal ? (data.ranking[canal] as any[]) : [];
  const elegibles = ranking.filter((c) => c.elegible);
  const next = elegibles[0];
  const maxCarga = Math.max(...elegibles.map((c) => c.cargaEfectiva), 1);

  async function asignar(gerente?: string) {
    if (!canal) return;
    setBusy(true);
    await fetch("/api/canales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ canal, leadRef: leadRef || null, gerente: gerente || null }),
    });
    setBusy(false);
    setLeadRef("");
    await load();
  }

  if (!data) return <div className="text-[var(--color-muted)]">Cargando…</div>;
  const color = canalInfo?.color ?? "#e07d00";

  return (
    <div>
      <div className="flex items-center gap-2">
        <Radio className="h-5 w-5 text-wh-orange" />
        <SectionTitle sub="Rotación equitativa para canales secundarios: Media Tour, Booth Hatillo e Instagram por zona. Cada canal tiene su propio pool de gerentes.">
          Canales
        </SectionTitle>
      </div>

      {/* Selector de canal */}
      <div className="mb-5 flex flex-wrap gap-2">
        {data.canales.map((c: any) => {
          const on = canal === c.codigo;
          return (
            <button
              key={c.codigo}
              onClick={() => setCanal(c.codigo)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                on ? "text-white shadow-soft" : "border border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:text-[var(--color-ink)]"
              }`}
              style={on ? { background: c.color } : {}}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: on ? "#fff" : c.color }} />
              {c.nombre}
              <span className="rounded-full bg-black/10 px-1.5 text-[10px]">{c.participantes}</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Asignar */}
        <div className="exec-card space-y-4 p-5 lg:col-span-2">
          <h2 className="exec-label">Asignar en {canalInfo?.nombre}</h2>
          <div>
            <label className="exec-label flex items-center gap-1.5">
              <Tag className="h-3 w-3" /> Referencia del lead (opcional)
            </label>
            <input
              value={leadRef}
              onChange={(e) => setLeadRef(e.target.value)}
              placeholder="Ej. L746497"
              className="mt-1 w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-ink)] outline-none transition focus:border-wh-orange focus:ring-2 focus:ring-wh-orange/20"
            />
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={canal}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl border p-4"
              style={{ borderColor: `${color}55`, background: `${color}12` }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color }}>
                  {canalInfo?.nombre}
                </span>
                <span className="text-xs text-[var(--color-muted)]">{elegibles.length} elegibles</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div>
                  <div className="exec-label">Le toca a</div>
                  <div className="text-xl font-black text-[var(--color-ink)]">
                    {next ? next.gerente.nombre : "— sin elegibles —"}
                  </div>
                </div>
              </div>
              {next && <div className="mt-1 text-xs text-[var(--color-muted)]">carga {next.cargaEfectiva}</div>}
              <button
                disabled={!next || busy}
                onClick={() => asignar()}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 font-bold text-white shadow-soft transition hover:brightness-105 disabled:opacity-40"
                style={{ background: color }}
              >
                <Send className="h-4 w-4" /> {busy ? "Asignando…" : "Asignar en canal"}
              </button>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Ranking */}
        <div className="exec-card p-5 lg:col-span-3">
          <h2 className="exec-label mb-3">Rotación · {canalInfo?.nombre}</h2>
          <div className="space-y-1">
            {ranking.map((c: any) => (
              <div
                key={c.gerente.nombre}
                className={`flex items-center gap-3 rounded-lg px-2 py-1.5 ${c.rank === 1 ? "ring-1" : ""} ${!c.elegible ? "opacity-50" : ""}`}
                style={c.rank === 1 ? { background: `${color}14`, boxShadow: `inset 0 0 0 1px ${color}` } : {}}
              >
                <span
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white"
                  style={{ background: c.elegible ? color : "#a7a9ac" }}
                >
                  {c.elegible ? c.rank : <Ban className="h-3 w-3" />}
                </span>
                <span className="w-40 shrink-0 truncate text-sm text-[var(--color-ink)]">{c.gerente.nombre}</span>
                {c.elegible ? (
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-track)]">
                    <div className="bar-fill h-full rounded-full" style={{ width: `${(c.cargaEfectiva / maxCarga) * 100}%`, background: color }} />
                  </div>
                ) : (
                  <span className="flex-1 text-[11px] font-semibold text-red-500">{c.motivo}</span>
                )}
                {c.elegible && (
                  <button
                    onClick={() => asignar(c.gerente.nombre)}
                    disabled={busy}
                    className="rounded px-2 py-0.5 text-[11px] font-semibold text-[var(--color-muted)] hover:bg-[var(--color-subtle)] hover:text-[var(--color-ink)]"
                  >
                    asignar
                  </button>
                )}
                <span className="w-7 text-right font-mono text-xs text-[var(--color-muted)]">{c.cargaEfectiva}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
