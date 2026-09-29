import { createHash } from "crypto";
import { Address, xdr } from "@stellar/stellar-sdk";
import type { StellarServidor } from "./config";
import { signerDelegado } from "./cuentas";
import { DEPLOYER_KIT } from "./pasaporte";

// Relayer propio para el kit del navegador (PRD 8.3): reenvía a Channels con
// nuestra llave, pero solo las dos transacciones de la puerta:
// 1. desplegar la cuenta con passkey (deployer del kit, WASM de la cuenta,
//    un signer WebAuthn y sal derivada del credentialId), y
// 2. agregarle la regla de Opportuni (CallContract(registro) con
//    Delegated(emisor), sin policies).
// Cualquier otra cosa se rechaza, para que nadie gaste el cupo de Channels.

const mismo = (a: xdr.ScVal, b: xdr.ScVal) => a.toXDR("hex") === b.toXDR("hex");

function direccionAuth(e: xdr.SorobanAuthorizationEntry): string | null {
  const c = e.credentials();
  switch (c.switch().name) {
    case "sorobanCredentialsAddress":
      return Address.fromScAddress(c.address().address()).toString();
    case "sorobanCredentialsAddressV2":
      return Address.fromScAddress(c.addressV2().address()).toString();
    default:
      return null;
  }
}

export type Envio =
  | { ok: true; tipo: "despliegue"; contractId?: undefined }
  | { ok: true; tipo: "regla"; contractId: string }
  | { ok: false; error: string };

export function validarEnvio(cfg: StellarServidor, funcB64: unknown, authB64: unknown): Envio {
  if (typeof funcB64 !== "string" || funcB64.length > 20_000) return { ok: false, error: "func inválida" };
  if (!Array.isArray(authB64) || authB64.length !== 1 || typeof authB64[0] !== "string" || authB64[0].length > 20_000) {
    return { ok: false, error: "auth inválida" };
  }
  let func: xdr.HostFunction;
  let auth: xdr.SorobanAuthorizationEntry;
  try {
    func = xdr.HostFunction.fromXDR(funcB64, "base64");
    auth = xdr.SorobanAuthorizationEntry.fromXDR(authB64[0], "base64");
  } catch {
    return { ok: false, error: "XDR inválido" };
  }

  switch (func.switch().name) {
    case "hostFunctionTypeCreateContractV2": {
      const args = func.createContractV2();
      const pre = args.contractIdPreimage();
      if (pre.switch().name !== "contractIdPreimageFromAddress") return { ok: false, error: "preimagen" };
      const desde = pre.fromAddress();
      if (Address.fromScAddress(desde.address()).toString() !== DEPLOYER_KIT) return { ok: false, error: "deployer" };
      const ex = args.executable();
      if (ex.switch().name !== "contractExecutableWasm" || Buffer.from(ex.wasmHash()).toString("hex") !== cfg.accountWasmHash) {
        return { ok: false, error: "wasm" };
      }
      const [signers, policies] = args.constructorArgs();
      if (args.constructorArgs().length !== 2 || policies.switch().name !== "scvMap" || (policies.map() ?? []).length) {
        return { ok: false, error: "constructor" };
      }
      const lista = signers.switch().name === "scvVec" ? signers.vec() ?? [] : [];
      if (lista.length !== 1) return { ok: false, error: "signers" };
      const s = lista[0].vec() ?? [];
      if (
        s.length !== 3 ||
        s[0].switch().name !== "scvSymbol" ||
        s[0].sym().toString() !== "External" ||
        s[1].switch().name !== "scvAddress" ||
        Address.fromScAddress(s[1].address()).toString() !== cfg.webauthnVerifier ||
        s[2].switch().name !== "scvBytes"
      ) {
        return { ok: false, error: "signer" };
      }
      const keyData = Buffer.from(s[2].bytes());
      if (keyData.length <= 65 || keyData.length > 65 + 1024) return { ok: false, error: "keyData" };
      const sal = createHash("sha256").update(keyData.subarray(65)).digest();
      if (!sal.equals(Buffer.from(desde.salt()))) return { ok: false, error: "sal" };
      if (direccionAuth(auth) !== DEPLOYER_KIT) return { ok: false, error: "firma" };
      return { ok: true, tipo: "despliegue" };
    }

    case "hostFunctionTypeInvokeContract": {
      const inv = func.invokeContract();
      const cuenta = Address.fromScAddress(inv.contractAddress()).toString();
      const a = inv.args();
      if (!cuenta.startsWith("C") || inv.functionName().toString() !== "add_context_rule" || a.length !== 5) {
        return { ok: false, error: "función" };
      }
      const tipo = xdr.ScVal.scvVec([xdr.ScVal.scvSymbol("CallContract"), Address.fromString(cfg.registro).toScVal()]);
      if (!mismo(a[0], tipo)) return { ok: false, error: "contexto" };
      if (!mismo(a[3], xdr.ScVal.scvVec([signerDelegado(cfg.emisor)]))) return { ok: false, error: "signers" };
      if (a[4].switch().name !== "scvMap" || (a[4].map() ?? []).length) return { ok: false, error: "policies" };
      if (direccionAuth(auth) !== cuenta) return { ok: false, error: "firma" };
      return { ok: true, tipo: "regla", contractId: cuenta };
    }

    default:
      return { ok: false, error: "tipo" };
  }
}
