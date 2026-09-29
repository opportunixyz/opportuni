-- 0009_cuenta_pendiente: todo pasaporte termina con su cuenta en Stellar. Si
-- la creación falló o quedó a medias (o es un pasaporte de la fase 1), su
-- siguiente click le crea la de respaldo. Devuelve el slug si le falta.
create function public.pasaporte_sin_cuenta(p_token_hash text, p_red text) returns text
language sql stable set search_path = public
as $$
  select p.slug
  from dispositivos d
  join pasaportes p on p.slug = d.pasaporte_slug
  where d.token_hash = p_token_hash
    and (
      p.red is distinct from p_red
      or p.cuenta_estado is null
      or p.cuenta_estado = 'fallida'
      or (p.cuenta_estado = 'creando' and p.cuenta_at < now() - interval '10 minutes')
    );
$$;

revoke execute on function public.pasaporte_sin_cuenta(text, text) from public;
grant execute on function public.pasaporte_sin_cuenta(text, text) to service_role;
