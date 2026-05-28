-- Rollback-safe test for the controlled Core V1 reservation cancellation RPC.
-- Uses fake LOCAL-* data only and leaves no records behind.

begin;

insert into public.core_profiles (id, display_name, email, role, status, metadata)
values (
  '65000000-0000-0000-0000-000000000001',
  'Local Cancel Test Admin',
  'local-cancel-admin@example.invalid',
  'admin',
  'active',
  '{"local_dev_only": true, "test": "core_cancel_reservation"}'::jsonb
);

insert into public.core_families (id, name, status, metadata)
values (
  '65000000-0000-0000-0000-000000000010',
  'Local Cancel Test Family',
  'active',
  '{"local_dev_only": true, "test": "core_cancel_reservation"}'::jsonb
);

insert into public.core_buyers (
  id,
  external_reference,
  first_name,
  last_name,
  email,
  email_normalized,
  phone,
  phone_normalized,
  approval_status,
  source,
  metadata
) values (
  '65000000-0000-0000-0000-000000000020',
  'LOCAL-CANCEL-BUYER-001',
  'Casey',
  'Cancel Test',
  'casey.cancel-test@example.invalid',
  'casey.cancel-test@example.invalid',
  '276-555-6500',
  '+12765556500',
  'approved',
  'local_test',
  '{"local_dev_only": true, "test": "core_cancel_reservation"}'::jsonb
);

insert into public.core_applications (
  id,
  family_id,
  buyer_id,
  external_reference,
  status,
  submitted_at,
  reviewed_at,
  reviewed_by_profile_id,
  source,
  metadata
) values (
  '65000000-0000-0000-0000-000000000030',
  '65000000-0000-0000-0000-000000000010',
  '65000000-0000-0000-0000-000000000020',
  'LOCAL-CANCEL-APP-001',
  'approved',
  now(),
  now(),
  '65000000-0000-0000-0000-000000000001',
  'local_test',
  '{"local_dev_only": true, "test": "core_cancel_reservation"}'::jsonb
);

insert into public.core_puppies (id, external_reference, name, status, metadata)
values
  (
    '65000000-0000-0000-0000-000000000040',
    'LOCAL-CANCEL-PUPPY-001',
    'Cancel Test Puppy One',
    'reserved',
    '{"local_dev_only": true, "test": "core_cancel_reservation"}'::jsonb
  ),
  (
    '65000000-0000-0000-0000-000000000041',
    'LOCAL-CANCEL-PUPPY-002',
    'Cancel Test Puppy Two',
    'reserved',
    '{"local_dev_only": true, "test": "core_cancel_reservation"}'::jsonb
  ),
  (
    '65000000-0000-0000-0000-000000000042',
    'LOCAL-CANCEL-PUPPY-003',
    'Cancel Test Shared Puppy',
    'reserved',
    '{"local_dev_only": true, "test": "core_cancel_reservation"}'::jsonb
  );

insert into public.core_reservations (
  id,
  external_reference,
  buyer_id,
  family_id,
  puppy_id,
  application_id,
  status,
  sale_type,
  reserved_at,
  contract_total_cents,
  deposit_required_cents,
  currency,
  notes,
  metadata
) values
  (
    '65000000-0000-0000-0000-000000000050',
    'LOCAL-CANCEL-RESERVATION-001',
    '65000000-0000-0000-0000-000000000020',
    '65000000-0000-0000-0000-000000000010',
    '65000000-0000-0000-0000-000000000040',
    '65000000-0000-0000-0000-000000000030',
    'reserved',
    'pet',
    now(),
    200000,
    50000,
    'USD',
    'Test reservation cancelled without puppy release.',
    '{"local_dev_only": true, "test": "core_cancel_reservation"}'::jsonb
  ),
  (
    '65000000-0000-0000-0000-000000000051',
    'LOCAL-CANCEL-RESERVATION-002',
    '65000000-0000-0000-0000-000000000020',
    '65000000-0000-0000-0000-000000000010',
    '65000000-0000-0000-0000-000000000041',
    '65000000-0000-0000-0000-000000000030',
    'reserved',
    'pet',
    now(),
    210000,
    50000,
    'USD',
    'Test reservation cancelled with puppy release.',
    '{"local_dev_only": true, "test": "core_cancel_reservation"}'::jsonb
  ),
  (
    '65000000-0000-0000-0000-000000000052',
    'LOCAL-CANCEL-RESERVATION-003',
    '65000000-0000-0000-0000-000000000020',
    '65000000-0000-0000-0000-000000000010',
    null,
    '65000000-0000-0000-0000-000000000030',
    'pending',
    'pet',
    now(),
    220000,
    50000,
    'USD',
    'Test reservation for rejection cases.',
    '{"local_dev_only": true, "test": "core_cancel_reservation"}'::jsonb
  ),
  (
    '65000000-0000-0000-0000-000000000053',
    'LOCAL-CANCEL-RESERVATION-004',
    '65000000-0000-0000-0000-000000000020',
    '65000000-0000-0000-0000-000000000010',
    '65000000-0000-0000-0000-000000000042',
    '65000000-0000-0000-0000-000000000030',
    'reserved',
    'pet',
    now(),
    230000,
    50000,
    'USD',
    'Test reservation cancelled while another active reservation exists.',
    '{"local_dev_only": true, "test": "core_cancel_reservation"}'::jsonb
  ),
  (
    '65000000-0000-0000-0000-000000000054',
    'LOCAL-CANCEL-RESERVATION-005',
    '65000000-0000-0000-0000-000000000020',
    '65000000-0000-0000-0000-000000000010',
    '65000000-0000-0000-0000-000000000042',
    '65000000-0000-0000-0000-000000000030',
    'pending',
    'pet',
    now(),
    230000,
    50000,
    'USD',
    'Second active reservation for shared-puppy release protection.',
    '{"local_dev_only": true, "test": "core_cancel_reservation"}'::jsonb
  );

