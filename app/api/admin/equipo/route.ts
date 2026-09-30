import { NextRequest, NextResponse } from "next/server";
import { respuestaError, sinSesion } from "../../../lib/admin/guard";
import { actualizarUsuario, cerrarSesiones, crearUsuario, listarEquipo } from "../../../lib/oauth/equipo";
import { svcInsert, svcSelect } from "../../../lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Usuarios del equipo para el conector de Claude y la bitácora. Solo /admin.
const auditar = (accion: string, detalle: Record<string, unknown>) =>
  svcInsert("admin_audit", { usuario: "admin_web", rol: "admin", via: "admin", accion, detalle }).catch(() => undefined);

export async function GET() {
  const bloqueo = await sinSesion();
  if (bloqueo) return bloqueo;
  try {
    const [usuarios, bitacora] = await Promise.all([
      listarEquipo(),
      svcSelect("admin_audit?select=usuario,via,accion,detalle,created_at&order=id.desc&limit=50"),
    ]);
    return NextResponse.json({ ok: true, usuarios, bitacora });
  } catch (e) {
    return respuestaError(e, "equipo");
  }
}

// POST { usuario, nombre, rol, password }: usuario nuevo.
export async function POST(req: NextRequest) {
  const bloqueo = await sinSesion();
  if (bloqueo) return bloqueo;
  try {
    const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    await crearUsuario({
      usuario: String(b.usuario ?? ""),
      nombre: String(b.nombre ?? ""),
      rol: String(b.rol ?? ""),
      password: String(b.password ?? ""),
    });
    await auditar("crear_usuario", { usuario: b.usuario, rol: b.rol });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return respuestaError(e, "crear usuario");
  }
}

// PATCH { usuario, password?, rol?, activo?, cerrarSesiones? }
export async function PATCH(req: NextRequest) {
  const bloqueo = await sinSesion();
  if (bloqueo) return bloqueo;
  try {
    const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const usuario = String(b.usuario ?? "");
    if (b.cerrarSesiones === true) {
      await cerrarSesiones(usuario);
      await auditar("cerrar_sesiones", { usuario });
      return NextResponse.json({ ok: true });
    }
    await actualizarUsuario(usuario, {
      password: typeof b.password === "string" ? b.password : undefined,
      rol: typeof b.rol === "string" ? b.rol : undefined,
      activo: typeof b.activo === "boolean" ? b.activo : undefined,
    });
    await auditar("editar_usuario", {
      usuario,
      cambio: typeof b.password === "string" ? "password" : typeof b.activo === "boolean" ? `activo=${b.activo}` : `rol=${b.rol}`,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return respuestaError(e, "editar usuario");
  }
}
