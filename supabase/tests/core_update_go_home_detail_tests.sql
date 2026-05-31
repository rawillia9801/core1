-- Cherolee Core controlled go-home update smoke test.
--
-- TEST DATA ONLY: these records are fictional and are rolled back at the end.
-- Run only against a local/development database after all Core V1 migrations.

\set ON_ERROR_STOP on

begin;

insert into public.core_profiles (
  id, display_name, email, role, status, metadata
) values (
  '74000000-0000-0000-0000-000000000001',
  'Go Home Update Test Owner',
  'go.home.owner@example.invalid',
  'owner',
  'active',
  '{"test_only": true}'::jsonb
);

insert into public.core_families (
  id, name, status, metadata
) values (
  '74000000-0000-0000-0000-000000000010',
  'Go Home Update Test Family',
  'active',
  '{"test_only": true}'::jsonb
);

insert into public.core_buyers (
  id, first_name, last_name, email, email_normalized, approval_status, source, metadata
) values (
  '74000000-0000-0000-0000-000000000020',
  'GoHome',
  'Buyer',
  'go.home.buyer@example.invalid',
  'go.home.buyer@example.invalid',
  'approved_for_test',
  'core_update_go_home_detail_test',
  '{"test_only": true}'::jsonb
);

insert into public.core_puppies (
  id, name, sex, status, public_listing_status, metadata
) values (
  '74000000-0000-0000-0000-000000000030',
  'Go Home Puppy',
  'female',
  'reserved_for_test',
  'private',
  '{"test_only": true}'::jsonb
);

insert into public.core_applications (
  id, family_id, buyer_id, external_reference, status, submitted_at, source, metadata
) values (
  '74000000-0000-0000-0000-000000000040',
  '74000000-0000-0000-0000-000000000010',
  '74000000-0000-0000-0000-000000000020',
  'TEST-GO-HOME-APPLICATION-001',
  'approved_for_test',
  now(),
  'core_update_go_home_detail_test',
  '{"test_only": true}'::jsonb
);

insert into public.core_reservations (
  id, external_reference, buyer_id, family_id, puppy_id, application_id, status,
  sale_type, reserved_at, contract_total_cents, deposit_required_cents, currency,
  portal_access_status, notes, metadata
) values (
  '74000000-0000-0000-0000-000000000050',
  'TEST-GO-HOME-RESERVATION-001',
  '74000000-0000-0000-0000-000000000020',
  '74000000-0000-0000-0000-000000000010',
  '74000000-0000-0000-0000-000000000030',
  '74000000-0000-0000-0000-000000000040',
  'reserved',
  'test_adoption',
  now(),
  220000,
  50000,
  'USD',
  'test_only',
  'TEST ONLY reservation for go-home update.',
  '{"test_only": true}'::jsonb
);

select public.core_update_go_home_detail(
  '74000000-0000-0000-0000-000000000050',
  '74000000-0000-0000-0000-000000000001',
  'pickup',
  timestamp with time zone '2026-06-15 18:00:00+00',
  'Marion, Virginia pickup location',
  'scheduled',
  'in_progress',
  'pending_review',
  'Call when nearby.',
  'Bring puppy packet and food sample.'
) as first_go_home_detail_id;

do $$
begin
  if not exists (
    select 1
    from public.core_go_home_effective_view
    where reservation_id = '74000000-0000-0000-0000-000000000050'
      and effective_pickup_delivery_type = 'pickup'
      and effective_scheduled_at = timestamp with time zone '2026-06-15 18:00:00+00'
      and effective_location_text = 'Marion, Virginia pickup location'
      and effective_status = 'scheduled'
      and checklist_status = 'in_progress'
      and balance_cleared_status = 'pending_review'
      and source_of_schedule = 'ungrouped_detail'
  ) then
    raise exception 'Expected go-home detail to be created and visible through effective view.';
  end if;

  if (select count(*) from public.core_go_home_details where reservation_id = '74000000-0000-0000-0000-000000000050') <> 1 then
    raise exception 'Expected exactly one current go-home detail for the reservation.';
  end if;

  if not exists (
    select 1
    from public.core_events
    where event_type = 'go_home_detail_updated'
      and reservation_id = '74000000-0000-0000-0000-000000000050'
      and created_by_profile_id = '74000000-0000-0000-0000-000000000001'
      and details ->> 'external_side_effects' = 'false'
  ) then
    raise exception 'Expected go-home update event with no external side effects.';
  end if;

  if not exists (
    select 1
    from public.core_audit_log
    where action = 'update_go_home_detail'
      and entity_table = 'core_go_home_details'
      and actor_profile_id = '74000000-0000-0000-0000-000000000001'
      and request_context ->> 'external_side_effects' = 'false'
  ) then
    raise exception 'Expected audit log for controlled go-home update.';
  end if;
end;
$$;

select public.core_update_go_home_detail(
  '74000000-0000-0000-0000-000000000050',
  '74000000-0000-0000-0000-000000000001',
  'delivery',
  timestamp with time zone '2026-06-16 19:00:00+00',
  'Updated delivery location',
  'confirmed',
  'complete',
  'cleared',
  'Updated contact note.',
  'Updated individual note.'
) as updated_go_home_detail_id;

do $$
begin
  if (select count(*) from public.core_go_home_details where reservation_id = '74000000-0000-0000-0000-000000000050') <> 1 then
    raise exception 'Expected update to preserve one current go-home detail.';
  end if;

  if not exists (
    select 1
    from public.core_go_home_effective_view
    where reservation_id = '74000000-0000-0000-0000-000000000050'
      and effective_pickup_delivery_type = 'delivery'
      and effective_scheduled_at = timestamp with time zone '2026-06-16 19:00:00+00'
      and effective_location_text = 'Updated delivery location'
      and effective_status = 'confirmed'
      and checklist_status = 'complete'
      and balance_cleared_status = 'cleared'
  ) then
    raise exception 'Expected go-home detail to update and remain visible through effective view.';
  end if;
end;
$$;

do $$
begin
  perform public.core_update_go_home_detail(
    '74000000-0000-0000-0000-000000000050',
    '74000000-0000-0000-0000-000000000001',
    'teleport',
    null,
    null,
    'scheduled',
    null,
    null,
    null,
    null
  );

  raise exception 'Expected invalid method to be rejected.';
exception
  when others then
    if sqlerrm <> 'invalid go-home method' then
      raise exception 'Expected invalid go-home method, got: %', sqlerrm;
    end if;
end;
$$;

rollback;
