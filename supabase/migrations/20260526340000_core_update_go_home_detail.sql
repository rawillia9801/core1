-- Cherolee Core controlled go-home update tool.
--
-- Business rule:
--   * This is a local/development server-side write foundation.
--   * It creates or updates one current ungrouped go-home detail per reservation.
--   * It does not send email, SMS, documents, payment actions, or external integration calls.
--   * Go-home changes are logged to core_events and core_audit_log.

create or replace function public.core_update_go_home_detail(
  p_reservation_id uuid,
  p_actor_profile_id uuid,
  p_method text default null,
  p_planned_at timestamptz default null,
  p_location text default null,
  p_status text default 'pending',
  p_checklist_status text default null,
  p_balance_cleared_status text default null,
  p_contact_notes text default null,
  p_individual_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation public.core_reservations%rowtype;
  v_existing public.core_go_home_details%rowtype;
  v_go_home_detail_id uuid;
  v_method text := nullif(btrim(coalesce(p_method, '')), '');
  v_location text := nullif(btrim(coalesce(p_location, '')), '');
  v_status text := lower(nullif(btrim(coalesce(p_status, '')), ''));
  v_checklist_status text := lower(nullif(btrim(coalesce(p_checklist_status, '')), ''));
  v_balance_cleared_status text := lower(nullif(btrim(coalesce(p_balance_cleared_status, '')), ''));
  v_contact_notes text := nullif(btrim(coalesce(p_contact_notes, '')), '');
  v_individual_notes text := nullif(btrim(coalesce(p_individual_notes, '')), '');
  v_new_data jsonb;
begin
  if p_actor_profile_id is null then
    raise exception 'actor profile is required';
  end if;

  select * into v_reservation
  from public.core_reservations
  where id = p_reservation_id;

  if not found then
    raise exception 'reservation not found';
  end if;

  if lower(coalesce(v_reservation.status, '')) in ('cancelled', 'void', 'released') then
    raise exception 'reservation is not eligible for go-home updates';
  end if;

  if v_method is not null and lower(v_method) not in ('pickup', 'delivery', 'meetup', 'transport') then
    raise exception 'invalid go-home method';
  end if;

  if v_status is null then
    v_status := 'pending';
  end if;

  if v_status not in ('pending', 'scheduled', 'confirmed', 'ready', 'completed', 'delayed', 'cancelled') then
    raise exception 'invalid go-home status';
  end if;

  if v_checklist_status is not null and v_checklist_status not in ('not_started', 'in_progress', 'needs_review', 'complete') then
    raise exception 'invalid go-home checklist status';
  end if;

  if v_balance_cleared_status is not null and v_balance_cleared_status not in ('unknown', 'not_cleared', 'pending_review', 'cleared') then
    raise exception 'invalid go-home balance cleared status';
  end if;

  select * into v_existing
  from public.core_go_home_details
  where reservation_id = p_reservation_id
  limit 1;

  if found then
    if v_existing.go_home_group_id is not null then
      raise exception 'grouped go-home details require a separate group update workflow';
    end if;

    update public.core_go_home_details
    set
      method = v_method,
      planned_at = p_planned_at,
      location = v_location,
      status = v_status,
      checklist_status = v_checklist_status,
      balance_cleared_status = v_balance_cleared_status,
      contact_notes = v_contact_notes,
      individual_notes = v_individual_notes,
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'last_updated_by_tool', 'core_update_go_home_detail',
        'last_updated_by_profile_id', p_actor_profile_id,
        'external_side_effects', false
      )
    where id = v_existing.id
    returning id into v_go_home_detail_id;
  else
    insert into public.core_go_home_details (
      reservation_id,
      method,
      planned_at,
      location,
      status,
      checklist_status,
      balance_cleared_status,
      contact_notes,
      individual_notes,
      metadata
    ) values (
      p_reservation_id,
      v_method,
      p_planned_at,
      v_location,
      v_status,
      v_checklist_status,
      v_balance_cleared_status,
      v_contact_notes,
      v_individual_notes,
      jsonb_build_object(
        'created_by_tool', 'core_update_go_home_detail',
        'created_by_profile_id', p_actor_profile_id,
        'external_side_effects', false
      )
    )
    returning id into v_go_home_detail_id;
  end if;

  select to_jsonb(d) into v_new_data
  from public.core_go_home_details d
  where d.id = v_go_home_detail_id;

  insert into public.core_events (
    event_type,
    summary,
    family_id,
    buyer_id,
    puppy_id,
    reservation_id,
    related_table,
    related_id,
    source,
    details,
    created_by_profile_id
  ) values (
    'go_home_detail_updated',
    'Go-home detail updated through controlled staff workflow',
    v_reservation.family_id,
    v_reservation.buyer_id,
    v_reservation.puppy_id,
    v_reservation.id,
    'core_go_home_details',
    v_go_home_detail_id,
    'core_update_go_home_detail',
    jsonb_build_object(
      'method', v_method,
      'planned_at', p_planned_at,
      'location', v_location,
      'status', v_status,
      'checklist_status', v_checklist_status,
      'balance_cleared_status', v_balance_cleared_status,
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
    'core_update_go_home_detail',
    'update_go_home_detail',
    'core_go_home_details',
    v_go_home_detail_id,
    case when v_existing.id is null then null else to_jsonb(v_existing) end,
    v_new_data,
    jsonb_build_object(
      'reservation_id', p_reservation_id,
      'external_side_effects', false
    ),
    'success'
  );

  return v_go_home_detail_id;
end;
$$;

comment on function public.core_update_go_home_detail(uuid, uuid, text, timestamptz, text, text, text, text, text, text) is
  'Controlled local/development go-home detail upsert. Does not send messages, documents, payments, or external integrations.';
