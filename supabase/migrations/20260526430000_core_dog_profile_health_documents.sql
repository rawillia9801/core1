-- Cherolee Core dog profile health/document metadata workflows.
--
-- Business rule:
--   * These records are internal owner/operator dog recordkeeping only.
--   * They do not diagnose animals, replace veterinary care, upload files,
--     expose public links, publish listings, message customers, generate
--     documents, or call external providers.
--   * Controlled RPCs validate owner/admin actor context and write
--     core_events plus core_audit_log rows.

create table if not exists public.core_dog_health_events (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.core_dogs(id) on delete cascade,
  event_type text not null,
  event_date timestamptz not null,
  title text not null,
  description text,
  veterinarian_or_clinic text,
  cost_cents integer,
  follow_up_date timestamptz,
  severity text,
  document_id uuid references public.core_documents(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_by_profile_id uuid references public.core_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint core_dog_health_events_type_check check (
    event_type in (
      'vet_visit',
      'vaccine',
      'surgery',
      'birth_complication',
      'reproductive',
      'medication',
      'injury',
      'general_health_note',
      'other'
    )
  ),
  constraint core_dog_health_events_cost_check check (cost_cents is null or cost_cents >= 0),
  constraint core_dog_health_events_severity_check check (
    severity is null or severity in ('low', 'watch', 'moderate', 'high', 'emergency', 'unknown')
  )
);

comment on table public.core_dog_health_events is 'Internal dog health/vet/care event metadata. Observation record only; no diagnosis, customer messaging, uploads, or external provider behavior.';

drop trigger if exists core_dog_health_events_set_updated_at on public.core_dog_health_events;
create trigger core_dog_health_events_set_updated_at before update on public.core_dog_health_events
for each row execute function public.core_set_updated_at();

create index if not exists core_dog_health_events_dog_date_idx on public.core_dog_health_events (dog_id, event_date desc);
create index if not exists core_dog_health_events_type_idx on public.core_dog_health_events (event_type, event_date desc);

create table if not exists public.core_dog_documents (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.core_dogs(id) on delete cascade,
  document_type text not null,
  title text not null,
  registry text,
  document_status text not null default 'metadata_only',
  report_source text,
  issued_at timestamptz,
  expires_at timestamptz,
  file_name text,
  file_mime_type text,
  file_size_bytes bigint,
  storage_bucket text,
  storage_path text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by_profile_id uuid references public.core_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint core_dog_documents_type_check check (
    document_type in (
      'genetic_test',
      'embark_report',
      'pedigree',
      'akc_registration',
      'ckc_registration',
      'aca_registration',
      'dual_registration',
      'vaccine_record',
      'health_certificate',
      'surgery_record',
      'emergency_vet_record',
      'acquisition_record',
      'microchip_record',
      'other'
    )
  ),
  constraint core_dog_documents_status_check check (
    document_status in ('metadata_only', 'pending', 'active', 'expired', 'archived', 'review_needed')
  ),
  constraint core_dog_documents_size_check check (file_size_bytes is null or file_size_bytes >= 0)
);

comment on table public.core_dog_documents is 'Internal dog-linked document/report/certificate metadata. File upload/storage is not connected by this table.';

drop trigger if exists core_dog_documents_set_updated_at on public.core_dog_documents;
create trigger core_dog_documents_set_updated_at before update on public.core_dog_documents
for each row execute function public.core_set_updated_at();

create index if not exists core_dog_documents_dog_type_idx on public.core_dog_documents (dog_id, document_type);
create index if not exists core_dog_documents_status_idx on public.core_dog_documents (document_status, updated_at desc);

create or replace function public.core_dog_profile_actor_is_owner_admin(p_actor_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.core_profiles p
    where p.id = p_actor_profile_id
      and p.status = 'active'
      and p.role in ('owner', 'admin')
  );
$$;

create or replace function public.core_record_dog_health_event(
  p_actor_profile_id uuid,
  p_dog_id uuid,
  p_event_type text,
  p_event_date timestamptz,
  p_title text,
  p_description text default null,
  p_veterinarian_or_clinic text default null,
  p_cost_cents integer default null,
  p_follow_up_date timestamptz default null,
  p_severity text default null,
  p_document_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_event_type text := lower(nullif(btrim(coalesce(p_event_type, '')), ''));
  v_title text := nullif(btrim(coalesce(p_title, '')), '');
  v_description text := nullif(btrim(coalesce(p_description, '')), '');
  v_vet text := nullif(btrim(coalesce(p_veterinarian_or_clinic, '')), '');
  v_severity text := lower(nullif(btrim(coalesce(p_severity, '')), ''));
  v_new_data jsonb;
begin
  if not public.core_dog_profile_actor_is_owner_admin(p_actor_profile_id) then
    raise exception 'owner/admin actor is required';
  end if;
  if p_dog_id is null or not exists (select 1 from public.core_dogs where id = p_dog_id) then
    raise exception 'dog not found';
  end if;
  if v_event_type not in ('vet_visit', 'vaccine', 'surgery', 'birth_complication', 'reproductive', 'medication', 'injury', 'general_health_note', 'other') then
    raise exception 'invalid dog health event type';
  end if;
  if p_event_date is null then
    raise exception 'event date is required';
  end if;
  if v_title is null then
    raise exception 'health event title is required';
  end if;
  if p_cost_cents is not null and p_cost_cents < 0 then
    raise exception 'cost cannot be negative';
  end if;
  if v_severity is not null and v_severity not in ('low', 'watch', 'moderate', 'high', 'emergency', 'unknown') then
    raise exception 'invalid health event severity';
  end if;
  if p_document_id is not null and not exists (select 1 from public.core_documents where id = p_document_id) then
    raise exception 'linked document not found';
  end if;

  insert into public.core_dog_health_events (
    dog_id,
    event_type,
    event_date,
    title,
    description,
    veterinarian_or_clinic,
    cost_cents,
    follow_up_date,
    severity,
    document_id,
    metadata,
    created_by_profile_id
  ) values (
    p_dog_id,
    v_event_type,
    p_event_date,
    v_title,
    v_description,
    v_vet,
    p_cost_cents,
    p_follow_up_date,
    v_severity,
    p_document_id,
    jsonb_build_object(
      'recordkeeping_only', true,
      'diagnosis_made', false,
      'external_side_effects', false,
      'customer_message_sent', false,
      'public_listing_changed', false
    ),
    p_actor_profile_id
  ) returning id into v_event_id;

  select to_jsonb(h) into v_new_data from public.core_dog_health_events h where h.id = v_event_id;

  insert into public.core_events (event_type, event_at, summary, related_table, related_id, source, details, created_by_profile_id)
  values (
    'dog_health_event_recorded',
    p_event_date,
    'Dog health record added through controlled owner/operator workflow',
    'core_dogs',
    p_dog_id,
    'core_record_dog_health_event',
    jsonb_build_object('dog_health_event_id', v_event_id, 'event_type', v_event_type, 'diagnosis_made', false, 'external_side_effects', false),
    p_actor_profile_id
  );

  insert into public.core_audit_log (actor_type, actor_profile_id, actor_identifier, source, action, entity_table, entity_id, old_data, new_data, request_context, outcome)
  values (
    'staff_profile',
    p_actor_profile_id,
    p_actor_profile_id::text,
    'core_record_dog_health_event',
    'record_dog_health_event',
    'core_dog_health_events',
    v_event_id,
    null,
    v_new_data,
    jsonb_build_object('dog_id', p_dog_id, 'diagnosis_made', false, 'external_side_effects', false),
    'success'
  );

  return v_event_id;
end;
$$;

create or replace function public.core_record_dog_document_metadata(
  p_actor_profile_id uuid,
  p_dog_id uuid,
  p_document_type text,
  p_title text,
  p_registry text default null,
  p_document_status text default 'metadata_only',
  p_report_source text default null,
  p_issued_at timestamptz default null,
  p_expires_at timestamptz default null,
  p_file_name text default null,
  p_file_mime_type text default null,
  p_file_size_bytes bigint default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_document_id uuid;
  v_document_type text := lower(nullif(btrim(coalesce(p_document_type, '')), ''));
  v_title text := nullif(btrim(coalesce(p_title, '')), '');
  v_registry text := nullif(btrim(coalesce(p_registry, '')), '');
  v_status text := lower(nullif(btrim(coalesce(p_document_status, '')), ''));
  v_report_source text := nullif(btrim(coalesce(p_report_source, '')), '');
  v_file_name text := nullif(btrim(coalesce(p_file_name, '')), '');
  v_file_mime_type text := nullif(btrim(coalesce(p_file_mime_type, '')), '');
  v_notes text := nullif(btrim(coalesce(p_notes, '')), '');
  v_new_data jsonb;
begin
  if not public.core_dog_profile_actor_is_owner_admin(p_actor_profile_id) then
    raise exception 'owner/admin actor is required';
  end if;
  if p_dog_id is null or not exists (select 1 from public.core_dogs where id = p_dog_id) then
    raise exception 'dog not found';
  end if;
  if v_document_type not in ('genetic_test', 'embark_report', 'pedigree', 'akc_registration', 'ckc_registration', 'aca_registration', 'dual_registration', 'vaccine_record', 'health_certificate', 'surgery_record', 'emergency_vet_record', 'acquisition_record', 'microchip_record', 'other') then
    raise exception 'invalid dog document type';
  end if;
  if v_title is null then
    raise exception 'document title is required';
  end if;
  if v_status is null then
    v_status := 'metadata_only';
  end if;
  if v_status not in ('metadata_only', 'pending', 'active', 'expired', 'archived', 'review_needed') then
    raise exception 'invalid dog document status';
  end if;
  if p_file_size_bytes is not null and p_file_size_bytes < 0 then
    raise exception 'file size cannot be negative';
  end if;

  insert into public.core_dog_documents (
    dog_id,
    document_type,
    title,
    registry,
    document_status,
    report_source,
    issued_at,
    expires_at,
    file_name,
    file_mime_type,
    file_size_bytes,
    storage_bucket,
    storage_path,
    notes,
    metadata,
    created_by_profile_id
  ) values (
    p_dog_id,
    v_document_type,
    v_title,
    v_registry,
    v_status,
    v_report_source,
    p_issued_at,
    p_expires_at,
    v_file_name,
    v_file_mime_type,
    p_file_size_bytes,
    null,
    null,
    v_notes,
    jsonb_build_object(
      'metadata_only', true,
      'file_upload_connected', false,
      'public_link_exposed', false,
      'external_side_effects', false,
      'customer_message_sent', false
    ),
    p_actor_profile_id
  ) returning id into v_document_id;

  select to_jsonb(d) into v_new_data from public.core_dog_documents d where d.id = v_document_id;

  insert into public.core_events (event_type, summary, related_table, related_id, source, details, created_by_profile_id)
  values (
    'dog_document_metadata_recorded',
    'Dog document metadata added through controlled owner/operator workflow',
    'core_dogs',
    p_dog_id,
    'core_record_dog_document_metadata',
    jsonb_build_object('dog_document_id', v_document_id, 'document_type', v_document_type, 'metadata_only', true, 'public_link_exposed', false, 'external_side_effects', false),
    p_actor_profile_id
  );

  insert into public.core_audit_log (actor_type, actor_profile_id, actor_identifier, source, action, entity_table, entity_id, old_data, new_data, request_context, outcome)
  values (
    'staff_profile',
    p_actor_profile_id,
    p_actor_profile_id::text,
    'core_record_dog_document_metadata',
    'record_dog_document_metadata',
    'core_dog_documents',
    v_document_id,
    null,
    v_new_data,
    jsonb_build_object('dog_id', p_dog_id, 'metadata_only', true, 'public_link_exposed', false, 'external_side_effects', false),
    'success'
  );

  return v_document_id;
end;
$$;

create or replace function public.core_update_dog_profile_metadata(
  p_actor_profile_id uuid,
  p_dog_id uuid,
  p_role text default null,
  p_acquired_from_name text default null,
  p_acquired_from_state text default null,
  p_acquired_from_contact text default null,
  p_acquisition_date timestamptz default null,
  p_acquisition_price_cents integer default null,
  p_acquisition_notes text default null,
  p_primary_registry text default null,
  p_secondary_registry text default null,
  p_registration_number text default null,
  p_secondary_registration_number text default null,
  p_microchip_number text default null,
  p_genetic_testing_summary text default null,
  p_color_coat_genetics_notes text default null,
  p_coi_notes text default null,
  p_certificate_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.core_dogs%rowtype;
  v_role text := lower(nullif(btrim(coalesce(p_role, '')), ''));
  v_new_metadata jsonb;
  v_new_data jsonb;
begin
  if not public.core_dog_profile_actor_is_owner_admin(p_actor_profile_id) then
    raise exception 'owner/admin actor is required';
  end if;
  if p_dog_id is null then
    raise exception 'dog id is required';
  end if;
  select * into v_existing from public.core_dogs where id = p_dog_id;
  if not found then
    raise exception 'dog not found';
  end if;
  if v_role is not null and v_role not in ('dam', 'sire', 'active', 'retired', 'breeding_candidate', 'other') then
    raise exception 'invalid dog profile role';
  end if;
  if p_acquisition_price_cents is not null and p_acquisition_price_cents < 0 then
    raise exception 'acquisition price cannot be negative';
  end if;

  v_new_metadata := coalesce(v_existing.metadata, '{}'::jsonb)
    || jsonb_build_object(
      'profile_role', v_role,
      'acquired_from_name', nullif(btrim(coalesce(p_acquired_from_name, '')), ''),
      'acquired_from_state', nullif(btrim(coalesce(p_acquired_from_state, '')), ''),
      'acquired_from_contact', nullif(btrim(coalesce(p_acquired_from_contact, '')), ''),
      'acquisition_date', p_acquisition_date,
      'acquisition_price_cents', p_acquisition_price_cents,
      'acquisition_notes', nullif(btrim(coalesce(p_acquisition_notes, '')), ''),
      'primary_registry', nullif(btrim(coalesce(p_primary_registry, '')), ''),
      'secondary_registry', nullif(btrim(coalesce(p_secondary_registry, '')), ''),
      'registration_number', nullif(btrim(coalesce(p_registration_number, '')), ''),
      'secondary_registration_number', nullif(btrim(coalesce(p_secondary_registration_number, '')), ''),
      'microchip_number', nullif(btrim(coalesce(p_microchip_number, '')), ''),
      'genetic_testing_summary', nullif(btrim(coalesce(p_genetic_testing_summary, '')), ''),
      'color_coat_genetics_notes', nullif(btrim(coalesce(p_color_coat_genetics_notes, '')), ''),
      'coi_notes', nullif(btrim(coalesce(p_coi_notes, '')), ''),
      'certificate_notes', nullif(btrim(coalesce(p_certificate_notes, '')), ''),
      'profile_metadata_updated_by_tool', 'core_update_dog_profile_metadata',
      'profile_metadata_updated_by_profile_id', p_actor_profile_id,
      'external_side_effects', false,
      'file_upload_connected', false
    );

  update public.core_dogs
  set metadata = v_new_metadata
  where id = p_dog_id;

  select to_jsonb(d) into v_new_data from public.core_dogs d where d.id = p_dog_id;

  insert into public.core_events (event_type, summary, related_table, related_id, source, details, created_by_profile_id)
  values (
    'dog_profile_metadata_updated',
    'Dog registry/acquisition/profile metadata updated through controlled owner/operator workflow',
    'core_dogs',
    p_dog_id,
    'core_update_dog_profile_metadata',
    jsonb_build_object('profile_role', v_role, 'external_side_effects', false, 'file_upload_connected', false),
    p_actor_profile_id
  );

  insert into public.core_audit_log (actor_type, actor_profile_id, actor_identifier, source, action, entity_table, entity_id, old_data, new_data, request_context, outcome)
  values (
    'staff_profile',
    p_actor_profile_id,
    p_actor_profile_id::text,
    'core_update_dog_profile_metadata',
    'update_dog_profile_metadata',
    'core_dogs',
    p_dog_id,
    to_jsonb(v_existing),
    v_new_data,
    jsonb_build_object('external_side_effects', false, 'file_upload_connected', false),
    'success'
  );

  return p_dog_id;
end;
$$;

comment on function public.core_record_dog_health_event(uuid, uuid, text, timestamptz, text, text, text, integer, timestamptz, text, uuid) is
  'Controlled internal dog health event recording. Observation record only; no diagnosis or external side effects.';
comment on function public.core_record_dog_document_metadata(uuid, uuid, text, text, text, text, text, timestamptz, timestamptz, text, text, bigint, text) is
  'Controlled internal dog document metadata recording. No upload, public URL, customer message, document generation, or external provider.';
comment on function public.core_update_dog_profile_metadata(uuid, uuid, text, text, text, text, timestamptz, integer, text, text, text, text, text, text, text, text, text, text) is
  'Controlled internal dog acquisition, registry, genetic testing, and certification metadata update. No external side effects.';
