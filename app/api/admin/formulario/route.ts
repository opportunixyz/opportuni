import { NextRequest, NextResponse } from "next/server";
import { ACTOR_WEB, respuestaError, sinSesion } from "../../../lib/admin/guard";
import { crearPregunta, listarPreguntas } from "../../../lib/admin/formulario";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const bloqueo = await sinSesion();
  if (bloqueo) return bloqueo;
  try {
    return NextResponse.json({ ok: true, preguntas: await listarPreguntas() });
  } catch (e) {
    return respuestaError(e, "formulario");
  }
}

// POST: pregunta nueva. No se le hace a quien ya tiene pasaporte.
export async function POST(req: NextRequest) {
  const bloqueo = await sinSesion();
  if (bloqueo) return bloqueo;
  try {
    const body = await req.json().catch(() => ({}));
    return NextResponse.json({ ok: true, pregunta: await crearPregunta(body, ACTOR_WEB) });
  } catch (e) {
    return respuestaError(e, "crear pregunta");
  }
}
