"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Users,
  Send,
  Ban,
  Layers,
  MapPin,
  RotateCcw,
  Crown,
  TrendingUp,
} from "lucide-react";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { ZonaBadge, ZONA_COLOR } from "@/components/ui";
import {
  ChartBox,
  CargaPorZonaChart,
  GerentesPorZonaChart,
  AsignacionesChart,
  BlacklistDonut,
} from "@/components/charts";

const fade = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } },
};

function Kpi({
  label,
  value,
  icon: Icon,
  accent,
  hero = false,
  sub,
}: {
  label: string;
  value: number;
  icon: any;
  accent: string;
  hero?: boolean;
  sub?: string;
}) {
  return (
    <motion.div variants={fade} className={`${hero ? "exec-card-hero" : "exec-card"} p-4`}>
      <div className="flex items-start justify-between">
        <span className="exec-label">{label}</span>
        <span
          className="grid h-7 w-7 place-items-center rounded-lg"
          style={{ background: `${accent}18`, color: accent }}
        >
          <Icon className="h-4 w-4" strokeWidth={2.4} />
        </span>
      </div>
      <p className="kpi-number mt-2 text-3xl font-black" style={{ color: accent }}>
        <AnimatedCounter value={value} />
      </p>
      {sub && <p className="mt-0.5 text-xs text-[var(--color-muted)]">{sub}</p>}
    </motion.div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<any>(null);

  async function load() {
    const r = await fetch("/api/state", { cache: "no-store" });
    setData(await r.json());
  }
  useEffect(() => {
    load();
  }, []);

  async function reset() {
    if (!confirm("¿Reiniciar la data de la demo al estado original del Excel?")) return;
    await fetch("/api/reset", { method: "POST" });
    load();
  }

  if (!data)
    return (
      <div className="grid gap-4 md:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton h-24 rounded-2xl" />
        ))}
      </div>
    );

  const { stats, porZona, ranking, charts } = data;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-[var(--color-ink)]">
            Centro de <span className="accent-orange">Distribución</span>
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Rotación equitativa de leads por zona · Reemplazo del Excel de Telemercadeo
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/asignar"
            className="flex items-center gap-2 rounded-lg bg-wh-orange px-4 py-2 text-sm font-bold text-white shadow-orange transition hover:brightness-105"
          >
            <Send className="h-4 w-4" /> Asignar Lead
          </Link>
          <button
            onClick={reset}
            className="flex items-center gap-2 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-sm font-semibold text-[var(--color-muted)] transition hover:border-red-300 hover:text-red-500"
          >
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
        </div>
      </div>

      {/* KPIs */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.06 } } }}
        className="grid grid-cols-2 gap-4 md:grid-cols-5"
      >
        <Kpi label="Gerentes activos" value={stats.gerentesConZona} icon={Users} accent="#e07d00" hero sub={`${stats.totalGerentes} totales`} />
        <Kpi label="Asignadas (sesión)" value={stats.asignacionesSesion} icon={Send} accent="#0f9d58" />
        <Kpi label="En Black List" value={stats.blacklistActivos} icon={Ban} accent="#dc2626" />
        <Kpi label="Tier 2" value={stats.tier2} icon={Layers} accent="#7c3aed" sub="mitad de leads" />
        <Kpi label="Zonas" value={porZona.length} icon={MapPin} accent="#0891b2" />
      </motion.div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartBox title="Carga histórica de leads por zona" hint="cómo se repartió hasta hoy">
            <CargaPorZonaChart porZona={porZona} />
          </ChartBox>
        </div>
        <ChartBox title="Black List" hint="activa vs vencida">
          <BlacklistDonut activa={charts.blacklist.activa} vencida={charts.blacklist.vencida} />
        </ChartBox>
        <div className="lg:col-span-2">
          <ChartBox title="Asignaciones de la sesión" hint="línea de tiempo">
            <AsignacionesChart data={charts.asignacionesPorDia} />
          </ChartBox>
        </div>
        <ChartBox title="Gerentes elegibles por zona">
          <GerentesPorZonaChart porZona={porZona} />
        </ChartBox>
      </div>

      {/* Próximo turno por zona */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-wh-orange" />
          <h2 className="text-lg font-bold text-[var(--color-ink)]">Próximo turno por zona</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {porZona.map((z: any, idx: number) => {
            const rank = ranking[z.codigo] as any[];
            const elegibles = rank.filter((c) => c.elegible);
            const next = elegibles[0];
            const maxCarga = z.cargaMax || 1;
            return (
              <motion.div
                key={z.codigo}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="exec-card p-4"
              >
                <div className="flex items-center justify-between">
                  <ZonaBadge z={z.codigo} />
                  {z.opcional && (
                    <span className="rounded-full bg-[var(--color-track)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)]">
                      opcional
                    </span>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-wh-orange/12">
                    <Crown className="h-4 w-4 text-wh-orange" />
                  </span>
                  <div className="min-w-0">
                    <div className="exec-label">Le toca a</div>
                    <div className="truncate text-base font-bold text-[var(--color-ink)]">
                      {next ? next.gerente.nombre : "— sin elegibles —"}
                    </div>
                    {next && (
                      <div className="text-xs text-[var(--color-muted)]">
                        carga {next.cargaEfectiva}
                        {next.gerente.tier2 && " · Tier 2"}
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-3 space-y-1.5">
                  {elegibles.slice(0, 4).map((c: any) => (
                    <div key={c.gerente.id} className="flex items-center gap-2 text-xs">
                      <span
                        className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white"
                        style={{ background: ZONA_COLOR[z.codigo] }}
                      >
                        {c.rank}
                      </span>
                      <span className="w-28 truncate text-[var(--color-ink-soft)]">{c.gerente.nombre}</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-track)]">
                        <div
                          className="bar-fill h-full rounded-full"
                          style={{
                            width: `${(c.cargaEfectiva / maxCarga) * 100}%`,
                            background: ZONA_COLOR[z.codigo],
                          }}
                        />
                      </div>
                      <span className="w-6 text-right font-mono text-[var(--color-muted)]">{c.cargaEfectiva}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-[var(--color-line)] pt-2 text-xs text-[var(--color-muted)]">
                  <span>{z.gerentesActivos} elegibles</span>
                  <span>{z.asignadasSesion} asignadas</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
