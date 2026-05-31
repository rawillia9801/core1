-- Cherolee Core kennel create-record workflows.
--
-- Business rule:
--   * These functions create real Core records for dogs, litters, and puppies.
--   * They do not create fake/demo data.
--   * They do not send customer messages, generate documents, move payments,
--     update public websites, or touch external systems.
--   * Every create action writes core_events and core_audit_log.

create or replace function public.core_create_dog(
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
  v_dog_id uuid;
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
  if p_actor_profile_id is null then
    raise exception 'actor profile is required';
  end if;

  if v_call_name is null and v_registered_name is null then
    raise exception 'dog name is required';
  end if;

  if v_sex is not null and v_sex not in ('female', 'male', 'unknown') then
    raise exception 'invalid dog sex';
  end if;

  if v_status is null then
    v_status := 'active';
  end if;

  if v_status not in ('active', 'inactive', 'retired', 'hold', 'deceased') then
    raise exception 'invalid dog status';
  end if;

  insert into public.core_dogs (
    external_reference,
    registered_name,
    call_name,
    sex,
    color,
    coat_type,
    birth_at,
    status,
    notes,
    metadata
  ) values (
    v_external_reference,
    v_registered_name,
    v_call_name,
    v_sex,
    v_color,
    v_coat_type,
    p_birth_at,
    v_status,
    v_notes,
    jsonb_build_object(
      'created_by_tool', 'core_create_dog',
      'created_by_profile_id', p_actor_profile_id,
      'external_side_effects', false
    )
  ) returning id into v_dog_id;

  select to_jsonb(d) into v_new_data
  from public.core_dogs d
  where d.id = v_dog_id;

  insert into public.core_events (
    event_type,
    summary,
    related_table,
    related_id,
    source,
    details,
    created_by_profile_id
  ) values (
    'dog_created',
    'Dog record created through controlled staff workflow',
    'core_dogs',
    v_dog_id,
    'core_create_dog',
    jsonb_build_object(
      'call_name', v_call_name,
      'registered_name', v_registered_name,
      'sex', v_sex,
      'status', v_status,
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
    old_data,
    new_data,
    request_context,
    outcome
  ) values (
    'staff_profile',
    p_actor_profile_id,
    p_actor_profile_id::text,
    'core_create_dog',
    'create_dog',
    'core_dogs',
    v_dog_id,
    null,
    v_new_data,
    jsonb_build_object('external_side_effects', false),
    'success'
  );

  return v_dog_id;
end;
$$;

create or replace function public.core_create_litter(
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
  v_litter_id uuid;
  v_litter_name text := nullif(btrim(coalesce(p_litter_name, '')), '');
  v_status text := lower(nullif(btrim(coalesce(p_status, '')), ''));
  v_external_reference text := nullif(btrim(coalesce(p_external_reference, '')), '');
  v_notes text := nullif(btrim(coalesce(p_notes, '')), '');
  v_new_data jsonb;
begin
  if p_actor_profile_id is null then
    raise exception 'actor profile is required';
  end if;

  if p_dam_id is not null and not exists (select 1 from public.core_dogs where id = p_dam_id) then
    raise exception 'dam not found';
  end if;

  if p_sire_id is not null and not exists (select 1 from public.core_dogs where id = p_sire_id) then
    raise exception 'sire not found';
  end if;

  if p_dam_id is not null and p_sire_id is not null and p_dam_id = p_sire_id then
    raise exception 'dam and sire cannot be the same dog';
  end if;

  if p_total_puppies is not null and p_total_puppies < 0 then
    raise exception 'total puppies cannot be negative';
  end if;

  if p_female_count is not null and p_female_count < 0 then
    raise exception 'female count cannot be negative';
  end if;

  if p_male_count is not null and p_male_count < 0 then
    raise exception 'male count cannot be negative';
  end if;

  if p_total_puppies is not null
    and (coalesce(p_female_count, 0) + coalesce(p_male_count, 0)) > p_total_puppies then
    raise exception 'female and male counts cannot exceed total puppies';
  end if;

  if v_status is null then
    v_status := 'planned';
  end if;

  if v_status not in ('planned', 'expected', 'born', 'active', 'closed', 'archived') then
    raise exception 'invalid litter status';
  end if;

  insert into public.core_litters (
    external_reference,
    litter_name,
    dam_id,
    sire_id,
    expected_birth_at,
    birth_at,
    total_puppies,
    female_count,
    male_count,
    status,
    details_pending,
    notes,
    metadata
  ) values (
    v_external_reference,
    v_litter_name,
    p_dam_id,
    p_sire_id,
    p_expected_birth_at,
    p_birth_at,
    p_total_puppies,
    p_female_count,
    p_male_count,
    v_status,
    coalesce(p_details_pending, false),
    v_notes,
    jsonb_build_object(
      'created_by_tool', 'core_create_litter',
      'created_by_profile_id', p_actor_profile_id,
      'external_side_effects', false
    )
  ) returning id into v_litter_id;

  select to_jsonb(l) into v_new_data
  from public.core_litters l
  where l.id = v_litter_id;

  insert into public.core_events (
    event_type,
    summary,
    related_table,
    related_id,
    source,
    details,
    created_by_profile_id
  ) values (
    'litter_created',
    'Litter record created through controlled staff workflow',
    'core_litters',
    v_litter_id,
    'core_create_litter',
    jsonb_build_object(
      'litter_name', v_litter_name,
      'dam_id', p_dam_id,
      'sire_id', p_sire_id,
      'status', v_status,
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
    old_data,
    new_data,
    request_context,
    outcome
  ) values (
    'staff_profile',
    p_actor_profile_id,
    p_actor_profile_id::text,
    'core_create_litter',
    'create_litter',
    'core_litters',
    v_litter_id,
    null,
    v_new_data,
    jsonb_build_object('external_side_effects', false),
    'success'
  );

  return v_litter_id;
end;
$$;

create or replace function public.core_create_puppy(
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
  v_puppy_id uuid;
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
  if p_actor_profile_id is null then
    raise exception 'actor profile is required';
  end if;

  if v_name is null and v_collar_color is null and v_external_reference is null then
    raise exception 'puppy identifier is required';
  end if;

  if p_litter_id is not null and not exists (select 1 from public.core_litters where id = p_litter_id) then
    raise exception 'litter not found';
  end if;

  if v_sex is not null and v_sex not in ('female', 'male', 'unknown') then
    raise exception 'invalid puppy sex';
  end if;

  if v_status is null then
    v_status := 'unavailable';
  end if;

  if v_status not in ('unavailable', 'available', 'hold', 'reserved', 'placed', 'kept', 'deceased') then
    raise exception 'invalid puppy status';
  end if;

  if v_public_listing_status is null then
    v_public_listing_status := 'private';
  end if;

  if v_public_listing_status not in ('private', 'public', 'hidden', 'coming_soon') then
    raise exception 'invalid public listing status';
  end if;

  insert into public.core_puppies (
    external_reference,
    litter_id,
    name,
    collar_color,
    sex,
    color,
    coat_type,
    birth_at,
    status,
    health_status,
    public_listing_status,
    notes,
    metadata
  ) values (
    v_external_reference,
    p_litter_id,
    v_name,
    v_collar_color,
    v_sex,
    v_color,
    v_coat_type,
    p_birth_at,
    v_status,
    v_health_status,
    v_public_listing_status,
    v_notes,
    jsonb_build_object(
      'created_by_tool', 'core_create_puppy',
      'created_by_profile_id', p_actor_profile_id,
      'external_side_effects', false
    )
  ) returning id into v_puppy_id;

  select to_jsonb(p) into v_new_data
  from public.core_puppies p
  where p.id = v_puppy_id;

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
    'puppy_created',
    'Puppy record created through controlled staff workflow',
    v_puppy_id,
    'core_puppies',
    v_puppy_id,
    'core_create_puppy',
    jsonb_build_object(
      'name', v_name,
      'collar_color', v_collar_color,
      'litter_id', p_litter_id,
      'status', v_status,
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
    old_data,
    new_data,
    request_context,
    outcome
  ) values (
    'staff_profile',
    p_actor_profile_id,
    p_actor_profile_id::text,
    'core_create_puppy',
    'create_puppy',
    'core_puppies',
    v_puppy_id,
    null,
    v_new_data,
    jsonb_build_object('external_side_effects', false),
    'success'
  );

  return v_puppy_id;
end;
$$;

comment on function public.core_create_dog(uuid, text, text, text, text, text, timestamptz, text, text, text) is
  'Controlled internal dog record creation. No external side effects.';
comment on function public.core_create_litter(uuid, text, uuid, uuid, timestamptz, timestamptz, integer, integer, integer, text, boolean, text, text) is
  'Controlled internal litter record creation. No external side effects.';
comment on function public.core_create_puppy(uuid, uuid, text, text, text, text, text, timestamptz, text, text, text, text, text) is
  'Controlled internal puppy record creation. No external side effects.';
