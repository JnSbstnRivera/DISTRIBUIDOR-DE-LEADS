"use client";

import { useMemo, useRef, useState } from "react";
import { Search, X, Building2 } from "lucide-react";
import prMap from "@/data/pr_map.json";
import { SectionTitle, ZONA_NOMBRE, ZONA_COLOR } from "@/components/ui";

type Muni = { name: string; zona: string; d: string };
const MUNIS = prMap.municipios as Muni[];
const ZONAS = ["SJ1", "SJ2", "HAT", "PON", "MAYA", "COR"];

// Nombres de oficina por zona (cuadro "Zonas" del Excel)
const OFICINA: Record<string, string> = {
  SJ1: "Oficina San Juan — Metro",
  SJ2: "Oficina San Juan 2 — Caguas",
  HAT: "Oficina Hatillo — Norte",
  PON: "Oficina Ponce — Sur",
  MAYA: "Oficina Mayagüez — Oeste",
  COR: "Cordillera",
};

// Etiqueta dentro del mapa (estilo Excel)
const ZONE_LABEL: Record<string, string> = {
  SJ1: "SAN JUAN I",
  SJ2: "SAN JUAN II",
  HAT: "HATILLO",
  PON: "PONCE",
  MAYA: "MAYAGÜEZ",
  COR: "CORDILLERA",
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

  // Centro (bbox) por municipio
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

  // Centro por zona (para la etiqueta dentro del mapa)
  const zoneCentroids = useMemo(() => {
    const acc: Record<string, { x: number; y: number; n: number }> = {};
    for (const m of MUNIS) {
      const c = centroids[m.name];
      if (!c) continue;
      const a = acc[m.zona] || (acc[m.zona] = { x: 0, y: 0, n: 0 });
      a.x += c[0]; a.y += c[1]; a.n++;
    }
    const out: Record<string, [number, number]> = {};
    for (const z in acc) out[z] = [acc[z].x / acc[z].n, acc[z].y / acc[z].n];
    return out;
  }, [centroids]);

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
  const live = hovered ?? active;
  const countByZona = (z: string) => MUNIS.filter((m) => m.zona === z).length;

  return (
    <div>
      <SectionTitle sub="Pasa el mouse por el mapa para ver la zona de cada pueblo. Escribe o haz clic en un pueblo: se ilumina el municipio y toda su zona.">
        Mapa de Zonas · Puerto Rico
      </SectionTitle>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* ── IZQUIERDA: Zonas + Pueblos ── */}
        <div className="flex flex-col gap-6 lg:col-span-3" style={{ maxHeight: "86vh" }}>
          {/* ZONAS / OFICINAS */}
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
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition ${
                      on ? "" : "hover:bg-[var(--color-subtle)]"
                    }`}
                    style={on ? { background: `${ZONA_COLOR[z]}1a`, boxShadow: `inset 0 0 0 1px ${ZONA_COLOR[z]}` } : {}}
                  >
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: ZONA_COLOR[z] }} />
                    <span className="flex-1 text-[13px] font-semibold leading-tight text-[var(--color-ink)]">
                      {OFICINA[z]}
                    </span>
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

          {/* PUEBLOS */}
          <div className="exec-card flex min-h-0 flex-1 flex-col p-4">
            <h2 className="exec-label mb-2">Pueblos</h2>
            <div className="relative mb-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar pueblo…"
                className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] py-2 pl-9 pr-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-wh-orange focus:ring-2 focus:ring-wh-orange/20"
              />
            </div>
            <div className="mb-1.5 flex items-center justify-between text-[11px] text-[var(--color-muted)]">
              <span>{listed.length}/{MUNIS.length}</span>
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
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition ${
                      isSel ? "" : "hover:bg-[var(--color-subtle)]"
                    }`}
                    style={isSel ? { background: `${ZONA_COLOR[m.zona]}1a`, boxShadow: `inset 0 0 0 1px ${ZONA_COLOR[m.zona]}` } : {}}
                    title={ZONA_NOMBRE[m.zona]}
                  >
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: ZONA_COLOR[m.zona] }} />
                    <span className="truncate text-[var(--color-ink)]">{m.name}</span>
                  </button>
                );
              })}
              {listed.length === 0 && (
                <div className="px-2 py-6 text-center text-sm text-[var(--color-muted)]">Sin resultados.</div>
              )}
            </div>
          </div>
        </div>

        {/* ── DERECHA: Mapa grande ── */}
        <div className="exec-card flex flex-col p-5 lg:col-span-9">
          <div className="mb-2 flex items-baseline justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-[var(--color-muted)]">
                Windmar Home ·{" "}
              </span>
              <span className="text-xl font-black uppercase tracking-tight text-[var(--color-ink)]">
                Puerto <span className="accent-orange">Rico</span>
              </span>
            </div>
            {(selMuni || selZona) && (
              <button
                onClick={clear}
                className="flex items-center gap-1 rounded-full border border-[var(--color-line)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-muted)] hover:text-[var(--color-ink)]"
              >
                <X className="h-3 w-3" /> Limpiar
              </button>
            )}
          </div>

          <div
            ref={wrapRef}
            className="relative flex flex-1 items-center justify-center rounded-2xl p-2"
            style={{
              minHeight: "60vh",
              background: "radial-gradient(120% 120% at 50% 0%, rgba(166,195,230,0.12), transparent 70%)",
            }}
            onMouseMove={(e) => {
              const r = wrapRef.current?.getBoundingClientRect();
              if (r) setTip({ x: e.clientX - r.left, y: e.clientY - r.top });
            }}
            onMouseLeave={() => setHovered(null)}
          >
            <svg
              viewBox={prMap.viewBox}
              className="w-full"
              style={{ filter: "drop-shadow(0 12px 26px rgba(8,18,50,0.25))" }}
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

              {/* Etiquetas de zona DENTRO del mapa */}
              {ZONAS.map((z) => {
                const c = zoneCentroids[z];
                if (!c) return null;
                const isActive = selZona === z || hoverZona === z || hovered?.zona === z;
                const dim = (selZona && selZona !== z) || (hoverZona && hoverZona !== z);
                return (
                  <text
                    key={z}
                    x={c[0]}
                    y={c[1]}
                    textAnchor="middle"
                    dominantBaseline="central"
                    onClick={() => toggleZona(z)}
                    onMouseEnter={() => setHoverZona(z)}
                    onMouseLeave={() => setHoverZona(null)}
                    style={{
                      fontSize: isActive ? 17 : 14,
                      fontWeight: 800,
                      letterSpacing: 0.4,
                      fill: "#ffffff",
                      stroke: "rgba(8,18,50,0.6)",
                      strokeWidth: 0.9,
                      paintOrder: "stroke",
                      opacity: dim ? 0.3 : 1,
                      cursor: "pointer",
                      transition: "opacity 0.2s, font-size 0.15s",
                    }}
                  >
                    {ZONE_LABEL[z]}
                  </text>
                );
              })}

              {/* Marcador animado sobre el municipio activo */}
              {live && centroids[live.name] && (
                <g pointerEvents="none">
                  <circle cx={centroids[live.name][0]} cy={centroids[live.name][1]} r={2} fill="none" stroke={ZONA_COLOR[live.zona]} strokeWidth={0.7}>
                    <animate attributeName="r" values="2;7;2" dur="1.7s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.9;0;0.9" dur="1.7s" repeatCount="indefinite" />
                  </circle>
                  <circle cx={centroids[live.name][0]} cy={centroids[live.name][1]} r={2} fill={ZONA_COLOR[live.zona]} stroke="#fff" strokeWidth={0.7} />
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
        </div>
      </div>
    </div>
  );
}
