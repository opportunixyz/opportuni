-- 0002_pasaporte: fase 1 del Pasaporte Opportuni (PRD 5 F1, 7.2, 8.3 y 8.7).
-- El pasaporte vive solo en la base; las columnas de Stellar y de la cuenta
-- de respaldo quedan nullable hasta la fase 2.
-- Todo lo nuevo se escribe con service_role desde API routes de la app:
-- anon no tiene grants sobre ninguna tabla nueva.
-- migrar.sh envuelve este archivo en una transacción.

-- ---------------------------------------------------------------------------
-- Formulario del pasaporte (editable desde /admin)
-- ---------------------------------------------------------------------------

-- Cada cambio a una pregunta toma un número nuevo de esta secuencia. La
-- versión del formulario es la más alta de sus preguntas, y cada pasaporte
-- guarda la que contestó.
create sequence public.formulario_version_seq;

create table public.formulario_preguntas (
  id bigint generated always as identity primary key,
  clave text not null unique check (clave ~ '^[a-z][a-z0-9_]{1,39}$'),
  texto text not null check (length(texto) between 1 and 200),
  explicacion text not null default '' check (length(explicacion) <= 500),
  tipo text not null check (tipo in ('texto', 'telefono', 'lista', 'chips')),
  -- Lista de strings, o de grupos {"grupo": "...", "opciones": [...]}.
  opciones jsonb not null default '[]' check (jsonb_typeof(opciones) = 'array'),
  -- Solo para chips: cuántas se pueden elegir.
  max_seleccion int check (max_seleccion between 1 and 20),
  obligatoria boolean not null default true,
  orden int not null default 0,
  activa boolean not null default true,
  version bigint not null default nextval('public.formulario_version_seq'),
  updated_by text,
  updated_at timestamptz not null default now()
);

create table public.formulario_historial (
  id bigint generated always as identity primary key,
  pregunta_id bigint not null references public.formulario_preguntas (id) on delete cascade,
  version bigint not null,
  datos jsonb not null,
  updated_by text,
  created_at timestamptz not null default now()
);
create index formulario_historial_pregunta_idx on public.formulario_historial (pregunta_id);

create function public.formulario_nueva_version() returns trigger
language plpgsql set search_path = public
as $$
begin
  if (to_jsonb(new) - 'version' - 'updated_at' - 'updated_by')
     is distinct from (to_jsonb(old) - 'version' - 'updated_at' - 'updated_by') then
    new.version := nextval('public.formulario_version_seq');
    new.updated_at := now();
  else
    new.version := old.version;
  end if;
  return new;
end $$;

create function public.formulario_guardar_historial() returns trigger
language plpgsql set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.version <> old.version then
    insert into formulario_historial (pregunta_id, version, datos, updated_by)
    values (new.id, new.version, to_jsonb(new), new.updated_by);
  end if;
  return null;
end $$;

create trigger formulario_nueva_version
  before update on public.formulario_preguntas
  for each row execute function public.formulario_nueva_version();
create trigger formulario_guardar_historial
  after insert or update on public.formulario_preguntas
  for each row execute function public.formulario_guardar_historial();

create function public.formulario_version() returns bigint
language sql stable set search_path = public
as $$
  select coalesce(max(version), 0) from formulario_preguntas;
$$;

-- Las cinco preguntas iniciales (autorizadas por Vianey el 29 sep). Sus claves
-- son columnas fijas de `pasaportes` porque de ellas salen los porcentajes.
insert into public.formulario_preguntas (clave, texto, explicacion, tipo, opciones, max_seleccion, orden, updated_by) values
(
  'nombre', 'Tu nombre',
  'Así te saludamos y así aparece en tu pasaporte.',
  'texto', '[]', null, 10, 'migracion'
),
(
  'whatsapp', 'Tu WhatsApp',
  'Es tu llave: si cambias de teléfono, con él te reconocemos. Nunca se lo damos a una empresa.',
  'telefono', '["+52", "+57"]', null, 20, 'migracion'
),
(
  'estado', 'Tu estado',
  'Para mandarte vacantes cerca de ti. A las empresas solo les decimos cuánta gente hay por estado, nunca quién.',
  'lista',
  '[
    {"grupo": "México", "opciones": ["Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas", "Chihuahua", "Ciudad de México", "Coahuila", "Colima", "Durango", "Estado de México", "Guanajuato", "Guerrero", "Hidalgo", "Jalisco", "Michoacán", "Morelos", "Nayarit", "Nuevo León", "Oaxaca", "Puebla", "Querétaro", "Quintana Roo", "San Luis Potosí", "Sinaloa", "Sonora", "Tabasco", "Tamaulipas", "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas"]},
    {"grupo": "Colombia", "opciones": ["Amazonas", "Antioquia", "Arauca", "Atlántico", "Bogotá D.C.", "Bolívar", "Boyacá", "Caldas", "Caquetá", "Casanare", "Cauca", "Cesar", "Chocó", "Córdoba", "Cundinamarca", "Guainía", "Guaviare", "Huila", "La Guajira", "Magdalena", "Meta", "Nariño", "Norte de Santander", "Putumayo", "Quindío", "Risaralda", "San Andrés y Providencia", "Santander", "Sucre", "Tolima", "Valle del Cauca", "Vaupés", "Vichada"]},
    {"grupo": "Otro", "opciones": ["Vivo en otro país"]}
  ]',
  null, 30, 'migracion'
),
(
  'areas', 'Tu área de interés',
  'Para que te lleguen vacantes que sí te sirven. Elige hasta 3.',
  'chips',
  '["Ingeniería", "Negocios", "Diseño", "Marketing", "Ciencias", "Tecnología", "Derecho", "Otra"]',
  3, 40, 'migracion'
),
(
  'rango_edad', 'Tu edad',
  'Para saber qué vacantes te tocan. A las empresas solo les decimos porcentajes por rango.',
  'chips', '["18 a 20", "21 a 24", "25 a 29", "30 o más"]', 1, 50, 'migracion'
);

