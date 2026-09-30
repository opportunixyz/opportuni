-- 0012_sin_verificar: si Cloudflare Turnstile no carga en el navegador de un
-- joven (bloqueador muy agresivo, red que lo bloquea), igual crea su pasaporte
-- y su wallet, pero queda marcado y con un tope aparte y chico por hora: el
-- servidor no distingue a un joven con bloqueador de un bot que dice que no le
-- cargó. Los pasaportes sin verificar no cuentan en la tracción pública.

alter table public.pasaportes add column verificado boolean not null default true;

-- true si en la última hora se crearon menos de `p_max` pasaportes sin verificar.
create function public.cupo_sin_verificar(p_max int) returns boolean
language sql stable set search_path = public
as $$
  select count(*) < p_max from pasaportes where not verificado and created_at > now() - interval '1 hour';
$$;

create or replace function public.traccion_publica(p_red text) returns jsonb
language sql stable set search_path = public
as $$
  with cuentas as (
    select contract_id, modo, cuenta_at
    from pasaportes
    where red = p_red and verificado and contract_id is not null and cuenta_estado in ('lista', 'sin_permiso')
  )
  select jsonb_build_object(
    'pasaportes', (select count(*) from pasaportes where verificado and (red is null or red = p_red)),
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

revoke execute on function public.cupo_sin_verificar(int) from public;
grant execute on function public.cupo_sin_verificar(int) to service_role;
