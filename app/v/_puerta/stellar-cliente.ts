import { rpc } from "@stellar/stellar-sdk";
import {
  MemoryStorage,
  SmartAccountKit,
  createCallContractContext,
  createDelegatedSigner,
  type AssembledTransaction,
  type ContextRule,
} from "smart-account-kit";
import { stellarPublica } from "../../lib/stellar/config";

// La cuenta del pasaporte con passkey, en el navegador (PRD 8.3). Este módulo
// se carga aparte (import dinámico) para no hacer pesada la puerta.
// 1. crearCuenta: Face ID/huella nuevo y despliegue por nuestro relayer.
// 2. prepararRegla + firmarRegla: segundo Face ID para el permiso de
//    Opportuni (CallContract(registro), Delegated(emisor), ~12 meses).

const RP_ID = "opportuni.xyz";
const VIGENCIA_REGLA = 365 * 17_280;

let kit: SmartAccountKit | null = null;

function obtenerKit(): SmartAccountKit {
  const cfg = stellarPublica();
  if (!cfg) throw new Error("Stellar no está configurado.");
  if (!kit) {
    kit = new SmartAccountKit({
      rpcUrl: cfg.rpcUrl,
      networkPassphrase: cfg.passphrase,
      accountWasmHash: cfg.accountWasmHash,
      webauthnVerifierAddress: cfg.webauthnVerifier,
      relayerUrl: `${window.location.origin}/api/pasaporte/relayer`,
      rpId: RP_ID,
      rpName: "Opportuni",
      storage: new MemoryStorage(),
      indexerUrl: false,
      timeoutInSeconds: 60,
    });
  }
  return kit;
}

const b64url = (b: Uint8Array) =>
  btoa(String.fromCharCode(...Array.from(b))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export interface CuentaCreada {
  contractId: string;
  credentialId: string;
  publicKey: string;
}

// El kit arma el user.id de la passkey con `${nombre}:${fecha}:${Math.random()}`
// y Safari exige que quepa en 64 bytes (Chrome no lo revisa). Fecha, aleatorio y
// separadores llegan a 39 bytes: al nombre le quedan 24.
const MAX_NOMBRE_BYTES = 24;

export function nombreParaPasskey(nombre: string): string {
  const cabe = (s: string) => new TextEncoder().encode(s).length <= MAX_NOMBRE_BYTES;
  const limpio = nombre.trim().replace(/\s+/g, " ");
  if (cabe(limpio)) return limpio || "Pasaporte";
  let corto = "";
  for (const c of limpio) {
    if (!cabe(corto + c)) break;
    corto += c;
  }
  // Mejor palabras completas: "Vianey Alejandra" y no "Vianey Alejandra Ma".
  const espacio = corto.lastIndexOf(" ");
  return (espacio > 0 ? corto.slice(0, espacio) : corto) || "Pasaporte";
}

export async function crearCuenta(nombre: string): Promise<CuentaCreada> {
  const r = await obtenerKit().createWallet("Opportuni", nombreParaPasskey(nombre), {
    autoSubmit: true,
    authenticatorSelection: { residentKey: "required" },
  });
  if (!r.submitResult?.success) {
    throw r.submitResult?.error ?? new Error("No se pudo desplegar la cuenta.");
  }
  return { contractId: r.contractId, credentialId: r.credentialId, publicKey: b64url(r.publicKey) };
}

/** Simula la regla de Opportuni antes del toque, para que el Face ID salga al instante. */
export async function prepararRegla(): Promise<AssembledTransaction<ContextRule>> {
  const cfg = stellarPublica()!;
  const { sequence } = await new rpc.Server(cfg.rpcUrl).getLatestLedger();
  return obtenerKit().rules.add(
    createCallContractContext(cfg.registro),
    "Opportuni",
    [createDelegatedSigner(cfg.emisor)],
    new Map(),
    sequence + VIGENCIA_REGLA
  );
}

/** Firma y envía la regla. Devuelve su id. */
export async function firmarRegla(tx: AssembledTransaction<ContextRule>): Promise<number> {
  const r = await obtenerKit().signAndSubmitAdmin(tx);
  if (!r.success) throw r.error;
  const id = Number(tx.result?.id);
  if (!Number.isInteger(id)) throw new Error("La regla no devolvió su id.");
  return id;
}
