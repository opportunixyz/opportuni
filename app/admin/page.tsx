"use client";

import { useState } from "react";
import { CvsTab, ReunionesTab, useEnvios } from "./_componentes/envios";
import FormularioTab from "./_componentes/formulario";
import JovenesTab from "./_componentes/jovenes";
import ReportesTab from "./_componentes/reportes";
import { Shell, Tab } from "./_componentes/ui";
import VacantesTab from "./_componentes/vacantes";

// Dashboard de Opportuni. El middleware ya exige la sesión (ADMIN_PASSWORD +
// cookie firmada con ADMIN_SESSION_SECRET) antes de servir esta página, y
// cada /api/admin/* lo vuelve a revisar.

type Pestana = "vacantes" | "reportes" | "formulario" | "jovenes" | "cvs" | "reuniones";

export default function AdminPage() {
  const [tab, setTab] = useState<Pestana>("vacantes");
  const envios = useEnvios();

  const salir = async () => {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => null);
    window.location.href = "/admin/login";
  };

  return (
    <Shell wide>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-opportuni.png" alt="" style={{ height: 32 }} />
          <h1 className="font-display text-xl font-black">Dashboard</h1>
        </div>
        <button onClick={salir} className="text-sm font-bold px-4 py-2 rounded-full" style={{ border: "2px solid var(--dark)", background: "white", cursor: "pointer" }}>
          Salir
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        <Tab active={tab === "vacantes"} onClick={() => setTab("vacantes")}>Vacantes</Tab>
        <Tab active={tab === "reportes"} onClick={() => setTab("reportes")}>Reportes</Tab>
        <Tab active={tab === "jovenes"} onClick={() => setTab("jovenes")}>Jóvenes</Tab>
        <Tab active={tab === "formulario"} onClick={() => setTab("formulario")}>Formulario</Tab>
        <Tab active={tab === "cvs"} onClick={() => setTab("cvs")}>
          CVs {envios.data ? `(${envios.data.cvs.length})` : ""}
        </Tab>
        <Tab active={tab === "reuniones"} onClick={() => setTab("reuniones")}>
          Reuniones {envios.data ? `(${envios.data.asesorias.length})` : ""}
        </Tab>
      </div>

      {tab === "vacantes" && <VacantesTab />}
      {tab === "reportes" && <ReportesTab />}
      {tab === "jovenes" && <JovenesTab />}
      {tab === "formulario" && <FormularioTab />}
      {tab === "cvs" && <CvsTab {...envios} />}
      {tab === "reuniones" && <ReunionesTab {...envios} />}
    </Shell>
  );
}
