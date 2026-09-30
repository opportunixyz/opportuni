import { randomBytes } from "crypto";
import { dentroDelLimite, ipDe } from "../../../lib/limite";
import { errorOAuth, redirectPermitido } from "../../../lib/oauth/base";
import { svcInsert } from "../../../lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Registro dinámico de clientes (RFC 7591). Solo acepta los redirects de
// claude.ai y de Claude Code (loopback): nadie más puede registrarse.
export async function POST(req: Request) {
  if (!dentroDelLimite(`oauth-registro:${ipDe(req.headers)}`, 20, 60 * 60_000)) {
    return errorOAuth("invalid_request", "Demasiados registros; intenta más tarde.", 429);
  }
  let body: { redirect_uris?: unknown; client_name?: unknown };
  try {
    body = await req.json();
  } catch {
    return errorOAuth("invalid_client_metadata", "El cuerpo debe ser JSON.");
  }
  const uris = body.redirect_uris;
  if (!Array.isArray(uris) || !uris.length || uris.length > 10 || !uris.every((u) => typeof u === "string" && u.length <= 300)) {
    return errorOAuth("invalid_redirect_uri", "Faltan redirect_uris.");
  }
  if (!uris.every((u) => redirectPermitido(u as string))) {
    return errorOAuth("invalid_redirect_uri", "Este servidor solo acepta a claude.ai y a Claude Code.");
  }
  const nombre = typeof body.client_name === "string" ? body.client_name.slice(0, 120) : null;
  const clientId = `oppcl_${randomBytes(24).toString("base64url")}`;
  await svcInsert("oauth_clientes", { client_id: clientId, nombre, redirect_uris: uris });
  return Response.json(
    {
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_name: nombre ?? undefined,
      redirect_uris: uris,
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
    },
    { status: 201, headers: { "Cache-Control": "no-store" } }
  );
}
