import { randomBytes } from "crypto";
import {
  Account,
  Address,
  Keypair,
  Operation,
  StrKey,
  TransactionBuilder,
  authorizeEntry,
  authorizeInvocation,
  hash,
  rpc,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";
import { enviarSoroban, ErrorChannels, type TipoEnvio } from "./channels";
import type { StellarServidor } from "./config";

// Cuentas del pasaporte en Stellar (PRD 8.3 y 8.5), del lado del servidor:
// - la cuenta de respaldo (signer Ed25519 que guarda Opportuni cifrado),
// - la regla CallContract(registro) con el signer Delegated(emisor),
// - la emisión de credenciales, firmada por el emisor y por la cuenta del
//   joven a través de esa regla.
// Todo sale por Channels; el servidor nunca paga fees ni es fuente de la
// transacción.

export const LEDGERS_DIA = 17_280;
/** La regla de Opportuni dura ~12 meses (PRD 8.3). */
export const VIGENCIA_REGLA = 365 * LEDGERS_DIA;
/** La regla por defecto (id 0) la crea el constructor de la cuenta. */
const REGLA_DEFAULT = 0;

// ---------------------------------------------------------------------------
// Firmas (formato del smart account de OpenZeppelin)
// ---------------------------------------------------------------------------

export function signerDelegado(g: string): xdr.ScVal {
  return xdr.ScVal.scvVec([xdr.ScVal.scvSymbol("Delegated"), Address.fromString(g).toScVal()]);
}

export function signerEd25519(verifier: string, llavePublica: Buffer): xdr.ScVal {
  return xdr.ScVal.scvVec([
    xdr.ScVal.scvSymbol("External"),
    Address.fromString(verifier).toScVal(),
    xdr.ScVal.scvBytes(llavePublica),
  ]);
}

const reglasScVal = (reglas: number[]) => xdr.ScVal.scvVec(reglas.map((r) => xdr.ScVal.scvU32(r)));

/** AuthPayload { context_rule_ids, signers } con un solo signer. */
function authPayload(reglas: number[], signer: xdr.ScVal, firma: Buffer): xdr.ScVal {
  return xdr.ScVal.scvMap([
    new xdr.ScMapEntry({ key: xdr.ScVal.scvSymbol("context_rule_ids"), val: reglasScVal(reglas) }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol("signers"),
      val: xdr.ScVal.scvMap([new xdr.ScMapEntry({ key: signer, val: xdr.ScVal.scvBytes(firma) })]),
    }),
  ]);
}

/** Lo que firman los signers: sha256(payload ++ context_rule_ids.to_xdr()). */
function authDigest(payload: Buffer, reglas: number[]): Buffer {
  return hash(Buffer.concat([payload, reglasScVal(reglas).toXDR()]));
}

function direccionDe(entry: xdr.SorobanAuthorizationEntry): string | null {
  const c = entry.credentials();
  switch (c.switch().name) {
    case "sorobanCredentialsAddress":
      return Address.fromScAddress(c.address().address()).toString();
    case "sorobanCredentialsAddressV2":
      return Address.fromScAddress(c.addressV2().address()).toString();
    case "sorobanCredentialsAddressWithDelegates":
      return Address.fromScAddress(c.addressWithDelegates().addressCredentials().address()).toString();
    default:
      return null;
  }
}

function invocar(contrato: string, fn: string, args: xdr.ScVal[]): xdr.HostFunction {
  return xdr.HostFunction.hostFunctionTypeInvokeContract(
    new xdr.InvokeContractArgs({ contractAddress: Address.fromString(contrato).toScAddress(), functionName: fn, args })
  );
}

// ---------------------------------------------------------------------------
// Simular y enviar
// ---------------------------------------------------------------------------

const rpcDe = (cfg: StellarServidor) => new rpc.Server(cfg.rpcUrl);

