-- Opportuni Passport: accounts on Stellar mainnet.
-- Every passport gets the "Opportuni" context rule (add_context_rule) with the
-- Opportuni issuer as a delegated signer. That tells them apart from other apps
-- that use the same smart-account-kit. Backup accounts are deployed by the
-- issuer; passkey accounts by the kit's deployer.
with ops as (
  select o.closed_at, o.contract_id, o.soroban_operation_type, o.address,
         json_format(cast(o.parameters_decoded as json)) as params,
         o.transaction_id, o.closed_at_date
  from stellar.history_operations o
  where o.closed_at_date >= date '2026-09-29'
    and o.type_string = 'invoke_host_function'
    and o.soroban_operation_type in ('invoke_contract', 'create_contract_v2')
),
successful as (
  select ops.*
  from ops
  join stellar.history_transactions t
    on t.id = ops.transaction_id and t.closed_at_date = ops.closed_at_date and t.successful
),
rules as (
  select contract_id as account, min(closed_at) as created_at
  from successful
  where soroban_operation_type = 'invoke_contract'
    and params like '%"add_context_rule"%'
    and params like '%Delegated GCJOMP6DCXSM6SIGGTTVZEQAQLPY5TKCH263F66HRSR5DMBXGOY5C6GX%'
  group by 1
),
-- Team test accounts, deleted from our database: not real users.
test_accounts (account) as (
  values 'CASIGOE3QJUVKFKKIG2MJKPTBZHZUHOZY7JEWCKT3W6LWBDX2HMHGTZJ',
         'CDFVBS7B65XV35KCSQUUZJZPXHSPC3UZNR7S6JZXVTESJIU3SXXM3E4J'
),
backup as (
  select distinct contract_id as account
  from successful
  where soroban_operation_type = 'create_contract_v2'
    and address = 'GCJOMP6DCXSM6SIGGTTVZEQAQLPY5TKCH263F66HRSR5DMBXGOY5C6GX'
)
select
  r.account,
  r.created_at,
  date(r.created_at) as day,
  case when b.account is null then 'passkey' else 'backup' end as mode,
  concat('https://stellar.expert/explorer/public/contract/', r.account) as explorer
from rules r
left join backup b on b.account = r.account
where r.account not in (select account from test_accounts)
order by r.created_at desc
