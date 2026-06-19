"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Send,
  CalendarClock,
  Map,
  BadgeCheck,
  Users,
  Ban,
  History,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

const LINKS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/asignar", label: "Asignar", icon: Send },
  { href: "/hoy", label: "Hoy", icon: CalendarClock },
  { href: "/cumplimiento", label: "Cumplimiento", icon: BadgeCheck },
  { href: "/mapa", label: "Mapa", icon: Map },
  { href: "/gerentes", label: "Gerentes", icon: Users },
  { href: "/blacklist", label: "Black List", icon: Ban },
  { href: "/historial", label: "Historial", icon: History },
];

export default function Nav() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-line)] bg-[var(--color-surface)]/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2.5">
        <Link href="/" className="group flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://i.postimg.cc/6T5J2v2G/windmar-logo.png"
            alt="Windmar Home"
            className="h-[88px] w-auto transition-transform duration-300 group-hover:scale-105"
          />
          <div className="hidden leading-none sm:block">
            <div className="text-base font-black uppercase tracking-tight text-[var(--color-ink)]">
              Distribuidor
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-wh-grey">
              Leads · Windmar Home
            </div>
          </div>
        </Link>
        <nav className="ml-auto flex flex-wrap items-center gap-1 pr-2">
          {LINKS.map((l) => {
            const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                  active
                    ? "text-wh-orange"
                    : "text-wh-grey hover:bg-[var(--color-subtle)] hover:text-[var(--color-ink)]"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 -z-10 rounded-lg bg-wh-orange/12 ring-1 ring-wh-orange/30"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon className="h-4 w-4" />
                <span className="hidden md:inline">{l.label}</span>
              </Link>
            );
          })}
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}
