import { NextRequest, NextResponse } from "next/server";
import { respuestaError, sinSesion } from "../../../lib/admin/guard";
import { listarJovenes } from "../../../lib/admin/jovenes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET ?q= : jóvenes con pasaporte, buscando por nombre o WhatsApp. Solo equipo.
export async function GET(req: NextRequest) {
  const bloqueo = await sinSesion();
  if (bloqueo) return bloqueo;
  try {
    const q = new URL(req.url).searchParams.get("q") ?? "";
    return NextResponse.json({ ok: true, jovenes: await listarJovenes(q) });
  } catch (e) {
    return respuestaError(e, "jóvenes");
  }
}
