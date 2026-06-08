-- Cherolee Core puppy registry and internal cost metadata.
--
-- Business rule:
--   * Registry, price, deposit, and internal cost values are private Core metadata.
--   * Payment ledger truth remains on reservations and core_financial_ledger.
--   * No payment processor, public publishing, customer messaging, portal update,
--     documents, AI, smart-home/camera/device integration, or external provider is connected.

drop function if exists public.core_create_puppy(uuid, uuid, text, text, text, text, text, timestamptz, text, text, text, text, text);
drop function if exists public.core_create_puppy(uuid, uuid, text, text, text, text, text, timestamptz, text, text, text, text, text, integer, integer, integer, text, text);
drop function if exists public.core_update_puppy(uuid, uuid, uuid, text, text, text, text, text, timestamptz, text, text, text, integer, integer, text, text);
drop function if exists public.core_update_puppy(uuid, uuid, uuid, text, text, text, text, text, timestamptz, text, text, text, text, text, integer, integer, integer, text, text);

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
  p_registry text default null,
  p_registry_number text default null,
  p_price_cents integer default null,
  p_deposit_amount_cents integer default null,
  p_internal_cost_cents integer default null,
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
  v_registry text := nullif(btrim(coalesce(p_registry, '')), '');
  v_registry_number text := nullif(btrim(coalesce(p_registry_number, '')), '');
  v_external_reference text := nullif(btrim(coalesce(p_external_reference, '')), '');
  v_notes text := nullif(btrim(coalesce(p_notes, '')), '');
  v_new_data jsonb;
begin
  if not public.core_actor_is_owner_admin(p_actor_profile_id) then
    raise exception 'actor is not authorized for puppy create';
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
  if p_internal_cost_cents is not null and (p_internal_cost_cents < 0 or p_internal_cost_cents > 100000000) then
    raise exception 'invalid puppy internal cost amount';
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
    jsonb_strip_nulls(jsonb_build_object(
      'created_by_tool', 'core_create_puppy',
      'created_by_profile_id', p_actor_profile_id,
      'registry', v_registry,
      'registration_number', v_registry_number,
      'price_cents', p_price_cents,
      'deposit_amount_cents', p_deposit_amount_cents,
      'internal_cost_cents', p_internal_cost_cents,
      'payment_processed', false,
      'public_publishing_enabled', false,
      'customer_message_sent', false,
      'external_side_effects', false
    ))
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
    'Puppy record created through controlled owner/operator workflow',
    v_puppy_id,
    'core_puppies',
    v_puppy_id,
    'core_create_puppy',
    jsonb_build_object(
      'name', v_name,
      'collar_color', v_collar_color,
      'litter_id', p_litter_id,
      'status', v_status,
      'registry_present', v_registry is not null,
      'price_cents_present', p_price_cents is not null,
      'deposit_amount_cents_present', p_deposit_amount_cents is not null,
      'internal_cost_cents_present', p_internal_cost_cents is not null,
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
    'core_create_puppy',
    'create_puppy',
    'core_puppies',
    v_puppy_id,
    null,
    v_new_data,
    jsonb_build_object(
      'registry_present', v_registry is not null,
      'price_cents_present', p_price_cents is not null,
      'deposit_amount_cents_present', p_deposit_amount_cents is not null,
      'internal_cost_cents_present', p_internal_cost_cents is not null,
      'payment_processed', false,
      'public_publishing_enabled', false,
      'customer_message_sent', false,
      'external_side_effects', false
    ),
    'success'
  );

  return v_puppy_id;
end;
$$;

comment on function public.core_create_puppy(uuid, uuid, text, text, text, text, text, timestamptz, text, text, text, text, text, integer, integer, integer, text, text) is
  'Controlled internal puppy create with registry and private price/deposit/internal cost metadata. No payment processing, public publishing, customer messaging, or external side effects.';

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
  p_registry text default null,
  p_registry_number text default null,
  p_price_cents integer default null,
  p_deposit_amount_cents integer default null,
  p_internal_cost_cents integer default null,
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
  v_registry text := nullif(btrim(coalesce(p_registry, '')), '');
  v_registry_number text := nullif(btrim(coalesce(p_registry_number, '')), '');
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
  if p_internal_cost_cents is not null and (p_internal_cost_cents < 0 or p_internal_cost_cents > 100000000) then
    raise exception 'invalid puppy internal cost amount';
  end if;

  v_metadata := (
    coalesce(v_existing.metadata, '{}'::jsonb)
      - 'registry'
      - 'registration'
      - 'registration_number'
      - 'registry_number'
      - 'akc_registration'
      - 'akc_number'
      - 'price_cents'
      - 'asking_price_cents'
      - 'sale_price_cents'
      - 'deposit_amount_cents'
      - 'deposit_cents'
      - 'deposit_required_cents'
      - 'internal_cost_cents'
      - 'cost_cents'
      - 'expense_basis_cents'
  ) || jsonb_strip_nulls(jsonb_build_object(
    'registry', v_registry,
    'registration_number', v_registry_number,
    'price_cents', p_price_cents,
    'deposit_amount_cents', p_deposit_amount_cents,
    'internal_cost_cents', p_internal_cost_cents,
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
      'registry_present', v_registry is not null,
      'price_cents_present', p_price_cents is not null,
      'deposit_amount_cents_present', p_deposit_amount_cents is not null,
      'internal_cost_cents_present', p_internal_cost_cents is not null,
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
      'registry_present', v_registry is not null,
      'price_cents_present', p_price_cents is not null,
      'deposit_amount_cents_present', p_deposit_amount_cents is not null,
      'internal_cost_cents_present', p_internal_cost_cents is not null,
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

comment on function public.core_update_puppy(uuid, uuid, uuid, text, text, text, text, text, timestamptz, text, text, text, text, text, integer, integer, integer, text, text) is
  'Controlled internal puppy update with registry and private price/deposit/internal cost metadata. No payment processing, public publishing, customer messaging, or external side effects.';
