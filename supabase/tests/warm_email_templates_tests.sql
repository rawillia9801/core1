-- Warm Southwest Virginia Chihuahua email template smoke test.
--
-- TEST DATA ONLY: this verifies draft/preview-only email template copy.
-- It does not send email, connect Hostinger SMTP, add credentials, enable RLS,
-- or import production data.

\set ON_ERROR_STOP on

begin;

do $$
declare
  v_expected_count integer := 9;
  v_actual_count integer;
  v_bad_count integer;
  v_internal_name_count integer;
  v_short_count integer;
  v_duplicate_id_count integer;
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
    raise exception 'Expected % warm email templates, got %.', v_expected_count, v_actual_count;
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
    raise exception 'Expected warm templates to remain draft, preview-only, send-disabled, provider-disconnected, and populated. Bad count: %.', v_bad_count;
  end if;

  select count(*)
  into v_internal_name_count
  from public.core_message_templates
  where template_key in (
    'application_received',
    'application_approved',
    'reservation_created',
    'payment_received',
    'payment_reminder',
    'reservation_cancelled',
    'go_home_reminder',
    'document_ready'
  )
    and channel = 'email'
    and (
      subject_template ~* '\mcore\M'
      or body_template ~* '\mcore\M'
    );

  if v_internal_name_count <> 0 then
    raise exception 'Customer-facing templates must not mention the internal system/operator name.';
  end if;

  select count(*)
  into v_short_count
  from public.core_message_templates
  where template_key in (
    'application_received',
    'application_approved',
    'reservation_created',
    'payment_received',
    'payment_reminder',
    'reservation_cancelled',
    'go_home_reminder',
    'document_ready'
  )
    and channel = 'email'
    and length(body_template) < 450;

  if v_short_count <> 0 then
    raise exception 'Expected customer-facing warm templates to be more complete and warmer. Short count: %.', v_short_count;
  end if;

  select count(*)
  into v_duplicate_id_count
  from (
    select id
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
    group by id
    having count(*) > 1
  ) duplicates;

  if v_duplicate_id_count <> 0 then
    raise exception 'Expected each template row to have a unique id.';
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
      and body_template ilike '%does not imply that a refund has been issued or approved%'
      and metadata ->> 'safety_note' ilike '%must not imply refund%'
  ) then
    raise exception 'Expected reservation_cancelled template to include clear refund safety language.';
  end if;
end
$$;

select
  template_key,
  id,
  channel,
  status,
  metadata ->> 'preview_only' as preview_only,
  metadata ->> 'send_enabled' as send_enabled,
  metadata ->> 'provider_connected' as provider_connected,
  length(subject_template) as subject_length,
  length(body_template) as body_length
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
