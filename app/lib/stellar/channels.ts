import type { StellarServidor } from "./config";

// Envío de transacciones por OpenZeppelin Channels (PRD 8.2): paga las fees y
// arma la transacción a partir de { func, auth }. Mismo protocolo que
// ChannelsClient de @openzeppelin/relayer-plugin-channels, sin sus
// dependencias (piden stellar-sdk 17).

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

/** Envía una invocación firmada (func + auth en base64). */
export function enviarSoroban(cfg: StellarServidor, func: string, auth: string[]) {
  return llamar(cfg, { func, auth });
}

export function consultarChannels(cfg: StellarServidor, transactionId: string) {
  return llamar(cfg, { getTransaction: { transactionId } });
}
