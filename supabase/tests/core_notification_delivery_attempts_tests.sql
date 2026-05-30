-- Cherolee Core V1 notification delivery-attempt foundation test.
--
-- TEST DATA ONLY: this test verifies the delivery-attempt audit table shape.
-- It does not send email, connect Hostinger SMTP, connect Resend, add provider
-- keys, create provider workers, enable RLS, or import production data.

\set ON_ERROR_STOP on

begin;

insert into public.core_profiles (
  id, display_name, email, role, status, metadata
) values (
  '64000000-0000-0000-0000-000000000001',
  'Delivery Attempt Test Owner',
  'delivery.attempt.owner@example.invalid',
  'owner',
  'active',
  '{"test_only": true}'::jsonb
);

select *
from public.core_queue_notification(
  '64000000-0000-0000-0000-000000000001',
  'application_received',
  'email',
  'delivery.attempt.recipient@example.invalid',
  null,
  null,
  null,
  null,
  null,
  null,
  'application_received',
  'Application received - delivery attempt test',
  'TEST ONLY preview body. This is not sent.',
  '{"test_only": true}'::jsonb
);

do $$
declare
  v_notification_id uuid;
  v_attempt_id uuid;
begin
  select id
  into v_notification_id
  from public.core_notifications
  where payload ->> 'recipient_email' = 'delivery.attempt.recipient@example.invalid'
  order by created_at desc
  limit 1;

  if v_notification_id is null then
    raise exception 'Expected queued test notification.';
  end if;

  insert into public.core_notification_delivery_attempts (
    notification_id,
    provider,
    channel,
    status,
    recipient_email,
    subject,
    idempotency_key,
    request_payload,
    response_payload,
    metadata
  ) values (
    v_notification_id,
    'preview',
    'email',
    'previewed',
    'delivery.attempt.recipient@example.invalid',
    'Application received - delivery attempt test',
    'test-delivery-attempt-preview-001',
    '{"test_only": true, "provider_connected": false}'::jsonb,
    '{"sent": false, "message_id": null}'::jsonb,
    '{"test_only": true, "send_enabled": false}'::jsonb
  )
  returning id into v_attempt_id;

  if not exists (
    select 1
    from public.core_notification_delivery_attempts
    where id = v_attempt_id
      and notification_id = v_notification_id
      and provider = 'preview'
      and channel = 'email'
      and status = 'previewed'
      and recipient_email = 'delivery.attempt.recipient@example.invalid'
      and response_payload ->> 'sent' = 'false'
      and metadata ->> 'send_enabled' = 'false'
  ) then
    raise exception 'Expected preview delivery-attempt row with send disabled metadata.';
  end if;

  if exists (
    select 1
    from public.core_notifications
    where id = v_notification_id
      and sent_at is not null
  ) then
    raise exception 'Delivery-attempt foundation must not mark notification sent_at.';
  end if;
end
$$;

do $$
begin
  insert into public.core_notification_delivery_attempts (
    provider,
    channel,
    status,
    recipient_email
  ) values (
    'mailgun',
    'email',
    'blocked',
    'invalid.provider@example.invalid'
  );

  raise exception 'Expected invalid provider to be rejected.';
exception
  when check_violation then
    null;
end
$$;

do $$
begin
  insert into public.core_notification_delivery_attempts (
    provider,
    channel,
    status,
    recipient_email
  ) values (
    'preview',
    'sms',
    'previewed',
    'invalid.channel@example.invalid'
  );

  raise exception 'Expected invalid channel to be rejected.';
exception
  when check_violation then
    null;
end
$$;

do $$
begin
  insert into public.core_notification_delivery_attempts (
    provider,
    channel,
    status,
    recipient_email
  ) values (
    'preview',
    'email',
    'delivered',
    'invalid.status@example.invalid'
  );

  raise exception 'Expected invalid status to be rejected.';
exception
  when check_violation then
    null;
end
$$;

do $$
begin
  insert into public.core_notification_delivery_attempts (
    provider,
    channel,
    status,
    recipient_email
  ) values (
    'preview',
    'email',
    'previewed',
    'not-an-email'
  );

  raise exception 'Expected invalid recipient email to be rejected.';
exception
  when check_violation then
    null;
end
$$;

do $$
begin
  insert into public.core_notification_delivery_attempts (
    provider,
    channel,
    status,
    recipient_email,
    idempotency_key
  ) values
    ('preview', 'email', 'previewed', 'duplicate.one@example.invalid', 'duplicate-key-test'),
    ('preview', 'email', 'previewed', 'duplicate.two@example.invalid', 'duplicate-key-test');

  raise exception 'Expected duplicate idempotency key to be rejected.';
exception
  when unique_violation then
    null;
end
$$;

select
  provider,
  channel,
  status,
  recipient_email,
  response_payload ->> 'sent' as sent,
  metadata ->> 'send_enabled' as send_enabled,
  count(*) as attempt_count
from public.core_notification_delivery_attempts
where recipient_email = 'delivery.attempt.recipient@example.invalid'
group by provider, channel, status, recipient_email, response_payload, metadata;

rollback;
