import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { crearServidorMcp } from "../../lib/mcp/servidor";
import { metadataRecurso, origen, SCOPE } from "../../lib/oauth/base";
import { validarAcceso } from "../../lib/oauth/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Emitir un CV verificado puede crear la cuenta y emitir en segundo plano.
export const maxDuration = 60;

// Servidor MCP de Opportuni (PRD 8.9), Streamable HTTP sin estado. Sin token
// válido responde 401 con la metadata del recurso, que es como Claude
// descubre el OAuth y abre el login.
async function manejar(req: Request) {
  let sesion;
  try {
    sesion = await validarAcceso(req);
  } catch (e) {
    console.error("[mcp] validar token:", e instanceof Error ? e.message : e);
    return Response.json({ error: "server_error" }, { status: 503 });
  }
  if (!sesion) {
    const conToken = /^Bearer\s+\S+/.test(req.headers.get("authorization") ?? "");
    return Response.json(
      { error: conToken ? "invalid_token" : "unauthorized" },
      {
        status: 401,
        headers: {
          "WWW-Authenticate": `Bearer resource_metadata="${metadataRecurso(origen(req))}", scope="${SCOPE}"${
            conToken ? ', error="invalid_token"' : ""
          }`,
        },
      }
    );
  }

  const server = crearServidorMcp(sesion);
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  return transport.handleRequest(req, {
    authInfo: { token: sesion.token, clientId: sesion.clientId, scopes: [SCOPE], expiresAt: sesion.expira },
  });
}

export const POST = manejar;
export const GET = manejar;
export const DELETE = manejar;
