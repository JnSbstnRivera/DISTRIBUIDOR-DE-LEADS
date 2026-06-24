import { NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/store";
import { rankProducto, proximoConsultorProducto } from "@/lib/engine";
import type { PPHatilloAsignacion } from "@/lib/types";

export const dynamic = "force-dynamic";

// PP HATILLO (plan piloto) — reemplaza Canales/Booth/Media.
// Rota por LÍNEA DE PRODUCTO (Solar y Roofing / Water y Anker).
// La UI de /canales se reusa: cada "canal" = un producto.
const COLOR: Record<string, string> = {
  SOLAR_ROOFING: "#e07d00", // naranja Windmar (solar/roofing)
  WATER_ANKER: "#1D6FB8", // azul (agua/anker)
};

export async function GET() {
  const db = readDB();
  const hoy = new Date();
  const productos = db.ppHatillo?.productos ?? [];
  const ranking: Record<string, ReturnType<typeof rankProducto>> = {};
  for (const p of productos) ranking[p.codigo] = rankProducto(db, p.codigo, hoy);
  const canales = productos.map((p) => ({
    codigo: p.codigo,
    nombre: p.nombre,
    color: COLOR[p.codigo] ?? "#e07d00",
    participantes: p.gerentes.length,
    asignadasSesion: (db.ppHatilloAsignaciones ?? []).filter((a) => a.producto === p.codigo).length,
  }));
  return NextResponse.json({
    canales,
    ranking,
    asignaciones: (db.ppHatilloAsignaciones ?? []).slice(0, 50),
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const db = readDB();
  const codigo: string | null = body.canal ?? null;
  const productos = db.ppHatillo?.productos ?? [];
  if (!codigo || !productos.find((p) => p.codigo === codigo))
    return NextResponse.json({ error: "Producto inválido." }, { status: 400 });

  let gerente: string | null = body.gerente ?? null;
  let origen: "auto" | "manual" = body.gerente ? "manual" : "auto";
  if (!gerente) {
    const next = proximoConsultorProducto(db, codigo);
    if (!next) return NextResponse.json({ error: "No hay consultores elegibles." }, { status: 409 });
    gerente = next.gerente.nombre;
    origen = "auto";
  }

  const a: PPHatilloAsignacion = {
    id: `${Date.now()}-${Math.round(Math.random() * 1e6)}`,
    fecha: new Date().toISOString(),
    producto: codigo,
    gerente,
    leadRef: body.leadRef ?? null,
    origen,
  };
  if (!db.ppHatilloAsignaciones) db.ppHatilloAsignaciones = [];
  db.ppHatilloAsignaciones.unshift(a);
  writeDB(db);
  return NextResponse.json({ ok: true, asignacion: a, ranking: rankProducto(db, codigo) });
}
