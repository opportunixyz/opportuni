-- 0013_traccion_todos: los pasaportes "sin verificar" (Cloudflare no cargó en
-- su navegador) sí cuentan en la tracción pública (decisión del 29 sep). La
-- marca solo sirve para el tope aparte por hora (0012).
create or replace function public.traccion_publica(p_red text) returns jsonb
language sql stable set search_path = public
as $$
  with cuentas as (
    select contract_id, modo, cuenta_at
    from pasaportes
    where red = p_red and contract_id is not null and cuenta_estado in ('lista', 'sin_permiso')
  )
  select jsonb_build_object(
    'pasaportes', (select count(*) from pasaportes where red is null or red = p_red),
    'vacantes', (select count(*) from vacantes),
    'clicks', (select count(*) from vacante_clicks),
    'cuentas', (select count(*) from cuentas),
    'passkey', (select count(*) from cuentas where modo = 'passkey'),
    'respaldo', (select count(*) from cuentas where modo = 'respaldo'),
    'credenciales', (select count(*) from credenciales where red = p_red and estado = 'confirmada'),
    'por_dia', coalesce((
      select jsonb_agg(jsonb_build_object('dia', dia, 'cuentas', n) order by dia)
      from (select cuenta_at::date as dia, count(*) as n from cuentas group by 1) d
    ), '[]'::jsonb),
    'ultimas', coalesce((
      select jsonb_agg(jsonb_build_object('cuenta', contract_id, 'modo', modo, 'fecha', cuenta_at::date))
      from (select * from cuentas order by cuenta_at desc limit 100) u
    ), '[]'::jsonb)
  );
$$;
