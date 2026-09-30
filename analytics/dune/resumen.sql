-- Pasaporte Opportuni: cifras principales.
with c as (select * from query_{{cuentas}}),
e as (select * from query_{{credenciales}})
select
  count(*) as cuentas,
  count_if(modo = 'passkey') as con_passkey,
  count_if(modo = 'respaldo') as de_respaldo,
  round(cast(count_if(modo = 'passkey') as double) * 100 / nullif(count(*), 0), 1) as pct_passkey,
  (select count_if(evento = 'issued') from e) as credenciales_emitidas,
  (select count_if(evento = 'revoked') from e) as credenciales_revocadas,
  (select count(distinct cuenta) from e where evento = 'issued') as cuentas_con_credencial
from c
