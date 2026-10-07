-- Opportuni Passport: credentials per week and kind.
select
  date_trunc('week', closed_at) as week,
  kind,
  count_if(event = 'issued') as issued,
  count_if(event = 'revoked') as revoked
from query_{{credenciales}}
group by 1, 2
order by 1
