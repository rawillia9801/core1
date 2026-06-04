-- Cherolee Core puppy weight and neonatal care observation workflows.
--
-- Business rule:
--   * These functions record factual owner/operator observations only.
--   * They do not diagnose puppies, replace veterinary care, publish puppies,
--     message customers, update portals, call providers, connect devices, or
--     trigger external systems.
--   * Every action writes core_events and core_audit_log.

create or replace function public.core_record_puppy_weight_log(
  p_actor_profile_id uuid,
  p_puppy_id uuid,
  p_weight_grams integer,
  p_measured_at timestamptz default now(),
  p_notes text default null
)
returns table (
  weight_log_id uuid,
  puppy_id uuid,
  measured_at timestamptz,
  weight_grams integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.core_profiles%rowtype;
  v_puppy public.core_puppies%rowtype;
  v_weight_log_id uuid;
  v_measured_at timestamptz := coalesce(p_measured_at, now());
  v_notes text := nullif(btrim(coalesce(p_notes, '')), '');
  v_new_data jsonb;
begin
  if p_actor_profile_id is null then
    raise exception 'actor profile is required';
  end if;

  select * into v_actor
  from public.core_profiles
  where id = p_actor_profile_id;

  if not found
    or lower(v_actor.status) <> 'active'
    or lower(v_actor.role) not in ('owner', 'admin') then
    raise exception 'actor is not authorized for puppy weight logging';
  end if;

  if p_puppy_id is null then
    raise exception 'puppy id is required';
  end if;

  select * into v_puppy
  from public.core_puppies
  where id = p_puppy_id;

  if not found then
    raise exception 'puppy not found';
  end if;

  if p_weight_grams is null or p_weight_grams < 1 or p_weight_grams > 10000 then
    raise exception 'weight grams must be between 1 and 10000';
  end if;

  if v_measured_at > now() + interval '1 day' then
    raise exception 'measured time cannot be more than one day in the future';
  end if;

  if length(coalesce(v_notes, '')) > 1000 then
    raise exception 'notes exceed maximum length';
  end if;

  insert into public.core_weight_logs (
    puppy_id,
    measured_at,
    weight_grams,
    notes,
    recorded_by_profile_id,
    metadata
  ) values (
    p_puppy_id,
    v_measured_at,
    p_weight_grams,
    v_notes,
    p_actor_profile_id,
    jsonb_build_object(
      'created_by_tool', 'core_record_puppy_weight_log',
      'created_by_profile_id', p_actor_profile_id,
      'external_side_effects', false,
      'observation_only', true
    )
  ) returning id into v_weight_log_id;

  select to_jsonb(w) into v_new_data
  from public.core_weight_logs w
  where w.id = v_weight_log_id;

  insert into public.core_events (
    event_type,
    event_at,
    summary,
    puppy_id,
    related_table,
    related_id,
    source,
    details,
    created_by_profile_id
  ) values (
    'puppy_weight_recorded',
    v_measured_at,
    'Puppy weight recorded through controlled neonatal workflow',
    p_puppy_id,
    'core_weight_logs',
    v_weight_log_id,
    'core_record_puppy_weight_log',
    jsonb_build_object(
      'puppy_id', p_puppy_id,
      'weight_grams', p_weight_grams,
      'observation_only', true,
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
    'core_record_puppy_weight_log',
    'record_puppy_weight_log',
    'core_weight_logs',
    v_weight_log_id,
    null,
    v_new_data,
    jsonb_build_object(
      'puppy_id', p_puppy_id,
      'observation_only', true,
      'external_side_effects', false
    ),
    'success'
  );

  return query
  select v_weight_log_id, p_puppy_id, v_measured_at, p_weight_grams;
end;
$$;

create or replace function public.core_record_puppy_care_observation(
  p_actor_profile_id uuid,
  p_puppy_id uuid,
  p_observation_type text,
  p_observed_at timestamptz default now(),
  p_note text default null
)
returns table (
  puppy_event_id uuid,
  puppy_id uuid,
  event_type text,
  event_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.core_profiles%rowtype;
  v_puppy public.core_puppies%rowtype;
  v_observation_type text := lower(nullif(btrim(coalesce(p_observation_type, '')), ''));
  v_observed_at timestamptz := coalesce(p_observed_at, now());
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_puppy_event_id uuid;
  v_new_data jsonb;
begin
  if p_actor_profile_id is null then
    raise exception 'actor profile is required';
  end if;

  select * into v_actor
  from public.core_profiles
  where id = p_actor_profile_id;

  if not found
    or lower(v_actor.status) <> 'active'
    or lower(v_actor.role) not in ('owner', 'admin') then
    raise exception 'actor is not authorized for puppy care observations';
  end if;

  if p_puppy_id is null then
    raise exception 'puppy id is required';
  end if;

  select * into v_puppy
  from public.core_puppies
  where id = p_puppy_id;

  if not found then
    raise exception 'puppy not found';
  end if;

  if v_observation_type not in ('nursing_observed', 'bottle_feeding', 'weight_check', 'dam_note', 'general_note', 'watch_note') then
    raise exception 'invalid observation type';
  end if;

  if v_observed_at > now() + interval '1 day' then
    raise exception 'observation time cannot be more than one day in the future';
  end if;

  if length(coalesce(v_note, '')) > 1000 then
    raise exception 'observation note exceeds maximum length';
  end if;

  insert into public.core_puppy_events (
    puppy_id,
    event_type,
    event_at,
    summary,
    details,
    recorded_by_profile_id
  ) values (
    p_puppy_id,
    v_observation_type,
    v_observed_at,
    coalesce(v_note, replace(v_observation_type, '_', ' ')),
    jsonb_build_object(
      'observation_type', v_observation_type,
      'observation_only', true,
      'external_side_effects', false
    ),
    p_actor_profile_id
  ) returning id into v_puppy_event_id;

  select to_jsonb(pe) into v_new_data
  from public.core_puppy_events pe
  where pe.id = v_puppy_event_id;

  insert into public.core_events (
    event_type,
    event_at,
    summary,
    puppy_id,
    related_table,
    related_id,
    source,
    details,
    created_by_profile_id
  ) values (
    'puppy_care_observation_recorded',
    v_observed_at,
    'Puppy care observation recorded through controlled neonatal workflow',
    p_puppy_id,
    'core_puppy_events',
    v_puppy_event_id,
    'core_record_puppy_care_observation',
    jsonb_build_object(
      'puppy_id', p_puppy_id,
      'observation_type', v_observation_type,
      'observation_only', true,
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
    'core_record_puppy_care_observation',
    'record_puppy_care_observation',
    'core_puppy_events',
    v_puppy_event_id,
    null,
    v_new_data,
    jsonb_build_object(
      'puppy_id', p_puppy_id,
      'observation_type', v_observation_type,
      'observation_only', true,
      'external_side_effects', false
    ),
    'success'
  );

  return query
  select v_puppy_event_id, p_puppy_id, v_observation_type, v_observed_at;
end;
$$;

comment on function public.core_record_puppy_weight_log(uuid, uuid, integer, timestamptz, text) is
  'Controlled internal puppy weight observation. No diagnosis and no external side effects.';
comment on function public.core_record_puppy_care_observation(uuid, uuid, text, timestamptz, text) is
  'Controlled internal puppy care observation. No diagnosis and no external side effects.';
