// Tipos del Distribuidor de Leads — Windmar Home

export type ZonaCodigo = "SJ1" | "SJ2" | "HAT" | "PON" | "MAYA" | "COR";

export interface Zona {
  codigo: ZonaCodigo;
  nombre: string;
  opcional: boolean; // Cordillera es opcional
}

export interface Municipio {
  municipio: string;
  zona: ZonaCodigo;
}

export interface ZonaGerente {
  ajuste: number; // handicap para igualar carga al ingresar tarde
  historico: number; // leads recibidos en esa zona (base del Excel)
}

export interface Gerente {
  id: number;
  nombre: string;
  blacklist: boolean;
  tier2: boolean; // Tier 2 = recibe la mitad de leads (peso x2 en rotación)
  zonas: Partial<Record<ZonaCodigo, ZonaGerente>>;
}

export interface BlacklistEntry {
  nombre: string;
  inicio: string | null;
  fin: string | null;
  detalle: string;
  previos: string;
}

export interface Asignacion {
  id: string;
  fecha: string; // ISO
  zona: ZonaCodigo;
  municipio: string | null;
  gerente: string;
  leadRef: string | null;
  origen: "auto" | "manual";
  // ── Fase B: cierre del ciclo (escritura en Zoho desde /citas) ──
  via?: string; // cascada de decisión (distribuidor | consultor | …)
  consultor?: string | null; // nombre escrito como Sales_Rep en Zoho (si hubo match)
  leadId?: string | null; // id real del lead en Zoho
  zoho?: "sales_rep" | "nota" | "no" | "demo"; // qué se escribió de vuelta en Zoho ("demo" = decidido pero no escrito)
}

export type EstadoHoy = "pendiente" | "contestado" | "no_contestado";

// Cita para el mismo día (rotación HOY) + estado de confirmación (cumplimiento)
export interface HoyAsignacion {
  id: string;
  fecha: string; // ISO
  zona: ZonaCodigo;
  municipio: string | null;
  gerente: string;
  leadRef: string | null;
  estado: EstadoHoy;
  origen: "auto" | "manual" | "seed";
}

// Canal secundario (Media, Booth, Instagram por zona) — su propia rotación
export interface Canal {
  codigo: string;
  nombre: string;
  color: string;
  gerentes: { nombre: string; historico: number }[];
}

export interface CanalAsignacion {
  id: string;
  fecha: string;
  canal: string;
  gerente: string;
  leadRef: string | null;
  origen: "auto" | "manual";
}

export interface DB {
  zonas: Zona[];
  municipios: Municipio[];
  gerentes: Gerente[];
  blacklist: { consultores: BlacklistEntry[]; vendedores: BlacklistEntry[] };
  asignaciones: Asignacion[];
  hoy: HoyAsignacion[];
  canales: Canal[];
  canalAsignaciones: CanalAsignacion[];
  cumplimientoRango?: { inicio: string; fin: string };
}

// Resultado del motor: ranking de candidatos para una zona
export interface Candidato {
  gerente: Gerente;
  cargaEfectiva: number; // historico + ajuste + asignaciones nuevas
  score: number; // cargaEfectiva ponderada por tier
  rank: number;
  elegible: boolean;
  motivo?: string; // por qué no es elegible
}
