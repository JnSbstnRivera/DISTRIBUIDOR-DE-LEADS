"use client";

/* ── Paleta Windmar ── */
const C = {
  orange: "#F89B24",
  blue: "#1D429B",
  black: "#231F20",
  lblue: "#A6C3E6",
  grey: "#6D6E71",
  tgrey: "#A7A9AC",
  navy: "#21274E",
  beige: "#F6F1E6",
  skin: "#e7b48a",
  floorWork: "#e9e5dd",
  floorMgr: "#2e4f86",
  wall: "#1a2240",
};

export type Facing = "down" | "up" | "left" | "right";
export type AgentState = "walking" | "working" | "idle";

export type OfficeAgent = {
  id: string;
  nombre: string;
  sheet: string; // sprite (char_0..5)
  room: string; // work | meet | mgr
  x: number; // %
  y: number; // %
  tx: number;
  ty: number;
  desk: { x: number; y: number };
  zone: { x0: number; y0: number; x1: number; y1: number };
  state: AgentState;
  facing: Facing;
  frame: number;
  wait: number;
  goingDesk: boolean;
};

/* ── Sprite del agente (soporta hojas animation-ready del repo pixel-agents) ── */
type SheetMeta = {
  cols: number;
  rows: number;
  fw: number; // ancho del frame en px de la hoja
  fh: number; // alto del frame
  dispH: number; // alto de despliegue de la celda
  base: string; // carpeta del PNG
  dir: { down: number; up: number; left?: number; right?: number };
  walk: number[];
  idle: number;
  type?: number[]; // frames de "tecleando" (trabajando)
};

// char_0..5: animation-ready (7x3, 16x32). cols: walk1,walk2(idle),walk3,type1,type2,read1,read2
const CHAR: Omit<SheetMeta, "base"> = {
  cols: 7, rows: 3, fw: 16, fh: 32, dispH: 104,
  dir: { down: 0, up: 1, right: 2 }, walk: [0, 1, 2], idle: 1, type: [3, 4],
};

export const SHEET_META: Record<string, SheetMeta> = {
  char_0: { ...CHAR, base: "/agents/pixel/" },
  char_1: { ...CHAR, base: "/agents/pixel/" },
  char_2: { ...CHAR, base: "/agents/pixel/" },
  char_3: { ...CHAR, base: "/agents/pixel/" },
  char_4: { ...CHAR, base: "/agents/pixel/" },
  char_5: { ...CHAR, base: "/agents/pixel/" },
};

export function SpriteImg({
  sheet,
  facing = "down",
  frame = 0,
  walking = false,
  working = false,
  scale = 1,
}: {
  sheet: string;
  facing?: Facing;
  frame?: number;
  walking?: boolean;
  working?: boolean;
  scale?: number;
}) {
  const m = SHEET_META[sheet] || SHEET_META.char_0;
  const dispH = m.dispH * scale;
  const dispW = (dispH * m.fw) / m.fh;

  let row = m.dir.down;
  let flip = false;
  if (facing === "up") row = m.dir.up;
  else if (facing === "down") row = m.dir.down;
  else if (facing === "right") {
    if (m.dir.right != null) row = m.dir.right;
    else { row = m.dir.left!; flip = true; }
  } else if (facing === "left") {
    if (m.dir.left != null) row = m.dir.left;
    else { row = m.dir.right!; flip = true; }
  }

  const typeFrames = m.type ?? [m.idle];
  const col = working ? typeFrames[frame % typeFrames.length] : walking ? m.walk[frame % m.walk.length] : m.idle;
  // al trabajar, baja un poco para "sentarse" en la silla frente al PC
  const sitOffset = working ? dispH * 0.16 : 0;

  return (
    <div className="relative flex flex-col items-center" style={{ transform: flip ? "scaleX(-1)" : undefined }}>
      <div
        style={{
          width: dispW,
          height: dispH,
          transform: `translateY(${sitOffset}px)`,
          backgroundImage: `url(${m.base}${sheet}.png)`,
          backgroundSize: `${dispW * m.cols}px ${dispH * m.rows}px`,
          backgroundPosition: `-${col * dispW}px -${row * dispH}px`,
          imageRendering: "pixelated",
        }}
      />
      <div style={{ width: dispW * 0.55, height: 4, marginTop: -3, background: "rgba(0,0,0,.3)", borderRadius: 99, filter: "blur(1px)" }} />
    </div>
  );
}

/* ── Mobiliario real (sprites del repo pixel-agents) ── */
const OFF = "/agents/pixel/office/";
const FS = 2.6; // escala de los muebles

