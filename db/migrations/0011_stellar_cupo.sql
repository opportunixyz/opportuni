-- 0011_stellar_cupo: tope global de envíos a Stellar por hora. Cada
-- transacción que sale por Channels (crear cuenta, permiso, emitir) toma un
-- lugar; si se llena, lo que falte se reintenta después (la cuenta en el
-- siguiente click del joven, las credenciales con "Reintentar"). Así nadie
-- se come el cupo diario de Channels creando pasaportes en masa.

create table public.stellar_envios (
  id bigint generated always as identity primary key,
  tipo text not null check (length(tipo) <= 20),
  created_at timestamptz not null default now()
);
create index stellar_envios_fecha_idx on public.stellar_envios (created_at);

alter table public.stellar_envios enable row level security;
grant select, insert, delete on public.stellar_envios to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Devuelve true y aparta un lugar si en la última hora hubo menos de
-- `p_max_hora` envíos. El candado evita que dos llamadas se pasen del tope.
create function public.stellar_cupo(p_tipo text, p_max_hora int) returns boolean
language plpgsql set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtext('stellar_cupo'));
  if (select count(*) from stellar_envios where created_at > now() - interval '1 hour') >= p_max_hora then
    return false;
  end if;
  insert into stellar_envios (tipo) values (left(p_tipo, 20));
  delete from stellar_envios where created_at < now() - interval '7 days';
  return true;
end $$;

revoke execute on function public.stellar_cupo(text, int) from public;
grant execute on function public.stellar_cupo(text, int) to service_role;
