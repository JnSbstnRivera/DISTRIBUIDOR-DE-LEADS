"use client";

import { useState } from "react";
import { Boxes } from "lucide-react";
import { SectionTitle } from "@/components/ui";
import PixelOfficeCanvas from "@/components/PixelOfficeCanvas";

export default function OficinaHD() {
  const [n, setN] = useState(6);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Boxes className="h-5 w-5 text-wh-orange" />
        <SectionTitle sub="Oficina HD con el motor canvas del repo Pixel Agents: paredes autotile, pisos, pathfinding y agentes de perfil tecleando.">
          Oficina HD
        </SectionTitle>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className="font-semibold text-[var(--color-muted)]">Agentes:</span>
        {[4, 6, 8, 10].map((v) => (
          <button
            key={v}
            onClick={() => setN(v)}
            className={`rounded-full px-3 py-1 font-bold transition ${n === v ? "bg-wh-orange text-white shadow-orange" : "border border-[var(--color-line)] text-[var(--color-muted)] hover:text-[var(--color-ink)]"}`}
          >
            {v}
          </button>
        ))}
      </div>
      <PixelOfficeCanvas key={n} agentCount={n} height={720} />
      <p className="text-[11px] text-[var(--color-muted)]">
        Motor portado del repo (engine/sprites/layout/colorize). Si algo se ve raro, mándame una captura y lo ajusto.
      </p>
    </div>
  );
}
