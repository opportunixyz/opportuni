"use client";

import { useEffect, useRef, useState } from "react";

// Widget de Cloudflare Turnstile. Casi siempre es invisible: solo aparece si
// Cloudflare necesita que la persona toque algo. Sin la site key no hace nada.

export const SITE_KEY = (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "").trim();

type Api = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};

let cargando: Promise<Api> | null = null;

function cargarApi(): Promise<Api> {
  const w = window as unknown as { turnstile?: Api };
  if (w.turnstile) return Promise.resolve(w.turnstile);
  if (!cargando) {
    cargando = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true;
      s.onload = () => (w.turnstile ? resolve(w.turnstile) : reject(new Error("sin turnstile")));
      s.onerror = () => {
        cargando = null;
        reject(new Error("no cargó turnstile"));
      };
      document.head.appendChild(s);
    });
  }
  return cargando;
}

/**
 * `onToken` recibe el token (o null si venció). `onFalla` avisa si el widget
 * no pudo cargar o dar token, para ofrecer la vacante sin pasaporte.
 * `reinicio` cambia para pedir un token nuevo (cada token sirve una vez).
 */
export default function Turnstile({
  onToken,
  onFalla,
  reinicio = 0,
}: {
  onToken: (token: string | null) => void;
  onFalla: () => void;
  reinicio?: number;
}) {
  const caja = useRef<HTMLDivElement>(null);
  const id = useRef<string | null>(null);
  const avisos = useRef({ onToken, onFalla });
  avisos.current = { onToken, onFalla };

  useEffect(() => {
    if (!SITE_KEY || !caja.current) return;
    let vivo = true;
    cargarApi()
      .then((api) => {
        if (!vivo || !caja.current) return;
        id.current = api.render(caja.current, {
          sitekey: SITE_KEY,
          appearance: "interaction-only",
          language: "es",
          size: "flexible",
          "refresh-expired": "auto",
          callback: (t: string) => avisos.current.onToken(t),
          "expired-callback": () => avisos.current.onToken(null),
          "error-callback": () => avisos.current.onFalla(),
        });
      })
      .catch(() => vivo && avisos.current.onFalla());
    return () => {
      vivo = false;
      const w = window as unknown as { turnstile?: Api };
      if (id.current && w.turnstile) w.turnstile.remove(id.current);
      id.current = null;
    };
  }, []);

  useEffect(() => {
    const w = window as unknown as { turnstile?: Api };
    if (reinicio && id.current && w.turnstile) {
      avisos.current.onToken(null);
      w.turnstile.reset(id.current);
    }
  }, [reinicio]);

  if (!SITE_KEY) return null;
  return <div ref={caja} className="mt-4" />;
}

/**
 * Estado de Turnstile para un formulario: el token, si todavía se espera, y
 * si se atoró (no cargó o tarda más de 10 s) para ofrecer la vacante sin
 * pasaporte.
 */
export function useTurnstile() {
  const [token, setToken] = useState<string | null>(null);
  const [falla, setFalla] = useState(false);
  const [lento, setLento] = useState(false);
  const [reinicio, setReinicio] = useState(0);

  useEffect(() => {
    if (!SITE_KEY) return;
    const t = setTimeout(() => setLento(true), 10_000);
    return () => clearTimeout(t);
  }, []);

  return {
    token,
    esperando: !!SITE_KEY && !token && !falla,
    atorado: !!SITE_KEY && !token && (falla || lento),
    /** Cada token sirve una vez: tras cualquier respuesta de error, pedir otro. */
    renovar: () => setReinicio((n) => n + 1),
    widget: <Turnstile onToken={setToken} onFalla={() => setFalla(true)} reinicio={reinicio} />,
  };
}
