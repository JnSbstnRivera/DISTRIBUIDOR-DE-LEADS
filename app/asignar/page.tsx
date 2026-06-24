"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MapPin, Send, Tag, Check, Ban, Trophy } from "lucide-react";
import { SectionTitle, ZonaBadge, ZONA_NOMBRE, ZONA_COLOR } from "@/components/ui";

export default function Asignar() {
  const [data, setData] = useState<any>(null);
  const [municipio, setMunicipio] = useState("");
  const [zona, setZona] = useState("");
  const [leadRef, setLeadRef] = useState("");
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const r = await fetch("/api/state", { cache: "no-store" });
    setData(await r.json());
  }
  useEffect(() => {
    load();
  }, []);

  const zonaResuelta = useMemo(() => {
    if (zona) return zona;
    if (!data || !municipio) return "";
    const m = data.municipios.find(
      (x: any) => x.municipio.toLowerCase() === municipio.toLowerCase()
    );
    return m ? m.zona : "";
  }, [zona, municipio, data]);

  const ranking = zonaResuelta && data ? (data.ranking[zonaResuelta] as any[]) : [];
  const elegibles = ranking.filter((c) => c.elegible);
  const next = elegibles[0];
  const podium = elegibles.slice(0, 3);
  const maxCarga = Math.max(...elegibles.map((c) => c.cargaEfectiva), 1);

  async function asignar(gerente?: string) {
    if (!zonaResuelta) return;
    setBusy(true);
    const r = await fetch("/api/asignar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        zona: zonaResuelta,
        municipio: municipio || null,
        leadRef: leadRef || null,
        gerente: gerente || null,
      }),
    });
    const j = await r.json();
    setResult(j);
    setBusy(false);
    setLeadRef("");
    await load();
  }

  if (!data) return <div className="text-[var(--color-muted)]">Cargando…</div>;

  const podiumOrder = [1, 0, 2]; // 2º, 1º, 3º para el efecto podio
  const inputCls =
    "mt-1 w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-ink)] outline-none transition focus:border-wh-orange focus:ring-2 focus:ring-wh-orange/20";

  return (
    <div>
      <SectionTitle sub="Citas coordinadas de mañana en adelante sin consultor. El municipio resuelve la zona y el motor calcula a quién le toca por la rotación equitativa del Excel.">
        Leads Digitales
      </SectionTitle>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Formulario */}
        <div className="exec-card space-y-4 p-5 lg:col-span-2">
          <div>
            <label className="exec-label flex items-center gap-1.5">
              <MapPin className="h-3 w-3" /> Municipio del cliente
            </label>
            <input
              list="municipios"
              value={municipio}
              onChange={(e) => {
                setMunicipio(e.target.value);
                setZona("");
              }}
              placeholder="Ej. Caguas, Ponce, San Juan…"
              className={inputCls}
            />
            <datalist id="municipios">
              {data.municipios.map((m: any) => (
                <option key={m.municipio} value={m.municipio} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="exec-label">…o zona directa</label>
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
              <Tag className="h-3 w-3" /> Referencia del lead (opcional)
            </label>
            <input
              value={leadRef}
              onChange={(e) => setLeadRef(e.target.value)}
              placeholder="Ej. L746497"
              className={inputCls}
            />
          </div>

          <AnimatePresence mode="wait">
            {zonaResuelta ? (
              <motion.div
                key={zonaResuelta}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-xl border border-wh-orange/40 bg-wh-orange/8 p-4"
              >
                <div className="flex items-center justify-between">
                  <ZonaBadge z={zonaResuelta} />
                  <span className="text-xs text-[var(--color-muted)]">{elegibles.length} elegibles</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div>
                    <div className="exec-label">Le toca a</div>
                    <div className="text-xl font-black text-[var(--color-ink)]">
                      {next ? next.gerente.nombre : "— sin gerentes elegibles —"}
                    </div>
                  </div>
                </div>
                {next && (
                  <div className="mt-1 text-xs text-[var(--color-muted)]">
                    carga efectiva {next.cargaEfectiva}
                    {next.gerente.tier2 && " · Tier 2 (mitad de leads)"}
                  </div>
                )}
                <button
                  disabled={!next || busy}
                  onClick={() => asignar()}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-wh-orange py-2.5 font-bold text-white shadow-orange transition hover:brightness-105 disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                  {busy ? "Asignando…" : "Confirmar asignación automática"}
                </button>
              </motion.div>
            ) : (
              <p className="text-sm text-[var(--color-muted)]">
                Selecciona un municipio o zona para ver a quién le toca.
              </p>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {result?.ok && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-600"
              >
                <Check className="h-4 w-4" />
                Lead asignado a <b>{result.asignacion.gerente}</b> ·{" "}
                {ZONA_NOMBRE[result.asignacion.zona]} ({result.asignacion.origen})
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Podio + Ranking */}
        <div className="exec-card p-5 lg:col-span-3">
          <h2 className="exec-label mb-4 flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5" /> Rotación{" "}
            {zonaResuelta && `· ${ZONA_NOMBRE[zonaResuelta]}`}
          </h2>

          {!zonaResuelta && <p className="text-sm text-[var(--color-muted)]">Elige una zona para ver la rotación.</p>}

          {/* Podio top 3 */}
          {podium.length >= 3 && (
            <div className="mb-5 flex items-end justify-center gap-3">
              {podiumOrder.map((pi) => {
                const c = podium[pi];
                if (!c) return null;
                const h = c.rank === 1 ? "h-24" : c.rank === 2 ? "h-16" : "h-12";
                const color = ZONA_COLOR[zonaResuelta];
                return (
                  <motion.div
                    key={c.gerente.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: pi * 0.08, ease: [0.22, 1, 0.36, 1] }}
                    className="flex w-24 flex-col items-center"
                  >
                    <div className="mb-1 text-center text-[11px] font-semibold leading-tight text-[var(--color-ink)]">
                      {c.gerente.nombre.split(" ").slice(0, 2).join(" ")}
                    </div>
                    <div
                      className={`${h} w-full rounded-t-lg`}
                      style={{ background: `linear-gradient(180deg, ${color}, ${color}66)` }}
                    />
                    <div className="w-full rounded-b-lg bg-[var(--color-track)] py-1 text-center">
                      <span className="kpi-number text-sm font-bold text-[var(--color-ink)]">#{c.rank}</span>
                      <div className="text-[10px] text-[var(--color-muted)]">carga {c.cargaEfectiva}</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Lista completa */}
          <div className="space-y-1">
            {ranking.map((c: any, i: number) => (
              <motion.div
                key={c.gerente.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.015, 0.4) }}
                className={`flex items-center gap-3 rounded-lg px-2 py-1.5 ${
                  c.rank === 1 ? "bg-wh-orange/8 ring-1 ring-wh-orange/30" : ""
                } ${!c.elegible ? "opacity-50" : ""}`}
              >
                <span
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white"
                  style={{ background: c.elegible ? ZONA_COLOR[zonaResuelta] : "#a7a9ac" }}
                >
                  {c.elegible ? c.rank : <Ban className="h-3 w-3 text-white" />}
                </span>
                <span className="w-36 shrink-0 truncate text-sm text-[var(--color-ink)]">
                  {c.gerente.nombre}
                  {c.gerente.tier2 && (
                    <span className="ml-1 text-[10px] font-bold text-purple-500">T2</span>
                  )}
                </span>
                {c.elegible ? (
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-track)]">
                    <div
                      className="bar-fill h-full rounded-full"
                      style={{
                        width: `${(c.cargaEfectiva / maxCarga) * 100}%`,
                        background: ZONA_COLOR[zonaResuelta],
                      }}
                    />
                  </div>
                ) : (
                  <span className="flex-1 text-[11px] font-semibold text-red-500">{c.motivo}</span>
                )}
                {c.elegible && (
                  <button
                    onClick={() => asignar(c.gerente.nombre)}
                    disabled={busy}
                    className="rounded px-2 py-0.5 text-[11px] font-semibold text-[var(--color-muted)] transition hover:bg-[var(--color-track)] hover:text-[var(--color-ink)]"
                  >
                    asignar
                  </button>
                )}
                <span className="w-7 text-right font-mono text-xs text-[var(--color-muted)]">
                  {Number.isFinite(c.cargaEfectiva) ? c.cargaEfectiva : "—"}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
