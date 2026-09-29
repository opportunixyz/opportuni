import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { dispositivoActual } from "../../../lib/pasaporte/sesion";
import { asegurarRespaldo, emitirPendientes, guardarCuentaPasskey } from "../../../lib/stellar/pasaporte";
import { stellarServidor } from "../../../lib/stellar/config";
import { svcInsert } from "../../../lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// La puerta avisa cómo terminó la cuenta del pasaporte (PRD F1 pasos 3 y 4):
// - { resultado: "passkey", contractId, credentialId, publicKey, reglaId }:
//   el kit creó la cuenta (y quizá la regla). Se comprueba en la cadena y se
//   guarda; luego se emite lo pendiente.
// - { resultado: "fallo", motivo }: la passkey falló, se canceló o no hay
//   soporte. Se crea la cuenta de respaldo en segundo plano (RF1).
// Nunca frena al joven: responde de inmediato y el trabajo sigue con waitUntil.

const B64URL = /^[A-Za-z0-9_-]+$/;
const C = /^C[A-Z2-7]{55}$/;
const MOTIVOS = ["sin_soporte", "sin_autenticador", "cancelada", "error", "inapp", "regla_cancelada", "regla_error"] as const;

export async function POST(req: NextRequest) {
  if (!stellarServidor()) return NextResponse.json({ ok: true, stellar: false });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  let disp;
  try {
    disp = await dispositivoActual();
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  if (!disp?.confirmado) return NextResponse.json({ ok: false }, { status: 401 });
  const ua = (req.headers.get("user-agent") ?? "").slice(0, 400);

  if (body.resultado === "fallo") {
    const motivo = MOTIVOS.find((m) => m === body.motivo) ?? "error";
    const detalle = typeof body.detalle === "string" ? body.detalle.slice(0, 200) : null;
    const tipo = motivo === "cancelada" || motivo === "regla_cancelada" ? "passkey_cancel" : "passkey_error";
    waitUntil(
      svcInsert("pasaporte_eventos", { tipo, slug: disp.slug, user_agent: ua, detalle: { motivo, detalle } })
        .catch(() => undefined)
        .then(() => (motivo.startsWith("regla_") ? undefined : asegurarRespaldo(disp.slug, motivo)))
    );
    return NextResponse.json({ ok: true });
  }

  const { contractId, credentialId, publicKey, reglaId } = body;
  if (
    typeof contractId !== "string" ||
    !C.test(contractId) ||
    typeof credentialId !== "string" ||
    !B64URL.test(credentialId) ||
    credentialId.length > 1400 ||
    typeof publicKey !== "string" ||
    !B64URL.test(publicKey) ||
    !(reglaId === null || (typeof reglaId === "number" && Number.isInteger(reglaId) && reglaId >= 0 && reglaId < 100))
  ) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    const estado = await guardarCuentaPasskey(disp.slug, { contractId, credentialId, publicKey, reglaId });
    if (estado === "lista") waitUntil(emitirPendientes(disp.slug));
    return NextResponse.json({ ok: estado === "lista" || estado === "sin_permiso", estado });
  } catch (e) {
    console.error("[cuenta] no se guardó:", e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
