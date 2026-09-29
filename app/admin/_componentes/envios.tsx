"use client";

import { useEffect, useState } from "react";
import { api, Detail, fmtDate, Modal, Spinner, SubTable } from "./ui";

// Pestañas CVs y Reuniones, igual que en el admin del commit c13f935.

const RAW_CAL = process.env.NEXT_PUBLIC_ADMIN_CALENDAR_URL ?? process.env.NEXT_PUBLIC_CALENDLY_URL ?? "";
const CAL_EMBED =
  RAW_CAL.includes("calendar.google.com") && !/[?&]gv=true/.test(RAW_CAL)
    ? RAW_CAL + (RAW_CAL.includes("?") ? "&" : "?") + "gv=true"
    : RAW_CAL;

interface Submission {
  type: "cv" | "asesoria";
  nombre: string;
  email: string;
  whatsapp: string;
  mensaje?: string;
  tema?: string;
  pdf?: string;
  submittedAt: number;
  source: "blob" | "local";
  ciudadPais?: string;
  linkedin?: string;
  objetivo?: string;
  puestoObjetivo?: string;
  linkVacante?: string;
  carrera?: string;
  universidad?: string;
  fechasEstudio?: string;
  reconocimientos?: string;
  experiencia?: string;
  skills?: string;
  idiomas?: string;
  algoMas?: string;
  fileName?: string;
}

type Envios = { cvs: Submission[]; asesorias: Submission[] };

export function useEnvios() {
  const [data, setData] = useState<Envios | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    let cancelado = false;
    api<Envios>("/api/admin/submissions")
      .then((d) => !cancelado && setData({ cvs: d.cvs, asesorias: d.asesorias }))
      .catch((e) => !cancelado && setErr(e instanceof Error ? e.message : "No se pudieron cargar los datos."));
    return () => {
      cancelado = true;
    };
  }, []);
  return { data, err };
}

export function CvsTab({ data, err }: { data: Envios | null; err: string }) {
  const [detalle, setDetalle] = useState<Submission | null>(null);
  if (err) return <p className="text-sm text-red-600">{err}</p>;
  if (!data) return <Spinner />;
  return (
    <>
      <SubTable
        rows={data.cvs}
        cols={["Fecha", "Nombre", "Puesto objetivo", "Email", ""]}
        render={(s) => [
          fmtDate(s.submittedAt),
          s.nombre,
          s.puestoObjetivo || "—",
          s.email,
          <button key="v" onClick={() => setDetalle(s)} className="font-bold" style={{ color: "var(--rosa)", cursor: "pointer", background: "none", border: "none" }}>
            Ver detalle
          </button>,
        ]}
        empty="Aún no hay CVs."
      />
      {detalle && <DetalleModal s={detalle} onClose={() => setDetalle(null)} />}
    </>
  );
}

export function ReunionesTab({ data, err }: { data: Envios | null; err: string }) {
  if (err) return <p className="text-sm text-red-600">{err}</p>;
  if (!data) return <Spinner />;
  return (
    <>
      <SubTable
        rows={data.asesorias}
        cols={["Fecha", "Nombre", "Email", "WhatsApp", "Tema"]}
        render={(s) => [fmtDate(s.submittedAt), s.nombre, s.email, s.whatsapp, s.tema || "—"]}
        empty="Aún no hay solicitudes de asesoría."
      />
      <h2 className="font-display font-black mt-8 mb-3">Agenda</h2>
      {CAL_EMBED ? (
        <div className="bento overflow-hidden" style={{ height: 640 }}>
          <iframe src={CAL_EMBED} title="Agenda de Vianey" style={{ width: "100%", height: "100%", border: "none" }} />
        </div>
      ) : (
        <p className="text-sm text-gray-500">
          Configura <code>NEXT_PUBLIC_ADMIN_CALENDAR_URL</code> para ver la agenda embebida.
        </p>
      )}
    </>
  );
}

const CV_FIELDS: { key: keyof Submission; label: string }[] = [
  { key: "ciudadPais", label: "Ciudad y país" },
  { key: "linkedin", label: "LinkedIn / portafolio" },
  { key: "objetivo", label: "Objetivo del CV" },
  { key: "puestoObjetivo", label: "Puesto objetivo" },
  { key: "linkVacante", label: "Link de vacante" },
  { key: "carrera", label: "Carrera / estudios" },
  { key: "universidad", label: "Universidad (historial)" },
  { key: "fechasEstudio", label: "Fechas de estudio" },
  { key: "reconocimientos", label: "Reconocimientos" },
  { key: "experiencia", label: "Experiencia" },
  { key: "skills", label: "Skills y herramientas" },
  { key: "idiomas", label: "Idiomas" },
  { key: "algoMas", label: "Algo más" },
  { key: "mensaje", label: "Mensaje" },
];

function DetalleModal({ s, onClose }: { s: Submission; onClose: () => void }) {
  return (
    <Modal onClose={onClose}>
      <h2 className="text-2xl font-black mb-1">{s.nombre}</h2>
      <p className="text-xs text-gray-400 font-mono mb-4">
        {fmtDate(s.submittedAt)} · {s.source}
      </p>
      <Detail label="Correo" value={s.email} />
      <Detail label="WhatsApp" value={s.whatsapp} />
      {CV_FIELDS.map(({ key, label }) => {
        const v = s[key];
        return typeof v === "string" && v.trim() ? <Detail key={key} label={label} value={v} /> : null;
      })}
      {s.pdf ? (
        <a
          href={`/api/admin/download?ref=${encodeURIComponent(s.pdf)}`}
          className="inline-block mt-4 py-2.5 px-5 rounded-full font-bold text-sm text-white"
          style={{ background: "var(--rosa)", border: "2.5px solid var(--dark)", boxShadow: "2px 2px 0 var(--dark)" }}
        >
          ⬇ Descargar CV (PDF)
        </a>
      ) : (
        <p className="text-xs text-gray-400 mt-4">No adjuntó CV en PDF.</p>
      )}
    </Modal>
  );
}
