-- Cherolee Core V1 record-reservation-payment write-tool smoke test.
--
-- TEST DATA ONLY: these records are fictional and are rolled back at the end.
-- Run only against a local/development database after all Core V1 migrations.
-- This script records no real payment and must not be used as a production seed.

\set ON_ERROR_STOP on

begin;

insert into public.core_profiles (
  id, display_name, email, phone, phone_normalized, role, status, metadata
) values (
  '50000000-0000-0000-0000-000000000001',
  'Payment Test Admin',
  'payment.admin@example.invalid',
  '+12765550800',
  '+12765550800',
  'admin',
  'active',
  '{"test_only": true}'::jsonb
);

insert into public.core_families (
  id, name, status, notes, metadata
) values (
  '50000000-0000-0000-0000-000000000010',
  'Payment Test Family',
  'active',
  'TEST ONLY family for payment recording validation.',
  '{"test_only": true}'::jsonb
);

insert into public.core_buyers (
  id, first_name, last_name, email, email_normalized, phone, phone_normalized,
  approval_status, source, notes, metadata
) values (
  '50000000-0000-0000-0000-000000000020',
  'Payment',
  'Test Buyer',
  'payment.buyer@example.invalid',
  'payment.buyer@example.invalid',
  '+12765550801',
  '+12765550801',
  'approved',
  'core_record_reservation_payment_test',
  'TEST ONLY buyer.',
  '{"test_only": true}'::jsonb
);

insert into public.core_applications (
  id, family_id, buyer_id, external_reference, status, submitted_at, source, metadata
) values (
  '50000000-0000-0000-0000-000000000040',
  '50000000-0000-0000-0000-000000000010',
  '50000000-0000-0000-0000-000000000020',
  'TEST-PAYMENT-APPLICATION-001',
  'approved',
  now() - interval '2 days',
  'core_record_reservation_payment_test',
  '{"test_only": true}'::jsonb
);

