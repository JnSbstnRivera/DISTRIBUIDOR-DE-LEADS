# Convierte el TopoJSON de municipios de PR a paths SVG + zona (desde seed.json)
import json, math, unicodedata, os

HERE = os.path.dirname(__file__)
SCRATCH = json.load(open(os.path.join(HERE, "..", "..", "pr_muni_local.json"), encoding="utf-8")) \
    if os.path.exists(os.path.join(HERE, "..", "..", "pr_muni_local.json")) else None

TOPO_PATH = os.environ.get("PR_TOPO", "pr_muni.json")
topo = json.load(open(TOPO_PATH, encoding="utf-8"))

# ---- decode topojson ----
tf = topo["transform"]
sx, sy = tf["scale"]; tx, ty = tf["translate"]
arcs_raw = topo["arcs"]

def decode_arc(arc):
    pts = []
    x = y = 0
    for dx, dy in arc:
        x += dx; y += dy
        pts.append((x * sx + tx, y * sy + ty))
    return pts

arcs = [decode_arc(a) for a in arcs_raw]

def arc_coords(idx):
    if idx >= 0:
        return arcs[idx]
    return list(reversed(arcs[~idx]))

def ring_coords(ring):
    coords = []
    for idx in ring:
        seg = arc_coords(idx)
        if coords:
            coords.extend(seg[1:])
        else:
            coords.extend(seg)
    return coords

obj_key = list(topo["objects"].keys())[0]
geoms = topo["objects"][obj_key]["geometries"]

# polygons: list of (name, [rings]) ; ring = list of (lon,lat)
features = []
all_pts = []
for g in geoms:
    name = g["properties"]["NAME"]
    typ = g["type"]
    polys = []
    if typ == "Polygon":
        polys = [g["arcs"]]
    elif typ == "MultiPolygon":
        polys = g["arcs"]
    rings = []
    for poly in polys:
        for ring in poly:
            rc = ring_coords(ring)
            rings.append(rc)
            all_pts.extend(rc)
    features.append((name, rings))

# ---- projection (equirectangular con corrección de aspecto) ----
lons = [p[0] for p in all_pts]; lats = [p[1] for p in all_pts]
lat_mid = (min(lats) + max(lats)) / 2
kx = math.cos(math.radians(lat_mid))
def proj(lon, lat):
    return (lon * kx, -lat)
pp = [proj(lo, la) for lo, la in all_pts]
pxs = [p[0] for p in pp]; pys = [p[1] for p in pp]
pxmin, pxmax = min(pxs), max(pxs)
pymin, pymax = min(pys), max(pys)
W = 1000.0
scale = W / (pxmax - pxmin)
H = (pymax - pymin) * scale
def to_svg(lon, lat):
    px, py = proj(lon, lat)
    return ((px - pxmin) * scale, (py - pymin) * scale)

def ring_to_path(rc):
    d = ""
    for i, (lo, la) in enumerate(rc):
        x, y = to_svg(lo, la)
        d += ("M" if i == 0 else "L") + f"{x:.1f} {y:.1f}"
        d += " "
    return d + "Z"

# ---- zona desde seed.json ----
seed = json.load(open(os.path.join(HERE, "..", "data", "seed.json"), encoding="utf-8"))
def norm(s):
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return s.lower().strip().replace("  ", " ")
muni_zona = {norm(m["municipio"]): m["zona"] for m in seed["municipios"]}

out = []
unmatched = []
for name, rings in features:
    zona = muni_zona.get(norm(name))
    if zona is None:
        unmatched.append(name)
    d = " ".join(ring_to_path(rc) for rc in rings)
    out.append({"name": name, "zona": zona, "d": d})

result = {"viewBox": f"0 0 {W:.0f} {H:.0f}", "municipios": out}
outpath = os.path.join(HERE, "..", "data", "pr_map.json")
json.dump(result, open(outpath, "w", encoding="utf-8"), ensure_ascii=False)
print("written", outpath, "| municipios:", len(out), "| viewBox:", result["viewBox"])
print("unmatched (sin zona):", unmatched)
