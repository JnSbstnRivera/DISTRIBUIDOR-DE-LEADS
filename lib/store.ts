// Almacén persistente respaldado en archivo JSON (sin dependencias nativas).
// En la fase 2 esto se reemplaza por Supabase (schema `distribuidor`).

import fs from "fs";
import path from "path";
import type { DB } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "data.json");
const SEED_FILE = path.join(DATA_DIR, "seed.json");

function init(): DB {
  const seed = JSON.parse(fs.readFileSync(SEED_FILE, "utf-8"));
  const db: DB = { ...seed, asignaciones: [], hoy: seed.hoy ?? [] };
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  return db;
}

export function readDB(): DB {
  if (!fs.existsSync(DB_FILE)) return init();
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
  } catch {
    return init();
  }
}

export function writeDB(db: DB): void {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
}

/** Reinicia la data al estado original del Excel (útil para la demo). */
export function resetDB(): DB {
  return init();
}
