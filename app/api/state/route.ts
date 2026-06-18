import { NextResponse } from "next/server";
import { readDB } from "@/lib/store";
import { rankZona, blacklistActiva } from "@/lib/engine";
import type { ZonaCodigo } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = readDB();
  const hoy = new Date();

  const ranking: Record<string, ReturnType<typeof rankZona>> = {};
  for (const z of db.zonas) ranking[z.codigo] = rankZona(db, z.codigo as ZonaCodigo, hoy);

  const blActivos = db.gerentes.filter(
    (g) => g.blacklist || blacklistActiva(db, g.nombre, hoy)
  ).length;

  const porZona = db.zonas.map((z) => {
    const asignadas = db.asignaciones.filter((a) => a.zona === z.codigo).length;
    const rk = ranking[z.codigo].filter((c) => c.elegible);
    const cargas = rk.map((c) => c.cargaEfectiva).filter((n) => Number.isFinite(n));
    const histZona = db.gerentes.reduce(
      (s, g) => s + (g.zonas[z.codigo as ZonaCodigo]?.historico ?? 0),
      0
    );
    return {
      ...z,
      asignadasSesion: asignadas,
      gerentesActivos: rk.length,
      cargaPromedio: cargas.length ? Math.round(cargas.reduce((a, b) => a + b, 0) / cargas.length) : 0,
      cargaMin: cargas.length ? Math.min(...cargas) : 0,
      cargaMax: cargas.length ? Math.max(...cargas) : 0,
      historicoZona: histZona,
    };
  });

  // Asignaciones de la sesión agrupadas por día
  const porDiaMap: Record<string, number> = {};
  for (const a of db.asignaciones) {
    const d = a.fecha.slice(0, 10);
    porDiaMap[d] = (porDiaMap[d] ?? 0) + 1;
  }
  const asignacionesPorDia = Object.entries(porDiaMap)
    .map(([fecha, n]) => ({ fecha, n }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  // Blacklist: activos vs vencidos
  const blEntries = [...db.blacklist.consultores, ...db.blacklist.vendedores];
  const blActiva = blEntries.filter((e) => !e.fin || new Date(e.fin) >= hoy).length;
  const blVencida = blEntries.length - blActiva;

  return NextResponse.json({
    zonas: db.zonas,
    gerentes: db.gerentes,
    blacklist: db.blacklist,
    asignaciones: db.asignaciones,
    municipios: db.municipios,
    ranking,
    stats: {
      totalGerentes: db.gerentes.length,
      gerentesConZona: db.gerentes.filter((g) => Object.keys(g.zonas).length).length,
      blacklistActivos: blActivos,
      asignacionesSesion: db.asignaciones.length,
      tier2: db.gerentes.filter((g) => g.tier2).length,
    },
    porZona,
    charts: {
      asignacionesPorDia,
      blacklist: { activa: blActiva, vencida: blVencida },
    },
  });
}
