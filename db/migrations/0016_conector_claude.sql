-- 0016_conector_claude: conector de Claude (PRD 8.9). Vianey (claude.ai) y
-- Roman (Claude Code) entran al servidor MCP de opportuni.xyz con OAuth y su
-- usuario del equipo. Todo lo que escribe queda en admin_audit.
-- Tokens y códigos se guardan solo como sha256.

-- ---------------------------------------------------------------------------
-- Usuarios del equipo
-- ---------------------------------------------------------------------------

create table public.equipo (
  usuario text primary key check (usuario ~ '^[a-z0-9._-]{2,40}$'),
  nombre text not null check (length(nombre) between 1 and 80),
  rol text not null check (rol in ('admin', 'operacion')),
  -- scrypt: "scrypt$N$r$p$salt_b64$hash_b64"
  pass_hash text not null check (pass_hash like 'scrypt$%'),
  activo boolean not null default true,
  ultimo_login timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- OAuth 2.1 mínimo (registro dinámico, PKCE S256, refresh rotado)
-- ---------------------------------------------------------------------------

create table public.oauth_clientes (
  client_id text primary key check (length(client_id) between 16 and 80),
  nombre text check (length(nombre) <= 120),
  redirect_uris text[] not null check (cardinality(redirect_uris) between 1 and 10),
  created_at timestamptz not null default now()
);

create table public.oauth_codigos (
  codigo_hash text primary key check (codigo_hash ~ '^[0-9a-f]{64}$'),
  client_id text not null references public.oauth_clientes (client_id) on delete cascade,
  usuario text not null references public.equipo (usuario) on delete cascade,
  redirect_uri text not null,
  code_challenge text not null check (length(code_challenge) between 43 and 128),
  recurso text,
  expira timestamptz not null,
  usado boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.oauth_tokens (
  token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
  tipo text not null check (tipo in ('acceso', 'refresh')),
  -- Una familia por inicio de sesión: si un refresh ya usado vuelve, se
  -- revoca toda la familia (robo de token).
  familia uuid not null,
  client_id text not null references public.oauth_clientes (client_id) on delete cascade,
  usuario text not null references public.equipo (usuario) on delete cascade,
  recurso text,
  expira timestamptz not null,
  revocado boolean not null default false,
  created_at timestamptz not null default now()
);
create index oauth_tokens_familia_idx on public.oauth_tokens (familia);
create index oauth_tokens_usuario_idx on public.oauth_tokens (usuario);

-- ---------------------------------------------------------------------------
-- Bitácora de escrituras (PRD 8.9)
-- ---------------------------------------------------------------------------

create table public.admin_audit (
  id bigint generated always as identity primary key,
  usuario text,
  rol text,
  via text not null check (via in ('mcp', 'admin', 'api')),
  accion text not null check (length(accion) <= 60),
  detalle jsonb,
  created_at timestamptz not null default now()
);
create index admin_audit_fecha_idx on public.admin_audit (created_at);

alter table public.equipo enable row level security;
alter table public.oauth_clientes enable row level security;
alter table public.oauth_codigos enable row level security;
alter table public.oauth_tokens enable row level security;
alter table public.admin_audit enable row level security;
grant select, insert, update, delete on
  public.equipo, public.oauth_clientes, public.oauth_codigos, public.oauth_tokens, public.admin_audit
  to service_role;
grant usage, select on all sequences in schema public to service_role;

-- ---------------------------------------------------------------------------
-- Funciones atómicas del OAuth
-- ---------------------------------------------------------------------------

-- Canjea un código una sola vez. Devuelve sus datos si era válido.
create function public.oauth_canjear_codigo(p_hash text)
returns table (client_id text, usuario text, redirect_uri text, code_challenge text, recurso text)
language sql set search_path = public
as $$
  update oauth_codigos c
     set usado = true
   where c.codigo_hash = p_hash and not c.usado and c.expira > now()
  returning c.client_id, c.usuario, c.redirect_uri, c.code_challenge, c.recurso;
$$;

-- Usa un refresh token (rotación). Si ya se había usado, revoca toda su
-- familia y no devuelve nada.
create function public.oauth_usar_refresh(p_hash text)
returns table (client_id text, usuario text, recurso text, familia uuid)
language plpgsql set search_path = public
as $$
declare
  t oauth_tokens%rowtype;
begin
  select * into t from oauth_tokens where token_hash = p_hash and tipo = 'refresh' for update;
  if not found or t.expira <= now() then
    return;
  end if;
  if t.revocado then
    update oauth_tokens set revocado = true where familia = t.familia;
    return;
  end if;
  update oauth_tokens set revocado = true where token_hash = p_hash;
  return query select t.client_id, t.usuario, t.recurso, t.familia;
end $$;

-- Valida un token de acceso y devuelve el usuario activo y su rol.
create function public.oauth_validar_acceso(p_hash text)
returns table (usuario text, nombre text, rol text, client_id text, recurso text, expira timestamptz)
language sql stable set search_path = public
as $$
  select e.usuario, e.nombre, e.rol, t.client_id, t.recurso, t.expira
  from oauth_tokens t
  join equipo e on e.usuario = t.usuario
  where t.token_hash = p_hash and t.tipo = 'acceso' and not t.revocado
    and t.expira > now() and e.activo;
$$;

revoke execute on function public.oauth_canjear_codigo(text) from public;
revoke execute on function public.oauth_usar_refresh(text) from public;
revoke execute on function public.oauth_validar_acceso(text) from public;
grant execute on function public.oauth_canjear_codigo(text) to service_role;
grant execute on function public.oauth_usar_refresh(text) to service_role;
grant execute on function public.oauth_validar_acceso(text) to service_role;
