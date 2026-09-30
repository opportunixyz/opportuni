import { origen, SCOPE } from "../../../../lib/oauth/base";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Metadata del servidor de autorización (RFC 8414), en
// /.well-known/oauth-authorization-server. Registro dinámico, PKCE S256 y
// clientes públicos (sin secreto), que es como se registra Claude.
export function GET(req: Request) {
  const o = origen(req);
  return Response.json(
    {
      issuer: o,
      authorization_endpoint: `${o}/oauth/autorizar`,
      token_endpoint: `${o}/api/oauth/token`,
      registration_endpoint: `${o}/api/oauth/registro`,
      response_types_supported: ["code"],
      response_modes_supported: ["query"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none"],
      scopes_supported: [SCOPE, "offline_access"],
      authorization_response_iss_parameter_supported: true,
    },
    { headers: { "Cache-Control": "public, max-age=300" } }
  );
}
