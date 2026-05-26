-- Cherolee Core V1 financial ledger balance-effect correction.
--
-- Migration caution:
--   * This migration changes only the canonical Core financial-ledger semantics
--     and its balance calculation view.
--   * No production data import, integration wiring, RLS, or legacy-table work
--     is included.
--   * The Core baseline has not been wired to production data. For any existing
--     local/development Core rows, known entry types are backfilled by the
--     rules below. Unknown types, including historical adjustments, are set to
--     `neutral` for explicit review rather than silently affecting balances.
--   * After this migration, amount_cents is a non-negative magnitude. The
--     direction of its balance impact is stored in balance_effect.
--   * No default is assigned to balance_effect. Future ledger inserts must
--     state their balance impact explicitly.

alter table public.core_financial_ledger
  add column balance_effect text;

-- Normalize pre-correction signed values into positive magnitudes while
-- mapping known Core V1 transaction classifications.
update public.core_financial_ledger
set
  amount_cents = abs(amount_cents),
  balance_effect = case
    when entry_type in ('deposit', 'payment', 'credit') then 'decrease'
    when entry_type in (
      'fee',
      'admin_fee',
      'transport_fee',
      'finance_charge',
      'refund',
      'chargeback'
    ) then 'increase'
    else 'neutral'
  end
where balance_effect is null;

alter table public.core_financial_ledger
  alter column balance_effect set not null,
  add constraint core_financial_ledger_balance_effect_check
    check (balance_effect in ('increase', 'decrease', 'neutral')),
  add constraint core_financial_ledger_amount_cents_nonnegative_check
    check (amount_cents >= 0);

comment on table public.core_financial_ledger is
  'Official money ledger. entry_type classifies activity; balance_effect explicitly controls how posted amount_cents changes reservation balance.';
comment on column public.core_financial_ledger.entry_type is
  'Descriptive classification of the transaction, such as deposit, payment, fee, refund, chargeback, or adjustment.';
comment on column public.core_financial_ledger.amount_cents is
  'Non-negative money magnitude in cents. Use balance_effect, not a signed amount, to determine amount owed.';
comment on column public.core_financial_ledger.balance_effect is
  'Balance direction: increase adds to amount owed, decrease reduces amount owed, and neutral has no balance impact.';

-- Preserve the existing read-model column shape while correcting calculation
-- semantics. posted_ledger_total_cents is the magnitude of all posted ledger
-- activity, while balance_due_cents applies each row's explicit balance_effect.
create or replace view public.core_payment_balance_view as
select
  r.id as reservation_id,
  r.buyer_id,
  r.puppy_id,
  r.status as reservation_status,
  r.currency,
  r.contract_total_cents,
  r.deposit_required_cents,
  coalesce(sum(l.amount_cents) filter (where l.status = 'posted'), 0)::integer as posted_ledger_total_cents,
  case
    when r.contract_total_cents is null then null
    else r.contract_total_cents + coalesce(sum(
      case
        when l.status <> 'posted' then 0
        when l.balance_effect = 'increase' then l.amount_cents
        when l.balance_effect = 'decrease' then -l.amount_cents
        when l.balance_effect = 'neutral' then 0
      end
    ), 0)::integer
  end as balance_due_cents,
  max(l.occurred_at) filter (where l.status = 'posted') as last_posted_payment_at
from public.core_reservations r
left join public.core_financial_ledger l on l.reservation_id = r.id
group by r.id, r.buyer_id, r.puppy_id, r.status, r.currency, r.contract_total_cents, r.deposit_required_cents;

comment on view public.core_payment_balance_view is
  'Reservation balances calculated from contract totals and posted ledger balance_effect; balances are never copied onto buyers.';
