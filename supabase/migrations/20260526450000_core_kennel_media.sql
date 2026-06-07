-- Cherolee Core private kennel media foundation.
--
-- Business rule:
--   * Dog and puppy photos are internal owner/operator records only.
--   * The storage bucket is private.
--   * No public puppy publishing, customer portal media, customer messages,
--     external providers, AI, documents, payments, or device integrations are
--     enabled by this foundation.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'kennel-media',
  'kennel-media',
  false,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp'
  ]::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.core_kennel_media (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  dog_id uuid references public.core_dogs(id) on delete cascade,
  puppy_id uuid references public.core_puppies(id) on delete cascade,
  media_type text not null default 'photo',
  title text,
  file_name text not null,
  file_mime_type text not null,
  file_size_bytes bigint not null,
  storage_bucket text not null default 'kennel-media',
  storage_path text not null,
  is_primary boolean not null default false,
  visibility text not null default 'internal',
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  uploaded_by_profile_id uuid references public.core_profiles(id) on delete set null,
  uploaded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint core_kennel_media_entity_type_check check (entity_type in ('dog', 'puppy')),
  constraint core_kennel_media_entity_match_check check (
    (entity_type = 'dog' and dog_id is not null and puppy_id is null)
    or
    (entity_type = 'puppy' and puppy_id is not null and dog_id is null)
  ),
  constraint core_kennel_media_type_check check (media_type = 'photo'),
  constraint core_kennel_media_visibility_check check (visibility = 'internal'),
  constraint core_kennel_media_bucket_check check (storage_bucket = 'kennel-media'),
  constraint core_kennel_media_mime_check check (file_mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  constraint core_kennel_media_size_check check (file_size_bytes > 0 and file_size_bytes <= 10485760),
  constraint core_kennel_media_storage_path_unique unique (storage_path)
);

comment on table public.core_kennel_media is
  'Internal private dog/puppy photo metadata. Signed owner/operator review only; no public URLs, publishing, customer portal, messages, AI, devices, or external providers.';

drop trigger if exists core_kennel_media_set_updated_at on public.core_kennel_media;
create trigger core_kennel_media_set_updated_at before update on public.core_kennel_media
for each row execute function public.core_set_updated_at();

create index if not exists core_kennel_media_dog_idx on public.core_kennel_media (dog_id, uploaded_at desc) where dog_id is not null;
create index if not exists core_kennel_media_puppy_idx on public.core_kennel_media (puppy_id, uploaded_at desc) where puppy_id is not null;
create index if not exists core_kennel_media_primary_dog_idx on public.core_kennel_media (dog_id) where is_primary and dog_id is not null;
create index if not exists core_kennel_media_primary_puppy_idx on public.core_kennel_media (puppy_id) where is_primary and puppy_id is not null;

create or replace function public.core_record_kennel_media_metadata(
  p_actor_profile_id uuid,
  p_entity_type text,
  p_dog_id uuid,
  p_puppy_id uuid,
  p_storage_bucket text,
  p_storage_path text,
  p_file_name text,
  p_file_mime_type text,
  p_file_size_bytes bigint,
  p_title text default null,
  p_notes text default null,
  p_is_primary boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entity_type text := lower(nullif(btrim(coalesce(p_entity_type, '')), ''));
  v_bucket text := nullif(btrim(coalesce(p_storage_bucket, '')), '');
  v_path text := nullif(btrim(coalesce(p_storage_path, '')), '');
  v_file_name text := nullif(btrim(coalesce(p_file_name, '')), '');
  v_mime text := lower(nullif(btrim(coalesce(p_file_mime_type, '')), ''));
  v_title text := nullif(btrim(coalesce(p_title, '')), '');
  v_notes text := nullif(btrim(coalesce(p_notes, '')), '');
  v_media_id uuid;
  v_related_table text;
  v_related_id uuid;
  v_new_data jsonb;
begin
  if not public.core_dog_profile_actor_is_owner_admin(p_actor_profile_id) then
    raise exception 'owner/admin actor is required';
  end if;
  if v_entity_type not in ('dog', 'puppy') then
    raise exception 'invalid kennel media entity type';
  end if;
  if v_entity_type = 'dog' and (p_dog_id is null or p_puppy_id is not null) then
    raise exception 'dog media requires dog id only';
  end if;
  if v_entity_type = 'puppy' and (p_puppy_id is null or p_dog_id is not null) then
    raise exception 'puppy media requires puppy id only';
  end if;
  if v_entity_type = 'dog' and not exists (select 1 from public.core_dogs where id = p_dog_id) then
    raise exception 'dog not found';
  end if;
  if v_entity_type = 'puppy' and not exists (select 1 from public.core_puppies where id = p_puppy_id) then
    raise exception 'puppy not found';
  end if;
  if v_bucket <> 'kennel-media' then
    raise exception 'invalid kennel media storage bucket';
  end if;
  if v_path is null or position('..' in v_path) > 0 then
    raise exception 'invalid kennel media storage path';
  end if;
  if v_entity_type = 'dog' and v_path !~ ('^dogs/' || p_dog_id::text || '/photos/') then
    raise exception 'invalid dog media storage path';
  end if;
  if v_entity_type = 'puppy' and v_path !~ ('^puppies/' || p_puppy_id::text || '/photos/') then
    raise exception 'invalid puppy media storage path';
  end if;
  if v_file_name is null then
    raise exception 'file name is required';
  end if;
  if v_mime not in ('image/jpeg', 'image/png', 'image/webp') then
    raise exception 'invalid kennel media file type';
  end if;
  if p_file_size_bytes is null or p_file_size_bytes <= 0 or p_file_size_bytes > 10485760 then
    raise exception 'invalid kennel media file size';
  end if;

  if coalesce(p_is_primary, false) then
    update public.core_kennel_media
    set is_primary = false
    where (v_entity_type = 'dog' and dog_id = p_dog_id)
       or (v_entity_type = 'puppy' and puppy_id = p_puppy_id);
  end if;

  insert into public.core_kennel_media (
    entity_type,
    dog_id,
    puppy_id,
    title,
    file_name,
    file_mime_type,
    file_size_bytes,
    storage_bucket,
    storage_path,
    is_primary,
    visibility,
    notes,
    metadata,
    uploaded_by_profile_id
  ) values (
    v_entity_type,
    case when v_entity_type = 'dog' then p_dog_id else null end,
    case when v_entity_type = 'puppy' then p_puppy_id else null end,
    v_title,
    v_file_name,
    v_mime,
    p_file_size_bytes,
    v_bucket,
    v_path,
    coalesce(p_is_primary, false),
    'internal',
    v_notes,
    jsonb_build_object(
      'private_storage', true,
      'signed_url_required', true,
      'public_link_exposed', false,
      'customer_message_sent', false,
      'public_publishing_enabled', false,
      'external_side_effects', false
    ),
    p_actor_profile_id
  )
  returning id into v_media_id;

  v_related_table := case when v_entity_type = 'dog' then 'core_dogs' else 'core_puppies' end;
  v_related_id := case when v_entity_type = 'dog' then p_dog_id else p_puppy_id end;

  select to_jsonb(m) into v_new_data
  from public.core_kennel_media m
  where m.id = v_media_id;

  insert into public.core_events (
    event_type,
    summary,
    puppy_id,
    related_table,
    related_id,
    source,
    details,
    created_by_profile_id
  ) values (
    'kennel_media_uploaded',
    'Private internal kennel photo metadata recorded through controlled owner/operator workflow',
    case when v_entity_type = 'puppy' then p_puppy_id else null end,
    v_related_table,
    v_related_id,
    'core_record_kennel_media_metadata',
    jsonb_build_object(
      'kennel_media_id', v_media_id,
      'entity_type', v_entity_type,
      'storage_bucket', v_bucket,
      'file_mime_type', v_mime,
      'file_size_bytes', p_file_size_bytes,
      'is_primary', coalesce(p_is_primary, false),
      'private_storage', true,
      'signed_url_required', true,
      'public_link_exposed', false,
      'customer_message_sent', false,
      'public_publishing_enabled', false,
      'external_side_effects', false
    ),
    p_actor_profile_id
  );

  insert into public.core_audit_log (
    actor_type,
    actor_profile_id,
    actor_identifier,
    source,
    action,
    entity_table,
    entity_id,
    new_data,
    request_context,
    outcome
  ) values (
    'staff_profile',
    p_actor_profile_id,
    p_actor_profile_id::text,
    'core_record_kennel_media_metadata',
    'record_kennel_media_metadata',
    'core_kennel_media',
    v_media_id,
    v_new_data,
    jsonb_build_object(
      'entity_type', v_entity_type,
      'related_table', v_related_table,
      'related_id', v_related_id,
      'private_storage', true,
      'signed_url_required', true,
      'public_link_exposed', false,
      'customer_message_sent', false,
      'public_publishing_enabled', false,
      'external_side_effects', false
    ),
    'success'
  );

  return v_media_id;
end;
$$;

comment on function public.core_record_kennel_media_metadata(uuid, text, uuid, uuid, text, text, text, text, bigint, text, text, boolean) is
  'Controlled internal dog/puppy photo metadata recording. Private storage only; no public URLs, publishing, customer messages, AI, devices, or external providers.';
