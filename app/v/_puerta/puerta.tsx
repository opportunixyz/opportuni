"use client";

import { useEffect, useRef, useState } from "react";
import type { Pregunta, Opciones } from "../../lib/pasaporte/formulario";
import { stellarPublica } from "../../lib/stellar/config";
import { CONSEJOS } from "./consejos";
import { avisarCuenta, detalleDe, esCancelacion, firmarReto, guardaPasskeys, puedePasskey } from "./passkey-cliente";
import type { CuentaCreada } from "./stellar-cliente";

// La pantalla de la puerta (PRD F1, paso 3): la vacante arriba, el formulario
// del pasaporte con la explicación de cada pregunta, la casilla de términos
// y "Ya tengo pasaporte". Nunca deja al joven sin salida: si algo falla del
// lado del servidor, lo manda a la vacante igual.
// Fase 2: después del formulario, la cuenta del pasaporte con passkey (PRD 8.3).
// Si la passkey falla o se cancela, el servidor crea la cuenta de respaldo y
// el joven llega a la vacante igual (RF1).

interface Props {
  vacante: { id: string; titulo: string; empresa: string | null };
  canal: string | null;
  destino: string;
  preguntas: Pregunta[];
  terminos: string;
  estadoSugerido: string | null;
  ladaSugerida: string;
  inapp: boolean;
}

type Vista = "form" | "cuenta" | "ya_tengo" | "listo";
type Valor = string | string[];

const esOtra = (o: string) => /^otr[ao]s?$/i.test(o.trim());
const planas = (ops: Opciones) => ops.flatMap((o) => (typeof o === "string" ? [o] : o.opciones));

