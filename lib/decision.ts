// Motor de decisión de asignación para "Citas Coordinadas" (lógica de Cata/Miguel).
// Cascada: Deal → consultor del deal · consultor activo · consultor inactivo →
// gerente líder · gerente inactivo o sin consultor → DISTRIBUIDOR.
import type { DB } from "./types";
import {
  zonaDeMunicipio, proximoGerente, proximoGerenteHoy, proximoConsultorProducto,
  esPromotor, fechaHoy,
} from "./engine";

export type LeadZoho = {
  ref: string;
  fechaCita: string; // ISO/yyyy-mm-dd
  ciudad: string;
  teamAssistance: string; // TELEMERCADEO | VENTAS | VASS
  leadSource: string;
  consultor?: { nombre: string; activo: boolean; gerenteLider?: { nombre: string; activo: boolean } };
  salesAssist?: string; // "Sales Assist" en Zoho (puede traer un promotor)
  ppHatilloProducto?: string; // SOLAR_ROOFING | WATER_ANKER → rota por producto (piloto Hatillo)
  deal?: { owner: string };
};

export type Decision = {
  via: "deal" | "consultor" | "gerente" | "distribuidor" | "pp_hatillo" | "error";
  gerente: string | null;
  zona?: string;
  producto?: string;
  esHoy: boolean;
  detalle: string;
  warning?: string; // ej. "Vino por promotor (Ivette Jiménez)"
};

export function decidir(db: DB, lead: LeadZoho): Decision {
  const esHoy = lead.fechaCita.slice(0, 10) === fechaHoy();

  // ¿El consultor/asistente es un promotor? → no es consultor real, toca repartir.
  const promo = [lead.consultor?.nombre, lead.salesAssist].find((n) => esPromotor(db, n));
  const warning = promo ? `Vino por promotor (${promo}) → reasignar` : undefined;

  // 1) Si el lead tiene Deal → respetar al dueño del Deal (salvo que sea promotor)
  if (lead.deal?.owner && !esPromotor(db, lead.deal.owner)) {
    return { via: "deal", gerente: lead.deal.owner, esHoy, detalle: "Tiene Deal → consultor del Deal", warning };
  }

  // 2) PP Hatillo (piloto): si la cita trae línea de producto → rota por producto
  if (lead.ppHatilloProducto) {
    const next = proximoConsultorProducto(db, lead.ppHatilloProducto);
    return {
      via: "pp_hatillo",
      gerente: next?.gerente.nombre ?? null,
      producto: lead.ppHatilloProducto,
      esHoy,
      detalle: `PP Hatillo · rotación por producto (${lead.ppHatilloProducto})`,
      warning,
    };
  }

  // 3) Consultor asignado (se ignora si es promotor → cae al distribuidor)
  if (lead.consultor && !promo) {
    if (lead.consultor.activo) {
      return { via: "consultor", gerente: lead.consultor.nombre, esHoy, detalle: "Consultor asignado (activo)" };
    }
    const gl = lead.consultor.gerenteLider;
    if (gl?.activo) {
      return { via: "gerente", gerente: gl.nombre, esHoy, detalle: "Consultor inactivo → gerente líder" };
    }
    // consultor inactivo y gerente inactivo → distribuidor
  }

  // 4) Distribuidor (sin consultor, promotor, o cascada agotada)
  const zona = zonaDeMunicipio(db, lead.ciudad);
  if (!zona) {
    return { via: "error", gerente: null, esHoy, detalle: `Ciudad sin zona: ${lead.ciudad}`, warning };
  }
  const next = esHoy ? proximoGerenteHoy(db, zona) : proximoGerente(db, zona);
  return {
    via: "distribuidor",
    gerente: next?.gerente.nombre ?? null,
    zona,
    esHoy,
    detalle: esHoy ? "Distribuidor · rotación de HOY" : "Distribuidor · rotación futura",
    warning,
  };
}
