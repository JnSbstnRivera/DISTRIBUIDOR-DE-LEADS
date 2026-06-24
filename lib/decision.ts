// Motor de decisión de asignación para "Citas Coordinadas" (lógica de Cata/Miguel).
// Cascada: horario incompatible → espera · Deal → dueño · PROMOTOR → PP Hatillo
// (por producto) · consultor activo → se mantiene · sin consultor → DISTRIBUIDOR
// (zona: Hoy si es hoy, Leads Digitales si es mañana+).
import type { DB } from "./types";
import {
  zonaDeMunicipio, proximoGerente, proximoGerenteHoy, proximoConsultorProducto,
  esPromotor, productoHatillo, horarioIncompatible, horaDeCita, fechaHoy,
} from "./engine";

export type LeadZoho = {
  ref: string;
  fechaCita: string; // ISO/yyyy-mm-dd
  fechaHora?: string; // datetime completo (para validar la hora de la cita)
  ciudad: string;
  teamAssistance: string; // TELEMERCADEO | VENTAS | VASS
  leadSource: string;
  leadType?: string; // productos (para elegir lista de PP Hatillo)
  consultor?: { nombre: string; activo: boolean; gerenteLider?: { nombre: string; activo: boolean } };
  salesAssist?: string; // "Sales Assist" en Zoho (puede traer un promotor)
  ppHatilloProducto?: string; // override manual de producto
  deal?: { owner: string };
};

export type Decision = {
  via: "deal" | "consultor" | "gerente" | "distribuidor" | "pp_hatillo" | "espera" | "error";
  gerente: string | null;
  zona?: string;
  producto?: string;
  esHoy: boolean;
  detalle: string;
  warning?: string; // ej. "Vino por promotor (Ivette Jiménez)"
};

export function decidir(db: DB, lead: LeadZoho): Decision {
  const esHoy = lead.fechaCita.slice(0, 10) === fechaHoy();

  // 0) Horario incompatible (ej. 12am/1am) → EN ESPERA, nadie hace visitas a esa hora.
  if (horarioIncompatible(lead.fechaHora)) {
    const h = horaDeCita(lead.fechaHora);
    const hh = h !== null ? `${String(h).padStart(2, "0")}:00` : "";
    return { via: "espera", gerente: null, esHoy, detalle: `Horario incompatible (${hh})`, warning: "En espera · confirmar horario de visita" };
  }

  // ¿El consultor/asistente es un promotor? → no es consultor real.
  const promo = [lead.consultor?.nombre, lead.salesAssist].find((n) => esPromotor(db, n));

  // 1) Si el lead tiene Deal → respetar al dueño del Deal (salvo que sea promotor)
  if (lead.deal?.owner && !esPromotor(db, lead.deal.owner)) {
    return { via: "deal", gerente: lead.deal.owner, esHoy, detalle: "Tiene Deal → consultor del Deal" };
  }

  // 2) PROMOTOR → PP Hatillo (esta pestaña es SOLO para promotores), rota por producto.
  if (promo) {
    const prod = lead.ppHatilloProducto || productoHatillo(lead.leadType);
    const next = proximoConsultorProducto(db, prod);
    return {
      via: "pp_hatillo",
      gerente: next?.gerente.nombre ?? null,
      producto: prod,
      esHoy,
      detalle: `PP Hatillo (promotor) · ${prod === "WATER_ANKER" ? "Water y Anker" : "Solar y Roofing"}`,
      warning: `Vino por promotor (${promo}) → PP Hatillo`,
    };
  }

  // 3) Consultor asignado activo → se mantiene
  if (lead.consultor) {
    if (lead.consultor.activo) {
      return { via: "consultor", gerente: lead.consultor.nombre, esHoy, detalle: "Consultor asignado (activo)" };
    }
    const gl = lead.consultor.gerenteLider;
    if (gl?.activo) {
      return { via: "gerente", gerente: gl.nombre, esHoy, detalle: "Consultor inactivo → gerente líder" };
    }
  }

  // 4) Sin consultor → DISTRIBUIDOR por zona (Hoy si es hoy, Leads Digitales si es mañana+)
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
    detalle: esHoy ? "Distribuidor · rotación de HOY" : "Distribuidor · Leads Digitales",
  };
}