export default function Puerta(props: Props) {
  const { vacante, canal, destino, preguntas } = props;
  const [vista, setVista] = useState<Vista>("form");
  const [mensajeListo, setMensajeListo] = useState("Listo, ya tienes tu pasaporte ✦");
  const [cuentaPara, setCuentaPara] = useState<{ url: string; nombre: string } | null>(null);
  // null mientras se averigua; si no se sabe a tiempo, se intenta la passkey.
  const autenticador = useRef<boolean | null>(null);

  useEffect(() => {
    if (puedePasskey(props.inapp)) guardaPasskeys().then((v) => (autenticador.current = v));
  }, [props.inapp]);

  const irA = (url: string, mensaje?: string) => {
    if (mensaje) setMensajeListo(mensaje);
    setVista("listo");
    setTimeout(() => window.location.replace(url), 900);
  };

  // Pasaporte creado: sigue la cuenta con passkey o, si no se puede aquí, la de respaldo.
  const creado = (url: string, nombre: string, registrado: boolean) => {
    if (registrado && puedePasskey(props.inapp) && autenticador.current !== false) {
      setCuentaPara({ url, nombre });
      setVista("cuenta");
      return;
    }
    if (registrado && stellarPublica()) {
      const motivo = props.inapp ? "inapp" : puedePasskey(false) ? "sin_autenticador" : "sin_soporte";
      avisarCuenta({ resultado: "fallo", motivo });
    }
    irA(url);
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

        {vista === "listo" && <Espera titulo={mensajeListo} texto="Te llevamos a la vacante…" />}

        {vista === "form" && (
          <Formulario
            {...props}
            ladas={ladas}
            ladaInicial={ladaInicial}
            onCreado={creado}
            onFalla={() => irA(destino, "Te llevamos a la vacante")}
            onYaTengo={() => setVista("ya_tengo")}
          />
        )}

        {vista === "cuenta" && cuentaPara && (
          <CuentaStellar nombre={cuentaPara.nombre} onFin={(mensaje) => irA(cuentaPara.url, mensaje)} />
        )}

        {vista === "ya_tengo" && (
          <YaTengo
            vacanteId={vacante.id}
            canal={canal}
            ladas={ladas}
            ladaInicial={ladaInicial}
            conPasskey={puedePasskey(props.inapp)}
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
  inapp,
  onCreado,
  onFalla,
  onYaTengo,
}: Props & {
  ladas: string[];
  ladaInicial: string;
  onCreado: (url: string, nombre: string, registrado: boolean) => void;
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

  // El kit se descarga mientras llena el formulario, para que al crear la
  // cuenta no haya espera antes del Face ID.
  useEffect(() => {
    if (puedePasskey(inapp)) import("./stellar-cliente").catch(() => undefined);
  }, [inapp]);

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
      if (d.ok && d.destino) {
        return onCreado(d.destino, typeof valores.nombre === "string" ? valores.nombre : "", d.registrado === true);
      }
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

/* ---------------- cuenta del pasaporte ---------------- */

// Del primer Face ID hasta la vacante todo es una sola espera: el logo gira y
// rotan tips de Opportuni. Solo se detiene si el teléfono pide un toque más.
type Fase = "creando" | "tocar" | "autorizando" | "regla" | "firmando";

// Si el navegador rechaza el Face ID al instante (se perdió el toque), pedimos
// un toque más en vez de irnos al respaldo.
const RECHAZO_INMEDIATO_MS = 900;
const TOPE_CREAR_MS = 45_000;
// El permiso no tiene "Ahora no": si el Face ID falla se reintenta, y solo
// después de dos intentos seguimos a la vacante (nunca sin salida, RF1).
const INTENTOS_REGLA = 2;
const TEXTO_PERMISO =
  "Autoriza a Opportuni para agregar credenciales a tu pasaporte, como tu CV verificado. Es lo único que puede hacer: no puede mover nada más de tu cuenta.";

function CuentaStellar({ nombre, onFin }: { nombre: string; onFin: (mensaje?: string) => void }) {
  const [fase, setFase] = useState<Fase>("creando");
  const [errorRegla, setErrorRegla] = useState("");
  const intentosRegla = useRef(0);
  const cuenta = useRef<CuentaCreada | null>(null);
  const regla = useRef<Awaited<ReturnType<typeof import("./stellar-cliente").prepararRegla>> | null>(null);
  const terminado = useRef(false);
  const arrancado = useRef(false);

  const terminar = (mensaje?: string) => {
    if (terminado.current) return;
    terminado.current = true;
    onFin(mensaje);
  };

  // Falla la passkey: el servidor crea la cuenta de respaldo (RF1).
  const aRespaldo = (motivo: string, e?: unknown) => {
    avisarCuenta({ resultado: "fallo", motivo, detalle: e ? detalleDe(e) : undefined });
    terminar();
  };

  // Cuenta creada con o sin la regla de Opportuni.
  const guardar = (reglaId: number | null) =>
    cuenta.current && avisarCuenta({ resultado: "passkey", ...cuenta.current, reglaId });

  const crear = async (conToque: boolean) => {
    setFase("creando");
    const t0 = performance.now();
    const tope = setTimeout(() => aRespaldo("error", new Error("tiempo agotado")), TOPE_CREAR_MS);
    try {
      const mod = await import("./stellar-cliente");
      cuenta.current = await mod.crearCuenta(nombre);
    } catch (e) {
      clearTimeout(tope);
      if (terminado.current) return;
      if (!conToque && esCancelacion(e) && performance.now() - t0 < RECHAZO_INMEDIATO_MS) return setFase("tocar");
      return aRespaldo(esCancelacion(e) ? "cancelada" : "error", e);
    }
    clearTimeout(tope);
    if (terminado.current) return;
    try {
      regla.current = await (await import("./stellar-cliente")).prepararRegla();
    } catch (e) {
      guardar(null);
      avisarCuenta({ resultado: "fallo", motivo: "regla_error", detalle: detalleDe(e) });
      return terminar();
    }
    // Donde el navegador lo permite (Android), el segundo Face ID sale solo.
    autorizar(false);
  };

  const autorizar = async (conToque: boolean) => {
    if (!regla.current) return;
    setFase(conToque ? "firmando" : "autorizando");
    setErrorRegla("");
    const t0 = performance.now();
    try {
      const id = await (await import("./stellar-cliente")).firmarRegla(regla.current);
      guardar(id);
      terminar("¡Listo! Ya tienes tu Pasaporte Opportuni ✦");
    } catch (e) {
      // Sin toque el navegador lo rechaza al instante: pedimos el toque sin contarlo.
      if (!conToque && esCancelacion(e) && performance.now() - t0 < RECHAZO_INMEDIATO_MS) return setFase("regla");
      intentosRegla.current += 1;
      if (intentosRegla.current < INTENTOS_REGLA) {
        setErrorRegla("No se completó. Inténtalo otra vez.");
        return setFase("regla");
      }
      guardar(null);
      avisarCuenta({
        resultado: "fallo",
        motivo: esCancelacion(e) ? "regla_cancelada" : "regla_error",
        detalle: detalleDe(e),
      });
      terminar();
    }
  };

  useEffect(() => {
    if (arrancado.current) return;
    arrancado.current = true;
    crear(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (fase === "tocar") {
    return (
      <Espera
        girando={false}
        titulo="Protege tu pasaporte"
        texto="Con tu Face ID o tu huella. Así solo tú puedes usarlo, en este y en tus otros teléfonos."
      >
        <button type="button" onClick={() => crear(true)} className="btn-rosa w-full text-center mt-5">
          Proteger con Face ID o huella
        </button>
        <BotonSecundario onClick={() => aRespaldo("cancelada")}>Ahora no, llévame a la vacante</BotonSecundario>
      </Espera>
    );
  }

  if (fase === "regla") {
    return (
      <Espera girando={false} titulo="Último paso" texto={TEXTO_PERMISO}>
        <button type="button" onClick={() => autorizar(true)} className="btn-rosa w-full text-center mt-5">
          Autorizar con Face ID o huella
        </button>
        {errorRegla && <p className="text-xs text-red-600 mt-3">{errorRegla}</p>}
      </Espera>
    );
  }

  if (fase === "autorizando") return <Espera titulo="Último paso: autoriza a Opportuni" texto={TEXTO_PERMISO} />;
  if (fase === "firmando") return <Espera titulo="Guardando tu Pasaporte Opportuni…" texto="Un momento, ya casi." />;
  return (
    <Espera
      titulo="Tu Pasaporte Opportuni se está creando…"
      texto="Usa tu Face ID o tu huella cuando te lo pida el teléfono."
    />
  );
}

// El tip sigue donde iba aunque cambie la pantalla.
let consejoActual = Math.floor(Math.random() * CONSEJOS.length);

/** Pantalla de espera: logo de Opportuni girando, mensaje y tips que rotan. */
function Espera({
  titulo,
  texto,
  girando = true,
  children,
}: {
  titulo: string;
  texto?: string;
  girando?: boolean;
  children?: React.ReactNode;
}) {
  const [i, setI] = useState(consejoActual);
  useEffect(() => {
    const t = setInterval(() => {
      consejoActual = (consejoActual + 1) % CONSEJOS.length;
      setI(consejoActual);
    }, 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="bento p-7 text-center" style={{ background: "white" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-opportuni.png"
        alt=""
        className={`mx-auto mb-5 ${girando ? "motion-safe:animate-spin" : ""}`}
        style={{ width: 72, height: 72, animationDuration: "1.4s" }}
      />
      <div role="status" aria-live="polite">
        <h2 className="text-xl font-black mb-1">{titulo}</h2>
        {texto && <p className="text-sm text-gray-500 leading-snug">{texto}</p>}
      </div>
      {children}
      <div className="mt-6 rounded-2xl px-4 py-3 text-left" style={{ background: "var(--cream)" }}>
        <p className="text-[11px] font-mono font-bold uppercase mb-1" style={{ color: "var(--nar)" }}>
          Tip Opportuni ✦
        </p>
        <p key={i} className="text-sm leading-snug animate-slide-in-right">
          {CONSEJOS[i]}
        </p>
      </div>
    </div>
  );
}

function BotonSecundario({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-center text-sm font-bold mt-4"
      style={{ color: "var(--lila)", background: "none", border: "none", cursor: "pointer" }}
    >
      {children}
    </button>
  );
}

/* ---------------- ya tengo pasaporte ---------------- */

function YaTengo({
  vacanteId,
  canal,
  ladas,
  ladaInicial,
  conPasskey,
  onListo,
  onFalla,
  onVolver,
}: {
  vacanteId: string;
  canal: string | null;
  ladas: string[];
  ladaInicial: string;
  conPasskey: boolean;
  onListo: (url: string) => void;
  onFalla: () => void;
  onVolver: () => void;
}) {
  const [lada, setLada] = useState(ladaInicial);
  const [numero, setNumero] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [noEncontrado, setNoEncontrado] = useState(false);
  const [reto, setReto] = useState<string | null>(null);
  const [conFace, setConFace] = useState(false);
  const [errorFace, setErrorFace] = useState("");

  // El reto se pide antes del toque, para que el Face ID salga al instante.
  useEffect(() => {
    if (!conPasskey) return;
    fetch("/api/pasaporte/reto", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => d.ok && setReto(d.reto))
      .catch(() => undefined);
  }, [conPasskey]);

  const entrarConFace = async () => {
    if (!reto) return;
    setConFace(true);
    setErrorFace("");
    try {
      const asercion = await firmarReto(reto);
      const r = await fetch("/api/pasaporte/passkey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vacante: vacanteId, canal, asercion }),
      });
      const d = await r.json().catch(() => ({}));
      if (d.ok && d.destino) return onListo(d.destino);
      setErrorFace(
        d.noEncontrado
          ? "Esa passkey no es de un pasaporte Opportuni. Entra con tu WhatsApp."
          : d.error || "No pudimos entrar con Face ID. Entra con tu WhatsApp."
      );
    } catch (e) {
      if (!esCancelacion(e)) setErrorFace("No pudimos entrar con Face ID. Entra con tu WhatsApp.");
    }
    // Un reto por intento.
    setReto(null);
    fetch("/api/pasaporte/reto", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => d.ok && setReto(d.reto))
      .catch(() => undefined);
    setConFace(false);
  };

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
      {conPasskey && (
        <>
          <p className="text-sm text-gray-500 mb-4">Entra con el Face ID o la huella con que lo protegiste.</p>
          <button
            type="button"
            onClick={entrarConFace}
            disabled={!reto || conFace}
            className="btn-rosa w-full text-center disabled:opacity-60"
          >
            {conFace ? "Entrando…" : "Entrar con Face ID o huella"}
          </button>
          {errorFace && <p className="text-xs text-red-600 mt-2">{errorFace}</p>}
          <p className="text-xs text-gray-400 text-center my-5">o con tu WhatsApp</p>
        </>
      )}
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
