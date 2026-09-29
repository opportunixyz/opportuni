import { createHash, randomBytes } from "crypto";
import { Address, StrKey, hash, xdr } from "@stellar/stellar-sdk";
import { svcInsert, svcRpc, svcSelect, svcUpdate } from "../supabase";
import { stellarServidor, type StellarServidor } from "./config";
import { cifrar } from "./custodia";
import {
  crearCuentaRespaldo,
  emitirCredencial,
  esReglaOpportuni,
  ledgerActual,
  leerRegla,
  type TipoCredencial,
} from "./cuentas";

// El pasaporte en Stellar visto desde la app (PRD 8.3 y 8.5): encolar la
// credencial de cada click, crear la cuenta de respaldo, emitir y guardar la
// cuenta con passkey que crea el navegador. Si Stellar no está configurado,
// todo esto no hace nada y la puerta sigue como en la fase 1.

/** Deployer compartido del kit (docs/deployments del kit): deriva la dirección de la cuenta con passkey. */
export const DEPLOYER_KIT = "GAAH4OT36RRCCAGKARGPN2HLHT2NOBVFHO4GUHA6CF7UKQ4MMV24WQ4N";

const log = (msg: string, e?: unknown) =>
  console.error(`[stellar] ${msg}`, e instanceof Error ? e.message : e ?? "");

const corto = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 480);

/** Hash con salt que va a la cadena (RF15): nada personal, solo tipo y referencia. */
export function hashCredencial(tipo: TipoCredencial, refId: string) {
  const salt = randomBytes(32);
  const h = createHash("sha256")
    .update(salt)
    .update(`opportuni:credencial:v1:${tipo}:${refId}`)
    .digest();
  return { salt: salt.toString("hex"), hash: h.toString("hex") };
}

async function evento(tipo: string, slug: string, detalle?: Record<string, unknown>) {
  try {
    await svcInsert("pasaporte_eventos", { tipo, slug, detalle: detalle ?? null });
  } catch (e) {
    log("evento no registrado", e);
  }
}

// ---------------------------------------------------------------------------
// Emisión
// ---------------------------------------------------------------------------

/** Envía una credencial si su cuenta está lista. No lanza: deja el estado en la base. */
export async function emitir(id: number, cfg: StellarServidor | null = stellarServidor()): Promise<void> {
  if (!cfg) return;
  let tomada: { id: number; tipo: TipoCredencial; hash: string; contract_id: string; regla_id: number } | undefined;
  try {
    [tomada] = await svcRpc<typeof tomada[]>("credencial_tomar", { p_id: id });
  } catch (e) {
    return log(`credencial ${id} no se pudo tomar`, e);
  }
  if (!tomada) return;
  try {
    const r = await emitirCredencial(cfg, {
      cuenta: tomada.contract_id,
      reglaId: tomada.regla_id,
      tipo: tomada.tipo,
      hash: Buffer.from(tomada.hash, "hex"),
    });
    await svcUpdate("credenciales", `id=eq.${id}`, {
      estado: "confirmada",
      tx_hash: r.hash,
      onchain_id: r.id,
      error: null,
      updated_at: new Date().toISOString(),
    });
  } catch (e) {
    log(`credencial ${id} fallida`, e);
    await svcUpdate("credenciales", `id=eq.${id}`, {
      estado: "fallida",
      error: corto(e),
      updated_at: new Date().toISOString(),
    }).catch((x) => log("no se guardó el fallo", x));
  }
}

/** Emite las credenciales pendientes de un pasaporte, una por una. */
export async function emitirPendientes(slug: string, cfg: StellarServidor | null = stellarServidor()) {
  if (!cfg) return;
  try {
    const filas = await svcSelect<{ id: number }>(
      `credenciales?select=id&pasaporte_slug=eq.${encodeURIComponent(slug)}&red=eq.${cfg.red}&estado=in.(pendiente,fallida)&intentos=lt.5&order=id`
    );
    for (const f of filas) await emitir(f.id, cfg);
  } catch (e) {
    log(`pendientes de ${slug}`, e);
  }
}

// ---------------------------------------------------------------------------
// Cuenta de respaldo
// ---------------------------------------------------------------------------

/**
 * Crea la cuenta de respaldo del pasaporte si nadie más la está creando y
 * luego emite lo pendiente. La llave secreta solo existe cifrada (RF7).
 */
export async function asegurarRespaldo(slug: string, motivo: string, cfg: StellarServidor | null = stellarServidor()) {
  if (!cfg) return;
  let gano: boolean | null = null;
  try {
    gano = await svcRpc<boolean | null>("cuenta_tomar", { p_slug: slug, p_red: cfg.red });
  } catch (e) {
    return log(`candado de cuenta ${slug}`, e);
  }
  if (!gano) return;

  try {
    const c = await crearCuentaRespaldo(cfg);
    const { cifrada, iv } = cifrar(c.secreto, slug);
    await svcUpdate("pasaportes", `slug=eq.${encodeURIComponent(slug)}`, {
      red: cfg.red,
      modo: "respaldo",
      contract_id: c.contractId,
      credential_id: null,
      passkey_pubkey: null,
      firmante_pub: c.firmantePub,
      clave_cifrada: cifrada,
      clave_iv: iv,
      regla_id: c.reglaId,
      regla_hasta: c.reglaHasta,
      cuenta_estado: "lista",
      cuenta_error: null,
      cuenta_at: new Date().toISOString(),
    });
    await evento("respaldo_creado", slug, { motivo, red: cfg.red });
  } catch (e) {
    log(`respaldo de ${slug}`, e);
    await svcUpdate("pasaportes", `slug=eq.${encodeURIComponent(slug)}`, {
      cuenta_estado: "fallida",
      cuenta_error: corto(e),
      cuenta_at: new Date().toISOString(),
    }).catch((x) => log("no se guardó el fallo", x));
    await evento("cuenta_error", slug, { motivo, error: corto(e) });
    return;
  }
  await emitirPendientes(slug, cfg);
}