insert into public.core_financial_ledger (
  id,
  reservation_id,
  buyer_id,
  external_reference,
  entry_type,
  balance_effect,
  status,
  amount_cents,
  currency,
  occurred_at,
  payment_method,
  description,
  metadata
) values (
  '65000000-0000-0000-0000-000000000060',
  '65000000-0000-0000-0000-000000000050',
  '65000000-0000-0000-0000-000000000020',
  'LOCAL-CANCEL-LEDGER-001',
  'deposit',
  'decrease',
  'posted',
  50000,
  'USD',
  now(),
  'local_test',
  'Test deposit that cancellation must preserve.',
  '{"local_dev_only": true, "test": "core_cancel_reservation"}'::jsonb
);

create temporary table cancel_without_release_result as
select *
from public.core_cancel_reservation(
  '65000000-0000-0000-0000-000000000050',
  '65000000-0000-0000-0000-000000000001',
  'Test-only cancellation without puppy release',
  false,
  'available',
  'No puppy release requested.'
);

do $$
begin
  if not exists (
    select 1
    from cancel_without_release_result
    where reservation_status = 'cancelled'
      and puppy_id = '65000000-0000-0000-0000-000000000040'
      and puppy_status = 'reserved'
      and puppy_released is false
      and reservation_event_id is not null
      and puppy_event_id is null
      and reservation_audit_log_id is not null
      and puppy_audit_log_id is null
  ) then
    raise exception 'cancel without release did not return the expected result';
  end if;

  if (select status from public.core_reservations where id = '65000000-0000-0000-0000-000000000050') <> 'cancelled' then
    raise exception 'reservation was not cancelled';
  end if;

  if (select status from public.core_puppies where id = '65000000-0000-0000-0000-000000000040') <> 'reserved' then
    raise exception 'puppy status changed even though release was false';
  end if;

  if not exists (
    select 1
    from public.core_financial_ledger
    where id = '65000000-0000-0000-0000-000000000060'
      and reservation_id = '65000000-0000-0000-0000-000000000050'
      and entry_type = 'deposit'
      and balance_effect = 'decrease'
      and status = 'posted'
      and amount_cents = 50000
  ) then
    raise exception 'ledger row was changed or deleted by cancellation';
  end if;

  if not exists (
    select 1
    from public.core_events
    where event_type = 'reservation_cancelled'
      and reservation_id = '65000000-0000-0000-0000-000000000050'
  ) then
    raise exception 'reservation cancellation event was not created';
  end if;

  if not exists (
    select 1
    from public.core_audit_log
    where action = 'cancel_reservation'
      and entity_table = 'core_reservations'
      and entity_id = '65000000-0000-0000-0000-000000000050'
  ) then
    raise exception 'reservation cancellation audit row was not created';
  end if;
end;
$$;

create temporary table cancel_with_release_result as
select *
from public.core_cancel_reservation(
  '65000000-0000-0000-0000-000000000051',
  '65000000-0000-0000-0000-000000000001',
  'Test-only cancellation with puppy release',
  true,
  'available',
  'Release the puppy for local testing.'
);

