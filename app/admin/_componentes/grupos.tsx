"use client";

import { useCallback, useEffect, useState } from "react";
import { api, CopyButton, Label, Modal, Spinner, SubTable } from "./ui";

// Links por grupo de WhatsApp: cada vacante tiene un link por grupo
// (opportuni.xyz/v/{vacante}/{grupo}) para medir qué grupo trae a la gente.
// Los grupos se ven por comunidad (Opportuni MX, MX 2.0 … COL).

const SITIO = "https://opportuni.xyz";
const SIN_COMUNIDAD = "Otros";

interface Grupo {
  slug: string;
  nombre: string;
  comunidad: string | null;
  orden: number;
  activo: boolean;
}

interface GrupoStat {
  canal: string;
  nombre: string;
  comunidad: string | null;
  en_lista: boolean;
  activo: boolean;
  clicks: number;
  personas: number;
  vacantes: number;
  nuevos: number;
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30)
    .replace(/-$/, "");

const linkDe = (vacante: string, grupo: string) => `${SITIO}/v/${vacante}/${grupo}`;

const boton = { cursor: "pointer", background: "none", border: "none", padding: 0 } as const;

/** Agrupa por comunidad conservando el orden en que llegan. */
function porComunidad<T extends { comunidad: string | null }>(filas: T[]): [string, T[]][] {
  const mapa = new Map<string, T[]>();
  for (const f of filas) {
    const c = f.comunidad || SIN_COMUNIDAD;
    if (!mapa.has(c)) mapa.set(c, []);
    mapa.get(c)!.push(f);
  }
  return Array.from(mapa.entries());
}

/* ---------------- pestaña Grupos ---------------- */

