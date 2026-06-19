import { NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/store";
import { rankZonaHoy, proximoGerenteHoy, zonaDeMunicipio, fechaHoy } from "@/lib/engine";
import type { HoyAsignacion, ZonaCodigo } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = readDB();
  const hoy = new Date();
  const dia = fechaHoy(hoy);

  const ranking: Record<string, ReturnType<typeof rankZonaHoy>> = {};
  for (const z of db.zonas) ranking[z.codigo] = rankZonaHoy(db, z.codigo as ZonaCodigo, hoy);

  const hoyToday = db.hoy
    .filter((a) => a.fecha.slice(0, 10) === dia)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  return NextResponse.json({
    zonas: db.zonas,
    municipios: db.municipios,
    ranking,
    hoyToday,
    stats: {
      asignadasHoy: hoyToday.length,
      pendientes: hoyToday.filter((a) => a.estado === "pendiente").length,
      contestadas: hoyToday.filter((a) => a.estado === "contestado").length,
      noContestadas: hoyToday.filter((a) => a.estado === "no_contestado").length,
    },
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const db = readDB();
  const hoy = new Date();

  let zona: ZonaCodigo | null = body.zona ?? null;
  const municipio: string | null = body.municipio ?? null;
  if (!zona && municipio) zona = zonaDeMunicipio(db, municipio);
  if (!zona) return NextResponse.json({ error: "Zona no resuelta." }, { status: 400 });

  let gerente: string | null = body.gerente ?? null;
  let origen: "auto" | "manual" = body.gerente ? "manual" : "auto";
  if (!gerente) {
    const next = proximoGerenteHoy(db, zona, hoy);
    if (!next) return NextResponse.json({ error: `No hay gerentes elegibles en ${zona}.` }, { status: 409 });
    gerente = next.gerente.nombre;
    origen = "auto";
  }

  const a: HoyAsignacion = {
    id: `${Date.now()}-${Math.round(Math.random() * 1e6)}`,
    fecha: hoy.toISOString(),
    zona,
    municipio,
    gerente,
    leadRef: body.leadRef ?? null,
    estado: "pendiente",
    origen,
  };
  db.hoy.unshift(a);
  writeDB(db);
  return NextResponse.json({ ok: true, asignacion: a, ranking: rankZonaHoy(db, zona, hoy) });
}

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => ({}));
  const db = readDB();
  const a = db.hoy.find((x) => x.id === body.id);
  if (!a) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (["pendiente", "contestado", "no_contestado"].includes(body.estado)) a.estado = body.estado;
  writeDB(db);
  return NextResponse.json({ ok: true, asignacion: a });
}
