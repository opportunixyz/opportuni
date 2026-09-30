import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { origenDeHost } from "../../lib/oauth/base";
import { comoQuery, leerPedido, validarPedido } from "../../lib/oauth/autorizacion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Conectar Claude · Opportuni", robots: { index: false, follow: false } };

// Pantalla de autorización del conector de Claude (PRD 8.9): la persona del
// equipo entra con su usuario y Claude queda conectado a Opportuni con su rol.

const ERRORES: Record<string, string> = {
  credenciales: "Usuario o contraseña incorrectos.",
  limite: "Demasiados intentos. Espera unos minutos.",
};

export default async function Autorizar({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const h = headers();
  const o = origenDeHost(h.get("x-forwarded-host") ?? h.get("host"));
  const p = leerPedido((k) => searchParams[k]);
  const v = await validarPedido(p, o);
  if (!v.ok && "redirigir" in v) redirect(v.redirigir);

  const destino = v.ok ? new URL(p.redirectUri) : null;
  const quien = !destino ? "" : v.ok && v.loopback ? "Claude Code, en esta computadora" : `Claude (${destino.hostname})`;
  const error = searchParams.e ? ERRORES[searchParams.e] : "";

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: "var(--cream)" }}>
      <div className="bento p-7 w-full" style={{ background: "white", maxWidth: 420 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-opportuni.png" alt="Opportuni" style={{ height: 40 }} className="mb-4" />
        {!v.ok ? (
          <>
            <h1 className="text-xl font-black mb-2">No se puede conectar</h1>
            <p className="text-sm text-gray-600">{"fatal" in v ? v.fatal : ""} Vuelve a Claude e intenta de nuevo.</p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-black leading-tight mb-1">Conectar Claude con Opportuni</h1>
            <p className="text-sm text-gray-600 mb-4">
              <b>{quien}</b> podrá crear vacantes, ver sus links y cifras, buscar jóvenes y emitir CV verificados, con tu
              usuario del equipo.
            </p>
            {v.loopback && (
              <p className="text-xs rounded-xl px-3 py-2 mb-4" style={{ background: "var(--cream2)" }}>
                Solo continúa si tú mismo acabas de conectar Claude Code en esta computadora.
              </p>
            )}
            <form method="post" action="/api/oauth/autorizar" className="space-y-3">
              {Array.from(comoQuery(p).entries()).map(([k, val]) => (
                <input key={k} type="hidden" name={k} value={val} />
              ))}
              <div>
                <label className="block text-sm font-bold mb-1" htmlFor="usuario">
                  Usuario
                </label>
                <input id="usuario" name="usuario" autoComplete="username" required className="input-bento w-full" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1" htmlFor="password">
                  Contraseña
                </label>
                <input id="password" name="password" type="password" autoComplete="current-password" required className="input-bento w-full" />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button type="submit" name="accion" value="conectar" className="btn-rosa w-full text-center">
                Entrar y conectar
              </button>
              <button
                type="submit"
                name="accion"
                value="cancelar"
                formNoValidate
                className="w-full text-center text-sm font-bold"
                style={{ color: "var(--lila)", background: "none", border: "none", cursor: "pointer" }}
              >
                Cancelar
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
