import type { Metadata } from "next";
import { stellarPublica } from "../lib/stellar/config";
import { svcRpc } from "../lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Tracción pública del Pasaporte Opportuni: cifras y las cuentas creadas en
// Stellar, cada una verificable en stellar.expert. Sin datos personales: ni
// nombres, ni WhatsApp, ni estado, ni el slug del pasaporte.

export const metadata: Metadata = {
  title: "Tracción · Pasaporte Opportuni",
  description: "Cuentas y credenciales del Pasaporte Opportuni en la red Stellar, verificables por cualquiera.",
  openGraph: {
    title: "Tracción · Pasaporte Opportuni",
    description: "Cuentas y credenciales del Pasaporte Opportuni en la red Stellar, verificables por cualquiera.",
    siteName: "Opportuni",
    images: [{ url: "/logo-opportuni.png", alt: "Opportuni" }],
  },
};

interface Traccion {
  pasaportes: number;
  vacantes: number;
  clicks: number;
  cuentas: number;
  passkey: number;
  respaldo: number;
  credenciales: number;
  por_dia: { dia: string; cuentas: number }[];
  ultimas: { cuenta: string; modo: "passkey" | "respaldo"; fecha: string }[];
}

const DIA_MS = 86_400_000;
/** Dashboard público en Dune (solo mainnet), armado con las queries de analytics/dune. */
const DUNE_URL = "https://dune.com/opportunixyz/opportuni";
const fmt = (n: number) => n.toLocaleString("es-MX");
const corta = (c: string) => `${c.slice(0, 6)}…${c.slice(-4)}`;
const fecha = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });

/** Serie acumulada por día, del primer día con cuentas a hoy. */
function acumulado(porDia: Traccion["por_dia"]): { dia: string; total: number }[] {
  if (!porDia.length) return [];
  const mapa = new Map(porDia.map((d) => [d.dia, Number(d.cuentas)]));
  const inicio = new Date(`${porDia[0].dia}T00:00:00Z`).getTime();
  const hoy = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z").getTime();
  const out: { dia: string; total: number }[] = [];
  let total = 0;
  for (let t = inicio; t <= hoy; t += DIA_MS) {
    const dia = new Date(t).toISOString().slice(0, 10);
    total += mapa.get(dia) ?? 0;
    out.push({ dia, total });
  }
  return out;
}

