"use client";

import { useState } from "react";
import type { Pregunta, Opciones } from "../../lib/pasaporte/formulario";

// La pantalla de la puerta (PRD F1, paso 3): la vacante arriba, el formulario
// del pasaporte con la explicación de cada pregunta, la casilla de términos
// y "Ya tengo pasaporte". Nunca deja al joven sin salida: si algo falla del
// lado del servidor, lo manda a la vacante igual.

interface Props {
  vacante: { id: string; titulo: string; empresa: string | null };
  canal: string | null;
  destino: string;
  preguntas: Pregunta[];
  terminos: string;
  estadoSugerido: string | null;
  ladaSugerida: string;
}

type Vista = "form" | "ya_tengo" | "listo";
type Valor = string | string[];

const esOtra = (o: string) => /^otr[ao]s?$/i.test(o.trim());
const planas = (ops: Opciones) => ops.flatMap((o) => (typeof o === "string" ? [o] : o.opciones));

export default function Puerta(props: Props) {
  const { vacante, canal, destino, preguntas } = props;
  const [vista, setVista] = useState<Vista>("form");
  const [mensajeListo, setMensajeListo] = useState("Listo, ya tienes tu pasaporte ✦");

  const irA = (url: string, mensaje?: string) => {
    if (mensaje) setMensajeListo(mensaje);
    setVista("listo");
    setTimeout(() => window.location.replace(url), 900);
  };

  const telefono = preguntas.find((p) => p.clave === "whatsapp");
  const ladas = telefono ? planas(telefono.opciones) : ["+52"];
  const ladaInicial = ladas.includes(props.ladaSugerida) ? props.ladaSugerida : ladas[0] ?? "+52";

  return (
    <main className="min-h-screen px-4 py-8" style={{ background: "var(--cream)" }}>
      <div className="mx-auto" style={{ maxWidth: 460 }}>
        <div className="flex items-center justify-center gap-2 mb-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-opportuni.png" alt="Opportuni" style={{ height: 30 }} />
        </div>

        <div className="bento-rosa px-5 py-4 mb-5" style={{ background: "white" }}>
          <p className="text-[11px] font-mono font-bold uppercase" style={{ color: "var(--nar)" }}>
            Vacante
          </p>
          <h1 className="text-xl font-black leading-tight">
            {vacante.empresa ? `${vacante.empresa} · ` : ""}
            {vacante.titulo}
          </h1>
        </div>

        {vista === "listo" && (
          <div className="bento p-8 text-center" style={{ background: "white" }}>
            <div className="text-4xl mb-2">🎉</div>
            <h2 className="text-2xl font-black mb-1">{mensajeListo}</h2>
            <p className="text-sm text-gray-500">Te llevamos a la vacante…</p>
          </div>
        )}

        {vista === "form" && (
          <Formulario
            {...props}
            ladas={ladas}
            ladaInicial={ladaInicial}
            onListo={(url) => irA(url)}
            onFalla={() => irA(destino, "Te llevamos a la vacante")}
            onYaTengo={() => setVista("ya_tengo")}
          />
        )}

        {vista === "ya_tengo" && (
          <YaTengo
            vacanteId={vacante.id}
            canal={canal}
            ladas={ladas}
            ladaInicial={ladaInicial}
            onListo={(url) => irA(url, "Qué gusto verte de nuevo ✦")}
            onFalla={() => irA(destino, "Te llevamos a la vacante")}
            onVolver={() => setVista("form")}
          />
        )}

        <p className="text-[11px] text-gray-400 text-center mt-6 leading-relaxed">
          Opportuni, comunidad de más de 12 mil jóvenes en México y Colombia.{" "}
          <a href="/privacidad" target="_blank" className="underline">
            Aviso de privacidad
          </a>
        </p>
      </div>
    </main>
  );
}

/* ---------------- formulario del pasaporte ---------------- */

