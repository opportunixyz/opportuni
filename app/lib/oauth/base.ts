import { createHash, randomBytes, timingSafeEqual } from "crypto";

// OAuth 2.1 mínimo para el conector de Claude (PRD 8.9): claude.ai y Claude
// Code se registran solos (registro dinámico), el usuario del equipo entra con
// su contraseña y Claude recibe tokens cortos con refresh rotado. Solo sirve
// para el servidor MCP en /api/mcp.

export const SCOPE = "opportuni";
export const TTL_CODIGO_S = 5 * 60;
export const TTL_ACCESO_S = 60 * 60;
export const TTL_REFRESH_S = 30 * 24 * 60 * 60;

const HOSTS = [/^opportuni\.xyz$/, /^beta\.opportuni\.xyz$/, /^opportuni-[a-z0-9]+-opportuni\.vercel\.app$/];

/** Origen público según el host (solo hosts nuestros; si no, opportuni.xyz). */
export function origenDeHost(host: string | null | undefined): string {
  const h = (host ?? "").split(",")[0].trim().toLowerCase();
  return HOSTS.some((r) => r.test(h)) ? `https://${h}` : "https://opportuni.xyz";
}

export const origen = (req: Request) =>
  origenDeHost(req.headers.get("x-forwarded-host") ?? req.headers.get("host"));

export const recursoMcp = (o: string) => `${o}/api/mcp`;
export const metadataRecurso = (o: string) => `${o}/.well-known/oauth-protected-resource`;

export const nuevoToken = (prefijo: string) => `${prefijo}_${randomBytes(32).toString("base64url")}`;
export const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

/** PKCE S256: base64url(sha256(verifier)) debe ser igual al challenge. */
export function pkceValido(verifier: string, challenge: string): boolean {
  if (!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)) return false;
  const a = Buffer.from(createHash("sha256").update(verifier).digest("base64url"));
  const b = Buffer.from(challenge);
  return a.length === b.length && timingSafeEqual(a, b);
}

// ---------------------------------------------------------------------------
// Redirects permitidos: claude.ai (web, escritorio, móvil) y Claude Code
// (loopback en cualquier puerto). Ningún otro cliente puede registrarse.
// ---------------------------------------------------------------------------

const EXACTOS = ["https://claude.ai/api/mcp/auth_callback", "https://claude.com/api/mcp/auth_callback"];

function loopback(uri: string): URL | null {
  try {
    const u = new URL(uri);
    if (u.protocol !== "http:" || !["localhost", "127.0.0.1"].includes(u.hostname)) return null;
    if (u.username || u.password || u.hash) return null;
    return u;
  } catch {
    return null;
  }
}

export function redirectPermitido(uri: string): boolean {
  return EXACTOS.includes(uri) || loopback(uri) !== null;
}

/** ¿`enviada` coincide con alguna registrada? Loopback sin importar el puerto (RFC 8252 7.3). */
export function redirectCoincide(registradas: string[], enviada: string): boolean {
  if (registradas.includes(enviada)) return true;
  const e = loopback(enviada);
  if (!e) return false;
  return registradas.some((r) => {
    const l = loopback(r);
    return !!l && l.hostname === e.hostname && l.pathname === e.pathname && l.search === e.search;
  });
}

export const esLoopback = (uri: string) => loopback(uri) !== null;

/** Error OAuth (RFC 6749) con su status. */
export function errorOAuth(error: string, descripcion: string, status = 400) {
  return Response.json(
    { error, error_description: descripcion },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}
