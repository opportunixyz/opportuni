import { NextRequest, NextResponse } from "next/server";
import { ACTOR_WEB, respuestaError, sinSesion } from "../../../lib/admin/guard";
import { activarVacante, crearVacante, listarVacantes, postulantesDe, quienAbrio } from "../../../lib/admin/vacantes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET: vacantes con clicks, personas y postulantes. Con ?vacante={id}, los
// postulantes de esa vacante (formulario propio /postular). Con ?abrieron={id},
// las personas con pasaporte que la abrieron (solo equipo).
export async function GET(req: NextRequest) {
  const bloqueo = await sinSesion();
  if (bloqueo) return bloqueo;
  const params = new URL(req.url).searchParams;
  const id = params.get("vacante");
  const abrieron = params.get("abrieron");
  try {
    if (abrieron) return NextResponse.json({ ok: true, personas: await quienAbrio(abrieron) });
    if (id) return NextResponse.json({ ok: true, postulantes: await postulantesDe(id) });
    return NextResponse.json({ ok: true, stats: await listarVacantes() });
  } catch (e) {
    return respuestaError(e, "vacantes");
  }
}

// POST: pegar la URL de la vacante y obtener opportuni.xyz/v/{slug}.
export async function POST(req: NextRequest) {
  const bloqueo = await sinSesion();
  if (bloqueo) return bloqueo;
  try {
    const body = await req.json().catch(() => ({}));
    const r = await crearVacante(body, ACTOR_WEB);
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    return respuestaError(e, "crear vacante");
  }
}

// PATCH { id, activa }: apagar o prender un link sin borrar sus datos.
export async function PATCH(req: NextRequest) {
  const bloqueo = await sinSesion();
  if (bloqueo) return bloqueo;
  try {
    const body = await req.json().catch(() => ({}));
    await activarVacante(String(body.id ?? ""), body.activa === true);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return respuestaError(e, "activar vacante");
  }
}
