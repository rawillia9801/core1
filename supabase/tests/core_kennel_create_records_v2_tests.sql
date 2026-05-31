-- Cherolee Core kennel create-record smoke test v2.
-- TEST DATA ONLY: fictional records are rolled back at the end.
-- This file avoids custom test helpers and avoids psql variables inside DO blocks.

\set ON_ERROR_STOP on

begin;

insert into public.core_profiles (
  id, display_name, email, role, status, metadata
) values (
  '76000000-0000-0000-0000-000000000201',
  'Kennel V2 Test Owner',
  'kennel.v2.owner@example.invalid',
  'owner',
  'active',
  '{"test_only": true}'::jsonb
);

select public.core_create_dog(
  '76000000-0000-0000-0000-000000000201',
  'Test Dam V2',
  'Registered Test Dam V2',
  'female',
  'cream',
  'long',
  timestamp with time zone '2022-01-01 12:00:00+00',
  'active',
  'TEST-DAM-V2-001',
  'TEST ONLY dam note.'
) as dam_id \gset

select public.core_create_dog(
  '76000000-0000-0000-0000-000000000201',
  'Test Sire V2',
  'Registered Test Sire V2',
  'male',
  'black tri',
  'smooth',
  timestamp with time zone '2021-01-01 12:00:00+00',
  'active',
  'TEST-SIRE-V2-001',
  'TEST ONLY sire note.'
) as sire_id \gset

select public.core_create_litter(
  '76000000-0000-0000-0000-000000000201',
  'Test Litter V2 001',
  :'dam_id',
  :'sire_id',
  timestamp with time zone '2026-07-01 12:00:00+00',
  null,
  2,
  1,
  1,
  'expected',
  false,
  'TEST-LITTER-V2-001',
  'TEST ONLY litter note.'
) as litter_id \gset

select public.core_create_puppy(
  '76000000-0000-0000-0000-000000000201',
  :'litter_id',
  'Test Puppy V2',
  'Pink Collar',
  'female',
  'cream',
  'long',
  null,
  'available',
  'observed healthy for test',
  'private',
  'TEST-PUPPY-V2-001',
  'TEST ONLY puppy note.'
) as puppy_id \gset

select 'dam_check' as check_name, count(*) as matching_rows
from public.core_dogs
where id = :'dam_id'
  and call_name = 'Test Dam V2'
  and sex = 'female'
  and metadata ->> 'external_side_effects' = 'false';

select 'sire_check' as check_name, count(*) as matching_rows
from public.core_dogs
where id = :'sire_id'
  and call_name = 'Test Sire V2'
  and sex = 'male'
  and metadata ->> 'external_side_effects' = 'false';

select 'litter_check' as check_name, count(*) as matching_rows
from public.core_litters
where id = :'litter_id'
  and dam_id = :'dam_id'
  and sire_id = :'sire_id'
  and litter_name = 'Test Litter V2 001'
  and status = 'expected'
  and metadata ->> 'external_side_effects' = 'false';

select 'puppy_check' as check_name, count(*) as matching_rows
from public.core_puppies
where id = :'puppy_id'
  and litter_id = :'litter_id'
  and name = 'Test Puppy V2'
  and status = 'available'
  and public_listing_status = 'private'
  and metadata ->> 'external_side_effects' = 'false';

select 'event_check' as check_name, count(*) as matching_rows
from public.core_events
where event_type in ('dog_created', 'litter_created', 'puppy_created')
  and created_by_profile_id = '76000000-0000-0000-0000-000000000201';

select 'audit_check' as check_name, count(*) as matching_rows
from public.core_audit_log
where action in ('create_dog', 'create_litter', 'create_puppy')
  and actor_profile_id = '76000000-0000-0000-0000-000000000201';

rollback;
