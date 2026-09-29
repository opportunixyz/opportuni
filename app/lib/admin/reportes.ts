import { svcRpc } from "../supabase";
import { ErrorServicio } from "./vacantes";

// Capa de servicio del reporte general para empresas (PRD F3). La función
// reporte_general ya aplica el mínimo de 5 personas por grupo.

export interface Reparto {
  etiqueta: string;
  personas: number;
  pct: number;
}

export interface ReporteGeneral {
  alcance: "comunidad" | "empresa";
  empresa: string | null;
  minimo_grupo: number;
  comunidad: { pasaportes: number; vacantes: number; clicks: number; personas_activas: number };
  personas: number;
  clicks: number;
  vacantes: { titulo: string; activa: boolean; clicks: number; personas: number }[];
  por_estado: Reparto[];
  por_edad: Reparto[];
  por_area: Reparto[];
}

export async function reporteGeneral(empresa = ""): Promise<ReporteGeneral> {
  const e = empresa.trim().slice(0, 120);
  const r = await svcRpc<ReporteGeneral>("reporte_general", { p_empresa: e || null });
  if (e && !r.empresa) throw new ErrorServicio("No hay vacantes de esa empresa.", 404);
  return r;
}
