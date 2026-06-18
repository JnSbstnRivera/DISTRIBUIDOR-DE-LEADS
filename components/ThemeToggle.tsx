"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

type ViewTransition = { ready: Promise<void> };
type DocumentWithViewTransition = Document & {
  startViewTransition?: (callback: () => void) => ViewTransition;
};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);

  // Placeholder del mismo tamaño para evitar salto de layout antes de hidratar
  if (!mounted) return <div className="h-9 w-9" />;

  const isDark = theme === "dark";

  function toggleTheme() {
    const nextTheme = isDark ? "light" : "dark";
    const doc = document as DocumentWithViewTransition;
    const button = buttonRef.current;

    // Fallback: sin View Transitions o sin ref → cambio plano (sin bug)
    if (!doc.startViewTransition || !button) {
      setTheme(nextTheme);
      return;
    }

    // El círculo nace del centro del botón
    const rect = button.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    doc.documentElement.style.setProperty("--theme-x", `${x}px`);
    doc.documentElement.style.setProperty("--theme-y", `${y}px`);
    doc.documentElement.style.setProperty("--theme-r", `${endRadius}px`);

    doc.startViewTransition(() => {
      flushSync(() => setTheme(nextTheme));
    });
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] text-wh-orange transition hover:border-wh-orange/50"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
