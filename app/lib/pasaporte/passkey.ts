import { createHash, createHmac, createPublicKey, randomBytes, timingSafeEqual, verify } from "crypto";

// "Ya tengo pasaporte" con passkey (PRD F1 y RF20): el navegador firma un
// reto con la passkey del pasaporte y aquí se verifica contra la llave pública
// guardada al crearlo. El reto no se guarda: lleva su hora y una firma HMAC.

export const RP_ID = "opportuni.xyz";
const VIGENCIA_MS = 5 * 60_000;

function secreto(): string | null {
  const s = (process.env.DEVICE_COOKIE_SECRET ?? "").trim();
  return s.length >= 32 ? s : null;
}

const mac = (key: string, datos: Buffer) =>
  createHmac("sha256", key).update("opp_reto.v1.").update(datos).digest().subarray(0, 16);

/** Reto nuevo: hora (8 bytes) + azar (16) + HMAC (16), en base64url. */
export function nuevoReto(): string | null {
  const key = secreto();
  if (!key) return null;
  const datos = Buffer.alloc(24);
  datos.writeBigUInt64BE(BigInt(Date.now()), 0);
  randomBytes(16).copy(datos, 8);
  return Buffer.concat([datos, mac(key, datos)]).toString("base64url");
}

function retoValido(reto: string): boolean {
  const key = secreto();
  if (!key) return false;
  const b = Buffer.from(reto, "base64url");
  if (b.length !== 40) return false;
  const datos = b.subarray(0, 24);
  if (!timingSafeEqual(b.subarray(24), mac(key, datos))) return false;
  const edad = Date.now() - Number(datos.readBigUInt64BE(0));
  return edad >= 0 && edad < VIGENCIA_MS;
}

/** Orígenes válidos: opportuni.xyz y sus subdominios (la beta de pruebas). */
function origenValido(origin: string): boolean {
  try {
    const u = new URL(origin);
    return u.protocol === "https:" && (u.hostname === RP_ID || u.hostname.endsWith(`.${RP_ID}`));
  } catch {
    return false;
  }
}

export interface Asercion {
  credentialId: string;
  clientDataJSON: string;
  authenticatorData: string;
  signature: string;
}

/**
 * Verifica una aserción WebAuthn ES256 contra la llave pública (P-256 sin
 * comprimir, 65 bytes en base64url). Revisa reto, origen, rpId, presencia y
 * verificación del usuario, y la firma.
 */
export function verificarAsercion(a: Asercion, llavePublica: string): boolean {
  try {
    const cliente = JSON.parse(Buffer.from(a.clientDataJSON, "base64url").toString("utf8")) as {
      type?: string;
      challenge?: string;
      origin?: string;
    };
    if (cliente.type !== "webauthn.get" || !cliente.challenge || !retoValido(cliente.challenge)) return false;
    if (!cliente.origin || !origenValido(cliente.origin)) return false;

    const auth = Buffer.from(a.authenticatorData, "base64url");
    if (auth.length < 37) return false;
    const rpHash = createHash("sha256").update(RP_ID).digest();
    if (!timingSafeEqual(auth.subarray(0, 32), rpHash)) return false;
    const flags = auth[32];
    if (!(flags & 0x01) || !(flags & 0x04)) return false; // UP y UV

    const pub = Buffer.from(llavePublica, "base64url");
    if (pub.length !== 65 || pub[0] !== 4) return false;
    const llave = createPublicKey({
      key: {
        kty: "EC",
        crv: "P-256",
        x: pub.subarray(1, 33).toString("base64url"),
        y: pub.subarray(33, 65).toString("base64url"),
      },
      format: "jwk",
    });
    const firmado = Buffer.concat([auth, createHash("sha256").update(Buffer.from(a.clientDataJSON, "base64url")).digest()]);
    return verify("sha256", firmado, { key: llave, dsaEncoding: "der" }, Buffer.from(a.signature, "base64url"));
  } catch {
    return false;
  }
}
