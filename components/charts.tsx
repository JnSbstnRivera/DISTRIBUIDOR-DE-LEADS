"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ZONA_COLOR, ZONA_NOMBRE } from "./ui";

const tooltipStyle = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-line)",
  borderRadius: "0.6rem",
  fontSize: "12px",
  fontFamily: "var(--font-mono)",
  color: "var(--color-ink)",
  boxShadow: "var(--card-shadow)",
};
const AXIS_TICK = { fill: "var(--color-muted)", fontSize: 11 };

export function ChartBox({
  title,
  children,
  hint,
}: {
  title: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="exec-card p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="exec-label">{title}</h3>
        {hint && <span className="text-[10px] text-[var(--color-muted)]">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

/** Carga histórica de leads por zona (cómo se repartió hasta hoy). */
export function CargaPorZonaChart({ porZona }: { porZona: any[] }) {
  const data = porZona.map((z) => ({
    zona: z.codigo,
    nombre: ZONA_NOMBRE[z.codigo],
    historico: z.historicoZona,
  }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 30, left: 8, bottom: 4 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="nombre"
          width={120}
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          cursor={{ fill: "rgba(248,155,36,0.08)" }}
          formatter={(v: any) => [v, "Leads históricos"]}
        />
        <Bar dataKey="historico" radius={[0, 6, 6, 0]} barSize={20}>
          {data.map((d) => (
            <Cell key={d.zona} fill={ZONA_COLOR[d.zona]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Gerentes elegibles por zona. */
export function GerentesPorZonaChart({ porZona }: { porZona: any[] }) {
  const data = porZona.map((z) => ({
    zona: z.codigo,
    nombre: ZONA_NOMBRE[z.codigo],
    activos: z.gerentesActivos,
  }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
        <XAxis dataKey="zona" tick={AXIS_TICK} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={tooltipStyle}
          cursor={{ fill: "rgba(29,66,155,0.12)" }}
          formatter={(v: any, _n: any, p: any) => [v, p.payload.nombre]}
        />
        <Bar dataKey="activos" radius={[6, 6, 0, 0]} barSize={34}>
          {data.map((d) => (
            <Cell key={d.zona} fill={ZONA_COLOR[d.zona]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Asignaciones de la sesión a lo largo del tiempo. */
export function AsignacionesChart({ data }: { data: { fecha: string; n: number }[] }) {
  if (!data.length) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-[var(--color-muted)]">
        Sin asignaciones aún — usa “Asignar Lead”.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 4 }}>
        <defs>
          <linearGradient id="gradAsig" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f89b24" stopOpacity={0.6} />
            <stop offset="100%" stopColor="#f89b24" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <XAxis dataKey="fecha" tick={AXIS_TICK} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "#f89b24", strokeOpacity: 0.3 }} />
        <Area
          type="monotone"
          dataKey="n"
          stroke="#f89b24"
          strokeWidth={2}
          fill="url(#gradAsig)"
          dot={{ r: 3, fill: "#f89b24" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Donut de blacklist activa vs vencida. */
export function BlacklistDonut({ activa, vencida }: { activa: number; vencida: number }) {
  const data = [
    { name: "Activa", value: activa, color: "#ef4444" },
    { name: "Vencida", value: vencida, color: "#22c55e" },
  ];
  const total = activa + vencida;
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={58}
            outerRadius={82}
            paddingAngle={3}
            strokeWidth={0}
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="kpi-number text-3xl font-black text-[var(--color-ink)]">{total}</span>
        <span className="text-[10px] uppercase tracking-widest text-[var(--color-muted)]">en lista</span>
      </div>
    </div>
  );
}
