-- 0007_cv_verificado: "vacante abierta" ya no va a la cadena (29 sep). Abrir
-- un link prueba poco y sería lo más caro; el click queda en vacante_clicks.
-- En Stellar solo credenciales que valen: por ahora `cv_verificado`, que
-- emite el equipo desde /admin.
-- migrar.sh envuelve este archivo en una transacción.

drop function public.credencial_vacante(text, text, text, text, text);

-- Las únicas credenciales `vacante` son de las pruebas en testnet.
delete from public.credenciales where tipo = 'vacante';
alter table public.credenciales drop constraint credenciales_tipo_check;
alter table public.credenciales add constraint credenciales_tipo_check check (tipo in ('cv_verificado'));

-- La lista de jóvenes suma su cuenta y su último CV verificado en `p_red`.
drop function public.jovenes_lista(text, int);
create function public.jovenes_lista(p_q text default '', p_limit int default 200, p_red text default null)
returns table (
  slug text, nombre text, whatsapp text, estado text, pais text, areas text[],
  rango_edad text, created_at timestamptz, clicks bigint, vacantes bigint,
  dispositivos bigint, sin_confirmar bigint, ultimo_click timestamptz,
  cuenta_modo text, cuenta_estado text, cv_estado text
)
language sql stable set search_path = public
as $$
  select p.slug, p.nombre, p.whatsapp, p.estado, p.pais, p.areas, p.rango_edad, p.created_at,
         (select count(*) from vacante_clicks c where c.pasaporte_slug = p.slug),
         (select count(distinct c.vacante_id) from vacante_clicks c where c.pasaporte_slug = p.slug),
         (select count(*) from dispositivos d where d.pasaporte_slug = p.slug),
         (select count(*) from dispositivos d where d.pasaporte_slug = p.slug and not d.confirmado),
         (select max(c.created_at) from vacante_clicks c where c.pasaporte_slug = p.slug),
         case when p.red = p_red then p.modo end,
         case when p.red = p_red then p.cuenta_estado end,
         (select k.estado from credenciales k
           where k.pasaporte_slug = p.slug and k.tipo = 'cv_verificado' and k.red = p_red
           order by k.id desc limit 1)
  from pasaportes p
  where coalesce(trim(p_q), '') = ''
     or p.nombre ilike '%' || trim(p_q) || '%'
     or p.whatsapp like '%' || regexp_replace(p_q, '[^0-9]', '', 'g') || '%'
        and regexp_replace(p_q, '[^0-9]', '', 'g') <> ''
  order by p.created_at desc
  limit least(greatest(coalesce(p_limit, 200), 1), 1000);
$$;

revoke execute on function public.jovenes_lista(text, int, text) from public;
grant execute on function public.jovenes_lista(text, int, text) to service_role;
