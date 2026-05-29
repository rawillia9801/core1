-- Cherolee Core V1 Core-native manual application creation smoke test.
--
-- TEST DATA ONLY: these records are fictional and are rolled back at the end.
-- This test validates the database RPC foundation for future private
-- /staff/applications/new entry. It does not send email, connect Zoho,
-- create reservations, collect payments, create documents, enable RLS,
-- or import production data.

\set ON_ERROR_STOP on

begin;

insert into public.core_profiles (
  id, display_name, email, phone, phone_normalized, role, status, metadata
) values
  (
    '61000000-0000-0000-0000-000000000001',
    'Manual Application Test Owner',
    'manual.owner@example.invalid',
    '+12765550700',
    '+12765550700',
    'owner',
    'active',
    '{"test_only": true}'::jsonb
  ),
  (
    '61000000-0000-0000-0000-000000000002',
    'Manual Application Test Admin',
    'manual.admin@example.invalid',
    '+12765550701',
    '+12765550701',
    'admin',
    'active',
    '{"test_only": true}'::jsonb
  ),
  (
    '61000000-0000-0000-0000-000000000003',
    'Manual Application Test Staff',
    'manual.staff@example.invalid',
    '+12765550702',
    '+12765550702',
    'staff',
    'active',
    '{"test_only": true}'::jsonb
  ),
  (
    '61000000-0000-0000-0000-000000000004',
    'Manual Application Test Inactive',
    'manual.inactive@example.invalid',
    '+12765550703',
    '+12765550703',
    'admin',
    'inactive',
    '{"test_only": true}'::jsonb
  );

select *
from public.core_create_application_manual(
  '61000000-0000-0000-0000-000000000001',
  'Sarah Manual Applicant',
  'sarah.manual@example.invalid',
  null,
  'Email',
  'Current Puppy',
  'Long Coat',
  'Female',
  'Cream',
  'One older small dog. TEST ONLY.',
  'TEST ONLY household notes.',
  'Ready after supplies are prepared. TEST ONLY.',
  'Deposit and remainder due at pickup. TEST ONLY.',
  true,
  'TEST ONLY staff notes.',
  'core_manual_staff_entry'
);

do $$
declare
  v_buyer_id uuid;
  v_family_id uuid;
  v_application_id uuid;
  v_section_count integer;
  v_event_count integer;
  v_audit_count integer;
  v_duplicate_result record;
  v_buyer_count integer;
begin
  select id
  into v_buyer_id
  from public.core_buyers
  where email_normalized = 'sarah.manual@example.invalid';

  if v_buyer_id is null then
    raise exception 'Expected buyer to be created for manual application.';
  end if;

  if not exists (
    select 1
    from public.core_buyers
    where id = v_buyer_id
      and first_name = 'Sarah'
      and last_name = 'Manual Applicant'
      and approval_status = 'pending'
      and source = 'core_manual_staff_entry'
  ) then
    raise exception 'Expected buyer identity fields/source to be set.';
  end if;

  select id, family_id
  into v_application_id, v_family_id
  from public.core_applications
  where buyer_id = v_buyer_id
    and source = 'core_manual_staff_entry'
  order by created_at asc
  limit 1;

  if v_application_id is null then
    raise exception 'Expected application to be created.';
  end if;

  if not exists (
    select 1
    from public.core_applications
    where id = v_application_id
      and buyer_id = v_buyer_id
      and family_id = v_family_id
      and status = 'received'
      and metadata ->> 'intake_path' = 'manual_staff_entry'
      and metadata ->> 'terms_acknowledged' = 'true'
  ) then
    raise exception 'Expected manual application header fields.';
  end if;

  if not exists (
    select 1
    from public.core_family_members
    where family_id = v_family_id
      and buyer_id = v_buyer_id
      and relationship = 'applicant'
      and is_primary_contact is true
      and portal_access_status = 'not_invited'
  ) then
    raise exception 'Expected primary applicant family member link.';
  end if;

  select count(*)
  into v_section_count
  from public.core_application_sections
  where application_id = v_application_id;

  if v_section_count <> 5 then
    raise exception 'Expected 5 manual application sections, got %.', v_section_count;
  end if;

  if not exists (
    select 1
    from public.core_application_sections
    where application_id = v_application_id
      and section_key = 'applicant_contact'
      and responses ->> 'Applicant_Full_Name' = 'Sarah Manual Applicant'
      and responses ->> 'Email' = 'sarah.manual@example.invalid'
      and responses ->> 'Preferred_Contact_Method' = 'Email'
  ) then
    raise exception 'Expected applicant contact section responses.';
  end if;

  if not exists (
    select 1
    from public.core_application_sections
    where application_id = v_application_id
      and section_key = 'puppy_preferences'
      and responses ->> 'Preferred_Coat_Type' = 'Long Coat'
      and responses ->> 'Preferred_Gender' = 'Female'
      and responses ->> 'Color_Preference' = 'Cream'
  ) then
    raise exception 'Expected puppy preference section responses.';
  end if;

  if not exists (
    select 1
    from public.core_application_sections
    where application_id = v_application_id
      and section_key = 'payment_and_terms'
      and responses ->> 'Payment_Preference' = 'Deposit and remainder due at pickup. TEST ONLY.'
      and responses ->> 'Terms_Acknowledged' = 'true'
  ) then
    raise exception 'Expected payment preference and terms section responses.';
  end if;

  select count(*)
  into v_event_count
  from public.core_events
  where application_id = v_application_id
    and event_type = 'application_created_manual'
    and source = 'core_create_application_manual'
    and created_by_profile_id = '61000000-0000-0000-0000-000000000001';

  if v_event_count <> 1 then
    raise exception 'Expected one manual application event, got %.', v_event_count;
  end if;

  select count(*)
  into v_audit_count
  from public.core_audit_log
  where entity_table = 'core_applications'
    and entity_id = v_application_id
    and action = 'create_application_manual'
    and source = 'core_create_application_manual'
    and actor_profile_id = '61000000-0000-0000-0000-000000000001'
    and outcome = 'success';

  if v_audit_count <> 1 then
    raise exception 'Expected one manual application audit row, got %.', v_audit_count;
  end if;

  select *
  into v_duplicate_result
  from public.core_create_application_manual(
    '61000000-0000-0000-0000-000000000002',
    'Sarah Manual Applicant',
    'sarah.manual@example.invalid',
    '+1 (276) 555-0704',
    'Phone',
    'Current Puppy',
    'No Preference',
    'No Preference',
    'No Preference',
    null,
    null,
    null,
    null,
    true,
    'TEST ONLY duplicate email application.',
    'core_manual_staff_entry'
  );

  if v_duplicate_result.buyer_id <> v_buyer_id then
    raise exception 'Expected duplicate email to reuse existing buyer.';
  end if;

  select count(*)
  into v_buyer_count
  from public.core_buyers
  where email_normalized = 'sarah.manual@example.invalid';

  if v_buyer_count <> 1 then
    raise exception 'Expected duplicate email not to create a second buyer, got %.', v_buyer_count;
  end if;
