import { errorOAuth, hashToken, pkceValido } from "../../../lib/oauth/base";
import { emitirTokens } from "../../../lib/oauth/tokens";
import { svcRpc } from "../../../lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Endpoint de tokens (RFC 6749, form-urlencoded). Canje del código con PKCE y
// refresh rotado: si un refresh ya usado vuelve, se revoca toda la sesión.
export async function POST(req: Request) {
  let f: URLSearchParams;
  try {
    f = new URLSearchParams(await req.text());
  } catch {
    return errorOAuth("invalid_request", "Cuerpo inválido.");
  }
  const clientId = f.get("client_id") ?? "";
  const tipo = f.get("grant_type");

  try {
    if (tipo === "authorization_code") {
      const code = f.get("code") ?? "";
      const verifier = f.get("code_verifier") ?? "";
      const redirect = f.get("redirect_uri") ?? "";
      if (!code || !verifier || !clientId) return errorOAuth("invalid_request", "Faltan code, code_verifier o client_id.");
      const [c] = await svcRpc<
        { client_id: string; usuario: string; redirect_uri: string; code_challenge: string; recurso: string | null }[]
      >("oauth_canjear_codigo", { p_hash: hashToken(code) });
      if (!c || c.client_id !== clientId || c.redirect_uri !== redirect || !pkceValido(verifier, c.code_challenge)) {
        return errorOAuth("invalid_grant", "Código inválido, vencido o ya usado.");
      }
      const recurso = f.get("resource");
      if (recurso && c.recurso && recurso !== c.recurso) return errorOAuth("invalid_target", "El recurso no coincide.");
      const t = await emitirTokens({ clientId, usuario: c.usuario, recurso: c.recurso ?? recurso });
      return Response.json(t, { headers: { "Cache-Control": "no-store", Pragma: "no-cache" } });
    }

    if (tipo === "refresh_token") {
      const refresh = f.get("refresh_token") ?? "";
      if (!refresh || !clientId) return errorOAuth("invalid_request", "Faltan refresh_token o client_id.");
      const [r] = await svcRpc<{ client_id: string; usuario: string; recurso: string | null; familia: string }[]>(
        "oauth_usar_refresh",
        { p_hash: hashToken(refresh) }
      );
      if (!r || r.client_id !== clientId) return errorOAuth("invalid_grant", "Refresh inválido, vencido o ya usado.");
      const t = await emitirTokens({ clientId, usuario: r.usuario, recurso: r.recurso, familia: r.familia });
      return Response.json(t, { headers: { "Cache-Control": "no-store", Pragma: "no-cache" } });
    }

    return errorOAuth("unsupported_grant_type", "Solo authorization_code y refresh_token.");
  } catch (e) {
    console.error("[oauth] token:", e instanceof Error ? e.message : e);
    return errorOAuth("server_error", "No se pudo emitir el token.", 500);
  }
}
