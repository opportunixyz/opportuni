import { Keypair, Operation, TransactionBuilder, rpc, xdr } from "@stellar/stellar-sdk";
import { svcRpc } from "../supabase";
import type { StellarServidor } from "./config";

// Envío de transacciones a Stellar (PRD 8.2). Normalmente por OpenZeppelin
// Channels, que paga las fees y arma la transacción a partir de { func, auth }
// (mismo protocolo que ChannelsClient de @openzeppelin/relayer-plugin-channels,
// sin sus dependencias, que piden stellar-sdk 17). Si Channels falla (se topa,
// se cae o deja de existir), paga la cuenta emisora con sus XLM (decidido el
// 29 sep), siempre dentro del tope por hora.

export interface ResultadoChannels {
  transactionId: string | null;
  hash: string | null;
  status: string | null;
}

export class ErrorChannels extends Error {
  constructor(message: string, public readonly detalle?: unknown) {
    super(message);
  }
}

async function llamar(cfg: StellarServidor, params: Record<string, unknown>): Promise<ResultadoChannels> {
  const res = await fetch(`${cfg.channelsUrl}/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.channelsKey}` },
    body: JSON.stringify({ params }),
    signal: AbortSignal.timeout(45_000),
    cache: "no-store",
  });
  const body = (await res.json().catch(() => null)) as {
    success?: boolean;
    data?: { transactionId?: string; hash?: string; status?: string } & Record<string, unknown>;
    error?: string;
    metadata?: unknown;
  } | null;
  if (!body || body.success !== true || !body.data) {
    const msg = body?.error || `Channels respondió ${res.status}`;
    throw new ErrorChannels(msg, body?.data ?? body?.metadata ?? null);
  }
  return {
    transactionId: body.data.transactionId ?? null,
    hash: typeof body.data.hash === "string" && /^[0-9a-f]{64}$/.test(body.data.hash) ? body.data.hash : null,
    status: body.data.status ?? null,
  };
}

// ---------------------------------------------------------------------------
// Cuando paga el emisor
// ---------------------------------------------------------------------------

/** Tope de comisión por transacción pagada por el emisor: 0.5 XLM. */
const MAX_FEE_EMISOR = 5_000_000;

/**
 * STELLAR_PAGA_EMISOR: "respaldo" (por defecto: solo si Channels falla),
 * "siempre" (no usar Channels) o "nunca".
 */
function modoPago(): "respaldo" | "siempre" | "nunca" {
  const v = (process.env.STELLAR_PAGA_EMISOR ?? "").trim();
  return v === "siempre" || v === "nunca" ? v : "respaldo";
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Arma, simula (con las firmas ya puestas), firma y envía la transacción con
 * el emisor como fuente y quien paga. Reintenta si otro envío le ganó el
 * número de secuencia.
 */
async function pagaEmisor(cfg: StellarServidor, funcB64: string, authB64: string[]): Promise<ResultadoChannels> {
  const server = new rpc.Server(cfg.rpcUrl);
  const emisor = Keypair.fromSecret(cfg.emisorSecreto);
  const func = xdr.HostFunction.fromXDR(funcB64, "base64");
  const auth = authB64.map((a) => xdr.SorobanAuthorizationEntry.fromXDR(a, "base64"));

  for (let intento = 1; ; intento++) {
    const cuenta = await server.getAccount(emisor.publicKey());
    const tx = new TransactionBuilder(cuenta, { fee: "100", networkPassphrase: cfg.passphrase })
      .addOperation(Operation.invokeHostFunction({ func, auth }))
      .setTimeout(60)
      .build();
    const sim = await server.simulateTransaction(tx);
    if (rpc.Api.isSimulationError(sim)) throw new ErrorChannels(`Simulación: ${sim.error}`);
    const lista = rpc.assembleTransaction(tx, sim).build();
    if (Number(lista.fee) > MAX_FEE_EMISOR) {
      throw new ErrorChannels(`Comisión de ${lista.fee} stroops, arriba del tope del emisor.`);
    }
    lista.sign(emisor);
    const r = await server.sendTransaction(lista);
    if (r.status === "PENDING" || r.status === "DUPLICATE") {
      return { transactionId: null, hash: r.hash, status: r.status };
    }
    const codigo = r.errorResult?.result().switch().name ?? r.status;
    if (intento < 3 && (codigo === "txBadSeq" || r.status === "TRY_AGAIN_LATER")) {
      await esperar(800 * intento);
      continue;
    }
    throw new ErrorChannels(`El emisor no pudo enviar: ${codigo}`);
  }
}

export type TipoEnvio = "despliegue" | "regla" | "emision";

/** Envíos a Stellar por hora, entre todos (migración 0011). Configurable. */
function topeHora(): number {
  const n = Number(process.env.STELLAR_TOPE_HORA);
  return Number.isInteger(n) && n > 0 ? n : 600;
}

/**
 * Envía una invocación firmada (func + auth en base64). Antes aparta un lugar
 * en el tope por hora: si está lleno, no sale y quien llamó lo reintenta
 * después. Va por Channels y, si Channels falla, paga el emisor. Un reenvío
 * no duplica nada: el nonce de las firmas o la dirección de la cuenta hacen
 * que el segundo falle sin efecto.
 */
export async function enviarSoroban(cfg: StellarServidor, func: string, auth: string[], tipo: TipoEnvio) {
  const hayCupo = await svcRpc<boolean>("stellar_cupo", { p_tipo: tipo, p_max_hora: topeHora() });
  if (!hayCupo) throw new ErrorChannels("Se llenó el tope de envíos de esta hora; se reintenta después.");
  const modo = modoPago();
  if (modo === "siempre") return pagaEmisor(cfg, func, auth);
  try {
    return await llamar(cfg, { func, auth });
  } catch (e) {
    if (modo === "nunca") throw e;
    console.warn(`[stellar] Channels falló en ${tipo} (${e instanceof Error ? e.message : e}); paga el emisor.`);
    return pagaEmisor(cfg, func, auth);
  }
}

export function consultarChannels(cfg: StellarServidor, transactionId: string) {
  return llamar(cfg, { getTransaction: { transactionId } });
}