function Formulario({
  vacante,
  canal,
  preguntas,
  terminos,
  estadoSugerido,
  ladas,
  ladaInicial,
  onListo,
  onFalla,
  onYaTengo,
}: Props & {
  ladas: string[];
  ladaInicial: string;
  onListo: (url: string) => void;
  onFalla: () => void;
  onYaTengo: () => void;
}) {
  const [valores, setValores] = useState<Record<string, Valor>>(() => {
    const init: Record<string, Valor> = {};
    for (const p of preguntas) {
      if (p.tipo === "telefono") init[`${p.clave}_lada`] = ladaInicial;
      if (p.clave === "estado" && estadoSugerido && planas(p.opciones).includes(estadoSugerido)) {
        init.estado = estadoSugerido;
      }
    }
    return init;
  });
  const [acepto, setAcepto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<{ clave: string; texto: string } | null>(null);
  const [yaExiste, setYaExiste] = useState(false);

  const set = (clave: string, v: Valor) => {
    setValores((s) => ({ ...s, [clave]: v }));
    if (error?.clave === clave) setError(null);
  };

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acepto) {
      setError({ clave: "terminos", texto: "Para seguir, marca la casilla." });
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      const r = await fetch("/api/pasaporte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vacante: vacante.id, canal, respuestas: valores, terminos: true }),
      });
      const d = await r.json().catch(() => ({}));
      if (d.ok && d.destino) return onListo(d.destino);
      if (d.existe) {
        setYaExiste(true);
        setEnviando(false);
        return;
      }
      if (r.status >= 500 || !d.error) return onFalla();
      setError({ clave: d.clave ?? "", texto: d.error });
      setEnviando(false);
    } catch {
      onFalla();
    }
  };

  if (yaExiste) {
    return (
      <div className="bento p-6 text-center" style={{ background: "white" }}>
        <h2 className="text-xl font-black mb-2">Ese WhatsApp ya tiene pasaporte</h2>
        <p className="text-sm text-gray-600 mb-5">
          Si es tuyo, entra con él. No tienes que volver a llenar nada.
        </p>
        <button type="button" onClick={onYaTengo} className="btn-rosa w-full text-center">
          Entrar con mi pasaporte ✦
        </button>
        <button
          type="button"
          onClick={() => setYaExiste(false)}
          className="text-sm font-bold mt-4"
          style={{ color: "var(--dark)", background: "none", border: "none", cursor: "pointer" }}
        >
          Corregir mi número
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="bento p-6" style={{ background: "white" }} noValidate>
      <p className="text-base font-bold mb-1">
        Para ver esta vacante crea tu{" "}
        <span className="font-serif italic" style={{ color: "var(--rosa)" }}>
          Pasaporte Opportuni
        </span>
        .
      </p>
      <p className="text-sm text-gray-500 mb-5">Lo llenas una sola vez.</p>

      <div className="space-y-5">
        {preguntas.map((p) => (
          <Campo
            key={p.id}
            p={p}
            valores={valores}
            set={set}
            ladas={ladas}
            error={error?.clave === p.clave ? error.texto : null}
          />
        ))}
      </div>

      <label className="flex items-start gap-3 mt-6 cursor-pointer">
        <input
          type="checkbox"
          checked={acepto}
          onChange={(e) => {
            setAcepto(e.target.checked);
            if (error?.clave === "terminos") setError(null);
          }}
          className="mt-1 w-5 h-5 shrink-0"
          style={{ accentColor: "var(--rosa)" }}
        />
        <span className="text-xs leading-relaxed text-gray-700">
          {terminos}{" "}
          <a href="/privacidad" target="_blank" className="underline font-bold">
            Aviso de privacidad
          </a>
        </span>
      </label>
      {error?.clave === "terminos" && <p className="text-xs text-red-600 mt-1">{error.texto}</p>}
      {error && !["terminos", ...preguntas.map((p) => p.clave)].includes(error.clave) && (
        <p className="text-sm text-red-600 mt-3">{error.texto}</p>
      )}

      <button type="submit" disabled={enviando} className="btn-rosa w-full text-center mt-6 disabled:opacity-60">
        {enviando ? "Creando tu pasaporte…" : "Crear mi pasaporte y ver la vacante"}
      </button>

      <button
        type="button"
        onClick={onYaTengo}
        className="w-full text-center text-sm font-bold mt-4"
        style={{ color: "var(--lila)", background: "none", border: "none", cursor: "pointer" }}
      >
        Ya tengo pasaporte
      </button>
    </form>
  );
}

