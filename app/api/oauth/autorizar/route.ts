import { dentroDelLimite, ipDe } from "../../../lib/limite";
import { hashToken, nuevoToken, origen, TTL_CODIGO_S } from "../../../lib/oauth/base";
import { comoQuery, leerPedido, redirigirA, validarPedido } from "../../../lib/oauth/autorizacion";
import { verificarUsuario } from "../../../lib/oauth/equipo";
import { svcInsert } from "../../../lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// El formulario de /oauth/autorizar: usuario y contraseña del equipo. Si son
// correctos, emite el código y regresa a Claude; si no, vuelve al login.
const irA = (url: string) => new Response(null, { status: 303, headers: { Location: url, "Cache-Control": "no-store" } });

export async function POST(req: Request) {
  const o = origen(req);
  const f = new URLSearchParams(await req.text());
  const p = leerPedido((k) => f.get(k));
  const v = await validarPedido(p, o);
  if (!v.ok) return "redirigir" in v ? irA(v.redirigir) : irA(`${o}/oauth/autorizar?${comoQuery(p)}`);

  const volver = (e: string) => {
    const q = comoQuery(p);
    q.set("e", e);
    return irA(`${o}/oauth/autorizar?${q}`);
  };

  if (f.get("accion") === "cancelar") return irA(redirigirA(p, o, { error: "access_denied" }));
  if (!dentroDelLimite(`oauth-login:${ipDe(req.headers)}`, 10, 15 * 60_000)) return volver("limite");

  const usuario = await verificarUsuario(f.get("usuario") ?? "", f.get("password") ?? "");
  if (!usuario) return volver("credenciales");

  const codigo = nuevoToken("oppcd");
  await svcInsert("oauth_codigos", {
    codigo_hash: hashToken(codigo),
    client_id: p.clientId,
    usuario: usuario.usuario,
    redirect_uri: p.redirectUri,
    code_challenge: p.codeChallenge,
    recurso: p.resource || null,
    expira: new Date(Date.now() + TTL_CODIGO_S * 1000).toISOString(),
  });
  await svcInsert("admin_audit", {
    usuario: usuario.usuario,
    rol: usuario.rol,
    via: "mcp",
    accion: "conector_autorizado",
    detalle: { cliente: v.cliente.nombre, destino: new URL(p.redirectUri).host },
  }).catch(() => undefined);
  return irA(redirigirA(p, o, { code: codigo }));
}