-- ---------------------------------------------------------------------------
-- Pasaportes y dispositivos
-- ---------------------------------------------------------------------------

create table public.pasaportes (
  slug text primary key check (slug ~ '^[a-z0-9]{8}$'),
  nombre text not null check (length(nombre) between 1 and 120),
  whatsapp text not null unique check (whatsapp ~ '^\+[1-9][0-9]{7,14}$'),
  estado text check (length(estado) <= 80),
  pais text check (pais ~ '^[A-Z]{2}$'),
  areas text[] not null default '{}' check (cardinality(areas) <= 20),
  rango_edad text check (length(rango_edad) <= 40),
  respuestas_extra jsonb not null default '{}' check (jsonb_typeof(respuestas_extra) = 'object'),
  form_version bigint not null,
  terminos_version text not null check (length(terminos_version) <= 40),
  terminos_at timestamptz not null default now(),
  -- Fase 2 (Stellar). Nullable hasta que el pasaporte tenga su cuenta.
  modo text check (modo in ('passkey', 'respaldo')),
  contract_id text check (contract_id ~ '^C[A-Z2-7]{55}$'),
  credential_id text,
  clave_cifrada text,
  clave_iv text,
  -- Metadata del alta (sin IP en claro ni ciudad).
  estado_ip text check (length(estado_ip) <= 10),
  plataforma text check (length(plataforma) <= 80),
  created_at timestamptz not null default now()
);

create table public.dispositivos (
  id bigint generated always as identity primary key,
  pasaporte_slug text not null references public.pasaportes (slug) on delete cascade,
  -- sha256 del token de la cookie opp_dev; el token nunca se guarda.
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  confirmado boolean not null default false,
  confirmado_por text check (confirmado_por in ('creacion', 'passkey', 'codigo_wa')),
  user_agent text check (length(user_agent) <= 400),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  check (confirmado = (confirmado_por is not null))
);
create index dispositivos_pasaporte_idx on public.dispositivos (pasaporte_slug);

-- ---------------------------------------------------------------------------
-- Clicks con pasaporte, canal y la metadata permitida (tabla de F1)
-- ---------------------------------------------------------------------------

alter table public.vacantes add column creada_por text check (length(creada_por) <= 80);

alter table public.vacante_clicks
  add column pasaporte_slug text references public.pasaportes (slug) on delete set null,
  add column dispositivo_id bigint references public.dispositivos (id) on delete set null,
  add column canal text check (canal ~ '^[a-z0-9][a-z0-9-]{0,39}$'),
  add column estado_ip text check (length(estado_ip) <= 10),
  add column pais_ip text check (pais_ip ~ '^[A-Z]{2}$'),
  add column ip_hash text check (ip_hash ~ '^[0-9a-f]{64}$'),
  add column dispositivo_tipo text check (dispositivo_tipo in ('movil', 'tablet', 'escritorio')),
  add column sistema text check (length(sistema) <= 40),
  add column navegador text check (length(navegador) <= 40),
  add column idioma text check (length(idioma) <= 20),
  add column inapp boolean not null default false,
  add column repetido boolean not null default false;
create index vacante_clicks_pasaporte_idx on public.vacante_clicks (pasaporte_slug, vacante_id);

-- Los clicks ahora los escribe la app con service_role; anon ya no inserta.
drop policy registrar_click on public.vacante_clicks;
revoke insert on public.vacante_clicks from anon;

-- ---------------------------------------------------------------------------
-- Eventos del pasaporte (métricas, PRD 9)
-- ---------------------------------------------------------------------------

