import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE, sesionValida } from "./sesion";
import { ErrorServicio } from "./vacantes";

// Segunda revisión en cada API route de admin, además del middleware: si
// alguien cambia el matcher por error, las rutas siguen cerradas.
export async function sinSesion(): Promise<NextResponse | null> {
  if (await sesionValida(cookies().get(ADMIN_COOKIE)?.value)) return null;
  return NextResponse.json({ ok: false, error: "Inicia sesión en /admin." }, { status: 401 });
}

/** Actor para updated_by / creada_por. Con una sola contraseña es "admin_web"; las llaves por rol llegan en la fase 3. */
export const ACTOR_WEB = "admin_web";

export function respuestaError(e: unknown, contexto: string) {
  if (e instanceof ErrorServicio) {
    return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
  }
  console.error(`[admin] ${contexto}:`, e instanceof Error ? e.message : e);
  return NextResponse.json({ ok: false, error: "No se pudo completar. Intenta de nuevo." }, { status: 500 });
}
