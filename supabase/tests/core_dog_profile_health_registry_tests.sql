-- Cherolee Core dog profile/health/document metadata smoke test.
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
  ('89000000-0000-0000-0000-000000000001', 'Dog Profile Test Owner', 'dog-profile-owner@example.invalid', 'owner', 'active', '{"test_only": true}'::jsonb),
  ('89000000-0000-0000-0000-000000000002', 'Dog Profile Test Admin', 'dog-profile-admin@example.invalid', 'admin', 'active', '{"test_only": true}'::jsonb),
  ('89000000-0000-0000-0000-000000000003', 'Dog Profile Test Staff', 'dog-profile-staff@example.invalid', 'staff', 'active', '{"test_only": true}'::jsonb);

select public.core_create_dog(
  '89000000-0000-0000-0000-000000000001',
  'Profile Test Dam',
  'Registered Profile Test Dam',
  'female',
  'cream',
  'long',
  timestamp with time zone '2022-04-01 12:00:00+00',
  'active',
  'PROFILE-TEST-DAM',
  'TEST ONLY dog profile note.'
) as dog_id \gset

select public.core_create_dog(
  '89000000-0000-0000-0000-000000000001',
  'Profile Test Sire',
  'Registered Profile Test Sire',
  'male',
  'black',
  'smooth',
  timestamp with time zone '2021-02-01 12:00:00+00',
  'active',
  'PROFILE-TEST-SIRE',
  'TEST ONLY dog profile sire note.'
) as sire_id \gset

select public.core_create_litter(
  '89000000-0000-0000-0000-000000000001',
  'Profile Test Litter',
  :'dog_id',
  :'sire_id',
  timestamp with time zone '2026-07-15 12:00:00+00',
  null,
  1,
  1,
  0,
  'expected',
  false,
  'PROFILE-TEST-LITTER',
  'TEST ONLY litter relationship note.'
) as litter_id \gset

select public.core_update_dog_profile_metadata(
  '89000000-0000-0000-0000-000000000001',
  :'dog_id',
  'dam',
  'Test Breeder',
  'VA',
  'test breeder contact',
  timestamp with time zone '2023-05-01 12:00:00+00',
  125000,
  'TEST ONLY acquisition note.',
  'AKC',
  'CKC',
  'AKC-TEST-123',
  'CKC-TEST-456',
  '985TESTMICROCHIP',
  'Embark metadata recorded; source file not uploaded.',
  'TEST ONLY color genetics note.',
  'TEST ONLY COI note.',
  'TEST ONLY certificate note.'
) as updated_dog_id;

select public.core_record_dog_health_event(
  '89000000-0000-0000-0000-000000000001',
  :'dog_id',
  'surgery',
  timestamp with time zone '2026-06-01 12:00:00+00',
  'TEST ONLY emergency surgery record',
  'TEST ONLY factual surgery note; no diagnosis.',
  'Test Vet Clinic',
  250000,
  timestamp with time zone '2026-06-15 12:00:00+00',
  'emergency',
  null
) as health_event_id \gset

select public.core_record_dog_document_metadata(
  '89000000-0000-0000-0000-000000000002',
  :'dog_id',
  'embark_report',
  'TEST ONLY Embark Report',
  null,
  'metadata_only',
  'Embark',
  timestamp with time zone '2025-01-01 12:00:00+00',
  null,
  'embark-test.pdf',
  'application/pdf',
  12345,
  'TEST ONLY metadata record; file upload not connected.'
) as dog_document_id \gset

select 'profile_metadata_check' as check_name, count(*) as matching_rows
from public.core_dogs
where id = :'dog_id'
  and metadata ->> 'profile_role' = 'dam'
  and metadata ->> 'primary_registry' = 'AKC'
  and metadata ->> 'secondary_registry' = 'CKC'
  and metadata ->> 'acquisition_price_cents' = '125000'
  and metadata ->> 'file_upload_connected' = 'false'
  and metadata ->> 'external_side_effects' = 'false';

