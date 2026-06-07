-- Cherolee Core owner/operator puppy, buyer, and family correction tools.
--
-- Business rules:
--   * These are internal owner/admin record-correction workflows only.
--   * Buyer-to-puppy assignment must happen through core_create_reservation(...).
--   * These functions do not send messages, process payments, generate documents,
--     publish puppies, update a portal, expose files, call AI, or call providers.

create or replace function public.core_actor_is_owner_admin(p_actor_profile_id uuid)
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
      and lower(p.status) = 'active'
      and lower(p.role) in ('owner', 'admin')
  );
$$;

create or replace function public.core_update_puppy_weight_log(
  p_weight_log_id uuid,
  p_actor_profile_id uuid,
  p_measured_at timestamptz,
  p_weight_grams integer,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.core_weight_logs%rowtype;
  v_new_data jsonb;
  v_notes text := nullif(btrim(coalesce(p_notes, '')), '');
  v_measured_at timestamptz := coalesce(p_measured_at, now());
begin
  if not public.core_actor_is_owner_admin(p_actor_profile_id) then
    raise exception 'actor is not authorized for puppy weight correction';
  end if;
  if p_weight_log_id is null then raise exception 'weight log id is required'; end if;
  if p_weight_grams is null or p_weight_grams < 1 or p_weight_grams > 10000 then
    raise exception 'weight grams must be between 1 and 10000';
  end if;
  if v_measured_at > now() + interval '1 day' then
    raise exception 'measured time cannot be more than one day in the future';
  end if;
  if length(coalesce(v_notes, '')) > 1000 then raise exception 'notes exceed maximum length'; end if;

  select * into v_existing
  from public.core_weight_logs
  where id = p_weight_log_id
  for update;
  if not found then raise exception 'weight log not found'; end if;
  if v_existing.puppy_id is null or not exists (select 1 from public.core_puppies where id = v_existing.puppy_id) then
    raise exception 'linked puppy not found';
  end if;

  update public.core_weight_logs
  set measured_at = v_measured_at,
      weight_grams = p_weight_grams,
      notes = v_notes,
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'last_updated_by_tool', 'core_update_puppy_weight_log',
        'last_updated_by_profile_id', p_actor_profile_id,
        'observation_only', true,
        'external_side_effects', false
      )
  where id = p_weight_log_id;

  select to_jsonb(w) into v_new_data
  from public.core_weight_logs w
  where w.id = p_weight_log_id;

  insert into public.core_events (event_type, event_at, summary, puppy_id, related_table, related_id, source, details, created_by_profile_id)
  values (
    'puppy_weight_log_updated',
    now(),
    'Puppy weight log corrected through controlled owner/operator workflow',
    v_existing.puppy_id,
    'core_weight_logs',
    p_weight_log_id,
    'core_update_puppy_weight_log',
    jsonb_build_object('weight_grams', p_weight_grams, 'observation_only', true, 'external_side_effects', false),
    p_actor_profile_id
  );

  insert into public.core_audit_log (actor_type, actor_profile_id, actor_identifier, source, action, entity_table, entity_id, old_data, new_data, request_context, outcome)
  values (
    'staff_profile',
    p_actor_profile_id,
    p_actor_profile_id::text,
    'core_update_puppy_weight_log',
    'update_puppy_weight_log',
    'core_weight_logs',
    p_weight_log_id,
    to_jsonb(v_existing),
    v_new_data,
    jsonb_build_object('puppy_id', v_existing.puppy_id, 'observation_only', true, 'external_side_effects', false),
    'success'
  );

  return p_weight_log_id;
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
  if not public.core_actor_is_owner_admin(p_actor_profile_id) then raise exception 'actor is not authorized for puppy update'; end if;
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

create or replace function public.core_create_manual_buyer(
  p_actor_profile_id uuid,
  p_first_name text default null,
  p_last_name text default null,
  p_preferred_name text default null,
  p_email text default null,
  p_phone text default null,
  p_alternate_phone text default null,
  p_street_address text default null,
  p_city text default null,
  p_state text default null,
  p_postal_code text default null,
  p_approval_status text default 'pending',
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer_id uuid;
  v_email text := lower(nullif(btrim(coalesce(p_email, '')), ''));
  v_phone text := nullif(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), '');
  v_status text := lower(nullif(btrim(coalesce(p_approval_status, '')), ''));
  v_new_data jsonb;
