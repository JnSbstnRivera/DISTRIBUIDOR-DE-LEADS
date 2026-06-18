// Motor de Distribución de Leads — Windmar Home
// Replica la lógica del Excel de Miguel:
//   carga efectiva = histórico + ajuste + asignaciones de esta sesión
//   el próximo lead va al gerente OPTED-IN con MENOR carga, no blacklisteado.
//   Tier 2 = recibe la mitad de leads -> peso x2 en la rotación.
//   Cordillera es opcional (sólo participan los que hicieron opt-in).

import type {
  Candidato,
  DB,
  Gerente,
  ZonaCodigo,
} from "./types";

/** ¿El gerente está en blacklist activa hoy? (campo + fechas de la hoja Black List) */
export function blacklistActiva(db: DB, nombre: string, hoy = new Date()): boolean {
  const entradas = [...db.blacklist.consultores, ...db.blacklist.vendedores].filter(
    (e) => e.nombre.trim().toLowerCase() === nombre.trim().toLowerCase()
  );
  for (const e of entradas) {
    if (!e.fin) return true; // sin fecha fin = exclusión vigente/permanente
    const fin = new Date(e.fin);
    if (!isNaN(fin.getTime()) && fin >= hoy) return true;
  }
  return false;
}

/** Carga efectiva de un gerente en una zona = histórico + ajuste + nuevas asignaciones */
export function cargaEfectiva(db: DB, g: Gerente, zona: ZonaCodigo): number {
  const z = g.zonas[zona];
  if (!z) return Infinity;
  const nuevas = db.asignaciones.filter(
    (a) => a.zona === zona && a.gerente === g.nombre
  ).length;
  return z.historico + z.ajuste + nuevas;
}

/**
 * Calcula el ranking de candidatos para una zona.
 * rank 1 = a quién le toca el próximo lead.
 */
export function rankZona(db: DB, zona: ZonaCodigo, hoy = new Date()): Candidato[] {
  const candidatos: Candidato[] = db.gerentes
    .filter((g) => g.zonas[zona]) // sólo opted-in a la zona
    .map((g) => {
      const carga = cargaEfectiva(db, g, zona);
      // Tier 2 cuenta doble => lo eligen la mitad de veces (mitad de leads)
      const score = carga * (g.tier2 ? 2 : 1);
      let elegible = true;
      let motivo: string | undefined;
      if (g.blacklist || blacklistActiva(db, g.nombre, hoy)) {
        elegible = false;
        motivo = "Black List";
      }
      return { gerente: g, cargaEfectiva: carga, score, rank: 0, elegible, motivo };
    });

  // Ordenar: elegibles primero, luego por score asc, desempate alfabético
  const elegibles = candidatos
    .filter((c) => c.elegible)
    .sort((a, b) =>
      a.score !== b.score
        ? a.score - b.score
        : a.gerente.nombre.localeCompare(b.gerente.nombre)
    );
  elegibles.forEach((c, i) => (c.rank = i + 1));

  const noElegibles = candidatos.filter((c) => !c.elegible);
  return [...elegibles, ...noElegibles];
}

/** Devuelve al gerente al que le toca el próximo lead en la zona (o null). */
export function proximoGerente(db: DB, zona: ZonaCodigo, hoy = new Date()): Candidato | null {
  const r = rankZona(db, zona, hoy).filter((c) => c.elegible);
  return r.length ? r[0] : null;
}

/** Resuelve la zona a partir del municipio. */
export function zonaDeMunicipio(db: DB, municipio: string): ZonaCodigo | null {
  const m = db.municipios.find(
    (x) => x.municipio.trim().toLowerCase() === municipio.trim().toLowerCase()
  );
  return m ? m.zona : null;
}
