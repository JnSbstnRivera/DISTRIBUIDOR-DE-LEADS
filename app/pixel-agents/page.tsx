"use client";

import dynamic from "next/dynamic";
import { Bot } from "lucide-react";
import { SectionTitle } from "@/components/ui";

// El motor canvas usa window/canvas al iniciar → solo cliente (sin prerender SSR).
const PixelOfficeHD = dynamic(() => import("@/components/PixelOfficeHD"), {
  ssr: false,
  loading: () => <div className="exec-card p-4 text-sm text-[var(--color-muted)]">Cargando oficina HD…</div>,
});

export default function PixelAgents() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Bot className="h-5 w-5 text-wh-orange" />
        <SectionTitle sub="Oficina pixel-art (motor del repo Pixel Agents), estática en su cuadro. Edítala desde el panel lateral y gestiona tus agentes abajo.">
          Pixel Agents
        </SectionTitle>
      </div>
      <PixelOfficeHD height={560} />
    </div>
  );
}
