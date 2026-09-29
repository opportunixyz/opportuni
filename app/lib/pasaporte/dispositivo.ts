import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";

// Cookie del dispositivo (PRD 8.3): `opp_dev`, httpOnly, token aleatorio de
// 32 bytes. El valor es `{token}.{firma}`: la firma (HMAC con
// DEVICE_COOKIE_SECRET) deja reconocer un dispositivo sin esperar a la base,
// así el redirect de un dispositivo conocido no se frena (PRD 7.4). En la
// base solo queda sha256(token).

export const DEVICE_COOKIE = "opp_dev";
export const DEVICE_COOKIE_MAX_AGE = 400 * 24 * 60 * 60; // tope de Chrome

const b64url = (buf: Buffer) => buf.toString("base64url");

function secret(): string | null {
  const s = (process.env.DEVICE_COOKIE_SECRET ?? "").trim();
  return s.length >= 32 ? s : null;
}

function sign(token: string, key: string) {
  return b64url(createHmac("sha256", key).update(`opp_dev.v1.${token}`).digest());
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Token nuevo con su valor de cookie firmado, o null si falta el secreto. */
export function nuevoDispositivo(): { token: string; cookie: string; tokenHash: string } | null {
  const key = secret();
  if (!key) return null;
  const token = b64url(randomBytes(32));
  return { token, cookie: `${token}.${sign(token, key)}`, tokenHash: hashToken(token) };
}

/** Devuelve el token si la cookie trae una firma válida. */
export function leerDispositivo(value: string | undefined): { token: string; tokenHash: string } | null {
  const key = secret();
  if (!key || !value) return null;
  const [token, firma, ...rest] = value.split(".");
  if (!token || !firma || rest.length || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const a = Buffer.from(firma);
  const b = Buffer.from(sign(token, key));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return { token, tokenHash: hashToken(token) };
}

export const deviceCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: DEVICE_COOKIE_MAX_AGE,
};
