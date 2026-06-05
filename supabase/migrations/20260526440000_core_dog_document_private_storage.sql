-- Cherolee Core private dog document storage attachment foundation.
--
-- Business rule:
--   * Dog document files are internal owner/operator records only.
--   * The storage bucket is private.
--   * No public URLs, customer portal access, customer messages, document
--     generation, or external providers are enabled.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'dog-documents',
  'dog-documents',
  false,
  10485760,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/plain',
    'text/csv'
  ]::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

alter table public.core_dog_documents
  add column if not exists uploaded_at timestamptz,
  add column if not exists uploaded_by_profile_id uuid references public.core_profiles(id) on delete set null;

create index if not exists core_dog_documents_uploaded_at_idx on public.core_dog_documents (uploaded_at desc) where uploaded_at is not null;

create or replace function public.core_attach_dog_document_file_metadata(
  p_actor_profile_id uuid,
  p_dog_document_id uuid,
  p_storage_bucket text,
  p_storage_path text,
  p_file_name text,
  p_file_mime_type text,
  p_file_size_bytes bigint
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.core_dog_documents%rowtype;
  v_bucket text := nullif(btrim(coalesce(p_storage_bucket, '')), '');
  v_path text := nullif(btrim(coalesce(p_storage_path, '')), '');
  v_file_name text := nullif(btrim(coalesce(p_file_name, '')), '');
  v_mime text := lower(nullif(btrim(coalesce(p_file_mime_type, '')), ''));
  v_new_data jsonb;
begin
  if not public.core_dog_profile_actor_is_owner_admin(p_actor_profile_id) then
    raise exception 'owner/admin actor is required';
  end if;
  if p_dog_document_id is null then
    raise exception 'dog document id is required';
  end if;
  select * into v_existing
  from public.core_dog_documents
  where id = p_dog_document_id
  for update;
  if not found then
    raise exception 'dog document not found';
  end if;
  if v_bucket <> 'dog-documents' then
    raise exception 'invalid dog document storage bucket';
  end if;
  if v_path is null or position('..' in v_path) > 0 or v_path !~ ('^dogs/' || v_existing.dog_id::text || '/documents/' || p_dog_document_id::text || '/') then
    raise exception 'invalid dog document storage path';
  end if;
  if v_file_name is null then
    raise exception 'file name is required';
  end if;
  if v_mime not in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain', 'text/csv') then
    raise exception 'invalid dog document file type';
  end if;
  if p_file_size_bytes is null or p_file_size_bytes <= 0 or p_file_size_bytes > 10485760 then
    raise exception 'invalid dog document file size';
  end if;

  update public.core_dog_documents
  set storage_bucket = v_bucket,
      storage_path = v_path,
      file_name = v_file_name,
      file_mime_type = v_mime,
      file_size_bytes = p_file_size_bytes,
      uploaded_at = now(),
      uploaded_by_profile_id = p_actor_profile_id,
      document_status = case
        when document_status = 'metadata_only' then 'active'
        else document_status
      end,
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'metadata_only', false,
        'file_upload_connected', true,
        'private_storage', true,
        'public_link_exposed', false,
        'customer_message_sent', false,
        'external_side_effects', false
      )
  where id = p_dog_document_id;

  select to_jsonb(d) into v_new_data
  from public.core_dog_documents d
  where d.id = p_dog_document_id;

  insert into public.core_events (event_type, summary, related_table, related_id, source, details, created_by_profile_id)
  values (
    'dog_document_file_attached',
    'Private dog document file attached through controlled owner/operator workflow',
    'core_dogs',
    v_existing.dog_id,
    'core_attach_dog_document_file_metadata',
    jsonb_build_object(
      'dog_document_id', p_dog_document_id,
      'storage_bucket', v_bucket,
      'file_mime_type', v_mime,
      'file_size_bytes', p_file_size_bytes,
      'private_storage', true,
      'public_link_exposed', false,
      'customer_message_sent', false,
      'external_side_effects', false
    ),
    p_actor_profile_id
  );

  insert into public.core_audit_log (actor_type, actor_profile_id, actor_identifier, source, action, entity_table, entity_id, old_data, new_data, request_context, outcome)
  values (
    'staff_profile',
    p_actor_profile_id,
    p_actor_profile_id::text,
    'core_attach_dog_document_file_metadata',
    'attach_dog_document_file_metadata',
    'core_dog_documents',
    p_dog_document_id,
    to_jsonb(v_existing),
    v_new_data,
    jsonb_build_object(
      'dog_id', v_existing.dog_id,
      'private_storage', true,
      'public_link_exposed', false,
      'customer_message_sent', false,
      'external_side_effects', false
    ),
    'success'
  );

  return p_dog_document_id;
end;
$$;

comment on function public.core_attach_dog_document_file_metadata(uuid, uuid, text, text, text, text, bigint) is
  'Controlled internal dog document private-file metadata attachment. Uses private storage only; no public URLs, customer messages, document generation, or external providers.';
