-- Cherolee Core V1 fake Zoho application intake smoke test.
--
-- TEST DATA ONLY: these records are fictional and are rolled back at the end.
-- Run only against a local/development database after all Core V1 migrations.
-- This script must not be used as a production seed or production import mechanism.

\set ON_ERROR_STOP on

begin;

insert into public.core_profiles (
  id, display_name, email, phone, phone_normalized, role, status, metadata
) values (
  '50000000-0000-0000-0000-000000000001',
  'Zoho Intake Test Admin',
  'zoho.intake.admin@example.invalid',
  '+12765550600',
  '+12765550600',
  'admin',
  'active',
  '{"test_only": true}'::jsonb
);

select *
from public.core_ingest_zoho_application(
  jsonb_build_object(
    'Applicant_Name', 'Zoho Test Applicant',
    'Application_Approved_Email_Sent', false,
    'Application_ID', 'TEST-ZOHO-APP-001',
    'Record_Image', null,
    'Name', 'Zoho Test Application Name',
    'Owner', 'Zoho Test Owner',
    'Application_Received_Email_Sent', true,
    'Application_Review_Status', 'Needs Review',
    'Approval_Notes', 'TEST ONLY approval notes placeholder.',
    'Approved_Date', null,
    'Budget_Range', '$2000-$2500',
    'Created_Buyers', 'ZOHO-BUYER-001',
    'Color_Preference', jsonb_build_array('Cream', 'Chocolate'),
    'Connected_To__s', jsonb_build_array('Applications'),
    'Created_By', 'Zoho Test Creator',
    'Declarations_Signed', 'Yes - TEST ONLY declaration text.',
    'Desired_Adoption_Date', '2026-06-15',
    'E_Signature_File', null,
    'Email', 'zoho.test.applicant@example.invalid',
    'Email_Opt_Out', false,
    'Follow_Up_Date', '2026-05-29',
    'Follow_Up_Needed', true,
    'Has_Other_Pets', true,
    'Interest_Type', 'Pet',
    'Linked_Deal', 'ZOHO-DEAL-001',
    'Modified_By', 'Zoho Test Modifier',
    'Other_Pets_Details', 'One older small dog. TEST ONLY.',
    'Phone', '+1 (276) 555-0601',
    'Preferred_Coat_Type', 'Long Coat',
    'Preferred_Gender', 'Female',
    'Review_Notes', 'TEST ONLY internal review notes.',
    'Secondary_Email', 'zoho.secondary@example.invalid',
    'Source_Form', 'PuppyApplication',
    'Status', 'New',
    'Tag', 'TEST_ONLY'
  ),
  '50000000-0000-0000-0000-000000000001'
);

do $$
declare
  v_buyer_id uuid;
  v_family_id uuid;
  v_application_id uuid;
  v_section_count integer;
  v_event_count integer;
  v_audit_count integer;
begin
  select id into v_buyer_id
  from public.core_buyers
  where email_normalized = 'zoho.test.applicant@example.invalid';

  if v_buyer_id is null then
    raise exception 'Expected buyer to be created from fake Zoho payload.';
  end if;

  if not exists (
    select 1
    from public.core_buyers
    where id = v_buyer_id
      and first_name = 'Zoho'
      and last_name = 'Test Applicant'
      and phone_normalized = '+12765550601'
      and approval_status = 'pending'
      and source = 'zoho_puppy_application_intake'
  ) then
    raise exception 'Expected buyer fields to be mapped from fake Zoho payload.';
  end if;

  select id into v_application_id
  from public.core_applications
  where external_reference = 'TEST-ZOHO-APP-001';

  if v_application_id is null then
    raise exception 'Expected application to be created from fake Zoho payload.';
  end if;

  select family_id into v_family_id
  from public.core_applications
  where id = v_application_id;

  if not exists (
    select 1
    from public.core_applications
    where id = v_application_id
      and buyer_id = v_buyer_id
      and status = 'needs_review'
      and source = 'PuppyApplication'
  ) then
    raise exception 'Expected application header to be mapped and normalized.';
  end if;

  if not exists (
    select 1
    from public.core_family_members
    where family_id = v_family_id
      and buyer_id = v_buyer_id
      and relationship = 'applicant'
      and is_primary_contact is true
  ) then
    raise exception 'Expected family membership to be created.';
  end if;

  select count(*) into v_section_count
  from public.core_application_sections
  where application_id = v_application_id;

  if v_section_count <> 6 then
    raise exception 'Expected 6 application sections, got %.', v_section_count;
  end if;

  if not exists (
    select 1
    from public.core_application_sections
    where application_id = v_application_id
      and section_key = 'puppy_preferences'
      and responses ->> 'Preferred_Gender' = 'Female'
      and responses ->> 'Preferred_Coat_Type' = 'Long Coat'
  ) then
    raise exception 'Expected puppy preference section values.';
  end if;

  if not exists (
    select 1
    from public.core_application_sections
    where application_id = v_application_id
      and section_key = 'household_fit'
      and responses ->> 'Has_Other_Pets' = 'true'
  ) then
    raise exception 'Expected household fit section values.';
  end if;

  select count(*) into v_event_count
  from public.core_events
  where application_id = v_application_id
    and event_type = 'application_imported'
    and source = 'core_ingest_zoho_application';

  if v_event_count <> 1 then
    raise exception 'Expected exactly one application_imported event, got %.', v_event_count;
  end if;

  select count(*) into v_audit_count
  from public.core_audit_log
  where entity_table = 'core_applications'
    and entity_id = v_application_id
    and action = 'ingest_zoho_application'
    and source = 'core_ingest_zoho_application'
    and outcome = 'success';

  if v_audit_count <> 1 then
    raise exception 'Expected exactly one Zoho intake audit log, got %.', v_audit_count;
  end if;
end
$$;

select
  'core_ingest_zoho_application' as validated_function,
  a.external_reference,
  a.status as application_status,
  b.email_normalized,
  b.phone_normalized,
  count(distinct s.id) as section_count,
  count(distinct e.id) as event_count,
  count(distinct al.id) as audit_count
from public.core_applications a
join public.core_buyers b on b.id = a.buyer_id
left join public.core_application_sections s on s.application_id = a.id
left join public.core_events e on e.application_id = a.id and e.event_type = 'application_imported'
left join public.core_audit_log al on al.entity_id = a.id and al.action = 'ingest_zoho_application'
where a.external_reference = 'TEST-ZOHO-APP-001'
group by a.external_reference, a.status, b.email_normalized, b.phone_normalized;

rollback;
