-- Cherolee Core V1 financial-adjustment write-tool smoke test.
--
-- TEST DATA ONLY: these records are fictional and are rolled back at the end.
-- Run only against a local/development database after all Core V1 migrations.
-- This script records no real payment/refund and must not be used as a production seed.

\set ON_ERROR_STOP on

begin;

insert into public.core_profiles (
  id, display_name, email, phone, phone_normalized, role, status, metadata
) values (
  '66000000-0000-0000-0000-000000000001',
  'Financial Adjustment Test Admin',
  'financial.adjustment.admin@example.invalid',
  '+12765556600',
  '+12765556600',
  'admin',
  'active',
  '{"test_only": true}'::jsonb
);

insert into public.core_families (
  id, name, status, notes, metadata
) values (
  '66000000-0000-0000-0000-000000000010',
  'Financial Adjustment Test Family',
  'active',
  'TEST ONLY family for adjustment validation.',
  '{"test_only": true}'::jsonb
);

insert into public.core_buyers (
  id, first_name, last_name, email, email_normalized, phone, phone_normalized,
  approval_status, source, notes, metadata
) values (
  '66000000-0000-0000-0000-000000000020',
  'Financial',
  'Adjustment Buyer',
  'financial.adjustment.buyer@example.invalid',
  'financial.adjustment.buyer@example.invalid',
  '+12765556601',
  '+12765556601',
  'approved',
  'core_record_financial_adjustment_test',
  'TEST ONLY buyer.',
  '{"test_only": true}'::jsonb
);

insert into public.core_applications (
  id, family_id, buyer_id, external_reference, status, submitted_at, source, metadata
) values (
  '66000000-0000-0000-0000-000000000040',
  '66000000-0000-0000-0000-000000000010',
  '66000000-0000-0000-0000-000000000020',
  'TEST-FINANCIAL-ADJUSTMENT-APPLICATION-001',
  'approved',
  now() - interval '2 days',
  'core_record_financial_adjustment_test',
  '{"test_only": true}'::jsonb
);

insert into public.core_puppies (
  id, name, collar_color, sex, status, health_status, public_listing_status, notes, metadata
) values (
  '66000000-0000-0000-0000-000000000070',
  'Financial Adjustment Test Puppy',
  'Aqua',
  'female',
  'reserved',
  'test_only',
  'private',
  'TEST ONLY puppy.',
  '{"test_only": true}'::jsonb
);

insert into public.core_reservations (
  id, buyer_id, family_id, puppy_id, application_id, status, sale_type, reserved_at,
  contract_total_cents, deposit_required_cents, currency, portal_access_status, notes, metadata
) values (
  '66000000-0000-0000-0000-000000000080',
  '66000000-0000-0000-0000-000000000020',
  '66000000-0000-0000-0000-000000000010',
  '66000000-0000-0000-0000-000000000070',
  '66000000-0000-0000-0000-000000000040',
  'reserved',
  'test_sale',
  now() - interval '1 day',
  200000,
  50000,
  'USD',
  'not_invited',
  'TEST ONLY reservation.',
  '{"test_only": true}'::jsonb
);

create temporary table initial_payment_result as
select *
from public.core_record_reservation_payment(
  '66000000-0000-0000-0000-000000000080',
  '66000000-0000-0000-0000-000000000001',
  'deposit',
  50000,
  'test_only',
  'TEST-FINANCIAL-ADJUSTMENT-DEPOSIT-001',
  'TEST ONLY initial deposit for adjustment validation.'
);

do $$
begin
  if not exists (
    select 1
    from public.core_payment_balance_view
    where reservation_id = '66000000-0000-0000-0000-000000000080'
      and balance_due_cents = 150000
  ) then
    raise exception 'Expected initial deposit to reduce balance to 150000 cents.';
  end if;
end
$$;

create temporary table adjustment_results (
  entry_type text,
  balance_effect text,
  balance_due_cents integer
);

insert into adjustment_results
select entry_type, balance_effect, balance_due_cents
from public.core_record_financial_adjustment(
  '66000000-0000-0000-0000-000000000080',
  '66000000-0000-0000-0000-000000000001',
  'credit',
  10000,
  'TEST ONLY goodwill credit.',
  'TEST-FINANCIAL-ADJUSTMENT-CREDIT-001',
  null,
  'Credit should decrease balance.'
);

insert into adjustment_results
select entry_type, balance_effect, balance_due_cents
from public.core_record_financial_adjustment(
  '66000000-0000-0000-0000-000000000080',
  '66000000-0000-0000-0000-000000000001',
  'refund',
  5000,
  'TEST ONLY internal refund ledger record.',
  'TEST-FINANCIAL-ADJUSTMENT-REFUND-001',
  (select ledger_id from initial_payment_result),
  'Refund should increase balance. No processor action is connected.'
);

