import { NextResponse } from "next/server";
import { listSubmissions } from "../../../lib/submissions";
import { sinSesion } from "../../../lib/admin/guard";

export const runtime = "nodejs";

// Lista los CVs + asesorías del dashboard admin. Solo con sesión de admin.
export async function GET() {
  const bloqueo = await sinSesion();
  if (bloqueo) return bloqueo;
  const all = await listSubmissions();
  return NextResponse.json({
    ok: true,
    cvs: all.filter((s) => s.type === "cv"),
    asesorias: all.filter((s) => s.type === "asesoria"),
  });
}
