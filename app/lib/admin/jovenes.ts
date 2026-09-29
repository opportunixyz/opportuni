import { svcRpc } from "../supabase";

// Capa de servicio de jóvenes (solo equipo; PRD F3, ficha interna). Nada de
// esto sale hacia empresas.

export interface JovenFila {
  slug: string;
  nombre: string;
  whatsapp: string;
  estado: string | null;
  pais: string | null;
  areas: string[];
  rango_edad: string | null;
  created_at: string;
  clicks: number;
  vacantes: number;
  dispositivos: number;
  sin_confirmar: number;
  ultimo_click: string | null;
}

export async function listarJovenes(q = "", limite = 200): Promise<JovenFila[]> {
  const rows = await svcRpc<JovenFila[]>("jovenes_lista", { p_q: q.slice(0, 80), p_limit: limite });
  return rows.map((r) => ({
    ...r,
    clicks: Number(r.clicks),
    vacantes: Number(r.vacantes),
    dispositivos: Number(r.dispositivos),
    sin_confirmar: Number(r.sin_confirmar),
  }));
}