do $$
begin
  if not exists (
    select 1
    from cancel_with_release_result
    where reservation_status = 'cancelled'
      and puppy_id = '65000000-0000-0000-0000-000000000041'
      and puppy_status = 'available'
      and puppy_released is true
      and reservation_event_id is not null
      and puppy_event_id is not null
      and reservation_audit_log_id is not null
      and puppy_audit_log_id is not null
  ) then
    raise exception 'cancel with release did not return the expected result';
  end if;

  if (select status from public.core_puppies where id = '65000000-0000-0000-0000-000000000041') <> 'available' then
    raise exception 'puppy was not released to available';
  end if;

  if not exists (
    select 1
    from public.core_events
    where event_type = 'puppy_released'
      and puppy_id = '65000000-0000-0000-0000-000000000041'
      and reservation_id = '65000000-0000-0000-0000-000000000051'
  ) then
    raise exception 'puppy release event was not created';
  end if;

  if not exists (
    select 1
    from public.core_audit_log
    where action = 'release_puppy_from_cancelled_reservation'
      and entity_table = 'core_puppies'
      and entity_id = '65000000-0000-0000-0000-000000000041'
  ) then
    raise exception 'puppy release audit row was not created';
  end if;
end;
$$;

create temporary table cancel_shared_puppy_result as
select *
from public.core_cancel_reservation(
  '65000000-0000-0000-0000-000000000053',
  '65000000-0000-0000-0000-000000000001',
  'Test-only cancellation with another active reservation on the same puppy',
  true,
  'available',
  'Puppy should stay reserved because another active reservation exists.'
);

do $$
begin
  if not exists (
    select 1
    from cancel_shared_puppy_result
    where reservation_status = 'cancelled'
      and puppy_id = '65000000-0000-0000-0000-000000000042'
      and puppy_status = 'reserved'
      and puppy_released is false
      and puppy_event_id is null
      and puppy_audit_log_id is null
  ) then
    raise exception 'shared puppy release protection did not return the expected result';
  end if;

  if (select status from public.core_puppies where id = '65000000-0000-0000-0000-000000000042') <> 'reserved' then
    raise exception 'puppy was released even though another active reservation exists';
  end if;

  if exists (
    select 1
    from public.core_events
    where event_type = 'puppy_released'
      and puppy_id = '65000000-0000-0000-0000-000000000042'
      and reservation_id = '65000000-0000-0000-0000-000000000053'
  ) then
    raise exception 'puppy release event was created even though puppy was not released';
  end if;
end;
$$;

do $$
begin
  begin
    perform public.core_cancel_reservation(
      '65000000-0000-0000-0000-000000000051',
      '65000000-0000-0000-0000-000000000001',
      'Try to cancel an already-cancelled reservation',
      false,
      'available',
      null
    );
    raise exception 'already-cancelled reservation was not rejected';
  exception
    when others then
      if sqlerrm = 'already-cancelled reservation was not rejected' then
        raise;
      end if;
  end;

  begin
    perform public.core_cancel_reservation(
      '65000000-0000-0000-0000-000000000052',
      '65000000-0000-0000-0000-000000000001',
      '   ',
      false,
      'available',
      null
    );
    raise exception 'missing cancellation reason was not rejected';
  exception
    when others then
      if sqlerrm = 'missing cancellation reason was not rejected' then
        raise;
      end if;
  end;

  begin
    perform public.core_cancel_reservation(
      '65000000-0000-0000-0000-000000000099',
      '65000000-0000-0000-0000-000000000001',
      'Missing reservation test',
      false,
      'available',
      null
    );
    raise exception 'missing reservation was not rejected';
  exception
    when others then
      if sqlerrm = 'missing reservation was not rejected' then
        raise;
      end if;
  end;

  begin
    perform public.core_cancel_reservation(
      '65000000-0000-0000-0000-000000000052',
      '65000000-0000-0000-0000-000000000099',
      'Missing actor test',
      false,
      'available',
      null
    );
    raise exception 'missing actor profile was not rejected';
  exception
    when others then
      if sqlerrm = 'missing actor profile was not rejected' then
        raise;
      end if;
  end;

  begin
    perform public.core_cancel_reservation(
      '65000000-0000-0000-0000-000000000052',
      '65000000-0000-0000-0000-000000000001',
      'Invalid released status test',
      true,
      'sold',
      null
    );
    raise exception 'invalid released puppy status was not rejected';
  exception
    when others then
      if sqlerrm = 'invalid released puppy status was not rejected' then
        raise;
      end if;
  end;
end;
$$;

select
  'core_cancel_reservation tests passed and will roll back' as result,
  (select count(*) from public.core_reservations where status = 'cancelled' and external_reference like 'LOCAL-CANCEL-%') as cancelled_reservations,
  (select count(*) from public.core_events where source = 'core_cancel_reservation') as cancellation_events,
  (select count(*) from public.core_audit_log where source = 'core_cancel_reservation') as cancellation_audit_rows;

rollback;
