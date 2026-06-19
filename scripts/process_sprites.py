# Procesa las hojas de sprites de ChatGPT:
#  1) quita el fondo blanco (flood-fill desde los bordes -> transparente)
#  2) recorta cada frame y lo normaliza (bottom-center) a una celda pareja
#  3) reensambla una hoja limpia 4col x 4row lista para el motor
from PIL import Image, ImageDraw
import os

HERE = os.path.dirname(__file__)
AG = os.path.join(HERE, "..", "public", "agents")
OUT = os.path.join(AG, "clean")
os.makedirs(OUT, exist_ok=True)

SHEETS = {
    "agent1": "SPRITE SHEET AGENT 1.png",
    "agent2": "SPRITE SHEET AGENT 2.png",
    "agent3": "SPRITE SHEET AGENT 3.png",
    "agent4": "SPRITE SHEET AGENT 4.png",
    "leadH": "SPRITE SHEET AGENT DOCUMENTOS HOMBRE.png",
    "leadM": "SPRITE SHEET AGENT DOCUMENTOS MUJER.png",
}

COLS, ROWS = 4, 4
CELL_W, CELL_H = 64, 96   # celda limpia destino
PAD = 4

def remove_white(img):
    img = img.convert("RGBA")
    # flood fill desde las 4 esquinas y puntos medios de los bordes
    w, h = img.size
    seeds = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1),
             (w // 2, 0), (w // 2, h - 1), (0, h // 2), (w - 1, h // 2)]
    for s in seeds:
        try:
            ImageDraw.floodfill(img, s, (0, 0, 0, 0), thresh=60)
        except Exception:
            pass
    # limpieza extra: pixeles casi-blancos restantes con alpha alto en los bordes
    return img

def normalize_cell(cell):
    bbox = cell.getbbox()
    if not bbox:
        return Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
    crop = cell.crop(bbox)
    cw, ch = crop.size
    scale = min((CELL_W - PAD) / cw, (CELL_H - PAD) / ch)
    nw, nh = max(1, int(cw * scale)), max(1, int(ch * scale))
    crop = crop.resize((nw, nh), Image.NEAREST)
    out = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
    # bottom-centered
    out.paste(crop, ((CELL_W - nw) // 2, CELL_H - nh - 1), crop)
    return out

for key, fn in SHEETS.items():
    path = os.path.join(AG, fn)
    if not os.path.exists(path):
        print("FALTA:", fn); continue
    img = remove_white(Image.open(path))
    W, H = img.size
    cw, ch = W // COLS, H // ROWS
    sheet = Image.new("RGBA", (CELL_W * COLS, CELL_H * ROWS), (0, 0, 0, 0))
    for r in range(ROWS):
        for c in range(COLS):
            cell = img.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch))
            norm = normalize_cell(cell)
            sheet.paste(norm, (c * CELL_W, r * CELL_H), norm)
    sheet.save(os.path.join(OUT, key + ".png"))
    print("OK", key, "->", sheet.size)

print("Listo. Celdas:", CELL_W, "x", CELL_H, "| hoja:", CELL_W * COLS, "x", CELL_H * ROWS)
