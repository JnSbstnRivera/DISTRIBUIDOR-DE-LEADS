import { NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/store";
import { proximoGerente, zonaDeMunicipio, rankZona } from "@/lib/engine";
import type { Asignacion, ZonaCodigo } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const db = readDB();
  const hoy = new Date();

  let zona: ZonaCodigo | null = body.zona ?? null;
  const municipio: string | null = body.municipio ?? null;

  if (!zona && municipio) zona = zonaDeMunicipio(db, municipio);
  if (!zona) {
    return NextResponse.json(
      { error: "Zona no resuelta. Indica zona o un municipio válido." },
      { status: 400 }
    );
  }

  // Asignación manual a un gerente específico, o automática (rank 1)
  let gerenteNombre: string | null = body.gerente ?? null;
  let origen: "auto" | "manual" = body.gerente ? "manual" : "auto";

  if (!gerenteNombre) {
    const next = proximoGerente(db, zona, hoy);
    if (!next) {
      return NextResponse.json(
        { error: `No hay gerentes elegibles en ${zona}.` },
        { status: 409 }
      );
    }
    gerenteNombre = next.gerente.nombre;
    origen = "auto";
  }

  const asignacion: Asignacion = {
    id: `${Date.now()}-${Math.round(Math.random() * 1e6)}`,
    fecha: hoy.toISOString(),
    zona,
    municipio,
    gerente: gerenteNombre,
    leadRef: body.leadRef ?? null,
    origen,
  };
  db.asignaciones.unshift(asignacion);
  writeDB(db);

  return NextResponse.json({
    ok: true,
    asignacion,
    rankingActualizado: rankZona(db, zona, hoy),
  });
}
