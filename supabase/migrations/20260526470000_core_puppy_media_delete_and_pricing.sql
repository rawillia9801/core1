-- Cherolee Core puppy media deletion and internal puppy pricing metadata.
--
-- Business rule:
--   * Puppy price/deposit values are internal puppy metadata only.
--   * Puppy photo deletion removes internal private media metadata through an audited owner/admin RPC.
--   * No payment processing, customer messaging, portal publishing, public listing publication,
--     AI, smart-home/camera/device integration, documents, or external providers are connected.

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
      and lower(coalesce(p.status, '')) = 'active'
      and lower(coalesce(p.role, '')) in ('owner', 'admin')
  );
$$;

drop function if exists public.core_update_puppy(uuid, uuid, uuid, text, text, text, text, text, timestamptz, text, text, text, text, text);
drop function if exists public.core_update_puppy(uuid, uuid, uuid, text, text, text, text, text, timestamptz, text, text, text, integer, integer, text, text);

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
  p_price_cents integer default null,
  p_deposit_amount_cents integer default null,
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
  v_metadata jsonb;
  v_new_data jsonb;
begin
  if not public.core_actor_is_owner_admin(p_actor_profile_id) then
    raise exception 'actor is not authorized for puppy update';
  end if;
  if p_puppy_id is null then
    raise exception 'puppy id is required';
  end if;

  select * into v_existing from public.core_puppies where id = p_puppy_id;
  if not found then
    raise exception 'puppy not found';
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
  if p_price_cents is not null and (p_price_cents < 0 or p_price_cents > 100000000) then
    raise exception 'invalid puppy price amount';
  end if;
  if p_deposit_amount_cents is not null and (p_deposit_amount_cents < 0 or p_deposit_amount_cents > 100000000) then
    raise exception 'invalid puppy deposit amount';
  end if;

  v_metadata := (
    coalesce(v_existing.metadata, '{}'::jsonb)
      - 'price_cents'
      - 'asking_price_cents'
      - 'sale_price_cents'
      - 'deposit_amount_cents'
      - 'deposit_cents'
      - 'deposit_required_cents'
  ) || jsonb_strip_nulls(jsonb_build_object(
    'price_cents', p_price_cents,
    'deposit_amount_cents', p_deposit_amount_cents,
    'last_updated_by_tool', 'core_update_puppy',
    'last_updated_by_profile_id', p_actor_profile_id,
    'payment_processed', false,
    'public_publishing_enabled', false,
    'customer_message_sent', false,
    'external_side_effects', false
  ));

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
      metadata = v_metadata
  where id = p_puppy_id;

  select to_jsonb(p) into v_new_data
  from public.core_puppies p
  where p.id = p_puppy_id;

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
    'puppy_updated',
    'Puppy record updated through controlled owner/operator workflow',
    p_puppy_id,
    'core_puppies',
    p_puppy_id,
    'core_update_puppy',
    jsonb_build_object(
      'status', v_status,
      'public_listing_status', v_public_listing_status,
      'price_cents_present', p_price_cents is not null,
      'deposit_amount_cents_present', p_deposit_amount_cents is not null,
      'payment_processed', false,
      'public_publishing_enabled', false,
      'customer_message_sent', false,
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
    'core_update_puppy',
    'update_puppy',
    'core_puppies',
    p_puppy_id,
    to_jsonb(v_existing),
    v_new_data,
    jsonb_build_object(
      'price_cents_present', p_price_cents is not null,
      'deposit_amount_cents_present', p_deposit_amount_cents is not null,
      'payment_processed', false,
      'public_publishing_enabled', false,
      'customer_message_sent', false,
      'external_side_effects', false
    ),
    'success'
  );

  return p_puppy_id;
end;
$$;

comment on function public.core_update_puppy(uuid, uuid, uuid, text, text, text, text, text, timestamptz, text, text, text, integer, integer, text, text) is
  'Controlled internal puppy update with puppy-level price/deposit metadata. No payment processing, public publishing, customer messages, or external side effects.';

create or replace function public.core_delete_kennel_media(
  p_media_id uuid,
  p_actor_profile_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.core_kennel_media%rowtype;
  v_related_table text;
  v_related_id uuid;
begin
  if not public.core_actor_is_owner_admin(p_actor_profile_id) then
    raise exception 'owner/admin actor is required';
  end if;
  if p_media_id is null then
    raise exception 'kennel media id is required';
  end if;

  select * into v_existing
  from public.core_kennel_media
  where id = p_media_id
  for update;

  if not found then
    raise exception 'kennel media not found';
  end if;

  v_related_table := case when v_existing.entity_type = 'dog' then 'core_dogs' else 'core_puppies' end;
  v_related_id := coalesce(v_existing.dog_id, v_existing.puppy_id);

  delete from public.core_kennel_media
  where id = p_media_id;

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
    'kennel_media_deleted',
    'Private internal kennel photo metadata deleted through controlled owner/operator workflow',
    case when v_existing.entity_type = 'puppy' then v_existing.puppy_id else null end,
    v_related_table,
    v_related_id,
    'core_delete_kennel_media',
    jsonb_build_object(
      'kennel_media_id', p_media_id,
      'entity_type', v_existing.entity_type,
      'storage_bucket', v_existing.storage_bucket,
      'file_mime_type', v_existing.file_mime_type,
      'private_storage', true,
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
    old_data,
    request_context,
    outcome
  ) values (
    'staff_profile',
    p_actor_profile_id,
    p_actor_profile_id::text,
    'core_delete_kennel_media',
    'delete_kennel_media',
    'core_kennel_media',
    p_media_id,
    to_jsonb(v_existing),
    jsonb_build_object(
      'entity_type', v_existing.entity_type,
      'related_table', v_related_table,
      'related_id', v_related_id,
      'private_storage', true,
      'public_link_exposed', false,
      'customer_message_sent', false,
      'public_publishing_enabled', false,
      'external_side_effects', false
    ),
    'success'
  );

  return p_media_id;
end;
$$;

comment on function public.core_delete_kennel_media(uuid, uuid) is
  'Controlled internal dog/puppy private photo metadata delete. No public publishing, customer messages, portal media, AI, devices, payments, documents, or external providers.';
