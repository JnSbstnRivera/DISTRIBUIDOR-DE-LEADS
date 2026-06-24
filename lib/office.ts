// Motor de la oficina pixel — modelo de grid de tiles (estilo repo pixel-agents,
// pero renderizado en DOM). Da: control total (áreas, muebles libres, tamaño),
// caminata por TODA la oficina y pathfinding BFS que esquiva muebles.

export const SPR = "/agents/pixel/office/"; // sprites de mobiliario
export const FLOOR_TILES = ["floor_0", "floor_1", "floor_2", "floor_3", "floor_4", "floor_6", "floor_7", "floor_8"];

// Tintes CSS para colorear los pisos grises (madera/azul/neutro) sin motor de color.
export const TINTS: Record<string, string> = {
  ninguno: "",
  madera: "sepia(0.55) saturate(1.6) hue-rotate(-12deg) brightness(1.03)",
  azul: "sepia(0.4) saturate(1.5) hue-rotate(175deg) brightness(1.02)",
  verde: "sepia(0.4) saturate(1.4) hue-rotate(70deg) brightness(1.02)",
  neutro: "brightness(1.06) contrast(0.97)",
};

/* ── Catálogo de mobiliario (footprint en TILES, no px) ── */
export type FurnCat = "escritorio" | "silla" | "almacenaje" | "planta" | "pared" | "deco" | "electronica";

export type FurnEntry = {
  label: string;
  tw: number; // ancho en tiles
  th: number; // alto en tiles
  cat: FurnCat;
  isDesk?: boolean; // genera asiento(s) para que un agente trabaje
};

export const FURN_CATALOG: Record<string, FurnEntry> = {
  DESK_FRONT: { label: "Escritorio", tw: 3, th: 2, cat: "escritorio", isDesk: true },
  TABLE_FRONT: { label: "Mesa de reunión", tw: 3, th: 4, cat: "escritorio", isDesk: true },
  DOUBLE_BOOKSHELF: { label: "Estante doble", tw: 2, th: 2, cat: "almacenaje" },
  BOOKSHELF: { label: "Estante", tw: 2, th: 1, cat: "almacenaje" },
  COFFEE_TABLE: { label: "Mesa de café", tw: 2, th: 2, cat: "deco" },
  CUSHIONED_CHAIR_FRONT: { label: "Silla acolchada", tw: 1, th: 1, cat: "silla" },
  CUSHIONED_CHAIR_BACK: { label: "Silla (espalda)", tw: 1, th: 1, cat: "silla" },
  WOODEN_CHAIR_FRONT: { label: "Silla de madera", tw: 1, th: 2, cat: "silla" },
  CLOCK: { label: "Reloj", tw: 1, th: 2, cat: "deco" },
  COFFEE: { label: "Café", tw: 1, th: 1, cat: "deco" },
  PLANT: { label: "Planta", tw: 1, th: 2, cat: "planta" },
  LARGE_PLANT: { label: "Planta grande", tw: 2, th: 3, cat: "planta" },
  POT: { label: "Maceta", tw: 1, th: 1, cat: "planta" },
  LARGE_PAINTING: { label: "Cuadro grande", tw: 2, th: 2, cat: "pared" },
  SMALL_PAINTING: { label: "Cuadro", tw: 1, th: 2, cat: "pared" },
  SMALL_PAINTING_2: { label: "Cuadro 2", tw: 1, th: 2, cat: "pared" },
  WHITEBOARD: { label: "Pizarra", tw: 2, th: 2, cat: "pared" },
  // electrónica
  PC: { label: "PC (frente)", tw: 1, th: 2, cat: "electronica" },
  PC_SIDE: { label: "PC (lado)", tw: 1, th: 2, cat: "electronica" },
  PC_BACK: { label: "PC (atrás)", tw: 1, th: 2, cat: "electronica" },
  // muebles nuevos
  SOFA: { label: "Sofá", tw: 2, th: 1, cat: "silla" },
  WOODEN_BENCH: { label: "Banco de madera", tw: 1, th: 1, cat: "silla" },
  CUSHIONED_BENCH: { label: "Banco acolchado", tw: 1, th: 1, cat: "silla" },
  SMALL_TABLE: { label: "Mesita", tw: 2, th: 2, cat: "deco" },
  BIN: { label: "Papelera", tw: 1, th: 1, cat: "deco" },
  CACTUS: { label: "Cactus", tw: 1, th: 2, cat: "planta" },
  HANGING_PLANT: { label: "Planta colgante", tw: 1, th: 2, cat: "planta" },
  PLANT_2: { label: "Planta 2", tw: 1, th: 2, cat: "planta" },
};

