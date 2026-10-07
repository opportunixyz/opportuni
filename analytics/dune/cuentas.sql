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
-- Not counted as people:
-- - Team test accounts, deleted from our database.
-- - Duplicate backup accounts: until 7 Oct 2026 a lock bug could give one
--   passport 2 or 3 accounts when clicks arrived seconds apart. Only the one
--   saved in our database counts.
test_accounts (account) as (
  values 'CASIGOE3QJUVKFKKIG2MJKPTBZHZUHOZY7JEWCKT3W6LWBDX2HMHGTZJ',
         'CDFVBS7B65XV35KCSQUUZJZPXHSPC3UZNR7S6JZXVTESJIU3SXXM3E4J',
         'CA5JYSM3EGGPNGUUOEII4RMZ3L2U62IR23XHYDQY2PFF6UNIBMKJ2NBV',
         'CA7TKXLZUM5G4H3QQ3SBIVBWCQ7R4MCC3GSEAPM6ZKVU5QAPZLRIEP4T',
         'CACKH37P5RK5KPTT5IKHE5RNNSJJI24GCK3BXR2JA4DARN44N56QNYXS',
         'CAR6FM7PISSHWPUI7FMCNSVKZPHESUMTD4F7E4W3FJFCYQVKWL3P25CS',
         'CAS6UP7CKMR7XY62XP5N46KD5XLJO2AOVOHTJNHEUW5MPDHB6WLLLD7J',
         'CAWUJGEMOOBLBE2VKJAKEP3SRQOXZU3T7LHGL3RMOCCFCHTC6EK3JYT4',
         'CBBAKW3SUAE7RAXNCAE7BMBPWFJ46FZJVONP7X6LMLJOPGJLDT66VACR',
         'CBD3A6DP3UX5RS2STPOPGXIXTYNIZLYDYJKPRUSNLFV5UN3VJKPTFFKB',
         'CC3WKRSEP3S2Y3NDGV23YB2OBFMQSHYVNNDAD5CRISDD7BUVD37URGKV',
         'CCEXU76SK6HYXVP5X3QGCIIOGKIXNUSPOABZ57IYF5BFQP542S3WMOFJ',
         'CCMIMH77NQCVQAN3XCACM653CF3RHG6AI7BDRQGFJLFOHWJW56NJFIWU',
         'CCP3RTYMLG62E5BXPBO2HTUS73NQZCXVYD4FKGLKNXWOCUMT22NLTL6I',
         'CCPJX6HKJYTG2UTQCWULXRTAD5SLZECC2V5DJAP7TR4N2HJ7V6SLYZB4',
         'CCY747Q5J7SHILE5HSVSXD7UROS2ZGO7J5YHAKLX6W27KS5K3ZWNYX43',
         'CDA4Q5RT46GGRJXB2WP7GSEXTSUT67P4IAVT7DCEOAI7D5GJPJWLUHSS',
         'CDMIUOCLF6LW3IICHXBVTRAIHTY4ZYAB4NF47YF6AWVODDM3F5S6W5KF',
         'CDN7XJUGCTHLQCUT2XR2DXORIOO2OJQBGTOKMJCFCJCNJSARD7S737F2',
         'CDNYZ7D73MGWDTQLCMCT2GQ6LBZVO5YXTPBPJK2NUK2OAL6IWA72XXQ2',
         'CDOK2NB6CNJLZ6TY4Q575VSDHDWCJAUEGBE7E677GSE3ICGBERGTXHFL',
         'CDSYHNFBNUIBCMGJDYZVIM3RF4L2CWAUJOXE6SBZG6DCKUFICKKBBHFJ'
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
