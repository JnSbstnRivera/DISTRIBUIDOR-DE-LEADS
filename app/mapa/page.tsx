"use client";

import { useMemo, useRef, useState } from "react";
import { Search, MapPin, X, Building2 } from "lucide-react";
import prMap from "@/data/pr_map.json";
import { SectionTitle, ZonaBadge, ZONA_NOMBRE, ZONA_COLOR } from "@/components/ui";

type Muni = { name: string; zona: string; d: string };
const MUNIS = prMap.municipios as Muni[];
const ZONAS = ["SJ1", "SJ2", "HAT", "PON", "MAYA", "COR"];

// Nombres de oficina por zona (como el cuadro "Zonas" del Excel)
const OFICINA: Record<string, string> = {
  SJ1: "Oficina San Juan — Metro",
  SJ2: "Oficina San Juan 2 — Caguas",
  HAT: "Oficina Hatillo — Norte",
  PON: "Oficina Ponce — Sur",
  MAYA: "Oficina Mayagüez — Oeste",
  COR: "Cordillera",
};

function norm(s: string) {
  return s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

export default function Mapa() {
  const [hovered, setHovered] = useState<Muni | null>(null);
  const [hoverZona, setHoverZona] = useState<string | null>(null);
  const [selMuni, setSelMuni] = useState<string | null>(null);
  const [selZona, setSelZona] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [tip, setTip] = useState({ x: 0, y: 0 });
  const wrapRef = useRef<HTMLDivElement>(null);

  const q = norm(query);
  const matching = useMemo(
    () => (q ? new Set(MUNIS.filter((m) => norm(m.name).includes(q)).map((m) => m.name)) : null),
    [q]
  );

  // Centro (bbox) de cada municipio para ubicar el marcador
  const centroids = useMemo(() => {
    const map: Record<string, [number, number]> = {};
    for (const m of MUNIS) {
      const nums = (m.d.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (let i = 0; i + 1 < nums.length; i += 2) {
        const x = nums[i], y = nums[i + 1];
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
      map[m.name] = [(minX + maxX) / 2, (minY + maxY) / 2];
    }
    return map;
  }, []);

  const listed = useMemo(
    () =>
      [...MUNIS]
        .filter((m) => !q || norm(m.name).includes(q))
        .filter((m) => !selZona || m.zona === selZona || !!selMuni)
        .sort((a, b) => a.name.localeCompare(b.name, "es")),
    [q, selZona, selMuni]
  );

  function stateOf(m: Muni): "active" | "dim" | "normal" {
    if (selMuni) return m.zona === selZona ? "active" : "dim";
    if (selZona) return m.zona === selZona ? "active" : "dim";
    if (hoverZona) return m.zona === hoverZona ? "active" : "dim";
    if (matching) return matching.has(m.name) ? "active" : "dim";
    return "normal";
  }

  function pick(m: Muni) {
    setSelMuni(m.name);
    setSelZona(m.zona);
  }
  function toggleZona(z: string) {
    setSelMuni(null);
    setSelZona(selZona === z ? null : z);
  }
  function clear() {
    setSelMuni(null);
    setSelZona(null);
    setQuery("");
  }

  const active = selMuni ? MUNIS.find((m) => m.name === selMuni) : null;
  const live = hovered ?? active; // qué mostramos en el título grande
  const countByZona = (z: string) => MUNIS.filter((m) => m.zona === z).length;

  return (
    <div>
      <SectionTitle sub="Pasa el mouse por el mapa para ver la zona de cada pueblo. Escribe o haz clic en un pueblo: se ilumina el municipio y toda su zona.">
        Mapa de Zonas · Puerto Rico
      </SectionTitle>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* ── COLUMNA IZQUIERDA: Zonas + Pueblos (estilo Excel) ── */}
        <div className="flex flex-col gap-6 lg:col-span-4" style={{ maxHeight: "86vh" }}>
          {/* Cuadro ZONAS / OFICINAS */}
          <div className="exec-card p-4">
            <h2 className="exec-label mb-2 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" /> Zonas · Oficinas
            </h2>
            <div className="space-y-1">
              {ZONAS.map((z) => {
                const on = selZona === z && !selMuni;
                return (
                  <button
                    key={z}
                    onClick={() => toggleZona(z)}
                    onMouseEnter={() => setHoverZona(z)}
                    onMouseLeave={() => setHoverZona(null)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition ${
                      on ? "" : "hover:bg-[var(--color-subtle)]"
                    }`}
                    style={on ? { background: `${ZONA_COLOR[z]}1a`, boxShadow: `inset 0 0 0 1px ${ZONA_COLOR[z]}` } : {}}
                  >
                    <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ background: ZONA_COLOR[z] }} />
                    <span className="flex-1 text-sm font-semibold text-[var(--color-ink)]">{OFICINA[z]}</span>
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                      style={{ background: `${ZONA_COLOR[z]}1f`, color: ZONA_COLOR[z] }}
                    >
                      {countByZona(z)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cuadro PUEBLOS */}
          <div className="exec-card flex min-h-0 flex-1 flex-col p-4">
            <h2 className="exec-label mb-2">Pueblos</h2>
            <div className="relative mb-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Escribe un pueblo… (ej. Cidra)"
                className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] py-2 pl-9 pr-3 text-[var(--color-ink)] outline-none transition focus:border-wh-orange focus:ring-2 focus:ring-wh-orange/20"
              />
            </div>
            <div className="mb-1.5 flex items-center justify-between text-[11px] text-[var(--color-muted)]">
              <span>{listed.length} de {MUNIS.length} pueblos</span>
              {(selMuni || selZona || query) && (
                <button onClick={clear} className="flex items-center gap-1 font-semibold hover:text-[var(--color-ink)]">
                  <X className="h-3 w-3" /> limpiar
                </button>
              )}
            </div>
            <div className="-mr-1 min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-1">
              {listed.map((m) => {
                const isSel = selMuni === m.name;
                return (
                  <button
                    key={m.name}
                    onClick={() => pick(m)}
                    onMouseEnter={() => setHovered(m)}
                    onMouseLeave={() => setHovered(null)}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-sm transition ${
                      isSel ? "" : "hover:bg-[var(--color-subtle)]"
                    }`}
                    style={isSel ? { background: `${ZONA_COLOR[m.zona]}1a`, boxShadow: `inset 0 0 0 1px ${ZONA_COLOR[m.zona]}` } : {}}
                  >
                    <span className="flex items-center gap-2 text-[var(--color-ink)]">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: ZONA_COLOR[m.zona] }} />
                      {m.name}
                    </span>
                    <span className="text-[11px] text-[var(--color-muted)]">{ZONA_NOMBRE[m.zona]}</span>
                  </button>
                );
              })}
              {listed.length === 0 && (
                <div className="px-2 py-6 text-center text-sm text-[var(--color-muted)]">
                  Sin resultados para “{query}”.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── COLUMNA DERECHA: Mapa grande ── */}
        <div className="exec-card flex flex-col p-5 lg:col-span-8">
          {/* Título grande estilo Windmar */}
          <div className="mb-3 flex items-start justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--color-muted)]">
                Windmar Home
              </div>
              <div className="text-3xl font-black uppercase tracking-tight text-[var(--color-ink)]">
                Puerto <span className="accent-orange">Rico</span>
              </div>
            </div>
            <div className="self-center text-right text-sm text-[var(--color-muted)]">
              Pasa el mouse o elige un pueblo
            </div>
          </div>

          <div
            ref={wrapRef}
            className="relative flex flex-1 items-center justify-center rounded-2xl p-3"
            style={{
              minHeight: "66vh",
              background: "radial-gradient(120% 120% at 50% 0%, rgba(166,195,230,0.12), transparent 70%)",
            }}
            onMouseMove={(e) => {
              const r = wrapRef.current?.getBoundingClientRect();
              if (r) setTip({ x: e.clientX - r.left, y: e.clientY - r.top });
            }}
            onMouseLeave={() => setHovered(null)}
          >
            {/* Título grande SOBRE el mapa */}
            {live && (
              <div
                key={live.name}
                className="animate-in-up pointer-events-none absolute left-1/2 top-1 z-10 -translate-x-1/2 text-center"
              >
                <div
                  className="text-4xl font-black tracking-tight md:text-5xl"
                  style={{ color: ZONA_COLOR[live.zona], textShadow: "0 2px 14px rgba(8,18,50,0.25)" }}
                >
                  {live.name}
                </div>
                <div className="mt-0.5 text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-muted)]">
                  {OFICINA[live.zona]}
                </div>
              </div>
            )}

            <svg
              viewBox={prMap.viewBox}
              className="w-full"
              style={{ maxHeight: "64vh", filter: "drop-shadow(0 12px 26px rgba(8,18,50,0.25))" }}
            >
              {MUNIS.map((m) => {
                const st = stateOf(m);
                const isHover = hovered?.name === m.name;
                const isSel = selMuni === m.name;
                const color = ZONA_COLOR[m.zona] ?? "#888";
                const opacity = st === "dim" ? 0.12 : st === "active" ? 0.96 : 0.64;
                return (
                  <path
                    key={m.name}
                    d={m.d}
                    fill={color}
                    fillOpacity={isHover ? 1 : opacity}
                    stroke={isSel ? "#fff" : isHover ? "#0e1326" : "rgba(255,255,255,0.6)"}
                    strokeWidth={isSel ? 1.8 : isHover ? 1.2 : 0.5}
                    style={{ cursor: "pointer", transition: "fill-opacity 0.2s, stroke-width 0.15s" }}
                    onMouseEnter={() => setHovered(m)}
                    onClick={() => pick(m)}
                  />
                );
              })}

              {/* Marcador animado sobre el municipio activo */}
              {live && centroids[live.name] && (
                <g pointerEvents="none">
                  <circle
                    cx={centroids[live.name][0]}
                    cy={centroids[live.name][1]}
                    r={2}
                    fill="none"
                    stroke={ZONA_COLOR[live.zona]}
                    strokeWidth={0.7}
                  >
                    <animate attributeName="r" values="2;7;2" dur="1.7s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.9;0;0.9" dur="1.7s" repeatCount="indefinite" />
                  </circle>
                  <circle
                    cx={centroids[live.name][0]}
                    cy={centroids[live.name][1]}
                    r={2}
                    fill={ZONA_COLOR[live.zona]}
                    stroke="#fff"
                    strokeWidth={0.7}
                  />
                </g>
              )}
            </svg>

            {hovered && (
              <div
                className="pointer-events-none absolute z-10 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 shadow-soft"
                style={{
                  left: Math.min(tip.x + 14, (wrapRef.current?.clientWidth ?? 999) - 190),
                  top: tip.y + 14,
                }}
              >
                <div className="text-sm font-bold text-[var(--color-ink)]">{hovered.name}</div>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: ZONA_COLOR[hovered.zona] }} />
                  <span className="text-xs text-[var(--color-muted)]">{OFICINA[hovered.zona]}</span>
                </div>
              </div>
            )}
          </div>

          {/* Leyenda inferior interactiva */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {ZONAS.map((z) => (
              <button
                key={z}
                onClick={() => toggleZona(z)}
                onMouseEnter={() => setHoverZona(z)}
                onMouseLeave={() => setHoverZona(null)}
                className="flex items-center gap-1.5 text-xs font-bold transition"
                style={{ color: ZONA_COLOR[z], opacity: !selZona || selZona === z ? 1 : 0.4 }}
              >
                <span className="h-3 w-3 rounded-full" style={{ background: ZONA_COLOR[z] }} />
                {ZONA_NOMBRE[z]} <span className="text-[var(--color-muted)]">({countByZona(z)})</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