create table public.pasaporte_eventos (
  id bigint generated always as identity primary key,
  tipo text not null check (tipo in (
    'puerta_vista', 'pasaporte_creado', 'dispositivo_ligado', 'passkey_ok', 'passkey_error',
    'passkey_cancel', 'respaldo_creado', 'inapp_detectado', 'vista_pasaporte'
  )),
  slug text references public.pasaportes (slug) on delete cascade,
  vacante_id text references public.vacantes (id) on delete set null,
  user_agent text check (length(user_agent) <= 400),
  src text check (length(src) <= 40),
  detalle jsonb,
  created_at timestamptz not null default now()
);
create index pasaporte_eventos_tipo_idx on public.pasaporte_eventos (tipo, created_at);

-- ---------------------------------------------------------------------------
-- Acceso: solo service_role. RLS prendido y sin políticas para anon.
-- ---------------------------------------------------------------------------

alter table public.formulario_preguntas enable row level security;
alter table public.formulario_historial enable row level security;
alter table public.pasaportes enable row level security;
alter table public.dispositivos enable row level security;
alter table public.pasaporte_eventos enable row level security;

grant select, insert, update, delete on
  public.formulario_preguntas, public.formulario_historial, public.pasaportes,
  public.dispositivos, public.pasaporte_eventos
  to service_role;
grant usage, select on all sequences in schema public to service_role;

-- ---------------------------------------------------------------------------
-- Funciones de la puerta (service_role)
-- ---------------------------------------------------------------------------

-- Crea el pasaporte y su primer dispositivo (confirmado) en una transacción.
-- Si el WhatsApp ya tiene pasaporte no crea nada y responde creado = false:
-- la puerta pasa a "Ya tengo pasaporte" (RF9).
create function public.crear_pasaporte(
  p_slug text,
  p_nombre text,
  p_whatsapp text,
  p_estado text,
  p_pais text,
  p_areas text[],
  p_rango_edad text,
  p_respuestas_extra jsonb,
  p_form_version bigint,
  p_terminos_version text,
  p_estado_ip text,
  p_plataforma text,
  p_token_hash text,
  p_user_agent text,
  p_vacante_id text default null
) returns jsonb
language plpgsql set search_path = public
as $$
declare
  v_slug text;
begin
  insert into pasaportes (
    slug, nombre, whatsapp, estado, pais, areas, rango_edad, respuestas_extra,
    form_version, terminos_version, estado_ip, plataforma
  ) values (
    p_slug, trim(p_nombre), p_whatsapp, nullif(p_estado, ''), nullif(p_pais, ''),
    coalesce(p_areas, '{}'), nullif(p_rango_edad, ''), coalesce(p_respuestas_extra, '{}'),
    p_form_version, p_terminos_version, nullif(p_estado_ip, ''), left(nullif(p_plataforma, ''), 80)
  )
  on conflict (whatsapp) do nothing
  returning slug into v_slug;

  if v_slug is null then
    return jsonb_build_object('creado', false);
  end if;

  insert into dispositivos (pasaporte_slug, token_hash, confirmado, confirmado_por, user_agent)
  values (v_slug, p_token_hash, true, 'creacion', left(p_user_agent, 400));

  insert into pasaporte_eventos (tipo, slug, vacante_id, user_agent)
  values ('pasaporte_creado', v_slug, p_vacante_id, left(p_user_agent, 400));

  return jsonb_build_object('creado', true, 'slug', v_slug);
end $$;

-- "Ya tengo pasaporte" con solo el WhatsApp: liga el dispositivo sin
-- confirmar (suma clicks, no emite en Stellar ni abre el detalle privado).
-- Devuelve el slug, o null si ese WhatsApp no tiene pasaporte.
create function public.ligar_dispositivo(
  p_whatsapp text,
  p_token_hash text,
  p_user_agent text,
  p_vacante_id text default null
) returns text
language plpgsql set search_path = public
as $$
declare
  v_slug text;
begin
  select slug into v_slug from pasaportes where whatsapp = p_whatsapp;
  if v_slug is null then
    return null;
  end if;

  insert into dispositivos (pasaporte_slug, token_hash, confirmado, user_agent)
  values (v_slug, p_token_hash, false, left(p_user_agent, 400));

  insert into pasaporte_eventos (tipo, slug, vacante_id, user_agent, detalle)
  values ('dispositivo_ligado', v_slug, p_vacante_id, left(p_user_agent, 400),
          jsonb_build_object('confirmado', false, 'por', 'whatsapp'));

  return v_slug;
end $$;

