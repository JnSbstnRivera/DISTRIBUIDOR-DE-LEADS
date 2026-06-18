import { NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/store";
import type { ZonaCodigo } from "@/lib/types";

export const dynamic = "force-dynamic";

// Actualiza atributos de un gerente: tier2, blacklist, ajuste/opt-in por zona.
export async function PATCH(req: Request) {
  const body = await req.json().catch(() => ({}));
  const db = readDB();
  const g = db.gerentes.find((x) => x.id === body.id);
  if (!g) return NextResponse.json({ error: "Gerente no encontrado" }, { status: 404 });

  if (typeof body.tier2 === "boolean") g.tier2 = body.tier2;
  if (typeof body.blacklist === "boolean") g.blacklist = body.blacklist;

  if (body.zona && typeof body.ajuste === "number") {
    const z = body.zona as ZonaCodigo;
    if (g.zonas[z]) g.zonas[z]!.ajuste = body.ajuste;
  }
  // Opt-in / opt-out de zona
  if (body.zona && typeof body.optIn === "boolean") {
    const z = body.zona as ZonaCodigo;
    if (body.optIn && !g.zonas[z]) g.zonas[z] = { ajuste: 0, historico: 0 };
    if (!body.optIn && g.zonas[z]) delete g.zonas[z];
  }

  writeDB(db);
  return NextResponse.json({ ok: true, gerente: g });
}
