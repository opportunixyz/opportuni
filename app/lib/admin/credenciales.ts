import { waitUntil } from "@vercel/functions";
import { stellarServidor } from "../stellar/config";
import { asegurarRespaldo, emitir, hashCredencial } from "../stellar/pasaporte";
import { svcInsert, svcSelect } from "../supabase";
import { ErrorServicio } from "./vacantes";

// Credenciales que emite el equipo (PRD F2). Por ahora `cv_verificado`: la da
// Vianey a mano a quien pagó y cuyo CV ya pasa filtros ATS.

export type ResultadoEmision =
  | { estado: "enviando"; mensaje: string }
  | { estado: "pendiente"; mensaje: string };

export async function emitirCvVerificado(slug: string): Promise<ResultadoEmision> {
  const cfg = stellarServidor();
  if (!cfg) throw new ErrorServicio("Stellar no está configurado en este ambiente.", 503);
  if (!/^[a-z0-9]{8}$/.test(slug)) throw new ErrorServicio("Pasaporte inválido.", 400);

  const [p] = await svcSelect<{ red: string | null; cuenta_estado: string | null }>(
    `pasaportes?select=red,cuenta_estado&slug=eq.${slug}`
  );
  if (!p) throw new ErrorServicio("No existe ese pasaporte.", 404);

  // Si ya hay uno sin confirmar (fallido o pendiente), se reintenta ese.
  const [previa] = await svcSelect<{ id: number }>(
    `credenciales?select=id&pasaporte_slug=eq.${slug}&tipo=eq.cv_verificado&red=eq.${cfg.red}&estado=in.(pendiente,fallida)&order=id.desc&limit=1`
  );
  let id: number;
  if (previa) {
    id = previa.id;
  } else {
    // Una por día: evita el doble click y deja volver a emitir más adelante.
    const refId = `cv-${new Date().toISOString().slice(0, 10)}`;
    const { salt, hash } = hashCredencial("cv_verificado", refId);
    try {
      const [fila] = await svcInsert<{ id: number }>(
        "credenciales",
        { pasaporte_slug: slug, tipo: "cv_verificado", ref_id: refId, red: cfg.red, salt, hash },
        { returning: true }
      );
      id = fila.id;
    } catch (e) {
      if (e instanceof Error && e.message.includes("23505")) {
        throw new ErrorServicio("Hoy ya se le emitió un CV verificado a este pasaporte.", 409);
      }
      throw e;
    }
  }

  if (p.red === cfg.red && p.cuenta_estado === "lista") {
    waitUntil(emitir(id, cfg));
    return { estado: "enviando", mensaje: "Se está emitiendo; en unos segundos queda confirmado." };
  }
  if (p.red === cfg.red && p.cuenta_estado === "sin_permiso") {
    return {
      estado: "pendiente",
      mensaje: "Queda pendiente: esta persona no autorizó el permiso de Opportuni en su pasaporte.",
    };
  }
  // Sin cuenta todavía (pasaporte de la fase 1, o se creó a medias): se le
  // crea la de respaldo y al terminar se emite lo pendiente.
  waitUntil(asegurarRespaldo(slug, "cv_verificado", cfg));
  return { estado: "enviando", mensaje: "Se le está creando su cuenta; después se emite (tarda ~30 s)." };
}