/* ── Modelo de datos ── */
export type Room = {
  id: string;
  label: string;
  col: number;
  row: number;
  w: number; // tiles
  h: number;
  tile: string; // sprite de piso (FLOOR_TILES)
  tint?: string; // clave de TINTS (madera/azul/verde/neutro)
};

export type Facing = "down" | "up" | "left" | "right";

export type Furn = {
  id: string;
  type: string; // clave de FURN_CATALOG
  col: number;
  row: number;
  mirrored?: boolean;
  face?: Facing; // si es escritorio: hacia dónde mira el agente sentado (perfil/espaldas)
};

// Logo pixel-art opcional dentro de la oficina (imagen subida por el usuario).
export type LogoItem = {
  id: string;
  src: string; // ruta pública o data URL
  col: number;
  row: number;
  w: number; // tiles
  h: number;
  frame?: boolean; // marco tipo "cuadro" (matte blanco + borde)
};

export type OfficeLayout = {
  rev?: number; // versión del layout por defecto (al subir, ignora el guardado viejo)
  cols: number;
  rows: number;
  rooms: Room[];
  furniture: Furn[];
  logos?: LogoItem[];
};

export const LAYOUT_REV = 4;

export const MIN_COLS = 20;
export const MAX_COLS = 80;
export const MIN_ROWS = 12;
export const MAX_ROWS = 50;

export const DEFAULT_LAYOUT: OfficeLayout = {
  rev: LAYOUT_REV,
  cols: 28,
  rows: 15,
  rooms: [
    { id: "work", label: "Workspace", col: 1, row: 1, w: 16, h: 13, tile: "floor_1", tint: "madera" },
    { id: "meet", label: "Sala de reunión", col: 17, row: 1, w: 10, h: 6, tile: "floor_4", tint: "azul" },
    { id: "mgr", label: "Gerencia", col: 17, row: 7, w: 10, h: 7, tile: "floor_2", tint: "neutro" },
  ],
  furniture: [
    // Workspace · estantes y cuadro arriba (sobre la pared)
    { id: "d_dbs1", type: "DOUBLE_BOOKSHELF", col: 1, row: 1 },
    { id: "d_bs1", type: "BOOKSHELF", col: 13, row: 1 },
    { id: "d_bs2", type: "BOOKSHELF", col: 15, row: 1 },
    { id: "d_hang", type: "HANGING_PLANT", col: 12, row: 1 },
    // 4 escritorios — el agente se sienta de PERFIL hacia su monitor (PC de lado / de espaldas)
    { id: "d_dk1", type: "DESK_FRONT", col: 2, row: 4, face: "right" },
    { id: "d_dk2", type: "DESK_FRONT", col: 9, row: 4, face: "left" },
    { id: "d_dk3", type: "DESK_FRONT", col: 2, row: 9, face: "right" },
    { id: "d_dk4", type: "DESK_FRONT", col: 9, row: 9, face: "left" },
    { id: "d_pc1", type: "PC_SIDE", col: 4, row: 4, mirrored: true }, // agente mira derecha → pantalla hacia él (izq)
    { id: "d_pc2", type: "PC_SIDE", col: 9, row: 4 },                 // agente mira izquierda → pantalla hacia él (der)
    { id: "d_pc3", type: "PC_BACK", col: 4, row: 9 },                 // monitor de espaldas (variedad)
    { id: "d_pc4", type: "PC_SIDE", col: 9, row: 9 },
    { id: "ch_1", type: "CUSHIONED_CHAIR_BACK", col: 3, row: 4 },
    { id: "ch_2", type: "CUSHIONED_CHAIR_BACK", col: 10, row: 4 },
    { id: "ch_3", type: "CUSHIONED_CHAIR_BACK", col: 3, row: 9 },
    { id: "ch_4", type: "CUSHIONED_CHAIR_BACK", col: 10, row: 9 },
    { id: "d_lp1", type: "LARGE_PLANT", col: 14, row: 6 },
    { id: "d_pl1", type: "PLANT", col: 1, row: 11 },
    // lounge agrupado
    { id: "d_sofa", type: "SOFA", col: 5, row: 12 },
    { id: "d_stbl", type: "SMALL_TABLE", col: 8, row: 11 },
    { id: "d_cac", type: "CACTUS", col: 11, row: 11 },
    // Meeting
    { id: "d_tbl", type: "TABLE_FRONT", col: 19, row: 2, face: "up" },
    { id: "ch_6", type: "CUSHIONED_CHAIR_BACK", col: 20, row: 2 },
    { id: "d_mch1", type: "CUSHIONED_CHAIR_FRONT", col: 18, row: 3 },
    { id: "d_mch2", type: "CUSHIONED_CHAIR_FRONT", col: 22, row: 3 },
    { id: "d_pl2", type: "PLANT", col: 25, row: 1 },
    // Manager
    { id: "d_pnt", type: "LARGE_PAINTING", col: 18, row: 7 },
    { id: "d_bs3", type: "BOOKSHELF", col: 22, row: 7 },
    { id: "d_dk5", type: "DESK_FRONT", col: 19, row: 10, face: "right" },
    { id: "d_pc5", type: "PC_SIDE", col: 21, row: 10, mirrored: true }, // mira derecha → pantalla hacia él
    { id: "ch_5", type: "CUSHIONED_CHAIR_BACK", col: 20, row: 10 },
    { id: "d_lp2", type: "LARGE_PLANT", col: 24, row: 10 },
  ],
  logos: [
    { id: "lg_main", src: "/agents/pixel/windmar-logo.png", col: 5, row: 1, w: 4, h: 3, frame: true },
    { id: "lg_meet", src: "/agents/pixel/windmar-logo.png", col: 23, row: 1, w: 3, h: 2, frame: true },
    { id: "lg_mgr", src: "/agents/pixel/windmar-logo.png", col: 23, row: 8, w: 3, h: 2, frame: true },
  ],
};

