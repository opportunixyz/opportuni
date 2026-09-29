"use client";

import { useState } from "react";
import { Shell } from "../_componentes/ui";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [err, setErr] = useState("");

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setErr("");
    try {
      const r = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) {
        window.location.href = "/admin";
        return;
      }
      setErr(d.error || "No se pudo entrar.");
    } catch {
      setErr("No se pudo entrar. Revisa tu conexión.");
    }
    setEnviando(false);
  };

  return (
    <Shell>
      <form onSubmit={entrar} className="bento p-8" style={{ background: "white", marginTop: 60 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-opportuni.png" alt="Opportuni" style={{ height: 32 }} className="mx-auto mb-4" />
        <h1 className="text-2xl font-black mb-1 text-center">Dashboard privado</h1>
        <p className="text-sm text-gray-500 mb-5 text-center">Solo para el equipo de Opportuni.</p>
        <label htmlFor="pw" className="block text-xs font-bold mb-1">
          Contraseña
        </label>
        <input
          id="pw"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input-bento mb-4"
          autoFocus
        />
        {err && <p className="text-sm text-red-600 mb-3 text-center">{err}</p>}
        <button type="submit" disabled={!password || enviando} className="btn-rosa w-full text-center disabled:opacity-50">
          {enviando ? "Entrando…" : "Entrar ✦"}
        </button>
      </form>
    </Shell>
  );
}