begin
  if not public.core_actor_is_owner_admin(p_actor_profile_id) then raise exception 'actor is not authorized for manual buyer creation'; end if;
  if nullif(btrim(coalesce(p_first_name, '')), '') is null
     and nullif(btrim(coalesce(p_last_name, '')), '') is null
     and v_email is null
     and v_phone is null then
    raise exception 'buyer name, email, or phone is required';
  end if;
  if v_status is null then v_status := 'pending'; end if;
  if v_status not in ('pending', 'approved', 'declined', 'inactive', 'needs_review') then raise exception 'invalid buyer approval status'; end if;
  if v_email is not null and exists (select 1 from public.core_buyers where email_normalized = v_email) then raise exception 'buyer email already exists'; end if;
  if v_phone is not null and exists (select 1 from public.core_buyers where phone_normalized = v_phone) then raise exception 'buyer phone already exists'; end if;

  insert into public.core_buyers (
    first_name, last_name, preferred_name, email, email_normalized, phone, phone_normalized,
    alternate_phone, alternate_phone_normalized, street_address, city, state, postal_code,
    approval_status, source, notes, metadata
  ) values (
    nullif(btrim(coalesce(p_first_name, '')), ''),
    nullif(btrim(coalesce(p_last_name, '')), ''),
    nullif(btrim(coalesce(p_preferred_name, '')), ''),
    nullif(btrim(coalesce(p_email, '')), ''),
    v_email,
    nullif(btrim(coalesce(p_phone, '')), ''),
    v_phone,
    nullif(btrim(coalesce(p_alternate_phone, '')), ''),
    nullif(regexp_replace(coalesce(p_alternate_phone, ''), '\D', '', 'g'), ''),
    nullif(btrim(coalesce(p_street_address, '')), ''),
    nullif(btrim(coalesce(p_city, '')), ''),
    nullif(btrim(coalesce(p_state, '')), ''),
    nullif(btrim(coalesce(p_postal_code, '')), ''),
    v_status,
    'manual_core_owner_entry',
    nullif(btrim(coalesce(p_notes, '')), ''),
    jsonb_build_object('created_by_tool', 'core_create_manual_buyer', 'created_by_profile_id', p_actor_profile_id, 'external_side_effects', false)
  ) returning id into v_buyer_id;

  select to_jsonb(b) into v_new_data from public.core_buyers b where b.id = v_buyer_id;

  insert into public.core_events (event_type, event_at, summary, buyer_id, related_table, related_id, source, details, created_by_profile_id)
  values ('buyer_created', now(), 'Manual buyer record created through owner/operator workflow', v_buyer_id, 'core_buyers', v_buyer_id, 'core_create_manual_buyer', jsonb_build_object('external_side_effects', false), p_actor_profile_id);

  insert into public.core_audit_log (actor_type, actor_profile_id, actor_identifier, source, action, entity_table, entity_id, old_data, new_data, request_context, outcome)
  values ('staff_profile', p_actor_profile_id, p_actor_profile_id::text, 'core_create_manual_buyer', 'create_manual_buyer', 'core_buyers', v_buyer_id, null, v_new_data, jsonb_build_object('external_side_effects', false), 'success');

  return v_buyer_id;
end;
$$;

create or replace function public.core_update_buyer(
  p_buyer_id uuid,
  p_actor_profile_id uuid,
  p_first_name text default null,
  p_last_name text default null,
  p_preferred_name text default null,
  p_email text default null,
  p_phone text default null,
  p_alternate_phone text default null,
  p_street_address text default null,
  p_city text default null,
  p_state text default null,
  p_postal_code text default null,
  p_approval_status text default 'pending',
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.core_buyers%rowtype;
  v_email text := lower(nullif(btrim(coalesce(p_email, '')), ''));
  v_phone text := nullif(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), '');
  v_status text := lower(nullif(btrim(coalesce(p_approval_status, '')), ''));
  v_new_data jsonb;