function Campo({
  p,
  valores,
  set,
  ladas,
  error,
}: {
  p: Pregunta;
  valores: Record<string, Valor>;
  set: (clave: string, v: Valor) => void;
  ladas: string[];
  error: string | null;
}) {
  const id = `q-${p.clave}`;
  const valor = valores[p.clave];

  return (
    <div>
      <label htmlFor={id} className="block font-display font-extrabold text-[15px]">
        {p.texto}
        {!p.obligatoria && <span className="text-xs font-normal text-gray-400"> (opcional)</span>}
      </label>
      {p.explicacion && <p className="text-xs text-gray-500 mb-2 leading-snug">{p.explicacion}</p>}

      {p.tipo === "texto" && (
        <input
          id={id}
          type="text"
          value={typeof valor === "string" ? valor : ""}
          onChange={(e) => set(p.clave, e.target.value)}
          autoComplete={p.clave === "nombre" ? "name" : "off"}
          maxLength={120}
          className="input-bento"
        />
      )}

      {p.tipo === "telefono" && (
        <div className="flex gap-2">
          <select
            aria-label="Lada"
            value={String(valores[`${p.clave}_lada`] ?? ladas[0])}
            onChange={(e) => set(`${p.clave}_lada`, e.target.value)}
            className="input-bento"
            style={{ width: 96, paddingRight: 8 }}
          >
            {ladas.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <input
            id={id}
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="10 dígitos"
            value={typeof valor === "string" ? valor : ""}
            onChange={(e) => set(p.clave, e.target.value)}
            maxLength={20}
            className="input-bento flex-1"
          />
        </div>
      )}

      {p.tipo === "lista" && (
        <select
          id={id}
          value={typeof valor === "string" ? valor : ""}
          onChange={(e) => set(p.clave, e.target.value)}
          className="input-bento"
        >
          <option value="">Elige una opción</option>
          {p.opciones.map((o) =>
            typeof o === "string" ? (
              <option key={o} value={o}>
                {o}
              </option>
            ) : (
              <optgroup key={o.grupo} label={o.grupo}>
                {o.opciones.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </optgroup>
            )
          )}
        </select>
      )}

      {p.tipo === "chips" && <Chips p={p} valores={valores} set={set} />}

      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

function Chips({
  p,
  valores,
  set,
}: {
  p: Pregunta;
  valores: Record<string, Valor>;
  set: (clave: string, v: Valor) => void;
}) {
  const max = p.max_seleccion ?? 1;
  const v = valores[p.clave];
  const elegidas = Array.isArray(v) ? v : typeof v === "string" && v ? [v] : [];
  const toggle = (o: string) => {
    if (elegidas.includes(o)) return set(p.clave, elegidas.filter((x) => x !== o));
    if (max === 1) return set(p.clave, [o]);
    if (elegidas.length < max) set(p.clave, [...elegidas, o]);
  };
  const conOtra = elegidas.some(esOtra);

  return (
    <>
      <div className="flex flex-wrap gap-2" role="group" aria-label={p.texto}>
        {planas(p.opciones).map((o) => {
          const activo = elegidas.includes(o);
          const lleno = !activo && max > 1 && elegidas.length >= max;
          return (
            <button
              key={o}
              type="button"
              aria-pressed={activo}
              onClick={() => toggle(o)}
              disabled={lleno}
              className="px-4 py-2 rounded-full text-sm font-bold transition-transform disabled:opacity-40"
              style={{
                border: "2.5px solid var(--dark)",
                background: activo ? "var(--rosa)" : "var(--cream)",
                color: activo ? "white" : "var(--dark)",
                boxShadow: activo ? "2px 2px 0 var(--dark)" : "none",
                cursor: lleno ? "not-allowed" : "pointer",
              }}
            >
              {o}
            </button>
          );
        })}
      </div>
      {conOtra && (
        <input
          type="text"
          aria-label="¿Cuál?"
          placeholder="¿Cuál?"
          maxLength={80}
          value={typeof valores[`${p.clave}_otra`] === "string" ? (valores[`${p.clave}_otra`] as string) : ""}
          onChange={(e) => set(`${p.clave}_otra`, e.target.value)}
          className="input-bento mt-2"
        />
      )}
    </>
  );
}

/* ---------------- ya tengo pasaporte ---------------- */

function YaTengo({
  vacanteId,
  canal,
  ladas,
  ladaInicial,
  onListo,
  onFalla,
  onVolver,
}: {
  vacanteId: string;
  canal: string | null;
  ladas: string[];
  ladaInicial: string;
  onListo: (url: string) => void;
  onFalla: () => void;
  onVolver: () => void;
}) {
  const [lada, setLada] = useState(ladaInicial);
  const [numero, setNumero] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [noEncontrado, setNoEncontrado] = useState(false);

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setError("");
    setNoEncontrado(false);
    try {
      const r = await fetch("/api/pasaporte/entrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vacante: vacanteId, canal, lada, numero }),
      });
      const d = await r.json().catch(() => ({}));
      if (d.ok && d.destino) return onListo(d.destino);
      if (d.noEncontrado) setNoEncontrado(true);
      else if (r.status >= 500 || !d.error) return onFalla();
      else setError(d.error);
    } catch {
      return onFalla();
    }
    setEnviando(false);
  };

  return (
    <form onSubmit={entrar} className="bento p-6" style={{ background: "white" }} noValidate>
      <h2 className="text-xl font-black mb-1">Ya tengo pasaporte</h2>
      <p className="text-sm text-gray-500 mb-5">
        Escribe el WhatsApp con el que lo creaste y te reconocemos en este teléfono.
      </p>

      <label htmlFor="ya-wa" className="block font-display font-extrabold text-[15px] mb-2">
        Tu WhatsApp
      </label>
      <div className="flex gap-2">
        <select
          aria-label="Lada"
          value={lada}
          onChange={(e) => setLada(e.target.value)}
          className="input-bento"
          style={{ width: 96, paddingRight: 8 }}
        >
          {ladas.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <input
          id="ya-wa"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="10 dígitos"
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
          maxLength={20}
          className="input-bento flex-1"
        />
      </div>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      {noEncontrado && (
        <p className="text-sm mt-3 rounded-2xl px-4 py-3" style={{ background: "var(--cream2)" }}>
          No encontramos un pasaporte con ese WhatsApp. Revisa el número o crea el tuyo: es una sola vez.
        </p>
      )}

      <button type="submit" disabled={enviando || !numero.trim()} className="btn-rosa w-full text-center mt-6 disabled:opacity-60">
        {enviando ? "Buscando tu pasaporte…" : "Entrar y ver la vacante"}
      </button>
      <button
        type="button"
        onClick={onVolver}
        className="w-full text-center text-sm font-bold mt-4"
        style={{ color: "var(--lila)", background: "none", border: "none", cursor: "pointer" }}
      >
        Crear mi pasaporte
      </button>
    </form>
  );
}
