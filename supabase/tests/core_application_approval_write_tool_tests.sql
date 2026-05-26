-- Cherolee Core V1 application approval write-tool smoke test.
--
-- TEST DATA ONLY: these records are fictional and are rolled back at the end.
-- Run only against a local/development database after all Core V1 migrations.
-- This script must not be used as a production seed or production import mechanism.

\set ON_ERROR_STOP on

begin;

insert into public.core_profiles (
  id, display_name, email, phone, phone_normalized, role, status, metadata
) values (
  '30000000-0000-0000-0000-000000000001',
  'Application Approval Test Admin',
  'approval.admin@example.invalid',
  '+12765550800',
  '+12765550800',
  'admin',
  'active',
  '{"test_only": true}'::jsonb
);

insert into public.core_families (
  id, name, status, notes, metadata
) values (
  '30000000-0000-0000-0000-000000000010',
  'Application Approval Test Family',
  'active',
  'TEST ONLY family for application approval validation.',
  '{"test_only": true}'::jsonb
);

insert into public.core_buyers (
  id, first_name, last_name, email, email_normalized, phone, phone_normalized,
  approval_status, source, notes, metadata
) values (
  '30000000-0000-0000-0000-000000000020',
  'Approval',
  'Test Buyer',
  'approval.buyer@example.invalid',
  'approval.buyer@example.invalid',
  '+12765550801',
  '+12765550801',
  'pending',
  'core_application_approval_write_tool_test',
  'TEST ONLY buyer.',
  '{"test_only": true}'::jsonb
);

insert into public.core_family_members (
  id, family_id, buyer_id, relationship, is_primary_contact, portal_access_status, metadata
) values (
  '30000000-0000-0000-0000-000000000030',
  '30000000-0000-0000-0000-000000000010',
  '30000000-0000-0000-0000-000000000020',
  'test_primary_contact',
  true,
  'test_only',
  '{"test_only": true}'::jsonb
);

insert into public.core_applications (
  id, family_id, buyer_id, external_reference, status, submitted_at, source, metadata
) values (
  '30000000-0000-0000-0000-000000000040',
  '30000000-0000-0000-0000-000000000010',
  '30000000-0000-0000-0000-000000000020',
  'TEST-APPROVAL-APPLICATION-001',
  'received',
  now() - interval '1 day',
  'core_application_approval_write_tool_test',
  '{"test_only": true}'::jsonb
);

select *
from public.core_approve_application(
  '30000000-0000-0000-0000-000000000040',
  '30000000-0000-0000-0000-000000000001',
  'TEST ONLY approved during rollback-safe smoke test.',
  true
);

do $$
declare
  v_event_count integer;
  v_audit_count integer;
  v_notification_count integer;
begin
  if not exists (
    select 1
    from public.core_applications
    where id = '30000000-0000-0000-0000-000000000040'
      and status = 'approved'
      and reviewed_by_profile_id = '30000000-0000-0000-0000-000000000001'
      and reviewed_at is not null
      and decision_notes = 'TEST ONLY approved during rollback-safe smoke test.'
  ) then
    raise exception 'Expected application to be approved with review metadata.';
  end if;

  if not exists (
    select 1
    from public.core_buyers
    where id = '30000000-0000-0000-0000-000000000020'
      and approval_status = 'approved'
  ) then
    raise exception 'Expected linked buyer to be approved.';
  end if;

  select count(*) into v_event_count
  from public.core_events
  where application_id = '30000000-0000-0000-0000-000000000040'
    and event_type = 'application_approved'
    and source = 'core_approve_application';

  if v_event_count <> 1 then
    raise exception 'Expected exactly one application_approved event, got %.', v_event_count;
  end if;

  select count(*) into v_audit_count
  from public.core_audit_log
  where entity_table = 'core_applications'
    and entity_id = '30000000-0000-0000-0000-000000000040'
    and action = 'approve_application'
    and source = 'core_approve_application'
    and outcome = 'success';

  if v_audit_count <> 1 then
    raise exception 'Expected exactly one approval audit log entry, got %.', v_audit_count;
  end if;

  select count(*) into v_notification_count
  from public.core_notifications
  where family_id = '30000000-0000-0000-0000-000000000010'
    and buyer_id = '30000000-0000-0000-0000-000000000020'
    and notification_type = 'application_approved'
    and channel = 'email'
    and status = 'queued';

  if v_notification_count <> 1 then
    raise exception 'Expected exactly one queued notification, got %.', v_notification_count;
  end if;
end
$$;

do $$
begin
  begin
    perform public.core_approve_application(
      '30000000-0000-0000-0000-000000000040',
      '30000000-0000-0000-0000-000000000001',
      'TEST ONLY duplicate approval attempt should fail.',
      false
    );
    raise exception 'Expected duplicate approval attempt to fail.';
  exception when others then
    if sqlerrm = 'Expected duplicate approval attempt to fail.' then
      raise;
    end if;
  end;
end
$$;

select
  'core_approve_application' as validated_function,
  a.status as application_status,
  b.approval_status as buyer_approval_status,
  count(distinct e.id) as event_count,
  count(distinct al.id) as audit_count,
  count(distinct n.id) as notification_count
from public.core_applications a
join public.core_buyers b on b.id = a.buyer_id
left join public.core_events e on e.application_id = a.id and e.event_type = 'application_approved'
left join public.core_audit_log al on al.entity_id = a.id and al.action = 'approve_application'
left join public.core_notifications n on n.buyer_id = b.id and n.notification_type = 'application_approved'
where a.id = '30000000-0000-0000-0000-000000000040'
group by a.status, b.approval_status;

rollback;