/* ── IDs ── */
let _id = 0;
export function uid(prefix = "x") {
  _id += 1;
  return `${prefix}${Date.now().toString(36)}_${_id}`;
}

/* ── Grids derivados ── */
export type Grid = boolean[][]; // [row][col]

function makeGrid(rows: number, cols: number, fill: boolean): Grid {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => fill));
}

// Celdas que pertenecen a algún cuarto (piso) → caminables base.
export function floorGrid(layout: OfficeLayout): Grid {
  const g = makeGrid(layout.rows, layout.cols, false);
  for (const r of layout.rooms) {
    for (let row = r.row; row < r.row + r.h; row++) {
      for (let col = r.col; col < r.col + r.w; col++) {
        if (row >= 0 && row < layout.rows && col >= 0 && col < layout.cols) g[row][col] = true;
      }
    }
  }
  return g;
}

// Celdas bloqueadas por mobiliario (footprint completo).
export function blockedGrid(layout: OfficeLayout): Grid {
  const g = makeGrid(layout.rows, layout.cols, false);
  for (const f of layout.furniture) {
    const cat = FURN_CATALOG[f.type];
    if (!cat) continue;
    for (let row = f.row; row < f.row + cat.th; row++) {
      for (let col = f.col; col < f.col + cat.tw; col++) {
        if (row >= 0 && row < layout.rows && col >= 0 && col < layout.cols) g[row][col] = true;
      }
    }
  }
  return g;
}

// Caminable = piso y no bloqueado.
export function walkableGrid(layout: OfficeLayout): Grid {
  const floor = floorGrid(layout);
  const blocked = blockedGrid(layout);
  const g = makeGrid(layout.rows, layout.cols, false);
  for (let r = 0; r < layout.rows; r++)
    for (let c = 0; c < layout.cols; c++) g[r][c] = floor[r][c] && !blocked[r][c];
  return g;
}