end
$$;

do $$
begin
  perform public.core_create_application_manual(
    '61000000-0000-0000-0000-000000000001',
    'Terms Missing Applicant',
    'terms.missing@example.invalid',
    null,
    'Email',
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    false,
    null,
    'core_manual_staff_entry'
  );
  raise exception 'Expected missing terms acknowledgement to be rejected.';
exception
  when others then
    if sqlerrm <> 'terms acknowledgement is required' then
      raise;
    end if;
end
$$;

do $$
begin
  perform public.core_create_application_manual(
    '61000000-0000-0000-0000-000000000001',
    '',
    'missing.name@example.invalid',
    null,
    'Email',
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    true,
    null,
    'core_manual_staff_entry'
  );
  raise exception 'Expected missing applicant name to be rejected.';
exception
  when others then
    if sqlerrm <> 'applicant_full_name is required' then
      raise;
    end if;
end
$$;

do $$
begin
  perform public.core_create_application_manual(
    '61000000-0000-0000-0000-000000000001',
    'No Contact Applicant',
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    true,
    null,
    'core_manual_staff_entry'
  );
  raise exception 'Expected missing email and phone to be rejected.';
exception
  when others then
    if sqlerrm <> 'email or phone is required' then
      raise;
    end if;
end
$$;

do $$
begin
  perform public.core_create_application_manual(
    '61000000-0000-0000-0000-000000000004',
    'Inactive Actor Applicant',
    'inactive.actor.applicant@example.invalid',
    null,
    'Email',
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    true,
    null,
    'core_manual_staff_entry'
  );
  raise exception 'Expected inactive actor to be rejected.';
exception
  when others then
    if sqlerrm <> 'actor profile 61000000-0000-0000-0000-000000000004 is not active' then
      raise;
    end if;
end
$$;

do $$
begin
  perform public.core_create_application_manual(
    '61000000-0000-0000-0000-000000000003',
    'Staff Actor Applicant',
    'staff.actor.applicant@example.invalid',
    null,
    'Email',
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    true,
    null,
    'core_manual_staff_entry'
  );
  raise exception 'Expected staff actor to be rejected.';
exception
  when others then
    if sqlerrm <> 'actor profile 61000000-0000-0000-0000-000000000003 is not authorized for manual application creation' then
      raise;
    end if;
end
$$;

select
  'core_create_application_manual' as validated_function,
  a.status as application_status,
  b.email_normalized,
  f.name as family_name,
  count(distinct s.id) as section_count,
  count(distinct e.id) as event_count,
  count(distinct al.id) as audit_count
from public.core_applications a
join public.core_buyers b on b.id = a.buyer_id
join public.core_families f on f.id = a.family_id
left join public.core_application_sections s on s.application_id = a.id
left join public.core_events e on e.application_id = a.id and e.event_type = 'application_created_manual'
left join public.core_audit_log al on al.entity_id = a.id and al.action = 'create_application_manual'
where b.email_normalized = 'sarah.manual@example.invalid'
group by a.status, b.email_normalized, f.name
order by a.status, f.name;

rollback;
