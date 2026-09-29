-- 0004_quien_abrio: quién abrió qué vacante, solo para el equipo (ficha
-- interna, PRD F3). Nunca se usa en reportes para empresas.

-- Personas con pasaporte que abrieron una vacante.
create function public.quien_abrio(p_vacante text)
returns table (
  slug text, nombre text, whatsapp text, estado text, areas text[], rango_edad text,
  clicks bigint, canales text[], primer_click timestamptz, ultimo_click timestamptz
)
language sql stable security definer set search_path = public
as $$
  select p.slug, p.nombre, p.whatsapp, p.estado, p.areas, p.rango_edad,
         count(*), array_remove(array_agg(distinct c.canal), null),
         min(c.created_at), max(c.created_at)
  from vacante_clicks c
  join pasaportes p on p.slug = c.pasaporte_slug
  where c.vacante_id = p_vacante
  group by p.slug
  order by max(c.created_at) desc;
$$;

-- Vacantes que abrió una persona.
create function public.vacantes_de_joven(p_slug text)
returns table (
  vacante_id text, titulo text, empresa text, clicks bigint, canales text[],
  primer_click timestamptz, ultimo_click timestamptz
)
language sql stable security definer set search_path = public
as $$
  select v.id, v.titulo, v.empresa, count(*), array_remove(array_agg(distinct c.canal), null),
         min(c.created_at), max(c.created_at)
  from vacante_clicks c
  join vacantes v on v.id = c.vacante_id
  where c.pasaporte_slug = p_slug
  group by v.id
  order by max(c.created_at) desc;
$$;

revoke execute on function public.quien_abrio(text) from public;
revoke execute on function public.vacantes_de_joven(text) from public;
grant execute on function public.quien_abrio(text) to service_role;
grant execute on function public.vacantes_de_joven(text) to service_role;
