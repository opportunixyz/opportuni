import { svcInsert, svcUpdate } from "../supabase";
import {
  CLAVES_OBLIGATORIAS,
  esClaveFija,
  getPreguntas,
  type Opciones,
  type Pregunta,
  type TipoPregunta,
} from "../pasaporte/formulario";
import { ErrorServicio } from "./vacantes";

// Capa de servicio del formulario del pasaporte (PRD F1, "Editar el
// formulario"). Cada cambio toma una versión nueva en la base (trigger de
// 0002) y la puerta lo muestra sin deploy (RF18).

export const listarPreguntas = () => getPreguntas(false);

const TIPOS: TipoPregunta[] = ["texto", "telefono", "lista", "chips"];

function limpiarOpciones(raw: unknown, tipo: TipoPregunta): Opciones {
  if (!Array.isArray(raw)) throw new ErrorServicio("Las opciones deben ser una lista.");
  const vistas = new Set<string>();
  const uno = (v: unknown) => {
    const t = typeof v === "string" ? v.trim().slice(0, 80) : "";
    if (!t) return null;
    if (tipo === "telefono" && !/^\+[1-9]\d{0,3}$/.test(t)) {
      throw new ErrorServicio(`"${t}" no es una lada (ej. +52).`);
    }
    if (vistas.has(t)) throw new ErrorServicio(`"${t}" está repetida.`);
    vistas.add(t);
    return t;
  };
  const out: Opciones = [];
  for (const o of raw) {
    if (o && typeof o === "object" && !Array.isArray(o)) {
      const g = o as { grupo?: unknown; opciones?: unknown };
      const grupo = typeof g.grupo === "string" ? g.grupo.trim().slice(0, 60) : "";
      const ops = (Array.isArray(g.opciones) ? g.opciones : []).map(uno).filter((x): x is string => !!x);
      if (grupo && ops.length) out.push({ grupo, opciones: ops });
    } else {
      const t = uno(o);
      if (t) out.push(t);
    }
  }
  if (out.length > 200) throw new ErrorServicio("Demasiadas opciones.");
  if (tipo !== "texto" && !out.length) throw new ErrorServicio("Esta pregunta necesita al menos una opción.");
  return tipo === "texto" ? [] : out;
}

export interface CambioPregunta {
  texto?: unknown;
  explicacion?: unknown;
  opciones?: unknown;
  obligatoria?: unknown;
  orden?: unknown;
  activa?: unknown;
  max_seleccion?: unknown;
}

export async function actualizarPregunta(id: number, cambio: CambioPregunta, actor: string): Promise<Pregunta> {
  const actual = (await getPreguntas(false)).find((p) => p.id === id);
  if (!actual) throw new ErrorServicio("Pregunta no encontrada.", 404);

  const patch: Record<string, unknown> = { updated_by: actor };
  if (cambio.texto !== undefined) {
    const t = String(cambio.texto).trim().slice(0, 200);
    if (!t) throw new ErrorServicio("La pregunta no puede quedar vacía.");
    patch.texto = t;
  }
  if (cambio.explicacion !== undefined) patch.explicacion = String(cambio.explicacion).trim().slice(0, 500);
  if (cambio.opciones !== undefined) patch.opciones = limpiarOpciones(cambio.opciones, actual.tipo);
  if (cambio.orden !== undefined) {
    const n = Number(cambio.orden);
    if (!Number.isInteger(n) || Math.abs(n) > 10000) throw new ErrorServicio("Orden inválido.");
    patch.orden = n;
  }
  if (cambio.max_seleccion !== undefined) {
    if (actual.tipo !== "chips") throw new ErrorServicio("Solo los botones tienen máximo.");
    const n = Number(cambio.max_seleccion);
    if (!Number.isInteger(n) || n < 1 || n > 20) throw new ErrorServicio("El máximo va de 1 a 20.");
    if (actual.clave === "rango_edad" && n !== 1) throw new ErrorServicio("La edad es un solo rango.");
    patch.max_seleccion = n;
  }
  for (const campo of ["obligatoria", "activa"] as const) {
    if (cambio[campo] === undefined) continue;
    if (typeof cambio[campo] !== "boolean") throw new ErrorServicio(`${campo} debe ser sí o no.`);
    if (!cambio[campo] && CLAVES_OBLIGATORIAS.includes(actual.clave)) {
      throw new ErrorServicio("Nombre y WhatsApp siempre van: sin ellos no hay pasaporte.");
    }
    patch[campo] = cambio[campo];
  }

  const [row] = await svcUpdate<Pregunta>("formulario_preguntas", `id=eq.${id}`, patch);
  return row;
}

export interface NuevaPregunta {
  clave?: unknown;
  texto?: unknown;
  explicacion?: unknown;
  tipo?: unknown;
  opciones?: unknown;
  obligatoria?: unknown;
  max_seleccion?: unknown;
}

/** Pregunta nueva. Solo la ve quien crea su pasaporte desde ahora. */
export async function crearPregunta(input: NuevaPregunta, actor: string): Promise<Pregunta> {
  const texto = String(input.texto ?? "").trim().slice(0, 200);
  if (!texto) throw new ErrorServicio("Falta el texto de la pregunta.");
  const tipo = String(input.tipo ?? "") as TipoPregunta;
  if (!TIPOS.includes(tipo)) throw new ErrorServicio("Tipo inválido.");
  const clave = String(input.clave ?? "").trim() ||
    texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40);
  if (!/^[a-z][a-z0-9_]{1,39}$/.test(clave)) throw new ErrorServicio("La clave debe ser corta, en minúsculas y con guion bajo.");
  if (esClaveFija(clave)) throw new ErrorServicio("Esa clave ya es una pregunta fija.");
  if (clave.endsWith("_lada") || clave.endsWith("_otra")) throw new ErrorServicio("Esa clave está reservada.");

  const existentes = await getPreguntas(false);
  if (existentes.some((p) => p.clave === clave)) throw new ErrorServicio("Ya hay una pregunta con esa clave.", 409);
  const max = tipo === "chips" ? Math.min(Math.max(Number(input.max_seleccion) || 1, 1), 20) : null;

  const [row] = await svcInsert<Pregunta>(
    "formulario_preguntas",
    {
      clave,
      texto,
      explicacion: String(input.explicacion ?? "").trim().slice(0, 500),
      tipo,
      opciones: limpiarOpciones(input.opciones ?? [], tipo),
      max_seleccion: max,
      obligatoria: input.obligatoria === true,
      orden: Math.max(0, ...existentes.map((p) => p.orden)) + 10,
      updated_by: actor,
    },
    { returning: true }
  );
  return row;
}
