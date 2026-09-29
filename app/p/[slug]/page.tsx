import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";
import { waitUntil } from "@vercel/functions";
import { stellarPublica } from "../../lib/stellar/config";
import { svcInsert, svcRpc } from "../../lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Pasaporte público (PRD F3, RF14): lo que ve una empresa si el joven le da su
// QR. Nombre y primera letra del apellido y credenciales confirmadas, cada una
// con su prueba en Stellar. Nada de WhatsApp, estado, áreas ni empresas.

interface Publico {
  slug: string;
  nombre: string;
  desde: string;
  cuenta: string | null;
  modo: "passkey" | "respaldo" | null;
  credenciales: { tipo: "vacante" | "cv_verificado"; fecha: string; tx: string | null }[];
}

const cargar = cache(async (slug: string): Promise<Publico | null> => {
  if (!/^[a-z0-9]{8}$/.test(slug)) return null;
  const red = stellarPublica()?.red ?? "mainnet";
  try {
    return await svcRpc<Publico | null>("pasaporte_publico", { p_slug: slug, p_red: red });
  } catch (e) {
    console.error("[pasaporte publico]", e instanceof Error ? e.message : e);
    return null;
  }
});

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const p = await cargar(params.slug);
  const title = p ? `Pasaporte Opportuni de ${p.nombre}` : "Pasaporte Opportuni";
  return {
    title,
    robots: { index: false, follow: false },
    openGraph: { title, siteName: "Opportuni", images: [{ url: "/logo-opportuni.png", alt: "Opportuni" }] },
  };
}

const mes = (f: string) => new Date(f).toLocaleDateString("es-MX", { month: "short", year: "numeric" });
const dia = (f: string) => new Date(f).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });

export default async function PasaportePublico({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { src?: string };
}) {
  const p = await cargar(params.slug);
  if (!p) notFound();

  const src = (searchParams.src ?? "").toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40) || null;
  const ua = (headers().get("user-agent") ?? "").slice(0, 400);
  waitUntil(svcInsert("pasaporte_eventos", { tipo: "vista_pasaporte", slug: p.slug, src, user_agent: ua }).catch(() => undefined));

  const explorer = stellarPublica()?.red === "testnet" ? "testnet" : "public";
  const cvs = p.credenciales.filter((c) => c.tipo === "cv_verificado");
  const vacantes = p.credenciales.filter((c) => c.tipo === "vacante");

  return (
    <main className="min-h-screen px-4 py-10" style={{ background: "var(--cream)" }}>
      <div className="mx-auto" style={{ maxWidth: 460 }}>
        <div className="flex justify-center mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-opportuni.png" alt="Opportuni" style={{ height: 30 }} />
        </div>

        <div className="bento p-6 mb-5" style={{ background: "white" }}>
          <p className="text-[11px] font-mono font-bold uppercase" style={{ color: "var(--nar)" }}>
            Pasaporte Opportuni ✦
          </p>
          <h1 className="text-3xl font-black leading-tight">{p.nombre}</h1>
          <p className="text-sm text-gray-500 mt-1">En la comunidad desde {mes(p.desde)}</p>
          {p.cuenta && (
            <a
              href={`https://stellar.expert/explorer/${explorer}/contract/${p.cuenta}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-xs font-bold mt-3 underline"
              style={{ color: "var(--lila)" }}
            >
              Cuenta en Stellar
            </a>
          )}
        </div>

        {p.credenciales.length === 0 ? (
          <div className="bento p-6 text-center" style={{ background: "white" }}>
            <p className="text-sm text-gray-500">Todavía no hay credenciales en este pasaporte.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {cvs.map((c, i) => (
              <Credencial
                key={`cv-${i}`}
                titulo="CV verificado por Opportuni"
                fecha={dia(c.fecha)}
                tx={c.tx}
                explorer={explorer}
                color="var(--teal)"
              />
            ))}
            {vacantes.map((c, i) => (
              <Credencial
                key={`v-${i}`}
                titulo="Vacante abierta vía Opportuni"
                fecha={mes(c.fecha)}
                tx={c.tx}
                explorer={explorer}
                color="var(--rosa)"
              />
            ))}
          </div>
        )}

        <p className="text-[11px] text-gray-400 text-center mt-8 leading-relaxed">
          Opportuni, comunidad de más de 12 mil jóvenes en México y Colombia. Cada credencial está registrada en la red
          Stellar: la prueba muestra la fecha y una huella, sin datos personales.
        </p>
      </div>
    </main>
  );
}

function Credencial({
  titulo,
  fecha,
  tx,
  explorer,
  color,
}: {
  titulo: string;
  fecha: string;
  tx: string | null;
  explorer: string;
  color: string;
}) {
  return (
    <div className="bento px-5 py-4 flex items-center justify-between gap-3" style={{ background: "white" }}>
      <div className="flex items-center gap-3 min-w-0">
        <span className="w-3 h-3 rounded-full shrink-0" style={{ background: color, border: "2px solid var(--dark)" }} />
        <div className="min-w-0">
          <p className="font-bold text-sm leading-tight">{titulo}</p>
          <p className="text-xs text-gray-500">{fecha}</p>
        </div>
      </div>
      {tx && (
        <a
          href={`https://stellar.expert/explorer/${explorer}/tx/${tx}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-bold underline shrink-0"
          style={{ color: "var(--lila)" }}
        >
          Ver prueba en Stellar
        </a>
      )}
    </div>
  );
}
