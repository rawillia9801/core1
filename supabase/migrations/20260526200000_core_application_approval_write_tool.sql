-- Cherolee Core V1 controlled application approval write function.
--
-- Business rule:
--   * Core changes must happen through validated write tools, not scattered direct edits.
--   * This function approves exactly one Core application, updates the linked buyer approval status,
--     records an operational event, records an audit log entry, and can optionally queue a notification.
--
-- Migration caution:
--   * This does not build UI, dashboard actions, RLS policies, Zoho sync, email sending, Twilio,
--     payment behavior, production credentials, or production data imports.
--   * Notification rows created here are queued records only. Nothing is sent.
--   * This function is a database-layer foundation for a later server-side action.

create or replace function public.core_approve_application(
  p_application_id uuid,
  p_actor_profile_id uuid,
  p_decision_notes text default null,
  p_queue_notification boolean default false
)
returns table (
  application_id uuid,
  buyer_id uuid,
  family_id uuid,
  application_status text,
  buyer_approval_status text,
  event_id uuid,
  audit_log_id uuid,
  notification_id uuid
)
language plpgsql
security invoker
as $$
declare
  v_application_old public.core_applications%rowtype;
  v_application_new public.core_applications%rowtype;
  v_buyer_old public.core_buyers%rowtype;
  v_buyer_new public.core_buyers%rowtype;
  v_event_id uuid;
  v_audit_log_id uuid;
  v_notification_id uuid;
  v_actor_name text;
begin
  if p_application_id is null then
    raise exception 'application_id is required';
  end if;

  if p_actor_profile_id is null then
    raise exception 'actor_profile_id is required';
  end if;

  select *
  into v_application_old
  from public.core_applications
  where id = p_application_id
  for update;

  if not found then
    raise exception 'application % was not found', p_application_id;
  end if;

  if v_application_old.status in ('approved', 'declined', 'void') then
    raise exception 'application % is already in terminal status %', p_application_id, v_application_old.status;
  end if;

  select display_name
  into v_actor_name
  from public.core_profiles
  where id = p_actor_profile_id;

  if v_actor_name is null then
    raise exception 'actor profile % was not found', p_actor_profile_id;
  end if;

  update public.core_applications
  set
    status = 'approved',
    reviewed_at = now(),
    reviewed_by_profile_id = p_actor_profile_id,
    decision_notes = nullif(p_decision_notes, '')
  where id = p_application_id
  returning * into v_application_new;

  if v_application_new.buyer_id is not null then
    select *
    into v_buyer_old
    from public.core_buyers
    where id = v_application_new.buyer_id
    for update;

    update public.core_buyers
    set approval_status = 'approved'
    where id = v_application_new.buyer_id
    returning * into v_buyer_new;
  end if;

  insert into public.core_events (
    event_type,
    event_at,
    summary,
    family_id,
    buyer_id,
    application_id,
    related_table,
    related_id,
    source,
    details,
    created_by_profile_id
  ) values (
    'application_approved',
    now(),
    concat('Application approved by ', v_actor_name),
    v_application_new.family_id,
    v_application_new.buyer_id,
    v_application_new.id,
    'core_applications',
    v_application_new.id,
    'core_approve_application',
    jsonb_build_object(
      'decision_notes', nullif(p_decision_notes, ''),
      'queue_notification', p_queue_notification
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
    'core_approve_application',
    'approve_application',
    'core_applications',
    v_application_new.id,
    jsonb_build_object(
      'application', to_jsonb(v_application_old),
      'buyer', case when v_buyer_old.id is null then null else to_jsonb(v_buyer_old) end
    ),
    jsonb_build_object(
      'application', to_jsonb(v_application_new),
      'buyer', case when v_buyer_new.id is null then null else to_jsonb(v_buyer_new) end
    ),
    jsonb_build_object(
      'decision_notes_provided', nullif(p_decision_notes, '') is not null,
      'queue_notification', p_queue_notification
    ),
    'success'
  ) returning id into v_audit_log_id;

  if p_queue_notification then
    insert into public.core_notifications (
      family_id,
      buyer_id,
      notification_type,
      channel,
      status,
      scheduled_at,
      payload
    ) values (
      v_application_new.family_id,
      v_application_new.buyer_id,
      'application_approved',
      'email',
      'queued',
      now(),
      jsonb_build_object(
        'application_id', v_application_new.id,
        'audit_log_id', v_audit_log_id,
        'event_id', v_event_id,
        'note', 'Queued only; no email provider is connected.'
      )
    ) returning id into v_notification_id;
  end if;

  application_id := v_application_new.id;
  buyer_id := v_application_new.buyer_id;
  family_id := v_application_new.family_id;
  application_status := v_application_new.status;
  buyer_approval_status := coalesce(v_buyer_new.approval_status, v_buyer_old.approval_status);
  event_id := v_event_id;
  audit_log_id := v_audit_log_id;
  notification_id := v_notification_id;
  return next;
end;
$$;

comment on function public.core_approve_application(uuid, uuid, text, boolean) is
  'Controlled application approval write foundation. Updates the application and linked buyer, writes event/audit records, and optionally queues a notification without sending anything.';
