import { NextResponse } from "next/server";
import { readDB } from "@/lib/store";
import { decidir, type LeadZoho } from "@/lib/decision";
import { fechaHoy } from "@/lib/engine";

export const dynamic = "force-dynamic";

// MOCK de "Citas Coordinadas" (Lead Status = Cita coordinada, Fecha ≥ hoy).
// Cuando Andrés dé acceso de solo-lectura, esto se reemplaza por una llamada a
// la API de Zoho (env: ZOHO_TOKEN / ZOHO_DC) filtrando por Lead Status y Fecha.
function mockLeads(): LeadZoho[] {
  const hoy = fechaHoy();
  const manana = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  return [
    { ref: "L900101", fechaCita: hoy, ciudad: "Caguas", teamAssistance: "TELEMERCADEO", leadSource: "Facebook",
      deal: { owner: "Carlos E Ortiz De Hostos" } },
    { ref: "L900102", fechaCita: hoy, ciudad: "Ponce", teamAssistance: "VENTAS", leadSource: "Referido",
      consultor: { nombre: "Adriana Paola Rodriguez Lopez", activo: true } },
    { ref: "L900103", fechaCita: manana, ciudad: "Mayagüez", teamAssistance: "VASS", leadSource: "Instagram",
      consultor: { nombre: "Jaime Sepulveda", activo: false, gerenteLider: { nombre: "David E Fonseca Rios", activo: true } } },
    { ref: "L900104", fechaCita: manana, ciudad: "Bayamón", teamAssistance: "TELEMERCADEO", leadSource: "Google",
      consultor: { nombre: "Edwin Colon", activo: false, gerenteLider: { nombre: "Brayan Sanchez Ortiz", activo: false } } },
    { ref: "L900105", fechaCita: manana, ciudad: "Hatillo", teamAssistance: "VENTAS", leadSource: "Booth" },
    { ref: "L900106", fechaCita: hoy, ciudad: "San Juan", teamAssistance: "TELEMERCADEO", leadSource: "Media Tour" },
  ];
}

export async function GET() {
  const db = readDB();
  const leads = mockLeads().map((l) => ({ ...l, decision: decidir(db, l) }));
  return NextResponse.json({
    fuente: "mock", // cambiará a "zoho" cuando haya acceso
    rango: { desde: fechaHoy(), filtro: "Lead Status = Cita coordinada · Fecha ≥ hoy" },
    leads,
  });
}
