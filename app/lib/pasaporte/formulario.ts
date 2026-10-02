import { svcRpc, svcSelect } from "../supabase";
import { digitosDeLada } from "./ladas";

// Formulario del pasaporte (PRD F1). Vive en `formulario_preguntas` y se
// edita desde /admin › Formulario. Las claves fijas son columnas de
// `pasaportes` porque de ellas salen los porcentajes; las preguntas nuevas
// se guardan en `respuestas_extra`.

export type TipoPregunta = "texto" | "telefono" | "lista" | "chips";
export type Grupo = { grupo: string; opciones: string[] };
export type Opciones = (string | Grupo)[];

export interface Pregunta {
  id: number;
  clave: string;
  texto: string;
  explicacion: string;
  tipo: TipoPregunta;
  opciones: Opciones;
  max_seleccion: number | null;
  obligatoria: boolean;
  orden: number;
  activa: boolean;
  version: number;
  updated_by: string | null;
  updated_at: string;
}

export const CLAVES_FIJAS = ["nombre", "whatsapp", "estado", "areas", "rango_edad"] as const;
export const esClaveFija = (c: string) => (CLAVES_FIJAS as readonly string[]).includes(c);
/** Sin estas dos no hay pasaporte: no se pueden apagar ni hacer opcionales. */
export const CLAVES_OBLIGATORIAS = ["nombre", "whatsapp"];
/** Opción de chips que abre un texto libre ("Otra" o "Otro"). */
export const esOpcionOtra = (o: string) => /^otr[ao]s?$/i.test(o.trim());

export async function getPreguntas(soloActivas = true, timeoutMs?: number): Promise<Pregunta[]> {
  return svcSelect<Pregunta>(
    `formulario_preguntas?select=*${soloActivas ? "&activa=eq.true" : ""}&order=orden.asc,id.asc`,
    timeoutMs
  );
}

export async function getFormularioVersion(): Promise<number> {
  return Number(await svcRpc<number>("formulario_version"));
}

export function opcionesPlanas(opciones: Opciones): string[] {
  return opciones.flatMap((o) => (typeof o === "string" ? [o] : o.opciones));
}

export function grupoDe(opciones: Opciones, valor: string): string | null {
  for (const o of opciones) if (typeof o !== "string" && o.opciones.includes(valor)) return o.grupo;
  return null;
}

const PAIS_DE_GRUPO: Record<string, string> = {
  méxico: "MX",
  mexico: "MX",
  colombia: "CO",
  españa: "ES",
  espana: "ES",
};
export const paisDeGrupo = (g: string | null) => (g ? PAIS_DE_GRUPO[g.trim().toLowerCase()] ?? null : null);

// ---- WhatsApp ----

/** Lada + número a E.164. México y Colombia piden 10 dígitos; España, 9. */
export function normalizarWhatsapp(lada: string, numero: string): string | null {
  const l = lada.replace(/\D/g, "");
  let n = numero.replace(/\D/g, "");
  if (!/^[1-9]\d{0,3}$/.test(l)) return null;
  const digitos = digitosDeLada(l);
  if (n.startsWith(l) && n.length > (digitos ?? 10)) n = n.slice(l.length);
  if (l === "52" && n.length === 11 && n.startsWith("1")) n = n.slice(1); // el "1" viejo de celulares MX
  if (digitos) {
    if (n.length !== digitos) return null;
  } else if (!/^\d{6,12}$/.test(n)) {
    return null;
  }
  const e164 = `+${l}${n}`;
  return /^\+[1-9]\d{7,14}$/.test(e164) ? e164 : null;
}

// ---- Estado preseleccionado con el IP (x-vercel-ip-country-region, ISO 3166-2) ----

const ESTADOS_MX: Record<string, string> = {
  AGU: "Aguascalientes", BCN: "Baja California", BCS: "Baja California Sur", CAM: "Campeche",
  CHP: "Chiapas", CHH: "Chihuahua", CMX: "Ciudad de México", DIF: "Ciudad de México", COA: "Coahuila",
  COL: "Colima", DUR: "Durango", MEX: "Estado de México", GUA: "Guanajuato", GRO: "Guerrero",
  HID: "Hidalgo", JAL: "Jalisco", MIC: "Michoacán", MOR: "Morelos", NAY: "Nayarit",
  NLE: "Nuevo León", OAX: "Oaxaca", PUE: "Puebla", QUE: "Querétaro", ROO: "Quintana Roo",
  SLP: "San Luis Potosí", SIN: "Sinaloa", SON: "Sonora", TAB: "Tabasco", TAM: "Tamaulipas",
  TLA: "Tlaxcala", VER: "Veracruz", YUC: "Yucatán", ZAC: "Zacatecas",
};

const DEPARTAMENTOS_CO: Record<string, string> = {
  AMA: "Amazonas", ANT: "Antioquia", ARA: "Arauca", ATL: "Atlántico", DC: "Bogotá D.C.",
  BOL: "Bolívar", BOY: "Boyacá", CAL: "Caldas", CAQ: "Caquetá", CAS: "Casanare", CAU: "Cauca",
  CES: "Cesar", CHO: "Chocó", COR: "Córdoba", CUN: "Cundinamarca", GUA: "Guainía",
  GUV: "Guaviare", HUI: "Huila", LAG: "La Guajira", MAG: "Magdalena", MET: "Meta",
  NAR: "Nariño", NSA: "Norte de Santander", PUT: "Putumayo", QUI: "Quindío", RIS: "Risaralda",
  SAP: "San Andrés y Providencia", SAN: "Santander", SUC: "Sucre", TOL: "Tolima",
  VAC: "Valle del Cauca", VAU: "Vaupés", VID: "Vichada",
};