insert into adjustment_results
select entry_type, balance_effect, balance_due_cents
from public.core_record_financial_adjustment(
  '66000000-0000-0000-0000-000000000080',
  '66000000-0000-0000-0000-000000000001',
  'chargeback',
  7000,
  'TEST ONLY chargeback ledger record.',
  'TEST-FINANCIAL-ADJUSTMENT-CHARGEBACK-001',
  (select ledger_id from initial_payment_result),
  'Chargeback should increase balance.'
);

insert into adjustment_results
select entry_type, balance_effect, balance_due_cents
from public.core_record_financial_adjustment(
  '66000000-0000-0000-0000-000000000080',
  '66000000-0000-0000-0000-000000000001',
  'fee',
  1000,
  'TEST ONLY fee ledger record.',
  'TEST-FINANCIAL-ADJUSTMENT-FEE-001',
  null,
  'Fee should increase balance.'
);

insert into adjustment_results
select entry_type, balance_effect, balance_due_cents
from public.core_record_financial_adjustment(
  '66000000-0000-0000-0000-000000000080',
  '66000000-0000-0000-0000-000000000001',
  'admin_fee',
  2000,
  'TEST ONLY admin fee ledger record.',
  'TEST-FINANCIAL-ADJUSTMENT-ADMIN-FEE-001',
  null,
  'Admin fee should increase balance.'
);

insert into adjustment_results
select entry_type, balance_effect, balance_due_cents
from public.core_record_financial_adjustment(
  '66000000-0000-0000-0000-000000000080',
  '66000000-0000-0000-0000-000000000001',
  'transport_fee',
  3000,
  'TEST ONLY transport fee ledger record.',
  'TEST-FINANCIAL-ADJUSTMENT-TRANSPORT-FEE-001',
  null,
  'Transport fee should increase balance.'
);

insert into adjustment_results
select entry_type, balance_effect, balance_due_cents
from public.core_record_financial_adjustment(
  '66000000-0000-0000-0000-000000000080',
  '66000000-0000-0000-0000-000000000001',
  'finance_charge',
  4000,
  'TEST ONLY finance charge ledger record.',
  'TEST-FINANCIAL-ADJUSTMENT-FINANCE-CHARGE-001',
  null,
  'Finance charge should increase balance.'
);

insert into adjustment_results
select entry_type, balance_effect, balance_due_cents
from public.core_record_financial_adjustment(
  '66000000-0000-0000-0000-000000000080',
  '66000000-0000-0000-0000-000000000001',
  'adjustment',
  0,
  'TEST ONLY neutral reconciliation note.',
  'TEST-FINANCIAL-ADJUSTMENT-NEUTRAL-001',
  null,
  'Neutral adjustment should not change balance.'
);

