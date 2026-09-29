import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// Llaves de las cuentas de respaldo (PRD 8.3): AES-256-GCM con IV por renglón
// y el slug del pasaporte como dato asociado. CUSTODIA_MASTER_KEY vive solo en
// Vercel, nunca en el servidor de la base.

function llaveMaestra(): Buffer | null {
  const v = (process.env.CUSTODIA_MASTER_KEY ?? "").trim();
  const k = /^[0-9a-f]{64}$/i.test(v) ? Buffer.from(v, "hex") : Buffer.from(v, "base64");
  return k.length === 32 ? k : null;
}

export const custodiaLista = () => llaveMaestra() !== null;

export function cifrar(secreto: string, slug: string): { cifrada: string; iv: string } {
  const k = llaveMaestra();
  if (!k) throw new Error("Falta CUSTODIA_MASTER_KEY (32 bytes).");
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", k, iv);
  c.setAAD(Buffer.from(`opportuni:respaldo:${slug}`));
  const datos = Buffer.concat([c.update(secreto, "utf8"), c.final(), c.getAuthTag()]);
  return { cifrada: datos.toString("base64"), iv: iv.toString("base64") };
}

export function descifrar(cifrada: string, iv: string, slug: string): string {
  const k = llaveMaestra();
  if (!k) throw new Error("Falta CUSTODIA_MASTER_KEY (32 bytes).");
  const datos = Buffer.from(cifrada, "base64");
  const d = createDecipheriv("aes-256-gcm", k, Buffer.from(iv, "base64"));
  d.setAAD(Buffer.from(`opportuni:respaldo:${slug}`));
  d.setAuthTag(datos.subarray(datos.length - 16));
  return Buffer.concat([d.update(datos.subarray(0, datos.length - 16)), d.final()]).toString("utf8");
}
