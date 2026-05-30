-- Cherolee Core V1 email template seed smoke test.
--
-- TEST DATA ONLY: this test only verifies preview-only template seed records.
-- It does not send email, connect Hostinger SMTP, connect Resend, add provider
-- keys, create provider delivery attempts, enable RLS, or import production data.

\set ON_ERROR_STOP on

begin;

do $$
declare
  v_expected_count integer := 9;
  v_actual_count integer;
  v_bad_count integer;
begin
  select count(*)
  into v_actual_count
  from public.core_message_templates
  where template_key in (
    'application_received',
    'application_approved',
    'reservation_created',
    'payment_received',
    'payment_reminder',
    'reservation_cancelled',
    'go_home_reminder',
    'document_ready',
    'staff_alert'
  )
    and channel = 'email';

  if v_actual_count <> v_expected_count then
    raise exception 'Expected % seeded email templates, got %.', v_expected_count, v_actual_count;
  end if;

  select count(*)
  into v_bad_count
  from public.core_message_templates
  where template_key in (
    'application_received',
    'application_approved',
    'reservation_created',
    'payment_received',
    'payment_reminder',
    'reservation_cancelled',
    'go_home_reminder',
    'document_ready',
    'staff_alert'
  )
    and channel = 'email'
    and (
      status <> 'draft'
      or metadata ->> 'preview_only' <> 'true'
      or metadata ->> 'send_enabled' <> 'false'
      or metadata ->> 'provider_connected' <> 'false'
      or metadata ->> 'owner_admin_approval_required' <> 'true'
      or coalesce(subject_template, '') = ''
      or coalesce(body_template, '') = ''
    );

  if v_bad_count <> 0 then
    raise exception 'Expected all seeded email templates to be draft, preview-only, send-disabled, provider-disconnected, and populated. Bad count: %.', v_bad_count;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from public.core_message_templates
    where template_key = 'reservation_cancelled'
      and channel = 'email'
      and body_template ilike '%does not imply a refund%'
      and metadata ->> 'safety_note' ilike '%must not imply refund%'
  ) then
    raise exception 'Expected reservation_cancelled template to include refund safety language.';
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from public.core_message_templates
    where template_key in (
      'application_received',
      'application_approved',
      'reservation_created',
      'payment_received',
      'payment_reminder',
      'reservation_cancelled',
      'go_home_reminder',
      'document_ready',
      'staff_alert'
    )
      and channel <> 'email'
  ) then
    raise exception 'Expected seed foundation to create only email-channel templates.';
  end if;
end
$$;

select
  template_key,
  channel,
  status,
  metadata ->> 'preview_only' as preview_only,
  metadata ->> 'send_enabled' as send_enabled,
  metadata ->> 'provider_connected' as provider_connected,
  length(subject_template) > 0 as has_subject_template,
  length(body_template) > 0 as has_body_template
from public.core_message_templates
where template_key in (
  'application_received',
  'application_approved',
  'reservation_created',
  'payment_received',
  'payment_reminder',
  'reservation_cancelled',
  'go_home_reminder',
  'document_ready',
  'staff_alert'
)
  and channel = 'email'
order by template_key;

rollback;
