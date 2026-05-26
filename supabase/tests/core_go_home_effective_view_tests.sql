-- Cherolee Core V1 go-home effective read-model smoke test.
--
-- TEST DATA ONLY: these records are fictional and are rolled back at the end.
-- Run only against a local/development database after all Core V1 migrations.
-- This script must not be used as a production seed or production import mechanism.

\set ON_ERROR_STOP on

begin;

insert into public.core_profiles (
  id, display_name, email, phone, phone_normalized, role, status, metadata
) values (
  '20000000-0000-0000-0000-000000000001',
  'Effective View Test Admin',
  'effective.admin@example.invalid',
  '+12765550900',
  '+12765550900',
  'admin',
  'active',
  '{"test_only": true}'::jsonb
);

insert into public.core_families (
  id, name, status, notes, metadata
) values (
  '20000000-0000-0000-0000-000000000010',
  'Effective View Test Family',
  'active',
  'TEST ONLY family for go-home effective view validation.',
  '{"test_only": true}'::jsonb
);

insert into public.core_buyers (
  id, first_name, last_name, email, email_normalized, phone, phone_normalized,
  approval_status, source, notes, metadata
) values (
  '20000000-0000-0000-0000-000000000020',
  'Effective',
  'View Buyer',
  'effective.buyer@example.invalid',
  'effective.buyer@example.invalid',
  '+12765550901',
  '+12765550901',
  'approved_for_test',
  'core_go_home_effective_view_test',
  'TEST ONLY buyer.',
  '{"test_only": true}'::jsonb
);

insert into public.core_family_members (
  id, family_id, buyer_id, profile_id, relationship, is_primary_contact, portal_access_status, metadata
) values (
  '20000000-0000-0000-0000-000000000030',
  '20000000-0000-0000-0000-000000000010',
  '20000000-0000-0000-0000-000000000020',
  '20000000-0000-0000-0000-000000000001',
  'test_admin_contact',
  true,
  'test_only',
  '{"test_only": true}'::jsonb
);

insert into public.core_dogs (
  id, call_name, sex, color, status, notes, metadata
) values
  ('20000000-0000-0000-0000-000000000050', 'Effective Dam', 'female', 'cream', 'active', 'TEST ONLY dam.', '{"test_only": true}'::jsonb),
  ('20000000-0000-0000-0000-000000000051', 'Effective Sire', 'male', 'black', 'active', 'TEST ONLY sire.', '{"test_only": true}'::jsonb);

insert into public.core_litters (
  id, litter_name, dam_id, sire_id, birth_at, total_puppies, female_count, male_count,
  status, details_pending, notes, metadata
) values (
  '20000000-0000-0000-0000-000000000060',
  'Effective View Test Litter',
  '20000000-0000-0000-0000-000000000050',
  '20000000-0000-0000-0000-000000000051',
  now() - interval '8 weeks',
  3,
  2,
  1,
  'available_for_test',
  false,
  'TEST ONLY litter.',
  '{"test_only": true}'::jsonb
);

insert into public.core_puppies (
  id, litter_id, name, collar_color, sex, color, coat_type, birth_at,
  status, health_status, public_listing_status, notes, metadata
) values
  ('20000000-0000-0000-0000-000000000070', '20000000-0000-0000-0000-000000000060', 'Group Default Puppy', 'Blue', 'female', 'cream', 'long', now() - interval '8 weeks', 'reserved_for_test', 'test_only', 'private', 'TEST ONLY puppy.', '{"test_only": true}'::jsonb),
  ('20000000-0000-0000-0000-000000000071', '20000000-0000-0000-0000-000000000060', 'Override Puppy', 'Pink', 'female', 'cream', 'smooth', now() - interval '8 weeks', 'reserved_for_test', 'test_only', 'private', 'TEST ONLY puppy.', '{"test_only": true}'::jsonb),
  ('20000000-0000-0000-0000-000000000072', '20000000-0000-0000-0000-000000000060', 'Ungrouped Puppy', 'Green', 'male', 'cream', 'smooth', now() - interval '8 weeks', 'reserved_for_test', 'test_only', 'private', 'TEST ONLY puppy.', '{"test_only": true}'::jsonb);

