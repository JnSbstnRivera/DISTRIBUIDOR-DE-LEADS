"use client";

import { useEffect, useRef, useState } from "react";

// Contador animado con easeOutQuart (mismo patrón que las dashboards de TM/VASS/Ventas)
export function AnimatedCounter({
  value,
  duration = 1100,
  decimals = 0,
  suffix = "",
}: {
  value: number;
  duration?: number;
  decimals?: number;
  suffix?: string;
}) {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const from = prev.current;
    const change = value - from;
    let start: number | null = null;
    function tick(ts: number) {
      if (start == null) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 4);
      setDisplay(from + change * eased);
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else prev.current = value;
    }
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current != null) cancelAnimationFrame(raf.current);
    };
  }, [value, duration]);

  return (
    <span className="tabular-nums">
      {display.toLocaleString("es-PR", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}