select 'health_event_check' as check_name, count(*) as matching_rows
from public.core_dog_health_events
where id = :'health_event_id'
  and dog_id = :'dog_id'
  and event_type = 'surgery'
  and metadata ->> 'diagnosis_made' = 'false'
  and metadata ->> 'external_side_effects' = 'false'
  and metadata ->> 'customer_message_sent' = 'false';

select 'dog_document_metadata_check' as check_name, count(*) as matching_rows
from public.core_dog_documents
where id = :'dog_document_id'
  and dog_id = :'dog_id'
  and document_type = 'embark_report'
  and document_status = 'metadata_only'
  and storage_bucket is null
  and storage_path is null
  and metadata ->> 'file_upload_connected' = 'false'
  and metadata ->> 'public_link_exposed' = 'false'
  and metadata ->> 'external_side_effects' = 'false';

select 'litter_relationship_check' as check_name, count(*) as matching_rows
from public.core_litters
where id = :'litter_id'
  and dam_id = :'dog_id'
  and sire_id = :'sire_id';

select 'event_check' as check_name, count(*) as matching_rows
from public.core_events
where source in ('core_update_dog_profile_metadata', 'core_record_dog_health_event', 'core_record_dog_document_metadata')
  and related_table = 'core_dogs'
  and related_id = :'dog_id'
  and details ->> 'external_side_effects' = 'false';

select 'audit_check' as check_name, count(*) as matching_rows
from public.core_audit_log
where action in ('update_dog_profile_metadata', 'record_dog_health_event', 'record_dog_document_metadata')
  and actor_profile_id in ('89000000-0000-0000-0000-000000000001', '89000000-0000-0000-0000-000000000002')
  and request_context ->> 'external_side_effects' = 'false';

do $$
begin
  perform public.core_record_dog_health_event(
    '89000000-0000-0000-0000-000000000001',
    '89000000-0000-0000-0000-000000009999',
    'vet_visit',
    now(),
    'TEST ONLY invalid dog',
    null,
    null,
    null,
    null,
    null,
    null
  );
  raise exception 'invalid dog was not rejected for health event';
exception
  when others then
    if sqlerrm = 'invalid dog was not rejected for health event' then
      raise;
    end if;
end;
$$;

do $$
begin
  perform public.core_record_dog_health_event(
    '89000000-0000-0000-0000-000000000001',
    (select id from public.core_dogs where external_reference = 'PROFILE-TEST-DAM'),
    'diagnosis',
    now(),
    'TEST ONLY invalid type',
    null,
    null,
    null,
    null,
    null,
    null
  );
  raise exception 'invalid health event type was not rejected';
exception
  when others then
    if sqlerrm = 'invalid health event type was not rejected' then
      raise;
    end if;
end;
$$;

do $$
begin
  perform public.core_record_dog_document_metadata(
    '89000000-0000-0000-0000-000000000002',
    (select id from public.core_dogs where external_reference = 'PROFILE-TEST-DAM'),
    'public_contract',
    'TEST ONLY invalid document type',
    null,
    'metadata_only',
    null,
    null,
    null,
    null,
    null,
    null,
    null
  );
  raise exception 'invalid document type was not rejected';
exception
  when others then
    if sqlerrm = 'invalid document type was not rejected' then
      raise;
    end if;
end;
$$;

do $$
begin
  perform public.core_record_dog_document_metadata(
    '89000000-0000-0000-0000-000000000003',
    (select id from public.core_dogs where external_reference = 'PROFILE-TEST-DAM'),
    'pedigree',
    'TEST ONLY unauthorized staff document',
    null,
    'metadata_only',
    null,
    null,
    null,
    null,
    null,
    null,
    null
  );
  raise exception 'staff actor was not rejected for dog document metadata';
exception
  when others then
    if sqlerrm = 'staff actor was not rejected for dog document metadata' then
      raise;
    end if;
end;
$$;

select
  'core_dog_profile_health_registry_tests' as validated_area,
  :'health_event_id' as health_event_id,
  :'dog_document_id' as dog_document_id;

rollback;
