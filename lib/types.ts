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
}

export interface DB {
  zonas: Zona[];
  municipios: Municipio[];
  gerentes: Gerente[];
  blacklist: { consultores: BlacklistEntry[]; vendedores: BlacklistEntry[] };
  asignaciones: Asignacion[];
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
