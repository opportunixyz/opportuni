import Link from "next/link";
import { TERMINOS_VERSION } from "../lib/pasaporte/terminos";

// Aviso de privacidad del Pasaporte Opportuni (PRD 7.2). Borrador: legal debe
// leerlo antes de publicar la puerta (PRD 12, pregunta 8).
export const metadata = { title: "Aviso de privacidad · Opportuni" };

const SECCIONES: { titulo: string; texto: string[] }[] = [
  {
    titulo: "Qué guardamos",
    texto: [
      "Tus respuestas del formulario del pasaporte: nombre, WhatsApp, estado, áreas de interés y rango de edad.",
      "Las vacantes que abres desde los links de Opportuni, con la fecha, el grupo de donde salió el link y datos técnicos generales: tipo de dispositivo, sistema, navegador, idioma, si lo abriste dentro de una app, y el estado y país aproximados de tu conexión.",
      "De tu IP no guardamos el número: solo una huella cifrada para detectar abusos. Tampoco guardamos tu ciudad, tu ubicación por GPS ni usamos píxeles o cookies de terceros.",
      "Una cookie en tu navegador para reconocerte en los siguientes links, sin volver a pedirte nada.",
    ],
  },
  {
    titulo: "Para qué",
    texto: [
      "Para mandarte vacantes que te sirvan, operar el servicio y hacer estadísticas generales de la comunidad.",
    ],
  },
  {
    titulo: "Qué ven las empresas",
    texto: [
      "Solo estadísticas generales en porcentajes (por estado, área, rango de edad y clicks a sus vacantes). Nunca tu nombre, tu WhatsApp ni tu ciudad. Los grupos de menos de 5 personas se juntan en \"Otros\" para que nadie se pueda identificar.",
      "Lo único individual que puede ver una empresa es tu pasaporte público, y solo si tú le das tu QR.",
    ],
  },
  {
    titulo: "Solo mayores de 18",
    texto: [
      "El pasaporte es para personas de 18 años o más. Si nos enteramos de que alguien es menor, borramos sus datos.",
    ],
  },
  {
    titulo: "Borrar tus datos",
    texto: [
      "Escríbenos por WhatsApp a Opportuni y borramos tus datos de nuestra base.",
    ],
  },
];

export default function PrivacidadPage() {
  return (
    <main className="min-h-screen px-4 py-10" style={{ background: "var(--cream)" }}>
      <div className="mx-auto" style={{ maxWidth: 640 }}>
        <h1 className="text-3xl font-black mb-2">
          Aviso de <span className="font-serif italic" style={{ color: "var(--rosa)" }}>privacidad</span>
        </h1>
        <p className="text-sm text-gray-500 mb-8">Pasaporte Opportuni · versión {TERMINOS_VERSION}</p>
        <div className="space-y-5">
          {SECCIONES.map((s) => (
            <section key={s.titulo} className="bento p-6" style={{ background: "white" }}>
              <h2 className="text-lg font-black mb-2">{s.titulo}</h2>
              {s.texto.map((t) => (
                <p key={t} className="text-sm text-gray-700 leading-relaxed mb-2 last:mb-0">
                  {t}
                </p>
              ))}
            </section>
          ))}
        </div>
        <Link href="/" className="btn-rosa mt-8 inline-flex">
          Volver a Opportuni
        </Link>
      </div>
    </main>
  );
}
