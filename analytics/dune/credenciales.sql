-- Opportuni Passport: credentials issued and revoked in the registry contract.
-- Only the kind, the date and a salted hash go on-chain, never personal data.
-- Team test accounts are excluded (see the accounts query).
with test_accounts (account) as (
  values 'CASIGOE3QJUVKFKKIG2MJKPTBZHZUHOZY7JEWCKT3W6LWBDX2HMHGTZJ',
         'CDFVBS7B65XV35KCSQUUZJZPXHSPC3UZNR7S6JZXVTESJIU3SXXM3E4J'
),
-- Dune trae cada evento del contrato dos veces (mismo tx, mismos datos): se
-- quitan los repetidos con select distinct.
events as (
select distinct
  closed_at,
  date(closed_at) as day,
  json_extract_scalar(topics_decoded, '$[0].symbol') as event,
  json_extract_scalar(topics_decoded, '$[1].address') as account,
  regexp_extract(data_decoded, '"id"\}\s*,\s*"val"\s*:\s*\{\s*"u64"\s*:\s*"(\d+)"', 1) as credential_id,
  coalesce(regexp_extract(data_decoded, '"kind"\}.*?"symbol"\s*:\s*"([^"]+)"', 1), 'n/a') as kind,
  concat('https://stellar.expert/explorer/public/tx/', lower(to_hex(transaction_hash))) as explorer
from stellar.history_contract_events
where closed_at_date >= date '2026-09-29'
  and contract_id = 'CCYQALCXWORBUAOI2AXRPBRI4JOK2UHYXOZIJZTGKK3MOZAV7LK3CC7P'
  and type_string = 'ContractEventTypeContract'
  and in_successful_contract_call
  and json_extract_scalar(topics_decoded, '$[0].symbol') in ('issued', 'revoked')
)
select * from events
where account not in (select account from test_accounts)
order by closed_at desc
