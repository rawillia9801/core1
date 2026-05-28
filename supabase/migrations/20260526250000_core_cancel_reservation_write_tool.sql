-- Cherolee Core V1 controlled reservation cancellation write function.
--
-- Business rule:
--   * Cancelling a reservation preserves the original transaction history.
--   * Cancellation does not imply a refund, fee, chargeback, or ledger correction.
--   * Puppy release is explicit. A cancelled reservation does not silently relist a puppy.
--   * Core changes must happen through validated write tools with event/audit records.
--
-- Migration caution:
--   * This does not build UI, connect payment processors, create refunds, send email,
--     generate documents, enable RLS, import production data, or change unrelated schema.
--   * Financial correction and refund workflows remain separate future tasks.

create or replace function public.core_cancel_reservation(
  p_reservation_id uuid,
  p_actor_profile_id uuid,
  p_cancellation_reason text,
  p_release_puppy boolean default false,
  p_released_puppy_status text default 'available',
  p_notes text default null
)
returns table (
  reservation_id uuid,
  reservation_status text,
  puppy_id uuid,
  puppy_status text,
  puppy_released boolean,
  reservation_event_id uuid,
  puppy_event_id uuid,
  reservation_audit_log_id uuid,
  puppy_audit_log_id uuid
)
language plpgsql
security invoker
as $$
declare
  v_reservation_old public.core_reservations%rowtype;
  v_reservation_new public.core_reservations%rowtype;
  v_puppy_old public.core_puppies%rowtype;
  v_puppy_new public.core_puppies%rowtype;
  v_actor_name text;
  v_cancellation_reason text;
  v_released_puppy_status text;
  v_notes text;
  v_reservation_event_id uuid;
  v_puppy_event_id uuid;
  v_reservation_audit_log_id uuid;
  v_puppy_audit_log_id uuid;
  v_other_active_reservation_id uuid;
  v_puppy_released boolean := false;
begin
  if p_reservation_id is null then
    raise exception 'reservation_id is required';
  end if;

  if p_actor_profile_id is null then
    raise exception 'actor_profile_id is required';
  end if;

  v_cancellation_reason := nullif(btrim(p_cancellation_reason), '');
  if v_cancellation_reason is null then
    raise exception 'cancellation_reason is required';
  end if;

  if length(v_cancellation_reason) > 1000 then
    raise exception 'cancellation_reason must be 1000 characters or fewer';
  end if;

  v_notes := nullif(btrim(p_notes), '');
  if length(coalesce(v_notes, '')) > 1000 then
    raise exception 'notes must be 1000 characters or fewer';
  end if;

  v_released_puppy_status := lower(btrim(coalesce(p_released_puppy_status, 'available')));
  if p_release_puppy and v_released_puppy_status not in ('available', 'unavailable', 'hold') then
    raise exception 'released_puppy_status must be available, unavailable, or hold';
  end if;

  select *
  into v_reservation_old
  from public.core_reservations
  where id = p_reservation_id
  for update;

  if not found then
    raise exception 'reservation % was not found', p_reservation_id;
  end if;

  if v_reservation_old.status not in ('reserved', 'pending') then
    raise exception 'reservation % cannot be cancelled from status %', p_reservation_id, v_reservation_old.status;
  end if;

  select display_name
  into v_actor_name
  from public.core_profiles
  where id = p_actor_profile_id;

  if v_actor_name is null then
    raise exception 'actor profile % was not found', p_actor_profile_id;
  end if;

  update public.core_reservations
  set status = 'cancelled'
  where id = p_reservation_id
  returning * into v_reservation_new;

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
    'reservation_cancelled',
    now(),
    concat('Reservation cancelled by ', v_actor_name),
    v_reservation_new.family_id,
    v_reservation_new.buyer_id,
    v_reservation_new.application_id,
    v_reservation_new.puppy_id,
    v_reservation_new.id,
    'core_reservations',
    v_reservation_new.id,
    'core_cancel_reservation',
    jsonb_build_object(
      'cancellation_reason', v_cancellation_reason,
      'release_puppy_requested', p_release_puppy,
      'released_puppy_status_requested', case when p_release_puppy then v_released_puppy_status else null end,
      'notes', v_notes,
      'ledger_untouched', true
    ),
    p_actor_profile_id
  ) returning id into v_reservation_event_id;

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
    'core_cancel_reservation',
    'cancel_reservation',
    'core_reservations',
    v_reservation_new.id,
    to_jsonb(v_reservation_old),
    to_jsonb(v_reservation_new),
    jsonb_build_object(
      'cancellation_reason', v_cancellation_reason,
      'release_puppy_requested', p_release_puppy,
      'released_puppy_status_requested', case when p_release_puppy then v_released_puppy_status else null end,
      'notes_provided', v_notes is not null,
      'ledger_untouched', true
    ),
    'success'
  ) returning id into v_reservation_audit_log_id;

  if p_release_puppy and v_reservation_new.puppy_id is not null then
    select *
    into v_puppy_old
    from public.core_puppies
    where id = v_reservation_new.puppy_id
    for update;

    if found then
      select r.id
      into v_other_active_reservation_id
      from public.core_reservations r
      where r.puppy_id = v_reservation_new.puppy_id
        and r.id <> v_reservation_new.id
        and r.status not in ('cancelled', 'void', 'released', 'completed')
      limit 1;

      if v_other_active_reservation_id is null and v_puppy_old.status is distinct from v_released_puppy_status then
        update public.core_puppies
        set status = v_released_puppy_status
        where id = v_reservation_new.puppy_id
        returning * into v_puppy_new;

        v_puppy_released := true;

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
          'puppy_released',
          now(),
          concat('Puppy released after reservation cancellation by ', v_actor_name),
          v_reservation_new.family_id,
          v_reservation_new.buyer_id,
          v_reservation_new.application_id,
          v_reservation_new.puppy_id,
          v_reservation_new.id,
          'core_puppies',
          v_reservation_new.puppy_id,
          'core_cancel_reservation',
          jsonb_build_object(
            'from_status', v_puppy_old.status,
            'to_status', v_puppy_new.status,
            'reservation_id', v_reservation_new.id
          ),
          p_actor_profile_id
        ) returning id into v_puppy_event_id;

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
          'core_cancel_reservation',
          'release_puppy_from_cancelled_reservation',
          'core_puppies',
          v_reservation_new.puppy_id,
          to_jsonb(v_puppy_old),
          to_jsonb(v_puppy_new),
          jsonb_build_object(
            'reservation_id', v_reservation_new.id,
            'released_puppy_status', v_released_puppy_status
          ),
          'success'
        ) returning id into v_puppy_audit_log_id;
      else
        v_puppy_new := v_puppy_old;
      end if;
    end if;
  elsif v_reservation_new.puppy_id is not null then
    select *
    into v_puppy_new
    from public.core_puppies
    where id = v_reservation_new.puppy_id;
  end if;

  reservation_id := v_reservation_new.id;
  reservation_status := v_reservation_new.status;
  puppy_id := v_reservation_new.puppy_id;
  puppy_status := v_puppy_new.status;
  puppy_released := v_puppy_released;
  reservation_event_id := v_reservation_event_id;
  puppy_event_id := v_puppy_event_id;
  reservation_audit_log_id := v_reservation_audit_log_id;
  puppy_audit_log_id := v_puppy_audit_log_id;
  return next;
end;
$$;

comment on function public.core_cancel_reservation(uuid, uuid, text, boolean, text, text) is
  'Controlled reservation cancellation foundation. Cancels active reservations, optionally releases the linked puppy when safe, preserves ledger/history, and writes event/audit records.';
