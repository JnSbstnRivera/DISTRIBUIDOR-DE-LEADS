"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Send,
  CalendarClock,
  CalendarCheck,
  Radio,
  BadgeCheck,
  Map,
  Users,
  Ban,
  History,
  Menu,
  X,
  LogOut,
  Bot,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

const GROUPS = [
  {
    label: "Operación",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/citas", label: "Citas (Zoho)", icon: CalendarCheck },
      { href: "/asignar", label: "Asignar Lead", icon: Send },
      { href: "/hoy", label: "Distribución Hoy", icon: CalendarClock },
      { href: "/canales", label: "Canales", icon: Radio },
    ],
  },
  {
    label: "Análisis",
    items: [
      { href: "/cumplimiento", label: "Cumplimiento", icon: BadgeCheck },
      { href: "/mapa", label: "Mapa de Zonas", icon: Map },
    ],
  },
  {
    label: "Gestión",
    items: [
      { href: "/gerentes", label: "Gerentes", icon: Users },
      { href: "/blacklist", label: "Black List", icon: Ban },
    ],
  },
  {
    label: "Registro",
    items: [{ href: "/historial", label: "Historial", icon: History }],
  },
];

function isActive(path: string, href: string) {
  return href === "/" ? path === "/" : path.startsWith(href);
}

function NavList({ path, onNavigate }: { path: string; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {GROUPS.map((g) => (
        <div key={g.label}>
          <div className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-muted)]">
            {g.label}
          </div>
          <div className="space-y-0.5">
            {g.items.map((l) => {
              const active = isActive(path, l.href);
              const Icon = l.icon;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={onNavigate}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    active
                      ? "bg-wh-orange/12 text-wh-orange ring-1 ring-wh-orange/30"
                      : "text-[var(--color-ink-soft)] hover:bg-[var(--color-subtle)] hover:text-[var(--color-ink)]"
                  }`}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  {l.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-3 px-4 py-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="https://i.postimg.cc/6T5J2v2G/windmar-logo.png"
        alt="Windmar Home"
        className="h-16 w-auto drop-shadow-[0_0_10px_rgba(248,155,36,0.35)]"
      />
      <div className="leading-none">
        <div className="text-sm font-black uppercase tracking-tight text-[var(--color-ink)]">Distribuidor</div>
        <div className="text-[9px] uppercase tracking-[0.2em] text-wh-grey">Windmar Home</div>
      </div>
    </Link>
  );
}

async function logout() {
  await fetch("/api/logout", { method: "POST" });
  window.location.href = "/login";
}

export default function Sidebar() {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  // cerrar el drawer al cambiar de ruta
  useEffect(() => setOpen(false), [path]);

  if (path === "/login") return null;

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-[var(--color-line)] bg-[var(--color-surface)]/80 backdrop-blur-md lg:flex">
        <Brand />
        <NavList path={path} />
        <div className="space-y-1 border-t border-[var(--color-line)] px-3 py-3">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-[var(--color-ink-soft)] transition hover:bg-red-500/10 hover:text-red-500"
          >
            <LogOut className="h-[18px] w-[18px]" /> Cerrar sesión
          </button>
          <div className="flex items-center justify-between px-3 pt-1">
            {/* easter egg: acceso discreto a Pixel Agents (solo el robot) */}
            <Link
              href="/pixel-agents"
              aria-label="Pixel Agents"
              className="grid h-6 w-6 place-items-center rounded text-[var(--color-muted)] opacity-25 transition hover:scale-110 hover:text-wh-orange hover:opacity-100"
            >
              <Bot className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-widest text-wh-grey">Tema</span>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-[var(--color-line)] bg-[var(--color-surface)]/85 px-4 py-2.5 backdrop-blur-md lg:hidden">
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
          className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--color-line)] text-[var(--color-ink)]"
        >
          <Menu className="h-5 w-5" />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="https://i.postimg.cc/6T5J2v2G/windmar-logo.png" alt="Windmar Home" className="h-8 w-auto" />
        <span className="text-sm font-black uppercase tracking-tight text-[var(--color-ink)]">Distribuidor</span>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="animate-in-up absolute left-0 top-0 flex h-full w-72 flex-col border-r border-[var(--color-line)] bg-[var(--color-surface)] shadow-2xl">
            <div className="flex items-center justify-between">
              <Brand />
              <button
                onClick={() => setOpen(false)}
                aria-label="Cerrar menú"
                className="mr-3 grid h-9 w-9 place-items-center rounded-lg text-[var(--color-muted)] hover:text-[var(--color-ink)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavList path={path} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
