import { svcInsert, svcRpc, svcUpdate } from "../supabase";

// Capa de servicio de vacantes (PRD 8.9). /admin la usa hoy; la API con llaves
// y el MCP de la fase 3 llaman a estas mismas funciones.

export const SITIO = "https://opportuni.xyz";

export interface VacanteStat {
  vacante_id: string;
  titulo: string;
  empresa: string | null;
  url_destino: string | null;
  activa: boolean;
  clicks: number;
  personas: number;
  postulantes: number;
  created_at: string;
}

export interface Postulante {
  nombre: string;
  carrera_area: string;
  whatsapp: string;
  cv_link: string | null;
  created_at: string;
}

export class ErrorServicio extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,39}$/;

export function slugify(s: string, max = 40): string {
  const base = s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (base.length <= max) return base;
  const corto = base.slice(0, max);
  const corte = corto.lastIndexOf("-");
  return (corte > 10 ? corto.slice(0, corte) : corto).replace(/-$/, "");
}

export const linkDe = (id: string) => `${SITIO}/v/${id}`;

export async function listarVacantes(): Promise<VacanteStat[]> {
  const rows = await svcRpc<VacanteStat[]>("vacante_stats");
  return rows.map((r) => ({ ...r, clicks: Number(r.clicks), personas: Number(r.personas), postulantes: Number(r.postulantes) }));
}

export async function postulantesDe(id: string): Promise<Postulante[]> {
  return svcRpc<Postulante[]>("postulantes_por_vacante", { vid: id });
}

export interface NuevaVacante {
  url?: string;
  titulo?: string;
  empresa?: string;
  slug?: string;
  ubicacion?: string;
  tipo?: string;
  salario?: string;
  descripcion?: string;
}

const s = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Crea la vacante y devuelve su link opportuni.xyz/v/{slug}. */
export async function crearVacante(input: NuevaVacante, actor: string) {
  const url = s(input.url, 1000);
  const titulo = s(input.titulo, 200);
  const empresa = s(input.empresa, 120);
  const tipo = s(input.tipo, 20);
  if (!titulo) throw new ErrorServicio("Falta el título.");
  if (url && !/^https?:\/\/[^\s]+\.[^\s]+/i.test(url)) throw new ErrorServicio("La URL debe empezar con https://");
  if (tipo && !["remoto", "presencial", "hibrido"].includes(tipo)) throw new ErrorServicio("Tipo inválido.");

  const pedido = s(input.slug, 60).toLowerCase();
  const base = pedido || slugify([titulo, empresa].filter(Boolean).join(" "));
  if (!SLUG_RE.test(base)) {
    throw new ErrorServicio("El link debe ser corto: letras, números y guiones (ej. pm-nubank).");
  }

  // Si el slug salió solo y ya existe, se prueba con -2, -3… Si lo escribió
  // Vianey, se respeta y se avisa.
  const intentos = pedido ? [base] : [base, ...[2, 3, 4, 5, 6, 7, 8, 9].map((n) => `${base.slice(0, 37)}-${n}`)];
  for (const id of intentos) {
    try {
      await svcInsert("vacantes", {
        id,
        titulo,
        empresa: empresa || null,
        url_destino: url || null,
        ubicacion: s(input.ubicacion, 120) || null,
        tipo: tipo || null,
        salario: s(input.salario, 120) || null,
        descripcion: s(input.descripcion, 4000) || null,
        creada_por: actor,
      });
      return { id, link: linkDe(id) };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (!msg.includes("vacantes_pkey")) throw e;
    }
  }
  throw new ErrorServicio(
    pedido ? "Ya existe una vacante con ese link. Usa otro." : "No encontramos un link libre; escribe uno a mano.",
    409
  );
}

export async function activarVacante(id: string, activa: boolean) {
  if (!SLUG_RE.test(id)) throw new ErrorServicio("Vacante inválida.");
  const rows = await svcUpdate("vacantes", `id=eq.${encodeURIComponent(id)}`, { activa });
  if (!rows.length) throw new ErrorServicio("Vacante no encontrada.", 404);
}
