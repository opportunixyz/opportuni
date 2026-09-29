import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { DEVICE_COOKIE, deviceCookieOptions, nuevoDispositivo } from "../../lib/pasaporte/dispositivo";
import { getFormularioVersion, getPreguntas, validarRespuestas, type Respuestas } from "../../lib/pasaporte/formulario";
import { metaDeHeaders } from "../../lib/pasaporte/metadata";
import { buscarVacante, canalValido, destinoDe, nuevoSlugPasaporte, registrarClick } from "../../lib/pasaporte/puerta";
import { TERMINOS_VERSION } from "../../lib/pasaporte/terminos";
import { dentroDelLimite, ipDe } from "../../lib/limite";
import { svcRpc } from "../../lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST: la puerta envía el formulario del pasaporte. Crea el pasaporte y su
// dispositivo (confirmado), deja la cookie opp_dev, registra el click y
// devuelve a dónde ir. Si el WhatsApp ya tiene pasaporte no crea otro (RF9).
// Si la base falla, responde con el destino igual para que el joven llegue a
// la vacante (RF1 y RF11).
export async function POST(req: NextRequest) {
  let body: { vacante?: unknown; canal?: unknown; respuestas?: unknown; terminos?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Solicitud inválida." }, { status: 400 });
  }

  const lookup = await buscarVacante(String(body.vacante ?? ""));
  const vacante = lookup.estado === "no_existe" ? null : lookup.vacante;
  const destino = destinoDe(vacante);
  const canal = canalValido(typeof body.canal === "string" ? body.canal : null);
  const sigue = () => NextResponse.json({ ok: true, destino, registrado: false });

  if (body.terminos !== true) {
    return NextResponse.json({ ok: false, error: "Para seguir, marca la casilla.", clave: "terminos" }, { status: 400 });
  }
  if (!dentroDelLimite(`crear:${ipDe(req.headers)}`, 20, 10 * 60_000)) {
    return NextResponse.json({ ok: false, error: "Demasiados intentos. Espera unos minutos." }, { status: 429 });
  }
  if (lookup.estado === "sin_base") return sigue();

  const respuestas = (body.respuestas && typeof body.respuestas === "object" ? body.respuestas : {}) as Respuestas;

  try {
    const [preguntas, version] = await Promise.all([getPreguntas(true), getFormularioVersion()]);
    const v = validarRespuestas(preguntas, respuestas);
    if (!v.ok) return NextResponse.json({ ok: false, error: v.error, clave: v.clave }, { status: 400 });

    const disp = nuevoDispositivo();
    if (!disp) {
      console.error("[pasaporte] falta DEVICE_COOKIE_SECRET (mínimo 32 caracteres)");
      return sigue();
    }

    const meta = metaDeHeaders(req.headers);
    const ua = req.headers.get("user-agent") ?? "";
    let res: { creado: boolean; slug?: string } | null = null;
    for (let i = 0; i < 3 && !res; i++) {
      try {
        res = await svcRpc<{ creado: boolean; slug?: string }>("crear_pasaporte", {
          p_slug: nuevoSlugPasaporte(),
          p_nombre: v.datos.nombre,
          p_whatsapp: v.datos.whatsapp,
          p_estado: v.datos.estado,
          p_pais: v.datos.pais,
          p_areas: v.datos.areas,
          p_rango_edad: v.datos.rango_edad,
          p_respuestas_extra: v.datos.respuestas_extra,
          p_form_version: version,
          p_terminos_version: TERMINOS_VERSION,
          p_estado_ip: meta.estado_ip,
          p_plataforma: `${meta.sistema} · ${meta.navegador}`,
          p_token_hash: disp.tokenHash,
          p_user_agent: ua,
          p_vacante_id: vacante?.id ?? null,
        });
      } catch (e) {
        // Choque de slug (8 caracteres aleatorios): se reintenta con otro.
        if (!(e instanceof Error && e.message.includes("pasaportes_pkey"))) throw e;
      }
    }
    if (!res) throw new Error("No se pudo generar un slug libre.");
    if (!res.creado) {
      return NextResponse.json({ ok: false, existe: true, error: "Ese WhatsApp ya tiene pasaporte." }, { status: 409 });
    }

    if (vacante) waitUntil(registrarClick(disp.tokenHash, vacante.id, canal, meta));

    const out = NextResponse.json({ ok: true, destino, registrado: true });
    out.cookies.set(DEVICE_COOKIE, disp.cookie, deviceCookieOptions);
    return out;
  } catch (e) {
    console.error("[pasaporte] no se pudo crear:", e instanceof Error ? e.message : e);
    return sigue();
  }
}
