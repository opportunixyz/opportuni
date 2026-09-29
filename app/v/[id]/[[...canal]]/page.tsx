import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { waitUntil } from "@vercel/functions";
import { DEVICE_COOKIE, leerDispositivo } from "../../../lib/pasaporte/dispositivo";
import { estadoDeIp, getPreguntas, type Pregunta } from "../../../lib/pasaporte/formulario";
import { esCrawler, metaDeHeaders } from "../../../lib/pasaporte/metadata";
import {
  buscarVacante,
  canalValido,
  destinoDe,
  registrarClick,
  registrarEvento,
} from "../../../lib/pasaporte/puerta";
import { TERMINOS_TEXTO } from "../../../lib/pasaporte/terminos";
import Puerta from "../../_puerta/puerta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// La puerta del Pasaporte Opportuni (PRD F1): /v/{slug} y /v/{slug}/{canal}.
// - Crawlers (preview de WhatsApp y redes): Open Graph de la vacante, sin click.
// - Dispositivo conocido (cookie opp_dev firmada): registra el click después
//   de responder (waitUntil) y redirige sin mostrar nada.
// - Dispositivo nuevo: el formulario del pasaporte, una sola vez.
// - Si la base no responde: redirige igual (RF11).

type Params = { id: string; canal?: string[] };

const lookup = cache(buscarVacante);

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const l = await lookup(params.id);
  const v = l.estado === "no_existe" ? null : l.vacante;
  const title = v ? [v.empresa, v.titulo].filter(Boolean).join(" · ") : "Vacante en Opportuni";
  const description =
    "Vacante compartida por Opportuni, la comunidad de más de 12 mil jóvenes en México y Colombia.";
  return {
    metadataBase: new URL("https://opportuni.xyz"),
    title: `${title} | Opportuni`,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      siteName: "Opportuni",
      type: "website",
      locale: "es_MX",
      images: [{ url: "/logo-opportuni.png", alt: "Opportuni" }],
    },
    twitter: { card: "summary", title, description },
  };
}

export default async function VacantePuerta({ params }: { params: Params }) {
  if ((params.canal?.length ?? 0) > 1) notFound();
  const canal = canalValido(params.canal?.[0]);
  const h = headers();
  const ua = h.get("user-agent") ?? "";
  const l = await lookup(params.id);

  if (esCrawler(ua)) {
    const v = l.estado === "no_existe" ? null : l.vacante;
    return <Preview titulo={v?.titulo} empresa={v?.empresa} />;
  }

  if (l.estado === "no_existe") redirect("/vacantes");
  if (l.estado === "sin_base") redirect(destinoDe(l.vacante));

  const vacante = l.vacante;
  const destino = destinoDe(vacante);
  const meta = metaDeHeaders(h);

  const disp = leerDispositivo(cookies().get(DEVICE_COOKIE)?.value);
  if (disp) {
    waitUntil(registrarClick(disp.tokenHash, vacante.id, canal, meta));
    redirect(destino);
  }

  let preguntas: Pregunta[];
  try {
    preguntas = await getPreguntas(true, 3000);
  } catch (e) {
    console.error("[puerta] formulario sin respuesta:", e instanceof Error ? e.message : e);
    redirect(destino);
  }
  if (!preguntas.some((p) => p.clave === "whatsapp") || !preguntas.some((p) => p.clave === "nombre")) {
    redirect(destino);
  }

  waitUntil(
    Promise.all([
      registrarEvento("puerta_vista", { vacante_id: vacante.id, user_agent: ua, detalle: canal ? { canal } : undefined }),
      meta.inapp
        ? registrarEvento("inapp_detectado", { vacante_id: vacante.id, user_agent: ua, detalle: { app: meta.navegador } })
        : null,
    ])
  );

  return (
    <Puerta
      vacante={{ id: vacante.id, titulo: vacante.titulo, empresa: vacante.empresa }}
      canal={canal}
      destino={destino}
      preguntas={preguntas}
      terminos={TERMINOS_TEXTO}
      estadoSugerido={estadoDeIp(meta.pais_ip, meta.estado_ip)}
      ladaSugerida={meta.pais_ip === "CO" ? "+57" : "+52"}
      inapp={meta.inapp}
    />
  );
}

function Preview({ titulo, empresa }: { titulo?: string; empresa?: string | null }) {
  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--cream)" }}>
      <div className="bento p-8 max-w-sm text-center">
        <p className="text-xs font-mono font-bold uppercase mb-2" style={{ color: "var(--nar)" }}>
          Vacante en Opportuni
        </p>
        {empresa && <p className="text-sm text-gray-500">{empresa}</p>}
        <h1 className="text-2xl font-black">{titulo ?? "Vacante"}</h1>
      </div>
    </main>
  );
}
