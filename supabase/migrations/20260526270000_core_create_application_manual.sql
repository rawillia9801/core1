-- Cherolee Core V1 Core-native manual application creation.
--
-- Business rule:
--   * Core-native application entry must not depend on Zoho-shaped payloads.
--   * This RPC is for future protected staff/owner entry, not public intake.
--   * Manual entry creates buyer/family/application/sections and records event/audit.
--
-- Migration caution:
--   * This does not build UI, public /apply, RLS policies, email sending,
--     Zoho sync, payment behavior, documents, production credentials, or
--     production data imports.
--   * It does not queue notifications. Email remains a later approved workflow.

create or replace function public.core_create_application_manual(
  p_actor_profile_id uuid,
  p_applicant_full_name text,
  p_email text default null,
  p_phone text default null,
  p_preferred_contact_method text default null,
  p_interest_type text default null,
  p_preferred_coat_type text default null,
  p_preferred_gender text default null,
  p_color_preference text default null,
  p_other_pets text default null,
  p_household_notes text default null,
  p_readiness_notes text default null,
  p_payment_preference text default null,
  p_terms_acknowledged boolean default false,
  p_staff_notes text default null,
  p_source text default 'core_manual_staff_entry'
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
  v_actor public.core_profiles%rowtype;
  v_applicant_full_name text;
  v_first_name text;
  v_last_name text;
  v_email text;
  v_email_normalized text;
  v_phone text;
  v_phone_normalized text;
  v_preferred_contact_method text;
  v_interest_type text;
  v_preferred_coat_type text;
  v_preferred_gender text;
  v_color_preference text;
  v_other_pets text;
  v_household_notes text;
  v_readiness_notes text;
  v_payment_preference text;
  v_staff_notes text;
  v_source text;
  v_buyer_id uuid;
  v_family_id uuid;
  v_application_id uuid;
  v_event_id uuid;
  v_audit_log_id uuid;
  v_section_count integer := 0;
begin
  if p_actor_profile_id is null then
    raise exception 'actor_profile_id is required';
  end if;

  select *
  into v_actor
  from public.core_profiles
  where id = p_actor_profile_id;

  if not found then
    raise exception 'actor profile % was not found', p_actor_profile_id;
  end if;

  if v_actor.status <> 'active' then
    raise exception 'actor profile % is not active', p_actor_profile_id;
  end if;

  if v_actor.role not in ('owner', 'admin') then
    raise exception 'actor profile % is not authorized for manual application creation', p_actor_profile_id;
  end if;

  v_applicant_full_name := nullif(trim(coalesce(p_applicant_full_name, '')), '');
  v_email := nullif(trim(coalesce(p_email, '')), '');
  v_phone := nullif(trim(coalesce(p_phone, '')), '');
  v_preferred_contact_method := nullif(trim(coalesce(p_preferred_contact_method, '')), '');
  v_interest_type := nullif(trim(coalesce(p_interest_type, '')), '');
  v_preferred_coat_type := nullif(trim(coalesce(p_preferred_coat_type, '')), '');
  v_preferred_gender := nullif(trim(coalesce(p_preferred_gender, '')), '');
  v_color_preference := nullif(trim(coalesce(p_color_preference, '')), '');
  v_other_pets := nullif(trim(coalesce(p_other_pets, '')), '');
  v_household_notes := nullif(trim(coalesce(p_household_notes, '')), '');
  v_readiness_notes := nullif(trim(coalesce(p_readiness_notes, '')), '');
  v_payment_preference := nullif(trim(coalesce(p_payment_preference, '')), '');
  v_staff_notes := nullif(trim(coalesce(p_staff_notes, '')), '');
  v_source := coalesce(nullif(trim(coalesce(p_source, '')), ''), 'core_manual_staff_entry');

  if v_applicant_full_name is null then
    raise exception 'applicant_full_name is required';
  end if;

  if v_email is null and v_phone is null then
    raise exception 'email or phone is required';
  end if;

  if p_terms_acknowledged is not true then
    raise exception 'terms acknowledgement is required';
  end if;

  if length(v_applicant_full_name) > 200 then
    raise exception 'applicant_full_name must be 200 characters or fewer';
  end if;

  if v_email is not null and (length(v_email) > 320 or v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$') then
    raise exception 'email is invalid';
  end if;

  if v_phone is not null and length(v_phone) > 50 then
    raise exception 'phone must be 50 characters or fewer';
  end if;

  if v_preferred_contact_method is not null
     and lower(v_preferred_contact_method) not in ('email', 'phone', 'text', 'sms', 'no preference') then
    raise exception 'preferred_contact_method is not allowed';
  end if;

  if v_preferred_gender is not null
     and lower(v_preferred_gender) not in ('male', 'female', 'no preference', 'undecided') then
    raise exception 'preferred_gender is not allowed';
  end if;

  if v_preferred_coat_type is not null
     and lower(v_preferred_coat_type) not in ('smooth coat', 'long coat', 'no preference', 'undecided') then
    raise exception 'preferred_coat_type is not allowed';
  end if;

  if length(coalesce(v_interest_type, '')) > 100
     or length(coalesce(v_color_preference, '')) > 200
     or length(coalesce(v_other_pets, '')) > 1000
     or length(coalesce(v_household_notes, '')) > 2000
     or length(coalesce(v_readiness_notes, '')) > 2000
     or length(coalesce(v_payment_preference, '')) > 1000
     or length(coalesce(v_staff_notes, '')) > 2000
     or length(v_source) > 100 then
    raise exception 'one or more text fields exceeds the allowed length';
  end if;

  v_email_normalized := lower(v_email);
  v_phone_normalized := regexp_replace(coalesce(v_phone, ''), '[^0-9+]', '', 'g');
  if v_phone_normalized = '' then
    v_phone_normalized := null;
  end if;

  if v_applicant_full_name is not null and position(' ' in v_applicant_full_name) > 0 then
    v_first_name := split_part(v_applicant_full_name, ' ', 1);
    v_last_name := nullif(trim(substr(v_applicant_full_name, length(v_first_name) + 1)), '');
  else
    v_first_name := v_applicant_full_name;
    v_last_name := null;
  end if;

  select id
  into v_buyer_id
  from public.core_buyers
  where (v_email_normalized is not null and email_normalized = v_email_normalized)
     or (v_phone_normalized is not null and phone_normalized = v_phone_normalized)
  order by created_at asc
  limit 1
  for update;

  if v_buyer_id is null then
    insert into public.core_buyers (
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
      v_first_name,
      v_last_name,
      v_email,
      v_email_normalized,
      v_phone,
      v_phone_normalized,
      'pending',
      v_source,
      jsonb_build_object(
        'applicant_name_raw', v_applicant_full_name,
        'created_by', 'core_create_application_manual'
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
      source = coalesce(source, v_source),
      metadata = metadata || jsonb_build_object(
        'last_core_manual_application_seen_at', now(),
        'last_core_manual_application_actor_profile_id', p_actor_profile_id
      )
    where id = v_buyer_id;
  end if;

  select fm.family_id
  into v_family_id
  from public.core_family_members fm
  where fm.buyer_id = v_buyer_id
    and fm.family_id is not null
  order by fm.is_primary_contact desc, fm.created_at asc
  limit 1;

  if v_family_id is null then
    insert into public.core_families (
      name,
      status,
      notes,
      metadata
    ) values (
      concat(v_applicant_full_name, ' Family'),
      'active',
      'Created from Core-native manual application entry.',
      jsonb_build_object('source', v_source)
    ) returning id into v_family_id;
  end if;

  insert into public.core_family_members (
    family_id,
    buyer_id,
    relationship,
    is_primary_contact,
    portal_access_status,
    metadata
  )
  select
    v_family_id,
    v_buyer_id,
    'applicant',
    true,
    'not_invited',
    jsonb_build_object('source', v_source)
  where not exists (
    select 1
    from public.core_family_members existing_member
    where existing_member.family_id = v_family_id
      and existing_member.buyer_id = v_buyer_id
  );

  insert into public.core_applications (
    family_id,
    buyer_id,
    external_reference,
    status,
    submitted_at,
    source,
    metadata
  ) values (
    v_family_id,
    v_buyer_id,
    null,
    'received',
    now(),
    v_source,
    jsonb_build_object(
      'intake_path', 'manual_staff_entry',
      'terms_acknowledged', p_terms_acknowledged,
      'created_by_profile_id', p_actor_profile_id
    )
  ) returning id into v_application_id;

  insert into public.core_application_sections (
    application_id,
    section_key,
    section_label,
    status,
    responses,
    review_notes
  ) values
    (
      v_application_id,
      'applicant_contact',
      'Applicant Contact',
      'received',
      jsonb_build_object(
        'Applicant_Full_Name', v_applicant_full_name,
        'Email', v_email,
        'Phone', v_phone,
        'Preferred_Contact_Method', v_preferred_contact_method
      ),
      null
    ),
    (
      v_application_id,
      'puppy_preferences',
      'Puppy Preferences',
      'received',
      jsonb_build_object(
        'Interest_Type', v_interest_type,
        'Preferred_Coat_Type', v_preferred_coat_type,
        'Preferred_Gender', v_preferred_gender,
        'Color_Preference', v_color_preference
      ),
      null
    ),
    (
      v_application_id,
      'household_readiness',
      'Household And Readiness',
      'received',
      jsonb_build_object(
        'Other_Pets', v_other_pets,
        'Household_Notes', v_household_notes,
        'Readiness_Notes', v_readiness_notes
      ),
      null
    ),
    (
      v_application_id,
      'payment_and_terms',
      'Payment Preference And Terms',
      'received',
      jsonb_build_object(
        'Payment_Preference', v_payment_preference,
        'Terms_Acknowledged', p_terms_acknowledged
      ),
      null
    ),
    (
      v_application_id,
      'staff_notes',
      'Staff Notes',
      'received',
      jsonb_build_object(
        'Staff_Notes', v_staff_notes
      ),
      v_staff_notes
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
    'application_created_manual',
    now(),
    concat('Application manually created by ', coalesce(v_actor.display_name, v_actor.email, 'staff profile')),
    v_family_id,
    v_buyer_id,
    v_application_id,
    'core_applications',
    v_application_id,
    'core_create_application_manual',
    jsonb_build_object(
      'source', v_source,
      'section_count', v_section_count,
      'email_provided', v_email is not null,
      'phone_provided', v_phone is not null,
      'notification_queued', false
    ),
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
    'profile',
    p_actor_profile_id,
    coalesce(v_actor.display_name, v_actor.email, 'core_create_application_manual'),
    'core_create_application_manual',
    'create_application_manual',
    'core_applications',
    v_application_id,
    null,
    jsonb_build_object(
      'buyer_id', v_buyer_id,
      'family_id', v_family_id,
      'application_id', v_application_id,
      'application_status', 'received',
      'section_count', v_section_count
    ),
    jsonb_build_object(
      'source', v_source,
      'email_provided', v_email is not null,
      'phone_provided', v_phone is not null,
      'terms_acknowledged', p_terms_acknowledged,
      'notification_queued', false
    ),
    'success'
  ) returning id into v_audit_log_id;

  buyer_id := v_buyer_id;
  family_id := v_family_id;
  application_id := v_application_id;
  application_status := 'received';
  section_count := v_section_count;
  event_id := v_event_id;
  audit_log_id := v_audit_log_id;
  return next;
end;
$$;

comment on function public.core_create_application_manual(
  uuid,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  boolean,
  text,
  text
) is
  'Core-native owner/admin manual application creation foundation. Creates buyer/family/application/sections and event/audit records without Zoho, email, documents, payments, portal access, or live integrations.';
