-- Pasaporte Opportuni: cuentas nuevas por día y acumuladas.
select
  dia,
  count_if(modo = 'passkey') as con_passkey,
  count_if(modo = 'respaldo') as de_respaldo,
  count(*) as nuevas,
  sum(count(*)) over (order by dia) as acumuladas
from query_{{cuentas}}
group by dia
order by dia
