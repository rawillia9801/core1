begin;

insert into public.core_profiles (id, display_name, email, role, status)
values
  ('56000000-0000-0000-0000-000000000001', 'Owner Test', 'owner.assignment@example.invalid', 'owner', 'active'),
  ('56000000-0000-0000-0000-000000000002', 'Staff Test', 'staff.assignment@example.invalid', 'staff', 'active');

insert into public.core_litters (id, litter_name, status, birth_at)
values ('56000000-0000-0000-0000-000000000010', 'Assignment Test Litter', 'active', now() - interval '3 days');

insert into public.core_puppies (id, litter_id, name, collar_color, sex, status, public_listing_status)
values
  ('56000000-0000-0000-0000-000000000020', '56000000-0000-0000-0000-000000000010', 'Assignment Pup', 'Blue', 'female', 'available', 'private'),
  ('56000000-0000-0000-0000-000000000021', '56000000-0000-0000-0000-000000000010', 'Invalid Target Pup', 'Green', 'male', 'available', 'private');

select public.core_update_puppy(
  '56000000-0000-0000-0000-000000000020',
  '56000000-0000-0000-0000-000000000001',
  '56000000-0000-0000-0000-000000000010',
  'Assignment Pup Updated',
  'Blue',
  'female',
  'black and tan',
  'smooth',
  now() - interval '3 days',
  'available',
  'watch',
  'private',
  'assignment-test-pup',
  'Owner/admin puppy update test.'
);

do $$
begin
  perform public.core_update_puppy(
    '56000000-0000-0000-0000-000000000020',
    '56000000-0000-0000-0000-000000000002',
    '56000000-0000-0000-0000-000000000010',
    'Unauthorized Update',
    'Blue',
    'female',
    null,
    null,
    now(),
    'available',
    null,
    'private',
    'assignment-test-pup',
    null
  );
  raise exception 'staff role unexpectedly updated puppy';
exception when others then
  if sqlerrm not like '%not authorized%' then raise; end if;
end $$;

do $$
begin
  perform public.core_update_puppy(
    '56000000-0000-0000-0000-000000000099',
    '56000000-0000-0000-0000-000000000001',
    null,
    'Missing Pup',
    null,
    null,
    null,
    null,
    null,
    'available',
    null,
    'private',
    'missing-pup',
    null
  );
  raise exception 'invalid puppy unexpectedly updated';
exception when others then
  if sqlerrm not like '%puppy not found%' then raise; end if;
end $$;

select public.core_record_puppy_weight_log(
  '56000000-0000-0000-0000-000000000001',
  '56000000-0000-0000-0000-000000000020',
  210,
  now() - interval '1 hour',
  'Initial assignment test weight.'
);

select public.core_update_puppy_weight_log(
  (select id from public.core_weight_logs where puppy_id = '56000000-0000-0000-0000-000000000020' limit 1),
  '56000000-0000-0000-0000-000000000001',
  now(),
  215,
  'Corrected assignment test weight.'
);

do $$
begin
  perform public.core_update_puppy_weight_log(
    (select id from public.core_weight_logs where puppy_id = '56000000-0000-0000-0000-000000000020' limit 1),
    '56000000-0000-0000-0000-000000000001',
    now(),
    0,
    'Invalid weight.'
  );
  raise exception 'invalid weight unexpectedly accepted';
exception when others then
  if sqlerrm not like '%between 1 and 10000%' then raise; end if;
end $$;

select public.core_record_puppy_care_observation(
  '56000000-0000-0000-0000-000000000001',
  '56000000-0000-0000-0000-000000000020',
  'watch_note',
  now(),
  'Assignment test care observation.'
);

select public.core_create_manual_buyer(
  '56000000-0000-0000-0000-000000000001',
  'Manual',
  'Buyer',
  'Manny',
  'manual.assignment@example.invalid',
  '276-555-0123',
  null,
  '100 Test Lane',
  'Testville',
  'VA',
  '24210',
  'approved',
  'Manual buyer assignment test.'
) as buyer_id
\gset

select public.core_update_buyer(
  :'buyer_id',
  '56000000-0000-0000-0000-000000000001',
  'Manual',
  'Buyer Updated',
  'Manny',
  'manual.assignment.updated@example.invalid',
  '276-555-0124',
  null,
  '100 Test Lane',
  'Testville',
  'VA',
  '24210',
  'approved',
  'Updated buyer assignment test.'
);