insert into public.core_puppies (
  id, name, collar_color, sex, status, health_status, public_listing_status, notes, metadata
) values (
  '50000000-0000-0000-0000-000000000070',
  'Payment Test Puppy',
  'Teal',
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
  '50000000-0000-0000-0000-000000000080',
  '50000000-0000-0000-0000-000000000020',
  '50000000-0000-0000-0000-000000000010',
  '50000000-0000-0000-0000-000000000070',
  '50000000-0000-0000-0000-000000000040',
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

select *
from public.core_record_reservation_payment(
  '50000000-0000-0000-0000-000000000080',
  '50000000-0000-0000-0000-000000000001',
  'deposit',
  50000,
  'test_only',
  'TEST-PAYMENT-DEPOSIT-001',
  'TEST ONLY recorded deposit.'
);

do $$
begin
  if not exists (
    select 1
    from public.core_financial_ledger
    where reservation_id = '50000000-0000-0000-0000-000000000080'
      and buyer_id = '50000000-0000-0000-0000-000000000020'
      and external_reference = 'TEST-PAYMENT-DEPOSIT-001'
      and entry_type = 'deposit'
      and status = 'posted'
      and amount_cents = 50000
      and balance_effect = 'decrease'
  ) then
    raise exception 'Expected posted deposit ledger decrease.';
  end if;

  if not exists (
    select 1
    from public.core_payment_balance_view
    where reservation_id = '50000000-0000-0000-0000-000000000080'
      and balance_due_cents = 150000
  ) then
    raise exception 'Expected deposit to decrease balance to 150000 cents.';
  end if;
end
$$;

select *
from public.core_record_reservation_payment(
  '50000000-0000-0000-0000-000000000080',
  '50000000-0000-0000-0000-000000000001',
  'payment',
  25000,
  'test_only',
  'TEST-PAYMENT-PAYMENT-001',
  'TEST ONLY recorded payment.'
);

do $$
declare
  v_event_count integer;
  v_audit_count integer;
begin
  if not exists (
    select 1
    from public.core_financial_ledger
    where reservation_id = '50000000-0000-0000-0000-000000000080'
      and external_reference = 'TEST-PAYMENT-PAYMENT-001'
      and entry_type = 'payment'
      and status = 'posted'
      and amount_cents = 25000
      and balance_effect = 'decrease'
  ) then
    raise exception 'Expected posted payment ledger decrease.';
  end if;

  if not exists (
    select 1
    from public.core_payment_balance_view
    where reservation_id = '50000000-0000-0000-0000-000000000080'
      and posted_ledger_total_cents = 75000
      and balance_due_cents = 125000
  ) then
    raise exception 'Expected deposit and payment to decrease balance to 125000 cents.';
  end if;

  select count(*) into v_event_count
  from public.core_events
  where reservation_id = '50000000-0000-0000-0000-000000000080'
    and event_type = 'reservation_payment_recorded'
    and source = 'core_record_reservation_payment';

  if v_event_count <> 2 then
    raise exception 'Expected two payment events, got %.', v_event_count;
  end if;

  select count(*) into v_audit_count
  from public.core_audit_log
  where entity_table = 'core_financial_ledger'
    and action = 'record_reservation_payment'
    and source = 'core_record_reservation_payment'
    and outcome = 'success';

  if v_audit_count <> 2 then
    raise exception 'Expected two payment audit rows, got %.', v_audit_count;
  end if;
end
$$;

do $$
begin
  begin
    perform public.core_record_reservation_payment(
      '50000000-0000-0000-0000-000000000080',
      '50000000-0000-0000-0000-000000000001',
      'fee',
      1000,
      'test_only',
      'TEST-PAYMENT-FEE-REJECTED',
      'TEST ONLY invalid type.'
    );
    raise exception 'Expected fee entry_type to be rejected.';
  exception when others then
    if sqlerrm = 'Expected fee entry_type to be rejected.' then
      raise;
    end if;
  end;

  begin
    perform public.core_record_reservation_payment(
      '50000000-0000-0000-0000-000000000080',
      '50000000-0000-0000-0000-000000000001',
      'deposit',
      0,
      'test_only',
      'TEST-PAYMENT-ZERO-REJECTED',
      'TEST ONLY zero amount.'
    );
    raise exception 'Expected zero amount to be rejected.';
  exception when others then
    if sqlerrm = 'Expected zero amount to be rejected.' then
      raise;
    end if;
  end;

  begin
    perform public.core_record_reservation_payment(
      '50000000-0000-0000-0000-000000000080',
      '50000000-0000-0000-0000-000000000001',
      'payment',
      -100,
      'test_only',
      'TEST-PAYMENT-NEGATIVE-REJECTED',
      'TEST ONLY negative amount.'
    );
    raise exception 'Expected negative amount to be rejected.';
  exception when others then
    if sqlerrm = 'Expected negative amount to be rejected.' then
      raise;
    end if;
  end;

  begin
    perform public.core_record_reservation_payment(
      '50000000-0000-0000-0000-000000000099',
      '50000000-0000-0000-0000-000000000001',
      'payment',
      1000,
      'test_only',
      'TEST-PAYMENT-MISSING-RESERVATION',
      'TEST ONLY missing reservation.'
    );
    raise exception 'Expected missing reservation to be rejected.';
  exception when others then
    if sqlerrm = 'Expected missing reservation to be rejected.' then
      raise;
    end if;
  end;

  begin
    perform public.core_record_reservation_payment(
      '50000000-0000-0000-0000-000000000080',
      '50000000-0000-0000-0000-000000000099',
      'payment',
      1000,
      'test_only',
      'TEST-PAYMENT-MISSING-ACTOR',
      'TEST ONLY missing actor.'
    );
    raise exception 'Expected missing actor to be rejected.';
  exception when others then
    if sqlerrm = 'Expected missing actor to be rejected.' then
      raise;
    end if;
  end;

  begin
    perform public.core_record_reservation_payment(
      '50000000-0000-0000-0000-000000000080',
      '50000000-0000-0000-0000-000000000001',
      'deposit',
      50000,
      'test_only',
      'TEST-PAYMENT-DEPOSIT-001',
      'TEST ONLY duplicate external reference.'
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
  'core_record_reservation_payment' as validated_function,
  (
    select count(*)
    from public.core_financial_ledger l
    where l.reservation_id = pb.reservation_id
  ) as ledger_count,
  (
    select sum(l.amount_cents)
    from public.core_financial_ledger l
    where l.reservation_id = pb.reservation_id
      and l.balance_effect = 'decrease'
      and l.status = 'posted'
  ) as posted_decreases_cents,
  pb.balance_due_cents,
  (
    select count(*)
    from public.core_events e
    where e.reservation_id = pb.reservation_id
      and e.event_type = 'reservation_payment_recorded'
  ) as event_count,
  (
    select count(*)
    from public.core_audit_log al
    join public.core_financial_ledger l on l.id = al.entity_id
    where l.reservation_id = pb.reservation_id
      and al.action = 'record_reservation_payment'
  ) as audit_count
from public.core_payment_balance_view pb
where pb.reservation_id = '50000000-0000-0000-0000-000000000080';

rollback;
