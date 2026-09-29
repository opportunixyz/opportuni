"use client";

import { useCallback, useEffect, useState } from "react";
import { api, fmtDate, Modal, Spinner, SubTable } from "./ui";

// Pestaña Jóvenes: la lista interna de pasaportes (solo equipo, PRD F3).
// Nunca se comparte con empresas.

interface Joven {
  slug: string;
  nombre: string;
  whatsapp: string;
  estado: string | null;
  pais: string | null;
  areas: string[];
  rango_edad: string | null;
  created_at: string;
  clicks: number;
  vacantes: number;
  dispositivos: number;
  sin_confirmar: number;
  ultimo_click: string | null;
}

export default function JovenesTab() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Joven[] | null>(null);
  const [err, setErr] = useState("");
  const [elegido, setElegido] = useState<Joven | null>(null);

  const cargar = useCallback(async (busqueda: string) => {
    setErr("");
    try {
      setRows((await api<{ jovenes: Joven[] }>(`/api/admin/jovenes?q=${encodeURIComponent(busqueda)}`)).jovenes);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo cargar la lista.");
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void cargar(q), 250);
    return () => clearTimeout(t);
  }, [q, cargar]);

  return (
    <>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar por nombre o WhatsApp"
        className="input-bento mb-4"
        style={{ maxWidth: 360 }}
      />
      {err && <p className="text-sm text-red-600 mb-4">{err}</p>}
      {!rows && !err && <Spinner />}
      {rows && (
        <>
          <p className="text-xs text-gray-500 mb-2">
            {rows.length} {rows.length === 1 ? "pasaporte" : "pasaportes"}
            {rows.length >= 200 ? " (los 200 más recientes; busca para ver otros)" : ""}
          </p>
          <SubTable
            rows={rows}
            cols={["Nombre", "WhatsApp", "Estado", "Áreas", "Edad", "Vacantes", "Dispositivos", "Alta"]}
            render={(j) => [
              <span key="n">
                <b>{j.nombre}</b>
                <span className="block text-[11px] text-gray-400 font-mono">{j.slug}</span>
              </span>,
              <span key="w" className="font-mono text-xs">{j.whatsapp}</span>,
              <span key="e">
                {j.estado ?? "—"}
                {j.pais && <span className="text-[11px] text-gray-400"> · {j.pais}</span>}
              </span>,
              j.areas.length ? j.areas.join(", ") : "—",
              j.rango_edad ?? "—",
              <span key="v">
                {j.vacantes > 0 ? (
                  <button onClick={() => setElegido(j)} className="font-bold" style={{ color: "var(--lila)", cursor: "pointer", background: "none", border: "none", padding: 0 }}>
                    {j.vacantes} ver
                  </button>
                ) : (
                  <b>0</b>
                )}
                <span className="block text-[11px] text-gray-400">
                  {j.clicks} clicks{j.ultimo_click ? ` · ${fmtDate(j.ultimo_click)}` : ""}
                </span>
              </span>,
              <span key="d">
                {j.dispositivos}
                {j.sin_confirmar > 0 && (
                  <span className="block text-[11px]" style={{ color: "var(--nar)" }}>
                    {j.sin_confirmar} sin confirmar
                  </span>
                )}
              </span>,
              <span key="a" className="text-xs">{fmtDate(j.created_at)}</span>,
            ]}
            empty={q ? "Nadie coincide con esa búsqueda." : "Aún no hay pasaportes."}
          />
        </>
      )}
      {elegido && <VacantesJovenModal j={elegido} onClose={() => setElegido(null)} />}
    </>
  );
}

interface VacanteAbierta {
  vacante_id: string;
  titulo: string;
  empresa: string | null;
  clicks: number;
  canales: string[];
  primer_click: string;
  ultimo_click: string;
}

// Las vacantes que abrió una persona (solo equipo).
function VacantesJovenModal({ j, onClose }: { j: Joven; onClose: () => void }) {
  const [rows, setRows] = useState<VacanteAbierta[] | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelado = false;
    api<{ vacantes: VacanteAbierta[] }>(`/api/admin/jovenes?slug=${encodeURIComponent(j.slug)}`)
      .then((d) => !cancelado && setRows(d.vacantes))
      .catch((e) => !cancelado && setErr(e instanceof Error ? e.message : "No se pudieron cargar."));
    return () => {
      cancelado = true;
    };
  }, [j.slug]);

  return (
    <Modal onClose={onClose} width={760}>
      <h2 className="text-2xl font-black mb-1">{j.nombre}</h2>
      <p className="text-xs text-gray-400 font-mono mb-4">
        {j.whatsapp} · {j.vacantes} vacantes · {j.clicks} clicks
      </p>
      {err && <p className="text-sm text-red-600">{err}</p>}
      {!rows && !err && <Spinner />}
      {rows && (
        <SubTable
          rows={rows}
          cols={["Vacante", "Empresa", "Clicks", "Grupo", "Primer click", "Último click"]}
          render={(v) => [
            <span key="t">
              <b>{v.titulo}</b>
              <span className="block text-[11px] text-gray-400 font-mono">{v.vacante_id}</span>
            </span>,
            v.empresa ?? "—",
            String(v.clicks),
            v.canales.length ? v.canales.join(", ") : "—",
            <span key="p" className="text-xs">{fmtDate(v.primer_click)}</span>,
            <span key="u" className="text-xs">{fmtDate(v.ultimo_click)}</span>,
          ]}
          empty="Todavía no abre ninguna vacante."
        />
      )}
    </Modal>
  );
}
