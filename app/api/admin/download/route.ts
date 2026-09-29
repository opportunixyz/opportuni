import { NextRequest, NextResponse } from "next/server";
import { getPdf } from "../../../lib/submissions";
import { sinSesion } from "../../../lib/admin/guard";

export const runtime = "nodejs";

// Descarga el PDF de un CV. Solo con sesión de admin (middleware y sinSesion).
export async function GET(req: NextRequest) {
  const bloqueo = await sinSesion();
  if (bloqueo) return bloqueo;
  const url = new URL(req.url);
  const ref = url.searchParams.get("ref") ?? "";
  const pdf = await getPdf(ref);
  if (!pdf) {
    return NextResponse.json({ ok: false, error: "No encontrado." }, { status: 404 });
  }
  return new NextResponse(pdf.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${pdf.filename}"`,
    },
  });
}
