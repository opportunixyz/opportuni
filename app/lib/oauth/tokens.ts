import { randomUUID } from "crypto";
import { svcInsert, svcRpc } from "../supabase";
import type { Rol } from "./equipo";
import { hashToken, nuevoToken, SCOPE, TTL_ACCESO_S, TTL_REFRESH_S } from "./base";

// Tokens del conector: acceso de 1 hora y refresh de 30 días que se rota en
// cada uso. En la base solo va su sha256.

export interface ParTokens {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token: string;
  scope: string;
}

const enSegundos = (s: number) => new Date(Date.now() + s * 1000).toISOString();

export async function emitirTokens(p: {
  clientId: string;
  usuario: string;
  recurso: string | null;
  familia?: string;
}): Promise<ParTokens> {
  const familia = p.familia ?? randomUUID();
  const acceso = nuevoToken("oppat");
  const refresh = nuevoToken("opprt");
  const base = { familia, client_id: p.clientId, usuario: p.usuario, recurso: p.recurso };
  await svcInsert("oauth_tokens", { ...base, token_hash: hashToken(acceso), tipo: "acceso", expira: enSegundos(TTL_ACCESO_S) });
  await svcInsert("oauth_tokens", { ...base, token_hash: hashToken(refresh), tipo: "refresh", expira: enSegundos(TTL_REFRESH_S) });
  return { access_token: acceso, token_type: "Bearer", expires_in: TTL_ACCESO_S, refresh_token: refresh, scope: SCOPE };
}

export interface SesionMcp {
  usuario: string;
  nombre: string;
  rol: Rol;
  clientId: string;
  token: string;
  expira: number;
}

/** Valida el token de acceso del header Authorization. */
export async function validarAcceso(req: Request): Promise<SesionMcp | null> {
  const h = req.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(oppat_[A-Za-z0-9_-]{43})$/.exec(h.trim());
  if (!m) return null;
  const [fila] = await svcRpc<
    { usuario: string; nombre: string; rol: Rol; client_id: string; recurso: string | null; expira: string }[]
  >("oauth_validar_acceso", { p_hash: hashToken(m[1]) });
  if (!fila) return null;
  if (fila.recurso && !fila.recurso.endsWith("/api/mcp")) return null;
  return {
    usuario: fila.usuario,
    nombre: fila.nombre,
    rol: fila.rol,
    clientId: fila.client_id,
    token: m[1],
    expira: Math.floor(new Date(fila.expira).getTime() / 1000),
  };
}
