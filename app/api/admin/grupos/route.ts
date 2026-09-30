import { NextRequest, NextResponse } from "next/server";
import { actualizarGrupo, crearGrupo, listarGrupos, statsGrupos } from "../../../lib/admin/grupos";
import { respuestaError, sinSesion } from "../../../lib/admin/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Grupos de WhatsApp (links por grupo). Solo equipo.
// GET: grupos y cifras por grupo; con ?vacante=, las de esa vacante.
export async function GET(req: NextRequest) {
  const bloqueo = await sinSesion();
  if (bloqueo) return bloqueo;
  try {
    const vacante = new URL(req.url).searchParams.get("vacante") ?? "";
    const [grupos, stats] = await Promise.all([listarGrupos(), statsGrupos(vacante)]);
    return NextResponse.json({ ok: true, grupos, stats });
  } catch (e) {
    return respuestaError(e, "grupos");
  }
}

// POST { nombre, slug?, comunidad? }: grupo nuevo.
export async function POST(req: NextRequest) {
  const bloqueo = await sinSesion();
  if (bloqueo) return bloqueo;
  try {
    const b = (await req.json().catch(() => ({}))) as { nombre?: unknown; slug?: unknown; comunidad?: unknown };
    const grupo = await crearGrupo(
      String(b.nombre ?? ""),
      typeof b.slug === "string" ? b.slug : undefined,
      typeof b.comunidad === "string" ? b.comunidad : undefined
    );
    return NextResponse.json({ ok: true, grupo });
  } catch (e) {
    return respuestaError(e, "crear grupo");
  }
}

// PATCH { slug, nombre?, comunidad?, activo?, orden? }: el link (slug) no cambia.
export async function PATCH(req: NextRequest) {
  const bloqueo = await sinSesion();
  if (bloqueo) return bloqueo;
  try {
    const b = (await req.json().catch(() => ({}))) as {
      slug?: unknown;
      nombre?: unknown;
      comunidad?: unknown;
      activo?: unknown;
      orden?: unknown;
    };
    const grupo = await actualizarGrupo(String(b.slug ?? ""), {
      nombre: typeof b.nombre === "string" ? b.nombre : undefined,
      comunidad: typeof b.comunidad === "string" ? b.comunidad : undefined,
      activo: typeof b.activo === "boolean" ? b.activo : undefined,
      orden: typeof b.orden === "number" ? b.orden : undefined,
    });
    return NextResponse.json({ ok: true, grupo });
  } catch (e) {
    return respuestaError(e, "editar grupo");
  }
}
