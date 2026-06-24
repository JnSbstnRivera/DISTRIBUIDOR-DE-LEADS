import { NextResponse } from "next/server";
import { readDB } from "@/lib/store";
import { zonaDeMunicipio, proximoGerenteHoy, fechaHoy } from "@/lib/engine";
import { zohoConfigured, getCitasCoordinadas, ESTADO_CITA } from "@/lib/zoho";

export const dynamic = "force-dynamic";

// Citas coordinadas cuya cita es HOY (rotación same-day). Lee Zoho en vivo si hay credenciales.
export async function GET() {
  const db = readDB();
  const hoy = fechaHoy();

  if (!zohoConfigured()) {
    return NextResponse.json({ fuente: "mock", hoy, filtro: `Lead Status = ${ESTADO_CITA} · Cita = hoy`, citas: [] });
  }
  try {
    const citas = await getCitasCoordinadas(hoy, hoy); // rango = solo hoy
    const out = citas.map((c) => {
      const zona = zonaDeMunicipio(db, c.ciudad);
      const next = zona ? proximoGerenteHoy(db, zona) : null;
      return { ...c, zona, sugerido: next?.gerente.nombre ?? null };
    });
    return NextResponse.json({ fuente: "zoho", hoy, filtro: `Lead Status = ${ESTADO_CITA} · Cita = hoy`, citas: out });
  } catch (e) {
    return NextResponse.json({ fuente: "error", hoy, error: String((e as Error).message || e), citas: [] });
  }
}
