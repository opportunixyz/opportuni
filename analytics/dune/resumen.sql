-- Opportuni Passport: key numbers.
with a as (select * from query_{{cuentas}}),
c as (select * from query_{{credenciales}})
select
  count(*) as accounts,
  count_if(mode = 'passkey') as passkey_accounts,
  count_if(mode = 'backup') as backup_accounts,
  round(cast(count_if(mode = 'passkey') as double) * 100 / nullif(count(*), 0), 1) as passkey_pct,
  (select count_if(event = 'issued') from c) as credentials_issued,
  (select count_if(event = 'revoked') from c) as credentials_revoked,
  (select count(distinct account) from c where event = 'issued') as accounts_with_credentials
from a
