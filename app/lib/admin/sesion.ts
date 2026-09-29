// Sesión de /admin (PRD 8.6): contraseña en ADMIN_PASSWORD y cookie httpOnly
// firmada con ADMIN_SESSION_SECRET. Solo usa Web Crypto para correr igual en
// el middleware (edge) y en las API routes (node).

export const ADMIN_COOKIE = "opp_admin";
export const ADMIN_SESSION_HORAS = 12;

const enc = new TextEncoder();

function secreto(): string | null {
  const s = (process.env.ADMIN_SESSION_SECRET ?? "").trim();
  return s.length >= 32 ? s : null;
}

export function adminConfigurado(): boolean {
  return !!secreto() && (process.env.ADMIN_PASSWORD ?? "").length >= 12;
}

function b64url(bytes: ArrayBuffer): string {
  let s = "";
  for (const b of Array.from(new Uint8Array(bytes))) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(key: string, data: string): Promise<string> {
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", k, enc.encode(data)));
}

/** Compara en tiempo constante (sobre hashes, para no filtrar el largo). */
export async function igualSeguro(a: string, b: string): Promise<boolean> {
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  const x = new Uint8Array(ha);
  const y = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

export async function crearSesion(): Promise<string | null> {
  const key = secreto();
  if (!key) return null;
  const exp = Math.floor(Date.now() / 1000) + ADMIN_SESSION_HORAS * 3600;
  const payload = `v1.${exp}`;
  return `${payload}.${await hmac(key, `opp_admin.${payload}`)}`;
}

export async function sesionValida(value: string | undefined): Promise<boolean> {
  const key = secreto();
  if (!key || !value) return false;
  const m = /^(v1\.(\d{10}))\.([A-Za-z0-9_-]{43})$/.exec(value);
  if (!m) return false;
  if (Number(m[2]) < Date.now() / 1000) return false;
  return igualSeguro(m[3], await hmac(key, `opp_admin.${m[1]}`));
}

export async function passwordCorrecta(intento: string): Promise<boolean> {
  const real = process.env.ADMIN_PASSWORD ?? "";
  if (real.length < 12) return false;
  return igualSeguro(intento, real);
}

export const adminCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: ADMIN_SESSION_HORAS * 3600,
};
