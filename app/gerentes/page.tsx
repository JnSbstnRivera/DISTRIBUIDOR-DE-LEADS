"use client";

import { useEffect, useState } from "react";
import { SectionTitle, ZONA_NOMBRE, ZONA_COLOR } from "@/components/ui";

const ZONAS = ["SJ1", "SJ2", "HAT", "PON", "MAYA", "COR"];

export default function Gerentes() {
  const [data, setData] = useState<any>(null);
  const [q, setQ] = useState("");

  async function load() {
    const r = await fetch("/api/state", { cache: "no-store" });
    setData(await r.json());
  }
  useEffect(() => {
    load();
  }, []);

  async function patch(body: any) {
    await fetch("/api/gerente", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    load();
  }

  if (!data) return <div className="text-[var(--color-muted)]">Cargando…</div>;

  const gerentes = data.gerentes.filter((g: any) =>
    g.nombre.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div>
      <SectionTitle sub="Opt-in por zona, ajuste de carga (igualación) y Tier 2. La carga efectiva = histórico + ajuste + asignaciones.">
        Gerentes
      </SectionTitle>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar gerente…"
        className="mb-4 w-full max-w-sm rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-[var(--color-ink)] outline-none transition focus:border-wh-orange focus:ring-2 focus:ring-wh-orange/20"
      />

      <div className="exec-card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-subtle)] text-left text-[11px] uppercase tracking-widest text-[var(--color-muted)]">
            <tr>
              <th className="px-3 py-2">Gerente</th>
              <th className="px-3 py-2 text-center">Tier 2</th>
              <th className="px-3 py-2 text-center">BL</th>
              {ZONAS.map((z) => (
                <th key={z} className="px-2 py-2 text-center" style={{ color: ZONA_COLOR[z] }}>
                  {z}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {gerentes.map((g: any) => (
              <tr key={g.id} className="border-t border-[var(--color-line)] hover:bg-[var(--color-subtle)]">
                <td className="px-3 py-2 font-medium text-[var(--color-ink)]">{g.nombre}</td>
                <td className="px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={g.tier2}
                    onChange={(e) => patch({ id: g.id, tier2: e.target.checked })}
                    className="accent-[#a855f7]"
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={g.blacklist}
                    onChange={(e) => patch({ id: g.id, blacklist: e.target.checked })}
                    className="accent-red-500"
                  />
                </td>
                {ZONAS.map((z) => {
                  const zd = g.zonas[z];
                  const carga = zd ? zd.historico + zd.ajuste : null;
                  return (
                    <td key={z} className="px-2 py-2 text-center">
                      {zd ? (
                        <div
                          className="mx-auto inline-flex flex-col items-center rounded px-1.5 py-0.5"
                          style={{ background: `${ZONA_COLOR[z]}18` }}
                          title={`histórico ${zd.historico} + ajuste ${zd.ajuste}`}
                        >
                          <span className="font-mono text-xs font-bold" style={{ color: ZONA_COLOR[z] }}>
                            {carga}
                          </span>
                          <span className="text-[9px] text-[var(--color-muted)]">
                            {zd.historico}+{zd.ajuste}
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => patch({ id: g.id, zona: z, optIn: true })}
                          className="text-[11px] text-[var(--color-muted)] hover:text-wh-orange"
                          title="Opt-in a esta zona"
                        >
                          +
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-[var(--color-muted)]">
        Cada celda de zona muestra la <b>carga efectiva</b> (histórico + ajuste). Menor carga = recibe el próximo lead.
      </p>
    </div>
  );
}