insert into public.core_applications (
  id, family_id, buyer_id, external_reference, status, submitted_at, source, metadata
) values (
  '20000000-0000-0000-0000-000000000040',
  '20000000-0000-0000-0000-000000000010',
  '20000000-0000-0000-0000-000000000020',
  'TEST-EFFECTIVE-APPLICATION-001',
  'approved_for_test',
  now(),
  'core_go_home_effective_view_test',
  '{"test_only": true}'::jsonb
);

insert into public.core_reservations (
  id, external_reference, buyer_id, family_id, puppy_id, application_id, status,
  sale_type, reserved_at, contract_total_cents, deposit_required_cents, currency,
  portal_access_status, notes, metadata, created_at
) values
  ('20000000-0000-0000-0000-000000000080', 'TEST-EFFECTIVE-RESERVATION-001', '20000000-0000-0000-0000-000000000020', '20000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000070', '20000000-0000-0000-0000-000000000040', 'reserved_for_test', 'test_adoption', now(), 200000, 50000, 'USD', 'test_only', 'TEST ONLY group-default reservation.', '{"test_only": true}'::jsonb, now()),
  ('20000000-0000-0000-0000-000000000081', 'TEST-EFFECTIVE-RESERVATION-002', '20000000-0000-0000-0000-000000000020', '20000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000071', '20000000-0000-0000-0000-000000000040', 'reserved_for_test', 'test_adoption', now(), 200000, 50000, 'USD', 'test_only', 'TEST ONLY override reservation.', '{"test_only": true}'::jsonb, now() - interval '1 minute'),
  ('20000000-0000-0000-0000-000000000085', 'TEST-EFFECTIVE-RESERVATION-003', '20000000-0000-0000-0000-000000000020', '20000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000072', '20000000-0000-0000-0000-000000000040', 'reserved_for_test', 'test_adoption', now(), 200000, 50000, 'USD', 'test_only', 'TEST ONLY ungrouped reservation.', '{"test_only": true}'::jsonb, now() - interval '2 minutes');

insert into public.core_go_home_groups (
  id, family_id, buyer_id, pickup_delivery_type, scheduled_at, window_start,
  window_end, address_line_1, city, state, postal_code, contact_phone, status, notes
) values (
  '20000000-0000-0000-0000-000000000082',
  '20000000-0000-0000-0000-000000000010',
  '20000000-0000-0000-0000-000000000020',
  'pickup',
  timestamp with time zone '2026-05-30 14:00:00+00',
  timestamp with time zone '2026-05-30 14:00:00+00',
  timestamp with time zone '2026-05-30 15:00:00+00',
  '100 Effective Test Lane',
  'Testville',
  'VA',
  '00000',
  '+12765550901',
  'scheduled_for_test',
  'TEST ONLY shared group appointment.'
);

insert into public.core_go_home_details (
  id, reservation_id, go_home_group_id, status,
  individual_notes, checklist_status, balance_cleared_status, metadata
) values
  ('20000000-0000-0000-0000-000000000083', '20000000-0000-0000-0000-000000000080', '20000000-0000-0000-0000-000000000082', 'ready_for_test', 'TEST ONLY group-default detail.', 'complete_for_test', 'cleared_for_test', '{"test_only": true}'::jsonb),
  ('20000000-0000-0000-0000-000000000084', '20000000-0000-0000-0000-000000000081', '20000000-0000-0000-0000-000000000082', 'ready_for_test', 'TEST ONLY override detail.', 'complete_for_test', 'cleared_for_test', '{"test_only": true}'::jsonb);

update public.core_go_home_details
set
  has_individual_override = true,
  override_reason = 'TEST ONLY different pickup time for the override puppy.',
  individual_scheduled_at = timestamp with time zone '2026-05-30 17:00:00+00',
  individual_window_start = timestamp with time zone '2026-05-30 17:00:00+00',
  individual_window_end = timestamp with time zone '2026-05-30 18:00:00+00',
  individual_location_notes = 'TEST ONLY pickup at alternate desk.'
