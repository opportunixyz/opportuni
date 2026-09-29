import { Networks } from "@stellar/stellar-sdk";

// Configuración de Stellar (PRD 8.8). Las NEXT_PUBLIC_* se leen literales para
// que Next las incruste en el navegador; las demás viven solo en el servidor.

export type Red = "testnet" | "mainnet";

export interface StellarPublica {
  red: Red;
  rpcUrl: string;
  passphrase: string;
  accountWasmHash: string;
  webauthnVerifier: string;
  ed25519Verifier: string;
  registro: string;
  emisor: string;
}

export interface StellarServidor extends StellarPublica {
  emisorSecreto: string;
  channelsUrl: string;
  channelsKey: string;
}

const G = /^G[A-Z2-7]{55}$/;
const C = /^C[A-Z2-7]{55}$/;
const HEX32 = /^[0-9a-f]{64}$/;

export function stellarPublica(): StellarPublica | null {
  const passphrase = (process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ?? "").trim();
  const red: Red | null =
    passphrase === Networks.PUBLIC ? "mainnet" : passphrase === Networks.TESTNET ? "testnet" : null;
  const c = {
    red,
    rpcUrl: (process.env.NEXT_PUBLIC_STELLAR_RPC_URL ?? "").trim(),
    passphrase,
    accountWasmHash: (process.env.NEXT_PUBLIC_ACCOUNT_WASM_HASH ?? "").trim(),
    webauthnVerifier: (process.env.NEXT_PUBLIC_WEBAUTHN_VERIFIER ?? "").trim(),
    ed25519Verifier: (process.env.NEXT_PUBLIC_ED25519_VERIFIER ?? "").trim(),
    registro: (process.env.NEXT_PUBLIC_REGISTRO_ID ?? "").trim(),
    emisor: (process.env.NEXT_PUBLIC_OPPORTUNI_ISSUER ?? "").trim(),
  };
  if (
    !c.red ||
    !/^https:\/\//.test(c.rpcUrl) ||
    !HEX32.test(c.accountWasmHash) ||
    !C.test(c.webauthnVerifier) ||
    !C.test(c.ed25519Verifier) ||
    !C.test(c.registro) ||
    !G.test(c.emisor)
  ) {
    return null;
  }
  return c as StellarPublica;
}

/** Configuración completa del servidor, o null si falta algo (Stellar apagado). */
export function stellarServidor(): StellarServidor | null {
  const pub = stellarPublica();
  const emisorSecreto = (process.env.OPPORTUNI_ISSUER_SECRET ?? "").trim();
  const channelsKey = (process.env.CHANNELS_API_KEY ?? "").trim();
  if (!pub || !/^S[A-Z2-7]{55}$/.test(emisorSecreto) || !channelsKey) return null;
  const channelsUrl = pub.red === "mainnet" ? "https://channels.openzeppelin.com" : "https://channels.openzeppelin.com/testnet";
  return { ...pub, emisorSecreto, channelsUrl, channelsKey };
}
