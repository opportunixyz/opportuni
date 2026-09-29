"use client";

import { useCallback, useEffect, useState } from "react";
import type { Opciones, Pregunta, TipoPregunta } from "../../lib/pasaporte/formulario";
import { api, fmtDate, Label, Spinner } from "./ui";

// Pestaña Formulario (PRD F1, "Editar el formulario" y RF18): cada cambio
// guarda una versión nueva y la puerta lo muestra sin deploy. Quien ya tiene
// pasaporte no vuelve a ver el formulario.

const FIJAS = ["nombre", "whatsapp", "estado", "areas", "rango_edad"];
const SIEMPRE = ["nombre", "whatsapp"];
const TIPOS: { v: TipoPregunta; label: string }[] = [
  { v: "texto", label: "Texto" },
  { v: "lista", label: "Lista" },
  { v: "chips", label: "Botones" },
  { v: "telefono", label: "Teléfono" },
];

// Opciones como texto: una por línea; "# Grupo" abre un grupo (ej. países).
const aTexto = (ops: Opciones) =>
  ops.map((o) => (typeof o === "string" ? o : [`# ${o.grupo}`, ...o.opciones].join("\n"))).join("\n");

function deTexto(t: string): Opciones {
  const out: Opciones = [];
  let grupo: { grupo: string; opciones: string[] } | null = null;
  for (const linea of t.split("\n").map((l) => l.trim()).filter(Boolean)) {
    if (linea.startsWith("#")) {
      grupo = { grupo: linea.replace(/^#+\s*/, ""), opciones: [] };
      out.push(grupo);
    } else if (grupo) grupo.opciones.push(linea);
    else out.push(linea);
  }
  return out;
}

export default function FormularioTab() {
  const [preguntas, setPreguntas] = useState<Pregunta[] | null>(null);
  const [err, setErr] = useState("");
  const [nueva, setNueva] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setPreguntas((await api<{ preguntas: Pregunta[] }>("/api/admin/formulario")).preguntas);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo cargar el formulario.");
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const version = preguntas ? Math.max(0, ...preguntas.map((p) => Number(p.version))) : 0;

  return (
    <>
      <div className="bento p-4 mb-5 text-sm" style={{ background: "white" }}>
        <p>
          Lo que cambies aquí aparece en la puerta al instante. El formulario se llena <b>una sola vez</b>: una pregunta
          nueva solo se le hace a quien crea su pasaporte desde ahora.
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Nombre, WhatsApp, estado, área y edad son fijas porque de ellas salen los porcentajes: se puede cambiar su texto,
          explicación y opciones. Versión actual: <b>{version || "—"}</b>
        </p>
      </div>
      {err && <p className="text-sm text-red-600 mb-4">{err}</p>}
      {!preguntas && !err && <Spinner />}
      <div className="space-y-4">
        {preguntas?.map((p) => <PreguntaCard key={`${p.id}-${p.version}`} p={p} onGuardada={cargar} />)}
      </div>
      {preguntas &&
        (nueva ? (
          <NuevaPregunta onClose={() => setNueva(false)} onCreada={() => { setNueva(false); void cargar(); }} />
        ) : (
          <button onClick={() => setNueva(true)} className="btn-rosa mt-5 px-5 py-2.5 text-sm">
            ＋ Nueva pregunta
          </button>
        ))}
    </>
  );
}

function PreguntaCard({ p, onGuardada }: { p: Pregunta; onGuardada: () => void }) {
  const [texto, setTexto] = useState(p.texto);
  const [explicacion, setExplicacion] = useState(p.explicacion);
  const [opciones, setOpciones] = useState(aTexto(p.opciones));
  const [max, setMax] = useState(String(p.max_seleccion ?? 1));
  const [orden, setOrden] = useState(String(p.orden));
  const [obligatoria, setObligatoria] = useState(p.obligatoria);
  const [activa, setActiva] = useState(p.activa);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState("");

  const fija = FIJAS.includes(p.clave);
  const siempre = SIEMPRE.includes(p.clave);
  const cambios =
    texto !== p.texto ||
    explicacion !== p.explicacion ||
    opciones !== aTexto(p.opciones) ||
    (p.tipo === "chips" && max !== String(p.max_seleccion ?? 1)) ||
    orden !== String(p.orden) ||
    obligatoria !== p.obligatoria ||
    activa !== p.activa;

  const guardar = async () => {
    setGuardando(true);
    setMsg("");
    try {
      const body: Record<string, unknown> = { texto, explicacion, orden: Number(orden), obligatoria, activa };
      if (p.tipo !== "texto") body.opciones = deTexto(opciones);
      if (p.tipo === "chips") body.max_seleccion = Number(max);
      await api(`/api/admin/formulario/${p.id}`, { method: "PUT", body: JSON.stringify(body) });
      onGuardada();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "No se pudo guardar.");
      setGuardando(false);
    }
  };

  return (
    <div className="bento p-5" style={{ background: activa ? "white" : "var(--cream2)", opacity: activa ? 1 : 0.8 }}>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--cream2)", border: "1.5px solid var(--dark)" }}>
          {p.clave}
        </span>
        <span className="text-xs text-gray-500">{TIPOS.find((t) => t.v === p.tipo)?.label}</span>
        {fija && <span className="text-[11px] font-bold" style={{ color: "var(--lila)" }}>fija</span>}
        <span className="text-[11px] text-gray-400 ml-auto">
          v{p.version} · {fmtDate(p.updated_at)}
          {p.updated_by ? ` · ${p.updated_by}` : ""}
        </span>
      </div>

      <Label>Pregunta</Label>
      <input value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={200} className="input-bento mb-3" />
      <Label>Explicación</Label>
      <textarea value={explicacion} onChange={(e) => setExplicacion(e.target.value)} maxLength={500} rows={2} className="textarea-bento mb-3" />

      {p.tipo !== "texto" && (
        <>
          <Label>{p.tipo === "telefono" ? "Ladas (una por línea)" : "Opciones (una por línea; “# Grupo” abre un grupo)"}</Label>
          <textarea value={opciones} onChange={(e) => setOpciones(e.target.value)} rows={Math.min(10, Math.max(3, opciones.split("\n").length))} className="textarea-bento mb-3 font-mono text-xs" />
        </>
      )}

      <div className="flex flex-wrap items-center gap-4 text-sm">
        {p.tipo === "chips" && (
          <label className="flex items-center gap-2">
            Máximo
            <input type="number" min={1} max={20} value={max} onChange={(e) => setMax(e.target.value)} disabled={p.clave === "rango_edad"} className="input-bento" style={{ width: 80, padding: "6px 12px" }} />
          </label>
        )}
        <label className="flex items-center gap-2">
          Orden
          <input type="number" value={orden} onChange={(e) => setOrden(e.target.value)} className="input-bento" style={{ width: 90, padding: "6px 12px" }} />
        </label>
        <label className="flex items-center gap-2" title={siempre ? "Siempre obligatoria" : ""}>
          <input type="checkbox" checked={obligatoria} disabled={siempre} onChange={(e) => setObligatoria(e.target.checked)} style={{ accentColor: "var(--rosa)" }} />
          Obligatoria
        </label>
        <label className="flex items-center gap-2" title={siempre ? "Siempre activa" : ""}>
          <input type="checkbox" checked={activa} disabled={siempre} onChange={(e) => setActiva(e.target.checked)} style={{ accentColor: "var(--rosa)" }} />
          Activa
        </label>
        <button onClick={guardar} disabled={!cambios || guardando} className="btn-rosa ml-auto px-5 py-2 text-sm disabled:opacity-40">
          {guardando ? "Guardando…" : "Guardar"}
        </button>
      </div>
      {msg && <p className="text-sm text-red-600 mt-2">{msg}</p>}
    </div>
  );
}

