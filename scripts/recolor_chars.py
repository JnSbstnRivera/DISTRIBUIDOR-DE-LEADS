# Recolorea la ropa de color de los personajes a AZUL WINDMAR,
# preservando piel, pelo (marrón), grises/blancos/negros (zapatos, detalles).
from PIL import Image
import colorsys, os

HERE = os.path.dirname(__file__)
DIR = os.path.join(HERE, "..", "public", "agents", "pixel")
WH_BLUE_H = 222 / 360.0  # tono azul Windmar

for i in range(6):
    p = os.path.join(DIR, f"char_{i}.png")
    if not os.path.exists(p):
        continue
    im = Image.open(p).convert("RGBA")
    px = im.load()
    W, H = im.size
    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if a < 8:
                continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            hue = h * 360
            # piel / pelo marrón: dejar igual
            if 12 <= hue <= 50 and s > 0.18 and v > 0.25:
                continue
            # gris / blanco / negro y contornos oscuros: dejar
            if s < 0.30 or v < 0.30:
                continue
            # ropa de color -> azul Windmar claro y nítido (no navy)
            nr, ng, nb = colorsys.hsv_to_rgb(WH_BLUE_H, 0.62, max(v, 0.52))
            px[x, y] = (int(nr * 255), int(ng * 255), int(nb * 255), a)
    im.save(p)
    print("recolor", f"char_{i}.png")
print("Listo: ropa -> azul Windmar")
