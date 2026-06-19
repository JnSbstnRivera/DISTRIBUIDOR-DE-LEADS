"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, LogIn, User, Lock } from "lucide-react";
import BackgroundPaths from "@/components/BackgroundPaths";

export default function Login() {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const r = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario, password }),
    });
    if (r.ok) {
      window.location.href = "/";
    } else {
      const j = await r.json().catch(() => ({}));
      setError(j.error || "Credenciales inválidas");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center overflow-hidden bg-[#0e1326] px-4">
      {/* Fondo animado Windmar */}
      <BackgroundPaths />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(80% 60% at 50% 0%, rgba(248,155,36,0.10), transparent 60%), radial-gradient(80% 60% at 50% 100%, rgba(29,66,155,0.22), transparent 60%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-sm rounded-2xl border border-white/12 bg-white/[0.04] p-8 backdrop-blur-xl"
        style={{ boxShadow: "0 24px 70px -20px rgba(0,0,0,0.6)" }}
      >
        <div className="mb-6 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://i.postimg.cc/6T5J2v2G/windmar-logo.png"
            alt="Windmar Home"
            className="mb-4 h-14 w-auto drop-shadow-[0_0_18px_rgba(248,155,36,0.45)]"
          />
          <h1 className="text-2xl font-black tracking-tight text-white">
            Distribuidor de <span style={{ color: "#f89b24" }}>Leads</span>
          </h1>
          <p className="mt-1 text-sm text-slate-300">Inicia sesión para continuar</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-400">
              Usuario
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="ADMIN"
                autoComplete="username"
                className="w-full rounded-lg border border-white/12 bg-white/[0.06] py-2.5 pl-9 pr-3 text-white placeholder-slate-500 outline-none transition focus:border-wh-orange focus:ring-2 focus:ring-wh-orange/30"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-400">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                autoComplete="current-password"
                className="w-full rounded-lg border border-white/12 bg-white/[0.06] py-2.5 pl-9 pr-10 text-white placeholder-slate-500 outline-none transition focus:border-wh-orange focus:ring-2 focus:ring-wh-orange/30"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/15 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-wh-orange py-2.5 font-bold text-white transition hover:brightness-105 disabled:opacity-50"
            style={{ boxShadow: "0 8px 22px -6px rgba(248,155,36,0.6)" }}
          >
            <LogIn className="h-4 w-4" />
            {busy ? "Ingresando…" : "Iniciar sesión"}
          </button>
        </form>

        <p className="mt-6 text-center text-[11px] uppercase tracking-[0.2em] text-slate-500">
          Windmar Home · Telemercadeo
        </p>
      </motion.div>
    </div>
  );
}
