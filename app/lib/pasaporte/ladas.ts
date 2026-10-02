// Ladas que conocemos: cuántos dígitos lleva el número (sin la lada) y qué
// lada sugerir según el país del IP. Sin dependencias del servidor: lo usan
// también la puerta y el formulario en el navegador.

const DIGITOS_POR_LADA: Record<string, number> = { "+52": 10, "+57": 10, "+34": 9 };
const LADA_POR_PAIS: Record<string, string> = { MX: "+52", CO: "+57", ES: "+34" };

/** Dígitos del número para esa lada, o null si no la conocemos (se aceptan de 6 a 12). */
export const digitosDeLada = (lada: string): number | null => DIGITOS_POR_LADA[`+${lada.replace(/\D/g, "")}`] ?? null;

/** Lada sugerida según el país del IP; México si no lo conocemos. */
export const ladaDePais = (pais: string | null): string => (pais && LADA_POR_PAIS[pais]) || "+52";

/** Texto de ayuda del campo del número. */
export const placeholderNumero = (lada: string): string => `${digitosDeLada(lada) ?? 10} dígitos`;
