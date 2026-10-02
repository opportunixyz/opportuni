-- 0018_espana: España en el formulario del pasaporte (1 oct 2026), para medir
-- el impacto de las vacantes de una empresa en España. Agrega la lada +34 y
-- el grupo "España" con sus comunidades autónomas a la pregunta del estado.
-- El país (ES) sale del nombre del grupo en el código. Cambiar las opciones
-- sube la versión del formulario (trigger formulario_nueva_version), y a quien
-- ya tiene pasaporte no se le vuelve a preguntar nada.

update public.formulario_preguntas
   set opciones = opciones || '["+34"]'::jsonb,
       updated_by = 'migracion 0018'
 where clave = 'whatsapp'
   and not opciones @> '["+34"]'::jsonb;

-- España va antes de "Otro" (grupo o texto), si existe.
update public.formulario_preguntas f
   set opciones = case
         when x.antes_de_otro is null then f.opciones || jsonb_build_array(x.espana)
         else jsonb_insert(f.opciones, array[x.antes_de_otro::text], x.espana)
       end,
       updated_by = 'migracion 0018'
  from (
    select p.id,
           jsonb_build_object(
             'grupo', 'España',
             'opciones', jsonb_build_array(
               'Andalucía', 'Aragón', 'Asturias', 'Canarias', 'Cantabria', 'Castilla y León',
               'Castilla-La Mancha', 'Cataluña', 'Ceuta', 'Comunidad Valenciana', 'Extremadura',
               'Galicia', 'Islas Baleares', 'La Rioja', 'Madrid', 'Melilla', 'Murcia', 'Navarra',
               'País Vasco')) as espana,
           (select min(t.ord) - 1
              from jsonb_array_elements(p.opciones) with ordinality as t(o, ord)
             where coalesce(t.o ->> 'grupo', case when jsonb_typeof(t.o) = 'string' then t.o #>> '{}' end)
                   ~* '^otr[ao]s?$') as antes_de_otro
      from public.formulario_preguntas p
     where p.clave = 'estado'
       and not exists (
         select 1 from jsonb_array_elements(p.opciones) o where o ->> 'grupo' = 'España'
       )
  ) x
 where f.id = x.id;