do $$
begin
  if not exists (
    select 1 from adjustment_results
    where entry_type = 'credit'
      and balance_effect = 'decrease'
      and balance_due_cents = 140000
  ) then
    raise exception 'Expected credit to decrease balance to 140000 cents.';
  end if;

  if not exists (
    select 1 from adjustment_results
    where entry_type = 'refund'
      and balance_effect = 'increase'
      and balance_due_cents = 145000
  ) then
    raise exception 'Expected refund to increase balance to 145000 cents.';
  end if;

  if not exists (
    select 1 from adjustment_results
    where entry_type = 'chargeback'
      and balance_effect = 'increase'
      and balance_due_cents = 152000
  ) then
    raise exception 'Expected chargeback to increase balance to 152000 cents.';
  end if;

  if not exists (
    select 1 from adjustment_results
    where entry_type = 'fee'
      and balance_effect = 'increase'
      and balance_due_cents = 153000
  ) then
    raise exception 'Expected fee to increase balance to 153000 cents.';
  end if;

  if not exists (
    select 1 from adjustment_results
    where entry_type = 'admin_fee'
      and balance_effect = 'increase'
      and balance_due_cents = 155000
  ) then
    raise exception 'Expected admin_fee to increase balance to 155000 cents.';
  end if;

  if not exists (
    select 1 from adjustment_results
    where entry_type = 'transport_fee'
      and balance_effect = 'increase'
      and balance_due_cents = 158000
  ) then
    raise exception 'Expected transport_fee to increase balance to 158000 cents.';
  end if;

  if not exists (
    select 1 from adjustment_results
    where entry_type = 'finance_charge'
      and balance_effect = 'increase'
      and balance_due_cents = 162000
  ) then
    raise exception 'Expected finance_charge to increase balance to 162000 cents.';
  end if;

  if not exists (
    select 1 from adjustment_results
    where entry_type = 'adjustment'
      and balance_effect = 'neutral'
      and balance_due_cents = 162000
  ) then
    raise exception 'Expected neutral adjustment to leave balance at 162000 cents.';
  end if;

  if exists (
    select 1
    from public.core_financial_ledger
    where reservation_id = '66000000-0000-0000-0000-000000000080'
      and entry_type = 'adjustment'
      and amount_cents = 0
      and balance_effect <> 'neutral'
  ) then
    raise exception 'Neutral adjustment used an unexpected balance_effect.';
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'core_record_financial_adjustment'
      and pg_get_function_arguments(p.oid) like '%balance_effect%'
  ) then
    raise exception 'Adjustment function exposes caller-chosen balance_effect.';
  end if;

  begin
    perform public.core_record_financial_adjustment(
      '66000000-0000-0000-0000-000000000080',
      '66000000-0000-0000-0000-000000000001',
      'deposit',
      1000,
      'TEST ONLY invalid adjustment type.',
      'TEST-FINANCIAL-ADJUSTMENT-DEPOSIT-REJECTED',
      null,
      null
    );
    raise exception 'Expected invalid entry_type to be rejected.';
  exception when others then
    if sqlerrm = 'Expected invalid entry_type to be rejected.' then
      raise;
    end if;
  end;

  begin
    perform public.core_record_financial_adjustment(
      '66000000-0000-0000-0000-000000000080',
      '66000000-0000-0000-0000-000000000001',
      'fee',
      0,
      'TEST ONLY zero fee.',
      'TEST-FINANCIAL-ADJUSTMENT-ZERO-FEE-REJECTED',
      null,
      null
    );
    raise exception 'Expected zero fee amount to be rejected.';
  exception when others then
    if sqlerrm = 'Expected zero fee amount to be rejected.' then
      raise;
    end if;
  end;

  begin
    perform public.core_record_financial_adjustment(
      '66000000-0000-0000-0000-000000000080',
      '66000000-0000-0000-0000-000000000001',
      'adjustment',
      -1,
      'TEST ONLY negative neutral adjustment.',
      'TEST-FINANCIAL-ADJUSTMENT-NEGATIVE-REJECTED',
      null,
      null
    );
    raise exception 'Expected negative adjustment amount to be rejected.';
  exception when others then
    if sqlerrm = 'Expected negative adjustment amount to be rejected.' then
      raise;
    end if;
  end;

  begin
    perform public.core_record_financial_adjustment(
      '66000000-0000-0000-0000-000000000080',
      '66000000-0000-0000-0000-000000000001',
      'credit',
      1000,
      '   ',
      'TEST-FINANCIAL-ADJUSTMENT-MISSING-REASON',
      null,
      null
    );
    raise exception 'Expected missing reason to be rejected.';
  exception when others then
    if sqlerrm = 'Expected missing reason to be rejected.' then
      raise;
    end if;
  end;

  begin
    perform public.core_record_financial_adjustment(
      '66000000-0000-0000-0000-000000000099',
      '66000000-0000-0000-0000-000000000001',
      'credit',
      1000,
      'TEST ONLY missing reservation.',
      'TEST-FINANCIAL-ADJUSTMENT-MISSING-RESERVATION',
      null,
      null
    );
    raise exception 'Expected missing reservation to be rejected.';
  exception when others then
    if sqlerrm = 'Expected missing reservation to be rejected.' then
      raise;
    end if;
  end;

  begin
    perform public.core_record_financial_adjustment(
      '66000000-0000-0000-0000-000000000080',
      '66000000-0000-0000-0000-000000000099',
      'credit',
      1000,
      'TEST ONLY missing actor.',
      'TEST-FINANCIAL-ADJUSTMENT-MISSING-ACTOR',
      null,
      null
    );
    raise exception 'Expected missing actor to be rejected.';
  exception when others then
    if sqlerrm = 'Expected missing actor to be rejected.' then
      raise;
    end if;
  end;

  begin
    perform public.core_record_financial_adjustment(
      '66000000-0000-0000-0000-000000000080',
      '66000000-0000-0000-0000-000000000001',
      'credit',
      10000,
      'TEST ONLY duplicate external reference.',
      'TEST-FINANCIAL-ADJUSTMENT-CREDIT-001',
      null,
      null
    );
    raise exception 'Expected duplicate external reference to be rejected.';
  exception when others then
    if sqlerrm = 'Expected duplicate external reference to be rejected.' then
      raise;
    end if;
  end;
end
$$;

select
  'core_record_financial_adjustment' as validated_function,
  (
    select count(*)
    from public.core_financial_ledger l
    where l.reservation_id = pb.reservation_id
  ) as ledger_count,
  pb.balance_due_cents,
  (
    select count(*)
    from public.core_events e
    where e.reservation_id = pb.reservation_id
      and e.event_type = 'reservation_financial_adjustment_recorded'
  ) as adjustment_event_count,
  (
    select count(*)
    from public.core_audit_log al
    join public.core_financial_ledger l on l.id = al.entity_id
    where l.reservation_id = pb.reservation_id
      and al.action = 'record_financial_adjustment'
  ) as adjustment_audit_count
from public.core_payment_balance_view pb
where pb.reservation_id = '66000000-0000-0000-0000-000000000080';

rollback;
