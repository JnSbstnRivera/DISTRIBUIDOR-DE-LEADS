"use client";

// M4 — Lienzo del motor canvas portado del repo Pixel Agents.
// Carga los assets, construye el OfficeState desde el default-layout, crea agentes
// y corre el game loop (paredes autotile, pisos, pathfinding, perfil de lado).
import { useEffect, useRef, useState } from "react";
import { OfficeState } from "@/lib/pixel/engine/officeState";
import { startGameLoop } from "@/lib/pixel/engine/gameLoop";
import { renderFrame } from "@/lib/pixel/engine/renderer";
import { loadPixelAssets } from "@/lib/pixel/loadAssets";

export default function PixelOfficeCanvas({ agentCount = 6, height = 460 }: { agentCount?: number; height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let stop = () => {};
    let cancelled = false;
    let onResize = () => {};

    (async () => {
      try {
        const layout = await loadPixelAssets();
        if (cancelled || !layout) { if (!layout) setErr("No se pudo cargar el layout."); return; }
        const os = new OfficeState(layout);
        for (let i = 0; i < agentCount; i++) os.addAgent(i);

        const canvas = canvasRef.current, wrap = wrapRef.current;
        if (!canvas || !wrap) return;

        const resize = () => {
          const r = wrap.getBoundingClientRect();
          const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
          canvas.width = Math.max(1, Math.floor(r.width * dpr));
          canvas.height = Math.max(1, Math.floor(r.height * dpr));
        };
        resize();
        onResize = resize;
        window.addEventListener("resize", resize);
        setReady(true);

        const TILE = 16;
        const ctx0 = canvas.getContext("2d")!;
        const draw = (ctx: CanvasRenderingContext2D) => {
          const lay = os.getLayout();
          // zoom = device-pixels por sprite-pixel (entero) que entra en el lienzo
          const zoom = Math.max(1, Math.floor(Math.min(
            canvas.width / (lay.cols * TILE),
            canvas.height / (lay.rows * TILE),
          )));
          renderFrame(
            ctx, canvas.width, canvas.height,
            os.tileMap, os.furniture, os.getCharacters(),
            zoom, 0, 0,
            undefined, undefined,
            lay.tileColors, lay.cols, lay.rows,
          );
        };
        draw(ctx0); // primer frame inmediato (visible aún con rAF congelado)
        stop = startGameLoop(canvas, { update: (dt) => os.update(dt), render: draw });
      } catch (e) {
        setErr(String((e as Error).message || e));
      }
    })();

    return () => { cancelled = true; stop(); window.removeEventListener("resize", onResize); };
  }, [agentCount]);

  return (
    <div ref={wrapRef} className="exec-card overflow-hidden p-0" style={{ width: "100%", height }}>
      {err && <div className="p-4 text-sm font-semibold text-red-500">Error cargando la oficina: {err}</div>}
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", imageRendering: "pixelated", display: err ? "none" : "block" }}
      />
      {!ready && !err && <div className="p-4 text-sm text-[var(--color-muted)]">Cargando oficina HD…</div>}
    </div>
  );
}
