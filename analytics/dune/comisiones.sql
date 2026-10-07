-- Opportuni Passport: on-chain transactions and who paid the fees.
-- OpenZeppelin Channels pays almost all of them; Opportuni pays from its issuer
-- only when Channels fails.
with accounts as (select account from query_{{cuentas}}),
tx as (
  select distinct o.transaction_id, o.closed_at_date
  from stellar.history_operations o
  where o.closed_at_date >= date '2026-09-29'
    and o.type_string = 'invoke_host_function'
    and (o.contract_id in (select account from accounts)
         or o.contract_id = 'CCYQALCXWORBUAOI2AXRPBRI4JOK2UHYXOZIJZTGKK3MOZAV7LK3CC7P')
)
select
  count(*) as transactions,
  round(sum(t.fee_charged) / 1e7, 4) as xlm_fees,
  round(sum(case when coalesce(nullif(t.fee_account, ''), t.account) = 'GCJOMP6DCXSM6SIGGTTVZEQAQLPY5TKCH263F66HRSR5DMBXGOY5C6GX'
                 then t.fee_charged else 0 end) / 1e7, 4) as xlm_paid_by_opportuni,
  round(sum(case when coalesce(nullif(t.fee_account, ''), t.account) <> 'GCJOMP6DCXSM6SIGGTTVZEQAQLPY5TKCH263F66HRSR5DMBXGOY5C6GX'
                 then t.fee_charged else 0 end) / 1e7, 4) as xlm_paid_by_channels
from stellar.history_transactions t
join tx on t.id = tx.transaction_id and t.closed_at_date = tx.closed_at_date
where t.successful
