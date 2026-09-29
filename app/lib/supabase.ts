// Mini-cliente server-only para la base propia (PostgREST vía fetch, sin SDK).
// La API es la misma de Supabase (`/rest/v1/`), así que las funciones
// conservan su nombre (PRD 8.1 y 8.10).
//
// Dos llaves, ninguna en el código:
// - `SUPABASE_ANON_KEY` (rol anon): RLS solo deja leer vacantes activas e
//   insertar postulantes. La usan las páginas públicas.
// - `DB_SERVICE_TOKEN` (rol service_role): todo lo del pasaporte (clicks,
//   pasaportes, dispositivos, formulario, eventos) y las RPC de admin. Nunca
//   debe llegar al navegador: solo se lee en server components y API routes.

function baseUrl(): string {
  const url = (process.env.DB_URL ?? process.env.SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
  if (!url) throw new Error("Falta DB_URL (o SUPABASE_URL) en el entorno.");
  return url;
}

function anonKey(): string {
  const key = (process.env.SUPABASE_ANON_KEY ?? "").trim();
  if (!key) throw new Error("Falta SUPABASE_ANON_KEY en el entorno.");
  return key;
}

function serviceKey(): string {
  const key = (process.env.DB_SERVICE_TOKEN ?? "").trim();
  if (!key) throw new Error("Falta DB_SERVICE_TOKEN en el entorno.");
  return key;
}

type Init = Omit<RequestInit, "headers"> & { headers?: Record<string, string>; timeoutMs?: number };

async function request(key: string, path: string, init: Init = {}) {
  const { timeoutMs = 8000, headers, ...rest } = init;
  const res = await fetch(`${baseUrl()}/rest/v1/${path}`, {
    ...rest,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...headers,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`Base ${res.status}: ${await res.text()}`);
  return res;
}

async function parseRpc<T>(res: Response): Promise<T> {
  const text = await res.text();
  // Las funciones `returns void` responden 204 sin cuerpo.
  return (text ? JSON.parse(text) : undefined) as T;
}

// ---- Rol anon (páginas públicas) ----

const sb = (path: string, init?: Init) => request(anonKey(), path, init);

export async function sbSelect<T>(query: string): Promise<T[]> {
  return (await sb(query)).json();
}

export async function sbInsert(table: string, row: Record<string, unknown>): Promise<void> {
  await sb(table, {
    method: "POST",
    body: JSON.stringify(row),
    headers: { Prefer: "return=minimal" },
  });
}

export async function sbRpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  return parseRpc<T>(await sb(`rpc/${fn}`, { method: "POST", body: JSON.stringify(args) }));
}

// ---- Rol service_role (solo servidor: puerta, pasaporte y admin) ----

const svc = (path: string, init?: Init) => request(serviceKey(), path, init);

export async function svcSelect<T>(query: string, timeoutMs?: number): Promise<T[]> {
  return (await svc(query, { timeoutMs })).json();
}

export async function svcInsert<T = unknown>(
  table: string,
  row: Record<string, unknown>,
  opts: { returning?: boolean } = {}
): Promise<T[]> {
  const res = await svc(table, {
    method: "POST",
    body: JSON.stringify(row),
    headers: { Prefer: opts.returning ? "return=representation" : "return=minimal" },
  });
  return opts.returning ? res.json() : [];
}

export async function svcUpdate<T = unknown>(
  table: string,
  filter: string,
  patch: Record<string, unknown>
): Promise<T[]> {
  const res = await svc(`${table}?${filter}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
    headers: { Prefer: "return=representation" },
  });
  return res.json();
}

export async function svcRpc<T>(
  fn: string,
  args: Record<string, unknown> = {},
  timeoutMs?: number
): Promise<T> {
  return parseRpc<T>(await svc(`rpc/${fn}`, { method: "POST", body: JSON.stringify(args), timeoutMs }));
}

// ---- Vacantes ----

export interface VacanteRow {
  id: string;
  titulo: string;
  empresa: string | null;
  url_destino: string | null;
  descripcion: string | null;
  ubicacion: string | null;
  tipo: "remoto" | "presencial" | "hibrido" | null;
  salario: string | null;
  activa: boolean;
  created_at: string;
}

export async function getVacanteById(id: string, timeoutMs?: number): Promise<VacanteRow | null> {
  const rows = (await (await sb(`vacantes?id=eq.${encodeURIComponent(id)}&select=*&limit=1`, { timeoutMs })).json()) as VacanteRow[];
  return rows[0] ?? null;
}

export async function listVacantesActivas(): Promise<VacanteRow[]> {
  return sbSelect<VacanteRow>(`vacantes?activa=eq.true&select=*&order=created_at.desc`);
}
