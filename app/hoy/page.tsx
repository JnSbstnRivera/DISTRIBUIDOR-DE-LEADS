"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarClock, MapPin, Send, Tag, Check, X, Clock } from "lucide-react";
import { SectionTitle, ZonaBadge, ZONA_NOMBRE, ZONA_COLOR } from "@/components/ui";
import { AnimatedCounter } from "@/components/AnimatedCounter";

export default function Hoy() {
  const [data, setData] = useState<any>(null);
  const [municipio, setMunicipio] = useState("");
  const [zona, setZona] = useState("");
  const [leadRef, setLeadRef] = useState("");
  const [busy, setBusy] = useState(false);
  const [muniList, setMuniList] = useState<any[]>([]);

  async function load() {
    const r = await fetch("/api/hoy", { cache: "no-store" });
    const j = await r.json();
    setData(j);
    setMuniList(j.municipios);
  }
  useEffect(() => {
    load();
  }, []);

  const zonaResuelta = useMemo(() => {
    if (zona) return zona;
    if (!muniList.length || !municipio) return "";
    const m = muniList.find((x) => x.municipio.toLowerCase() === municipio.toLowerCase());
    return m ? m.zona : "";
  }, [zona, municipio, muniList]);

  const ranking = zonaResuelta && data ? (data.ranking[zonaResuelta] as any[]) : [];
  const elegibles = ranking.filter((c) => c.elegible);
  const next = elegibles[0];

  async function asignar(gerente?: string) {
    if (!zonaResuelta) return;
    setBusy(true);
    await fetch("/api/hoy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ zona: zonaResuelta, municipio: municipio || null, leadRef: leadRef || null, gerente: gerente || null }),
    });
    setBusy(false);
    setLeadRef("");
    await load();
  }

  async function setEstado(id: string, estado: string) {
    await fetch("/api/hoy", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, estado }),
    });
    load();
  }

  if (!data) return <div className="text-[var(--color-muted)]">Cargando…</div>;
  const { stats, hoyToday } = data;
  const inputCls =
    "mt-1 w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-ink)] outline-none transition focus:border-wh-orange focus:ring-2 focus:ring-wh-orange/20";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-5 w-5 text-wh-orange" />
        <SectionTitle sub="Citas para el MISMO día. Rotación diaria independiente: le toca al gerente con menos citas hoy. Marca si Contestó (20 min) o No Contestó.">
          Distribución Hoy
        </SectionTitle>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { l: "Citas hoy", v: stats.asignadasHoy, c: "#e07d00" },
          { l: "Pendientes", v: stats.pendientes, c: "#0891b2" },
          { l: "Contestadas", v: stats.contestadas, c: "#0f9d58" },
          { l: "No contestadas", v: stats.noContestadas, c: "#dc2626" },
        ].map((k) => (
          <div key={k.l} className="exec-card p-4">
            <div className="exec-label">{k.l}</div>
            <div className="kpi-number mt-1 text-3xl font-black" style={{ color: k.c }}>
              <AnimatedCounter value={k.v} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Asignar same-day */}
        <div className="exec-card space-y-4 p-5 lg:col-span-2">
          <h2 className="exec-label">Nueva cita de hoy</h2>
          <div>
            <label className="exec-label flex items-center gap-1.5">
              <MapPin className="h-3 w-3" /> Municipio
            </label>
            <input
              list="muni-hoy"
              value={municipio}
              onChange={(e) => {
                setMunicipio(e.target.value);
                setZona("");
              }}
              placeholder="Ej. Caguas, Ponce…"
              className={inputCls}
            />
            <datalist id="muni-hoy">
              {muniList.map((m) => (
                <option key={m.municipio} value={m.municipio} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="exec-label">…o zona</label>
            <div className="mt-1 flex flex-wrap gap-2">
              {data.zonas.map((z: any) => (
                <button
                  key={z.codigo}
                  onClick={() => {
                    setZona(zona === z.codigo ? "" : z.codigo);
                    setMunicipio("");
                  }}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                    zonaResuelta === z.codigo
                      ? "text-white shadow-soft"
                      : "border border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                  }`}
                  style={zonaResuelta === z.codigo ? { background: ZONA_COLOR[z.codigo] } : {}}
                >
                  {ZONA_NOMBRE[z.codigo]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="exec-label flex items-center gap-1.5">
              <Tag className="h-3 w-3" /> Referencia (opcional)
            </label>
            <input value={leadRef} onChange={(e) => setLeadRef(e.target.value)} placeholder="Ej. L746497" className={inputCls} />
          </div>

          <AnimatePresence mode="wait">
            {zonaResuelta && (
              <motion.div
                key={zonaResuelta}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-xl border border-wh-orange/40 bg-wh-orange/8 p-4"
              >
                <div className="flex items-center justify-between">
                  <ZonaBadge z={zonaResuelta} />
                  <span className="text-xs text-[var(--color-muted)]">{elegibles.length} elegibles · rotación de hoy</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div>
                    <div className="exec-label">Le toca a</div>
                    <div className="text-xl font-black text-[var(--color-ink)]">
                      {next ? next.gerente.nombre : "— sin elegibles —"}
                    </div>
                  </div>
                </div>
                {next && <div className="mt-1 text-xs text-[var(--color-muted)]">{next.cargaEfectiva} citas hoy</div>}
                <button
                  disabled={!next || busy}
                  onClick={() => asignar()}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-wh-orange py-2.5 font-bold text-white shadow-orange transition hover:brightness-105 disabled:opacity-40"
                >
                  <Send className="h-4 w-4" /> {busy ? "Asignando…" : "Asignar cita de hoy"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Citas de hoy + estado */}
        <div className="exec-card p-5 lg:col-span-3">
          <h2 className="exec-label mb-3">Citas de hoy · confirmación</h2>
          {hoyToday.length === 0 ? (
            <div className="py-10 text-center text-sm text-[var(--color-muted)]">
              Aún no hay citas asignadas hoy.
            </div>
          ) : (
            <div className="space-y-1.5">
              {hoyToday.map((a: any) => (
                <div key={a.id} className="flex items-center gap-2 rounded-lg bg-[var(--color-subtle)] px-3 py-2">
                  <ZonaBadge z={a.zona} />
                  <span className="flex-1 truncate text-sm font-medium text-[var(--color-ink)]">{a.gerente}</span>
                  {a.leadRef && <span className="font-mono text-[11px] text-[var(--color-muted)]">{a.leadRef}</span>}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEstado(a.id, "contestado")}
                      className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold transition ${
                        a.estado === "contestado"
                          ? "bg-green-500/15 text-green-600 ring-1 ring-green-500/40"
                          : "text-[var(--color-muted)] hover:bg-green-500/10 hover:text-green-600"
                      }`}
                    >
                      <Check className="h-3 w-3" /> Contestó
                    </button>
                    <button
                      onClick={() => setEstado(a.id, "no_contestado")}
                      className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold transition ${
                        a.estado === "no_contestado"
                          ? "bg-red-500/15 text-red-600 ring-1 ring-red-500/40"
                          : "text-[var(--color-muted)] hover:bg-red-500/10 hover:text-red-600"
                      }`}
                    >
                      <X className="h-3 w-3" /> No
                    </button>
                    {a.estado === "pendiente" && (
                      <span className="flex items-center gap-1 rounded-md bg-cyan-500/10 px-2 py-1 text-[11px] font-bold text-cyan-600">
                        <Clock className="h-3 w-3" /> 20 min
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
