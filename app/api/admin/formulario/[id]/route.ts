import { NextRequest, NextResponse } from "next/server";
import { ACTOR_WEB, respuestaError, sinSesion } from "../../../../lib/admin/guard";
import { actualizarPregunta } from "../../../../lib/admin/formulario";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PUT: cambia texto, explicación, opciones, orden, si es obligatoria o si está activa.
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const bloqueo = await sinSesion();
  if (bloqueo) return bloqueo;
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ ok: false, error: "Pregunta inválida." }, { status: 400 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    return NextResponse.json({ ok: true, pregunta: await actualizarPregunta(id, body, ACTOR_WEB) });
  } catch (e) {
    return respuestaError(e, "editar pregunta");
  }
}