/**
 * Simula en modo registro para obtener las entradas de autorización. La fuente
 * es una cuenta al azar: así la firma del emisor sale como entrada propia y no
 * como la de la fuente, que en Channels es otra cuenta.
 */
async function simular(cfg: StellarServidor, func: xdr.HostFunction) {
  const server = rpcDe(cfg);
  const fuente = new Account(Keypair.random().publicKey(), "0");
  const tx = new TransactionBuilder(fuente, { fee: "100", networkPassphrase: cfg.passphrase })
    .addOperation(Operation.invokeHostFunction({ func, auth: [] }))
    .setTimeout(60)
    .build();
  const [sim, ultimo] = await Promise.all([server.simulateTransaction(tx), server.getLatestLedger()]);
  if (rpc.Api.isSimulationError(sim)) throw new Error(`Simulación: ${sim.error}`);
  return { auth: sim.result?.auth ?? [], retval: sim.result?.retval, ledger: ultimo.sequence };
}

export interface Enviada {
  hash: string;
  retval?: xdr.ScVal;
}

async function enviarYEsperar(
  cfg: StellarServidor,
  func: xdr.HostFunction,
  auth: xdr.SorobanAuthorizationEntry[],
  tipo: TipoEnvio
): Promise<Enviada> {
  const r = await enviarSoroban(
    cfg,
    func.toXDR("base64"),
    auth.map((a) => a.toXDR("base64")),
    tipo
  );
  if (!r.hash) throw new ErrorChannels(`Channels no devolvió hash (estado ${r.status ?? "?"}).`);
  const res = await rpcDe(cfg).pollTransaction(r.hash, { attempts: 20, sleepStrategy: () => 1500 });
  if (res.status === rpc.Api.GetTransactionStatus.SUCCESS) return { hash: r.hash, retval: res.returnValue };
  if (res.status === rpc.Api.GetTransactionStatus.FAILED) throw new Error(`Transacción fallida: ${r.hash}`);
  throw new Error(`Sin confirmar todavía: ${r.hash}`);
}

// ---------------------------------------------------------------------------
// Regla de Opportuni
// ---------------------------------------------------------------------------

/** add_context_rule(CallContract(registro), "Opportuni", hasta, [Delegated(emisor)], {}). */
export function funcReglaOpportuni(cfg: Pick<StellarServidor, "registro" | "emisor">, cuenta: string, hasta: number) {
  return invocar(cuenta, "add_context_rule", [
    xdr.ScVal.scvVec([xdr.ScVal.scvSymbol("CallContract"), Address.fromString(cfg.registro).toScVal()]),
    xdr.ScVal.scvString("Opportuni"),
    xdr.ScVal.scvU32(hasta),
    xdr.ScVal.scvVec([signerDelegado(cfg.emisor)]),
    xdr.ScVal.scvMap([]),
  ]);
}

export interface Regla {
  id: number;
  hasta: number | null;
  tipo: string;
  contrato: string | null;
  firmantes: string[];
}

/** Lee una regla de la cuenta (para verificar lo que dice el navegador). */
export async function leerRegla(cfg: StellarServidor, cuenta: string, id: number): Promise<Regla | null> {
  const func = invocar(cuenta, "get_context_rule", [xdr.ScVal.scvU32(id)]);
  let retval: xdr.ScVal | undefined;
  try {
    retval = (await simular(cfg, func)).retval;
  } catch {
    return null;
  }
  if (!retval) return null;
  const r = scValToNative(retval) as {
    id: number;
    valid_until?: number | null;
    context_type: [string, string?] | string[];
    signers: unknown[];
  };
  const firmantes = (r.signers ?? []).map((s) => {
    const v = s as [string, unknown, unknown?];
    if (v[0] === "Delegated") return `Delegated:${String(v[1])}`;
    const key = v[2] instanceof Uint8Array ? Buffer.from(v[2]).toString("hex") : "";
    return `External:${String(v[1])}:${key}`;
  });
  return {
    id: Number(r.id),
    hasta: r.valid_until == null ? null : Number(r.valid_until),
    tipo: String(r.context_type?.[0] ?? ""),
    contrato: r.context_type?.[1] ? String(r.context_type[1]) : null,
    firmantes,
  };
}

