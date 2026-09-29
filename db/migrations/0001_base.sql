-- 0001_base: las tablas que ya usa la app (vacantes, clicks y postulantes),
-- los roles de PostgREST y las funciones de admin. La base arranca vacía.
-- migrar.sh envuelve este archivo en una transacción.

-- Roles. PostgREST entra como authenticator y cambia al rol que trae el JWT.
do $$
begin
  if not exists (select from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
  if not exists (select from pg_roles where rolname = 'authenticator') then
    create role authenticator login noinherit;
  end if;
end $$;
grant anon, service_role to authenticator;
alter role anon set statement_timeout = '5s';

-- Ninguna función nueva se puede ejecutar sin un grant explícito.
alter default privileges revoke execute on functions from public;

create table public.vacantes (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{1,39}$'),
  titulo text not null check (length(titulo) between 1 and 200),
  empresa text,
  ubicacion text,
  tipo text check (tipo in ('remoto', 'presencial', 'hibrido')),
  salario text,
  descripcion text,
  url_destino text check (url_destino ~* '^https?://'),
  activa boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.vacante_clicks (
  id bigint generated always as identity primary key,
  vacante_id text not null references public.vacantes (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index vacante_clicks_vacante_id_idx on public.vacante_clicks (vacante_id);

-- Cualquiera puede insertar postulantes, así que los textos tienen tope de largo.
create table public.postulantes (
  id bigint generated always as identity primary key,
  vacante_id text not null references public.vacantes (id) on delete cascade,
  nombre text not null check (length(nombre) between 1 and 200),
  carrera_area text not null check (length(carrera_area) between 1 and 200),
  whatsapp text not null check (length(whatsapp) between 1 and 40),
  cv_link text check (length(cv_link) <= 1000),
  created_at timestamptz not null default now()
);
create index postulantes_vacante_id_idx on public.postulantes (vacante_id);

-- La llave pública (anon) solo lee vacantes activas y registra clicks y postulantes.
alter table public.vacantes enable row level security;
alter table public.vacante_clicks enable row level security;
alter table public.postulantes enable row level security;

create policy vacantes_activas on public.vacantes for select to anon using (activa);
create policy registrar_click on public.vacante_clicks for insert to anon with check (true);
create policy registrar_postulante on public.postulantes for insert to anon with check (true);

grant usage on schema public to anon, service_role;
grant select on public.vacantes to anon;
grant insert on public.vacante_clicks, public.postulantes to anon;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- Funciones de admin: solo la llave de servicio. anon no puede leer WhatsApps.
create function public.crear_vacante(
  p_id text,
  p_titulo text,
  p_empresa text default '',
  p_ubicacion text default '',
  p_tipo text default '',
  p_salario text default '',
  p_descripcion text default '',
  p_url_destino text default ''
) returns void
language sql security definer set search_path = public
as $$
  insert into vacantes (id, titulo, empresa, ubicacion, tipo, salario, descripcion, url_destino)
  values (
    lower(trim(p_id)), trim(p_titulo),
    nullif(trim(p_empresa), ''), nullif(trim(p_ubicacion), ''), nullif(trim(p_tipo), ''),
    nullif(trim(p_salario), ''), nullif(trim(p_descripcion), ''), nullif(trim(p_url_destino), '')
  );
$$;

create function public.vacante_stats()
returns table (
  vacante_id text, titulo text, empresa text, activa boolean,
  clicks bigint, postulantes bigint, created_at timestamptz
)
language sql stable security definer set search_path = public
as $$
  select v.id, v.titulo, v.empresa, v.activa,
         (select count(*) from vacante_clicks c where c.vacante_id = v.id),
         (select count(*) from postulantes p where p.vacante_id = v.id),
         v.created_at
  from vacantes v
  order by v.created_at desc;
$$;

create function public.postulantes_por_vacante(vid text)
returns table (nombre text, carrera_area text, whatsapp text, cv_link text, created_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select p.nombre, p.carrera_area, p.whatsapp, p.cv_link, p.created_at
  from postulantes p
  where p.vacante_id = vid
  order by p.created_at desc;
$$;

revoke execute on function public.crear_vacante(text, text, text, text, text, text, text, text) from public;
revoke execute on function public.vacante_stats() from public;
revoke execute on function public.postulantes_por_vacante(text) from public;
grant execute on function public.crear_vacante(text, text, text, text, text, text, text, text) to service_role;
grant execute on function public.vacante_stats() to service_role;
grant execute on function public.postulantes_por_vacante(text) to service_role;