-- Registra un click a partir del hash del token del dispositivo. Si el
-- dispositivo ya no existe (pasaporte borrado), el click queda sin pasaporte.
create function public.registrar_click(
  p_token_hash text,
  p_vacante_id text,
  p_canal text default null,
  p_estado_ip text default null,
  p_pais_ip text default null,
  p_ip_hash text default null,
  p_dispositivo_tipo text default null,
  p_sistema text default null,
  p_navegador text default null,
  p_idioma text default null,
  p_inapp boolean default false
) returns void
language plpgsql set search_path = public
as $$
declare
  v_disp bigint;
  v_slug text;
begin
  update dispositivos set last_seen_at = now()
  where token_hash = p_token_hash
  returning id, pasaporte_slug into v_disp, v_slug;

  insert into vacante_clicks (
    vacante_id, pasaporte_slug, dispositivo_id, canal, estado_ip, pais_ip, ip_hash,
    dispositivo_tipo, sistema, navegador, idioma, inapp, repetido
  ) values (
    p_vacante_id, v_slug, v_disp, nullif(p_canal, ''), nullif(p_estado_ip, ''),
    nullif(p_pais_ip, ''), nullif(p_ip_hash, ''), nullif(p_dispositivo_tipo, ''),
    left(nullif(p_sistema, ''), 40), left(nullif(p_navegador, ''), 40),
    left(nullif(p_idioma, ''), 20), coalesce(p_inapp, false),
    v_slug is not null and exists (
      select 1 from vacante_clicks c where c.pasaporte_slug = v_slug and c.vacante_id = p_vacante_id
    )
  );
end $$;

-- ---------------------------------------------------------------------------
-- Funciones de admin (service_role)
-- ---------------------------------------------------------------------------

-- vacante_stats suma personas únicas (pasaportes distintos).
drop function public.vacante_stats();
create function public.vacante_stats()
returns table (
  vacante_id text, titulo text, empresa text, url_destino text, activa boolean,
  clicks bigint, personas bigint, postulantes bigint, created_at timestamptz
)
language sql stable security definer set search_path = public
as $$
  select v.id, v.titulo, v.empresa, v.url_destino, v.activa,
         (select count(*) from vacante_clicks c where c.vacante_id = v.id),
         (select count(distinct c.pasaporte_slug) from vacante_clicks c where c.vacante_id = v.id),
         (select count(*) from postulantes p where p.vacante_id = v.id),
         v.created_at
  from vacantes v
  order by v.created_at desc;
$$;

-- Lista de jóvenes para /admin › Jóvenes (solo equipo). Busca por nombre o
-- WhatsApp.
create function public.jovenes_lista(p_q text default '', p_limit int default 200)
returns table (
  slug text, nombre text, whatsapp text, estado text, pais text, areas text[],
  rango_edad text, created_at timestamptz, clicks bigint, vacantes bigint,
  dispositivos bigint, sin_confirmar bigint, ultimo_click timestamptz
)
language sql stable set search_path = public
as $$
  select p.slug, p.nombre, p.whatsapp, p.estado, p.pais, p.areas, p.rango_edad, p.created_at,
         (select count(*) from vacante_clicks c where c.pasaporte_slug = p.slug),
         (select count(distinct c.vacante_id) from vacante_clicks c where c.pasaporte_slug = p.slug),
         (select count(*) from dispositivos d where d.pasaporte_slug = p.slug),
         (select count(*) from dispositivos d where d.pasaporte_slug = p.slug and not d.confirmado),
         (select max(c.created_at) from vacante_clicks c where c.pasaporte_slug = p.slug)
  from pasaportes p
  where coalesce(trim(p_q), '') = ''
     or p.nombre ilike '%' || trim(p_q) || '%'
     or p.whatsapp like '%' || regexp_replace(p_q, '[^0-9]', '', 'g') || '%'
        and regexp_replace(p_q, '[^0-9]', '', 'g') <> ''
  order by p.created_at desc
  limit least(greatest(coalesce(p_limit, 200), 1), 1000);
$$;

revoke execute on function public.formulario_version() from public;
revoke execute on function public.crear_pasaporte(text, text, text, text, text, text[], text, jsonb, bigint, text, text, text, text, text, text) from public;
revoke execute on function public.ligar_dispositivo(text, text, text, text) from public;
revoke execute on function public.registrar_click(text, text, text, text, text, text, text, text, text, text, boolean) from public;
revoke execute on function public.vacante_stats() from public;
revoke execute on function public.jovenes_lista(text, int) from public;
grant execute on function public.formulario_version() to service_role;
grant execute on function public.crear_pasaporte(text, text, text, text, text, text[], text, jsonb, bigint, text, text, text, text, text, text) to service_role;
grant execute on function public.ligar_dispositivo(text, text, text, text) to service_role;
grant execute on function public.registrar_click(text, text, text, text, text, text, text, text, text, text, boolean) to service_role;
grant execute on function public.vacante_stats() to service_role;
grant execute on function public.jovenes_lista(text, int) to service_role;
