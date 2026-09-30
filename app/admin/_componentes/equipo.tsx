"use client";

import { useCallback, useEffect, useState } from "react";
import { api, CopyButton, Label, Spinner, SubTable, fmtDate } from "./ui";

// Pestaña Equipo: usuarios para el conector de Claude (Vianey en claude.ai,
// Roman en Claude Code) y la bitácora de lo que se hace por Claude y /admin.

const MCP_URL = "https://opportuni.xyz/api/mcp";

interface Usuario {
  usuario: string;
  nombre: string;
  rol: "admin" | "operacion";
  activo: boolean;
  ultimo_login: string | null;
  created_at: string;
}

interface Entrada {
  usuario: string | null;
  via: string;
  accion: string;
  detalle: Record<string, unknown> | null;
  created_at: string;
}

const boton = { cursor: "pointer", background: "none", border: "none", padding: 0 } as const;

export default function EquipoTab() {
  const [usuarios, setUsuarios] = useState<Usuario[] | null>(null);
  const [bitacora, setBitacora] = useState<Entrada[]>([]);
  const [err, setErr] = useState("");
  const [nuevo, setNuevo] = useState({ usuario: "", nombre: "", rol: "operacion", password: "" });
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setErr("");
    try {
      const d = await api<{ usuarios: Usuario[]; bitacora: Entrada[] }>("/api/admin/equipo");
      setUsuarios(d.usuarios);
      setBitacora(d.bitacora);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo cargar el equipo.");
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const crear = async () => {
    setGuardando(true);
    setErr("");
    try {
      await api("/api/admin/equipo", { method: "POST", body: JSON.stringify(nuevo) });
      setNuevo({ usuario: "", nombre: "", rol: "operacion", password: "" });
      await cargar();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo crear.");
    }
    setGuardando(false);
  };

  const cambiar = async (usuario: string, cambios: Record<string, unknown>, aviso?: string) => {
    try {
      await api("/api/admin/equipo", { method: "PATCH", body: JSON.stringify({ usuario, ...cambios }) });
      if (aviso) alert(aviso);
      await cargar();
    } catch (e) {
      alert(e instanceof Error ? e.message : "No se pudo cambiar.");
    }
  };

  const nuevaPassword = (u: Usuario) => {
    const p = prompt(`Nueva contraseña para ${u.nombre} (mínimo 10 caracteres). Cierra sus sesiones de Claude.`);
    if (p) void cambiar(u.usuario, { password: p }, "Contraseña cambiada.");
  };

  return (
    <>
      <div className="bento p-5 mb-5" style={{ background: "white", maxWidth: 760 }}>
        <h2 className="font-display text-lg font-black mb-1">Conector de Claude</h2>
        <p className="text-sm text-gray-600 mb-3">
          En claude.ai: Ajustes › Conectores › Agregar conector personalizado, pega esta URL y entra con tu usuario. En
          Claude Code: <span className="font-mono text-xs">claude mcp add --transport http opportuni {MCP_URL}</span>
        </p>
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold" style={{ color: "var(--rosa)" }}>
            {MCP_URL}
          </span>
          <CopyButton text={MCP_URL} label="Copiar URL" />
        </div>
      </div>

      <div className="bento p-5 mb-5" style={{ background: "white", maxWidth: 760 }}>
        <h2 className="font-display text-lg font-black mb-3">Agregar usuario</h2>
        <div className="grid md:grid-cols-2 gap-2">
          <div>
            <Label>Usuario</Label>
            <input value={nuevo.usuario} onChange={(e) => setNuevo({ ...nuevo, usuario: e.target.value.toLowerCase() })} placeholder="vianey" className="input-bento w-full" autoComplete="off" />
          </div>
          <div>
            <Label>Nombre</Label>
            <input value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} placeholder="Vianey" className="input-bento w-full" />
          </div>
          <div>
            <Label>Rol</Label>
            <select value={nuevo.rol} onChange={(e) => setNuevo({ ...nuevo, rol: e.target.value })} className="input-bento w-full">
              <option value="operacion">Operación (Vianey)</option>
              <option value="admin">Admin (Roman)</option>
            </select>
          </div>
          <div>
            <Label>Contraseña (mínimo 10)</Label>
            <input type="password" value={nuevo.password} onChange={(e) => setNuevo({ ...nuevo, password: e.target.value })} className="input-bento w-full" autoComplete="new-password" />
          </div>
        </div>
        <button
          onClick={crear}
          disabled={guardando || !nuevo.usuario || !nuevo.nombre || nuevo.password.length < 10}
          className="btn-rosa mt-3 px-5 py-2 text-sm disabled:opacity-50"
        >
          {guardando ? "Creando…" : "＋ Crear usuario"}
        </button>
      </div>

      {err && <p className="text-sm text-red-600 mb-4">{err}</p>}
      {!usuarios && !err && <Spinner />}
      {usuarios && (
        <SubTable
          rows={usuarios}
          cols={["Usuario", "Rol", "Último login", ""]}
          render={(u) => [
            <span key="u">
              <b>{u.nombre}</b>
              {!u.activo && <span className="text-xs text-gray-400 ml-2">(desactivado)</span>}
              <span className="block text-[11px] text-gray-400 font-mono">{u.usuario}</span>
            </span>,
            u.rol === "admin" ? "Admin" : "Operación",
            <span key="l" className="text-xs">{u.ultimo_login ? fmtDate(u.ultimo_login) : "—"}</span>,
            <span key="a" className="flex flex-col gap-1 items-start">
              <button onClick={() => nuevaPassword(u)} className="text-xs font-bold" style={{ ...boton, color: "var(--lila)" }}>
                Cambiar contraseña
              </button>
              <button onClick={() => cambiar(u.usuario, { cerrarSesiones: true }, "Sesiones de Claude cerradas.")} className="text-xs font-bold" style={{ ...boton, color: "var(--nar)" }}>
                Cerrar sesiones de Claude
              </button>
              <button onClick={() => cambiar(u.usuario, { activo: !u.activo })} className="text-xs font-bold" style={{ ...boton, color: "var(--dark)" }}>
                {u.activo ? "Desactivar" : "Activar"}
              </button>
            </span>,
          ]}
          empty="Todavía no hay usuarios."
        />
      )}

      <h2 className="font-display text-lg font-black mt-8 mb-2">Bitácora</h2>
      <SubTable
        rows={bitacora}
        cols={["Cuándo", "Quién", "Por", "Qué", "Detalle"]}
        render={(b) => [
          <span key="f" className="text-xs">{fmtDate(b.created_at)}</span>,
          b.usuario ?? "—",
          b.via === "mcp" ? "Claude" : b.via,
          <b key="a">{b.accion.replace(/_/g, " ")}</b>,
          <span key="d" className="text-[11px] font-mono text-gray-500 break-all">{b.detalle ? JSON.stringify(b.detalle) : ""}</span>,
        ]}
        empty="Sin movimientos todavía."
      />
    </>
  );
}