begin
  if not public.core_actor_is_owner_admin(p_actor_profile_id) then raise exception 'actor is not authorized for buyer update'; end if;
  if p_buyer_id is null then raise exception 'buyer id is required'; end if;
  select * into v_existing from public.core_buyers where id = p_buyer_id for update;
  if not found then raise exception 'buyer not found'; end if;
  if v_status is null then v_status := 'pending'; end if;
  if v_status not in ('pending', 'approved', 'declined', 'inactive', 'needs_review') then raise exception 'invalid buyer approval status'; end if;
  if v_email is not null and exists (select 1 from public.core_buyers where email_normalized = v_email and id <> p_buyer_id) then raise exception 'buyer email already exists'; end if;
  if v_phone is not null and exists (select 1 from public.core_buyers where phone_normalized = v_phone and id <> p_buyer_id) then raise exception 'buyer phone already exists'; end if;

  update public.core_buyers
  set first_name = nullif(btrim(coalesce(p_first_name, '')), ''),
      last_name = nullif(btrim(coalesce(p_last_name, '')), ''),
      preferred_name = nullif(btrim(coalesce(p_preferred_name, '')), ''),
      email = nullif(btrim(coalesce(p_email, '')), ''),
      email_normalized = v_email,
      phone = nullif(btrim(coalesce(p_phone, '')), ''),
      phone_normalized = v_phone,
      alternate_phone = nullif(btrim(coalesce(p_alternate_phone, '')), ''),
      alternate_phone_normalized = nullif(regexp_replace(coalesce(p_alternate_phone, ''), '\D', '', 'g'), ''),
      street_address = nullif(btrim(coalesce(p_street_address, '')), ''),
      city = nullif(btrim(coalesce(p_city, '')), ''),
      state = nullif(btrim(coalesce(p_state, '')), ''),
      postal_code = nullif(btrim(coalesce(p_postal_code, '')), ''),
      approval_status = v_status,
      notes = nullif(btrim(coalesce(p_notes, '')), ''),
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('last_updated_by_tool', 'core_update_buyer', 'last_updated_by_profile_id', p_actor_profile_id, 'external_side_effects', false)
  where id = p_buyer_id;

  select to_jsonb(b) into v_new_data from public.core_buyers b where b.id = p_buyer_id;

  insert into public.core_events (event_type, event_at, summary, buyer_id, related_table, related_id, source, details, created_by_profile_id)
  values ('buyer_updated', now(), 'Buyer record updated through owner/operator workflow', p_buyer_id, 'core_buyers', p_buyer_id, 'core_update_buyer', jsonb_build_object('external_side_effects', false), p_actor_profile_id);

  insert into public.core_audit_log (actor_type, actor_profile_id, actor_identifier, source, action, entity_table, entity_id, old_data, new_data, request_context, outcome)
  values ('staff_profile', p_actor_profile_id, p_actor_profile_id::text, 'core_update_buyer', 'update_buyer', 'core_buyers', p_buyer_id, to_jsonb(v_existing), v_new_data, jsonb_build_object('external_side_effects', false), 'success');

  return p_buyer_id;
end;
$$;

