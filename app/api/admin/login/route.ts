import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, adminConfigurado, adminCookieOptions, crearSesion, passwordCorrecta } from "../../../lib/admin/sesion";
import { dentroDelLimite, ipDe } from "../../../lib/limite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST { password } → cookie de sesión firmada (PRD 8.6).
export async function POST(req: NextRequest) {
  if (!adminConfigurado()) {
    return NextResponse.json(
      { ok: false, error: "El admin no está configurado (ADMIN_PASSWORD y ADMIN_SESSION_SECRET)." },
      { status: 503 }
    );
  }
  if (!dentroDelLimite(`login:${ipDe(req.headers)}`, 8, 15 * 60_000)) {
    return NextResponse.json({ ok: false, error: "Demasiados intentos. Espera unos minutos." }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";
  if (!(await passwordCorrecta(password))) {
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json({ ok: false, error: "Contraseña incorrecta." }, { status: 401 });
  }
  const sesion = await crearSesion();
  if (!sesion) return NextResponse.json({ ok: false, error: "No se pudo iniciar sesión." }, { status: 503 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, sesion, adminCookieOptions);
  return res;
}
