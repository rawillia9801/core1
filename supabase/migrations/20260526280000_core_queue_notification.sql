-- Cherolee Core V1 notification queue foundation.
--
-- Business rule:
--   * Future transactional emails must be requested through a controlled queue,
--     not sent directly from random form actions.
--   * This foundation queues notification records only. It does not send email.
--
-- Migration caution:
--   * This does not connect Resend or any provider, add provider keys, send email,
--     enable RLS, connect Zoho/Twilio/payments/documents, or import production data.
--   * Provider delivery attempts, provider IDs, and reconciliation are later work.

create or replace function public.core_queue_notification(
  p_actor_profile_id uuid,
  p_notification_type text,
  p_channel text,
  p_recipient_email text default null,
  p_recipient_phone text default null,
  p_buyer_id uuid default null,
  p_family_id uuid default null,
  p_application_id uuid default null,
  p_reservation_id uuid default null,
  p_ledger_entry_id uuid default null,
  p_template_key text default null,
  p_subject text default null,
  p_body_preview text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  notification_id uuid,
  notification_type text,
  channel text,
  status text,
  event_id uuid,
  audit_log_id uuid
)
language plpgsql
security invoker
as $$
declare
  v_actor public.core_profiles%rowtype;
  v_notification public.core_notifications%rowtype;
  v_event_id uuid;
  v_audit_log_id uuid;
  v_notification_type text;
  v_channel text;
  v_recipient_email text;
  v_recipient_phone text;
  v_template_key text;
  v_subject text;
  v_body_preview text;
  v_metadata jsonb;
  v_template_id uuid;
begin
  if p_actor_profile_id is null then
    raise exception 'actor_profile_id is required';
  end if;

  select *
  into v_actor
  from public.core_profiles
  where id = p_actor_profile_id;

  if not found then
    raise exception 'actor profile % was not found', p_actor_profile_id;
  end if;

  if v_actor.status <> 'active' then
    raise exception 'actor profile % is not active', p_actor_profile_id;
  end if;

  v_notification_type := lower(nullif(btrim(coalesce(p_notification_type, '')), ''));
  v_channel := lower(nullif(btrim(coalesce(p_channel, '')), ''));
  v_recipient_email := lower(nullif(btrim(coalesce(p_recipient_email, '')), ''));
  v_recipient_phone := nullif(btrim(coalesce(p_recipient_phone, '')), '');
  v_template_key := nullif(btrim(coalesce(p_template_key, '')), '');
  v_subject := nullif(btrim(coalesce(p_subject, '')), '');
  v_body_preview := nullif(btrim(coalesce(p_body_preview, '')), '');
  v_metadata := coalesce(p_metadata, '{}'::jsonb);

  if v_notification_type not in (
    'application_received',
    'application_approved',
    'reservation_created',
    'payment_received',
    'payment_reminder',
    'reservation_cancelled',
    'go_home_reminder',
    'document_ready',
    'staff_alert'
  ) then
    raise exception 'notification_type is not allowed';
  end if;

  if v_channel not in ('email') then
    raise exception 'channel is not allowed';
  end if;

  if v_channel = 'email' and v_recipient_email is null then
    raise exception 'recipient_email is required for email notifications';
  end if;

  if v_recipient_email is not null
     and (length(v_recipient_email) > 320 or v_recipient_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$') then
    raise exception 'recipient_email is invalid';
  end if;

  if length(coalesce(v_recipient_phone, '')) > 50 then
    raise exception 'recipient_phone must be 50 characters or fewer';
  end if;

  if length(coalesce(v_template_key, '')) > 100 then
    raise exception 'template_key must be 100 characters or fewer';
  end if;

  if length(coalesce(v_subject, '')) > 200 then
    raise exception 'subject must be 200 characters or fewer';
  end if;

  if length(coalesce(v_body_preview, '')) > 5000 then
    raise exception 'body_preview must be 5000 characters or fewer';
  end if;

  if jsonb_typeof(v_metadata) <> 'object' then
    raise exception 'metadata must be a JSON object';
  end if;

  if v_template_key is not null then
    select id
    into v_template_id
    from public.core_message_templates mt
    where mt.template_key = v_template_key
      and mt.channel = v_channel
    order by mt.created_at desc
    limit 1;
  end if;

  insert into public.core_notifications (
    family_id,
    buyer_id,
    template_id,
    notification_type,
    channel,
    status,
    scheduled_at,
    sent_at,
    payload
  ) values (
    p_family_id,
    p_buyer_id,
    v_template_id,
    v_notification_type,
    v_channel,
    'queued',
    now(),
    null,
    jsonb_build_object(
      'recipient_email', v_recipient_email,
      'recipient_phone', v_recipient_phone,
      'application_id', p_application_id,
      'reservation_id', p_reservation_id,
      'ledger_entry_id', p_ledger_entry_id,
      'template_key', v_template_key,
      'subject', v_subject,
      'body_preview', v_body_preview,
      'metadata', v_metadata,
      'send_enabled', false,
      'provider_connected', false,
      'created_by_tool', 'core_queue_notification'
    )
  ) returning * into v_notification;

  insert into public.core_events (
    event_type,
    event_at,
    summary,
    family_id,
    buyer_id,
    application_id,
    reservation_id,
    related_table,
    related_id,
    source,
    details,
    created_by_profile_id
  ) values (
    'notification_queued',
    now(),
    concat('Notification queued by ', coalesce(v_actor.display_name, v_actor.email, 'staff profile')),
    p_family_id,
    p_buyer_id,
    p_application_id,
    p_reservation_id,
    'core_notifications',
    v_notification.id,
    'core_queue_notification',
    jsonb_build_object(
      'notification_type', v_notification_type,
      'channel', v_channel,
      'status', v_notification.status,
      'template_key', v_template_key,
      'ledger_entry_id', p_ledger_entry_id,
      'send_enabled', false,
      'provider_connected', false
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
    coalesce(v_actor.display_name, v_actor.email, 'core_queue_notification'),
    'core_queue_notification',
    'queue_notification',
    'core_notifications',
    v_notification.id,
    null,
    to_jsonb(v_notification),
    jsonb_build_object(
      'notification_type', v_notification_type,
      'channel', v_channel,
      'application_id', p_application_id,
      'reservation_id', p_reservation_id,
      'ledger_entry_id', p_ledger_entry_id,
      'send_enabled', false,
      'provider_connected', false
    ),
    'success'
  ) returning id into v_audit_log_id;

  notification_id := v_notification.id;
  notification_type := v_notification.notification_type;
  channel := v_notification.channel;
  status := v_notification.status;
  event_id := v_event_id;
  audit_log_id := v_audit_log_id;
  return next;
end;
$$;

comment on function public.core_queue_notification(
  uuid,
  text,
  text,
  text,
  text,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  jsonb
) is
  'Controlled notification queue foundation. Creates queued notification records plus event/audit rows only; no email provider is connected and nothing is sent.';
