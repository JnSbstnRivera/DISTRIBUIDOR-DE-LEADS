"use client";

import { useEffect, useState } from "react";
import { SectionTitle, ZonaBadge } from "@/components/ui";

export default function Historial() {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    fetch("/api/state", { cache: "no-store" })
      .then((r) => r.json())
      .then(setData);
  }, []);
  if (!data) return <div className="text-[var(--color-muted)]">Cargando…</div>;

  const asig = data.asignaciones as any[];

  return (
    <div>
      <SectionTitle sub="Bitácora de asignaciones de esta sesión (reemplaza la hoja de registro del Excel).">
        Historial de Asignaciones
      </SectionTitle>

      {asig.length === 0 ? (
        <div className="exec-card p-8 text-center text-[var(--color-muted)]">
          Aún no hay asignaciones en esta sesión. Ve a{" "}
          <span className="text-wh-orange">Asignar Lead</span> para empezar.
        </div>
      ) : (
        <div className="exec-card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-subtle)] text-left text-[11px] uppercase tracking-widest text-[var(--color-muted)]">
              <tr>
                <th className="px-3 py-2">Fecha / hora</th>
                <th className="px-3 py-2">Zona</th>
                <th className="px-3 py-2">Municipio</th>
                <th className="px-3 py-2">Gerente</th>
                <th className="px-3 py-2">Lead</th>
                <th className="px-3 py-2">Origen</th>
              </tr>
            </thead>
            <tbody>
              {asig.map((a) => (
                <tr key={a.id} className="border-t border-[var(--color-line)] hover:bg-[var(--color-subtle)]">
                  <td className="px-3 py-2 text-[var(--color-muted)]">
                    {new Date(a.fecha).toLocaleString("es-PR")}
                  </td>
                  <td className="px-3 py-2">
                    <ZonaBadge z={a.zona} />
                  </td>
                  <td className="px-3 py-2 text-[var(--color-ink-soft)]">{a.municipio ?? "—"}</td>
                  <td className="px-3 py-2 font-medium text-[var(--color-ink)]">{a.gerente}</td>
                  <td className="px-3 py-2 font-mono text-xs text-[var(--color-muted)]">
                    {a.leadRef ?? "—"}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        a.origen === "auto"
                          ? "bg-wh-orange/12 text-wh-orange ring-1 ring-wh-orange/30"
                          : "bg-wh-blue/10 text-wh-blue ring-1 ring-wh-blue/25"
                      }`}
                    >
                      {a.origen}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
