"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarCheck, Database, ArrowRight, AlertTriangle, RefreshCw, UserCog, Check, X, ExternalLink } from "lucide-react";
import { SectionTitle, ZonaBadge } from "@/components/ui";

const ZOHO_LEADS_URL = "https://crm.zoho.com/crm/org699641359/tab/Leads";
const zohoLeadUrl = (id: string) => `https://crm.zoho.com/crm/org699641359/tab/Leads/${id}`;

const VIA: Record<string, { label: string; color: string }> = {
  deal: { label: "Deal → consultor", color: "#7c3aed" },
  consultor: { label: "Consultor activo", color: "#0f9d58" },
  gerente: { label: "Gerente líder", color: "#1d429b" },
  distribuidor: { label: "Distribuidor", color: "#e07d00" },
  error: { label: "Sin zona", color: "#dc2626" },
};
const TEAM: Record<string, string> = { TELEMERCADEO: "#1d429b", VENTAS: "#0f9d58", VASS: "#e07d00" };
const POLL_MS = 60_000;

type Rep = { id: string; name: string };

export default function Citas() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [updated, setUpdated] = useState<Date | null>(null);
  const [reps, setReps] = useState<Rep[]>([]);
  const [editRow, setEditRow] = useState<string | null>(null);
  const [pick, setPick] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [ownerFilter, setOwnerFilter] = useState("todos"); // filtro por Quality Owner (analista)

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/zoho/leads", { cache: "no-store" });
      setData(await r.json());
      setUpdated(new Date());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  // auto-refresh por polling + al volver a la pestaña
  useEffect(() => {
    const iv = setInterval(load, POLL_MS);
    const onVis = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(iv); document.removeEventListener("visibilitychange", onVis); };
  }, [load]);
  // catálogo de consultores (para reasignar)
  useEffect(() => {
    fetch("/api/zoho/sales_team", { cache: "no-store" }).then((r) => r.json()).then((j) => setReps(j.reps || [])).catch(() => {});
  }, []);

  const real = data?.fuente === "zoho";

  async function guardar(leadId: string) {
    const rep = reps.find((x) => x.name === pick);
    if (!rep) { setMsg("Elige un consultor de la lista."); return; }
    setSaving(true); setMsg(null);
    try {
      const r = await fetch("/api/zoho/assign", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, salesRepId: rep.id, salesRepName: rep.name, nota: "Reasignación de consultor desde el Distribuidor (Calidad)." }),
      });
      const j = await r.json();
      if (j.ok) { setMsg("Consultor actualizado en Zoho ✓"); setEditRow(null); setPick(""); load(); }
      else setMsg(j.error || "No se pudo actualizar.");
    } catch (e) { setMsg(String((e as Error).message)); }
    finally { setSaving(false); }
  }

  if (!data) return <div className="text-[var(--color-muted)]">Cargando…</div>;

  const allLeads: any[] = data.leads || [];
  const owners = Array.from(new Set(allLeads.map((l) => l.qualityOwner || "").filter(Boolean))).sort() as string[];
  const leads = allLeads.filter((l) =>
    ownerFilter === "todos" ? true : ownerFilter === "__sin__" ? !l.qualityOwner : l.qualityOwner === ownerFilter
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <CalendarCheck className="h-5 w-5 text-wh-orange" />
        <SectionTitle sub="Citas coordinadas leídas de Zoho. El motor decide la asignación; Calidad puede reasignar el consultor (Sales Rep) directamente.">
          Citas Coordinadas
        </SectionTitle>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1.5 rounded-full bg-[var(--color-subtle)] px-3 py-1 text-xs font-bold text-[var(--color-ink)]">
          <Database className="h-3.5 w-3.5" />
          Fuente: {real ? "Zoho (en vivo)" : "DEMO (mock)"}
        </span>
        <span className="text-xs text-[var(--color-muted)]">{data.rango?.filtro}</span>
        {/* filtro por analista de Calidad (Quality Owner) — replica el reporte de cada uno */}
        <select
          value={ownerFilter}
          onChange={(e) => setOwnerFilter(e.target.value)}
          className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-1 text-xs font-semibold text-[var(--color-ink)] outline-none focus:border-wh-orange"
        >
          <option value="todos">Todas ({allLeads.length})</option>
          <option value="__sin__">Sin dueño · cola ({allLeads.filter((l) => !l.qualityOwner).length})</option>
          {owners.map((o) => (
            <option key={o} value={o}>{o} ({allLeads.filter((l) => l.qualityOwner === o).length})</option>
          ))}
        </select>
        {updated && <span className="text-[11px] text-[var(--color-muted)]">Actualizado {updated.toLocaleTimeString()}</span>}
        <div className="ml-auto flex items-center gap-2">
          <a href={ZOHO_LEADS_URL} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-lg border border-[var(--color-line)] px-3 py-1.5 text-xs font-bold text-[var(--color-muted)] transition hover:border-wh-blue hover:text-wh-blue">
            <ExternalLink className="h-3.5 w-3.5" /> Abrir Zoho
          </a>
          <button onClick={load} disabled={loading} className="flex items-center gap-1.5 rounded-lg bg-wh-orange px-3 py-1.5 text-xs font-bold text-white shadow-orange transition hover:brightness-105 disabled:opacity-60">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Actualizar
          </button>
        </div>
      </div>

      {!real && <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-[11px] text-amber-700 ring-1 ring-amber-500/30">Modo demo: al cargar credenciales de Zoho (env) esto pasa a vivo y la reasignación escribe en Zoho. Auto-refresh cada {POLL_MS / 1000}s.</p>}
      {msg && <p className="text-xs font-semibold text-wh-blue">{msg}</p>}

      <datalist id="reps-list">{reps.map((r) => <option key={r.id} value={r.name} />)}</datalist>

      <div className="exec-card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-subtle)] text-left text-[11px] uppercase tracking-widest text-[var(--color-muted)]">
            <tr>
              <th className="px-3 py-2">Lead</th><th className="px-3 py-2">Ciudad → Zona</th><th className="px-3 py-2">Team</th>
              <th className="px-3 py-2">Fecha</th><th className="px-3 py-2">Decisión</th><th className="px-3 py-2">Asignar a</th><th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l: any) => {
              const via = VIA[l.decision.via] ?? VIA.error;
              const editing = editRow === (l.id || l.ref);
              return (
                <tr key={l.ref} className="border-t border-[var(--color-line)] hover:bg-[var(--color-subtle)]">
                  <td className="px-3 py-2 font-mono text-xs text-[var(--color-ink)]">{l.ref}</td>
                  <td className="px-3 py-2">
                    <span className="text-[var(--color-ink)]">{l.ciudad}</span>
                    {l.decision.zona && (<><ArrowRight className="mx-1 inline h-3 w-3 text-[var(--color-muted)]" /><ZonaBadge z={l.decision.zona} /></>)}
                  </td>
                  <td className="px-3 py-2"><span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: `${TEAM[l.teamAssistance] ?? "#6d6e71"}1f`, color: TEAM[l.teamAssistance] ?? "#6d6e71" }}>{l.teamAssistance}</span></td>
                  <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${l.decision.esHoy ? "bg-red-500/12 text-red-600 ring-1 ring-red-500/30" : "bg-[var(--color-track)] text-[var(--color-muted)]"}`}>{l.decision.esHoy ? "HOY" : "futura"}</span></td>
                  <td className="px-3 py-2">
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: `${via.color}1f`, color: via.color }}>{via.label}</span>
                    <div className="mt-0.5 text-[11px] text-[var(--color-muted)]">{l.decision.detalle}</div>
                  </td>
                  <td className="px-3 py-2 font-semibold text-[var(--color-ink)]">
                    {editing ? (
                      <div className="flex items-center gap-1">
                        <input list="reps-list" value={pick} onChange={(e) => setPick(e.target.value)} placeholder="Buscar consultor…" className="w-44 rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-1 text-xs outline-none focus:border-wh-orange" />
                        <button onClick={() => guardar(l.id || l.ref)} disabled={saving} className="grid h-7 w-7 place-items-center rounded-md bg-wh-orange text-white disabled:opacity-50"><Check className="h-3.5 w-3.5" /></button>
                        <button onClick={() => { setEditRow(null); setPick(""); }} className="grid h-7 w-7 place-items-center rounded-md border border-[var(--color-line)] text-[var(--color-muted)]"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    ) : (
                      l.decision.gerente ?? <span className="flex items-center gap-1 text-red-500"><AlertTriangle className="h-3 w-3" /> revisar</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {!editing && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setEditRow(l.id || l.ref); setPick(""); setMsg(null); }} title="Reasignar consultor (Sales Rep)" disabled={!real} className="flex items-center gap-1 rounded-md border border-[var(--color-line)] px-2 py-1 text-[11px] font-bold text-[var(--color-muted)] transition hover:text-wh-blue disabled:opacity-40" >
                          <UserCog className="h-3.5 w-3.5" /> Reasignar
                        </button>
                        {l.id && (
                          <a href={zohoLeadUrl(l.id)} target="_blank" rel="noreferrer" title="Abrir este lead en Zoho" className="grid h-7 w-7 place-items-center rounded-md border border-[var(--color-line)] text-[var(--color-muted)] transition hover:border-wh-blue hover:text-wh-blue">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[var(--color-muted)]">
        Se actualiza solo cada {POLL_MS / 1000}s y al volver a la pestaña. En vivo (Zoho), <b>Reasignar</b> cambia el <code>Sales_Rep</code> y deja nota firmada por el BOT DISTRIBUIDOR. La automatización (N8N + aprobación de Miguel) llega después.
      </p>
    </div>
  );
}
