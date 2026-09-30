-- Pasaporte Opportuni: credenciales por semana y tipo.
select
  date_trunc('week', closed_at) as semana,
  tipo,
  count_if(evento = 'issued') as emitidas,
  count_if(evento = 'revoked') as revocadas
from query_{{credenciales}}
group by 1, 2
order by 1