export default async function TraccionPage() {
  const cfg = stellarPublica();
  const red = cfg?.red ?? "mainnet";
  const explorer = red === "testnet" ? "testnet" : "public";
  let t: Traccion | null = null;
  try {
    t = await svcRpc<Traccion>("traccion_publica", { p_red: red });
  } catch (e) {
    console.error("[traccion]", e instanceof Error ? e.message : e);
  }

  const serie = t ? acumulado(t.por_dia) : [];
  const pctPasskey = t && t.cuentas ? Math.round((t.passkey / t.cuentas) * 100) : 0;

  return (
    <main className="min-h-screen px-4 py-10" style={{ background: "var(--cream)" }}>
      <div className="mx-auto" style={{ maxWidth: 900 }}>
        <div className="flex items-center gap-3 mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-opportuni.png" alt="Opportuni" style={{ height: 36 }} />
          <span className="text-[11px] font-mono font-bold uppercase" style={{ color: "var(--nar)" }}>
            Pasaporte Opportuni ✦ {red === "testnet" ? "testnet" : "Stellar mainnet"}
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black leading-tight mb-2">
          Jóvenes con su pasaporte en{" "}
          <span className="font-serif italic" style={{ color: "var(--rosa)" }}>
            Stellar
          </span>
        </h1>
        <p className="text-sm text-gray-600 mb-8 max-w-2xl">
          Cada joven de la comunidad Opportuni que crea su pasaporte recibe su propia cuenta en la red Stellar, protegida con
          su Face ID o su huella. Aquí están todas, verificables por cualquiera. Sin datos personales.
        </p>

        {!t ? (
          <div className="bento p-6" style={{ background: "white" }}>
            <p className="text-sm text-gray-500">No pudimos cargar las cifras. Intenta de nuevo en un momento.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <Cifra valor={fmt(t.cuentas)} etiqueta="Cuentas en Stellar" color="var(--rosa)" />
              <Cifra valor={`${pctPasskey}%`} etiqueta="Con Face ID o huella" color="var(--lila)" />
              <Cifra valor={fmt(t.credenciales)} etiqueta="Credenciales emitidas" color="var(--teal)" />
              <Cifra valor={fmt(t.pasaportes)} etiqueta="Pasaportes creados" color="var(--nar)" />
            </div>

            <div className="bento p-6 mb-6" style={{ background: "white" }}>
              <h2 className="font-display text-lg font-black mb-4">Cuentas creadas</h2>
              {serie.length < 2 ? (
                <p className="text-sm text-gray-500">La gráfica aparece en cuanto haya cuentas de más de un día.</p>
              ) : (
                <Grafica serie={serie} />
              )}
            </div>

            <div className="bento p-6 mb-6" style={{ background: "white" }}>
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
                <h2 className="font-display text-lg font-black">Últimas cuentas</h2>
                <span className="text-xs text-gray-500">
                  {fmt(t.vacantes)} vacantes compartidas · {fmt(t.clicks)} clicks
                </span>
              </div>
              {t.ultimas.length === 0 ? (
                <p className="text-sm text-gray-500">Todavía no hay cuentas en esta red.</p>
              ) : (
                <div className="divide-y" style={{ borderColor: "var(--cream2)" }}>
                  {t.ultimas.map((c) => (
                    <div key={c.cuenta} className="flex items-center justify-between gap-3 py-2 text-sm">
                      <a
                        href={`https://stellar.expert/explorer/${explorer}/contract/${c.cuenta}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono font-bold underline"
                        style={{ color: "var(--lila)" }}
                      >
                        {corta(c.cuenta)}
                      </a>
                      <span className="text-xs text-gray-500">{c.modo === "passkey" ? "Face ID / huella" : "Respaldo"}</span>
                      <span className="text-xs text-gray-500">{fecha(c.fecha)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cfg && (
              <div className="bento p-6" style={{ background: "white" }}>
                <h2 className="font-display text-lg font-black mb-3">Verifícalo en la cadena</h2>
                <ul className="text-sm space-y-2">
                  {explorer === "public" && (
                    <li>
                      <a
                        href={DUNE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline font-bold"
                        style={{ color: "var(--lila)" }}
                      >
                        Dashboard de Opportuni en Dune
                      </a>{" "}
                      <span className="text-gray-500">: cuentas y credenciales en gráficas, con unas horas de retraso.</span>
                    </li>
                  )}
                  <li>
                    <a
                      href={`https://stellar.expert/explorer/${explorer}/contract/${cfg.registro}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline font-bold"
                      style={{ color: "var(--lila)" }}
                    >
                      Contrato de credenciales de Opportuni
                    </a>{" "}
                    <span className="text-gray-500">: cada credencial emitida, con su fecha y su huella.</span>
                  </li>
                  <li>
                    <a
                      href={`https://stellar.expert/explorer/${explorer}/account/${cfg.emisor}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline font-bold"
                      style={{ color: "var(--lila)" }}
                    >
                      Cuenta emisora de Opportuni
                    </a>{" "}
                    <span className="text-gray-500">: la única que puede emitir credenciales.</span>
                  </li>
                </ul>
                <p className="text-[11px] text-gray-400 mt-4 leading-relaxed">
                  En la cadena solo hay tipo de credencial, fecha y una huella con sal: nunca nombres, WhatsApp ni datos de
                  contacto. Opportuni, comunidad de más de 12 mil jóvenes en México y Colombia.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function Cifra({ valor, etiqueta, color }: { valor: string; etiqueta: string; color: string }) {
  return (
    <div className="bento p-4" style={{ background: "white" }}>
      <p className="text-3xl font-black" style={{ color }}>
        {valor}
      </p>
      <p className="text-xs font-bold text-gray-600 mt-1">{etiqueta}</p>
    </div>
  );
}

/** Área acumulada en SVG, sin librerías. */
function Grafica({ serie }: { serie: { dia: string; total: number }[] }) {
  const W = 600;
  const H = 180;
  const max = Math.max(...serie.map((s) => s.total), 1);
  const x = (i: number) => (i / (serie.length - 1)) * W;
  const y = (v: number) => H - (v / max) * (H - 10);
  const linea = serie.map((s, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(s.total).toFixed(1)}`).join(" ");
  const area = `${linea} L${W},${H} L0,${H} Z`;
  const ultimo = serie[serie.length - 1];

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`${ultimo.total} cuentas creadas`}>
        <defs>
          <linearGradient id="relleno" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e3216d" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#f89b0e" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#relleno)" />
        <path d={linea} fill="none" stroke="#e3216d" strokeWidth="3" strokeLinejoin="round" />
        <circle cx={x(serie.length - 1)} cy={y(ultimo.total)} r="5" fill="#e3216d" stroke="#1a1a2e" strokeWidth="2" />
      </svg>
      <div className="flex justify-between text-[11px] text-gray-500 mt-2">
        <span>{fecha(serie[0].dia)}</span>
        <span className="font-bold" style={{ color: "var(--rosa)" }}>
          {ultimo.total.toLocaleString("es-MX")} cuentas
        </span>
        <span>{fecha(ultimo.dia)}</span>
      </div>
    </div>
  );
}
