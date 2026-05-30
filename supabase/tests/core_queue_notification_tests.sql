-- Cherolee Core V1 notification queue smoke test.
--
-- TEST DATA ONLY: these records are fictional and are rolled back at the end.
-- This validates queue-only notification behavior. It does not connect Resend,
-- send email, create provider delivery attempts, connect Zoho/Twilio/payments,
-- create documents, enable RLS, or import production data.

\set ON_ERROR_STOP on

begin;

insert into public.core_profiles (
  id, display_name, email, phone, phone_normalized, role, status, metadata
) values
  (
    '62000000-0000-0000-0000-000000000001',
    'Notification Queue Test Owner',
    'notification.owner@example.invalid',
    '+12765550800',
    '+12765550800',
    'owner',
    'active',
    '{"test_only": true}'::jsonb
  ),
  (
    '62000000-0000-0000-0000-000000000002',
    'Notification Queue Test Inactive',
    'notification.inactive@example.invalid',
    '+12765550801',
    '+12765550801',
    'admin',
    'inactive',
    '{"test_only": true}'::jsonb
  );

select *
from public.core_queue_notification(
  '62000000-0000-0000-0000-000000000001',
  'application_received',
  'email',
  'queue.recipient@example.invalid',
  null,
  null,
  null,
  null,
  null,
  null,
  'application_received_basic',
  'Application received',
  'TEST ONLY preview body. This is not sent.',
  '{"test_only": true}'::jsonb
);

do $$
declare
  v_notification_id uuid;
  v_event_count integer;
  v_audit_count integer;
begin
  select id
  into v_notification_id
  from public.core_notifications
  where notification_type = 'application_received'
    and channel = 'email'
    and payload ->> 'recipient_email' = 'queue.recipient@example.invalid';

  if v_notification_id is null then
    raise exception 'Expected queued notification row.';
  end if;

  if not exists (
    select 1
    from public.core_notifications
    where id = v_notification_id
      and status = 'queued'
      and sent_at is null
      and payload ->> 'send_enabled' = 'false'
      and payload ->> 'provider_connected' = 'false'
      and payload ->> 'subject' = 'Application received'
      and payload ->> 'body_preview' = 'TEST ONLY preview body. This is not sent.'
  ) then
    raise exception 'Expected queue-only notification payload/status with no sent_at.';
  end if;

  select count(*)
  into v_event_count
  from public.core_events
  where related_table = 'core_notifications'
    and related_id = v_notification_id
    and event_type = 'notification_queued'
    and source = 'core_queue_notification'
    and created_by_profile_id = '62000000-0000-0000-0000-000000000001';

  if v_event_count <> 1 then
    raise exception 'Expected one notification_queued event, got %.', v_event_count;
  end if;

  select count(*)
  into v_audit_count
  from public.core_audit_log
  where entity_table = 'core_notifications'
    and entity_id = v_notification_id
    and action = 'queue_notification'
    and source = 'core_queue_notification'
    and actor_profile_id = '62000000-0000-0000-0000-000000000001'
    and outcome = 'success';

  if v_audit_count <> 1 then
    raise exception 'Expected one queue_notification audit row, got %.', v_audit_count;
  end if;
end
$$;

do $$
begin
  perform public.core_queue_notification(
    '62000000-0000-0000-0000-00000000ffff',
    'application_received',
    'email',
    'missing.actor@example.invalid'
  );
  raise exception 'Expected missing actor to be rejected.';
exception
  when others then
    if sqlerrm <> 'actor profile 62000000-0000-0000-0000-00000000ffff was not found' then
      raise;
    end if;
end
$$;

do $$
begin
  perform public.core_queue_notification(
    '62000000-0000-0000-0000-000000000002',
    'application_received',
    'email',
    'inactive.actor@example.invalid'
  );
  raise exception 'Expected inactive actor to be rejected.';
exception
  when others then
    if sqlerrm <> 'actor profile 62000000-0000-0000-0000-000000000002 is not active' then
      raise;
    end if;
end
$$;

do $$
begin
  perform public.core_queue_notification(
    '62000000-0000-0000-0000-000000000001',
    'application_received',
    'sms',
    null,
    '+12765550899'
  );
  raise exception 'Expected unsupported channel to be rejected.';
exception
  when others then
    if sqlerrm <> 'channel is not allowed' then
      raise;
    end if;
end
$$;

do $$
begin
  perform public.core_queue_notification(
    '62000000-0000-0000-0000-000000000001',
    'random_notice',
    'email',
    'random.notice@example.invalid'
  );
  raise exception 'Expected unsupported notification_type to be rejected.';
exception
  when others then
    if sqlerrm <> 'notification_type is not allowed' then
      raise;
    end if;
end
$$;

do $$
begin
  perform public.core_queue_notification(
    '62000000-0000-0000-0000-000000000001',
    'application_received',
    'email',
    null
  );
  raise exception 'Expected missing recipient_email to be rejected.';
exception
  when others then
    if sqlerrm <> 'recipient_email is required for email notifications' then
      raise;
    end if;
end
$$;

do $$
begin
  perform public.core_queue_notification(
    '62000000-0000-0000-0000-000000000001',
    'application_received',
    'email',
    'not-an-email'
  );
  raise exception 'Expected invalid recipient_email to be rejected.';
exception
  when others then
    if sqlerrm <> 'recipient_email is invalid' then
      raise;
    end if;
end
$$;

select
  'core_queue_notification' as validated_function,
  n.notification_type,
  n.channel,
  n.status,
  n.sent_at,
  n.payload ->> 'recipient_email' as recipient_email,
  n.payload ->> 'send_enabled' as send_enabled,
  n.payload ->> 'provider_connected' as provider_connected,
  count(distinct e.id) as event_count,
  count(distinct al.id) as audit_count
from public.core_notifications n
left join public.core_events e on e.related_id = n.id and e.event_type = 'notification_queued'
left join public.core_audit_log al on al.entity_id = n.id and al.action = 'queue_notification'
where n.payload ->> 'recipient_email' = 'queue.recipient@example.invalid'
group by n.notification_type, n.channel, n.status, n.sent_at, n.payload;

rollback;
