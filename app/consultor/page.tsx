"use client";

/* ────────────────────────────────────────────────────────────────────────
   MOCKUP — Vista Consultor (demo con datos de ejemplo, sin auth real todavía)
   Panel personal del gerente/consultor: foto + estado, KPIs, gráfica mensual
   de ventas, sus leads, su lugar en la fila y —si aplica— por qué está en
   Black List. Toggle arriba a la derecha para alternar Activo / Black List.

   📸 FOTO: con el SSO de Microsoft Entra (como en los otros proyectos) el avatar
   se reemplaza por la foto real del usuario — `session.user.image` (Microsoft
   Graph /me/photo). Ver el bloque <Avatar/> abajo.
   ──────────────────────────────────────────────────────────────────────── */

import { useState } from "react";
import {
  ShieldCheck, ShieldAlert, CalendarClock, MapPin, TrendingUp, Info, LogOut,
  DollarSign, Target, ClipboardList,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, Legend,
} from "recharts";

// ── Paleta Windmar (fija para el SVG de los gráficos) ──
const ORANGE = "#f89b24", BLUE = "#1d429b", GREEN = "#0f9d58", GRID = "#d5dcec";

// ── Datos de ejemplo (mock) ──
const CONSULTOR = { nombre: "Juan Pérez", zona: "San Juan 1", tier: 2, fotoUrl: null as string | null };

const KPIS = { ventasMes: 4, montoMes: "$118,400", leadsMes: 21, cierre: "19%" };

const VENTAS_MES = [
  { mes: "Ene", ventas: 3 }, { mes: "Feb", ventas: 5 }, { mes: "Mar", ventas: 4 },
  { mes: "Abr", ventas: 6 }, { mes: "May", ventas: 5 }, { mes: "Jun", ventas: 7 },
  { mes: "Jul", ventas: 4 },
];

const LEADS_VS_CIERRE = [
  { mes: "Ene", asignados: 18, cerrados: 3 }, { mes: "Feb", asignados: 22, cerrados: 5 },
  { mes: "Mar", asignados: 20, cerrados: 4 }, { mes: "Abr", asignados: 25, cerrados: 6 },
  { mes: "May", asignados: 23, cerrados: 5 }, { mes: "Jun", asignados: 26, cerrados: 7 },
  { mes: "Jul", asignados: 21, cerrados: 4 },
];

const LEADS = [
  { fecha: "Hoy · 3:00 PM", cliente: "María Rodríguez", ciudad: "Bayamón", zona: "SJ1", producto: "Solar (QCells)", estado: "Confirmada" },
  { fecha: "Mañana · 10:30 AM", cliente: "Carlos Sánchez", ciudad: "Guaynabo", zona: "SJ1", producto: "Roofing", estado: "Asignada" },
  { fecha: "04 jul · 1:00 PM", cliente: "Ana Torres", ciudad: "Caguas", zona: "SJ2", producto: "Tesla Powerwall", estado: "Asignada" },
];

const FILA = [
  { zona: "SJ1", posicion: 3, total: 8, carga: 12 },
  { zona: "SJ2", posicion: 6, total: 9, carga: 9 },
];

const BLACKLIST = {
  motivo: "No asististe a la cita del 28 de junio (cliente: R. Colón, Arecibo).",
  desde: "28 jun 2026", hasta: "28 jul 2026", permanente: false, falta: "1ª falta",
};

// ── Avatar: hoy iniciales; con SSO → foto de Microsoft ──
function Avatar({ nombre, fotoUrl }: { nombre: string; fotoUrl: string | null }) {
  const iniciales = nombre.split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  if (fotoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={fotoUrl} alt={nombre} className="h-11 w-11 rounded-full object-cover" />;
  }
  return (
    <div className="grid h-11 w-11 place-items-center rounded-full text-sm font-bold text-white" style={{ background: "var(--color-wh-navy)" }}>
      {iniciales}
    </div>
  );
}

function CardShell({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="exec-card p-5">
      <h2 className="mb-3 flex items-center gap-2 text-base font-bold">{icon}{title}</h2>
      {children}
    </section>
  );
}