create or replace function public.core_create_family(
  p_actor_profile_id uuid,
  p_name text default null,
  p_status text default 'active',
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family_id uuid;
  v_status text := lower(nullif(btrim(coalesce(p_status, '')), ''));
  v_new_data jsonb;
begin
  if not public.core_actor_is_owner_admin(p_actor_profile_id) then raise exception 'actor is not authorized for family creation'; end if;
  if v_status is null then v_status := 'active'; end if;
  if v_status not in ('active', 'inactive', 'pending', 'archived') then raise exception 'invalid family status'; end if;
  insert into public.core_families (name, status, notes, metadata)
  values (nullif(btrim(coalesce(p_name, '')), ''), v_status, nullif(btrim(coalesce(p_notes, '')), ''), jsonb_build_object('created_by_tool', 'core_create_family', 'created_by_profile_id', p_actor_profile_id, 'external_side_effects', false))
  returning id into v_family_id;

  select to_jsonb(f) into v_new_data from public.core_families f where f.id = v_family_id;
  insert into public.core_events (event_type, event_at, summary, family_id, related_table, related_id, source, details, created_by_profile_id)
  values ('family_created', now(), 'Family record created through owner/operator workflow', v_family_id, 'core_families', v_family_id, 'core_create_family', jsonb_build_object('external_side_effects', false), p_actor_profile_id);
  insert into public.core_audit_log (actor_type, actor_profile_id, actor_identifier, source, action, entity_table, entity_id, old_data, new_data, request_context, outcome)
  values ('staff_profile', p_actor_profile_id, p_actor_profile_id::text, 'core_create_family', 'create_family', 'core_families', v_family_id, null, v_new_data, jsonb_build_object('external_side_effects', false), 'success');
  return v_family_id;
end;
$$;

create or replace function public.core_update_family(
  p_family_id uuid,
  p_actor_profile_id uuid,
  p_name text default null,
  p_status text default 'active',
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.core_families%rowtype;
  v_status text := lower(nullif(btrim(coalesce(p_status, '')), ''));
  v_new_data jsonb;
begin
  if not public.core_actor_is_owner_admin(p_actor_profile_id) then raise exception 'actor is not authorized for family update'; end if;
  if p_family_id is null then raise exception 'family id is required'; end if;
  select * into v_existing from public.core_families where id = p_family_id for update;
  if not found then raise exception 'family not found'; end if;
  if v_status is null then v_status := 'active'; end if;
  if v_status not in ('active', 'inactive', 'pending', 'archived') then raise exception 'invalid family status'; end if;
  update public.core_families
  set name = nullif(btrim(coalesce(p_name, '')), ''),
      status = v_status,
      notes = nullif(btrim(coalesce(p_notes, '')), ''),
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('last_updated_by_tool', 'core_update_family', 'last_updated_by_profile_id', p_actor_profile_id, 'external_side_effects', false)
  where id = p_family_id;
  select to_jsonb(f) into v_new_data from public.core_families f where f.id = p_family_id;
  insert into public.core_events (event_type, event_at, summary, family_id, related_table, related_id, source, details, created_by_profile_id)
  values ('family_updated', now(), 'Family record updated through owner/operator workflow', p_family_id, 'core_families', p_family_id, 'core_update_family', jsonb_build_object('external_side_effects', false), p_actor_profile_id);
  insert into public.core_audit_log (actor_type, actor_profile_id, actor_identifier, source, action, entity_table, entity_id, old_data, new_data, request_context, outcome)
  values ('staff_profile', p_actor_profile_id, p_actor_profile_id::text, 'core_update_family', 'update_family', 'core_families', p_family_id, to_jsonb(v_existing), v_new_data, jsonb_build_object('external_side_effects', false), 'success');
  return p_family_id;
end;
$$;

create or replace function public.core_link_buyer_family_member(
  p_actor_profile_id uuid,
  p_family_id uuid,
  p_buyer_id uuid,
  p_relationship text default 'primary_contact',
  p_is_primary_contact boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.core_family_members%rowtype;
  v_member_id uuid;
  v_new_data jsonb;
begin
  if not public.core_actor_is_owner_admin(p_actor_profile_id) then raise exception 'actor is not authorized for family member link'; end if;
  if p_family_id is null or not exists (select 1 from public.core_families where id = p_family_id) then raise exception 'family not found'; end if;
  if p_buyer_id is null or not exists (select 1 from public.core_buyers where id = p_buyer_id) then raise exception 'buyer not found'; end if;

  select * into v_existing
  from public.core_family_members
  where family_id = p_family_id and buyer_id = p_buyer_id
  limit 1
  for update;

  if found then
    update public.core_family_members
    set relationship = nullif(btrim(coalesce(p_relationship, '')), ''),
        is_primary_contact = coalesce(p_is_primary_contact, false),
        portal_access_status = 'not_invited',
        metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('last_updated_by_tool', 'core_link_buyer_family_member', 'last_updated_by_profile_id', p_actor_profile_id, 'external_side_effects', false)
    where id = v_existing.id
    returning id into v_member_id;
  else
    insert into public.core_family_members (family_id, buyer_id, relationship, is_primary_contact, portal_access_status, metadata)
    values (p_family_id, p_buyer_id, nullif(btrim(coalesce(p_relationship, '')), ''), coalesce(p_is_primary_contact, false), 'not_invited', jsonb_build_object('created_by_tool', 'core_link_buyer_family_member', 'created_by_profile_id', p_actor_profile_id, 'external_side_effects', false))
    returning id into v_member_id;
  end if;

  select to_jsonb(m) into v_new_data from public.core_family_members m where m.id = v_member_id;
  insert into public.core_events (event_type, event_at, summary, family_id, buyer_id, related_table, related_id, source, details, created_by_profile_id)
  values ('family_member_linked', now(), 'Buyer linked to family through owner/operator workflow', p_family_id, p_buyer_id, 'core_family_members', v_member_id, 'core_link_buyer_family_member', jsonb_build_object('external_side_effects', false), p_actor_profile_id);
  insert into public.core_audit_log (actor_type, actor_profile_id, actor_identifier, source, action, entity_table, entity_id, old_data, new_data, request_context, outcome)
  values ('staff_profile', p_actor_profile_id, p_actor_profile_id::text, 'core_link_buyer_family_member', 'link_buyer_family_member', 'core_family_members', v_member_id, case when v_existing.id is null then null else to_jsonb(v_existing) end, v_new_data, jsonb_build_object('family_id', p_family_id, 'buyer_id', p_buyer_id, 'external_side_effects', false), 'success');
  return v_member_id;
end;
$$;

comment on function public.core_update_puppy_weight_log(uuid, uuid, timestamptz, integer, text) is 'Controlled internal puppy weight correction. Observation only; no external side effects.';
comment on function public.core_create_manual_buyer(uuid, text, text, text, text, text, text, text, text, text, text, text, text) is 'Controlled internal manual buyer creation. No messages, portal invite, or external side effects.';
comment on function public.core_update_buyer(uuid, uuid, text, text, text, text, text, text, text, text, text, text, text, text) is 'Controlled internal buyer correction. No messages, portal invite, or external side effects.';
comment on function public.core_create_family(uuid, text, text, text) is 'Controlled internal family creation. No portal invite or external side effects.';
comment on function public.core_update_family(uuid, uuid, text, text, text) is 'Controlled internal family correction. No portal invite or external side effects.';
comment on function public.core_link_buyer_family_member(uuid, uuid, uuid, text, boolean) is 'Controlled internal buyer-family membership link. No portal invite or external side effects.';
