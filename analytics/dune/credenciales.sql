-- Pasaporte Opportuni: credenciales emitidas y revocadas en el contrato de
-- registro. En la cadena solo van el tipo, la fecha y una huella con sal,
-- nunca datos personales. Sin las cuentas de prueba del equipo (ver cuentas.sql).
with pruebas (cuenta) as (
  values 'CASIGOE3QJUVKFKKIG2MJKPTBZHZUHOZY7JEWCKT3W6LWBDX2HMHGTZJ',
         'CDFVBS7B65XV35KCSQUUZJZPXHSPC3UZNR7S6JZXVTESJIU3SXXM3E4J'
),
eventos as (
select
  closed_at,
  date(closed_at) as dia,
  json_extract_scalar(topics_decoded, '$[0].symbol') as evento,
  json_extract_scalar(topics_decoded, '$[1].address') as cuenta,
  coalesce(regexp_extract(data_decoded, '"kind"\}.*?"symbol"\s*:\s*"([^"]+)"', 1), 'n/a') as tipo,
  concat('https://stellar.expert/explorer/public/tx/', lower(to_hex(transaction_hash))) as explorador
from stellar.history_contract_events
where closed_at_date >= date '2026-09-29'
  and contract_id = 'CCYQALCXWORBUAOI2AXRPBRI4JOK2UHYXOZIJZTGKK3MOZAV7LK3CC7P'
  and type_string = 'ContractEventTypeContract'
  and in_successful_contract_call
  and json_extract_scalar(topics_decoded, '$[0].symbol') in ('issued', 'revoked')
)
select * from eventos
where cuenta not in (select cuenta from pruebas)
order by closed_at desc
