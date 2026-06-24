// Genera public/assets/asset-index.json y furniture-catalog.json para el motor
// canvas portado (Pixel Agents). Porta flattenManifest + buildFurnitureCatalog +
// buildAssetIndex del repo (core/src/assets/build.ts + manifestUtils.ts).
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.join(__dirname, "..", "public", "assets");

// ── flattenManifest (port 1:1 del repo) ──
function flattenManifest(node, inherited) {
  if (node.type === "asset") {
    const orientation = node.orientation ?? inherited.orientation;
    const state = node.state ?? inherited.state;
    return [{
      id: node.id, name: inherited.name, label: inherited.name, category: inherited.category,
      file: node.file, width: node.width, height: node.height,
      footprintW: node.footprintW, footprintH: node.footprintH,
      isDesk: inherited.category === "desks",
      canPlaceOnWalls: inherited.canPlaceOnWalls, canPlaceOnSurfaces: inherited.canPlaceOnSurfaces,
      backgroundTiles: inherited.backgroundTiles, groupId: inherited.groupId,
      ...(orientation ? { orientation } : {}),
      ...(state ? { state } : {}),
      ...(node.mirrorSide ? { mirrorSide: true } : {}),
      ...(inherited.rotationScheme ? { rotationScheme: inherited.rotationScheme } : {}),
      ...(inherited.animationGroup ? { animationGroup: inherited.animationGroup } : {}),
      ...(node.frame !== undefined ? { frame: node.frame } : {}),
    }];
  }
  const results = [];
  for (const member of node.members) {
    const childProps = { ...inherited };
    if (node.groupType === "rotation" && node.rotationScheme) childProps.rotationScheme = node.rotationScheme;
    if (node.groupType === "state") {
      if (node.orientation) childProps.orientation = node.orientation;
      if (node.state) childProps.state = node.state;
    }
    if (node.groupType === "animation") {
      const orient = node.orientation ?? inherited.orientation ?? "";
      const st = node.state ?? inherited.state ?? "";
      childProps.animationGroup = `${inherited.groupId}_${orient}_${st}`.toUpperCase();
      if (node.state) childProps.state = node.state;
    }
    if (node.orientation && !childProps.orientation) childProps.orientation = node.orientation;
    results.push(...flattenManifest(member, childProps));
  }
  return results;
}

// ── furniture-catalog.json ──
function buildFurnitureCatalog() {
  const dir = path.join(ASSETS, "furniture");
  const catalog = [];
  if (!fs.existsSync(dir)) return catalog;
  const folders = fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
  for (const folder of folders) {
    const mp = path.join(dir, folder, "manifest.json");
    if (!fs.existsSync(mp)) continue;
    const m = JSON.parse(fs.readFileSync(mp, "utf-8"));
    if (m.type === "asset") {
      if (m.width == null || m.height == null || m.footprintW == null || m.footprintH == null) continue;
      const file = m.file ?? `${m.id}.png`;
      catalog.push({
        id: m.id, name: m.name, label: m.name, category: m.category, file,
        furniturePath: `furniture/${folder}/${file}`, width: m.width, height: m.height,
        footprintW: m.footprintW, footprintH: m.footprintH, isDesk: m.category === "desks",
        canPlaceOnWalls: m.canPlaceOnWalls, canPlaceOnSurfaces: m.canPlaceOnSurfaces,
        backgroundTiles: m.backgroundTiles, groupId: m.id,
      });
    } else if (m.members) {
      const inherited = {
        groupId: m.id, name: m.name, category: m.category, canPlaceOnWalls: m.canPlaceOnWalls,
        canPlaceOnSurfaces: m.canPlaceOnSurfaces, backgroundTiles: m.backgroundTiles,
        ...(m.rotationScheme ? { rotationScheme: m.rotationScheme } : {}),
      };
      const root = { type: "group", groupType: m.groupType, rotationScheme: m.rotationScheme, members: m.members };
      for (const asset of flattenManifest(root, inherited)) {
        catalog.push({ ...asset, furniturePath: `furniture/${folder}/${asset.file}` });
      }
    }
  }
  return catalog;
}

// ── asset-index.json ──
function listSorted(subdir, pattern) {
  const dir = path.join(ASSETS, subdir);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => pattern.test(f))
    .sort((a, b) => (parseInt(/(\d+)/.exec(a)?.[1] ?? "0", 10)) - (parseInt(/(\d+)/.exec(b)?.[1] ?? "0", 10)));
}
function buildAssetIndex() {
  let defaultLayout = null, bestRev = 0;
  for (const f of fs.readdirSync(ASSETS)) {
    const mm = /^default-layout-(\d+)\.json$/.exec(f);
    if (mm && +mm[1] >= bestRev) { bestRev = +mm[1]; defaultLayout = f; }
  }
  return {
    characters: listSorted("characters", /^char_\d+\.png$/),
    floors: listSorted("floors", /^floor_\d+\.png$/),
    walls: listSorted("walls", /^wall_\d+\.png$/),
    defaultLayout,
  };
}

const catalog = buildFurnitureCatalog();
const index = buildAssetIndex();
fs.writeFileSync(path.join(ASSETS, "furniture-catalog.json"), JSON.stringify(catalog, null, 2));
fs.writeFileSync(path.join(ASSETS, "asset-index.json"), JSON.stringify(index, null, 2));
console.log(`furniture-catalog.json: ${catalog.length} assets`);
console.log(`asset-index.json:`, JSON.stringify(index));