export default function ConsultorDemo() {
  const [estado, setEstado] = useState<"activo" | "blacklist">("activo");
  const enBL = estado === "blacklist";

  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg)", color: "var(--color-ink)" }}>
      {/* Toggle DEMO */}
      <div className="fixed right-3 top-3 z-50 flex items-center gap-2 rounded-full border px-2 py-1 text-xs font-semibold"
           style={{ background: "var(--color-surface)", borderColor: "var(--color-line)" }}>
        <span className="rounded-full bg-wh-orange px-2 py-0.5 text-white">DEMO</span>
        <button onClick={() => setEstado("activo")} className="rounded-full px-2 py-0.5"
          style={{ background: !enBL ? GREEN : "transparent", color: !enBL ? "#fff" : "var(--color-muted)" }}>Activo</button>
        <button onClick={() => setEstado("blacklist")} className="rounded-full px-2 py-0.5"
          style={{ background: enBL ? "#d64545" : "transparent", color: enBL ? "#fff" : "var(--color-muted)" }}>Black List</button>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
        {/* Header */}
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar nombre={CONSULTOR.nombre} fotoUrl={CONSULTOR.fotoUrl} />
            <div>
              <p className="text-xs font-medium" style={{ color: "var(--color-muted)" }}>Panel del consultor · {CONSULTOR.zona}</p>
              <h1 className="text-xl font-bold">Hola, {CONSULTOR.nombre}</h1>
            </div>
          </div>
          <button className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium"
            style={{ borderColor: "var(--color-line)", color: "var(--color-muted)" }}><LogOut size={15} /> Salir</button>
        </header>

        {/* Estado */}
        <section className="exec-card mb-4 overflow-hidden p-0">
          <div className="flex items-center gap-4 p-5" style={{ background: enBL ? "rgba(214,69,69,.08)" : "rgba(15,157,88,.08)" }}>
            {enBL ? <ShieldAlert size={40} style={{ color: "#d64545" }} /> : <ShieldCheck size={40} style={{ color: GREEN }} />}
            <div>
              <p className="text-lg font-bold" style={{ color: enBL ? "#d64545" : GREEN }}>{enBL ? "Estás en Black List" : "Estás activo"}</p>
              <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
                {enBL ? "No estás recibiendo leads nuevos por ahora. Mira el detalle abajo." : "Estás recibiendo leads con normalidad según la rotación por zona."}
              </p>
            </div>
            <span className="ml-auto rounded-full border px-3 py-1 text-xs font-bold"
              style={{ borderColor: "var(--color-line)", color: "var(--color-ink)" }}>{CONSULTOR.tier === 2 ? "Tier 2" : "Tier 1"}</span>
          </div>
          {CONSULTOR.tier === 2 && !enBL && (
            <p className="border-t px-5 py-2 text-xs" style={{ borderColor: "var(--color-line)", color: "var(--color-muted)" }}>
              Tier 2 recibe la mitad de los leads mientras acumulas cierres para subir a Tier 1.
            </p>
          )}
        </section>

        {/* KPIs */}
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { icon: <DollarSign size={16} />, label: "Ventas del mes", val: KPIS.ventasMes, sub: KPIS.montoMes },
            { icon: <ClipboardList size={16} />, label: "Leads este mes", val: KPIS.leadsMes, sub: "asignados" },
            { icon: <CalendarClock size={16} />, label: "Confirmadas", val: 2, sub: "citas hoy" },
            { icon: <Target size={16} />, label: "Tasa de cierre", val: KPIS.cierre, sub: "últimos 30d" },
          ].map((k, i) => (
            <div key={i} className="exec-card p-3">
              <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--color-muted)" }}>{k.icon}{k.label}</div>
              <p className="mt-1 text-2xl font-bold" style={{ color: BLUE }}>{k.val}</p>
              <p className="text-xs" style={{ color: "var(--color-muted)" }}>{k.sub}</p>
            </div>
          ))}
        </div>

        {/* Gráfica: ventas por mes */}
        <CardShell title="Mis ventas por mes" icon={<TrendingUp size={18} style={{ color: ORANGE }} />}>
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={VENTAS_MES} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "#6d6e71" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#6d6e71" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: "rgba(29,66,155,.06)" }} />
                <Bar dataKey="ventas" name="Ventas" fill={ORANGE} radius={[5, 5, 0, 0]} maxBarSize={38} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardShell>

        {/* Gráfica: leads asignados vs cerrados */}
        <div className="mt-4">
          <CardShell title="Leads asignados vs. cerrados" icon={<Target size={18} style={{ color: ORANGE }} />}>
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer>
                <LineChart data={LEADS_VS_CIERRE} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "#6d6e71" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "#6d6e71" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="asignados" name="Asignados" stroke={BLUE} strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="cerrados" name="Cerrados" stroke={GREEN} strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardShell>
        </div>

        {/* Black List explicada */}
        {enBL && (
          <section className="exec-card mt-4 p-5" style={{ borderColor: "#d64545" }}>
            <h2 className="mb-3 flex items-center gap-2 text-base font-bold" style={{ color: "#d64545" }}><Info size={18} /> Por qué estás en Black List</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex gap-2"><dt className="w-28 font-semibold" style={{ color: "var(--color-muted)" }}>Motivo</dt><dd>{BLACKLIST.motivo}</dd></div>
              <div className="flex gap-2"><dt className="w-28 font-semibold" style={{ color: "var(--color-muted)" }}>Desde</dt><dd>{BLACKLIST.desde} <span style={{ color: "var(--color-muted)" }}>({BLACKLIST.falta})</span></dd></div>
              <div className="flex gap-2"><dt className="w-28 font-semibold" style={{ color: "var(--color-muted)" }}>Se reactiva</dt>
                <dd className="font-semibold" style={{ color: BLACKLIST.permanente ? "#d64545" : GREEN }}>{BLACKLIST.permanente ? "Exclusión permanente" : `Automáticamente el ${BLACKLIST.hasta}`}</dd></div>
            </dl>
            <p className="mt-3 rounded-lg p-3 text-xs" style={{ background: "var(--color-subtle)", color: "var(--color-ink-soft)" }}>
              Al vencer el plazo vuelves a la rotación automáticamente. No asistir, reagendar sin avisar a Telemercadeo, o no
              responder en 24h son causas de exclusión (ver Criterios de Asignación).
            </p>
          </section>
        )}

        {/* Mis leads asignados */}
        <div className="mt-4">
          <CardShell title="Mis leads asignados" icon={<CalendarClock size={18} style={{ color: ORANGE }} />}>
            {enBL ? (
              <p className="py-4 text-center text-sm" style={{ color: "var(--color-muted)" }}>No tienes leads nuevos mientras estés en Black List.</p>
            ) : (
              <div className="space-y-2">
                {LEADS.map((l, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border p-3 text-sm"
                    style={{ borderColor: "var(--color-line)", background: "var(--color-subtle)" }}>
                    <span className="font-semibold" style={{ color: BLUE }}>{l.fecha}</span>
                    <span className="font-medium">{l.cliente}</span>
                    <span className="flex items-center gap-1" style={{ color: "var(--color-muted)" }}><MapPin size={13} />{l.ciudad} · {l.zona}</span>
                    <span className="rounded-full px-2 py-0.5 text-xs" style={{ background: "var(--color-track)" }}>{l.producto}</span>
                    <span className="ml-auto rounded-full px-2 py-0.5 text-xs font-bold text-white"
                      style={{ background: l.estado === "Confirmada" ? GREEN : BLUE }}>{l.estado}</span>
                  </div>
                ))}
              </div>
            )}
          </CardShell>
        </div>

        {/* Mi lugar en la fila */}
        <div className="mt-4">
          <CardShell title="Mi lugar en la fila" icon={<TrendingUp size={18} style={{ color: ORANGE }} />}>
            <p className="-mt-2 mb-3 text-xs" style={{ color: "var(--color-muted)" }}>Cuanto más abajo tu carga, antes te toca el próximo lead de esa zona.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {FILA.map((f) => (
                <div key={f.zona} className="rounded-lg border p-4" style={{ borderColor: "var(--color-line)" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">{f.zona}</span>
                    <span className="text-xs" style={{ color: "var(--color-muted)" }}>carga: {f.carga}</span>
                  </div>
                  <p className="mt-1 text-2xl font-bold" style={{ color: BLUE }}>#{f.posicion} <span className="text-sm font-normal" style={{ color: "var(--color-muted)" }}>de {f.total}</span></p>
                </div>
              ))}
            </div>
          </CardShell>
        </div>

        <p className="mt-6 text-center text-xs" style={{ color: "var(--color-muted)" }}>
          Vista de demostración · datos de ejemplo. El consultor solo ve lo suyo.
        </p>
      </div>
    </div>
  );
}
