import { NextResponse } from "next/server";
import { readDB } from "@/lib/store";
import { decidir, type LeadZoho } from "@/lib/decision";
import { fechaHoy } from "@/lib/engine";
import { zohoConfigured, escrituraHabilitada, getCitasCoordinadas, ESTADO_CITA } from "@/lib/zoho";

export const dynamic = "force-dynamic";

// MOCK de respaldo (mientras Andrés habilita el acceso real a Zoho).
function mockLeads(): LeadZoho[] {
  const hoy = fechaHoy();
  const manana = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  return [
    { ref: "L900101", fechaCita: hoy, ciudad: "Caguas", teamAssistance: "TELEMERCADEO", leadSource: "Facebook", deal: { owner: "Carlos E Ortiz De Hostos" } },
    { ref: "L900102", fechaCita: hoy, ciudad: "Ponce", teamAssistance: "VENTAS", leadSource: "Referido", consultor: { nombre: "Adriana Paola Rodriguez Lopez", activo: true } },
    { ref: "L900103", fechaCita: manana, ciudad: "Mayagüez", teamAssistance: "VASS", leadSource: "Instagram", consultor: { nombre: "Jaime Sepulveda", activo: false, gerenteLider: { nombre: "David E Fonseca Rios", activo: true } } },
    { ref: "L900104", fechaCita: manana, ciudad: "Bayamón", teamAssistance: "TELEMERCADEO", leadSource: "Google", consultor: { nombre: "Edwin Colon", activo: false, gerenteLider: { nombre: "Brayan Sanchez Ortiz", activo: false } } },
    { ref: "L900105", fechaCita: manana, ciudad: "Hatillo", teamAssistance: "VENTAS", leadSource: "Booth" },
    { ref: "L900106", fechaCita: hoy, ciudad: "San Juan", teamAssistance: "TELEMERCADEO", leadSource: "Media Tour" },
  ];
}

export async function GET() {
  const db = readDB();
  const hoy = fechaHoy();
  const escribe = escrituraHabilitada(); // false = modo demo (no escribe en Zoho)

  // REAL si hay credenciales; si falla o no hay, cae a MOCK (software vivo).
  if (zohoConfigured()) {
    try {
      const citas = await getCitasCoordinadas(hoy);
      // Juan Camilo Salas Montoya crea citas masivamente → su ownership es ruido, se excluye.
      const sinRuido = citas.filter((c) => !/juan\s+camilo\s+salas/i.test(c.ownerName || ""));
      const leads = sinRuido.map((c) => ({
        ...c,
        decision: decidir(db, {
          ref: c.ref, fechaCita: c.fechaCita, fechaHora: c.fechaHora, ciudad: c.ciudad,
          teamAssistance: c.teamAssistance, leadSource: c.leadSource, leadType: c.leadType,
          consultor: c.consultor, salesAssist: c.salesAssist,
        }),
      }));
      return NextResponse.json({ fuente: "zoho", escribe, rango: { desde: hoy, filtro: `Lead Status = ${ESTADO_CITA} · Fecha ≥ hoy` }, leads });
    } catch (e) {
      return NextResponse.json({ fuente: "mock", escribe, error: String((e as Error).message || e), rango: { desde: hoy, filtro: `Lead Status = ${ESTADO_CITA} · Fecha ≥ hoy` }, leads: mockLeads().map((l) => ({ ...l, decision: decidir(db, l) })) });
    }
  }

  const leads = mockLeads().map((l) => ({ ...l, decision: decidir(db, l) }));
  return NextResponse.json({ fuente: "mock", escribe, rango: { desde: hoy, filtro: `Lead Status = ${ESTADO_CITA} · Fecha ≥ hoy` }, leads });
}
