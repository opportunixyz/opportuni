import { svcInsert, svcRpc, svcSelect, svcUpdate } from "../supabase";
import { ErrorServicio, SITIO, slugify } from "./vacantes";

// Grupos de WhatsApp de Opportuni (links por grupo, PRD F1). Cada vacante
// tiene un link por grupo: opportuni.xyz/v/{vacante}/{grupo}. Misma capa para
// /admin y, después, el conector de Claude.

export const SLUG_GRUPO = /^[a-z0-9][a-z0-9-]{0,39}$/;

export interface Grupo {
  slug: string;
  nombre: string;
  orden: number;
  activo: boolean;
}

export interface GrupoStat {
  canal: string;
  nombre: string;
  en_lista: boolean;
  activo: boolean;
  orden: number;
  clicks: number;
  personas: number;
  vacantes: number;
  nuevos: number;
}

export const linkDeGrupo = (vacante: string, grupo: string) => `${SITIO}/v/${vacante}/${grupo}`;

export async function listarGrupos(soloActivos = false): Promise<Grupo[]> {
  return svcSelect<Grupo>(
    `grupos?select=slug,nombre,orden,activo${soloActivos ? "&activo=is.true" : ""}&order=orden,nombre`
  );
}

/** Cifras por grupo, de todas las vacantes o de una. */
export async function statsGrupos(vacante?: string): Promise<GrupoStat[]> {
  const rows = await svcRpc<GrupoStat[]>("grupos_stats", { p_vacante: vacante || null });
  return rows.map((r) => ({
    ...r,
    clicks: Number(r.clicks),
    personas: Number(r.personas),
    vacantes: Number(r.vacantes),
    nuevos: Number(r.nuevos),
  }));
}

export async function crearGrupo(nombre: string, slug?: string): Promise<Grupo> {
  const n = nombre.trim().slice(0, 80);
  if (!n) throw new ErrorServicio("Falta el nombre del grupo.");
  const s = slug?.trim() ? slug.trim().toLowerCase() : slugify(n, 30);
  if (!SLUG_GRUPO.test(s)) throw new ErrorServicio("El link del grupo solo lleva minúsculas, números y guiones.");
  // Al final de la lista.
  const [ultimo] = await svcSelect<{ orden: number }>("grupos?select=orden&order=orden.desc&limit=1");
  try {
    const [g] = await svcInsert<Grupo>(
      "grupos",
      { slug: s, nombre: n, orden: (ultimo?.orden ?? 0) + 10 },
      { returning: true }
    );
    return g;
  } catch (e) {
    if (e instanceof Error && e.message.includes("23505")) throw new ErrorServicio("Ya hay un grupo con ese link.", 409);
    throw e;
  }
}

/** El slug no se cambia: rompería los links que ya se compartieron. */
export async function actualizarGrupo(slug: string, cambios: { nombre?: string; activo?: boolean; orden?: number }) {
  if (!SLUG_GRUPO.test(slug)) throw new ErrorServicio("Grupo inválido.");
  const patch: Record<string, unknown> = {};
  if (typeof cambios.nombre === "string") {
    const n = cambios.nombre.trim().slice(0, 80);
    if (!n) throw new ErrorServicio("Falta el nombre del grupo.");
    patch.nombre = n;
  }
  if (typeof cambios.activo === "boolean") patch.activo = cambios.activo;
  if (Number.isInteger(cambios.orden)) patch.orden = cambios.orden;
  if (!Object.keys(patch).length) throw new ErrorServicio("Nada que cambiar.");
  const [g] = await svcUpdate<Grupo>("grupos", `slug=eq.${slug}`, patch);
  if (!g) throw new ErrorServicio("No existe ese grupo.", 404);
  return g;
}
