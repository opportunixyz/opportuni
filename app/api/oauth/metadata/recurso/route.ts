import { metadataRecurso, origen, recursoMcp, SCOPE } from "../../../../lib/oauth/base";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Metadata del recurso protegido (RFC 9728): dice a Claude dónde está el
// servidor de autorización del MCP. Se sirve en /.well-known/oauth-protected-resource.
export function GET(req: Request) {
  const o = origen(req);
  return Response.json(
    {
      resource: recursoMcp(o),
      authorization_servers: [o],
      scopes_supported: [SCOPE],
      bearer_methods_supported: ["header"],
      resource_name: "Opportuni",
      resource_documentation: metadataRecurso(o),
    },
    { headers: { "Cache-Control": "public, max-age=300" } }
  );
}
