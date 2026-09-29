import { NextRequest, NextResponse } from "next/server";
import { respuestaError, sinSesion } from "../../../lib/admin/guard";
import { listarJovenes, vacantesDeJoven } from "../../../lib/admin/jovenes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