where id = '20000000-0000-0000-0000-000000000084';

insert into public.core_go_home_details (
  id, reservation_id, method, status, planned_at, location, contact_notes, metadata
) values (
  '20000000-0000-0000-0000-000000000086',
  '20000000-0000-0000-0000-000000000085',
  'delivery',
  'scheduled_ungrouped_for_test',
  timestamp with time zone '2026-05-31 12:00:00+00',
  'Ungrouped Test Location',
  'TEST ONLY ungrouped contact note.',
  '{"test_only": true}'::jsonb
);

do $$
begin
  if not exists (
    select 1
    from public.core_go_home_effective_view
    where go_home_detail_id = '20000000-0000-0000-0000-000000000083'
      and source_of_schedule = 'group_default'
      and effective_pickup_delivery_type = 'pickup'
      and effective_scheduled_at = timestamp with time zone '2026-05-30 14:00:00+00'
      and effective_window_start = timestamp with time zone '2026-05-30 14:00:00+00'
      and effective_window_end = timestamp with time zone '2026-05-30 15:00:00+00'
      and effective_location_text = '100 Effective Test Lane, Testville, VA, 00000'
      and effective_status = 'scheduled_for_test'
      and detail_status = 'ready_for_test'
      and checklist_status = 'complete_for_test'
      and balance_cleared_status = 'cleared_for_test'
  ) then
    raise exception 'Expected grouped detail to resolve from group defaults.';
  end if;

  if not exists (
    select 1
    from public.core_go_home_effective_view
    where go_home_detail_id = '20000000-0000-0000-0000-000000000084'
      and source_of_schedule = 'individual_override'
      and effective_pickup_delivery_type = 'pickup'
      and effective_scheduled_at = timestamp with time zone '2026-05-30 17:00:00+00'
      and effective_window_start = timestamp with time zone '2026-05-30 17:00:00+00'
      and effective_window_end = timestamp with time zone '2026-05-30 18:00:00+00'
      and effective_location_text = 'TEST ONLY pickup at alternate desk.'
      and override_reason = 'TEST ONLY different pickup time for the override puppy.'
  ) then
    raise exception 'Expected explicit override detail to resolve from individual override fields.';
  end if;

  if not exists (
    select 1
    from public.core_go_home_effective_view
    where go_home_detail_id = '20000000-0000-0000-0000-000000000086'
      and source_of_schedule = 'ungrouped_detail'
      and effective_pickup_delivery_type = 'delivery'
      and effective_scheduled_at = timestamp with time zone '2026-05-31 12:00:00+00'
      and effective_location_text = 'Ungrouped Test Location'
      and effective_status = 'scheduled_ungrouped_for_test'
  ) then
    raise exception 'Expected ungrouped detail to resolve from detail appointment fields.';
  end if;

  if not exists (
    select 1
    from public.core_reservation_summary_view
    where reservation_id = '20000000-0000-0000-0000-000000000081'
      and go_home_source_of_schedule = 'individual_override'
      and go_home_planned_at = timestamp with time zone '2026-05-30 17:00:00+00'
      and go_home_location_text = 'TEST ONLY pickup at alternate desk.'
  ) then
    raise exception 'Expected reservation summary to use effective go-home values.';
  end if;

  if not exists (
    select 1
    from public.core_puppy_summary_view
    where puppy_id = '20000000-0000-0000-0000-000000000070'
      and go_home_source_of_schedule = 'group_default'
      and go_home_location_text = '100 Effective Test Lane, Testville, VA, 00000'
  ) then
    raise exception 'Expected puppy summary to use group-default effective go-home values.';
  end if;
end
$$;

select
  'core_go_home_effective_view' as validated_view,
  go_home_detail_id,
  source_of_schedule,
  effective_scheduled_at,
  effective_location_text
from public.core_go_home_effective_view
where go_home_detail_id in (
  '20000000-0000-0000-0000-000000000083',
  '20000000-0000-0000-0000-000000000084',
  '20000000-0000-0000-0000-000000000086'
)
order by go_home_detail_id;

rollback;
