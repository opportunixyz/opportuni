-- 0005_stellar: fase 2 del Pasaporte Opportuni (PRD 8.3, 8.4 y 8.5).
-- Cuenta del pasaporte en Stellar (passkey o respaldo), la regla de
-- Opportuni y las credenciales que se emiten en el contrato de registro.
-- `red` separa testnet de mainnet: una cuenta de pruebas nunca cuenta como
-- la de mainnet.
-- migrar.sh envuelve este archivo en una transacción.

-- ---------------------------------------------------------------------------
-- Cuenta del pasaporte
-- ---------------------------------------------------------------------------

alter table public.pasaportes
  add column red text check (red in ('testnet', 'mainnet')),
  -- Llave pública de la passkey (P-256 sin comprimir, base64url). Sirve para
  -- confirmar "Ya tengo pasaporte" en otro dispositivo.
  add column passkey_pubkey text check (passkey_pubkey ~ '^[A-Za-z0-9_-]{80,100}$'),
  -- Llave pública Ed25519 del signer de respaldo (la secreta va cifrada).
  add column firmante_pub text check (firmante_pub ~ '^[0-9a-f]{64}$'),
  add column regla_id int check (regla_id >= 0),
  add column regla_hasta bigint,
  add column cuenta_estado text check (cuenta_estado in ('creando', 'lista', 'sin_permiso', 'fallida')),
  add column cuenta_error text check (length(cuenta_error) <= 500),
  add column cuenta_at timestamptz,
  add constraint pasaportes_credential_id_check check (credential_id ~ '^[A-Za-z0-9_-]{16,1400}$');

create unique index pasaportes_contract_id_idx on public.pasaportes (contract_id) where contract_id is not null;
create unique index pasaportes_credential_id_idx on public.pasaportes (credential_id) where credential_id is not null;

alter table public.pasaporte_eventos drop constraint pasaporte_eventos_tipo_check;
alter table public.pasaporte_eventos add constraint pasaporte_eventos_tipo_check check (tipo in (
  'puerta_vista', 'pasaporte_creado', 'dispositivo_ligado', 'passkey_ok', 'passkey_error',
  'passkey_cancel', 'respaldo_creado', 'inapp_detectado', 'vista_pasaporte',
  'regla_ok', 'regla_error', 'cuenta_error'
));

-- ---------------------------------------------------------------------------
-- Credenciales (PRD 8.5). En cadena solo va `hash`; `salt` y `ref_id` se
-- quedan aquí para poder comprobarla después.
-- ---------------------------------------------------------------------------

create table public.credenciales (
  id bigint generated always as identity primary key,
  pasaporte_slug text not null references public.pasaportes (slug) on delete cascade,
  tipo text not null check (tipo in ('vacante', 'cv_verificado')),
  -- Vacante (su id) o CV verificado (id del pago o del registro).
  ref_id text not null check (length(ref_id) between 1 and 80),
  red text not null check (red in ('testnet', 'mainnet')),
  salt text not null check (salt ~ '^[0-9a-f]{64}$'),
  hash text not null check (hash ~ '^[0-9a-f]{64}$'),
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'enviando', 'confirmada', 'fallida')),
  intentos int not null default 0,
  tx_hash text check (tx_hash ~ '^[0-9a-f]{64}$'),
  onchain_id bigint,
  error text check (length(error) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Candado: una credencial por joven, tipo y referencia en cada red.
  unique (pasaporte_slug, tipo, ref_id, red)
);
create index credenciales_estado_idx on public.credenciales (estado, updated_at);

alter table public.credenciales enable row level security;
grant select, insert, update, delete on public.credenciales to service_role;
grant usage, select on all sequences in schema public to service_role;

-- ---------------------------------------------------------------------------
-- Funciones (service_role)
-- ---------------------------------------------------------------------------

-- Toma el pasaporte para crearle cuenta de respaldo en `p_red`. Devuelve true
-- si esta llamada ganó el candado (nadie más la está creando).
create function public.cuenta_tomar(p_slug text, p_red text) returns boolean
language sql set search_path = public
as $$
  update pasaportes
     set cuenta_estado = 'creando', cuenta_at = now(), cuenta_error = null
   where slug = p_slug
     and (
       red is distinct from p_red
       or cuenta_estado is null
       or cuenta_estado = 'fallida'
       or (cuenta_estado = 'creando' and cuenta_at < now() - interval '10 minutes')
     )
  returning true;
$$;