export default function GruposTab() {
  const [grupos, setGrupos] = useState<Grupo[] | null>(null);
  const [stats, setStats] = useState<GrupoStat[] | null>(null);
  const [err, setErr] = useState("");
  const [nombre, setNombre] = useState("");
  const [comunidad, setComunidad] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTocado, setSlugTocado] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setErr("");
    try {
      const d = await api<{ grupos: Grupo[]; stats: GrupoStat[] }>("/api/admin/grupos");
      setGrupos(d.grupos);
      setStats(d.stats);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudieron cargar los grupos.");
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const slugFinal = slugTocado ? slug : slugify(nombre);
  const comunidades = Array.from(new Set((grupos ?? []).map((g) => g.comunidad).filter(Boolean))) as string[];

  const agregar = async () => {
    if (!nombre.trim() || !slugFinal) return;
    setGuardando(true);
    setErr("");
    try {
      await api("/api/admin/grupos", {
        method: "POST",
        body: JSON.stringify({ nombre, slug: slugFinal, comunidad }),
      });
      setNombre("");
      setSlug("");
      setSlugTocado(false);
      await cargar();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo agregar.");
    }
    setGuardando(false);
  };

  const cambiar = async (g: Grupo, cambios: Partial<Pick<Grupo, "nombre" | "activo">>) => {
    try {
      await api("/api/admin/grupos", { method: "PATCH", body: JSON.stringify({ slug: g.slug, ...cambios }) });
      await cargar();
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo cambiar.");
    }
  };

  const renombrar = (g: Grupo) => {
    const n = prompt("Nombre del grupo", g.nombre);
    if (n && n.trim() && n.trim() !== g.nombre) void cambiar(g, { nombre: n });
  };

  const porSlug = new Map((grupos ?? []).map((g) => [g.slug, g]));

  return (
    <>
      <div className="bento p-5 mb-5" style={{ background: "white", maxWidth: 760 }}>
        <h2 className="font-display text-lg font-black mb-1">Agregar grupo</h2>
        <p className="text-xs text-gray-500 mb-3">
          El link de cada vacante para este grupo será {SITIO}/v/vacante/<b>{slugFinal || "grupo"}</b>. El link no se
          puede cambiar después (rompería los que ya se compartieron); el nombre sí.
        </p>
        <div className="grid md:grid-cols-3 gap-2">
          <div>
            <Label>Nombre</Label>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Ingeniería · MX 6.0" className="input-bento w-full" />
          </div>
          <div>
            <Label>Comunidad</Label>
            <input
              value={comunidad}
              onChange={(e) => setComunidad(e.target.value)}
              list="comunidades"
              placeholder="Ej. Opportuni MX 3.0"
              className="input-bento w-full"
            />
            <datalist id="comunidades">
              {comunidades.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div>
            <Label>Link</Label>
            <input
              value={slugFinal}
              onChange={(e) => {
                setSlugTocado(true);
                setSlug(slugify(e.target.value));
              }}
              placeholder="mx6-ing"
              className="input-bento w-full font-mono text-sm"
            />
          </div>
        </div>
        <button onClick={agregar} disabled={!nombre.trim() || !slugFinal || guardando} className="btn-rosa mt-3 px-5 py-2 text-sm disabled:opacity-50">
          {guardando ? "Agregando…" : "＋ Agregar grupo"}
        </button>
      </div>

      {err && <p className="text-sm text-red-600 mb-4">{err}</p>}
      {!stats && !err && <Spinner />}
      {stats &&
        porComunidad(stats).map(([com, filas]) => {
          const total = filas.reduce(
            (a, f) => ({ nuevos: a.nuevos + f.nuevos, personas: a.personas + f.personas, clicks: a.clicks + f.clicks }),
            { nuevos: 0, personas: 0, clicks: 0 }
          );
          return (
            <div key={com} className="mb-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                <h3 className="font-display text-base font-black">{com}</h3>
                <span className="text-xs text-gray-500">
                  {total.nuevos} pasaportes nuevos · {total.personas} personas · {total.clicks} clicks
                </span>
              </div>
              <SubTable
                rows={filas}
                cols={["Grupo", "Pasaportes nuevos", "Personas", "Clicks", "Vacantes", ""]}
                render={(s) => {
                  const g = porSlug.get(s.canal);
                  return [
                    <span key="n">
                      <b>{s.nombre}</b>
                      {g && !g.activo && <span className="text-xs text-gray-400 ml-2">(apagado)</span>}
                      {!s.en_lista && s.canal && <span className="text-xs text-gray-400 ml-2">(no está en la lista)</span>}
                      {s.canal && <span className="block text-[11px] text-gray-400 font-mono">/{s.canal}</span>}
                    </span>,
                    <b key="u" style={{ color: "var(--rosa)" }}>{s.nuevos}</b>,
                    <b key="p">{s.personas}</b>,
                    String(s.clicks),
                    String(s.vacantes),
                    g ? (
                      <span key="a" className="flex flex-col gap-1 items-start">
                        <button onClick={() => renombrar(g)} className="text-xs font-bold" style={{ ...boton, color: "var(--lila)" }}>
                          Cambiar nombre
                        </button>
                        <button onClick={() => cambiar(g, { activo: !g.activo })} className="text-xs font-bold" style={{ ...boton, color: "var(--dark)" }}>
                          {g.activo ? "Apagar" : "Prender"}
                        </button>
                      </span>
                    ) : (
                      <span key="a" />
                    ),
                  ];
                }}
                empty="Sin grupos."
              />
            </div>
          );
        })}
      <p className="text-xs text-gray-400 mt-3">
        Pasaportes nuevos = personas cuyo primer click en Opportuni llegó por ese grupo: la gente que el grupo trajo.
        Personas = pasaportes distintos que abrieron vacantes con ese link. Si un grupo ya no existe, apágalo: deja de
        salir en los links de las vacantes.
      </p>
    </>
  );
}

/* ---------------- links por grupo de una vacante ---------------- */

/** Links de una vacante para cada grupo activo, por comunidad, para copiar uno o todos. */
export function LinksPorGrupo({ vacante, titulo }: { vacante: string; titulo?: string }) {
  const [grupos, setGrupos] = useState<Grupo[] | null>(null);
  const [stats, setStats] = useState<GrupoStat[] | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelado = false;
    api<{ grupos: Grupo[]; stats: GrupoStat[] }>(`/api/admin/grupos?vacante=${encodeURIComponent(vacante)}`)
      .then((d) => {
        if (cancelado) return;
        setGrupos(d.grupos.filter((g) => g.activo));
        setStats(d.stats);
      })
      .catch((e) => !cancelado && setErr(e instanceof Error ? e.message : "No se pudieron cargar los grupos."));
    return () => {
      cancelado = true;
    };
  }, [vacante]);

  if (err) return <p className="text-sm text-red-600">{err}</p>;
  if (!grupos) return <Spinner />;
  if (grupos.length === 0) {
    return <p className="text-sm text-gray-500">Todavía no hay grupos. Agrégalos en la pestaña Grupos.</p>;
  }

  const porCanal = new Map((stats ?? []).map((s) => [s.canal, s]));
  const texto = (gs: Grupo[]) => gs.map((g) => `${g.nombre}: ${linkDe(vacante, g.slug)}`).join("\n");

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-xs text-gray-500">
          {titulo ? `${titulo}: ` : ""}un link para cada grupo. Pega en cada grupo el suyo.
        </p>
        <CopyButton text={texto(grupos)} label="Copiar todos" />
      </div>
      {porComunidad(grupos).map(([com, gs]) => (
        <div key={com} className="mb-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-sm font-black">{com}</p>
            <CopyButton text={texto(gs)} label="Copiar comunidad" />
          </div>
          <div className="space-y-2">
            {gs.map((g) => {
              const s = porCanal.get(g.slug);
              return (
                <div
                  key={g.slug}
                  className="flex items-center justify-between gap-3 rounded-xl px-3 py-2"
                  style={{ background: "var(--cream2)", border: "2px solid var(--dark)" }}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold">{g.nombre}</p>
                    <p className="text-[11px] font-mono text-gray-500 truncate">{linkDe(vacante, g.slug)}</p>
                    {s && (s.clicks > 0 || s.nuevos > 0) && (
                      <p className="text-[11px] text-gray-500">
                        {s.personas} personas · {s.clicks} clicks · {s.nuevos} pasaportes nuevos
                      </p>
                    )}
                  </div>
                  <CopyButton text={linkDe(vacante, g.slug)} label="Copiar" />
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function LinksPorGrupoModal({ vacante, titulo, onClose }: { vacante: string; titulo: string; onClose: () => void }) {
  return (
    <Modal onClose={onClose} width={660}>
      <h2 className="text-2xl font-black mb-3">Links por grupo</h2>
      <LinksPorGrupo vacante={vacante} titulo={titulo} />
    </Modal>
  );
}
