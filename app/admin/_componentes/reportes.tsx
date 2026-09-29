"use client";

import { useEffect, useState } from "react";
import { api, Label, Spinner } from "./ui";

// Pestaña Reportes: el PDF general para mandar a empresas (PRD F3). Solo
// porcentajes; el reporte interno con nombres sigue en cada vacante.

export default function ReportesTab() {
  const [empresas, setEmpresas] = useState<string[] | null>(null);
  const [empresa, setEmpresa] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    api<{ stats: { empresa: string | null }[] }>("/api/admin/vacantes")
      .then(({ stats }) => {
        // Una opción por empresa aunque se haya escrito con distintas mayúsculas.
        const unicas = new Map<string, string>();
        stats.forEach((s) => {
          const e = s.empresa?.trim();
          if (e && !unicas.has(e.toLowerCase())) unicas.set(e.toLowerCase(), e);
        });
        setEmpresas(Array.from(unicas.values()).sort((a, b) => a.localeCompare(b, "es")));
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "No se pudieron cargar las empresas."));
  }, []);

  const href = `/api/admin/reporte-general${empresa ? `?empresa=${encodeURIComponent(empresa)}` : ""}`;

  return (
    <div className="bento p-6 max-w-xl">
      <h2 className="font-display text-lg font-black mb-1">Reporte general en PDF</h2>
      <p className="text-sm text-gray-500 mb-5">
        Para mandar a empresas: personas, clicks y porcentajes por estado, área y edad. Sin nombres ni WhatsApp; los
        grupos de menos de 5 personas se juntan en &quot;Otros&quot;.
      </p>
      {err && <p className="text-sm font-bold mb-3" style={{ color: "var(--rosa)" }}>{err}</p>}
      <Label>¿De quién es el reporte?</Label>
      {empresas === null && !err ? (
        <Spinner />
      ) : (
        <select value={empresa} onChange={(e) => setEmpresa(e.target.value)} className="input-bento w-full mb-5">
          <option value="">Toda la comunidad</option>
          {(empresas ?? []).map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
      )}
      <a href={href} className="btn-rosa inline-block px-5 py-2.5 text-sm">
        Descargar PDF
      </a>
    </div>
  );
}
