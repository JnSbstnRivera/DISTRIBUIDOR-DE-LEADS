"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, AlertTriangle, Check, X } from "lucide-react";
import { SectionTitle, ZonaBadge, ZONA_NOMBRE, ZONA_COLOR } from "@/components/ui";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { Reveal } from "@/components/Reveal";

function pctColor(p: number) {
  if (p >= 80) return "#0f9d58";
  if (p >= 50) return "#e07d00";
  return "#dc2626";
}

export default function Cumplimiento() {
  const [data, setData] = useState<any>(null);
  const [inicio, setInicio] = useState("");
  const [fin, setFin] = useState("");

  async function load(i?: string, f?: string) {
    const qs = new URLSearchParams();
    if (i) qs.set("inicio", i);
    if (f) qs.set("fin", f);
    const r = await fetch(`/api/cumplimiento?${qs}`, { cache: "no-store" });
    const j = await r.json();
    setData(j);
    if (!inicio) setInicio(j.rango.inicio);
    if (!fin) setFin(j.rango.fin);
  }
  useEffect(() => {
    load();
  }, []);

  if (!data) return <div className="text-[var(--color-muted)]">Cargando…</div>;
  const { totales, zonas } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-2">
          <BadgeCheck className="h-5 w-5 text-wh-orange" />
          <SectionTitle sub="Citas del mismo día que el gerente ATENDIÓ vs NO atendió, por zona y gerente. Base para penalizaciones / Black List.">
            Dashboard de Cumplimiento
          </SectionTitle>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <label className="exec-label">Inicio</label>
            <input
              type="date"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
              className="mt-1 block rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-1.5 text-sm text-[var(--color-ink)]"
            />
          </div>
          <div>
            <label className="exec-label">Fin</label>
            <input
              type="date"
              value={fin}
              onChange={(e) => setFin(e.target.value)}
              className="mt-1 block rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-1.5 text-sm text-[var(--color-ink)]"
            />
          </div>
          <button
            onClick={() => load(inicio, fin)}
            className="rounded-lg bg-wh-orange px-3 py-2 text-sm font-bold text-white shadow-orange transition hover:brightness-105"
          >
            Aplicar
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="exec-card-hero p-4">
          <div className="exec-label">% Cumplimiento</div>
          <div className="kpi-number mt-1 text-3xl font-black" style={{ color: pctColor(totales.pct) }}>
            <AnimatedCounter value={totales.pct} suffix="%" />
          </div>
        </div>
        <div className="exec-card p-4">
          <div className="exec-label">Atendidas</div>
          <div className="kpi-number mt-1 text-3xl font-black text-[#0f9d58]"><AnimatedCounter value={totales.contestado} /></div>
        </div>
        <div className="exec-card p-4">
          <div className="exec-label">No atendidas</div>
          <div className="kpi-number mt-1 text-3xl font-black text-[#dc2626]"><AnimatedCounter value={totales.no_contestado} /></div>
        </div>
        <div className="exec-card p-4">
          <div className="exec-label">Citas evaluadas</div>
          <div className="kpi-number mt-1 text-3xl font-black text-[var(--color-ink)]"><AnimatedCounter value={totales.total} /></div>
        </div>
      </div>

      {/* Por zona */}
      <div className="grid gap-4 lg:grid-cols-2">
        {zonas.map((z: any, i: number) => (
          <Reveal key={z.codigo} delay={i * 0.04} className="exec-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <ZonaBadge z={z.codigo} />
              <div className="flex items-center gap-3 text-xs text-[var(--color-muted)]">
                <span className="flex items-center gap-1 text-[#0f9d58]"><Check className="h-3 w-3" />{z.contestado}</span>
                <span className="flex items-center gap-1 text-[#dc2626]"><X className="h-3 w-3" />{z.no_contestado}</span>
                <span className="kpi-number text-base font-black" style={{ color: pctColor(z.pct) }}>{z.pct}%</span>
              </div>
            </div>
            {z.gerentes.length === 0 ? (
              <div className="py-4 text-center text-xs text-[var(--color-muted)]">Sin datos en el rango.</div>
            ) : (
              <div className="space-y-1.5">
                {z.gerentes.map((g: any) => {
                  const cW = g.total ? (g.contestado / g.total) * 100 : 0;
                  const risk = g.no_contestado >= 2;
                  return (
                    <div key={g.nombre} className="flex items-center gap-2 text-xs">
                      <span className="flex w-40 shrink-0 items-center gap-1 truncate text-[var(--color-ink)]">
                        {risk && <AlertTriangle className="h-3 w-3 shrink-0 text-red-500" />}
                        {g.nombre}
                      </span>
                      <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-track)]">
                        <div className="bar-fill h-full" style={{ width: `${cW}%`, background: "#0f9d58" }} />
                        <div className="bar-fill h-full" style={{ width: `${100 - cW}%`, background: "#dc2626" }} />
                      </div>
                      <span className="w-12 text-right font-mono text-[var(--color-muted)]">
                        {g.contestado}/{g.total}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Reveal>
        ))}
      </div>
      <p className="flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
        <AlertTriangle className="h-3 w-3 shrink-0 text-red-500" /> = gerente con 2+ citas no atendidas
        en el rango (candidato a Black List según la regla de penalización).
      </p>
    </div>
  );
}
