import { stellarPublica } from "../../lib/stellar/config";

// Utilidades de passkey para la puerta que no cargan el kit.

/** ¿Se puede intentar la passkey aquí? rpId fijo opportuni.xyz: nunca en *.vercel.app ni localhost. */
export function puedePasskey(inapp: boolean): boolean {
  if (inapp || typeof window === "undefined" || !stellarPublica()) return false;
  const h = window.location.hostname;
  return (h === "opportuni.xyz" || h.endsWith(".opportuni.xyz")) && typeof window.PublicKeyCredential === "function";
}

/** ¿El error es una cancelación del joven (o el navegador pidió otro toque)? */
export function esCancelacion(e: unknown): boolean {
  let x: unknown = e;
  for (let i = 0; i < 5 && x; i++) {
    const o = x as { name?: string; code?: string; message?: string; cause?: unknown };
    if (o.name === "NotAllowedError" || o.name === "AbortError" || o.code === "ERROR_CEREMONY_ABORTED") return true;
    if (typeof o.message === "string" && /not ?allowed|cancel|abort/i.test(o.message)) return true;
    x = o.cause;
  }
  return false;
}

export const detalleDe = (e: unknown) => (e instanceof Error ? `${e.name}: ${e.message}` : String(e)).slice(0, 200);

/** Avisa al servidor cómo terminó la cuenta. `keepalive` para que llegue aunque ya nos fuimos a la vacante. */
export function avisarCuenta(body: Record<string, unknown>) {
  return fetch("/api/pasaporte/cuenta", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => undefined);
}

const aBytes = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
const aB64url = (b: ArrayBuffer) =>
  btoa(String.fromCharCode(...Array.from(new Uint8Array(b)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/** Pide la passkey del pasaporte (sin elegir cuenta: la muestra el sistema). */
export async function firmarReto(reto: string) {
  const cred = (await navigator.credentials.get({
    publicKey: {
      challenge: aBytes(reto),
      rpId: "opportuni.xyz",
      userVerification: "required",
      timeout: 60_000,
    },
  })) as PublicKeyCredential | null;
  if (!cred) throw new Error("Sin credencial");
  const r = cred.response as AuthenticatorAssertionResponse;
  return {
    credentialId: aB64url(cred.rawId),
    clientDataJSON: aB64url(r.clientDataJSON),
    authenticatorData: aB64url(r.authenticatorData),
    signature: aB64url(r.signature),
  };
}
