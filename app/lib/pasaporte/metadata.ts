import { createHmac } from "crypto";

// Metadata de cada click: solo la de la tabla de F1 del PRD. Nunca el IP en
// claro, la ciudad (x-vercel-ip-city no se lee), GPS ni huella del navegador.

export interface ClickMeta {
  estado_ip: string | null;
  pais_ip: string | null;
  ip_hash: string | null;
  dispositivo_tipo: "movil" | "tablet" | "escritorio";
  sistema: string;
  navegador: string;
  idioma: string | null;
  inapp: boolean;
}

// Previews de WhatsApp, redes y buscadores: no cuentan como click y reciben
// el Open Graph de la vacante.
// Sin un /bot/ suelto: hay teléfonos con "bot" en el modelo (CUBOT).
const CRAWLERS = [
  /facebookexternalhit|facebookcatalog|meta-externalagent|whatsapp\/|telegrambot|twitterbot|linkedinbot|slackbot|discordbot|skypeuripreview|pinterestbot|redditbot|applebot|googlebot|google-inspectiontool|bingbot|yandexbot|duckduckbot|baiduspider|embedly|quora link preview|vkshare|slurp|headlesschrome|lighthouse/i,
  /compatible;[^)]*(bot|crawler|spider)/i,
  /^[a-z0-9_.-]*(bot|crawler|spider)\b/i,
  /^(curl|wget|python-requests|python-urllib|go-http-client|node-fetch|axios|okhttp|java)\b/i,
];

export function esCrawler(ua: string): boolean {
  return !ua || CRAWLERS.some((re) => re.test(ua));
}

const INAPP: [RegExp, string][] = [
  [/Instagram/i, "Instagram"],
  [/FBAN|FBAV|FB_IAB|FBIOS/i, "Facebook"],
  [/musical_ly|Bytedance|TikTok|trill_/i, "TikTok"],
  [/\bLine\//i, "LINE"],
  [/Snapchat/i, "Snapchat"],
  [/LinkedInApp/i, "LinkedIn"],
];

function inappDe(ua: string): string | null {
  for (const [re, name] of INAPP) if (re.test(ua)) return name;
  return null;
}

export function sistemaDe(ua: string): string {
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/Android/i.test(ua)) return "Android";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Mac OS X|Macintosh/i.test(ua)) return "macOS";
  if (/CrOS/i.test(ua)) return "ChromeOS";
  if (/Linux/i.test(ua)) return "Linux";
  return "Otro";
}

export function navegadorDe(ua: string): string {
  const app = inappDe(ua);
  if (app) return app;
  if (/SamsungBrowser/i.test(ua)) return "Samsung Internet";
  if (/EdgA?|EdgiOS|Edg\//i.test(ua)) return "Edge";
  if (/OPR\/|Opera/i.test(ua)) return "Opera";
  if (/Firefox|FxiOS/i.test(ua)) return "Firefox";
  if (/CriOS|Chrome\//i.test(ua)) return "Chrome";
  if (/Safari\//i.test(ua)) return "Safari";
  return "Otro";
}

function tipoDe(ua: string): ClickMeta["dispositivo_tipo"] {
  if (/iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) return "tablet";
  if (/Mobi|iPhone|iPod|Android/i.test(ua)) return "movil";
  return "escritorio";
}

function ipHash(ip: string | null): string | null {
  const key = (process.env.IP_HASH_SECRET ?? "").trim();
  if (!ip || !key) return null;
  return createHmac("sha256", key).update(ip).digest("hex");
}

export function metaDeHeaders(h: Headers): ClickMeta {
  const ua = h.get("user-agent") ?? "";
  const ip = (h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "").split(",")[0].trim() || null;
  const pais = (h.get("x-vercel-ip-country") ?? "").toUpperCase();
  const region = (h.get("x-vercel-ip-country-region") ?? "").toUpperCase();
  const idioma = (h.get("accept-language") ?? "").split(",")[0].split(";")[0].trim();
  return {
    estado_ip: /^[A-Z0-9]{1,10}$/.test(region) ? region : null,
    pais_ip: /^[A-Z]{2}$/.test(pais) ? pais : null,
    ip_hash: ipHash(ip),
    dispositivo_tipo: tipoDe(ua),
    sistema: sistemaDe(ua),
    navegador: navegadorDe(ua),
    idioma: /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(idioma) ? idioma.slice(0, 20) : null,
    inapp: inappDe(ua) !== null,
  };
}
