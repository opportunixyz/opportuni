-- 0019_candado_cuenta: el candado de la cuenta de respaldo dejaba pasar
-- llamadas casi simultáneas (7 oct 2026). `cuenta_tomar` también aceptaba
-- "red distinta", y mientras la cuenta se crea `red` sigue vacía: dos clicks
-- seguidos del mismo joven creaban dos o tres cuentas (15 pasaportes, 18
-- cuentas de más en mainnet). Ahora una cuenta en "creando" de menos de 10
-- minutos bloquea siempre; la red distinta solo cuenta si ya había una cuenta
-- lista (por ejemplo, la de testnet al pasar a mainnet).

create or replace function public.cuenta_tomar(p_slug text, p_red text) returns boolean
language sql set search_path = public
as $$
  update pasaportes
     set cuenta_estado = 'creando', cuenta_at = now(), cuenta_error = null
   where slug = p_slug
     and (
       cuenta_estado is null
       or cuenta_estado = 'fallida'
       or (cuenta_estado = 'creando' and cuenta_at < now() - interval '10 minutes')
       or (cuenta_estado in ('lista', 'sin_permiso') and red is distinct from p_red)
     )
  returning true;
$$;

create or replace function public.pasaporte_sin_cuenta(p_token_hash text, p_red text) returns text
language sql stable set search_path = public
as $$
  select p.slug
  from dispositivos d
  join pasaportes p on p.slug = d.pasaporte_slug
  where d.token_hash = p_token_hash
    and (
      p.cuenta_estado is null
      or p.cuenta_estado = 'fallida'
      or (p.cuenta_estado = 'creando' and p.cuenta_at < now() - interval '10 minutes')
      or (p.cuenta_estado in ('lista', 'sin_permiso') and p.red is distinct from p_red)
    );
$$;
