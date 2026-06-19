"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, Database, ArrowRight, AlertTriangle } from "lucide-react";
import { SectionTitle, ZonaBadge, ZONA_NOMBRE } from "@/components/ui";

const VIA: Record<string, { label: string; color: string }> = {
  deal: { label: "Deal → consultor", color: "#7c3aed" },
  consultor: { label: "Consultor activo", color: "#0f9d58" },
  gerente: { label: "Gerente líder", color: "#1d429b" },
  distribuidor: { label: "Distribuidor", color: "#e07d00" },
  error: { label: "Sin zona", color: "#dc2626" },
};

const TEAM: Record<string, string> = {
  TELEMERCADEO: "#1d429b",
  VENTAS: "#0f9d58",
  VASS: "#e07d00",
};

export default function Citas() {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    fetch("/api/zoho/leads", { cache: "no-store" }).then((r) => r.json()).then(setData);
  }, []);

  if (!data) return <div className="text-[var(--color-muted)]">Cargando…</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <CalendarCheck className="h-5 w-5 text-wh-orange" />
        <SectionTitle sub="Citas coordinadas leídas de Zoho. El motor decide la asignación: respeta el Deal, el consultor activo, el gerente líder, o entra el Distribuidor.">
          Citas Coordinadas
        </SectionTitle>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1.5 rounded-full bg-[var(--color-subtle)] px-3 py-1 text-xs font-bold text-[var(--color-ink)]">
          <Database className="h-3.5 w-3.5" />
          Fuente: {data.fuente === "mock" ? "DEMO (mock)" : "Zoho"}
        </span>
        <span className="text-xs text-[var(--color-muted)]">{data.rango.filtro}</span>
      </div>

      <div className="exec-card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-subtle)] text-left text-[11px] uppercase tracking-widest text-[var(--color-muted)]">
            <tr>
              <th className="px-3 py-2">Lead</th>
              <th className="px-3 py-2">Ciudad → Zona</th>
              <th className="px-3 py-2">Team</th>
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Decisión</th>
              <th className="px-3 py-2">Asignar a</th>
            </tr>
          </thead>
          <tbody>
            {data.leads.map((l: any) => {
              const via = VIA[l.decision.via] ?? VIA.error;
              return (
                <tr key={l.ref} className="border-t border-[var(--color-line)] hover:bg-[var(--color-subtle)]">
                  <td className="px-3 py-2 font-mono text-xs text-[var(--color-ink)]">{l.ref}</td>
                  <td className="px-3 py-2">
                    <span className="text-[var(--color-ink)]">{l.ciudad}</span>
                    {l.decision.zona && (
                      <>
                        <ArrowRight className="mx-1 inline h-3 w-3 text-[var(--color-muted)]" />
                        <ZonaBadge z={l.decision.zona} />
                      </>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: `${TEAM[l.teamAssistance] ?? "#6d6e71"}1f`, color: TEAM[l.teamAssistance] ?? "#6d6e71" }}>
                      {l.teamAssistance}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${l.decision.esHoy ? "bg-red-500/12 text-red-600 ring-1 ring-red-500/30" : "bg-[var(--color-track)] text-[var(--color-muted)]"}`}>
                      {l.decision.esHoy ? "HOY" : "futura"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: `${via.color}1f`, color: via.color }}>
                      {via.label}
                    </span>
                    <div className="mt-0.5 text-[11px] text-[var(--color-muted)]">{l.decision.detalle}</div>
                  </td>
                  <td className="px-3 py-2 font-semibold text-[var(--color-ink)]">
                    {l.decision.gerente ?? (
                      <span className="flex items-center gap-1 text-red-500"><AlertTriangle className="h-3 w-3" /> revisar</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[var(--color-muted)]">
        Demo con datos de ejemplo. Al conectar Zoho (solo-lectura, vía Andrés), esta tabla se llena con las citas
        reales y un agente N8N notificará a Miguel para aprobar/rechazar antes de registrar.
      </p>
    </div>
  );
}
