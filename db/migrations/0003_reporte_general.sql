-- 0003_reporte_general: datos del reporte PDF para empresas (PRD F3).
-- Solo conteos y porcentajes. Un grupo de menos de 5 personas se junta en
-- "Otros", y con menos de 5 personas en total no se reparte nada. La regla
-- vive aquí para que ni la API ni un conector puedan saltársela.

-- Reparto de etiquetas (una por persona, o varias si son áreas) sobre una base.
create function public.reporte_reparto(p_etiquetas text[], p_base bigint)
returns jsonb
language sql immutable set search_path = public
as $$
  with conteo as (
    select coalesce(nullif(trim(e), ''), 'Sin dato') as etiqueta, count(*) as n
    from unnest(p_etiquetas) as e
    group by 1
  ), agrupado as (
    select case when n < 5 then 'Otros' else etiqueta end as etiqueta, sum(n) as n
    from conteo
    group by 1
  )
  select case
    when p_base < 5 then '[]'::jsonb
    else coalesce(jsonb_agg(
      jsonb_build_object('etiqueta', etiqueta, 'personas', n, 'pct', round(100.0 * n / p_base, 1))
      order by (etiqueta = 'Otros'), n desc
    ), '[]'::jsonb)
  end
  from agrupado;
$$;

-- Sin empresa: toda la comunidad (todos los pasaportes). Con empresa: las
-- personas que abrieron alguna de sus vacantes, más la lista de esas vacantes.
create function public.reporte_general(p_empresa text default null)
returns jsonb
language plpgsql stable security definer set search_path = public
as $$
declare
  v_emp text := nullif(lower(trim(p_empresa)), '');
  v_pob text[];
  v_base bigint;
begin
  if v_emp is null then
    select coalesce(array_agg(slug), '{}') into v_pob from pasaportes;
  else
    select coalesce(array_agg(distinct c.pasaporte_slug), '{}') into v_pob
    from vacante_clicks c
    join vacantes v on v.id = c.vacante_id
    where lower(trim(v.empresa)) = v_emp and c.pasaporte_slug is not null;
  end if;
  v_base := cardinality(v_pob);

  return jsonb_build_object(
    'alcance', case when v_emp is null then 'comunidad' else 'empresa' end,
    'empresa', (select v.empresa from vacantes v where lower(trim(v.empresa)) = v_emp limit 1),
    'minimo_grupo', 5,
    'comunidad', jsonb_build_object(
      'pasaportes', (select count(*) from pasaportes),
      'vacantes', (select count(*) from vacantes),
      'clicks', (select count(*) from vacante_clicks),
      'personas_activas', (select count(distinct pasaporte_slug) from vacante_clicks)
    ),
    'personas', v_base,
    'clicks', (
      select count(*) from vacante_clicks c
      join vacantes v on v.id = c.vacante_id
      where v_emp is null or lower(trim(v.empresa)) = v_emp
    ),
    'vacantes', case when v_emp is null then '[]'::jsonb else coalesce((
      select jsonb_agg(jsonb_build_object(
        'titulo', v.titulo,
        'activa', v.activa,
        'clicks', (select count(*) from vacante_clicks c where c.vacante_id = v.id),
        'personas', (select count(distinct c.pasaporte_slug) from vacante_clicks c where c.vacante_id = v.id)
      ) order by v.created_at desc)
      from vacantes v
      where lower(trim(v.empresa)) = v_emp
    ), '[]'::jsonb) end,
    'por_estado', reporte_reparto(array(select p.estado from pasaportes p where p.slug = any (v_pob)), v_base),
    'por_edad', reporte_reparto(array(select p.rango_edad from pasaportes p where p.slug = any (v_pob)), v_base),
    'por_area', reporte_reparto(array(
      select a from pasaportes p, unnest(p.areas) as a where p.slug = any (v_pob)
    ), v_base)
  );
end $$;

revoke execute on function public.reporte_reparto(text[], bigint) from public;
revoke execute on function public.reporte_general(text) from public;
grant execute on function public.reporte_general(text) to service_role;
