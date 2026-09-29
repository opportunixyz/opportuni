import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { DEVICE_COOKIE, deviceCookieOptions, nuevoDispositivo } from "../../../lib/pasaporte/dispositivo";
import { normalizarWhatsapp } from "../../../lib/pasaporte/formulario";
import { metaDeHeaders } from "../../../lib/pasaporte/metadata";
import { buscarVacante, canalValido, destinoDe, registrarClick } from "../../../lib/pasaporte/puerta";
import { dentroDelLimite, ipDe } from "../../../lib/limite";
import { verificarTurnstile } from "../../../lib/pasaporte/turnstile";
import { svcRpc } from "../../../lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST: "Ya tengo pasaporte" con solo el WhatsApp (PRD F1, otro dispositivo,
// opción 2). Si el número tiene pasaporte, este navegador queda ligado como
// dispositivo SIN CONFIRMAR: sus clicks suman al historial, pero no emite nada
// en Stellar ni abre el detalle privado. La confirmación con passkey llega en
// la fase 2.
export async function POST(req: NextRequest) {
  let body: { vacante?: unknown; canal?: unknown; lada?: unknown; numero?: unknown; turnstile?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Solicitud inválida." }, { status: 400 });
  }

  const lookup = await buscarVacante(String(body.vacante ?? ""));
  const vacante = lookup.estado === "no_existe" ? null : lookup.vacante;
  const destino = destinoDe(vacante);
  const canal = canalValido(typeof body.canal === "string" ? body.canal : null);

  if (!dentroDelLimite(`entrar:${ipDe(req.headers)}`, 10, 10 * 60_000)) {
    return NextResponse.json({ ok: false, error: "Demasiados intentos. Espera unos minutos." }, { status: 429 });
  }

  const whatsapp = normalizarWhatsapp(String(body.lada ?? "+52"), String(body.numero ?? ""));
  if (!whatsapp) {
    return NextResponse.json({ ok: false, error: "Revisa tu número: son 10 dígitos, sin la lada." }, { status: 400 });
  }
  if (lookup.estado === "sin_base") return NextResponse.json({ ok: true, destino, registrado: false });
  if (!(await verificarTurnstile(body.turnstile, ipDe(req.headers)))) {
    return NextResponse.json(
      { ok: false, error: "No pudimos comprobar que eres una persona. Intenta de nuevo." },
      { status: 403 }
    );
  }

  try {
    const disp = nuevoDispositivo();
    if (!disp) {
      console.error("[pasaporte] falta DEVICE_COOKIE_SECRET (mínimo 32 caracteres)");
      return NextResponse.json({ ok: true, destino, registrado: false });
    }
    const slug = await svcRpc<string | null>("ligar_dispositivo", {
      p_whatsapp: whatsapp,
      p_token_hash: disp.tokenHash,
      p_user_agent: req.headers.get("user-agent") ?? "",
      p_vacante_id: vacante?.id ?? null,
    });
    if (!slug) return NextResponse.json({ ok: false, noEncontrado: true }, { status: 404 });

    if (vacante) waitUntil(registrarClick(disp.tokenHash, vacante.id, canal, metaDeHeaders(req.headers)));

    const out = NextResponse.json({ ok: true, destino, registrado: true });
    out.cookies.set(DEVICE_COOKIE, disp.cookie, deviceCookieOptions);
    return out;
  } catch (e) {
    console.error("[pasaporte] no se pudo ligar el dispositivo:", e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: true, destino, registrado: false });
  }
}
