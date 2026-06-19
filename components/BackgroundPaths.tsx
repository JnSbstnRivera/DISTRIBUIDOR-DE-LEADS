"use client";

import { motion } from "framer-motion";

// Adaptación del patrón "Background Paths" (kokonutd / 21st.dev) con colores Windmar.
function FloatingPaths({ position, color }: { position: number; color: string }) {
  const paths = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${380 - i * 5 * position} -${189 + i * 6} -${
      312 - i * 5 * position
    } ${216 - i * 6} ${152 - i * 5 * position} ${343 - i * 6}C${616 - i * 5 * position} ${
      470 - i * 6
    } ${684 - i * 5 * position} ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    width: 0.5 + i * 0.04,
  }));

  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 696 316"
      fill="none"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      {paths.map((p) => (
        <motion.path
          key={p.id}
          d={p.d}
          stroke={color}
          strokeWidth={p.width}
          strokeOpacity={0.08 + p.id * 0.025}
          initial={{ pathLength: 0.3, opacity: 0.5 }}
          animate={{ pathLength: 1, opacity: [0.2, 0.55, 0.2], pathOffset: [0, 1, 0] }}
          transition={{ duration: 18 + (p.id % 12) * 1.6, repeat: Infinity, ease: "linear" }}
        />
      ))}
    </svg>
  );
}

export default function BackgroundPaths() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <FloatingPaths position={1} color="#f89b24" />
      <FloatingPaths position={-1} color="#5b8def" />
    </div>
  );
}
