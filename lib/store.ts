// Almacén respaldado en archivo JSON en local; en serverless (Vercel, FS de solo
// lectura) opera en memoria leyendo el seed importado (va en el bundle).
// Fase 2: reemplazar por Supabase (schema `distribuidor`).

import fs from "fs";
import path from "path";
import type { DB } from "./types";
import seedData from "../data/seed.json";

const DB_FILE = path.join(process.cwd(), "data", "data.json");

let mem: DB | null = null; // caché en memoria (única fuente en serverless)

function fromSeed(): DB {
  const seed = seedData as unknown as DB;
  return {
    ...seed,
    asignaciones: [],
    hoy: seed.hoy ?? [],
    canales: seed.canales ?? [],
    canalAsignaciones: [],
  };
}

function tryWrite(db: DB): void {
  // En Vercel el FS es de solo-lectura → ignoramos el error y seguimos en memoria.
  try { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8"); } catch { /* solo memoria */ }
}

export function readDB(): DB {
  if (mem) return mem;
  try {
    if (fs.existsSync(DB_FILE)) { const d = JSON.parse(fs.readFileSync(DB_FILE, "utf-8")) as DB; mem = d; return d; }
  } catch { /* archivo corrupto/no accesible → seed */ }
  const d = fromSeed();
  mem = d;
  tryWrite(d);
  return d;
}

export function writeDB(db: DB): void {
  mem = db;
  tryWrite(db);
}

/** Reinicia la data al estado original del Excel (útil para la demo). */
export function resetDB(): DB {
  mem = fromSeed();
  tryWrite(mem);
  return mem;
}
