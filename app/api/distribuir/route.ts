import { NextResponse } from "next/server";
import { readDB, writeDB } from "@/lib/store";
import { decidir } from "@/lib/decision";
import { fechaHoy } from "@/lib/engine";
import {
  zohoConfigured,
  escrituraHabilitada,
  getSalesTeam,
  updateLead,
  addNote,
  leadUrl,
} from "@/lib/zoho";
import type { Asignacion, HoyAsignacion, ZonaCodigo } from "@/lib/types";

export const dynamic = "force-dynamic";

// Normaliza un nombre para emparejar gerente (Excel) ↔ consultor (Sales_Team):
// minúsculas, sin acentos, espacios colapsados.
function norm(s: string): string {
  return (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// POST → cerrar el ciclo de asignación de una cita "Sin dueño".
// 1) recomputa la decisión en el server (autoritativo) → gerente por rotación del Excel.
// 2) mapea el gerente a un consultor de Sales_Team por nombre.
// 3) escribe Sales_Rep + nota en Zoho (o solo nota si no hay match/credenciales).
// 4) registra en el store (asignaciones + hoy si es cita de hoy) para que la rotación avance.
//
// Body: { leadId?, leadRef?, ciudad, fechaCita, teamAssistance?, leadSource? }
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const { leadId, leadRef, ciudad, fechaCita, teamAssistance, leadSource } = b || {};

  if (!ciudad || !fechaCita) {
    return NextResponse.json(
      { ok: false, error: "Falta ciudad y/o fechaCita del lead." },
      { status: 400 }
    );
  }

  const db = readDB();

  // 1) Decisión autoritativa (no confiamos en lo que vino del cliente).
  const decision = decidir(db, {
    ref: String(leadRef ?? leadId ?? ""),
    fechaCita: String(fechaCita),
    ciudad: String(ciudad),
    teamAssistance: String(teamAssistance ?? ""),
    leadSource: String(leadSource ?? ""),
  });

  if (decision.via === "error" || !decision.gerente || !decision.zona) {
    return NextResponse.json(
      { ok: false, error: decision.detalle || "No se pudo decidir un gerente para este lead." },
      { status: 409 }
    );
  }
  if (decision.via !== "distribuidor") {
    return NextResponse.json(
      {
        ok: false,
        error: `Este lead no entra al Distribuidor (${decision.detalle}). Usa Reasignar si quieres cambiar el consultor.`,
      },
      { status: 409 }
    );
  }

  const gerente = decision.gerente;
  const zona = decision.zona as ZonaCodigo;

  // 2) + 3) Escritura en Zoho. El interruptor escrituraHabilitada() está
  // APAGADO por defecto → modo demo: leemos Zoho en vivo y resolvemos a quién
  // SE ASIGNARÍA, pero no tocamos el CRM hasta que Cata apruebe.
  const escribe = escrituraHabilitada();
  let zohoEscrito: "sales_rep" | "nota" | "no" | "demo" = "no";
  let consultorEscrito: string | null = null;
  let url: string | undefined;

  if (zohoConfigured() && leadId) {
    if (!escribe) {
      // Modo demo: NO se escribe en Zoho. Intentamos resolver el consultor solo
      // para el preview del Historial; si la lectura falla, no es fatal.
      try {
        const reps = await getSalesTeam();
        consultorEscrito = reps.find((r) => norm(r.name) === norm(gerente))?.name ?? null;
      } catch { /* preview opcional */ }
      zohoEscrito = "demo";
    } else {
      try {
        const reps = await getSalesTeam();
        const match = reps.find((r) => norm(r.name) === norm(gerente));
        consultorEscrito = match?.name ?? null;
        const notaBase = `Distribución automática (rotación del Excel · zona ${zona}).\nGerente que sigue por carga: ${gerente}.`;

        if (match) {
          const res = await updateLead(String(leadId), { salesRepId: match.id });
          const rec = res?.data?.[0];
          if (rec && rec.code !== "SUCCESS") {
            return NextResponse.json(
              { ok: false, error: rec.message || "Zoho rechazó la actualización", detalle: rec },
              { status: 400 }
            );
          }
          await addNote(String(leadId), `${notaBase}\n\n— Consultor asignado: ${match.name}.\n(BOT DISTRIBUIDOR)`);
          zohoEscrito = "sales_rep";
        } else {
          // El gerente del Excel no existe como consultor en Sales_Team → dejamos nota y no tocamos el campo.
          await addNote(
            String(leadId),
            `${notaBase}\n\n⚠️ No se encontró "${gerente}" en Sales_Team — asignar manualmente.\n(BOT DISTRIBUIDOR)`
          );
          zohoEscrito = "nota";
        }
        url = leadUrl(String(leadId));
      } catch (e) {
        return NextResponse.json(
          { ok: false, error: String((e as Error).message || e) },
          { status: 500 }
        );
      }
    }
  }

  // 4) Registrar en el store para que la rotación avance + bitácora del Historial.
  const ahora = new Date();
  const asignacion: Asignacion = {
    id: `${Date.now()}-${Math.round(Math.random() * 1e6)}`,
    fecha: ahora.toISOString(),
    zona,
    municipio: String(ciudad),
    gerente,
    leadRef: leadRef ? String(leadRef) : null,
    origen: "auto",
    via: decision.via,
    consultor: consultorEscrito,
    leadId: leadId ? String(leadId) : null,
    zoho: zohoEscrito,
  };
  db.asignaciones.unshift(asignacion);

  // Si la cita es de hoy, también avanza la rotación same-day (y alimenta Cumplimiento).
  if (decision.esHoy) {
    const hoyEntry: HoyAsignacion = {
      id: `${asignacion.id}-hoy`,
      fecha: ahora.toISOString(),
      zona,
      municipio: String(ciudad),
      gerente,
      leadRef: leadRef ? String(leadRef) : null,
      estado: "pendiente",
      origen: "auto",
    };
    db.hoy.unshift(hoyEntry);
  }

  writeDB(db);

  return NextResponse.json({
    ok: true,
    modo: escribe ? "live" : "demo",
    gerente,
    zona,
    esHoy: decision.esHoy,
    consultor: consultorEscrito,
    zoho: zohoEscrito,
    leadUrl: url,
    detalle: decision.detalle,
  });
}