function NuevaPregunta({ onClose, onCreada }: { onClose: () => void; onCreada: () => void }) {
  const [texto, setTexto] = useState("");
  const [explicacion, setExplicacion] = useState("");
  const [tipo, setTipo] = useState<TipoPregunta>("texto");
  const [opciones, setOpciones] = useState("");
  const [max, setMax] = useState("1");
  const [obligatoria, setObligatoria] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState("");

  const crear = async () => {
    setGuardando(true);
    setMsg("");
    try {
      await api("/api/admin/formulario", {
        method: "POST",
        body: JSON.stringify({ texto, explicacion, tipo, opciones: deTexto(opciones), max_seleccion: Number(max), obligatoria }),
      });
      onCreada();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "No se pudo crear.");
      setGuardando(false);
    }
  };

  return (
    <div className="bento-lila p-5 mt-5" style={{ background: "white" }}>
      <h3 className="text-lg font-black mb-3">Nueva pregunta</h3>
      <Label>Pregunta *</Label>
      <input value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={200} placeholder="Ej. ¿Qué estudias?" className="input-bento mb-3" />
      <Label>Explicación</Label>
      <textarea value={explicacion} onChange={(e) => setExplicacion(e.target.value)} maxLength={500} rows={2} placeholder="Para qué la pedimos" className="textarea-bento mb-3" />
      <Label>Tipo</Label>
      <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoPregunta)} className="input-bento mb-3">
        {TIPOS.filter((t) => t.v !== "telefono").map((t) => (
          <option key={t.v} value={t.v}>
            {t.label}
          </option>
        ))}
      </select>
      {tipo !== "texto" && (
        <>
          <Label>Opciones (una por línea)</Label>
          <textarea value={opciones} onChange={(e) => setOpciones(e.target.value)} rows={4} className="textarea-bento mb-3 font-mono text-xs" />
        </>
      )}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        {tipo === "chips" && (
          <label className="flex items-center gap-2">
            Máximo
            <input type="number" min={1} max={20} value={max} onChange={(e) => setMax(e.target.value)} className="input-bento" style={{ width: 80, padding: "6px 12px" }} />
          </label>
        )}
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={obligatoria} onChange={(e) => setObligatoria(e.target.checked)} style={{ accentColor: "var(--rosa)" }} />
          Obligatoria
        </label>
        <button onClick={onClose} className="text-sm font-bold ml-auto" style={{ background: "none", border: "none", cursor: "pointer" }}>
          Cancelar
        </button>
        <button onClick={crear} disabled={!texto.trim() || guardando} className="btn-rosa px-5 py-2 text-sm disabled:opacity-40">
          {guardando ? "Creando…" : "Crear pregunta"}
        </button>
      </div>
      {msg && <p className="text-sm text-red-600 mt-2">{msg}</p>}
    </div>
  );
}
