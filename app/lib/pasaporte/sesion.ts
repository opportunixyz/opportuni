import { cookies } from "next/headers";
import { svcSelect } from "../supabase";
import { DEVICE_COOKIE, leerDispositivo } from "./dispositivo";

// El pasaporte del dispositivo que hace la petición (cookie opp_dev firmada).

export interface DispositivoActual {
  tokenHash: string;
  slug: string;
  confirmado: boolean;
}

export async function dispositivoActual(): Promise<DispositivoActual | null> {
  const disp = leerDispositivo(cookies().get(DEVICE_COOKIE)?.value);
  if (!disp) return null;
  const [fila] = await svcSelect<{ pasaporte_slug: string; confirmado: boolean }>(
    `dispositivos?select=pasaporte_slug,confirmado&token_hash=eq.${disp.tokenHash}`,
    4000
  );
  return fila ? { tokenHash: disp.tokenHash, slug: fila.pasaporte_slug, confirmado: fila.confirmado } : null;
}
