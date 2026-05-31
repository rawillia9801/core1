-- Cherolee Core kennel update/archive workflows.
--
-- Business rule:
--   * These functions update/archive real Core dog, litter, and puppy records.
--   * Archive-style actions do not hard-delete linked history.
--   * They do not send customer messages, generate documents, move payments,
--     update public websites, or touch external systems.
--   * Every action writes core_events and core_audit_log.

create or replace function public.core_update_dog(
  p_dog_id uuid,
  p_actor_profile_id uuid,
  p_call_name text default null,
  p_registered_name text default null,
  p_sex text default null,
  p_color text default null,
  p_coat_type text default null,
  p_birth_at timestamptz default null,
  p_status text default 'active',
  p_external_reference text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.core_dogs%rowtype;
  v_call_name text := nullif(btrim(coalesce(p_call_name, '')), '');
  v_registered_name text := nullif(btrim(coalesce(p_registered_name, '')), '');
  v_sex text := lower(nullif(btrim(coalesce(p_sex, '')), ''));
  v_color text := nullif(btrim(coalesce(p_color, '')), '');
  v_coat_type text := nullif(btrim(coalesce(p_coat_type, '')), '');
  v_status text := lower(nullif(btrim(coalesce(p_status, '')), ''));
  v_external_reference text := nullif(btrim(coalesce(p_external_reference, '')), '');
  v_notes text := nullif(btrim(coalesce(p_notes, '')), '');
  v_new_data jsonb;
begin
  if p_actor_profile_id is null then raise exception 'actor profile is required'; end if;
  if p_dog_id is null then raise exception 'dog id is required'; end if;

  select * into v_existing from public.core_dogs where id = p_dog_id;
  if not found then raise exception 'dog not found'; end if;

  if v_call_name is null and v_registered_name is null then raise exception 'dog name is required'; end if;
  if v_sex is not null and v_sex not in ('female', 'male', 'unknown') then raise exception 'invalid dog sex'; end if;
  if v_status is null then v_status := 'active'; end if;
  if v_status not in ('active', 'inactive', 'retired', 'hold', 'deceased') then raise exception 'invalid dog status'; end if;

  update public.core_dogs
  set external_reference = v_external_reference,
      registered_name = v_registered_name,
      call_name = v_call_name,
      sex = v_sex,
      color = v_color,
      coat_type = v_coat_type,
      birth_at = p_birth_at,
      status = v_status,
      notes = v_notes,
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'last_updated_by_tool', 'core_update_dog',
        'last_updated_by_profile_id', p_actor_profile_id,
        'external_side_effects', false
      )
  where id = p_dog_id;

  select to_jsonb(d) into v_new_data from public.core_dogs d where d.id = p_dog_id;

  insert into public.core_events (event_type, summary, related_table, related_id, source, details, created_by_profile_id)
  values ('dog_updated', 'Dog record updated through controlled staff workflow', 'core_dogs', p_dog_id, 'core_update_dog', jsonb_build_object('status', v_status, 'external_side_effects', false), p_actor_profile_id);

  insert into public.core_audit_log (actor_type, actor_profile_id, actor_identifier, source, action, entity_table, entity_id, old_data, new_data, request_context, outcome)
  values ('staff_profile', p_actor_profile_id, p_actor_profile_id::text, 'core_update_dog', 'update_dog', 'core_dogs', p_dog_id, to_jsonb(v_existing), v_new_data, jsonb_build_object('external_side_effects', false), 'success');

  return p_dog_id;
end;
$$;

create or replace function public.core_archive_dog(p_dog_id uuid, p_actor_profile_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.core_dogs%rowtype;
  v_new_data jsonb;
begin
  if p_actor_profile_id is null then raise exception 'actor profile is required'; end if;
  if p_dog_id is null then raise exception 'dog id is required'; end if;

  select * into v_existing from public.core_dogs where id = p_dog_id;
  if not found then raise exception 'dog not found'; end if;

  update public.core_dogs
  set status = 'inactive',
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'last_updated_by_tool', 'core_archive_dog',
        'last_updated_by_profile_id', p_actor_profile_id,
        'archive_style_delete', true,
        'external_side_effects', false
      )
  where id = p_dog_id;

  select to_jsonb(d) into v_new_data from public.core_dogs d where d.id = p_dog_id;

  insert into public.core_events (event_type, summary, related_table, related_id, source, details, created_by_profile_id)
  values ('dog_archived', 'Dog record marked inactive through controlled staff workflow', 'core_dogs', p_dog_id, 'core_archive_dog', jsonb_build_object('archive_style_delete', true, 'external_side_effects', false), p_actor_profile_id);

  insert into public.core_audit_log (actor_type, actor_profile_id, actor_identifier, source, action, entity_table, entity_id, old_data, new_data, request_context, outcome)
  values ('staff_profile', p_actor_profile_id, p_actor_profile_id::text, 'core_archive_dog', 'archive_dog', 'core_dogs', p_dog_id, to_jsonb(v_existing), v_new_data, jsonb_build_object('archive_style_delete', true, 'external_side_effects', false), 'success');

  return p_dog_id;
