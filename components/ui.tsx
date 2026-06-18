"use client";

import React from "react";

export const ZONA_NOMBRE: Record<string, string> = {
  SJ1: "San Juan 1",
  SJ2: "San Juan 2 (Caguas)",
  HAT: "Hatillo",
  PON: "Ponce",
  MAYA: "Mayagüez",
  COR: "Cordillera",
};

// Acentos por zona — derivados de la paleta Windmar, con contraste sobre blanco
export const ZONA_COLOR: Record<string, string> = {
  SJ1: "#e07d00", // naranja (oscurecido para legibilidad sobre blanco)
  SJ2: "#1d429b", // azul Windmar
  HAT: "#0f9d58", // verde
  PON: "#7c3aed", // morado
  MAYA: "#0891b2", // cyan
  COR: "#dc2626", // rojo
};

export function StatCard({
  label,
  value,
  sub,
  accent = "#e07d00",
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="exec-card p-4">
      <div className="exec-label">{label}</div>
      <div className="kpi-number mt-1 text-3xl font-black" style={{ color: accent }}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-[var(--color-muted)]">{sub}</div>}
    </div>
  );
}

export function ZonaBadge({ z }: { z: string }) {
  const color = ZONA_COLOR[z] ?? "#6d6e71";
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold"
      style={{ background: `${color}15`, color, border: `1px solid ${color}40` }}
    >
      {ZONA_NOMBRE[z] ?? z}
    </span>
  );
}

export function SectionTitle({
  children,
  sub,
}: {
  children: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="mb-5">
      <h1 className="text-2xl font-black uppercase tracking-tight text-[var(--color-ink)]">
        {children}
      </h1>
      {sub && <p className="mt-1 text-sm text-[var(--color-muted)]">{sub}</p>}
    </div>
  );
}