/** ¿La regla deja a Opportuni emitir en el registro? */
export function esReglaOpportuni(cfg: StellarServidor, r: Regla | null, ledger: number): boolean {
  return (
    !!r &&
    r.tipo === "CallContract" &&
    r.contrato === cfg.registro &&
    r.firmantes.length === 1 &&
    r.firmantes[0] === `Delegated:${cfg.emisor}` &&
    (r.hasta === null || r.hasta > ledger)
  );
}

export async function ledgerActual(cfg: StellarServidor): Promise<number> {
  return (await rpcDe(cfg).getLatestLedger()).sequence;
}

// ---------------------------------------------------------------------------
// Cuenta de respaldo (PRD 8.3): sin passkey, todo en el servidor
// ---------------------------------------------------------------------------

export interface CuentaRespaldo {
  contractId: string;
  secreto: string;
  firmantePub: string;
  reglaId: number;
  reglaHasta: number;
}

/**
 * Despliega la smart account con un signer Ed25519 nuevo (la llave de
 * respaldo) y le agrega la regla de Opportuni. El emisor solo es el
 * `deployer` (sal aleatoria): no queda como signer de la cuenta.
 */
export async function crearCuentaRespaldo(cfg: StellarServidor): Promise<CuentaRespaldo> {
  const emisor = Keypair.fromSecret(cfg.emisorSecreto);
  const firmante = Keypair.random();
  const signer = signerEd25519(cfg.ed25519Verifier, firmante.rawPublicKey());

  const preimagen = xdr.ContractIdPreimage.contractIdPreimageFromAddress(
    new xdr.ContractIdPreimageFromAddress({
      address: Address.fromString(emisor.publicKey()).toScAddress(),
      salt: randomBytes(32),
    })
  );
  const contractId = StrKey.encodeContract(
    hash(
      xdr.HashIdPreimage.envelopeTypeContractId(
        new xdr.HashIdPreimageContractId({ networkId: hash(Buffer.from(cfg.passphrase)), contractIdPreimage: preimagen })
      ).toXDR()
    )
  );

  // 1. Desplegar la cuenta.
  const deploy = xdr.HostFunction.hostFunctionTypeCreateContractV2(
    new xdr.CreateContractArgsV2({
      contractIdPreimage: preimagen,
      executable: xdr.ContractExecutable.contractExecutableWasm(Buffer.from(cfg.accountWasmHash, "hex")),
      constructorArgs: [xdr.ScVal.scvVec([signer]), xdr.ScVal.scvMap([])],
    })
  );
  const simDeploy = await simular(cfg, deploy);
  const authDeploy = await Promise.all(
    simDeploy.auth.map((e) => {
      if (direccionDe(e) !== emisor.publicKey()) throw new Error("Firma inesperada al desplegar la cuenta.");
      return authorizeEntry(e, emisor, simDeploy.ledger + 100, cfg.passphrase);
    })
  );
  await enviarYEsperar(cfg, deploy, authDeploy, "despliegue");

  // 2. Regla de Opportuni, firmada con la llave de respaldo (regla default).
  const hasta = (await ledgerActual(cfg)) + VIGENCIA_REGLA;
  const regla = funcReglaOpportuni(cfg, contractId, hasta);
  const simRegla = await simular(cfg, regla);
  const authRegla = await Promise.all(
    simRegla.auth.map((e) => {
      if (direccionDe(e) !== contractId) throw new Error("Firma inesperada al agregar la regla.");
      return authorizeEntry(
        e,
        async (_preimagen, payload) => ({
          signatureScVal: authPayload(
            [REGLA_DEFAULT],
            signer,
            Buffer.from(firmante.sign(authDigest(Buffer.from(payload), [REGLA_DEFAULT])))
          ),
        }),
        simRegla.ledger + 100,
        cfg.passphrase
      );
    })
  );
  const { retval } = await enviarYEsperar(cfg, regla, authRegla, "regla");
  const reglaId = retval ? Number((scValToNative(retval) as { id: number }).id) : NaN;
  if (!Number.isInteger(reglaId)) throw new Error("La regla no devolvió su id.");

  return {
    contractId,
    secreto: firmante.secret(),
    firmantePub: firmante.rawPublicKey().toString("hex"),
    reglaId,
    reglaHasta: hasta,
  };
}

