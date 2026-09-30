import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { svcInsert, svcSelect, svcUpdate } from "../supabase";
import { ErrorServicio } from "../admin/vacantes";

// Usuarios del equipo para el conector de Claude: Vianey (operación) y Roman
// (admin). La contraseña se guarda con scrypt; nunca en claro.

const scrypt = promisify(scryptCb) as (pass: string, salt: Buffer, len: number, opts: object) => Promise<Buffer>;
const N = 16384;
const R = 8;
const P = 1;
const LARGO = 64;

export type Rol = "admin" | "operacion";

export interface UsuarioEquipo {
  usuario: string;
  nombre: string;
  rol: Rol;
  activo: boolean;
  ultimo_login: string | null;
  created_at: string;
}

export async function hashPassword(pass: string): Promise<string> {
  const salt = randomBytes(16);
  const h = await scrypt(pass, salt, LARGO, { N, r: R, p: P, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${h.toString("base64")}`;
}

async function passwordCoincide(pass: string, guardado: string): Promise<boolean> {
  const [alg, n, r, p, salt, hash] = guardado.split("$");
  if (alg !== "scrypt" || !salt || !hash) return false;
  const esperado = Buffer.from(hash, "base64");
  const h = await scrypt(pass, Buffer.from(salt, "base64"), esperado.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: 64 * 1024 * 1024,
  });
  return h.length === esperado.length && timingSafeEqual(h, esperado);
}

const USUARIO = /^[a-z0-9._-]{2,40}$/;

/** Devuelve el usuario si la contraseña es correcta y está activo. */
export async function verificarUsuario(usuario: string, pass: string): Promise<UsuarioEquipo | null> {
  const u = usuario.trim().toLowerCase();
  if (!USUARIO.test(u) || !pass) return null;
  const [fila] = await svcSelect<UsuarioEquipo & { pass_hash: string }>(
    `equipo?select=usuario,nombre,rol,activo,ultimo_login,created_at,pass_hash&usuario=eq.${u}`
  );
  // Aun sin usuario se calcula un hash, para no revelar cuáles existen por el tiempo.
  const ok = await passwordCoincide(pass, fila?.pass_hash ?? "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAA");
  if (!fila || !ok || !fila.activo) return null;
  await svcUpdate("equipo", `usuario=eq.${u}`, { ultimo_login: new Date().toISOString() }).catch(() => undefined);
  const { pass_hash: _, ...resto } = fila;
  return resto;
}

export async function listarEquipo(): Promise<UsuarioEquipo[]> {
  return svcSelect<UsuarioEquipo>("equipo?select=usuario,nombre,rol,activo,ultimo_login,created_at&order=created_at");
}

function validarPassword(pass: string) {
  if (pass.length < 10) throw new ErrorServicio("La contraseña debe tener al menos 10 caracteres.");
  if (pass.length > 200) throw new ErrorServicio("La contraseña es demasiado larga.");
}

export async function crearUsuario(p: { usuario: string; nombre: string; rol: string; password: string }) {
  const usuario = p.usuario.trim().toLowerCase();
  if (!USUARIO.test(usuario)) throw new ErrorServicio("Usuario: minúsculas, números, punto o guion (2 a 40).");
  const nombre = p.nombre.trim().slice(0, 80);
  if (!nombre) throw new ErrorServicio("Falta el nombre.");
  if (p.rol !== "admin" && p.rol !== "operacion") throw new ErrorServicio("Rol inválido.");
  validarPassword(p.password);
  try {
    await svcInsert("equipo", { usuario, nombre, rol: p.rol, pass_hash: await hashPassword(p.password) });
  } catch (e) {
    if (e instanceof Error && e.message.includes("23505")) throw new ErrorServicio("Ese usuario ya existe.", 409);
    throw e;
  }
}

/** Cambia contraseña, rol o activo. Desactivar o cambiar la contraseña cierra sus sesiones de Claude. */
export async function actualizarUsuario(usuario: string, c: { password?: string; rol?: string; activo?: boolean }) {
  if (!USUARIO.test(usuario)) throw new ErrorServicio("Usuario inválido.");
  const patch: Record<string, unknown> = {};
  if (typeof c.password === "string") {
    validarPassword(c.password);
    patch.pass_hash = await hashPassword(c.password);
  }
  if (c.rol === "admin" || c.rol === "operacion") patch.rol = c.rol;
  if (typeof c.activo === "boolean") patch.activo = c.activo;
  if (!Object.keys(patch).length) throw new ErrorServicio("Nada que cambiar.");
  const filas = await svcUpdate("equipo", `usuario=eq.${usuario}`, patch);
  if (!filas.length) throw new ErrorServicio("No existe ese usuario.", 404);
  if (patch.pass_hash || c.activo === false) await cerrarSesiones(usuario);
}

/** Revoca todos los tokens de Claude de un usuario. */
export async function cerrarSesiones(usuario: string) {
  await svcUpdate("oauth_tokens", `usuario=eq.${usuario}&revocado=is.false`, { revocado: true });
}
