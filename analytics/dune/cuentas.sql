-- Pasaporte Opportuni: cuentas en Stellar mainnet.
-- Cada pasaporte recibe la regla "Opportuni" (add_context_rule) con el emisor de
-- Opportuni como signer delegado. Así se distinguen de otras apps que usan el
-- mismo smart-account-kit. Las de respaldo las despliega el emisor; las de
-- passkey, el deployer del kit.
with ops as (
  select o.closed_at, o.contract_id, o.soroban_operation_type, o.address,
         json_format(cast(o.parameters_decoded as json)) as params,
         o.transaction_id, o.closed_at_date
  from stellar.history_operations o
  where o.closed_at_date >= date '2026-09-29'
    and o.type_string = 'invoke_host_function'
    and o.soroban_operation_type in ('invoke_contract', 'create_contract_v2')
),
exitosas as (
  select ops.*
  from ops
  join stellar.history_transactions t
    on t.id = ops.transaction_id and t.closed_at_date = ops.closed_at_date and t.successful
),
reglas as (
  select contract_id as cuenta, min(closed_at) as creada
  from exitosas
  where soroban_operation_type = 'invoke_contract'
    and params like '%"add_context_rule"%'
    and params like '%Delegated GCJOMP6DCXSM6SIGGTTVZEQAQLPY5TKCH263F66HRSR5DMBXGOY5C6GX%'
  group by 1
),
-- Cuentas de prueba del equipo, borradas de la base: no son jóvenes.
pruebas (cuenta) as (
  values 'CASIGOE3QJUVKFKKIG2MJKPTBZHZUHOZY7JEWCKT3W6LWBDX2HMHGTZJ',
         'CDFVBS7B65XV35KCSQUUZJZPXHSPC3UZNR7S6JZXVTESJIU3SXXM3E4J'
),
respaldo as (
  select distinct contract_id as cuenta
  from exitosas
  where soroban_operation_type = 'create_contract_v2'
    and address = 'GCJOMP6DCXSM6SIGGTTVZEQAQLPY5TKCH263F66HRSR5DMBXGOY5C6GX'
)
select
  r.cuenta,
  r.creada,
  date(r.creada) as dia,
  case when s.cuenta is null then 'passkey' else 'respaldo' end as modo,
  concat('https://stellar.expert/explorer/public/contract/', r.cuenta) as explorador
from reglas r
left join respaldo s on s.cuenta = r.cuenta
where r.cuenta not in (select cuenta from pruebas)
order by r.creada desc
