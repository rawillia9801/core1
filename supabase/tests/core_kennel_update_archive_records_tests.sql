-- Cherolee Core kennel update/archive smoke test.
-- TEST DATA ONLY: fictional records are rolled back at the end.

\set ON_ERROR_STOP on

begin;

insert into public.core_profiles (
  id, display_name, email, role, status, metadata
) values (
  '77000000-0000-0000-0000-000000000001',
  'Kennel Update Test Owner',
  'kennel.update.owner@example.invalid',
  'owner',
  'active',
  '{"test_only": true}'::jsonb
);

select public.core_create_dog(
  '77000000-0000-0000-0000-000000000001',
  'Update Test Dam',
  'Registered Update Test Dam',
  'female',
  'cream',
  'long',
  timestamp with time zone '2022-01-01 12:00:00+00',
  'active',
  'UPDATE-TEST-DAM-001',
  'TEST ONLY dam note.'
) as dam_id \gset

select public.core_create_dog(
  '77000000-0000-0000-0000-000000000001',
  'Update Test Sire',
  'Registered Update Test Sire',
  'male',
  'black tri',
  'smooth',
  timestamp with time zone '2021-01-01 12:00:00+00',
  'active',
  'UPDATE-TEST-SIRE-001',
  'TEST ONLY sire note.'
) as sire_id \gset

select public.core_create_litter(
  '77000000-0000-0000-0000-000000000001',
  'Update Test Litter 001',
  :'dam_id',
  :'sire_id',
  timestamp with time zone '2026-07-01 12:00:00+00',
  null,
  2,
  1,
  1,
  'expected',
  false,
  'UPDATE-TEST-LITTER-001',
  'TEST ONLY litter note.'
) as litter_id \gset

select public.core_create_puppy(
  '77000000-0000-0000-0000-000000000001',
  :'litter_id',
  'Update Test Puppy',
  'Pink Collar',
  'female',
  'cream',
  'long',
  null,
  'available',
  'observed healthy for test',
  'private',
  null,
  null,
  null,
  null,
  null,
  'UPDATE-TEST-PUPPY-001',
  'TEST ONLY puppy note.'
) as puppy_id \gset

select public.core_update_dog(
  :'dam_id',
  '77000000-0000-0000-0000-000000000001',
  'Updated Dam',
  'Updated Registered Dam',
  'female',
  'fawn',
  'long',
  timestamp with time zone '2022-02-02 12:00:00+00',
  'retired',
  'UPDATED-DAM-001',
  'Updated TEST ONLY dam note.'
) as updated_dog_id;

select public.core_update_litter(
  :'litter_id',
  '77000000-0000-0000-0000-000000000001',
  'Updated Test Litter 001',
  :'dam_id',
  :'sire_id',
  timestamp with time zone '2026-07-02 12:00:00+00',
  timestamp with time zone '2026-07-03 12:00:00+00',
  3,
  2,
  1,
  'born',
  true,
  'UPDATED-LITTER-001',
  'Updated TEST ONLY litter note.'
) as updated_litter_id;

select public.core_update_puppy(
  :'puppy_id',
  '77000000-0000-0000-0000-000000000001',
  :'litter_id',
  'Updated Puppy',
  'Purple Collar',
  'female',
  'fawn',
  'long',
  timestamp with time zone '2026-07-03 12:00:00+00',
  'hold',
  'updated healthy marker',
  'coming_soon',
  'AKC',
  'UPDATED-REG-001',
  180000,
  50000,
  25000,
  'UPDATED-PUPPY-001',
  'Updated TEST ONLY puppy note.'
) as updated_puppy_id;

select public.core_archive_dog(:'sire_id', '77000000-0000-0000-0000-000000000001') as archived_dog_id;
select public.core_archive_litter(:'litter_id', '77000000-0000-0000-0000-000000000001') as archived_litter_id;
select public.core_archive_puppy(:'puppy_id', '77000000-0000-0000-0000-000000000001') as archived_puppy_id;

select 'dog_update_check' as check_name, count(*) as matching_rows
from public.core_dogs
where id = :'dam_id'
  and call_name = 'Updated Dam'
  and status = 'retired'
  and metadata ->> 'last_updated_by_tool' = 'core_update_dog'
  and metadata ->> 'external_side_effects' = 'false';

select 'dog_archive_check' as check_name, count(*) as matching_rows
from public.core_dogs
where id = :'sire_id'
  and status = 'inactive'
  and metadata ->> 'last_updated_by_tool' = 'core_archive_dog'
  and metadata ->> 'archive_style_delete' = 'true'
  and metadata ->> 'external_side_effects' = 'false';

select 'litter_archive_check' as check_name, count(*) as matching_rows
from public.core_litters
where id = :'litter_id'
  and status = 'archived'
  and metadata ->> 'last_updated_by_tool' = 'core_archive_litter'
  and metadata ->> 'archive_style_delete' = 'true'
  and metadata ->> 'external_side_effects' = 'false';

select 'puppy_archive_check' as check_name, count(*) as matching_rows
from public.core_puppies
where id = :'puppy_id'
  and status = 'unavailable'
  and public_listing_status = 'hidden'
  and metadata ->> 'last_updated_by_tool' = 'core_archive_puppy'
  and metadata ->> 'archive_style_delete' = 'true'
  and metadata ->> 'external_side_effects' = 'false';

select 'event_check' as check_name, count(*) as matching_rows
from public.core_events
where event_type in ('dog_updated', 'dog_archived', 'litter_updated', 'litter_archived', 'puppy_updated', 'puppy_archived')
  and created_by_profile_id = '77000000-0000-0000-0000-000000000001';

select 'audit_check' as check_name, count(*) as matching_rows
from public.core_audit_log
where action in ('update_dog', 'archive_dog', 'update_litter', 'archive_litter', 'update_puppy', 'archive_puppy')
  and actor_profile_id = '77000000-0000-0000-0000-000000000001';

rollback;