/* ── Asientos: derivados de los muebles isDesk ──
   El asiento es la fila SUPERIOR del escritorio: el agente se sienta detrás,
   mirando al frente, y el cuerpo del escritorio (que baja en pantalla) le tapa
   las piernas vía z-sort. El asiento cae sobre el footprint del mueble, así que
   el pathfinding lo trata como caminable solo para ese agente (set `extra`). */
export type Seat = { col: number; row: number; deskId: string; face: Facing };

export function deriveSeats(layout: OfficeLayout): Seat[] {
  const seats: Seat[] = [];
  for (const f of layout.furniture) {
    const cat = FURN_CATALOG[f.type];
    if (!cat?.isDesk) continue;
    const col = f.col + Math.floor(cat.tw / 2); // centro
    const row = f.row; // fila superior del escritorio
    seats.push({ col, row, deskId: f.id, face: f.face ?? "right" });
  }
  return seats;
}

/* ── BFS pathfinding (4-vecinos). extra = celdas forzadas caminables
   (p.ej. el propio asiento del agente, que cae sobre el escritorio). ── */
export function bfs(
  walk: Grid,
  start: { col: number; row: number },
  goal: { col: number; row: number },
  extra?: Set<string>,
): { col: number; row: number }[] | null {
  const rows = walk.length;
  const cols = rows ? walk[0].length : 0;
  const key = (c: number, r: number) => `${c},${r}`;
  const can = (c: number, r: number) =>
    c >= 0 && r >= 0 && c < cols && r < rows && (walk[r][c] || extra?.has(key(c, r)));
  if (!can(goal.col, goal.row)) return null;

  const sc = Math.round(start.col), sr = Math.round(start.row);
  const came = new Map<string, string | null>();
  came.set(key(sc, sr), null);
  let q: { c: number; r: number }[] = [{ c: sc, r: sr }];
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  const gk = key(goal.col, goal.row);
  while (q.length) {
    const next: { c: number; r: number }[] = [];
    for (const { c, r } of q) {
      if (c === goal.col && r === goal.row) {
        // reconstruir
        const path: { col: number; row: number }[] = [];
        let cur: string | null = gk;
        while (cur) {
          const [cc, rr] = cur.split(",").map(Number);
          path.push({ col: cc, row: rr });
          cur = came.get(cur) ?? null;
        }
        path.reverse();
        return path.slice(1); // excluir el inicio
      }
      for (const [dc, dr] of dirs) {
        const nc = c + dc, nr = r + dr;
        const k = key(nc, nr);
        if (came.has(k)) continue;
        if (!can(nc, nr)) continue;
        came.set(k, key(c, r));
        next.push({ c: nc, r: nr });
      }
    }
    q = next;
  }
  return null;
}

export function randomWalkable(walk: Grid): { col: number; row: number } | null {
  const cells: { col: number; row: number }[] = [];
  for (let r = 0; r < walk.length; r++)
    for (let c = 0; c < walk[0].length; c++) if (walk[r][c]) cells.push({ col: c, row: r });
  if (!cells.length) return null;
  return cells[Math.floor(Math.random() * cells.length)];
}

// Caminable dentro de una caja [x0..x1]×[y0..y1] (el cuarto del agente) → no cruza muros.
export type Box = { x0: number; y0: number; x1: number; y1: number };
export function randomWalkableIn(walk: Grid, box: Box): { col: number; row: number } | null {
  const cells: { col: number; row: number }[] = [];
  for (let r = Math.max(0, box.y0); r <= Math.min(walk.length - 1, box.y1); r++)
    for (let c = Math.max(0, box.x0); c <= Math.min((walk[0]?.length ?? 0) - 1, box.x1); c++)
      if (walk[r]?.[c]) cells.push({ col: c, row: r });
  if (!cells.length) return null;
  return cells[Math.floor(Math.random() * cells.length)];
}

export function nearestWalkable(walk: Grid, col: number, row: number): { col: number; row: number } | null {
  const rows = walk.length, cols = rows ? walk[0].length : 0;
  let best: { col: number; row: number } | null = null;
  let bestD = Infinity;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      if (!walk[r][c]) continue;
      const d = (c - col) ** 2 + (r - row) ** 2;
      if (d < bestD) {
        bestD = d;
        best = { col: c, row: r };
      }
    }
  return best;
}