// ---------------------------------------------------------------------------
// Click → credencial `vacante`
// ---------------------------------------------------------------------------

/**
 * Encola la credencial `vacante` de un click desde un dispositivo confirmado y
 * la emite. Con `crearCuenta`, si el pasaporte no tiene cuenta en esta red le
 * crea la de respaldo (pasaportes de la fase 1, o quien cerró la puerta a
 * medias).
 */
export async function credencialDeClick(tokenHash: string, vacanteId: string, crearCuenta: boolean) {
  const cfg = stellarServidor();
  if (!cfg) return;
  const { salt, hash: h } = hashCredencial("vacante", vacanteId);
  let r: { id: number | null; slug: string; cuenta_lista: boolean; sin_cuenta: boolean } | null;
  try {
    r = await svcRpc("credencial_vacante", {
      p_token_hash: tokenHash,
      p_vacante_id: vacanteId,
      p_red: cfg.red,
      p_salt: salt,
      p_hash: h,
    });
  } catch (e) {
    return log("no se encoló la credencial", e);
  }
  if (!r) return;
  if (r.cuenta_lista && r.id) return emitir(r.id, cfg);
  if (r.sin_cuenta && crearCuenta) return asegurarRespaldo(r.slug, "click", cfg);
}

// ---------------------------------------------------------------------------
// Cuenta con passkey (la crea el navegador con el kit)
// ---------------------------------------------------------------------------

export function direccionKit(credentialId: Buffer, passphrase: string): string {
  const preimagen = xdr.HashIdPreimage.envelopeTypeContractId(
    new xdr.HashIdPreimageContractId({
      networkId: hash(Buffer.from(passphrase)),
      contractIdPreimage: xdr.ContractIdPreimage.contractIdPreimageFromAddress(
        new xdr.ContractIdPreimageFromAddress({
          address: Address.fromString(DEPLOYER_KIT).toScAddress(),
          salt: hash(credentialId),
        })
      ),
    })
  );
  return StrKey.encodeContract(hash(preimagen.toXDR()));
}

export type ResultadoCuenta = "lista" | "sin_permiso" | "invalida" | "ya_tiene";

/**
 * Guarda la cuenta con passkey que creó el navegador, después de comprobarla
 * en la cadena: la dirección sale del credentialId, la regla 0 tiene esa
 * passkey y, si viene `reglaId`, es la regla de Opportuni vigente.
 */
export async function guardarCuentaPasskey(
  slug: string,
  p: { contractId: string; credentialId: string; publicKey: string; reglaId: number | null }
): Promise<ResultadoCuenta> {
  const cfg = stellarServidor();
  if (!cfg) return "invalida";

  const credId = Buffer.from(p.credentialId, "base64url");
  const pub = Buffer.from(p.publicKey, "base64url");
  if (credId.length < 16 || pub.length !== 65 || pub[0] !== 4) return "invalida";
  if (direccionKit(credId, cfg.passphrase) !== p.contractId) return "invalida";

  const [actual] = await svcSelect<{ red: string | null; cuenta_estado: string | null; contract_id: string | null }>(
    `pasaportes?select=red,cuenta_estado,contract_id&slug=eq.${encodeURIComponent(slug)}`
  );
  if (!actual) return "invalida";
  if (actual.red === cfg.red && actual.cuenta_estado === "lista" && actual.contract_id !== p.contractId) {
    return "ya_tiene";
  }

  const regla0 = await leerRegla(cfg, p.contractId, 0);
  const keyData = Buffer.concat([pub, credId]).toString("hex");
  if (!regla0 || !regla0.firmantes.includes(`External:${cfg.webauthnVerifier}:${keyData}`)) return "invalida";

  let estado: "lista" | "sin_permiso" = "sin_permiso";
  let hasta: number | null = null;
  if (p.reglaId !== null) {
    const regla = await leerRegla(cfg, p.contractId, p.reglaId);
    if (esReglaOpportuni(cfg, regla, await ledgerActual(cfg))) {
      estado = "lista";
      hasta = regla!.hasta;
    }
  }

  await svcUpdate("pasaportes", `slug=eq.${encodeURIComponent(slug)}`, {
    red: cfg.red,
    modo: "passkey",
    contract_id: p.contractId,
    credential_id: p.credentialId,
    passkey_pubkey: p.publicKey,
    firmante_pub: null,
    clave_cifrada: null,
    clave_iv: null,
    regla_id: estado === "lista" ? p.reglaId : null,
    regla_hasta: hasta,
    cuenta_estado: estado,
    cuenta_error: null,
    cuenta_at: new Date().toISOString(),
  });
  await evento(estado === "lista" ? "regla_ok" : "passkey_ok", slug, { red: cfg.red });
  return estado;
}
