# Procesa las hojas de sprites de ChatGPT a hojas limpias y parejas:
#  1) quita el fondo blanco (flood-fill desde bordes -> transparente)
#  2) detecta cada frame por contenido (no por grilla fija)
#  3) normaliza todos a la MISMA altura, bottom-center, en celdas 64x96
from PIL import Image, ImageDraw
import os

HERE = os.path.dirname(__file__)
AG = os.path.join(HERE, "..", "public", "agents")
OUT = os.path.join(AG, "clean")
os.makedirs(OUT, exist_ok=True)

# nombre -> (archivo, cols, rows)  rows=1 => strip horizontal (auto-detecta frames)
SHEETS = {
    "agent1": ("SPRITE SHEET AGENT 1.png", 4, 4),
    "agent2": ("SPRITE SHEET AGENT 2.png", 4, 4),
    "agent3": ("SPRITE SHEET AGENT 3.png", 4, 4),
    "agent4": ("SPRITE SHEET AGENT 4.png", 4, 4),
    "leadH": ("SPRITE SHEET AGENT DOCUMENTOS HOMBRE.png", 6, 1),
    "leadM": ("SPRITE SHEET AGENT DOCUMENTOS MUJER.png", 6, 1),
}

CELL_W, CELL_H = 64, 96
TARGET_H = 86  # altura consistente del personaje

def remove_white(img):
    img = img.convert("RGBA")
    w, h = img.size
    seeds = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1),
             (w // 2, 0), (w // 2, h - 1), (0, h // 2), (w - 1, h // 2)]
    for s in seeds:
        try:
            ImageDraw.floodfill(img, s, (0, 0, 0, 0), thresh=60)
        except Exception:
            pass
    return img

def normalize(crop):
    out = Image.new("RGBA", (CELL_W, CELL_H), (0, 0, 0, 0))
    bbox = crop.getbbox()
    if not bbox:
        return out
    c = crop.crop(bbox)
    cw, ch = c.size
    scale = TARGET_H / ch
    if cw * scale > CELL_W - 2:
        scale = (CELL_W - 2) / cw
    nw, nh = max(1, int(cw * scale)), max(1, int(ch * scale))
    c = c.resize((nw, nh), Image.NEAREST)
    out.paste(c, ((CELL_W - nw) // 2, CELL_H - nh - 2), c)
    return out

def content_columns(img):
    a = img.split()[3]
    W, H = img.size
    return [1 if a.crop((x, 0, x + 1, H)).getbbox() else 0 for x in range(W)]

def segment(cols, min_run=10, min_gap=12):
    runs = []
    x, W = 0, len(cols)
    while x < W:
        if cols[x]:
            x0 = x
            while x < W and cols[x]:
                x += 1
            runs.append([x0, x])
        else:
            x += 1
    merged = []
    for r in runs:
        if merged and r[0] - merged[-1][1] < min_gap:
            merged[-1][1] = r[1]
        else:
            merged.append(r)
    return [(a, b) for a, b in merged if b - a >= min_run]

for key, (fn, COLS, ROWS) in SHEETS.items():
    path = os.path.join(AG, fn)
    if not os.path.exists(path):
        print("FALTA:", fn); continue
    img = remove_white(Image.open(path))
    W, H = img.size

    cw, ch = W // COLS, H // ROWS
    sheet = Image.new("RGBA", (CELL_W * COLS, CELL_H * ROWS), (0, 0, 0, 0))
    for r in range(ROWS):
        for c in range(COLS):
            norm = normalize(img.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch)))
            sheet.paste(norm, (c * CELL_W, r * CELL_H), norm)
    sheet.save(os.path.join(OUT, key + ".png"))
    print("OK", key, f"{COLS}x{ROWS} ->", sheet.size)

print("Listo. Celda:", CELL_W, "x", CELL_H, "| altura personaje:", TARGET_H)
