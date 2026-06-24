"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarCheck, RefreshCw, ExternalLink, Filter, Check, X, UserCog, Send } from "lucide-react";
import { SectionTitle } from "@/components/ui";

const ZOHO_LEADS_URL = "https://crm.zoho.com/crm/org699641359/tab/Leads";
const zohoLeadUrl = (id: string) => `https://crm.zoho.com/crm/org699641359/tab/Leads/${id}`;
const POLL_MS = 60_000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Parsea "2026-06-22T17:00:00-05:00" sin que el navegador cambie la zona horaria.
function fmtFecha(iso?: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso || "");
  if (!m) return { date: "", time: "", key: "—" };
  const [, y, mo, d, hh, mm] = m;
  let h = +hh; const ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12;
  const date = `${MONTHS[+mo - 1]} ${+d}, ${y}`;
  return { date, time: `${h.toString().padStart(2, "0")}:${mm} ${ap}`, key: date };
}

type Rep = { id: string; name: string };
const dash = (v?: string) => (v && v.trim() ? v : "-");

export default function Citas() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [updated, setUpdated] = useState<Date | null>(null);
  const [reps, setReps] = useState<Rep[]>([]);
  const [editRow, setEditRow] = useState<string | null>(null);
  const [pick, setPick] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [ownerFilter, setOwnerFilter] = useState("todos");
  const [distRow, setDistRow] = useState<string | null>(null); // fila en confirmación de "Distribuir"
  const [distSaving, setDistSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/zoho/leads", { cache: "no-store" });
      setData(await r.json());
      setUpdated(new Date());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const iv = setInterval(load, POLL_MS);
    const onVis = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(iv); document.removeEventListener("visibilitychange", onVis); };
  }, [load]);
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

  // Fase B: aplica la rotación del Excel y escribe la asignación en Zoho (confirmado por el usuario).
  async function distribuir(lead: any) {
    setDistSaving(true); setMsg(null);
    try {
      const r = await fetch("/api/distribuir", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: lead.id, leadRef: lead.ref, ciudad: lead.ciudad,
          fechaCita: lead.fechaHora || lead.fechaCita,
          teamAssistance: lead.teamAssistance, leadSource: lead.leadSource,
        }),
      });
      const j = await r.json();
      if (j.ok) {
        const dest = j.consultor || j.gerente;
        const how = j.zoho === "sales_rep" ? "asignado en Zoho ✓"
          : j.zoho === "nota" ? "nota dejada (revisar manual)"
          : j.zoho === "demo" ? "DEMO · NO se escribió en Zoho"
          : "registrado";
        setMsg(`${j.modo === "demo" ? "Se asignaría" : "Distribuido"} a ${dest} · ${how}`);
        setDistRow(null); load();
      } else setMsg(j.error || "No se pudo distribuir.");
    } catch (e) { setMsg(String((e as Error).message)); }
    finally { setDistSaving(false); }
  }

  if (!data) return <div className="text-[var(--color-muted)]">Cargando…</div>;

  const escribe = data.escribe === true; // false = modo demo (no escribe en Zoho)
  const allLeads: any[] = data.leads || [];
  const owners = Array.from(new Set(allLeads.map((l) => l.qualityOwner || "").filter(Boolean))).sort() as string[];
  const leads = allLeads.filter((l) =>
    ownerFilter === "todos" ? true : ownerFilter === "__sin__" ? !l.qualityOwner : l.qualityOwner === ownerFilter
  );

  // agrupar por fecha (como el reporte de Zoho)
  const groups: { key: string; rows: any[] }[] = [];
  for (const l of leads) {
    const k = fmtFecha(l.fechaHora || l.fechaCita).key;
    let g = groups.find((x) => x.key === k);
    if (!g) { g = { key: k, rows: [] }; groups.push(g); }
    g.rows.push(l);
  }

  const COLS = ["Cita Date/Time", "Lead #", "Lead Name", "Lead Source", "Dirección", "City", "Lead Status", "Sales Rep", "Post-Cita Status", "Lead Owner", "Team Assistance - Viejo", "Quality Stage", "¿Cita se dió?", "Distribuidor"];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CalendarCheck className="h-5 w-5 text-wh-orange" />
        <SectionTitle sub="Misma vista que el reporte de Calidad en Zoho (cola On Hold Quality). El Distribuidor sugiere a quién asignar y permite reasignar el consultor.">
          Citas Coordinadas
        </SectionTitle>
      </div>

      {/* Banner del interruptor de escritura (demo vs real) */}
      {real && (
        <div
          className="flex items-start gap-2 rounded-lg border px-3 py-2 text-[12px]"
          style={
            escribe
              ? { borderColor: "rgba(15,157,88,0.35)", background: "rgba(15,157,88,0.08)", color: "#0f7a46" }
              : { borderColor: "rgba(245,166,35,0.45)", background: "rgba(245,166,35,0.1)", color: "#9a6a04" }
          }
        >
          <span className="font-bold">{escribe ? "✍️ Escritura ACTIVA" : "🔒 Modo DEMO"}</span>
          <span>
            {escribe
              ? "Confirmar “Distribuir” cambia el Sales_Rep del lead en Zoho real."
              : "“Distribuir” muestra a quién le tocaría según la lógica y lo registra en el Historial, pero NO escribe en Zoho. Para activar la escritura real: poner DISTRIBUIDOR_ESCRIBE=1 en Vercel."}
          </span>
        </div>
      )}

      {/* barra estilo reporte */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1.5 text-sm font-bold text-[var(--color-ink)]">
          <Filter className="h-4 w-4 text-[var(--color-muted)]" /> Total Records: {leads.length}
        </span>
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
        <span className="rounded-full bg-[var(--color-subtle)] px-2.5 py-0.5 text-[11px] font-bold" style={{ color: real ? "#0f9d58" : "#6d6e71" }}>
          {real ? "Zoho en vivo" : "DEMO"}
        </span>
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

      {msg && <p className="text-xs font-semibold text-wh-blue">{msg}</p>}
      <datalist id="reps-list">{reps.map((r) => <option key={r.id} value={r.name} />)}</datalist>

      {/* tabla estilo reporte Zoho */}
      <div className="exec-card overflow-x-auto p-0">
        <table className="w-max min-w-full border-collapse text-[12px]">
          <thead>
            <tr className="border-b border-[var(--color-line)] bg-[var(--color-subtle)] text-left text-[10px] font-bold uppercase tracking-wide text-[var(--color-muted)]">
              {COLS.map((c) => (
                <th key={c} className="whitespace-nowrap border-r border-[var(--color-line)] px-3 py-2.5 last:border-r-0">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <GroupRows
                key={g.key}
                g={g}
                colspan={COLS.length}
                real={real}
                editRow={editRow}
                pick={pick}
                saving={saving}
                setEditRow={setEditRow}
                setPick={setPick}
                setMsg={setMsg}
                guardar={guardar}
                distRow={distRow}
                distSaving={distSaving}
                setDistRow={setDistRow}
                distribuir={distribuir}
              />
            ))}
            {leads.length === 0 && (
              <tr><td colSpan={COLS.length} className="px-3 py-8 text-center text-[var(--color-muted)]">No hay citas en esta vista.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-[var(--color-muted)]">
        Réplica del reporte de Calidad de Zoho (filtro On Hold Quality). La columna <b>Distribuidor</b> es lo que aporta esta app: sugiere a quién asignar según la rotación del Excel y permite reasignar el consultor (escribe en Zoho).
      </p>
    </div>
  );
}

function GroupRows({ g, colspan, real, editRow, pick, saving, setEditRow, setPick, setMsg, guardar, distRow, distSaving, setDistRow, distribuir }: any) {
  return (
    <>
      <tr className="border-b border-[var(--color-line)] bg-[var(--color-track)]/60">
        <td colSpan={colspan} className="px-3 py-1.5 text-[11px] font-bold text-[var(--color-ink)]">
          {g.key} <span className="text-[var(--color-muted)]">({g.rows.length})</span>
        </td>
      </tr>
      {g.rows.map((l: any) => {
        const f = fmtFecha(l.fechaHora || l.fechaCita);
        const rowId = l.id || l.ref;
        const editing = editRow === rowId;
        const confirming = distRow === rowId;
        const puedeDistribuir = l.decision?.via === "distribuidor" && l.decision?.gerente;
        const td = "border-r border-[var(--color-line)] px-3 py-2 align-top whitespace-nowrap last:border-r-0";
        const wrap = "border-r border-[var(--color-line)] px-3 py-2 align-top whitespace-normal last:border-r-0";
        return (
          <tr key={l.ref} className="border-b border-[var(--color-line)] hover:bg-[var(--color-subtle)]">
            <td className={`${td} whitespace-nowrap`}>{f.date}<div className="text-[var(--color-muted)]">{f.time}</div></td>
            <td className={`${td} font-mono text-[11px]`}>{l.ref}</td>
            <td className={`${wrap} max-w-[150px]`}>
              {l.id ? <a href={zohoLeadUrl(l.id)} target="_blank" rel="noreferrer" className="font-semibold text-wh-blue hover:underline">{dash(l.nombre)}</a> : dash(l.nombre)}
            </td>
            <td className={td}>{dash(l.leadSource)}</td>
            <td className={`${wrap} max-w-[170px]`}>{dash(l.direccion)}</td>
            <td className={td}>{dash(l.ciudad)}</td>
            <td className={`${td} whitespace-nowrap`}>{dash(l.estadoZoho || "Cita Coordinada")}</td>
            <td className={td}><span className="font-semibold text-wh-blue">{dash(l.salesRepName)}</span></td>
            <td className={td}>{dash(l.postCita)}</td>
            <td className={td}>{dash(l.ownerName)}</td>
            <td className={td}>{dash(l.teamViejo)}</td>
            <td className={td}>
              {l.qualityStage ? <span className="whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: "#ece7f6", color: "#6b4fb0" }}>{l.qualityStage}</span> : "-"}
            </td>
            <td className={`${wrap} max-w-[150px]`}>{dash(l.citaSeDio)}</td>
            <td className={`${td} whitespace-nowrap`}>
              {editing ? (
                <div className="flex items-center gap-1">
                  <input list="reps-list" value={pick} onChange={(e) => setPick(e.target.value)} placeholder="Consultor…" className="w-36 rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-1 text-[11px] outline-none focus:border-wh-orange" />
                  <button onClick={() => guardar(l.id || l.ref)} disabled={saving} className="grid h-6 w-6 place-items-center rounded bg-wh-orange text-white disabled:opacity-50"><Check className="h-3 w-3" /></button>
                  <button onClick={() => { setEditRow(null); setPick(""); }} className="grid h-6 w-6 place-items-center rounded border border-[var(--color-line)] text-[var(--color-muted)]"><X className="h-3 w-3" /></button>
                </div>
              ) : confirming ? (
                <div className="flex items-center gap-1">
                  <span className="whitespace-nowrap text-[11px]">Asignar a <b className="text-[var(--color-ink)]">{l.decision?.gerente}</b>?</span>
                  <button onClick={() => distribuir(l)} disabled={distSaving} title="Confirmar asignación" className="grid h-6 w-6 place-items-center rounded text-white disabled:opacity-50" style={{ background: "#0f9d58" }}><Check className="h-3 w-3" /></button>
                  <button onClick={() => setDistRow(null)} title="Cancelar" className="grid h-6 w-6 place-items-center rounded border border-[var(--color-line)] text-[var(--color-muted)]"><X className="h-3 w-3" /></button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {puedeDistribuir ? (
                    <button onClick={() => { setDistRow(rowId); setMsg(null); }} disabled={!real} title={`Distribuir según la rotación del Excel · ${l.decision?.detalle}`} className="flex items-center gap-1 rounded-md bg-wh-orange px-2 py-0.5 text-[10px] font-bold text-white shadow-orange transition hover:brightness-105 disabled:opacity-40">
                      <Send className="h-3 w-3" /> Distribuir → {l.decision.gerente}
                    </button>
                  ) : l.decision?.via === "error" ? (
                    <span className="text-[11px] font-semibold" style={{ color: "#c0392b" }} title={l.decision?.detalle}>{l.decision?.detalle || "Sin zona"}</span>
                  ) : l.decision?.gerente ? (
                    <span className="text-[11px]"><span className="text-[var(--color-muted)]">→</span> <b className="text-[var(--color-ink)]">{l.decision.gerente}</b></span>
                  ) : null}
                  <button onClick={() => { setEditRow(rowId); setPick(""); setMsg(null); }} disabled={!real} title="Reasignar consultor" className="flex items-center gap-1 rounded-md border border-[var(--color-line)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--color-muted)] transition hover:text-wh-blue disabled:opacity-40">
                    <UserCog className="h-3 w-3" /> Reasignar
                  </button>
                </div>
              )}
            </td>
          </tr>
        );
      })}
    </>
  );
}
