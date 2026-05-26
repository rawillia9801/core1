-- Cherolee Core V1 create-reservation write-tool smoke test.
--
-- TEST DATA ONLY: these records are fictional and are rolled back at the end.
-- Run only against a local/development database after all Core V1 migrations.
-- This script must not be used as a production seed or production import mechanism.

\set ON_ERROR_STOP on

begin;

insert into public.core_profiles (
  id, display_name, email, phone, phone_normalized, role, status, metadata
) values (
  '40000000-0000-0000-0000-000000000001',
  'Reservation Test Admin',
  'reservation.admin@example.invalid',
  '+12765550700',
  '+12765550700',
  'admin',
  'active',
  '{"test_only": true}'::jsonb
);

insert into public.core_families (
  id, name, status, notes, metadata
) values (
  '40000000-0000-0000-0000-000000000010',
  'Reservation Test Family',
  'active',
  'TEST ONLY family for reservation workflow validation.',
  '{"test_only": true}'::jsonb
);

insert into public.core_buyers (
  id, first_name, last_name, email, email_normalized, phone, phone_normalized,
  approval_status, source, notes, metadata
) values (
  '40000000-0000-0000-0000-000000000020',
  'Reservation',
  'Test Buyer',
  'reservation.buyer@example.invalid',
  'reservation.buyer@example.invalid',
  '+12765550701',
  '+12765550701',
  'approved',
  'core_create_reservation_write_tool_test',
  'TEST ONLY buyer.',
  '{"test_only": true}'::jsonb
);

insert into public.core_family_members (
  id, family_id, buyer_id, relationship, is_primary_contact, portal_access_status, metadata
) values (
  '40000000-0000-0000-0000-000000000030',
  '40000000-0000-0000-0000-000000000010',
  '40000000-0000-0000-0000-000000000020',
  'test_primary_contact',
  true,
  'test_only',
  '{"test_only": true}'::jsonb
);

insert into public.core_dogs (
  id, call_name, sex, color, status, notes, metadata
) values
  ('40000000-0000-0000-0000-000000000050', 'Reservation Test Dam', 'female', 'cream', 'active', 'TEST ONLY dam.', '{"test_only": true}'::jsonb),
  ('40000000-0000-0000-0000-000000000051', 'Reservation Test Sire', 'male', 'black', 'active', 'TEST ONLY sire.', '{"test_only": true}'::jsonb);

insert into public.core_litters (
  id, litter_name, dam_id, sire_id, birth_at, total_puppies, female_count, male_count,
  status, details_pending, notes, metadata
) values (
  '40000000-0000-0000-0000-000000000060',
  'Reservation Test Litter',
  '40000000-0000-0000-0000-000000000050',
  '40000000-0000-0000-0000-000000000051',
  now() - interval '8 weeks',
  1,
  1,
  0,
  'available_for_test',
  false,
  'TEST ONLY litter.',
  '{"test_only": true}'::jsonb
);

insert into public.core_puppies (
  id, litter_id, name, collar_color, sex, color, coat_type, birth_at,
  status, health_status, public_listing_status, notes, metadata
) values (
  '40000000-0000-0000-0000-000000000070',
  '40000000-0000-0000-0000-000000000060',
  'Reservation Test Puppy',
  'Blue',
  'female',
  'cream',
  'long',
  now() - interval '8 weeks',
  'available',
  'test_only',
  'private',
  'TEST ONLY puppy.',
  '{"test_only": true}'::jsonb
);

insert into public.core_applications (
  id, family_id, buyer_id, external_reference, status, submitted_at, reviewed_at,
  reviewed_by_profile_id, source, metadata
) values (
  '40000000-0000-0000-0000-000000000040',
  '40000000-0000-0000-0000-000000000010',
  '40000000-0000-0000-0000-000000000020',
  'TEST-RESERVATION-APPLICATION-001',
  'approved',
  now() - interval '2 days',
  now() - interval '1 day',
  '40000000-0000-0000-0000-000000000001',
  'core_create_reservation_write_tool_test',
  '{"test_only": true}'::jsonb
);

select *
from public.core_create_reservation(
  '40000000-0000-0000-0000-000000000020',
  '40000000-0000-0000-0000-000000000010',
  '40000000-0000-0000-0000-000000000070',
  '40000000-0000-0000-0000-000000000040',
  '40000000-0000-0000-0000-000000000001',
  200000,
  50000,
  'test_sale',
  'TEST ONLY reservation created during rollback-safe smoke test.'
);

do $$
declare
  v_event_count integer;
  v_audit_count integer;
  v_reservation_id uuid;
begin
  select id into v_reservation_id
  from public.core_reservations
  where buyer_id = '40000000-0000-0000-0000-000000000020'
    and family_id = '40000000-0000-0000-0000-000000000010'
    and puppy_id = '40000000-0000-0000-0000-000000000070'
    and status = 'reserved';

  if v_reservation_id is null then
    raise exception 'Expected reservation to be created.';
  end if;

  if not exists (
    select 1
    from public.core_puppies
    where id = '40000000-0000-0000-0000-000000000070'
      and status = 'reserved'
  ) then
    raise exception 'Expected puppy to be marked reserved.';
  end if;

  if not exists (
    select 1
    from public.core_reservations
    where id = v_reservation_id
      and contract_total_cents = 200000
      and deposit_required_cents = 50000
      and currency = 'USD'
      and portal_access_status = 'not_invited'
      and reserved_at is not null
  ) then
    raise exception 'Expected reservation financial and portal fields to be set.';
  end if;

  select count(*) into v_event_count
  from public.core_events
  where reservation_id = v_reservation_id
    and puppy_id = '40000000-0000-0000-0000-000000000070'
    and event_type = 'reservation_created'
    and source = 'core_create_reservation';

  if v_event_count <> 1 then
    raise exception 'Expected exactly one reservation_created event, got %.', v_event_count;
  end if;

  select count(*) into v_audit_count
  from public.core_audit_log
  where entity_table = 'core_reservations'
    and entity_id = v_reservation_id
    and action = 'create_reservation'
    and source = 'core_create_reservation'
    and outcome = 'success';

  if v_audit_count <> 1 then
    raise exception 'Expected exactly one reservation audit log entry, got %.', v_audit_count;
  end if;
end
$$;

do $$
begin
  begin
    perform public.core_create_reservation(
      '40000000-0000-0000-0000-000000000020',
      '40000000-0000-0000-0000-000000000010',
      '40000000-0000-0000-0000-000000000070',
      '40000000-0000-0000-0000-000000000040',
      '40000000-0000-0000-0000-000000000001',
      200000,
      50000,
      'test_sale',
      'TEST ONLY duplicate reservation should fail.'
    );
    raise exception 'Expected duplicate reservation attempt to fail.';
  exception when others then
    if sqlerrm = 'Expected duplicate reservation attempt to fail.' then
      raise;
    end if;
  end;
end
$$;

select
  'core_create_reservation' as validated_function,
  r.status as reservation_status,
  p.status as puppy_status,
  r.contract_total_cents,
  r.deposit_required_cents,
  count(distinct e.id) as event_count,
  count(distinct al.id) as audit_count
from public.core_reservations r
join public.core_puppies p on p.id = r.puppy_id
left join public.core_events e on e.reservation_id = r.id and e.event_type = 'reservation_created'
left join public.core_audit_log al on al.entity_id = r.id and al.action = 'create_reservation'
where r.puppy_id = '40000000-0000-0000-0000-000000000070'
group by r.status, p.status, r.contract_total_cents, r.deposit_required_cents;

rollback;
