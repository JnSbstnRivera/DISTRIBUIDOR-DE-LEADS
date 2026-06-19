import { NextResponse } from "next/server";
import { readDB } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const db = readDB();
  const url = new URL(req.url);
  const rango = db.cumplimientoRango ?? { inicio: "2026-05-18", fin: "2026-06-17" };
  const inicio = url.searchParams.get("inicio") || rango.inicio;
  const fin = url.searchParams.get("fin") || new Date().toISOString().slice(0, 10);

  const enRango = db.hoy.filter((a) => {
    if (a.estado === "pendiente") return false;
    const d = a.fecha.slice(0, 10);
    return d >= inicio && d <= fin;
  });

  // agrupar por zona -> gerente
  const porZona: Record<string, Record<string, { contestado: number; no_contestado: number }>> = {};
  for (const a of enRango) {
    const z = (porZona[a.zona] ||= {});
    const g = (z[a.gerente] ||= { contestado: 0, no_contestado: 0 });
    if (a.estado === "contestado") g.contestado++;
    else if (a.estado === "no_contestado") g.no_contestado++;
  }

  const zonas = db.zonas.map((z) => {
    const gMap = porZona[z.codigo] || {};
    const gerentes = Object.entries(gMap)
      .map(([nombre, v]) => {
        const total = v.contestado + v.no_contestado;
        return { nombre, ...v, total, pct: total ? Math.round((v.contestado / total) * 100) : 0 };
      })
      .sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre));
    const c = gerentes.reduce((s, g) => s + g.contestado, 0);
    const n = gerentes.reduce((s, g) => s + g.no_contestado, 0);
    return {
      codigo: z.codigo,
      contestado: c,
      no_contestado: n,
      total: c + n,
      pct: c + n ? Math.round((c / (c + n)) * 100) : 0,
      gerentes,
    };
  });

  const totC = zonas.reduce((s, z) => s + z.contestado, 0);
  const totN = zonas.reduce((s, z) => s + z.no_contestado, 0);

  return NextResponse.json({
    rango: { inicio, fin },
    zonas,
    totales: {
      contestado: totC,
      no_contestado: totN,
      total: totC + totN,
      pct: totC + totN ? Math.round((totC / (totC + totN)) * 100) : 0,
    },
  });
}
