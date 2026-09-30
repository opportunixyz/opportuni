-- 0015_grupos_comunidad: cada grupo pertenece a una comunidad de WhatsApp
-- (Opportuni MX, MX 2.0 … MX 5.0, COL) para verlos y copiarlos agrupados:
-- con los subgrupos por área son ~50 links.

alter table public.grupos add column comunidad text check (length(comunidad) <= 80);

drop function public.grupos_stats(text);
create function public.grupos_stats(p_vacante text default null)
returns table (
  canal text, nombre text, comunidad text, en_lista boolean, activo boolean, orden int,
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
         g.comunidad,
         g.slug is not null,
         coalesce(g.activo, false),
         coalesce(g.orden, case when pc.canal = '' then 100000 else 99999 end),
         coalesce(pc.clicks, 0), coalesce(pc.personas, 0), coalesce(pc.vacantes, 0),
         coalesce((select n.n from nuevos n where n.canal = coalesce(g.slug, pc.canal)), 0)
  from grupos g
  full outer join por_canal pc on pc.canal = g.slug
  order by 6, 2;
$$;

revoke execute on function public.grupos_stats(text) from public;
grant execute on function public.grupos_stats(text) to service_role;
