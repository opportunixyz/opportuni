"use client";

import { useCallback, useEffect, useState } from "react";
import { LinksPorGrupo, LinksPorGrupoModal } from "./grupos";
import { api, CopyButton, Label, Modal, Spinner, SubTable, fmtDate } from "./ui";

// Pestaña Vacantes (PRD F1, paso 0): pegar la URL de la vacante y obtener
// opportuni.xyz/v/{slug}; clicks, personas y postulantes por vacante.

const SITIO = "https://opportuni.xyz";

interface VacStat {
  vacante_id: string;
  titulo: string;
  empresa: string | null;
  url_destino: string | null;
  activa: boolean;
  clicks: number;
  personas: number;
  postulantes: number;
  created_at: string;
}

interface Postulante {
  nombre: string;
  carrera_area: string;
  whatsapp: string;
  cv_link: string | null;
  created_at: string;
}

const slugify = (s: string) => {
  const base = s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (base.length <= 40) return base;
  const corto = base.slice(0, 40);
  const corte = corto.lastIndexOf("-");
  return (corte > 10 ? corto.slice(0, corte) : corto).replace(/-$/, "");
};

export default function VacantesTab() {
  const [stats, setStats] = useState<VacStat[] | null>(null);
  const [err, setErr] = useState("");
  const [nueva, setNueva] = useState(false);
  const [detalle, setDetalle] = useState<VacStat | null>(null);
  const [abiertos, setAbiertos] = useState<VacStat | null>(null);
  const [links, setLinks] = useState<VacStat | null>(null);

  const cargar = useCallback(async () => {
    setErr("");
    try {
      setStats((await api<{ stats: VacStat[] }>("/api/admin/vacantes")).stats);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudieron cargar las vacantes.");
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const toggle = async (v: VacStat) => {
    try {
      await api("/api/admin/vacantes", { method: "PATCH", body: JSON.stringify({ id: v.vacante_id, activa: !v.activa }) });
      void cargar();
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo cambiar.");
    }
  };

  return (
    <>
      <button onClick={() => setNueva(true)} className="btn-rosa mb-4 px-5 py-2.5 text-sm">
        ＋ Nueva vacante
      </button>
      {err && <p className="text-sm text-red-600 mb-4">{err}</p>}
      {!stats && !err && <Spinner />}
      {stats && (
        <SubTable
          rows={stats}
          cols={["Vacante", "Empresa", "Clicks", "Personas", "Postulantes", "Link", ""]}
          render={(v) => [
            <span key="t">
              {v.titulo}
              {!v.activa && <span className="text-xs text-gray-400 ml-2">(apagada)</span>}
              <span className="block text-xs text-gray-400 font-mono">/v/{v.vacante_id}</span>
              <span className="block text-[11px] text-gray-400">{fmtDate(v.created_at)}</span>
            </span>,
            v.empresa || "—",
            <b key="c">{v.clicks}</b>,
            <b key="u">{v.personas}</b>,
            <b key="p">{v.postulantes}</b>,
            <span key="l" className="flex flex-col gap-1 items-start">
              <button onClick={() => setLinks(v)} className="font-bold text-left" style={{ color: "var(--rosa)", cursor: "pointer", background: "none", border: "none", padding: 0 }}>
                Links por grupo
              </button>
              <CopyButton text={`${SITIO}/v/${v.vacante_id}`} label="Link general" />
            </span>,
            <span key="a" className="flex flex-col gap-1 items-start">
              {v.personas > 0 && (
                <button onClick={() => setAbiertos(v)} className="font-bold text-left" style={{ color: "var(--lila)", cursor: "pointer", background: "none", border: "none", padding: 0 }}>
                  Quién la abrió ({v.personas})
                </button>
              )}
              {v.postulantes > 0 && (
                <button onClick={() => setDetalle(v)} className="font-bold text-left" style={{ color: "var(--rosa)", cursor: "pointer", background: "none", border: "none", padding: 0 }}>
                  Ver postulantes
                </button>
              )}
              <a href={`/api/admin/reporte?vacante=${encodeURIComponent(v.vacante_id)}`} className="font-bold" style={{ color: "var(--nar)" }}>
                ⬇ Reporte interno
              </a>
              <button onClick={() => toggle(v)} className="text-xs font-bold" style={{ color: "var(--dark)", cursor: "pointer", background: "none", border: "none", padding: 0 }}>
                {v.activa ? "Apagar link" : "Prender link"}
              </button>
            </span>,
          ]}
          empty="Aún no hay vacantes. Crea la primera con el botón de arriba."
        />
      )}
      <p className="text-xs text-gray-400 mt-3">
        Personas = pasaportes distintos que abrieron la vacante. El reporte interno trae nombres y WhatsApp de
        postulantes: no se manda a empresas.
      </p>

      {nueva && <NuevaVacanteModal onClose={() => setNueva(false)} onCreada={() => void cargar()} />}
      {detalle && <PostulantesModal v={detalle} onClose={() => setDetalle(null)} />}
      {abiertos && <QuienAbrioModal v={abiertos} onClose={() => setAbiertos(null)} />}
      {links && <LinksPorGrupoModal vacante={links.vacante_id} titulo={links.titulo} onClose={() => setLinks(null)} />}
    </>
  );
}

function NuevaVacanteModal({ onClose, onCreada }: { onClose: () => void; onCreada: () => void }) {
  const [url, setUrl] = useState("");
  const [titulo, setTitulo] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTocado, setSlugTocado] = useState(false);
  const [mas, setMas] = useState(false);
  const [ubicacion, setUbicacion] = useState("");
  const [tipo, setTipo] = useState("");
  const [salario, setSalario] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [creada, setCreada] = useState<{ id: string; link: string } | null>(null);
  const [err, setErr] = useState("");

  const slugFinal = slugTocado ? slug : slugify(`${titulo} ${empresa}`);
  const valido = titulo.trim() && /^[a-z0-9][a-z0-9-]{1,39}$/.test(slugFinal);

  const crear = async () => {
    if (!valido) return;
    setGuardando(true);
    setErr("");
    try {
      const d = await api<{ id: string; link: string }>("/api/admin/vacantes", {
        method: "POST",
        body: JSON.stringify({ url, titulo, empresa, slug: slugTocado ? slug : "", ubicacion, tipo, salario, descripcion }),
      });
      setCreada({ id: d.id, link: d.link });
      onCreada();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo crear.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal onClose={onClose} width={creada ? 660 : 480}>
      {creada ? (
        <div className="py-2">
          <div className="text-center">
            <div className="text-5xl mb-2">🎉</div>
            <h3 className="text-2xl font-black mb-4">¡Links listos!</h3>
          </div>
          <LinksPorGrupo vacante={creada.id} />
          <div className="rounded-xl px-4 py-3 mt-4 mb-4" style={{ background: "white", border: "2px dashed var(--dark)" }}>
            <p className="text-xs text-gray-500 mb-1">Link general (sin grupo), para redes o donde no aplique un grupo:</p>
            <p className="text-sm font-mono font-bold break-all mb-2" style={{ color: "var(--rosa)" }}>
              {creada.link}
            </p>
            <CopyButton text={creada.link} label="Copiar link general" />
          </div>
          <button onClick={onClose} className="btn-rosa w-full text-center">
            Listo
          </button>
        </div>
      ) : (
        <div>
          <h3 className="text-2xl font-black mb-4 text-center">Nueva vacante</h3>

          <Label>URL de la vacante</Label>
          <p className="text-[11px] text-gray-400 mb-1 leading-snug">
            Su formulario, LinkedIn, lo que sea. Si la dejas vacía, el link manda al detalle en Opportuni.
          </p>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className="input-bento w-full mb-3" />

          <Label>Puesto *</Label>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej. Product Manager" className="input-bento w-full mb-3" />

          <Label>Empresa</Label>
          <input value={empresa} onChange={(e) => setEmpresa(e.target.value)} placeholder="Ej. Nubank" className="input-bento w-full mb-3" />

          <Label>Link</Label>
          <div className="flex items-center gap-1 mb-3">
            <span className="text-xs font-mono text-gray-400">opportuni.xyz/v/</span>
            <input
              value={slugFinal}
              onChange={(e) => {
                setSlugTocado(true);
                setSlug(slugify(e.target.value));
              }}
              placeholder="pm-nubank"
              className="input-bento flex-1 font-mono text-sm"
            />
          </div>

          <button onClick={() => setMas(!mas)} className="text-xs font-bold mb-3" style={{ color: "var(--lila)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            {mas ? "− Menos datos" : "＋ Más datos para /vacantes (opcional)"}
          </button>
          {mas && (
            <>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <Label>Tipo</Label>
                  <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="input-bento w-full">
                    <option value="">—</option>
                    <option value="remoto">Remoto</option>
                    <option value="presencial">Presencial</option>
                    <option value="hibrido">Híbrido</option>
                  </select>
                </div>
                <div>
                  <Label>Ubicación</Label>
                  <input value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} placeholder="CDMX" className="input-bento w-full" />
                </div>
              </div>
              <Label>Salario</Label>
              <input value={salario} onChange={(e) => setSalario(e.target.value)} placeholder="Ej. $20,000 MXN" className="input-bento w-full mb-3" />
              <Label>Descripción</Label>
              <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={3} className="textarea-bento w-full mb-3" />
            </>
          )}

          {err && <p className="text-sm text-red-600 mb-3 text-center">{err}</p>}
          <button onClick={crear} disabled={!valido || guardando} className="btn-rosa w-full text-center disabled:opacity-50">
            {guardando ? "Creando…" : "Crear link ✦"}
          </button>
        </div>
      )}
    </Modal>
  );
}

function PostulantesModal({ v, onClose }: { v: VacStat; onClose: () => void }) {
  const [rows, setRows] = useState<Postulante[] | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelado = false;
    api<{ postulantes: Postulante[] }>(`/api/admin/vacantes?vacante=${encodeURIComponent(v.vacante_id)}`)
      .then((d) => !cancelado && setRows(d.postulantes))
      .catch((e) => !cancelado && setErr(e instanceof Error ? e.message : "No se pudieron cargar."));
    return () => {
      cancelado = true;
    };
  }, [v.vacante_id]);

  return (
    <Modal onClose={onClose}>
      <h2 className="text-2xl font-black mb-1">{v.titulo}</h2>
      <p className="text-xs text-gray-400 font-mono mb-4">
        {v.clicks} clicks · {v.personas} personas · {v.postulantes} postulantes
      </p>
      {err && <p className="text-sm text-red-600">{err}</p>}
      {!rows && !err && <Spinner />}
      {rows && rows.length === 0 && <p className="text-sm text-gray-500">Aún no hay postulantes.</p>}
      {rows?.map((p, i) => (
        <div key={i} className="rounded-xl px-4 py-3 mb-2" style={{ background: "var(--cream2)", border: "2px solid var(--dark)" }}>
          <p className="font-bold text-sm">{p.nombre}</p>
          <p className="text-xs text-gray-500">
            {p.carrera_area} · {p.whatsapp}
          </p>
          {p.cv_link && (
            <a href={p.cv_link} target="_blank" rel="noopener noreferrer" className="text-xs font-bold break-all" style={{ color: "var(--rosa)" }}>
              {p.cv_link}
            </a>
          )}
          <p className="text-[11px] text-gray-400 mt-1">{fmtDate(p.created_at)}</p>
        </div>
      ))}
    </Modal>
  );
}

interface PersonaClick {
  slug: string;
  nombre: string;
  whatsapp: string;
  estado: string | null;
  areas: string[];
  rango_edad: string | null;
  clicks: number;
  canales: string[];
  primer_click: string;
  ultimo_click: string;
}

// Quién abrió la vacante: solo equipo, nunca se manda a empresas.
function QuienAbrioModal({ v, onClose }: { v: VacStat; onClose: () => void }) {
  const [rows, setRows] = useState<PersonaClick[] | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelado = false;
    api<{ personas: PersonaClick[] }>(`/api/admin/vacantes?abrieron=${encodeURIComponent(v.vacante_id)}`)
      .then((d) => !cancelado && setRows(d.personas))
      .catch((e) => !cancelado && setErr(e instanceof Error ? e.message : "No se pudieron cargar."));
    return () => {
      cancelado = true;
    };
  }, [v.vacante_id]);

  return (
    <Modal onClose={onClose} width={900}>
      <h2 className="text-2xl font-black mb-1">Quién abrió: {v.titulo}</h2>
      <p className="text-xs text-gray-400 font-mono mb-4">
        {v.personas} personas · {v.clicks} clicks · solo equipo, no se comparte con empresas
      </p>
      {err && <p className="text-sm text-red-600">{err}</p>}
      {!rows && !err && <Spinner />}
      {rows && (
        <SubTable
          rows={rows}
          cols={["Nombre", "WhatsApp", "Estado", "Áreas", "Edad", "Clicks", "Grupo", "Último click"]}
          render={(p) => [
            <b key="n">{p.nombre}</b>,
            <span key="w" className="font-mono text-xs">{p.whatsapp}</span>,
            p.estado ?? "—",
            p.areas.length ? p.areas.join(", ") : "—",
            p.rango_edad ?? "—",
            String(p.clicks),
            p.canales.length ? p.canales.join(", ") : "—",
            <span key="u" className="text-xs">
              {fmtDate(p.ultimo_click)}
              {p.clicks > 1 && <span className="block text-[11px] text-gray-400">primero: {fmtDate(p.primer_click)}</span>}
            </span>,
          ]}
          empty="Nadie con pasaporte ha abierto esta vacante todavía."
        />
      )}
    </Modal>
  );
}
