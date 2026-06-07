-- Cherolee Core private kennel media metadata smoke test.
-- TEST DATA ONLY: fictional records are rolled back at the end.

\set ON_ERROR_STOP on

begin;

insert into public.core_profiles (
  id,
  display_name,
  email,
  role,
  status,
  metadata
) values
  ('8b000000-0000-0000-0000-000000000001', 'Kennel Media Test Owner', 'kennel-media-owner@example.invalid', 'owner', 'active', '{"test_only": true}'::jsonb),
  ('8b000000-0000-0000-0000-000000000002', 'Kennel Media Test Staff', 'kennel-media-staff@example.invalid', 'staff', 'active', '{"test_only": true}'::jsonb);

select public.core_create_dog(
  '8b000000-0000-0000-0000-000000000001',
  'Media Dam',
  'Registered Media Dam',
  'female',
  'black tan',
  'long',
  timestamp with time zone '2022-04-01 12:00:00+00',
  'active',
  'MEDIA-DAM',
  'TEST ONLY media dam.'
) as dam_id \gset

select public.core_create_dog(
  '8b000000-0000-0000-0000-000000000001',
  'Media Sire',
  'Registered Media Sire',
  'male',
  'cream',
  'smooth',
  timestamp with time zone '2021-04-01 12:00:00+00',
  'active',
  'MEDIA-SIRE',
  'TEST ONLY media sire.'
) as sire_id \gset

select public.core_create_litter(
  '8b000000-0000-0000-0000-000000000001',
  'Media Test Litter',
  :'dam_id',
  :'sire_id',
  timestamp with time zone '2026-01-01 12:00:00+00',
  timestamp with time zone '2026-01-02 12:00:00+00',
  1,
  1,
  0,
  'born',
  false,
  'MEDIA-LITTER',
  'TEST ONLY media litter.'
) as litter_id \gset

select public.core_create_puppy(
  '8b000000-0000-0000-0000-000000000001',
  :'litter_id',
  'Media Puppy',
  'Green',
  'female',
  'black tan',
  'long',
  timestamp with time zone '2026-01-02 12:00:00+00',
  'available',
  'normal',
  'private',
  'MEDIA-PUPPY',
  'TEST ONLY media puppy.'
) as puppy_id \gset

select public.core_record_kennel_media_metadata(
  '8b000000-0000-0000-0000-000000000001',
  'dog',
  :'dam_id',
  null,
  'kennel-media',
  'dogs/' || :'dam_id' || '/photos/test-dam.webp',
  'test-dam.webp',
  'image/webp',
  123456,
  'TEST ONLY Dam Photo',
  'TEST ONLY private dog photo.',
  true
) as dog_media_id \gset

select public.core_record_kennel_media_metadata(
  '8b000000-0000-0000-0000-000000000001',
  'puppy',
  null,
  :'puppy_id',
  'kennel-media',
  'puppies/' || :'puppy_id' || '/photos/test-puppy.jpg',
  'test-puppy.jpg',
  'image/jpeg',
  234567,
  'TEST ONLY Puppy Photo',
  'TEST ONLY private puppy photo.',
  true
) as puppy_media_id \gset

select 'private_bucket_check' as check_name, count(*) as matching_rows
from storage.buckets
where id = 'kennel-media'
  and public = false
  and file_size_limit = 10485760
  and allowed_mime_types @> array['image/jpeg', 'image/png', 'image/webp']::text[];

select 'dog_media_check' as check_name, count(*) as matching_rows
from public.core_kennel_media
where id = :'dog_media_id'
  and entity_type = 'dog'
  and dog_id = :'dam_id'
  and puppy_id is null
  and storage_bucket = 'kennel-media'
  and storage_path = 'dogs/' || :'dam_id' || '/photos/test-dam.webp'
  and file_mime_type = 'image/webp'
  and is_primary = true
  and visibility = 'internal'
  and metadata ->> 'private_storage' = 'true'
  and metadata ->> 'public_link_exposed' = 'false'
  and metadata ->> 'customer_message_sent' = 'false'
  and metadata ->> 'public_publishing_enabled' = 'false'
  and metadata ->> 'external_side_effects' = 'false';

