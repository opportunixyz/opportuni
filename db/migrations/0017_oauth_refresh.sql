-- 0017_oauth_refresh: en oauth_usar_refresh, `familia` era ambigua (columna
-- de la tabla y de salida) y el reuso de un refresh daba error en vez de
-- revocar la sesión. Columnas con alias.
create or replace function public.oauth_usar_refresh(p_hash text)
returns table (client_id text, usuario text, recurso text, familia uuid)
language plpgsql set search_path = public
as $$
#variable_conflict use_column
declare
  t oauth_tokens%rowtype;
begin
  select o.* into t from oauth_tokens o where o.token_hash = p_hash and o.tipo = 'refresh' for update;
  if not found or t.expira <= now() then
    return;
  end if;
  if t.revocado then
    update oauth_tokens o set revocado = true where o.familia = t.familia;
    return;
  end if;
  update oauth_tokens o set revocado = true where o.token_hash = p_hash;
  return query select t.client_id, t.usuario, t.recurso, t.familia;
end $$;
