-- Cherolee Core V1 Zoho application report-label intake smoke test.
--
-- TEST DATA ONLY: these records are fictional and are rolled back at the end.
-- This test uses the Zoho Puppy Application Report label shape from a sample report,
-- but all values below are fake non-production values.

\set ON_ERROR_STOP on

begin;

insert into public.core_profiles (
  id, display_name, email, phone, phone_normalized, role, status, metadata
) values (
  '60000000-0000-0000-0000-000000000001',
  'Zoho Report Label Test Admin',
  'zoho.report.admin@example.invalid',
  '+12765550500',
  '+12765550500',
  'admin',
  'active',
  '{"test_only": true}'::jsonb
);

select *
from public.core_ingest_zoho_application(
  jsonb_build_object(
    'Form', 'Puppy Application',
    'Southwest Virginia Chihuahua Application ID', 'TEST-REPORT-604568',
    'First and Last Name', 'Report Test Applicant',
    'Email Address', 'report.test.applicant@example.invalid',
    'Phone Number', '+1 (276) 555-0501',
    'Street Address', '100 Test Report Lane',
    'City', 'Testville',
    'State', 'VA',
    'Zip Code', '00000',
    'Preferred Contact Method', 'Email',
    'Preferred Coat Type', 'No Preference',
    'Preferred Gender', 'No Preference',
    'Color Preference', 'Gold',
    'Desired Adoption Date', '14-Jul-2028',
    'Interest Type', 'Current Puppy',
    'Do You Have Other Pets?', 'No',
    'Pet Details', 'TEST ONLY pet details.',
    'Owned A Chihuahua Before?', 'No',
    'Home Type', 'Apartment',
    'Fenced Yard?', 'No',
    'Work Status', 'Part-Time',
    'Who Cares for Puppy?', 'Test caregiver',
    'Children at Home', '2',
    'Payment Preference', 'Deposit and remainder due at meet',
    'How Did you Hear about us?', 'Referral',
    'Ready to Place Deposit?', 'No',
    'Please input any questions that you may have here.', 'TEST ONLY applicant question.',
    'Terms and Conditions', 'Agreed',
    'Date-Time', '24-May-2026 04:28 AM',
    'Signature', 'present-in-source-report',
    'Added Time', '24-May-2026 04:28:28',
    'CRM Status', 'New Record - Record added',
    'Referrer Name', null,
    'Task Owner', 'contact@example.invalid',
    'Comments', 'No Comments'
  ),
  '60000000-0000-0000-0000-000000000001'
);

do $$
declare
  v_buyer_id uuid;
  v_application_id uuid;
  v_section_count integer;
  v_event_count integer;
  v_audit_count integer;
begin
  select id into v_buyer_id
  from public.core_buyers
  where email_normalized = 'report.test.applicant@example.invalid';

  if v_buyer_id is null then
    raise exception 'Expected buyer to be created from report-label payload.';
  end if;

  if not exists (
    select 1
    from public.core_buyers
    where id = v_buyer_id
      and first_name = 'Report'
      and last_name = 'Test Applicant'
      and phone_normalized = '+12765550501'
      and street_address = '100 Test Report Lane'
      and city = 'Testville'
      and state = 'VA'
      and postal_code = '00000'
      and approval_status = 'pending'
  ) then
    raise exception 'Expected buyer identity/address fields from report labels.';
  end if;

  select id into v_application_id
  from public.core_applications
  where external_reference = 'TEST-REPORT-604568';

  if v_application_id is null then
    raise exception 'Expected application to be created from report-label payload.';
  end if;

  if not exists (
    select 1
    from public.core_applications
    where id = v_application_id
      and buyer_id = v_buyer_id
      and status = 'received'
      and source = 'Puppy Application'
      and metadata ->> 'payload_shape' = 'report_labels'
      and metadata ->> 'task_owner' = 'contact@example.invalid'
  ) then
    raise exception 'Expected application header/metadata to be mapped from report labels.';
  end if;

  select count(*) into v_section_count
  from public.core_application_sections
  where application_id = v_application_id;

  if v_section_count <> 7 then
    raise exception 'Expected 7 application sections for report-label payload, got %.', v_section_count;
  end if;

  if not exists (
    select 1
    from public.core_application_sections
    where application_id = v_application_id
      and section_key = 'applicant_contact'
      and responses ->> 'Preferred_Contact_Method' = 'Email'
      and responses ->> 'Street_Address' = '100 Test Report Lane'
  ) then
    raise exception 'Expected applicant contact section values from report labels.';
  end if;

  if not exists (
    select 1
    from public.core_application_sections
    where application_id = v_application_id
      and section_key = 'household_fit'
      and responses ->> 'Home_Type' = 'Apartment'
      and responses ->> 'Children_At_Home' = '2'
  ) then
    raise exception 'Expected household fit section values from report labels.';
  end if;

  if not exists (
    select 1
    from public.core_application_sections
    where application_id = v_application_id
      and section_key = 'payment_and_readiness'
      and responses ->> 'Payment_Preference' = 'Deposit and remainder due at meet'
      and responses ->> 'Applicant_Questions' = 'TEST ONLY applicant question.'
  ) then
    raise exception 'Expected payment/readiness section values from report labels.';
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
    raise exception 'Expected exactly one report-label intake audit log, got %.', v_audit_count;
  end if;
end
$$;

select
  'core_ingest_zoho_application_report_labels' as validated_function,
  a.external_reference,
  a.status as application_status,
  a.source,
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
where a.external_reference = 'TEST-REPORT-604568'
group by a.external_reference, a.status, a.source, b.email_normalized, b.phone_normalized;

rollback;
