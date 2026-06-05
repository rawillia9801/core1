-- Cherolee Core dog document private storage metadata smoke test.
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
  ('8a000000-0000-0000-0000-000000000001', 'Dog Vault Test Owner', 'dog-vault-owner@example.invalid', 'owner', 'active', '{"test_only": true}'::jsonb),
  ('8a000000-0000-0000-0000-000000000002', 'Dog Vault Test Staff', 'dog-vault-staff@example.invalid', 'staff', 'active', '{"test_only": true}'::jsonb);

select public.core_create_dog(
  '8a000000-0000-0000-0000-000000000001',
  'Vault Test Dog',
  'Registered Vault Test Dog',
  'female',
  'cream',
  'long',
  timestamp with time zone '2022-04-01 12:00:00+00',
  'active',
  'VAULT-TEST-DOG',
  'TEST ONLY dog vault note.'
) as dog_id \gset

select public.core_record_dog_document_metadata(
  '8a000000-0000-0000-0000-000000000001',
  :'dog_id',
  'pedigree',
  'TEST ONLY Pedigree Certificate',
  'AKC',
  'metadata_only',
  'Owner record',
  timestamp with time zone '2025-01-01 12:00:00+00',
  null,
  null,
  null,
  null,
  'TEST ONLY metadata before private file attachment.'
) as dog_document_id \gset

select public.core_attach_dog_document_file_metadata(
  '8a000000-0000-0000-0000-000000000001',
  :'dog_document_id',
  'dog-documents',
  'dogs/' || :'dog_id' || '/documents/' || :'dog_document_id' || '/test-pedigree.pdf',
  'test-pedigree.pdf',
  'application/pdf',
  123456
) as attached_document_id;

select 'private_bucket_check' as check_name, count(*) as matching_rows
from storage.buckets
where id = 'dog-documents'
  and public = false
  and file_size_limit = 10485760
  and allowed_mime_types @> array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']::text[];

select 'file_metadata_check' as check_name, count(*) as matching_rows
from public.core_dog_documents
where id = :'dog_document_id'
  and dog_id = :'dog_id'
  and storage_bucket = 'dog-documents'
  and storage_path = 'dogs/' || :'dog_id' || '/documents/' || :'dog_document_id' || '/test-pedigree.pdf'
  and file_name = 'test-pedigree.pdf'
  and file_mime_type = 'application/pdf'
  and file_size_bytes = 123456
  and uploaded_at is not null
  and uploaded_by_profile_id = '8a000000-0000-0000-0000-000000000001'
  and metadata ->> 'private_storage' = 'true'
  and metadata ->> 'public_link_exposed' = 'false'
  and metadata ->> 'customer_message_sent' = 'false'
  and metadata ->> 'external_side_effects' = 'false';

select 'event_check' as check_name, count(*) as matching_rows
from public.core_events
where event_type = 'dog_document_file_attached'
  and related_table = 'core_dogs'
  and related_id = :'dog_id'
  and source = 'core_attach_dog_document_file_metadata'
  and details ->> 'private_storage' = 'true'
  and details ->> 'public_link_exposed' = 'false'
  and details ->> 'external_side_effects' = 'false';

select 'audit_check' as check_name, count(*) as matching_rows
from public.core_audit_log
where action = 'attach_dog_document_file_metadata'
  and entity_table = 'core_dog_documents'
  and entity_id = :'dog_document_id'
  and request_context ->> 'private_storage' = 'true'
  and request_context ->> 'public_link_exposed' = 'false'
  and request_context ->> 'external_side_effects' = 'false';

do $$
begin
  perform public.core_record_dog_document_metadata(
    '8a000000-0000-0000-0000-000000000001',
    '8a000000-0000-0000-0000-000000009999',
    'pedigree',
    'TEST ONLY invalid dog document',
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
  raise exception 'invalid dog was not rejected';
exception
  when others then
    if sqlerrm = 'invalid dog was not rejected' then
      raise;
    end if;
end;
$$;

do $$
begin
  perform public.core_record_dog_document_metadata(
    '8a000000-0000-0000-0000-000000000001',
    (select id from public.core_dogs where external_reference = 'VAULT-TEST-DOG'),
    'executable',
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
  perform public.core_attach_dog_document_file_metadata(
    '8a000000-0000-0000-0000-000000000001',
    (select id from public.core_dog_documents where title = 'TEST ONLY Pedigree Certificate'),
    'dog-documents',
    'dogs/8a000000-0000-0000-0000-000000009999/documents/8a000000-0000-0000-0000-000000009999/wrong.pdf',
    'wrong.pdf',
    'application/pdf',
    123
  );
  raise exception 'wrong storage path was not rejected';
exception
  when others then
    if sqlerrm = 'wrong storage path was not rejected' then
      raise;
    end if;
end;
$$;

do $$
begin
  perform public.core_attach_dog_document_file_metadata(
    '8a000000-0000-0000-0000-000000000001',
    (select id from public.core_dog_documents where title = 'TEST ONLY Pedigree Certificate'),
    'dog-documents',
    'dogs/' || (select dog_id from public.core_dog_documents where title = 'TEST ONLY Pedigree Certificate') || '/documents/' || (select id from public.core_dog_documents where title = 'TEST ONLY Pedigree Certificate') || '/bad.exe',
    'bad.exe',
    'application/x-msdownload',
    123
  );
  raise exception 'invalid file type was not rejected';
exception
  when others then
    if sqlerrm = 'invalid file type was not rejected' then
      raise;
    end if;
end;
$$;

do $$
begin
  perform public.core_attach_dog_document_file_metadata(
    '8a000000-0000-0000-0000-000000000002',
    (select id from public.core_dog_documents where title = 'TEST ONLY Pedigree Certificate'),
    'dog-documents',
    'dogs/' || (select dog_id from public.core_dog_documents where title = 'TEST ONLY Pedigree Certificate') || '/documents/' || (select id from public.core_dog_documents where title = 'TEST ONLY Pedigree Certificate') || '/staff.pdf',
    'staff.pdf',
    'application/pdf',
    123
  );
  raise exception 'staff actor was not rejected';
exception
  when others then
    if sqlerrm = 'staff actor was not rejected' then
      raise;
    end if;
end;
$$;

select
  'core_dog_document_vault_tests' as validated_area,
  :'dog_document_id' as dog_document_id;

rollback;
