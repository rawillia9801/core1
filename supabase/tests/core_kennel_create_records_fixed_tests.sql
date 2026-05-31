-- Cherolee Core kennel create-record fixed smoke test.
-- TEST DATA ONLY: fictional records are rolled back at the end.

\set ON_ERROR_STOP on

begin;

insert into public.core_profiles (
  id, display_name, email, role, status, metadata
) values (
  '76000000-0000-0000-0000-000000000101',
  'Kennel Fixed Test Owner',
  'kennel.fixed.owner@example.invalid',
  'owner',
  'active',
  '{"test_only": true}'::jsonb
);

select public.core_create_dog(
  '76000000-0000-0000-0000-000000000101',
  'Test Dam',
  'Registered Test Dam',
  'female',
  'cream',
  'long',
  timestamp with time zone '2022-01-01 12:00:00+00',
  'active',
  'TEST-DAM-FIXED-001',
  'TEST ONLY dam note.'
) as dam_id \gset

select public.core_create_dog(
  '76000000-0000-0000-0000-000000000101',
  'Test Sire',
  'Registered Test Sire',
  'male',
  'black tri',
  'smooth',
  timestamp with time zone '2021-01-01 12:00:00+00',
  'active',
  'TEST-SIRE-FIXED-001',
  'TEST ONLY sire note.'
) as sire_id \gset

select public.core_create_litter(
  '76000000-0000-0000-0000-000000000101',
  'Test Litter Fixed 001',
  :'dam_id',
  :'sire_id',
  timestamp with time zone '2026-07-01 12:00:00+00',
  null,
  2,
  1,
  1,
  'expected',
  false,
  'TEST-LITTER-FIXED-001',
  'TEST ONLY litter note.'
) as litter_id \gset

select public.core_create_puppy(
  '76000000-0000-0000-0000-000000000101',
  :'litter_id',
  'Test Puppy',
  'Pink Collar',
  'female',
  'cream',
  'long',
  null,
  'available',
  'observed healthy for test',
  'private',
  'TEST-PUPPY-FIXED-001',
  'TEST ONLY puppy note.'
) as puppy_id \gset

select case when exists (
  select 1 from public.core_dogs
  where id = :'dam_id'
    and call_name = 'Test Dam'
    and sex = 'female'
    and metadata ->> 'external_side_effects' = 'false'
) then 'ok' else public.core_test_fail('Expected dam dog record to be created.') end as dam_check;

select case when exists (
  select 1 from public.core_dogs
  where id = :'sire_id'
    and call_name = 'Test Sire'
    and sex = 'male'
    and metadata ->> 'external_side_effects' = 'false'
) then 'ok' else public.core_test_fail('Expected sire dog record to be created.') end as sire_check;

select case when exists (
  select 1 from public.core_litters
  where id = :'litter_id'
    and dam_id = :'dam_id'
    and sire_id = :'sire_id'
    and litter_name = 'Test Litter Fixed 001'
    and status = 'expected'
    and metadata ->> 'external_side_effects' = 'false'
) then 'ok' else public.core_test_fail('Expected litter record to be created and linked.') end as litter_check;

select case when exists (
  select 1 from public.core_puppies
  where id = :'puppy_id'
    and litter_id = :'litter_id'
    and name = 'Test Puppy'
    and status = 'available'
    and public_listing_status = 'private'
    and metadata ->> 'external_side_effects' = 'false'
) then 'ok' else public.core_test_fail('Expected puppy record to be created and linked.') end as puppy_check;

select case when (
  select count(*) from public.core_events
  where event_type in ('dog_created', 'litter_created', 'puppy_created')
    and created_by_profile_id = '76000000-0000-0000-0000-000000000101'
) = 4 then 'ok' else public.core_test_fail('Expected four kennel create event rows.') end as event_check;

select case when (
  select count(*) from public.core_audit_log
  where action in ('create_dog', 'create_litter', 'create_puppy')
    and actor_profile_id = '76000000-0000-0000-0000-000000000101'
) = 4 then 'ok' else public.core_test_fail('Expected four kennel create audit rows.') end as audit_check;

rollback;
