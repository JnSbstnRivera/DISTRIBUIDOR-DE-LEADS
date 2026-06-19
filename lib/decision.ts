// Motor de decisión de asignación para "Citas Coordinadas" (lógica de Cata/Miguel).
// Cascada: Deal → consultor del deal · consultor activo · consultor inactivo →
// gerente líder · gerente inactivo o sin consultor → DISTRIBUIDOR.
import type { DB } from "./types";
import { zonaDeMunicipio, proximoGerente, proximoGerenteHoy, fechaHoy } from "./engine";

export type LeadZoho = {
  ref: string;
  fechaCita: string; // ISO/yyyy-mm-dd
  ciudad: string;
  teamAssistance: string; // TELEMERCADEO | VENTAS | VASS
  leadSource: string;
  consultor?: { nombre: string; activo: boolean; gerenteLider?: { nombre: string; activo: boolean } };
  deal?: { owner: string };
};

export type Decision = {
  via: "deal" | "consultor" | "gerente" | "distribuidor" | "error";
  gerente: string | null;
  zona?: string;
  esHoy: boolean;
  detalle: string;
};

export function decidir(db: DB, lead: LeadZoho): Decision {
  const esHoy = lead.fechaCita.slice(0, 10) === fechaHoy();

  // 1) Si el lead tiene Deal → respetar al dueño del Deal
  if (lead.deal?.owner) {
    return { via: "deal", gerente: lead.deal.owner, esHoy, detalle: "Tiene Deal → consultor del Deal" };
  }

  // 2) Consultor asignado
  if (lead.consultor) {
    if (lead.consultor.activo) {
      return { via: "consultor", gerente: lead.consultor.nombre, esHoy, detalle: "Consultor asignado (activo)" };
    }
    const gl = lead.consultor.gerenteLider;
    if (gl?.activo) {
      return { via: "gerente", gerente: gl.nombre, esHoy, detalle: "Consultor inactivo → gerente líder" };
    }
    // consultor inactivo y gerente inactivo → distribuidor
  }

  // 3) Distribuidor (sin consultor, o cascada agotada)
  const zona = zonaDeMunicipio(db, lead.ciudad);
  if (!zona) {
    return { via: "error", gerente: null, esHoy, detalle: `Ciudad sin zona: ${lead.ciudad}` };
  }
  const next = esHoy ? proximoGerenteHoy(db, zona) : proximoGerente(db, zona);
  return {
    via: "distribuidor",
    gerente: next?.gerente.nombre ?? null,
    zona,
    esHoy,
    detalle: esHoy ? "Distribuidor · rotación de HOY" : "Distribuidor · rotación futura",
  };
}