end;
$$;

create or replace function public.core_update_litter(
  p_litter_id uuid,
  p_actor_profile_id uuid,
  p_litter_name text default null,
  p_dam_id uuid default null,
  p_sire_id uuid default null,
  p_expected_birth_at timestamptz default null,
  p_birth_at timestamptz default null,
  p_total_puppies integer default null,
  p_female_count integer default null,
  p_male_count integer default null,
  p_status text default 'planned',
  p_details_pending boolean default false,
  p_external_reference text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.core_litters%rowtype;
  v_litter_name text := nullif(btrim(coalesce(p_litter_name, '')), '');
  v_status text := lower(nullif(btrim(coalesce(p_status, '')), ''));
  v_external_reference text := nullif(btrim(coalesce(p_external_reference, '')), '');
  v_notes text := nullif(btrim(coalesce(p_notes, '')), '');
  v_new_data jsonb;
begin
  if p_actor_profile_id is null then raise exception 'actor profile is required'; end if;
  if p_litter_id is null then raise exception 'litter id is required'; end if;

  select * into v_existing from public.core_litters where id = p_litter_id;
  if not found then raise exception 'litter not found'; end if;
  if p_dam_id is not null and not exists (select 1 from public.core_dogs where id = p_dam_id) then raise exception 'dam not found'; end if;
  if p_sire_id is not null and not exists (select 1 from public.core_dogs where id = p_sire_id) then raise exception 'sire not found'; end if;
  if p_dam_id is not null and p_sire_id is not null and p_dam_id = p_sire_id then raise exception 'dam and sire cannot be the same dog'; end if;
  if p_total_puppies is not null and p_total_puppies < 0 then raise exception 'total puppies cannot be negative'; end if;
  if p_female_count is not null and p_female_count < 0 then raise exception 'female count cannot be negative'; end if;
  if p_male_count is not null and p_male_count < 0 then raise exception 'male count cannot be negative'; end if;
  if p_total_puppies is not null and (coalesce(p_female_count, 0) + coalesce(p_male_count, 0)) > p_total_puppies then raise exception 'female and male counts cannot exceed total puppies'; end if;
  if v_status is null then v_status := 'planned'; end if;
  if v_status not in ('planned', 'expected', 'born', 'active', 'closed', 'archived') then raise exception 'invalid litter status'; end if;

  update public.core_litters
  set external_reference = v_external_reference,
      litter_name = v_litter_name,
      dam_id = p_dam_id,
      sire_id = p_sire_id,
      expected_birth_at = p_expected_birth_at,
      birth_at = p_birth_at,
      total_puppies = p_total_puppies,
      female_count = p_female_count,
      male_count = p_male_count,
      status = v_status,
      details_pending = coalesce(p_details_pending, false),
      notes = v_notes,
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('last_updated_by_tool', 'core_update_litter', 'last_updated_by_profile_id', p_actor_profile_id, 'external_side_effects', false)
  where id = p_litter_id;

  select to_jsonb(l) into v_new_data from public.core_litters l where l.id = p_litter_id;

  insert into public.core_events (event_type, summary, related_table, related_id, source, details, created_by_profile_id)
  values ('litter_updated', 'Litter record updated through controlled staff workflow', 'core_litters', p_litter_id, 'core_update_litter', jsonb_build_object('status', v_status, 'external_side_effects', false), p_actor_profile_id);

  insert into public.core_audit_log (actor_type, actor_profile_id, actor_identifier, source, action, entity_table, entity_id, old_data, new_data, request_context, outcome)
  values ('staff_profile', p_actor_profile_id, p_actor_profile_id::text, 'core_update_litter', 'update_litter', 'core_litters', p_litter_id, to_jsonb(v_existing), v_new_data, jsonb_build_object('external_side_effects', false), 'success');

  return p_litter_id;
end;
$$;

create or replace function public.core_archive_litter(p_litter_id uuid, p_actor_profile_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.core_litters%rowtype;
  v_new_data jsonb;
begin
  if p_actor_profile_id is null then raise exception 'actor profile is required'; end if;
  if p_litter_id is null then raise exception 'litter id is required'; end if;

  select * into v_existing from public.core_litters where id = p_litter_id;
  if not found then raise exception 'litter not found'; end if;

  update public.core_litters
  set status = 'archived',
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('last_updated_by_tool', 'core_archive_litter', 'last_updated_by_profile_id', p_actor_profile_id, 'archive_style_delete', true, 'external_side_effects', false)
  where id = p_litter_id;

  select to_jsonb(l) into v_new_data from public.core_litters l where l.id = p_litter_id;

  insert into public.core_events (event_type, summary, related_table, related_id, source, details, created_by_profile_id)
  values ('litter_archived', 'Litter record archived through controlled staff workflow', 'core_litters', p_litter_id, 'core_archive_litter', jsonb_build_object('archive_style_delete', true, 'external_side_effects', false), p_actor_profile_id);

  insert into public.core_audit_log (actor_type, actor_profile_id, actor_identifier, source, action, entity_table, entity_id, old_data, new_data, request_context, outcome)
  values ('staff_profile', p_actor_profile_id, p_actor_profile_id::text, 'core_archive_litter', 'archive_litter', 'core_litters', p_litter_id, to_jsonb(v_existing), v_new_data, jsonb_build_object('archive_style_delete', true, 'external_side_effects', false), 'success');

  return p_litter_id;
end;
$$;

create or replace function public.core_update_puppy(
  p_puppy_id uuid,
  p_actor_profile_id uuid,
  p_litter_id uuid default null,
  p_name text default null,
  p_collar_color text default null,
  p_sex text default null,
  p_color text default null,
  p_coat_type text default null,
  p_birth_at timestamptz default null,
  p_status text default 'unavailable',
  p_health_status text default null,
  p_public_listing_status text default 'private',
  p_external_reference text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.core_puppies%rowtype;
  v_name text := nullif(btrim(coalesce(p_name, '')), '');
  v_collar_color text := nullif(btrim(coalesce(p_collar_color, '')), '');
  v_sex text := lower(nullif(btrim(coalesce(p_sex, '')), ''));
  v_color text := nullif(btrim(coalesce(p_color, '')), '');
  v_coat_type text := nullif(btrim(coalesce(p_coat_type, '')), '');
  v_status text := lower(nullif(btrim(coalesce(p_status, '')), ''));
  v_health_status text := nullif(btrim(coalesce(p_health_status, '')), '');
  v_public_listing_status text := lower(nullif(btrim(coalesce(p_public_listing_status, '')), ''));
  v_external_reference text := nullif(btrim(coalesce(p_external_reference, '')), '');
  v_notes text := nullif(btrim(coalesce(p_notes, '')), '');
  v_new_data jsonb;
begin
  if p_actor_profile_id is null then raise exception 'actor profile is required'; end if;
  if p_puppy_id is null then raise exception 'puppy id is required'; end if;

  select * into v_existing from public.core_puppies where id = p_puppy_id;
  if not found then raise exception 'puppy not found'; end if;
  if v_name is null and v_collar_color is null and v_external_reference is null then raise exception 'puppy identifier is required'; end if;
  if p_litter_id is not null and not exists (select 1 from public.core_litters where id = p_litter_id) then raise exception 'litter not found'; end if;
  if v_sex is not null and v_sex not in ('female', 'male', 'unknown') then raise exception 'invalid puppy sex'; end if;
  if v_status is null then v_status := 'unavailable'; end if;
  if v_status not in ('unavailable', 'available', 'hold', 'reserved', 'placed', 'kept', 'deceased') then raise exception 'invalid puppy status'; end if;
  if v_public_listing_status is null then v_public_listing_status := 'private'; end if;
  if v_public_listing_status not in ('private', 'public', 'hidden', 'coming_soon') then raise exception 'invalid public listing status'; end if;

  update public.core_puppies
  set external_reference = v_external_reference,
      litter_id = p_litter_id,
      name = v_name,
      collar_color = v_collar_color,
      sex = v_sex,
      color = v_color,
      coat_type = v_coat_type,
      birth_at = p_birth_at,
      status = v_status,
      health_status = v_health_status,
      public_listing_status = v_public_listing_status,
      notes = v_notes,
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('last_updated_by_tool', 'core_update_puppy', 'last_updated_by_profile_id', p_actor_profile_id, 'external_side_effects', false)
  where id = p_puppy_id;

  select to_jsonb(p) into v_new_data from public.core_puppies p where p.id = p_puppy_id;

  insert into public.core_events (event_type, summary, puppy_id, related_table, related_id, source, details, created_by_profile_id)
  values ('puppy_updated', 'Puppy record updated through controlled staff workflow', p_puppy_id, 'core_puppies', p_puppy_id, 'core_update_puppy', jsonb_build_object('status', v_status, 'public_listing_status', v_public_listing_status, 'external_side_effects', false), p_actor_profile_id);

  insert into public.core_audit_log (actor_type, actor_profile_id, actor_identifier, source, action, entity_table, entity_id, old_data, new_data, request_context, outcome)
  values ('staff_profile', p_actor_profile_id, p_actor_profile_id::text, 'core_update_puppy', 'update_puppy', 'core_puppies', p_puppy_id, to_jsonb(v_existing), v_new_data, jsonb_build_object('external_side_effects', false), 'success');

  return p_puppy_id;
end;
$$;

create or replace function public.core_archive_puppy(p_puppy_id uuid, p_actor_profile_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.core_puppies%rowtype;
  v_new_data jsonb;
begin
  if p_actor_profile_id is null then raise exception 'actor profile is required'; end if;
  if p_puppy_id is null then raise exception 'puppy id is required'; end if;

  select * into v_existing from public.core_puppies where id = p_puppy_id;
  if not found then raise exception 'puppy not found'; end if;

  update public.core_puppies
  set status = 'unavailable',
      public_listing_status = 'hidden',
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('last_updated_by_tool', 'core_archive_puppy', 'last_updated_by_profile_id', p_actor_profile_id, 'archive_style_delete', true, 'external_side_effects', false)
  where id = p_puppy_id;

  select to_jsonb(p) into v_new_data from public.core_puppies p where p.id = p_puppy_id;

  insert into public.core_events (event_type, summary, puppy_id, related_table, related_id, source, details, created_by_profile_id)
  values ('puppy_archived', 'Puppy record hidden/unavailable through controlled staff workflow', p_puppy_id, 'core_puppies', p_puppy_id, 'core_archive_puppy', jsonb_build_object('archive_style_delete', true, 'external_side_effects', false), p_actor_profile_id);

  insert into public.core_audit_log (actor_type, actor_profile_id, actor_identifier, source, action, entity_table, entity_id, old_data, new_data, request_context, outcome)
  values ('staff_profile', p_actor_profile_id, p_actor_profile_id::text, 'core_archive_puppy', 'archive_puppy', 'core_puppies', p_puppy_id, to_jsonb(v_existing), v_new_data, jsonb_build_object('archive_style_delete', true, 'external_side_effects', false), 'success');

  return p_puppy_id;
end;
$$;

comment on function public.core_update_dog(uuid, uuid, text, text, text, text, text, timestamptz, text, text, text) is 'Controlled internal dog update. No external side effects.';
comment on function public.core_archive_dog(uuid, uuid) is 'Archive-style dog delete: marks inactive. No hard delete and no external side effects.';
comment on function public.core_update_litter(uuid, uuid, text, uuid, uuid, timestamptz, timestamptz, integer, integer, integer, text, boolean, text, text) is 'Controlled internal litter update. No external side effects.';
comment on function public.core_archive_litter(uuid, uuid) is 'Archive-style litter delete: marks archived. No hard delete and no external side effects.';
comment on function public.core_update_puppy(uuid, uuid, uuid, text, text, text, text, text, timestamptz, text, text, text, text, text) is 'Controlled internal puppy update. No external side effects.';
comment on function public.core_archive_puppy(uuid, uuid) is 'Archive-style puppy delete: marks unavailable and hidden. No hard delete and no external side effects.';
