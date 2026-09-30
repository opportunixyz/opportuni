import { svcSelect } from "../supabase";
import { esLoopback, recursoMcp, redirectCoincide } from "./base";

// Pedido de autorización (/oauth/autorizar): lo que Claude manda y su
// validación. Si el cliente o el redirect no son válidos no se redirige a
// ningún lado (se muestra el error); los demás errores vuelven a Claude.

export interface Pedido {
  clientId: string;
  redirectUri: string;
  responseType: string;
  codeChallenge: string;
  metodo: string;
  state: string;
  resource: string;
}

const CAMPOS = {
  clientId: "client_id",
  redirectUri: "redirect_uri",
  responseType: "response_type",
  codeChallenge: "code_challenge",
  metodo: "code_challenge_method",
  state: "state",
  resource: "resource",
} as const;

export function leerPedido(get: (k: string) => string | null | undefined): Pedido {
  const p = {} as Pedido;
  for (const [k, v] of Object.entries(CAMPOS)) p[k as keyof Pedido] = (get(v) ?? "").slice(0, 600);
  return p;
}

/** Parámetros del pedido para repetirlo (volver al login con un error). */
export function comoQuery(p: Pedido): URLSearchParams {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(CAMPOS)) if (p[k as keyof Pedido]) q.set(v, p[k as keyof Pedido]);
  return q;
}

export function redirigirA(p: Pedido, origen: string, params: Record<string, string>): string {
  const u = new URL(p.redirectUri);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  if (p.state) u.searchParams.set("state", p.state);
  u.searchParams.set("iss", origen);
  return u.toString();
}

export type Validacion =
  | { ok: true; cliente: { nombre: string | null }; loopback: boolean }
  | { ok: false; fatal: string }
  | { ok: false; redirigir: string };

export async function validarPedido(p: Pedido, origen: string): Promise<Validacion> {
  if (!/^oppcl_[A-Za-z0-9_-]{32}$/.test(p.clientId)) return { ok: false, fatal: "Este cliente no está registrado." };
  const [c] = await svcSelect<{ nombre: string | null; redirect_uris: string[] }>(
    `oauth_clientes?select=nombre,redirect_uris&client_id=eq.${p.clientId}`
  );
  if (!c) return { ok: false, fatal: "Este cliente no está registrado." };
  if (!p.redirectUri || !redirectCoincide(c.redirect_uris, p.redirectUri)) {
    return { ok: false, fatal: "La dirección de regreso no coincide con la registrada." };
  }
  if (p.responseType !== "code") return { ok: false, redirigir: redirigirA(p, origen, { error: "unsupported_response_type" }) };
  if (p.metodo !== "S256" || !/^[A-Za-z0-9_-]{43,128}$/.test(p.codeChallenge)) {
    return { ok: false, redirigir: redirigirA(p, origen, { error: "invalid_request", error_description: "PKCE S256 obligatorio" }) };
  }
  if (p.resource && p.resource !== recursoMcp(origen)) {
    return { ok: false, redirigir: redirigirA(p, origen, { error: "invalid_target" }) };
  }
  return { ok: true, cliente: { nombre: c.nombre }, loopback: esLoopback(p.redirectUri) };
}
