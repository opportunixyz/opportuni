"use client";

import { useCallback, useEffect, useState } from "react";
import { api, fmtDate, Spinner, SubTable } from "./ui";

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
                <b>{j.vacantes}</b>
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
    </>
  );
}
