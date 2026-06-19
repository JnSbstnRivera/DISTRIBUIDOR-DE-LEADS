import { NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/store";
import { rankCanal, proximoGerenteCanal } from "@/lib/engine";
import type { CanalAsignacion } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = readDB();
  const hoy = new Date();
  const ranking: Record<string, ReturnType<typeof rankCanal>> = {};
  for (const c of db.canales) ranking[c.codigo] = rankCanal(db, c.codigo, hoy);
  const canales = db.canales.map((c) => ({
    codigo: c.codigo,
    nombre: c.nombre,
    color: c.color,
    participantes: c.gerentes.length,
    asignadasSesion: db.canalAsignaciones.filter((a) => a.canal === c.codigo).length,
  }));
  return NextResponse.json({
    canales,
    ranking,
    asignaciones: db.canalAsignaciones.slice(0, 50),
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const db = readDB();
  const codigo: string | null = body.canal ?? null;
  if (!codigo || !db.canales.find((c) => c.codigo === codigo))
    return NextResponse.json({ error: "Canal inválido." }, { status: 400 });

  let gerente: string | null = body.gerente ?? null;
  let origen: "auto" | "manual" = body.gerente ? "manual" : "auto";
  if (!gerente) {
    const next = proximoGerenteCanal(db, codigo);
    if (!next) return NextResponse.json({ error: "No hay gerentes elegibles." }, { status: 409 });
    gerente = next.gerente.nombre;
    origen = "auto";
  }

  const a: CanalAsignacion = {
    id: `${Date.now()}-${Math.round(Math.random() * 1e6)}`,
    fecha: new Date().toISOString(),
    canal: codigo,
    gerente,
    leadRef: body.leadRef ?? null,
    origen,
  };
  db.canalAsignaciones.unshift(a);
  writeDB(db);
  return NextResponse.json({ ok: true, asignacion: a, ranking: rankCanal(db, codigo) });
}
