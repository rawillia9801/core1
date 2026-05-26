-- Cherolee Core V1 controlled reservation creation write function.
--
-- Business rule:
--   * A reservation is the official buyer/family plus puppy transaction.
--   * A puppy should not be assigned to more than one active reservation.
--   * Core changes must happen through validated write tools, not scattered direct edits.
--
-- Migration caution:
--   * This does not build UI, RLS policies, Zoho sync, payments, email sending, Twilio,
--     production credentials, or production data imports.
--   * This function creates the reservation and marks the puppy reserved; payment recording remains a separate workflow.

create or replace function public.core_create_reservation(
  p_buyer_id uuid,
  p_family_id uuid,
  p_puppy_id uuid,
  p_application_id uuid,
  p_actor_profile_id uuid,
  p_contract_total_cents integer,
  p_deposit_required_cents integer default null,
  p_sale_type text default null,
  p_notes text default null
)
returns table (
  reservation_id uuid,
  buyer_id uuid,
  family_id uuid,
  puppy_id uuid,
  reservation_status text,
  puppy_status text,
  event_id uuid,
  audit_log_id uuid
)
language plpgsql
security invoker
as $$
declare
  v_buyer public.core_buyers%rowtype;
  v_family public.core_families%rowtype;
  v_puppy_old public.core_puppies%rowtype;
  v_puppy_new public.core_puppies%rowtype;
  v_application public.core_applications%rowtype;
  v_reservation public.core_reservations%rowtype;
  v_event_id uuid;
  v_audit_log_id uuid;
  v_actor_name text;
  v_existing_reservation_id uuid;
begin
  if p_buyer_id is null then
    raise exception 'buyer_id is required';
  end if;

  if p_family_id is null then
    raise exception 'family_id is required';
  end if;

  if p_puppy_id is null then
    raise exception 'puppy_id is required';
  end if;

  if p_actor_profile_id is null then
    raise exception 'actor_profile_id is required';
  end if;

  if p_contract_total_cents is null or p_contract_total_cents <= 0 then
    raise exception 'contract_total_cents must be greater than zero';
  end if;

  if p_deposit_required_cents is not null and p_deposit_required_cents < 0 then
    raise exception 'deposit_required_cents cannot be negative';
  end if;

  select * into v_buyer
  from public.core_buyers
  where id = p_buyer_id
  for update;

  if not found then
    raise exception 'buyer % was not found', p_buyer_id;
  end if;

  select * into v_family
  from public.core_families
  where id = p_family_id
  for update;

  if not found then
    raise exception 'family % was not found', p_family_id;
  end if;

  select * into v_puppy_old
  from public.core_puppies
  where id = p_puppy_id
  for update;

  if not found then
    raise exception 'puppy % was not found', p_puppy_id;
  end if;

  if p_application_id is not null then
    select * into v_application
    from public.core_applications
    where id = p_application_id
    for update;

    if not found then
      raise exception 'application % was not found', p_application_id;
    end if;

    if v_application.buyer_id is not null and v_application.buyer_id <> p_buyer_id then
      raise exception 'application % does not belong to buyer %', p_application_id, p_buyer_id;
    end if;

    if v_application.family_id is not null and v_application.family_id <> p_family_id then
      raise exception 'application % does not belong to family %', p_application_id, p_family_id;
    end if;
  end if;

  select display_name into v_actor_name
  from public.core_profiles
  where id = p_actor_profile_id;

  if v_actor_name is null then
    raise exception 'actor profile % was not found', p_actor_profile_id;
  end if;

  select r.id into v_existing_reservation_id
  from public.core_reservations r
  where r.puppy_id = p_puppy_id
    and r.status not in ('cancelled', 'void', 'released')
  limit 1;

  if v_existing_reservation_id is not null then
    raise exception 'puppy % already has active reservation %', p_puppy_id, v_existing_reservation_id;
  end if;

  insert into public.core_reservations (
    buyer_id,
    family_id,
    puppy_id,
    application_id,
    status,
    sale_type,
    reserved_at,
    contract_total_cents,
    deposit_required_cents,
    currency,
    portal_access_status,
    notes,
    metadata
  ) values (
    p_buyer_id,
    p_family_id,
    p_puppy_id,
    p_application_id,
    'reserved',
    nullif(p_sale_type, ''),
    now(),
    p_contract_total_cents,
    p_deposit_required_cents,
    'USD',
    'not_invited',
    nullif(p_notes, ''),
    jsonb_build_object('created_by_tool', 'core_create_reservation')
  ) returning * into v_reservation;

  update public.core_puppies
  set status = 'reserved'
  where id = p_puppy_id
  returning * into v_puppy_new;

  insert into public.core_events (
    event_type,
    event_at,
    summary,
    family_id,
    buyer_id,
    application_id,
    puppy_id,
    reservation_id,
    related_table,
    related_id,
    source,
    details,
    created_by_profile_id
  ) values (
    'reservation_created',
    now(),
    concat('Reservation created by ', v_actor_name),
    p_family_id,
    p_buyer_id,
    p_application_id,
    p_puppy_id,
    v_reservation.id,
    'core_reservations',
    v_reservation.id,
    'core_create_reservation',
    jsonb_build_object(
      'contract_total_cents', p_contract_total_cents,
      'deposit_required_cents', p_deposit_required_cents,
      'sale_type', nullif(p_sale_type, '')
    ),
    p_actor_profile_id
  ) returning id into v_event_id;

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
    'profile',
    p_actor_profile_id,
    v_actor_name,
    'core_create_reservation',
    'create_reservation',
    'core_reservations',
    v_reservation.id,
    jsonb_build_object(
      'puppy', to_jsonb(v_puppy_old),
      'reservation', null
    ),
    jsonb_build_object(
      'puppy', to_jsonb(v_puppy_new),
      'reservation', to_jsonb(v_reservation)
    ),
    jsonb_build_object(
      'buyer_id', p_buyer_id,
      'family_id', p_family_id,
      'puppy_id', p_puppy_id,
      'application_id', p_application_id
    ),
    'success'
  ) returning id into v_audit_log_id;

  reservation_id := v_reservation.id;
  buyer_id := v_reservation.buyer_id;
  family_id := v_reservation.family_id;
  puppy_id := v_reservation.puppy_id;
  reservation_status := v_reservation.status;
  puppy_status := v_puppy_new.status;
  event_id := v_event_id;
  audit_log_id := v_audit_log_id;
  return next;
end;
$$;

comment on function public.core_create_reservation(uuid, uuid, uuid, uuid, uuid, integer, integer, text, text) is
  'Controlled reservation creation write foundation. Creates one buyer/family plus puppy reservation, marks the puppy reserved, and writes event/audit records.';
