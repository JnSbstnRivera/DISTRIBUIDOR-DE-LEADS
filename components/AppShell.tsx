"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import AnimatedBackground from "@/components/AnimatedBackground";

// Rutas SIN chrome de admin (sin sidebar ni fondo animado): login y la vista del consultor.
// El consultor/gerente no ve la barra de navegación — esa es solo del admin.
const BARE = ["/login", "/consultor"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const bare = BARE.some((r) => pathname === r || pathname.startsWith(r + "/"));

  if (bare) return <>{children}</>;

  return (
    <>
      <AnimatedBackground />
      <Sidebar />
      <div className="lg:pl-64">
        <main className="mx-auto max-w-7xl px-4 pb-20 pt-6">{children}</main>
      </div>
    </>
  );
}
