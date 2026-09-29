import { randomInt } from "crypto";
import { getVacanteById, svcInsert, svcRpc, type VacanteRow } from "../supabase";
import type { ClickMeta } from "./metadata";

// Piezas compartidas por la puerta (/v/{slug}) y sus API routes.

export const SLUG_VACANTE = /^[a-z0-9][a-z0-9-]{1,39}$/;
export const SLUG_CANAL = /^[a-z0-9][a-z0-9-]{0,39}$/;

export function canalValido(c: string | undefined | null): string | null {
  const v = (c ?? "").trim().toLowerCase();
  return SLUG_CANAL.test(v) ? v : null;
}

// Copia en memoria de las últimas vacantes vistas por esta instancia. Solo se
// usa si la base no responde, para que el link llegue igual a la vacante
// (RF11) en vez de caer en /vacantes.
const ultimas = new Map<string, VacanteRow>();
function recordar(v: VacanteRow) {
  ultimas.delete(v.id);
  ultimas.set(v.id, v);
  if (ultimas.size > 300) ultimas.delete(ultimas.keys().next().value as string);
}

export type Lookup =
  | { estado: "ok"; vacante: VacanteRow }
  | { estado: "no_existe" }
  | { estado: "sin_base"; vacante: VacanteRow | null };

export async function buscarVacante(id: string): Promise<Lookup> {
  if (!SLUG_VACANTE.test(id)) return { estado: "no_existe" };
  try {
    const v = await getVacanteById(id, 3000);
    if (!v || !v.activa) return { estado: "no_existe" };
    recordar(v);
    return { estado: "ok", vacante: v };
  } catch (e) {
    console.error("[puerta] base sin respuesta:", e instanceof Error ? e.message : e);
    return { estado: "sin_base", vacante: ultimas.get(id) ?? null };
  }
}

/** A dónde va el joven: la vacante externa o, si no tiene, su detalle interno. */
export function destinoDe(v: VacanteRow | null): string {
  if (!v) return "/vacantes";
  return v.url_destino || `/vacantes/${encodeURIComponent(v.id)}`;
}

export async function registrarClick(tokenHash: string, vacanteId: string, canal: string | null, meta: ClickMeta) {
  try {
    await svcRpc("registrar_click", {
      p_token_hash: tokenHash,
      p_vacante_id: vacanteId,
      p_canal: canal,
      p_estado_ip: meta.estado_ip,
      p_pais_ip: meta.pais_ip,
      p_ip_hash: meta.ip_hash,
      p_dispositivo_tipo: meta.dispositivo_tipo,
      p_sistema: meta.sistema,
      p_navegador: meta.navegador,
      p_idioma: meta.idioma,
      p_inapp: meta.inapp,
    });
  } catch (e) {
    console.error("[puerta] click no registrado:", e instanceof Error ? e.message : e);
  }
}

export type TipoEvento = "puerta_vista" | "inapp_detectado";

export async function registrarEvento(
  tipo: TipoEvento,
  datos: { vacante_id?: string | null; user_agent?: string; detalle?: Record<string, unknown> }
) {
  try {
    await svcInsert("pasaporte_eventos", {
      tipo,
      vacante_id: datos.vacante_id ?? null,
      user_agent: (datos.user_agent ?? "").slice(0, 400) || null,
      detalle: datos.detalle ?? null,
    });
  } catch (e) {
    console.error("[puerta] evento no registrado:", e instanceof Error ? e.message : e);
  }
}

const ALFABETO = "abcdefghjkmnpqrstuvwxyz23456789";
/** Slug público del pasaporte: 8 caracteres aleatorios. */
export function nuevoSlugPasaporte(): string {
  let s = "";
  for (let i = 0; i < 8; i++) s += ALFABETO[randomInt(ALFABETO.length)];
  return s;
}
