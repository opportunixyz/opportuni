-- 0014_grupos: links por grupo de WhatsApp (autorizado por Vianey el 29 sep).
-- Cada vacante tiene un link por grupo: opportuni.xyz/v/{vacante}/{grupo}.
-- La puerta ya guarda el grupo en vacante_clicks.canal desde la fase 1; aquí
-- vive la lista de grupos y las cifras por grupo para medir su impacto.

create table public.grupos (
  slug text primary key check (slug ~ '^[a-z0-9][a-z0-9-]{0,39}$'),
  nombre text not null check (length(nombre) between 1 and 80),
  orden int not null default 0,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.grupos enable row level security;
grant select, insert, update, delete on public.grupos to service_role;

-- Cifras por grupo, de todas las vacantes o de una (p_vacante):
-- - clicks, personas (pasaportes distintos) y vacantes abiertas por ese link;
-- - nuevos: pasaportes cuyo primer click llegó por ese grupo, o sea la gente
--   que el grupo trajo a Opportuni.
-- Incluye "sin grupo" (canal vacío = link general) y canales que no están en
-- la lista (links escritos a mano).
create function public.grupos_stats(p_vacante text default null)
returns table (
  canal text, nombre text, en_lista boolean, activo boolean, orden int,
  clicks bigint, personas bigint, vacantes bigint, nuevos bigint
)
language sql stable set search_path = public
as $$
  with c as (
    select coalesce(canal, '') as canal, vacante_id, pasaporte_slug
    from vacante_clicks
    where p_vacante is null or vacante_id = p_vacante
  ),
  por_canal as (
    select canal, count(*) as clicks, count(distinct pasaporte_slug) as personas,
           count(distinct vacante_id) as vacantes
    from c group by canal
  ),
  primeros as (
    select distinct on (pasaporte_slug) pasaporte_slug, coalesce(canal, '') as canal, vacante_id
    from vacante_clicks
    where pasaporte_slug is not null
    order by pasaporte_slug, created_at
  ),
  nuevos as (
    select canal, count(*) as n
    from primeros
    where p_vacante is null or vacante_id = p_vacante
    group by canal
  )
  select coalesce(g.slug, pc.canal),
         coalesce(g.nombre, case when pc.canal = '' then 'Sin grupo (link general)' else pc.canal end),
         g.slug is not null,
         coalesce(g.activo, false),
         coalesce(g.orden, case when pc.canal = '' then 100000 else 99999 end),
         coalesce(pc.clicks, 0), coalesce(pc.personas, 0), coalesce(pc.vacantes, 0),
         coalesce((select n.n from nuevos n where n.canal = coalesce(g.slug, pc.canal)), 0)
  from grupos g
  full outer join por_canal pc on pc.canal = g.slug
  order by 5, 2;
$$;

revoke execute on function public.grupos_stats(text) from public;
grant execute on function public.grupos_stats(text) to service_role;
