import { NextRequest, NextResponse } from "next/server";
import { emitirCvVerificado } from "../../../lib/admin/credenciales";
import { respuestaError, sinSesion } from "../../../lib/admin/guard";
import { listarJovenes, vacantesDeJoven } from "../../../lib/admin/jovenes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Emitir puede crear la cuenta de respaldo y luego la credencial (~30 s en
// segundo plano).
export const maxDuration = 60;

// GET ?q= : jóvenes con pasaporte, buscando por nombre o WhatsApp. Con ?slug=,
// las vacantes que abrió esa persona. Solo equipo.
export async function GET(req: NextRequest) {
  const bloqueo = await sinSesion();
  if (bloqueo) return bloqueo;
  try {
    const params = new URL(req.url).searchParams;
    const slug = params.get("slug");
    if (slug) return NextResponse.json({ ok: true, vacantes: await vacantesDeJoven(slug) });
    const q = params.get("q") ?? "";
    return NextResponse.json({ ok: true, jovenes: await listarJovenes(q) });
  } catch (e) {
    return respuestaError(e, "jóvenes");
  }
}

// POST { slug, accion: "cv_verificado" }: emite el CV verificado (PRD F2).
export async function POST(req: NextRequest) {
  const bloqueo = await sinSesion();
  if (bloqueo) return bloqueo;
  try {
    const body = (await req.json().catch(() => ({}))) as { slug?: unknown; accion?: unknown };
    if (body.accion !== "cv_verificado" || typeof body.slug !== "string") {
      return NextResponse.json({ ok: false, error: "Acción inválida." }, { status: 400 });
    }
    return NextResponse.json({ ok: true, ...(await emitirCvVerificado(body.slug)) });
  } catch (e) {
    return respuestaError(e, "emitir CV verificado");
  }
}