// ---------------------------------------------------------------------------
// Emisión (PRD 8.5)
// ---------------------------------------------------------------------------

/**
 * Tipos en la app → Symbol corto en cadena (PRD 8.4). Solo lo que vale como
 * credencial: abrir una vacante ya no va a la cadena (29 sep), queda en la base.
 */
export const TIPO_EN_CADENA = { cv_verificado: "cv_verif" } as const;
export type TipoCredencial = keyof typeof TIPO_EN_CADENA;

export interface Emitida {
  hash: string;
  id: number | null;
}

/**
 * registro.issue(cuenta, tipo, hash). Firma el emisor por su lado y por la
 * cuenta del joven con la regla de Opportuni: AuthPayload con
 * Delegated(emisor) vacío y una entrada aparte del emisor para el
 * `__check_auth` de la cuenta.
 */
export async function emitirCredencial(
  cfg: StellarServidor,
  p: { cuenta: string; reglaId: number; tipo: TipoCredencial; hash: Buffer }
): Promise<Emitida> {
  const emisor = Keypair.fromSecret(cfg.emisorSecreto);
  const func = invocar(cfg.registro, "issue", [
    Address.fromString(p.cuenta).toScVal(),
    xdr.ScVal.scvSymbol(TIPO_EN_CADENA[p.tipo]),
    xdr.ScVal.scvBytes(p.hash),
  ]);
  const sim = await simular(cfg, func);
  const vence = sim.ledger + 100;

  const auth: xdr.SorobanAuthorizationEntry[] = [];
  for (const e of sim.auth) {
    const dir = direccionDe(e);
    if (dir === emisor.publicKey()) {
      auth.push(await authorizeEntry(e, emisor, vence, cfg.passphrase));
    } else if (dir === p.cuenta) {
      let digest: Buffer | null = null;
      auth.push(
        await authorizeEntry(
          e,
          async (_preimagen, payload) => {
            digest = authDigest(Buffer.from(payload), [p.reglaId]);
            return { signatureScVal: authPayload([p.reglaId], signerDelegado(cfg.emisor), Buffer.alloc(0)) };
          },
          vence,
          cfg.passphrase
        )
      );
      if (!digest) throw new Error("No se calculó el digest de la cuenta.");
      auth.push(
        await authorizeInvocation({
          signer: emisor,
          validUntilLedgerSeq: vence,
          networkPassphrase: cfg.passphrase,
          invocation: new xdr.SorobanAuthorizedInvocation({
            function: xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeContractFn(
              new xdr.InvokeContractArgs({
                contractAddress: Address.fromString(p.cuenta).toScAddress(),
                functionName: "__check_auth",
                args: [xdr.ScVal.scvBytes(digest)],
              })
            ),
            subInvocations: [],
          }),
        })
      );
    } else {
      throw new Error(`Firma inesperada de ${dir ?? "la fuente"} al emitir.`);
    }
  }

  const { hash: txHash, retval } = await enviarYEsperar(cfg, func, auth, "emision");
  const id = retval ? Number(scValToNative(retval)) : NaN;
  return { hash: txHash, id: Number.isFinite(id) ? id : null };
}
