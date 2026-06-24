"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { SectionTitle, ZonaBadge } from "@/components/ui";

const zohoBadge = (z?: string) =>
  z === "sales_rep"
    ? { txt: "Asignado", bg: "rgba(15,157,88,0.12)", fg: "#0f9d58" }
    : z === "nota"
    ? { txt: "Solo nota", bg: "rgba(245,166,35,0.14)", fg: "#b9770e" }
    : z === "demo"
    ? { txt: "Demo", bg: "rgba(109,110,113,0.14)", fg: "#6d6e71" }
    : { txt: "—", bg: "var(--color-subtle)", fg: "var(--color-muted)" };

export default function Historial() {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    fetch("/api/state", { cache: "no-store" })
      .then((r) => r.json())
      .then(setData);
  }, []);
  if (!data) return <div className="text-[var(--color-muted)]">Cargando…</div>;

  const asig = data.asignaciones as any[];

  function exportarCSV() {
    const headers = ["Fecha/hora", "Zona", "Municipio", "Gerente", "Consultor (Zoho)", "Lead #", "Lead ID", "Vía", "Zoho", "Origen"];
    const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = asig.map((a) => [
      new Date(a.fecha).toLocaleString("es-PR"),
      a.zona, a.municipio ?? "", a.gerente, a.consultor ?? "",
      a.leadRef ?? "", a.leadId ?? "", a.via ?? "", zohoBadge(a.zoho).txt, a.origen,
    ].map(esc).join(","));
    // BOM para que Excel respete los acentos (UTF-8).
    const csv = "﻿" + [headers.map(esc).join(","), ...rows].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `distribuidor-historial-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle sub="Bitácora de asignaciones de esta sesión (reemplaza la hoja de registro del Excel).">
          Historial de Asignaciones
        </SectionTitle>
        {asig.length > 0 && (
          <button
            onClick={exportarCSV}
            className="flex items-center gap-1.5 rounded-lg bg-wh-orange px-3 py-1.5 text-xs font-bold text-white shadow-orange transition hover:brightness-105"
          >
            <Download className="h-3.5 w-3.5" /> Exportar a Excel (CSV)
          </button>
        )}
      </div>

      {asig.length === 0 ? (
        <div className="exec-card p-8 text-center text-[var(--color-muted)]">
          Aún no hay asignaciones en esta sesión. Ve a{" "}
          <span className="text-wh-orange">Asignar Lead</span> o reparte la cola en{" "}
          <span className="text-wh-orange">Citas Coordinadas</span> para empezar.
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
                <th className="px-3 py-2">Consultor (Zoho)</th>
                <th className="px-3 py-2">Lead</th>
                <th className="px-3 py-2">Zoho</th>
                <th className="px-3 py-2">Origen</th>
              </tr>
            </thead>
            <tbody>
              {asig.map((a) => {
                const zb = zohoBadge(a.zoho);
                return (
                  <tr key={a.id} className="border-t border-[var(--color-line)] hover:bg-[var(--color-subtle)]">
                    <td className="px-3 py-2 text-[var(--color-muted)]">
                      {new Date(a.fecha).toLocaleString("es-PR")}
                    </td>
                    <td className="px-3 py-2"><ZonaBadge z={a.zona} /></td>
                    <td className="px-3 py-2 text-[var(--color-ink-soft)]">{a.municipio ?? "—"}</td>
                    <td className="px-3 py-2 font-medium text-[var(--color-ink)]">{a.gerente}</td>
                    <td className="px-3 py-2 text-[var(--color-ink-soft)]">{a.consultor ?? "—"}</td>
                    <td className="px-3 py-2 font-mono text-xs text-[var(--color-muted)]">{a.leadRef ?? "—"}</td>
                    <td className="px-3 py-2">
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: zb.bg, color: zb.fg }}>
                        {zb.txt}
                      </span>
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
