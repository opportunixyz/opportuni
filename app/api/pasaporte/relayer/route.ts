import { NextRequest, NextResponse } from "next/server";
import { dentroDelLimite, ipDe } from "../../../lib/limite";
import { dispositivoActual } from "../../../lib/pasaporte/sesion";
import { enviarSoroban, ErrorChannels } from "../../../lib/stellar/channels";
import { stellarServidor } from "../../../lib/stellar/config";
import { validarEnvio } from "../../../lib/stellar/relayer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Relayer del kit (`relayerUrl`): recibe { func, auth } del navegador y lo
// manda a Channels con nuestra llave. Solo para un dispositivo confirmado y
// solo las dos transacciones de la puerta (lib/stellar/relayer.ts). Responde
// con la misma forma que Channels, que es la que espera el kit.
const falla = (error: string, status: number) => NextResponse.json({ success: false, error }, { status });

export async function POST(req: NextRequest) {
  const cfg = stellarServidor();
  if (!cfg) return falla("Stellar no está configurado.", 503);

  const ip = ipDe(req.headers);
  if (!dentroDelLimite(`relayer:${ip}`, 12, 10 * 60_000)) return falla("Demasiados intentos.", 429);

  let disp;
  try {
    disp = await dispositivoActual();
  } catch {
    return falla("Base sin respuesta.", 503);
  }
  if (!disp?.confirmado) return falla("Sin pasaporte en este dispositivo.", 401);
  if (!dentroDelLimite(`relayer:${disp.slug}`, 6, 10 * 60_000)) return falla("Demasiados intentos.", 429);

  let body: { func?: unknown; auth?: unknown };
  try {
    body = await req.json();
  } catch {
    return falla("Solicitud inválida.", 400);
  }
  const v = validarEnvio(cfg, body.func, body.auth);
  if (!v.ok) {
    console.error(`[relayer] rechazado (${v.error}) para ${disp.slug}`);
    return falla("Transacción no permitida.", 400);
  }

  try {
    const r = await enviarSoroban(cfg, body.func as string, body.auth as string[]);
    return NextResponse.json({ success: true, data: r });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Channels falló";
    console.error(`[relayer] ${v.tipo} de ${disp.slug}:`, msg, e instanceof ErrorChannels ? JSON.stringify(e.detalle).slice(0, 400) : "");
    return falla(msg, 502);
  }
}