function Furn({ name, x, y, w, h, z = 2 }: { name: string; x: number; y: number; w: number; h: number; z?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={`${OFF}${name}.png`}
      alt=""
      className="absolute"
      style={{ left: `${x}%`, top: `${y}%`, width: w * FS, height: h * FS, imageRendering: "pixelated", zIndex: z }}
    />
  );
}
function LogoFrame({ x, y }: { x: number; y: number }) {
  return (
    <div className="absolute z-[2] grid place-items-center" style={{ left: `${x}%`, top: `${y}%`, width: 38, height: 26, background: "#fff", borderRadius: 2, border: `2px solid ${C.navy}` }}>
      <span style={{ color: C.blue, fontWeight: 900, fontSize: 14, lineHeight: 1 }}>W</span>
    </div>
  );
}

// piso texturizado con un tile real repetido
function Floor({ tile, ...s }: { tile: string } & React.CSSProperties) {
  return (
    <div
      className="absolute"
      style={{ backgroundImage: `url(${OFF}${tile}.png)`, backgroundSize: "44px 44px", imageRendering: "pixelated", borderRadius: 2, ...s }}
    />
  );
}

export default function PixelOffice({ agents }: { agents: OfficeAgent[] }) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-xl"
      style={{ aspectRatio: "1.9 / 1", background: C.wall, border: `5px solid ${C.navy}` }}
    >
      {/* Pisos / cuartos (tiles reales) */}
      <Floor tile="floor_0" left="2%" top="4%" width="58%" height="92%" />
      <Floor tile="floor_3" left="63%" top="4%" width="35%" height="44%" />
      <Floor tile="floor_5" left="63%" top="52%" width="35%" height="44%" />
      {/* divisores de pared */}
      <div className="absolute" style={{ left: "60.5%", top: "2%", width: 6, height: "96%", background: C.navy }} />
      <div className="absolute" style={{ left: "63%", top: "48%", width: "35%", height: 6, background: C.navy }} />

      {/* Letreros Windmar Home */}
      <div className="absolute z-[3] flex items-center gap-1 rounded-sm px-2 py-0.5" style={{ left: "21%", top: "1.5%", background: C.navy, border: `1px solid ${C.orange}` }}>
        <span style={{ color: C.orange, fontWeight: 900, fontSize: 11, letterSpacing: 1 }}>WINDMAR</span>
        <span style={{ color: "#fff", fontWeight: 900, fontSize: 11, letterSpacing: 1 }}>HOME</span>
      </div>
      <div className="absolute z-[3] rounded-sm px-1.5 py-0.5" style={{ left: "74%", top: "50.5%", background: C.navy, border: `1px solid ${C.orange}` }}>
        <span style={{ color: "#fff", fontWeight: 900, fontSize: 9, letterSpacing: 1 }}>WINDMAR HOME</span>
      </div>

      {/* Workspace */}
      <Furn name="DOUBLE_BOOKSHELF" x={6} y={5} w={32} h={32} />
      <Furn name="DOUBLE_BOOKSHELF" x={22} y={5} w={32} h={32} />
      <Furn name="BOOKSHELF" x={38} y={6} w={32} h={16} />
      <Furn name="COFFEE" x={47} y={6} w={16} h={16} />
      <Furn name="CLOCK" x={52} y={4} w={16} h={32} />
      <LogoFrame x={43} y={6} />
      <Furn name="DESK_FRONT" x={9} y={28} w={48} h={32} />
      <Furn name="DESK_FRONT" x={36} y={28} w={48} h={32} />
      <Furn name="DESK_FRONT" x={9} y={64} w={48} h={32} />
      <Furn name="DESK_FRONT" x={36} y={64} w={48} h={32} />
      <Furn name="PLANT" x={3} y={84} w={16} h={32} />
      <Furn name="LARGE_PLANT" x={50} y={80} w={32} h={48} />

      {/* Meeting room */}
      <LogoFrame x={80} y={7} />
      <Furn name="TABLE_FRONT" x={77} y={20} w={48} h={64} z={2} />
      <Furn name="CUSHIONED_CHAIR_FRONT" x={72} y={26} w={16} h={16} />
      <Furn name="CUSHIONED_CHAIR_FRONT" x={90} y={26} w={16} h={16} />
      <Furn name="PLANT" x={66} y={10} w={16} h={32} />

      {/* Manager room */}
      <Furn name="LARGE_PAINTING" x={79} y={52} w={32} h={32} />
      <Furn name="DESK_FRONT" x={76} y={70} w={48} h={32} />
      <Furn name="BOOKSHELF" x={65} y={58} w={32} h={16} />
      <Furn name="BOOKSHELF" x={88} y={58} w={32} h={16} />
      <Furn name="LARGE_PLANT" x={65} y={82} w={32} h={48} />

      {/* Agentes */}
      {agents.map((a) => (
        <div
          key={a.id}
          className="absolute z-10"
          style={{ left: `${a.x}%`, top: `${a.y}%`, transform: "translate(-50%,-100%)", transition: "left .12s linear, top .12s linear" }}
        >
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/65 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {a.nombre}
          </div>
          <SpriteImg sheet={a.sheet} facing={a.facing} frame={a.frame} walking={a.state === "walking"} working={a.state === "working"} />
        </div>
      ))}
    </div>
  );
}
