"use client";

import { useEffect, useRef, useState } from "react";

// Widget de Cloudflare Turnstile. Casi siempre es invisible: solo aparece si
// Cloudflare necesita que la persona toque algo. Sin la site key no hace nada.

export const SITE_KEY = (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "").trim();

type Api = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
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
 * no pudo cargar o dar token. Para un token nuevo se vuelve a montar (key).
 */
export default function Turnstile({
  onToken,
  onFalla,
}: {
  onToken: (token: string | null) => void;
  onFalla: () => void;
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

  if (!SITE_KEY) return null;
  return <div ref={caja} className="mt-4" />;
}

/** Segundos que se espera a Cloudflare antes de dejar seguir sin su token. */
const ESPERA_MS = 8_000;

/**
 * Estado de Turnstile para un formulario. Mientras Cloudflare verifica, el
 * botón dice "Verificando…". Si falla o tarda más de 8 s, el botón se activa
 * igual y el pasaporte se crea "sin verificar" (el servidor lo deja con un
 * tope aparte y chico por hora). Nunca hay atajo a la vacante sin pasaporte.
 */
export function useTurnstile() {
  const [token, setToken] = useState<string | null>(null);
  const [falla, setFalla] = useState(false);
  const [lento, setLento] = useState(false);
  const [reinicio, setReinicio] = useState(0);

  useEffect(() => {
    if (!SITE_KEY) return;
    const t = setTimeout(() => setLento(true), ESPERA_MS);
    return () => clearTimeout(t);
  }, []);

  // Cada token sirve una vez: tras cualquier error, un widget nuevo (y, si
  // el script no había cargado, se vuelve a intentar).
  const renovar = () => {
    setToken(null);
    setFalla(false);
    setReinicio((n) => n + 1);
  };

  return {
    token,
    esperando: !!SITE_KEY && !token && !falla && !lento,
    /** Seguir sin token: Cloudflare no cargó o tardó demasiado. */
    sinToken: !!SITE_KEY && !token && (falla || lento),
    renovar,
    widget: <Turnstile key={reinicio} onToken={setToken} onFalla={() => setFalla(true)} />,
  };
}