-- Encola la credencial `vacante` de un click (PRD 8.5), solo desde un
-- dispositivo confirmado (PRD F1). Devuelve null si no aplica o ya existía;
-- si no, el id y si la cuenta está lista o hay que crearla.
create function public.credencial_vacante(
  p_token_hash text,
  p_vacante_id text,
  p_red text,
  p_salt text,
  p_hash text
) returns jsonb
language plpgsql set search_path = public
as $$
declare
  v_slug text;
  v_red text;
  v_estado text;
  v_id bigint;
begin
  select p.slug, p.red, p.cuenta_estado into v_slug, v_red, v_estado
  from dispositivos d
  join pasaportes p on p.slug = d.pasaporte_slug
  where d.token_hash = p_token_hash and d.confirmado;
  if v_slug is null then
    return null;
  end if;

  insert into credenciales (pasaporte_slug, tipo, ref_id, red, salt, hash)
  values (v_slug, 'vacante', p_vacante_id, p_red, p_salt, p_hash)
  on conflict (pasaporte_slug, tipo, ref_id, red) do nothing
  returning id into v_id;

  return jsonb_build_object(
    'id', v_id,
    'slug', v_slug,
    'cuenta_lista', v_red = p_red and v_estado = 'lista',
    'sin_cuenta', v_red is distinct from p_red or v_estado is null or v_estado = 'fallida'
  );
end $$;

-- Toma una credencial para enviarla. Solo si su cuenta está lista en esa red
-- y nadie más la está enviando.
create function public.credencial_tomar(p_id bigint)
returns table (id bigint, tipo text, hash text, contract_id text, regla_id int)
language sql set search_path = public
as $$
  update credenciales c
     set estado = 'enviando', intentos = c.intentos + 1, updated_at = now(), error = null
    from pasaportes p
   where c.id = p_id
     and p.slug = c.pasaporte_slug
     and (c.estado in ('pendiente', 'fallida')
          or (c.estado = 'enviando' and c.updated_at < now() - interval '5 minutes'))
     and p.red = c.red
     and p.cuenta_estado = 'lista'
     and p.contract_id is not null
     and p.regla_id is not null
  returning c.id, c.tipo, c.hash, p.contract_id, p.regla_id;
$$;

-- Liga un dispositivo como CONFIRMADO tras verificar la passkey (RF20).
create function public.ligar_dispositivo_passkey(
  p_slug text,
  p_token_hash text,
  p_user_agent text,
  p_vacante_id text default null
) returns void
language plpgsql set search_path = public
as $$
begin
  insert into dispositivos (pasaporte_slug, token_hash, confirmado, confirmado_por, user_agent)
  values (p_slug, p_token_hash, true, 'passkey', left(p_user_agent, 400));

  insert into pasaporte_eventos (tipo, slug, vacante_id, user_agent, detalle)
  values ('dispositivo_ligado', p_slug, p_vacante_id, left(p_user_agent, 400),
          jsonb_build_object('confirmado', true, 'por', 'passkey'));
end $$;

-- Pasaporte público /p/{slug} (RF14): nombre y primera letra del apellido y
-- credenciales confirmadas. Nada de WhatsApp, estado, áreas ni empresas.
create function public.pasaporte_publico(p_slug text, p_red text) returns jsonb
language sql stable set search_path = public
as $$
  select jsonb_build_object(
    'slug', p.slug,
    'nombre', trim(split_part(trim(p.nombre), ' ', 1) || ' ' ||
                   coalesce(left(nullif(split_part(trim(p.nombre), ' ', 2), ''), 1) || '.', '')),
    'desde', p.created_at,
    'cuenta', case when p.red = p_red then p.contract_id end,
    'modo', case when p.red = p_red then p.modo end,
    'credenciales', coalesce((
      select jsonb_agg(jsonb_build_object(
               'tipo', c.tipo, 'fecha', c.updated_at, 'tx', c.tx_hash, 'hash', c.hash
             ) order by c.updated_at desc)
      from credenciales c
      where c.pasaporte_slug = p.slug and c.red = p_red and c.estado = 'confirmada'
    ), '[]'::jsonb)
  )
  from pasaportes p
  where p.slug = p_slug;
$$;

revoke execute on function public.cuenta_tomar(text, text) from public;
revoke execute on function public.credencial_vacante(text, text, text, text, text) from public;
revoke execute on function public.credencial_tomar(bigint) from public;
revoke execute on function public.ligar_dispositivo_passkey(text, text, text, text) from public;
revoke execute on function public.pasaporte_publico(text, text) from public;
grant execute on function public.cuenta_tomar(text, text) to service_role;
grant execute on function public.credencial_vacante(text, text, text, text, text) to service_role;
grant execute on function public.credencial_tomar(bigint) to service_role;
grant execute on function public.ligar_dispositivo_passkey(text, text, text, text) to service_role;
grant execute on function public.pasaporte_publico(text, text) to service_role;
