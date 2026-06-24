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

// ── Rotación HOY (citas para el mismo día) ──
// Cuenta SOLO las citas same-day de hoy (estado != no_contestado); se reinicia cada día.
// Excluye Black List. No aplica Tier 2 (igual que el Excel para Offers-Hoy).

export function fechaHoy(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function offersHoy(db: DB, nombre: string, zona: ZonaCodigo, dia = fechaHoy()): number {
  return db.hoy.filter(
    (a) =>
      a.zona === zona &&
      a.gerente === nombre &&
      a.fecha.slice(0, 10) === dia &&
      a.estado !== "no_contestado"
  ).length;
}

export function rankZonaHoy(db: DB, zona: ZonaCodigo, hoy = new Date()): Candidato[] {
  const dia = fechaHoy(hoy);
  const candidatos: Candidato[] = db.gerentes
    .filter((g) => g.zonas[zona])
    .map((g) => {
      const carga = offersHoy(db, g.nombre, zona, dia);
      let elegible = true;
      let motivo: string | undefined;
      if (g.blacklist || blacklistActiva(db, g.nombre, hoy)) {
        elegible = false;
        motivo = "Black List";
      }
      return { gerente: g, cargaEfectiva: carga, score: carga, rank: 0, elegible, motivo };
    });
  const elegibles = candidatos
    .filter((c) => c.elegible)
    .sort((a, b) =>
      a.score !== b.score ? a.score - b.score : a.gerente.nombre.localeCompare(b.gerente.nombre)
    );
  elegibles.forEach((c, i) => (c.rank = i + 1));
  return [...elegibles, ...candidatos.filter((c) => !c.elegible)];
}

export function proximoGerenteHoy(db: DB, zona: ZonaCodigo, hoy = new Date()): Candidato | null {
  const r = rankZonaHoy(db, zona, hoy).filter((c) => c.elegible);
  return r.length ? r[0] : null;
}

// ── Rotación por CANAL (Media, Booth, Instagram) ──
// carga = historico (Excel) + asignaciones de sesión del canal; excluye Black List.
export function rankCanal(db: DB, codigo: string, hoy = new Date()): Candidato[] {
  const canal = db.canales.find((c) => c.codigo === codigo);
  if (!canal) return [];
  const candidatos: Candidato[] = canal.gerentes.map((cg) => {
    const g = db.gerentes.find((x) => x.nombre === cg.nombre) || {
      id: -1,
      nombre: cg.nombre,
      blacklist: false,
      tier2: false,
      zonas: {},
    };
    const nuevas = db.canalAsignaciones.filter(
      (a) => a.canal === codigo && a.gerente === cg.nombre
    ).length;
    const carga = cg.historico + nuevas;
    let elegible = true;
    let motivo: string | undefined;
    if (g.blacklist || blacklistActiva(db, cg.nombre, hoy)) {
      elegible = false;
      motivo = "Black List";
    }
    return { gerente: g, cargaEfectiva: carga, score: carga, rank: 0, elegible, motivo };
  });
  const elegibles = candidatos
    .filter((c) => c.elegible)
    .sort((a, b) =>
      a.score !== b.score ? a.score - b.score : a.gerente.nombre.localeCompare(b.gerente.nombre)
    );
  elegibles.forEach((c, i) => (c.rank = i + 1));
  return [...elegibles, ...candidatos.filter((c) => !c.elegible)];
}

export function proximoGerenteCanal(db: DB, codigo: string, hoy = new Date()): Candidato | null {
  const r = rankCanal(db, codigo, hoy).filter((c) => c.elegible);
  return r.length ? r[0] : null;
}

// ── PROMOTORES ──
// Si el Sales Rep / Sales Assist es un promotor (no consultor real), la cita
// igual se reparte al siguiente consultor de la zona + warning.
function norm(s: string): string {
  return (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}
export function esPromotor(db: DB, nombre?: string | null): boolean {
  if (!nombre) return false;
  // Zoho guarda el nombre completo (ej. "Ivette Jimenez Pagan") y la lista usa el
  // nombre corto ("Ivette Jiménez"). Match por tokens: TODOS los nombres del
  // promotor deben estar en el nombre de Zoho (≥2 tokens para evitar falsos positivos).
  const tokens = new Set(norm(nombre).split(" ").filter(Boolean));
  return (db.promotores ?? []).some((p) => {
    const pt = norm(p).split(" ").filter(Boolean);
    return pt.length >= 2 && pt.every((t) => tokens.has(t));
  });
}

// ── Rotación PP Hatillo (por LÍNEA DE PRODUCTO) ──
// carga = historico (Excel) + asignaciones de sesión del producto; excluye Black List.
export function rankProducto(db: DB, codigoProducto: string, hoy = new Date()): Candidato[] {
  const prod = db.ppHatillo?.productos.find((p) => p.codigo === codigoProducto);
  if (!prod) return [];
  const candidatos: Candidato[] = prod.gerentes.map((pg) => {
    const g = db.gerentes.find((x) => x.nombre === pg.nombre) || {
      id: -1, nombre: pg.nombre, blacklist: false, tier2: false, zonas: {},
    };
    const nuevas = (db.ppHatilloAsignaciones ?? []).filter(
      (a) => a.producto === codigoProducto && a.gerente === pg.nombre
    ).length;
    const carga = pg.historico + nuevas;
    let elegible = true;
    let motivo: string | undefined;
    if (g.blacklist || blacklistActiva(db, pg.nombre, hoy)) {
      elegible = false;
      motivo = "Black List";
    }
    return { gerente: g, cargaEfectiva: carga, score: carga, rank: 0, elegible, motivo };
  });
  const elegibles = candidatos
    .filter((c) => c.elegible)
    .sort((a, b) =>
      a.score !== b.score ? a.score - b.score : a.gerente.nombre.localeCompare(b.gerente.nombre)
    );
  elegibles.forEach((c, i) => (c.rank = i + 1));
  return [...elegibles, ...candidatos.filter((c) => !c.elegible)];
}

export function proximoConsultorProducto(db: DB, codigoProducto: string, hoy = new Date()): Candidato | null {
  const r = rankProducto(db, codigoProducto, hoy).filter((c) => c.elegible);
  return r.length ? r[0] : null;
}
