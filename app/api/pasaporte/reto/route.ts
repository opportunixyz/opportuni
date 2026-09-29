import { NextResponse } from "next/server";
import { nuevoReto } from "../../../lib/pasaporte/passkey";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Reto para "Ya tengo pasaporte" con passkey. La puerta lo pide antes de que
// el joven toque el botón, para que el Face ID salga en el mismo toque.
export async function GET() {
  const reto = nuevoReto();
  if (!reto) return NextResponse.json({ ok: false }, { status: 503 });
  return NextResponse.json({ ok: true, reto }, { headers: { "Cache-Control": "no-store" } });
}
