"use client";

import { useMemo, useRef, useState } from "react";
import { Search, MapPin, X } from "lucide-react";
import prMap from "@/data/pr_map.json";
import { SectionTitle, ZonaBadge, ZONA_NOMBRE, ZONA_COLOR } from "@/components/ui";

type Muni = { name: string; zona: string; d: string };
const MUNIS = prMap.municipios as Muni[];
const ZONAS = ["SJ1", "SJ2", "HAT", "PON", "MAYA", "COR"];

function norm(s: string) {
  return s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

export default function Mapa() {
  const [hovered, setHovered] = useState<Muni | null>(null);
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
  const countByZona = (z: string) => MUNIS.filter((m) => m.zona === z).length;

  return (
    <div>
      <SectionTitle sub="Pasa el mouse por el mapa para ver la zona de cada pueblo. Escribe o haz clic en un pueblo: se ilumina el municipio y toda su zona.">
        Mapa de Zonas · Puerto Rico
      </SectionTitle>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* ── LISTA (izquierda, estilo Excel) ── */}
        <div className="exec-card flex flex-col p-4 lg:col-span-4" style={{ maxHeight: "80vh" }}>
          <h2 className="exec-label mb-2">Pueblos y zonas</h2>

          {/* Buscador */}
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Escribe un pueblo… (ej. Cidra)"
              className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] py-2 pl-9 pr-3 text-[var(--color-ink)] outline-none transition focus:border-wh-orange focus:ring-2 focus:ring-wh-orange/20"
            />
          </div>

          {/* Filtro por zona (como la lista de Zonas del Excel) */}
          <div className="mb-3 flex flex-wrap gap-1.5">
            {ZONAS.map((z) => {
              const on = selZona === z && !selMuni;
              return (
                <button
                  key={z}
                  onClick={() => toggleZona(z)}
                  className="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold transition"
                  style={{
                    background: `${ZONA_COLOR[z]}${on ? "30" : "14"}`,
                    color: ZONA_COLOR[z],
                    border: `1px solid ${ZONA_COLOR[z]}${on ? "" : "33"}`,
                  }}
                  title={`${countByZona(z)} pueblos`}
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: ZONA_COLOR[z] }} />
                  {ZONA_NOMBRE[z]}
                </button>
              );
            })}
          </div>

          <div className="mb-1.5 flex items-center justify-between text-[11px] text-[var(--color-muted)]">
            <span>{listed.length} de {MUNIS.length} pueblos</span>
            {(selMuni || selZona || query) && (
              <button onClick={clear} className="flex items-center gap-1 font-semibold hover:text-[var(--color-ink)]">
                <X className="h-3 w-3" /> limpiar
              </button>
            )}
          </div>

          {/* Tabla pueblo | zona */}
          <div className="-mr-1 flex-1 space-y-0.5 overflow-y-auto pr-1">
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
                  style={
                    isSel
                      ? { background: `${ZONA_COLOR[m.zona]}1a`, boxShadow: `inset 0 0 0 1px ${ZONA_COLOR[m.zona]}` }
                      : {}
                  }
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

        {/* ── MAPA (derecha, grande) ── */}
        <div className="exec-card flex flex-col p-4 lg:col-span-8">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="exec-label">Mapa interactivo</h2>
            {active ? (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-wh-orange" />
                <b className="text-[var(--color-ink)]">{active.name}</b>
                <span className="text-[var(--color-muted)]">→</span>
                <ZonaBadge z={active.zona} />
              </div>
            ) : hovered ? (
              <div className="flex items-center gap-2 text-sm">
                <b className="text-[var(--color-ink)]">{hovered.name}</b>
                <span className="text-[var(--color-muted)]">→</span>
                <ZonaBadge z={hovered.zona} />
              </div>
            ) : (
              <span className="text-xs text-[var(--color-muted)]">Pasa el mouse o elige un pueblo</span>
            )}
          </div>

          <div
            ref={wrapRef}
            className="relative flex flex-1 items-center justify-center rounded-xl p-2"
            style={{
              minHeight: "62vh",
              background:
                "radial-gradient(120% 120% at 50% 0%, rgba(166,195,230,0.10), transparent 70%)",
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
              style={{ maxHeight: "60vh", filter: "drop-shadow(0 10px 22px rgba(8,18,50,0.22))" }}
            >
              {MUNIS.map((m) => {
                const st = stateOf(m);
                const isHover = hovered?.name === m.name;
                const isSel = selMuni === m.name;
                const color = ZONA_COLOR[m.zona] ?? "#888";
                const opacity = st === "dim" ? 0.14 : st === "active" ? 0.95 : 0.62;
                return (
                  <path
                    key={m.name}
                    d={m.d}
                    fill={color}
                    fillOpacity={isHover ? 1 : opacity}
                    stroke={isSel ? "#fff" : isHover ? "#0e1326" : "rgba(255,255,255,0.55)"}
                    strokeWidth={isSel ? 1.6 : isHover ? 1.1 : 0.5}
                    style={{ cursor: "pointer", transition: "fill-opacity 0.2s, stroke-width 0.15s" }}
                    onMouseEnter={() => setHovered(m)}
                    onClick={() => pick(m)}
                  />
                );
              })}
            </svg>

            {hovered && (
              <div
                className="pointer-events-none absolute z-10 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs shadow-soft"
                style={{
                  left: Math.min(tip.x + 14, (wrapRef.current?.clientWidth ?? 999) - 160),
                  top: tip.y + 14,
                }}
              >
                <div className="font-bold text-[var(--color-ink)]">{hovered.name}</div>
                <div className="mt-0.5 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ background: ZONA_COLOR[hovered.zona] }} />
                  <span className="text-[var(--color-muted)]">{ZONA_NOMBRE[hovered.zona]}</span>
                </div>
              </div>
            )}
          </div>

          {/* Leyenda inferior */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
            {ZONAS.map((z) => (
              <button
                key={z}
                onClick={() => toggleZona(z)}
                className="flex items-center gap-1.5 text-[11px] font-semibold transition hover:opacity-100"
                style={{ color: ZONA_COLOR[z], opacity: !selZona || selZona === z ? 1 : 0.45 }}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: ZONA_COLOR[z] }} />
                {ZONA_NOMBRE[z]} <span className="text-[var(--color-muted)]">({countByZona(z)})</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
