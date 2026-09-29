// Cloudflare Turnstile en la puerta: frena a los scripts que crean pasaportes
// (y wallets) en masa. Se prende solo con NEXT_PUBLIC_TURNSTILE_SITE_KEY y
// TURNSTILE_SECRET_KEY en el entorno; sin ellas todo sigue como antes.

// Solo se exige con las dos llaves: con la secreta sola, el navegador no
// tendría widget y nadie podría crear su pasaporte.
const secreta = () =>
  (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "").trim() ? (process.env.TURNSTILE_SECRET_KEY ?? "").trim() : "";

export const turnstileActivo = () => !!secreta();

/**
 * true si el token es válido. Si Cloudflare no responde, deja pasar (lo
 * registra): un atacante no puede provocar eso, y así una caída de Cloudflare
 * no deja a los jóvenes sin pasaporte.
 */
export async function verificarTurnstile(token: unknown, ip: string): Promise<boolean> {
  const secret = secreta();
  if (!secret) return true;
  if (typeof token !== "string" || !token || token.length > 2048) return false;

  const body = new URLSearchParams({ secret, response: token });
  if (ip && ip !== "sin-ip") body.set("remoteip", ip);
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`siteverify ${res.status}`);
    // La llave secreta está atada a nuestro widget (y este a nuestros
    // dominios): basta con que Cloudflare diga que el token es bueno.
    const d = (await res.json()) as { success?: boolean };
    return d.success === true;
  } catch (e) {
    console.error("[turnstile] sin respuesta, se deja pasar:", e instanceof Error ? e.message : e);
    return true;
  }
}
