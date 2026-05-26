-- Cherolee Core V1 Zoho-style application intake foundation.
--
-- Business rule:
--   * Core may ingest application data only through a controlled intake path.
--   * This function accepts a Zoho-like JSONB payload and maps it to Core buyer, family,
--     application, application sections, event, and audit records.
--
-- Migration caution:
--   * This does not connect to live Zoho.
--   * This does not create a webhook endpoint.
--   * This does not import production data.
--   * This does not approve applications, create reservations, send email, enable RLS,
--     or connect any external integration.

create or replace function public.core_ingest_zoho_application(
  p_payload jsonb,
  p_actor_profile_id uuid default null
)
returns table (
  buyer_id uuid,
  family_id uuid,
  application_id uuid,
  application_status text,
  section_count integer,
  event_id uuid,
  audit_log_id uuid
)
language plpgsql
security invoker
as $$
declare
  v_external_reference text;
  v_applicant_name text;
  v_first_name text;
  v_last_name text;
  v_email text;
  v_email_normalized text;
  v_phone text;
  v_phone_normalized text;
  v_secondary_email text;
  v_source_form text;
  v_raw_status text;
  v_raw_review_status text;
  v_core_status text;
  v_buyer_id uuid;
  v_family_id uuid;
  v_application_id uuid;
  v_event_id uuid;
  v_audit_log_id uuid;
  v_actor_name text;
  v_section_count integer := 0;
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'payload must be a JSON object';
  end if;

  v_external_reference := nullif(trim(p_payload ->> 'Application_ID'), '');
  v_applicant_name := nullif(trim(p_payload ->> 'Applicant_Name'), '');
  v_email := nullif(trim(p_payload ->> 'Email'), '');
  v_secondary_email := nullif(trim(p_payload ->> 'Secondary_Email'), '');
  v_phone := nullif(trim(p_payload ->> 'Phone'), '');
  v_source_form := coalesce(nullif(trim(p_payload ->> 'Source_Form'), ''), 'zoho_puppy_application');
  v_raw_status := nullif(trim(p_payload ->> 'Status'), '');
  v_raw_review_status := nullif(trim(p_payload ->> 'Application_Review_Status'), '');

  if v_external_reference is null then
    raise exception 'Application_ID is required for Zoho intake dedupe';
  end if;

  if v_applicant_name is null and v_email is null and v_phone is null then
    raise exception 'at least one applicant identifier is required';
  end if;

  v_email_normalized := lower(v_email);
  v_phone_normalized := regexp_replace(coalesce(v_phone, ''), '[^0-9+]', '', 'g');
  if v_phone_normalized = '' then
    v_phone_normalized := null;
  end if;

  if v_applicant_name is not null and position(' ' in v_applicant_name) > 0 then
    v_first_name := split_part(v_applicant_name, ' ', 1);
    v_last_name := nullif(trim(substr(v_applicant_name, length(v_first_name) + 1)), '');
  else
    v_first_name := v_applicant_name;
    v_last_name := null;
  end if;

  v_core_status := case
    when lower(coalesce(v_raw_review_status, v_raw_status, '')) like '%approved%' then 'approved'
    when lower(coalesce(v_raw_review_status, v_raw_status, '')) like '%declin%' then 'declined'
    when lower(coalesce(v_raw_review_status, v_raw_status, '')) like '%follow%' then 'needs_review'
    when lower(coalesce(v_raw_review_status, v_raw_status, '')) like '%review%' then 'needs_review'
    else 'received'
  end;

  if p_actor_profile_id is not null then
    select display_name into v_actor_name
    from public.core_profiles
    where id = p_actor_profile_id;

    if v_actor_name is null then
      raise exception 'actor profile % was not found', p_actor_profile_id;
    end if;
  end if;

  select id into v_buyer_id
  from public.core_buyers
  where (v_email_normalized is not null and email_normalized = v_email_normalized)
     or (v_phone_normalized is not null and phone_normalized = v_phone_normalized)
  order by created_at asc
  limit 1;

  if v_buyer_id is null then
    insert into public.core_buyers (
      external_reference,
      first_name,
      last_name,
      email,
      email_normalized,
      phone,
      phone_normalized,
      approval_status,
      source,
      metadata
    ) values (
      p_payload ->> 'Created_Buyers',
      v_first_name,
      v_last_name,
      v_email,
      v_email_normalized,
      v_phone,
      v_phone_normalized,
      'pending',
      'zoho_puppy_application_intake',
      jsonb_build_object(
        'applicant_name_raw', v_applicant_name,
        'secondary_email', v_secondary_email,
        'email_opt_out', p_payload -> 'Email_Opt_Out',
        'zoho_created_buyer', p_payload -> 'Created_Buyers',
        'source_payload_keys', jsonb_object_keys(p_payload)
      )
    ) returning id into v_buyer_id;
  else
    update public.core_buyers
    set
      first_name = coalesce(first_name, v_first_name),
      last_name = coalesce(last_name, v_last_name),
      email = coalesce(email, v_email),
      email_normalized = coalesce(email_normalized, v_email_normalized),
      phone = coalesce(phone, v_phone),
      phone_normalized = coalesce(phone_normalized, v_phone_normalized),
      metadata = metadata || jsonb_build_object(
        'last_zoho_application_id', v_external_reference,
        'secondary_email', v_secondary_email,
        'email_opt_out', p_payload -> 'Email_Opt_Out'
      )
    where id = v_buyer_id;
  end if;

  insert into public.core_families (
    name,
    status,
    notes,
    metadata
  ) values (
    coalesce(v_applicant_name, v_email, v_phone, 'Zoho Applicant') || ' Household',
    'active',
    'Created from Zoho-style application intake payload.',
    jsonb_build_object('source', 'zoho_puppy_application_intake', 'zoho_application_id', v_external_reference)
  ) returning id into v_family_id;

  insert into public.core_family_members (
    family_id,
    buyer_id,
    relationship,
    is_primary_contact,
    portal_access_status,
    metadata
  ) values (
    v_family_id,
    v_buyer_id,
    'applicant',
    true,
    'not_invited',
    jsonb_build_object('source', 'zoho_puppy_application_intake')
  );

  select id into v_application_id
  from public.core_applications
  where external_reference = v_external_reference
  limit 1;

  if v_application_id is null then
    insert into public.core_applications (
      family_id,
      buyer_id,
      external_reference,
      status,
      submitted_at,
      reviewed_at,
      reviewed_by_profile_id,
      decision_notes,
      source,
      metadata
    ) values (
      v_family_id,
      v_buyer_id,
      v_external_reference,
      v_core_status,
      now(),
      case when v_core_status in ('approved', 'declined') then now() else null end,
      case when v_core_status in ('approved', 'declined') then p_actor_profile_id else null end,
      nullif(p_payload ->> 'Approval_Notes', ''),
      v_source_form,
      jsonb_build_object(
        'zoho_application_name', p_payload -> 'Name',
        'zoho_status', p_payload -> 'Status',
        'zoho_review_status', p_payload -> 'Application_Review_Status',
        'zoho_owner', p_payload -> 'Owner',
        'zoho_created_by', p_payload -> 'Created_By',
        'zoho_modified_by', p_payload -> 'Modified_By',
        'zoho_linked_deal', p_payload -> 'Linked_Deal',
        'zoho_connected_to', p_payload -> 'Connected_To__s',
        'zoho_tag', p_payload -> 'Tag',
        'received_email_sent', p_payload -> 'Application_Received_Email_Sent',
        'approved_email_sent', p_payload -> 'Application_Approved_Email_Sent'
      )
    ) returning id into v_application_id;
  else
    update public.core_applications
    set
      family_id = coalesce(family_id, v_family_id),
      buyer_id = coalesce(buyer_id, v_buyer_id),
      status = case when status in ('approved', 'declined', 'void') then status else v_core_status end,
      metadata = metadata || jsonb_build_object('last_zoho_payload_seen_at', now())
    where id = v_application_id;
  end if;

  insert into public.core_application_sections (
    application_id,
    section_key,
    section_label,
    status,
    responses
  ) values
  (
    v_application_id,
    'applicant_contact',
    'Applicant Contact',
    'received',
    jsonb_build_object(
      'Applicant_Name', p_payload -> 'Applicant_Name',
      'Email', p_payload -> 'Email',
      'Secondary_Email', p_payload -> 'Secondary_Email',
      'Phone', p_payload -> 'Phone',
      'Email_Opt_Out', p_payload -> 'Email_Opt_Out'
    )
  ),
  (
    v_application_id,
    'puppy_preferences',
    'Puppy Preferences',
    'received',
    jsonb_build_object(
      'Interest_Type', p_payload -> 'Interest_Type',
      'Preferred_Gender', p_payload -> 'Preferred_Gender',
      'Preferred_Coat_Type', p_payload -> 'Preferred_Coat_Type',
      'Color_Preference', p_payload -> 'Color_Preference',
      'Desired_Adoption_Date', p_payload -> 'Desired_Adoption_Date',
      'Budget_Range', p_payload -> 'Budget_Range'
    )
  ),
  (
    v_application_id,
    'household_fit',
    'Household & Fit',
    'received',
    jsonb_build_object(
      'Has_Other_Pets', p_payload -> 'Has_Other_Pets',
      'Other_Pets_Details', p_payload -> 'Other_Pets_Details'
    )
  ),
  (
    v_application_id,
    'declarations',
    'Declarations',
    'received',
    jsonb_build_object(
      'Declarations_Signed', p_payload -> 'Declarations_Signed',
      'E_Signature_File', p_payload -> 'E_Signature_File'
    )
  ),
  (
    v_application_id,
    'review',
    'Review',
    'received',
    jsonb_build_object(
      'Application_Review_Status', p_payload -> 'Application_Review_Status',
      'Approval_Notes', p_payload -> 'Approval_Notes',
      'Approved_Date', p_payload -> 'Approved_Date',
      'Follow_Up_Needed', p_payload -> 'Follow_Up_Needed',
      'Follow_Up_Date', p_payload -> 'Follow_Up_Date',
      'Review_Notes', p_payload -> 'Review_Notes'
    )
  ),
  (
    v_application_id,
    'zoho_metadata',
    'Zoho Metadata',
    'received',
    p_payload
  );

  get diagnostics v_section_count = row_count;

  insert into public.core_events (
    event_type,
    event_at,
    summary,
    family_id,
    buyer_id,
    application_id,
    related_table,
    related_id,
    source,
    details,
    created_by_profile_id
  ) values (
    'application_imported',
    now(),
    'Zoho-style application payload imported into Core.',
    v_family_id,
    v_buyer_id,
    v_application_id,
    'core_applications',
    v_application_id,
    'core_ingest_zoho_application',
    jsonb_build_object('zoho_application_id', v_external_reference, 'core_status', v_core_status),
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
    case when p_actor_profile_id is null then 'system' else 'profile' end,
    p_actor_profile_id,
    coalesce(v_actor_name, 'core_ingest_zoho_application'),
    'core_ingest_zoho_application',
    'ingest_zoho_application',
    'core_applications',
    v_application_id,
    null,
    jsonb_build_object('buyer_id', v_buyer_id, 'family_id', v_family_id, 'application_id', v_application_id, 'section_count', v_section_count),
    jsonb_build_object('zoho_application_id', v_external_reference, 'source_form', v_source_form),
    'success'
  ) returning id into v_audit_log_id;

  buyer_id := v_buyer_id;
  family_id := v_family_id;
  application_id := v_application_id;
  application_status := v_core_status;
  section_count := v_section_count;
  event_id := v_event_id;
  audit_log_id := v_audit_log_id;
  return next;
end;
$$;

comment on function public.core_ingest_zoho_application(jsonb, uuid) is
  'Controlled Zoho-style puppy application intake foundation. Maps one payload to Core buyer, family, application, sections, event, and audit records without connecting live Zoho.';
