-- Opportuni Passport: new accounts per day and running total.
select
  day,
  count_if(mode = 'passkey') as passkey,
  count_if(mode = 'backup') as backup,
  count(*) as new_accounts,
  sum(count(*)) over (order by day) as total_accounts
from query_{{cuentas}}
group by day
order by day