// España: comunidades autónomas (primer nivel de ISO 3166-2:ES).
const COMUNIDADES_ES: Record<string, string> = {
  AN: "Andalucía", AR: "Aragón", AS: "Asturias", IB: "Islas Baleares", CN: "Canarias",
  CB: "Cantabria", CL: "Castilla y León", CM: "Castilla-La Mancha", CT: "Cataluña",
  CE: "Ceuta", EX: "Extremadura", GA: "Galicia", RI: "La Rioja", MD: "Madrid",
  ML: "Melilla", MC: "Murcia", NC: "Navarra", PV: "País Vasco", VC: "Comunidad Valenciana",
};

export function estadoDeIp(pais: string | null, region: string | null): string | null {
  if (!pais || !region) return null;
  if (pais === "MX") return ESTADOS_MX[region] ?? null;
  if (pais === "CO") return DEPARTAMENTOS_CO[region] ?? null;
  if (pais === "ES") return COMUNIDADES_ES[region] ?? null;
  return null;
}

// ---- Validar respuestas de la puerta ----

export type Respuestas = Record<string, string | string[] | undefined> & {
  whatsapp_lada?: string;
};

export interface PasaporteDatos {
  nombre: string;
  whatsapp: string;
  estado: string | null;
  pais: string | null;
  areas: string[];
  rango_edad: string | null;
  respuestas_extra: Record<string, string | string[]>;
}

const txt = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Valida contra las preguntas activas. Devuelve los datos o el primer error. */
export function validarRespuestas(
  preguntas: Pregunta[],
  r: Respuestas
): { ok: true; datos: PasaporteDatos } | { ok: false; error: string; clave: string } {
  const datos: PasaporteDatos = {
    nombre: "", whatsapp: "", estado: null, pais: null, areas: [], rango_edad: null, respuestas_extra: {},
  };
  const activas = new Set(preguntas.map((p) => p.clave));
  for (const clave of CLAVES_OBLIGATORIAS) {
    if (!activas.has(clave)) return { ok: false, error: "El formulario no está listo.", clave };
  }

  for (const p of preguntas) {
    const raw = r[p.clave];
    const falta = (msg = "Falta responder esta pregunta.") => ({ ok: false as const, error: msg, clave: p.clave });

    if (p.tipo === "texto") {
      const v = txt(raw, 120);
      if (!v) {
        if (p.obligatoria) return falta();
        continue;
      }
      if (p.clave === "nombre") datos.nombre = v;
      else datos.respuestas_extra[p.clave] = v;
    } else if (p.tipo === "telefono") {
      const numero = txt(raw, 30);
      if (!numero) {
        if (p.obligatoria) return falta();
        continue;
      }
      const ladas = opcionesPlanas(p.opciones);
      const lada = txt(r[`${p.clave}_lada`], 6) || ladas[0] || "+52";
      if (ladas.length && !ladas.includes(lada)) return falta("Elige tu lada de la lista.");
      const e164 = normalizarWhatsapp(lada, numero);
      if (!e164) return falta(`Revisa tu número: son ${digitosDeLada(lada) ?? 10} dígitos, sin la lada.`);
      if (p.clave === "whatsapp") datos.whatsapp = e164;
      else datos.respuestas_extra[p.clave] = e164;
    } else if (p.tipo === "lista") {
      const v = txt(raw, 80);
      if (!v) {
        if (p.obligatoria) return falta("Elige una opción.");
        continue;
      }
      if (!opcionesPlanas(p.opciones).includes(v)) return falta("Elige una opción de la lista.");
      if (p.clave === "estado") {
        datos.estado = v;
        datos.pais = paisDeGrupo(grupoDe(p.opciones, v));
      } else if (p.clave === "rango_edad") {
        datos.rango_edad = v;
      } else {
        datos.respuestas_extra[p.clave] = v;
      }
    } else if (p.tipo === "chips") {
      const valores = (Array.isArray(raw) ? raw : typeof raw === "string" && raw ? [raw] : [])
        .map((v) => txt(v, 80))
        .filter(Boolean);
      const unicos = Array.from(new Set(valores));
      const max = p.max_seleccion ?? 1;
      if (!unicos.length) {
        if (p.obligatoria) return falta(max === 1 ? "Elige una opción." : "Elige al menos una opción.");
        continue;
      }
      if (unicos.length > max) return falta(`Elige hasta ${max}.`);
      const validas = opcionesPlanas(p.opciones);
      if (unicos.some((v) => !validas.includes(v))) return falta("Elige opciones de la lista.");
      const otra = unicos.find(esOpcionOtra) ? txt(r[`${p.clave}_otra`], 80) : "";
      if (otra) datos.respuestas_extra[`${p.clave}_otra`] = otra;
      if (p.clave === "areas") datos.areas = unicos;
      else if (p.clave === "rango_edad") datos.rango_edad = unicos[0];
      else if (p.clave === "estado") {
        datos.estado = unicos[0];
        datos.pais = paisDeGrupo(grupoDe(p.opciones, unicos[0]));
      } else datos.respuestas_extra[p.clave] = max === 1 ? unicos[0] : unicos;
    }
  }

  if (!datos.nombre) return { ok: false, error: "Falta tu nombre.", clave: "nombre" };
  if (!datos.whatsapp) return { ok: false, error: "Falta tu WhatsApp.", clave: "whatsapp" };
  return { ok: true, datos };
}