select public.core_create_family(
  '56000000-0000-0000-0000-000000000001',
  'Manual Assignment Family',
  'active',
  'Manual family assignment test.'
) as family_id
\gset

select public.core_update_family(
  :'family_id',
  '56000000-0000-0000-0000-000000000001',
  'Manual Assignment Family Updated',
  'active',
  'Updated manual family assignment test.'
);

select public.core_link_buyer_family_member(
  '56000000-0000-0000-0000-000000000001',
  :'family_id',
  :'buyer_id',
  'primary_contact',
  true
);

select *
from public.core_create_reservation(
  :'buyer_id',
  :'family_id',
  '56000000-0000-0000-0000-000000000020',
  null,
  '56000000-0000-0000-0000-000000000001',
  200000,
  50000,
  'manual_assignment_test',
  'Manual buyer assignment through reservation model.'
);

do $$
declare
  v_buyer_id uuid;
  v_family_id uuid;
begin
  select id into v_buyer_id from public.core_buyers where email = 'manual.assignment.updated@example.invalid';
  select id into v_family_id from public.core_families where name = 'Manual Assignment Family Updated';
  perform *
  from public.core_create_reservation(
    v_buyer_id,
    v_family_id,
    '56000000-0000-0000-0000-000000000020',
    null,
    '56000000-0000-0000-0000-000000000001',
    200000,
    50000,
    'duplicate_assignment_test',
    'Duplicate should be rejected.'
  );
  raise exception 'duplicate active reservation unexpectedly created';
exception when others then
  if sqlerrm not like '%already has active reservation%' then raise; end if;
end $$;

do $$
begin
  if not exists (select 1 from public.core_events where source in ('core_update_puppy', 'core_update_puppy_weight_log', 'core_create_manual_buyer', 'core_update_buyer', 'core_create_family', 'core_update_family', 'core_link_buyer_family_member', 'core_create_reservation')) then
    raise exception 'expected event rows were not written';
  end if;
  if not exists (select 1 from public.core_audit_log where source in ('core_update_puppy', 'core_update_puppy_weight_log', 'core_create_manual_buyer', 'core_update_buyer', 'core_create_family', 'core_update_family', 'core_link_buyer_family_member', 'core_create_reservation')) then
    raise exception 'expected audit rows were not written';
  end if;
  if exists (
    select 1
    from public.core_events
    where source in ('core_update_puppy', 'core_update_puppy_weight_log', 'core_create_manual_buyer', 'core_update_buyer', 'core_create_family', 'core_update_family', 'core_link_buyer_family_member', 'core_create_reservation')
      and coalesce(details->>'external_side_effects', 'false') <> 'false'
  ) then
    raise exception 'unexpected external side effect marker';
  end if;
end $$;

select
  'core_puppy_buyer_assignment_tests' as validated_area,
  (select count(*) from public.core_weight_logs where puppy_id = '56000000-0000-0000-0000-000000000020') as weight_rows,
  (select count(*) from public.core_puppy_events where puppy_id = '56000000-0000-0000-0000-000000000020') as care_rows,
  (select count(*) from public.core_reservations where puppy_id = '56000000-0000-0000-0000-000000000020') as reservation_rows,
  (select count(*) from public.core_family_members fm join public.core_buyers b on b.id = fm.buyer_id join public.core_families f on f.id = fm.family_id where b.email = 'manual.assignment.updated@example.invalid' and f.name = 'Manual Assignment Family Updated') as family_member_rows,
  (select count(*) from public.core_events where source in ('core_update_puppy', 'core_update_puppy_weight_log', 'core_create_manual_buyer', 'core_update_buyer', 'core_create_family', 'core_update_family', 'core_link_buyer_family_member', 'core_create_reservation')) as event_rows,
  (select count(*) from public.core_audit_log where source in ('core_update_puppy', 'core_update_puppy_weight_log', 'core_create_manual_buyer', 'core_update_buyer', 'core_create_family', 'core_update_family', 'core_link_buyer_family_member', 'core_create_reservation')) as audit_rows;

rollback;
