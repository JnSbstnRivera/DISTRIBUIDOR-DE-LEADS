"use client";

import { useEffect, useState } from "react";
import { SectionTitle } from "@/components/ui";

function activa(fin: string | null): boolean {
  if (!fin) return true;
  const d = new Date(fin);
  return !isNaN(d.getTime()) && d >= new Date();
}

function Tabla({ titulo, filas }: { titulo: string; filas: any[] }) {
  return (
    <div className="exec-card p-5">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-wh-orange">
        {titulo} <span className="text-[var(--color-muted)]">({filas.length})</span>
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-[11px] uppercase tracking-widest text-[var(--color-muted)]">
            <tr>
              <th className="px-2 py-1.5">Nombre</th>
              <th className="px-2 py-1.5">Inicio</th>
              <th className="px-2 py-1.5">Fin</th>
              <th className="px-2 py-1.5">Estado</th>
              <th className="px-2 py-1.5">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f, i) => {
              const act = activa(f.fin);
              return (
                <tr key={i} className="border-t border-[var(--color-line)]">
                  <td className="px-2 py-1.5 font-medium text-[var(--color-ink)]">{f.nombre}</td>
                  <td className="px-2 py-1.5 text-[var(--color-muted)]">{f.inicio ?? "—"}</td>
                  <td className="px-2 py-1.5 text-[var(--color-muted)]">{f.fin ?? "—"}</td>
                  <td className="px-2 py-1.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        act
                          ? "bg-red-500/10 text-red-600 ring-1 ring-red-500/30"
                          : "bg-green-500/10 text-green-600 ring-1 ring-green-500/30"
                      }`}
                    >
                      {act ? "ACTIVA" : "vencida"}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-xs text-[var(--color-muted)]">{f.detalle}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Blacklist() {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    fetch("/api/state", { cache: "no-store" })
      .then((r) => r.json())
      .then(setData);
  }, []);
  if (!data) return <div className="text-[var(--color-muted)]">Cargando…</div>;

  return (
    <div>
      <SectionTitle sub="Exclusión de leads. Reglas: 1ª falta 30 días · 2ª falta 3 meses · 3ª permanente. Las vencidas reactivan al gerente automáticamente.">
        Black List
      </SectionTitle>
      <div className="grid gap-6 lg:grid-cols-2">
        <Tabla titulo="Vendedores / Gerentes" filas={data.blacklist.vendedores} />
        <Tabla titulo="Consultores" filas={data.blacklist.consultores} />
      </div>
    </div>
  );
}
