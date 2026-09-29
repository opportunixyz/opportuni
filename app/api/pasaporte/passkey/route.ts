import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { dentroDelLimite, ipDe } from "../../../lib/limite";
import { DEVICE_COOKIE, deviceCookieOptions, nuevoDispositivo } from "../../../lib/pasaporte/dispositivo";
import { metaDeHeaders } from "../../../lib/pasaporte/metadata";
import { verificarAsercion, type Asercion } from "../../../lib/pasaporte/passkey";
import { buscarVacante, canalValido, destinoDe, registrarClick } from "../../../lib/pasaporte/puerta";
import { svcRpc, svcSelect } from "../../../lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST: "Ya tengo pasaporte" con Face ID o huella (PRD F1, otro dispositivo,
// opción 1; RF20). Si la aserción corresponde a la passkey de un pasaporte,
// este navegador queda ligado como dispositivo CONFIRMADO.
export async function POST(req: NextRequest) {
  let body: { vacante?: unknown; canal?: unknown; asercion?: Partial<Asercion> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!dentroDelLimite(`passkey:${ipDe(req.headers)}`, 10, 10 * 60_000)) {
    return NextResponse.json({ ok: false, error: "Demasiados intentos. Espera unos minutos." }, { status: 429 });
  }

  const a = body.asercion ?? {};
  const campos = [a.credentialId, a.clientDataJSON, a.authenticatorData, a.signature];
  if (!campos.every((c) => typeof c === "string" && /^[A-Za-z0-9_-]{1,4000}$/.test(c))) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const asercion = a as Asercion;

  const lookup = await buscarVacante(String(body.vacante ?? ""));
  const vacante = lookup.estado === "no_existe" ? null : lookup.vacante;
  const destino = destinoDe(vacante);
  const canal = canalValido(typeof body.canal === "string" ? body.canal : null);

  try {
    const [p] = await svcSelect<{ slug: string; passkey_pubkey: string | null }>(
      `pasaportes?select=slug,passkey_pubkey&credential_id=eq.${asercion.credentialId}`
    );
    if (!p?.passkey_pubkey || !verificarAsercion(asercion, p.passkey_pubkey)) {
      return NextResponse.json({ ok: false, noEncontrado: true }, { status: 404 });
    }

    const disp = nuevoDispositivo();
    if (!disp) return NextResponse.json({ ok: true, destino, registrado: false });
    await svcRpc("ligar_dispositivo_passkey", {
      p_slug: p.slug,
      p_token_hash: disp.tokenHash,
      p_user_agent: req.headers.get("user-agent") ?? "",
      p_vacante_id: vacante?.id ?? null,
    });

    if (vacante) {
      const meta = metaDeHeaders(req.headers);
      waitUntil(registrarClick(disp.tokenHash, vacante.id, canal, meta));
    }

    const out = NextResponse.json({ ok: true, destino, registrado: true });
    out.cookies.set(DEVICE_COOKIE, disp.cookie, deviceCookieOptions);
    return out;
  } catch (e) {
    console.error("[pasaporte] passkey:", e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: true, destino, registrado: false });
  }
}
