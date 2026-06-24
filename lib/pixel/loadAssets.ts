// M3 — Loader de assets en el navegador para el motor canvas (Pixel Agents).
// Porta el decode de webview-ui/src/browserMock.ts: fetch PNG → canvas getImageData
// → SpriteData (matriz de hex), y alimenta los setters del motor.
import { rgbaToHex } from "./assets/colorUtils";
import {
  CHAR_FRAME_H, CHAR_FRAME_W, CHAR_FRAMES_PER_ROW, CHARACTER_DIRECTIONS,
  FLOOR_TILE_SIZE, WALL_BITMASK_COUNT, WALL_GRID_COLS, WALL_PIECE_HEIGHT, WALL_PIECE_WIDTH,
} from "./assets/constants";
import type { AssetIndex, CatalogEntry, CharacterDirectionSprites } from "./assets/types";
import { setCharacterTemplates } from "./sprites/spriteData";
import { setFloorSprites } from "./floorTiles";
import { setWallSprites } from "./wallTiles";
import { buildDynamicCatalog } from "./layout/furnitureCatalog";

const BASE = "/assets/";

interface DecodedPng { width: number; height: number; data: Uint8ClampedArray }

function getPixel(data: Uint8ClampedArray, width: number, x: number, y: number): [number, number, number, number] {
  const i = (y * width + x) * 4;
  return [data[i], data[i + 1], data[i + 2], data[i + 3]];
}
function readSprite(png: DecodedPng, w: number, h: number, ox = 0, oy = 0): string[][] {
  const sprite: string[][] = [];
  for (let y = 0; y < h; y++) {
    const row: string[] = [];
    for (let x = 0; x < w; x++) {
      const [r, g, b, a] = getPixel(png.data, png.width, ox + x, oy + y);
      row.push(rgbaToHex(r, g, b, a));
    }
    sprite.push(row);
  }
  return sprite;
}
async function decodePng(url: string): Promise<DecodedPng> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`PNG ${url} → ${res.status}`);
  const bitmap = await createImageBitmap(await res.blob());
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width; canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  const d = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return { width: canvas.width, height: canvas.height, data: d.data };
}

async function decodeCharacters(index: AssetIndex): Promise<CharacterDirectionSprites[]> {
  const out: CharacterDirectionSprites[] = [];
  for (const rel of index.characters) {
    const png = await decodePng(`${BASE}characters/${rel}`);
    const byDir: CharacterDirectionSprites = { down: [], up: [], right: [] };
    for (let d = 0; d < CHARACTER_DIRECTIONS.length; d++) {
      const dir = CHARACTER_DIRECTIONS[d];
      const frames: string[][][] = [];
      for (let f = 0; f < CHAR_FRAMES_PER_ROW; f++) {
        frames.push(readSprite(png, CHAR_FRAME_W, CHAR_FRAME_H, f * CHAR_FRAME_W, d * CHAR_FRAME_H));
      }
      byDir[dir] = frames;
    }
    out.push(byDir);
  }
  return out;
}
async function decodeFloors(index: AssetIndex): Promise<string[][][]> {
  const out: string[][][] = [];
  for (const rel of index.floors) out.push(readSprite(await decodePng(`${BASE}floors/${rel}`), FLOOR_TILE_SIZE, FLOOR_TILE_SIZE));
  return out;
}
async function decodeWalls(index: AssetIndex): Promise<string[][][][]> {
  const out: string[][][][] = [];
  for (const rel of index.walls) {
    const png = await decodePng(`${BASE}walls/${rel}`);
    const set: string[][][] = [];
    for (let mask = 0; mask < WALL_BITMASK_COUNT; mask++) {
      const ox = (mask % WALL_GRID_COLS) * WALL_PIECE_WIDTH;
      const oy = Math.floor(mask / WALL_GRID_COLS) * WALL_PIECE_HEIGHT;
      set.push(readSprite(png, WALL_PIECE_WIDTH, WALL_PIECE_HEIGHT, ox, oy));
    }
    out.push(set);
  }
  return out;
}
async function decodeFurniture(catalog: CatalogEntry[]): Promise<Record<string, string[][]>> {
  const sprites: Record<string, string[][]> = {};
  for (const e of catalog) {
    try { sprites[e.id] = readSprite(await decodePng(`${BASE}${e.furniturePath}`), e.width, e.height); }
    catch { /* sprite faltante → se omite */ }
  }
  return sprites;
}

// Cache a nivel módulo: decodificar los PNG una sola vez (es caro). Los setters del
// motor son estado global, así que basta llamarlos una vez.
let _cache: { layout: any; loadedAssets: { catalog: any; sprites: Record<string, string[][]> } } | null = null;

/** Carga y decodifica todos los assets (una sola vez), alimenta el motor y devuelve
 *  el layout + los loadedAssets (catalog+sprites) que el EditorToolbar necesita. */
export async function loadPixelAssets(): Promise<{ layout: any; loadedAssets: { catalog: any; sprites: Record<string, string[][]> } }> {
  if (_cache) return _cache;
  const [index, catalog] = await Promise.all([
    fetch(`${BASE}asset-index.json`).then((r) => r.json()) as Promise<AssetIndex>,
    fetch(`${BASE}furniture-catalog.json`).then((r) => r.json()) as Promise<CatalogEntry[]>,
  ]);
  const [characters, floors, walls, furnitureSprites] = await Promise.all([
    decodeCharacters(index), decodeFloors(index), decodeWalls(index), decodeFurniture(catalog),
  ]);
  setCharacterTemplates(characters);
  setFloorSprites(floors);
  setWallSprites(walls);
  const loadedAssets = { catalog: catalog as any, sprites: furnitureSprites };
  buildDynamicCatalog(loadedAssets);
  const layout = index.defaultLayout
    ? await fetch(`${BASE}${index.defaultLayout}`).then((r) => r.json())
    : null;
  _cache = { layout, loadedAssets };
  return _cache;
}
