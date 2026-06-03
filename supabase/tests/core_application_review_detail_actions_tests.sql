-- Cherolee Core application review detail action tests.
--
-- TEST DATA ONLY: these records are fictional and are rolled back at the end.
-- Run only against a local/development database after all Core migrations.

\set ON_ERROR_STOP on

begin;

insert into public.core_profiles (
  id, display_name, email, role, status, metadata
) values (
  '39000000-0000-0000-0000-000000000001',
  'Application Detail Test Owner',
  'application.detail.owner@example.invalid',
  'owner',
  'active',
  '{"test_only": true}'::jsonb
);

insert into public.core_families (
  id, name, status, notes, metadata
) values (
  '39000000-0000-0000-0000-000000000010',
  'Application Detail Test Family',
  'active',
  'TEST ONLY family for application detail review validation.',
  '{"test_only": true}'::jsonb
);

insert into public.core_buyers (
  id, first_name, last_name, email, email_normalized, phone, phone_normalized,
  approval_status, source, notes, metadata
) values (
  '39000000-0000-0000-0000-000000000020',
  'Application',
  'Detail Buyer',
  'application.detail.buyer@example.invalid',
  'application.detail.buyer@example.invalid',
  '+12765553901',
  '+12765553901',
  'pending',
  'core_application_review_detail_actions_test',
  'TEST ONLY buyer.',
  '{"test_only": true}'::jsonb
);

insert into public.core_family_members (
  id, family_id, buyer_id, relationship, is_primary_contact, portal_access_status, metadata
) values (
  '39000000-0000-0000-0000-000000000030',
  '39000000-0000-0000-0000-000000000010',
  '39000000-0000-0000-0000-000000000020',
  'test_primary_contact',
  true,
  'test_only',
  '{"test_only": true}'::jsonb
);

insert into public.core_applications (
  id, family_id, buyer_id, external_reference, status, submitted_at, source, metadata
) values (
  '39000000-0000-0000-0000-000000000040',
  '39000000-0000-0000-0000-000000000010',
  '39000000-0000-0000-0000-000000000020',
  'TEST-APPLICATION-DETAIL-001',
  'received',
  now() - interval '1 day',
  'core_application_review_detail_actions_test',
  '{"test_only": true}'::jsonb
);

insert into public.core_application_sections (
  id, application_id, section_key, section_label, status, responses, review_notes
) values (
  '39000000-0000-0000-0000-000000000050',
  '39000000-0000-0000-0000-000000000040',
  'test_section',
  'Test Section',
  'received',
  '{"Housing": "Owner occupied", "Other_Pets": "One adult dog"}'::jsonb,
  null
);

select *
from public.core_add_application_review_note(
  '39000000-0000-0000-0000-000000000040',
  '39000000-0000-0000-0000-000000000001',
  'TEST ONLY internal note added.'
);

select *
from public.core_mark_application_needs_info(
  '39000000-0000-0000-0000-000000000040',
  '39000000-0000-0000-0000-000000000001',
  'TEST ONLY needs more information.'
);

select *
from public.core_decline_application(
  '39000000-0000-0000-0000-000000000040',
  '39000000-0000-0000-0000-000000000001',
  'TEST ONLY declined during rollback-safe smoke test.'
);

do $$
declare
  v_event_count integer;
  v_audit_count integer;
  v_reservation_count integer;
  v_notification_count integer;
begin
  if not exists (
    select 1
    from public.core_applications
    where id = '39000000-0000-0000-0000-000000000040'
      and status = 'declined'
      and reviewed_by_profile_id = '39000000-0000-0000-0000-000000000001'
      and reviewed_at is not null
      and decision_notes like '%TEST ONLY declined during rollback-safe smoke test.%'
  ) then
    raise exception 'Expected application to be declined with review metadata.';
  end if;

  select count(*) into v_event_count
  from public.core_events
  where application_id = '39000000-0000-0000-0000-000000000040'
    and event_type in (
      'application_review_note_added',
      'application_needs_info',
      'application_declined'
    );

  if v_event_count <> 3 then
    raise exception 'Expected exactly three application review events, got %.', v_event_count;
  end if;

  select count(*) into v_audit_count
  from public.core_audit_log
  where entity_table = 'core_applications'
    and entity_id = '39000000-0000-0000-0000-000000000040'
    and action in (
      'add_application_review_note',
      'mark_application_needs_info',
      'decline_application'
    )
    and outcome = 'success'
    and (request_context ->> 'external_side_effects')::boolean is false;

  if v_audit_count <> 3 then
    raise exception 'Expected exactly three application review audit logs, got %.', v_audit_count;
  end if;

  select count(*) into v_reservation_count
  from public.core_reservations
  where application_id = '39000000-0000-0000-0000-000000000040';

  if v_reservation_count <> 0 then
    raise exception 'Expected no reservation side effects, got %.', v_reservation_count;
  end if;

  select count(*) into v_notification_count
  from public.core_notifications
  where payload ->> 'application_id' = '39000000-0000-0000-0000-000000000040';

  if v_notification_count <> 0 then
    raise exception 'Expected no notification side effects, got %.', v_notification_count;
  end if;
end
$$;

do $$
begin
  begin
    perform public.core_decline_application(
      '39000000-0000-0000-0000-000000000040',
      '39000000-0000-0000-0000-000000000001',
      'TEST ONLY duplicate decline attempt should fail.'
    );
    raise exception 'Expected duplicate decline attempt to fail.';
  exception when others then
    if sqlerrm = 'Expected duplicate decline attempt to fail.' then
      raise;
    end if;
  end;
end
$$;

select
  'core_application_review_detail_actions' as validated_area,
  a.status as application_status,
  count(distinct e.id) as event_count,
  count(distinct al.id) as audit_count
from public.core_applications a
left join public.core_events e on e.application_id = a.id
left join public.core_audit_log al on al.entity_id = a.id
where a.id = '39000000-0000-0000-0000-000000000040'
group by a.status;

rollback;