select 'puppy_media_check' as check_name, count(*) as matching_rows
from public.core_kennel_media
where id = :'puppy_media_id'
  and entity_type = 'puppy'
  and puppy_id = :'puppy_id'
  and dog_id is null
  and storage_bucket = 'kennel-media'
  and storage_path = 'puppies/' || :'puppy_id' || '/photos/test-puppy.jpg'
  and file_mime_type = 'image/jpeg'
  and is_primary = true
  and visibility = 'internal'
  and metadata ->> 'private_storage' = 'true'
  and metadata ->> 'public_link_exposed' = 'false'
  and metadata ->> 'customer_message_sent' = 'false'
  and metadata ->> 'public_publishing_enabled' = 'false'
  and metadata ->> 'external_side_effects' = 'false';

select 'event_check' as check_name, count(*) as matching_rows
from public.core_events
where event_type = 'kennel_media_uploaded'
  and source = 'core_record_kennel_media_metadata'
  and related_table in ('core_dogs', 'core_puppies')
  and details ->> 'private_storage' = 'true'
  and details ->> 'public_link_exposed' = 'false'
  and details ->> 'public_publishing_enabled' = 'false'
  and details ->> 'external_side_effects' = 'false';

select 'audit_check' as check_name, count(*) as matching_rows
from public.core_audit_log
where action = 'record_kennel_media_metadata'
  and entity_table = 'core_kennel_media'
  and entity_id in (:'dog_media_id', :'puppy_media_id')
  and request_context ->> 'private_storage' = 'true'
  and request_context ->> 'public_link_exposed' = 'false'
  and request_context ->> 'public_publishing_enabled' = 'false'
  and request_context ->> 'external_side_effects' = 'false';

do $$
begin
  perform public.core_record_kennel_media_metadata(
    '8b000000-0000-0000-0000-000000000002',
    'dog',
    (select id from public.core_dogs where external_reference = 'MEDIA-DAM'),
    null,
    'kennel-media',
    'dogs/' || (select id from public.core_dogs where external_reference = 'MEDIA-DAM') || '/photos/staff.webp',
    'staff.webp',
    'image/webp',
    123,
    null,
    null,
    false
  );
  raise exception 'staff actor was not rejected';
exception
  when others then
    if sqlerrm = 'staff actor was not rejected' then
      raise;
    end if;
end;
$$;

do $$
begin
  perform public.core_record_kennel_media_metadata(
    '8b000000-0000-0000-0000-000000000001',
    'dog',
    (select id from public.core_dogs where external_reference = 'MEDIA-DAM'),
    null,
    'kennel-media',
    'dogs/8b000000-0000-0000-0000-000000009999/photos/wrong.webp',
    'wrong.webp',
    'image/webp',
    123,
    null,
    null,
    false
  );
  raise exception 'wrong path was not rejected';
exception
  when others then
    if sqlerrm = 'wrong path was not rejected' then
      raise;
    end if;
end;
$$;

do $$
begin
  perform public.core_record_kennel_media_metadata(
    '8b000000-0000-0000-0000-000000000001',
    'puppy',
    null,
    (select id from public.core_puppies where external_reference = 'MEDIA-PUPPY'),
    'kennel-media',
    'puppies/' || (select id from public.core_puppies where external_reference = 'MEDIA-PUPPY') || '/photos/bad.gif',
    'bad.gif',
    'image/gif',
    123,
    null,
    null,
    false
  );
  raise exception 'invalid mime was not rejected';
exception
  when others then
    if sqlerrm = 'invalid mime was not rejected' then
      raise;
    end if;
end;
$$;

select
  'core_kennel_media_tests' as validated_area,
  :'dog_media_id' as dog_media_id,
  :'puppy_media_id' as puppy_media_id;

rollback;
