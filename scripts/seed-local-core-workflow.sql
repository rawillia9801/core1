-- Cherolee Core local/development workflow seed helper.
--
-- LOCAL/DEV ONLY:
--   * This script creates fake deterministic records after `supabase db reset --local`.
--   * It is not a migration, production seed, import script, or integration bridge.
--   * All records use LOCAL-* references, example.invalid emails, and local_dev_only metadata.
--   * Safe to rerun: every row uses a deterministic UUID and upsert/update behavior.
--
-- Run from Git Bash:
--   cat scripts/seed-local-core-workflow.sql | docker exec -i supabase_db_core1 psql -U postgres -d postgres -v ON_ERROR_STOP=1

\set ON_ERROR_STOP on

begin;

insert into public.core_profiles (
  id, display_name, email, phone, phone_normalized, role, status, metadata
) values (
  '70000000-0000-0000-0000-000000000001',
  'Local Approval Test Admin',
  'local.approval.admin@example.invalid',
  '+12765557001',
  '+12765557001',
  'admin',
  'active',
  '{"local_dev_only": true, "seed": "local_core_workflow"}'::jsonb
) on conflict (id) do update set
  display_name = excluded.display_name,
  email = excluded.email,
  phone = excluded.phone,
  phone_normalized = excluded.phone_normalized,
  role = excluded.role,
  status = excluded.status,
  metadata = excluded.metadata;

insert into public.core_families (
  id, name, status, notes, metadata
) values (
  '70000000-0000-0000-0000-000000000010',
  'Local Seed Test Family',
  'active',
  'LOCAL DEV ONLY family used to repopulate the Core dashboard after local reset.',
  '{"local_dev_only": true, "seed": "local_core_workflow"}'::jsonb
) on conflict (id) do update set
  name = excluded.name,
  status = excluded.status,
  notes = excluded.notes,
  metadata = excluded.metadata;

insert into public.core_buyers (
  id, external_reference, first_name, last_name, preferred_name, email, email_normalized,
  phone, phone_normalized, approval_status, source, notes, metadata
) values (
  '70000000-0000-0000-0000-000000000020',
  'LOCAL-BUYER-SEED-001',
  'Local',
  'Seed Buyer',
  'Local Seed Buyer',
  'local.seed.buyer@example.invalid',
  'local.seed.buyer@example.invalid',
  '+1 (276) 555-7002',
  '+12765557002',
  'approved',
  'local_core_workflow_seed',
  'LOCAL DEV ONLY buyer for dashboard workflow testing.',
  '{"local_dev_only": true, "seed": "local_core_workflow"}'::jsonb
) on conflict (id) do update set
  external_reference = excluded.external_reference,
  first_name = excluded.first_name,
  last_name = excluded.last_name,
  preferred_name = excluded.preferred_name,
  email = excluded.email,
  email_normalized = excluded.email_normalized,
  phone = excluded.phone,
  phone_normalized = excluded.phone_normalized,
  approval_status = excluded.approval_status,
  source = excluded.source,
  notes = excluded.notes,
  metadata = excluded.metadata;

insert into public.core_family_members (
  id, family_id, buyer_id, profile_id, relationship, is_primary_contact, portal_access_status, metadata
) values (
  '70000000-0000-0000-0000-000000000030',
  '70000000-0000-0000-0000-000000000010',
  '70000000-0000-0000-0000-000000000020',
  null,
  'local_primary_contact',
  true,
  'not_invited',
  '{"local_dev_only": true, "seed": "local_core_workflow"}'::jsonb
) on conflict (id) do update set
  family_id = excluded.family_id,
  buyer_id = excluded.buyer_id,
  profile_id = excluded.profile_id,
  relationship = excluded.relationship,
  is_primary_contact = excluded.is_primary_contact,
  portal_access_status = excluded.portal_access_status,
  metadata = excluded.metadata;

insert into public.core_applications (
  id, family_id, buyer_id, external_reference, status, submitted_at, reviewed_at,
  reviewed_by_profile_id, decision_notes, source, metadata, created_at
) values
  (
    '70000000-0000-0000-0000-000000000040',
    '70000000-0000-0000-0000-000000000010',
    '70000000-0000-0000-0000-000000000020',
    'LOCAL-APPROVED-APPLICATION-001',
    'approved',
    now() - interval '2 days',
    now() - interval '1 day',
    '70000000-0000-0000-0000-000000000001',
    'LOCAL DEV ONLY approved application ready for reservation testing.',
    'local_core_workflow_seed',
    '{"local_dev_only": true, "seed": "local_core_workflow", "scenario": "approved_no_reservation"}'::jsonb,
    now() - interval '20 minutes'
  ),
  (
    '70000000-0000-0000-0000-000000000041',
    '70000000-0000-0000-0000-000000000010',
    '70000000-0000-0000-0000-000000000020',
    'LOCAL-RECEIVED-APPLICATION-001',
    'received',
    now() - interval '1 hour',
    null,
    null,
    null,
    'local_core_workflow_seed',
    '{"local_dev_only": true, "seed": "local_core_workflow", "scenario": "received_for_approval"}'::jsonb,
    now()
  )
on conflict (id) do update set
  family_id = excluded.family_id,
  buyer_id = excluded.buyer_id,
  external_reference = excluded.external_reference,
  status = excluded.status,
  submitted_at = excluded.submitted_at,
  reviewed_at = excluded.reviewed_at,
  reviewed_by_profile_id = excluded.reviewed_by_profile_id,
  decision_notes = excluded.decision_notes,
  source = excluded.source,
  metadata = excluded.metadata,
  created_at = excluded.created_at;

insert into public.core_application_sections (
  id, application_id, section_key, section_label, status, responses, review_notes
) values
  (
    '70000000-0000-0000-0000-000000000042',
    '70000000-0000-0000-0000-000000000041',
    'applicant',
    'Applicant',
    'received',
    '{"name": "Local Seed Buyer", "email": "local.seed.buyer@example.invalid", "phone": "+1 (276) 555-7002"}'::jsonb,
    'LOCAL DEV ONLY section for dashboard detail display.'
  ),
  (
    '70000000-0000-0000-0000-000000000043',
    '70000000-0000-0000-0000-000000000041',
    'home_and_timing',
    'Home And Timing',
    'received',
    '{"home_type": "Test home", "preferred_timing": "Local development only", "ready_for_deposit": "No"}'::jsonb,
    'LOCAL DEV ONLY section for dashboard detail display.'
  ),
  (
    '70000000-0000-0000-0000-000000000044',
    '70000000-0000-0000-0000-000000000040',
    'approved_summary',
    'Approved Summary',
    'approved',
    '{"status": "Approved for local reservation testing", "preferred_puppy": "Any local seed puppy"}'::jsonb,
    'LOCAL DEV ONLY approved section.'
  )
on conflict (id) do update set
  application_id = excluded.application_id,
  section_key = excluded.section_key,
  section_label = excluded.section_label,
  status = excluded.status,
  responses = excluded.responses,
  review_notes = excluded.review_notes;

insert into public.core_dogs (
  id, external_reference, call_name, sex, color, coat_type, status, notes, metadata
) values
  (
    '70000000-0000-0000-0000-000000000050',
    'LOCAL-DAM-SEED-001',
    'Local Ember Seed Dam',
    'female',
    'cream',
    'long',
    'active',
    'LOCAL DEV ONLY dam.',
    '{"local_dev_only": true, "seed": "local_core_workflow"}'::jsonb
  ),
  (
    '70000000-0000-0000-0000-000000000051',
    'LOCAL-SIRE-SEED-001',
    'Local Rambo Seed Sire',
    'male',
    'black',
    'smooth',
    'active',
    'LOCAL DEV ONLY sire.',
    '{"local_dev_only": true, "seed": "local_core_workflow"}'::jsonb
  )
on conflict (id) do update set
  external_reference = excluded.external_reference,
  call_name = excluded.call_name,
  sex = excluded.sex,
  color = excluded.color,
  coat_type = excluded.coat_type,
  status = excluded.status,
  notes = excluded.notes,
  metadata = excluded.metadata;

insert into public.core_litters (
  id, external_reference, litter_name, dam_id, sire_id, birth_at, total_puppies,
  female_count, male_count, status, details_pending, notes, metadata
) values (
  '70000000-0000-0000-0000-000000000060',
  'LOCAL-LITTER-SEED-001',
  'Local Seed Litter',
  '70000000-0000-0000-0000-000000000050',
  '70000000-0000-0000-0000-000000000051',
  now() - interval '8 weeks',
  2,
  1,
  1,
  'available_for_local_dev',
  false,
  'LOCAL DEV ONLY litter.',
  '{"local_dev_only": true, "seed": "local_core_workflow"}'::jsonb
) on conflict (id) do update set
  external_reference = excluded.external_reference,
  litter_name = excluded.litter_name,
  dam_id = excluded.dam_id,
  sire_id = excluded.sire_id,
  birth_at = excluded.birth_at,
  total_puppies = excluded.total_puppies,
  female_count = excluded.female_count,
  male_count = excluded.male_count,
  status = excluded.status,
  details_pending = excluded.details_pending,
  notes = excluded.notes,
  metadata = excluded.metadata;

insert into public.core_puppies (
  id, external_reference, litter_id, name, collar_color, sex, color, coat_type, birth_at,
  status, health_status, public_listing_status, notes, metadata
) values
  (
    '70000000-0000-0000-0000-000000000070',
    'LOCAL-PUPPY-AVAILABLE-001',
    '70000000-0000-0000-0000-000000000060',
    'Local Luna Available',
    'Purple',
    'female',
    'cream',
    'long',
    now() - interval '8 weeks',
    'available',
    'local_dev_only',
    'private',
    'LOCAL DEV ONLY available puppy for reservation creation testing.',
    '{"local_dev_only": true, "seed": "local_core_workflow", "scenario": "available_for_reservation"}'::jsonb
  ),
  (
    '70000000-0000-0000-0000-000000000071',
    'LOCAL-PUPPY-RESERVED-001',
    '70000000-0000-0000-0000-000000000060',
    'Local Nova Reserved',
    'Green',
    'male',
    'black',
    'smooth',
    now() - interval '8 weeks',
    'reserved',
    'local_dev_only',
    'private',
    'LOCAL DEV ONLY reserved puppy for reservation/payment display testing.',
    '{"local_dev_only": true, "seed": "local_core_workflow", "scenario": "reserved_example"}'::jsonb
  )
on conflict (id) do update set
  external_reference = excluded.external_reference,
  litter_id = excluded.litter_id,
  name = excluded.name,
  collar_color = excluded.collar_color,
  sex = excluded.sex,
  color = excluded.color,
  coat_type = excluded.coat_type,
  birth_at = excluded.birth_at,
  status = excluded.status,
  health_status = excluded.health_status,
  public_listing_status = excluded.public_listing_status,
  notes = excluded.notes,
  metadata = excluded.metadata;

insert into public.core_reservations (
  id, external_reference, buyer_id, family_id, puppy_id, application_id, status, sale_type,
  reserved_at, contract_total_cents, deposit_required_cents, currency, portal_access_status,
  notes, metadata
) values (
  '70000000-0000-0000-0000-000000000080',
  'LOCAL-RESERVATION-SEED-001',
  '70000000-0000-0000-0000-000000000020',
  '70000000-0000-0000-0000-000000000010',
  '70000000-0000-0000-0000-000000000071',
  '70000000-0000-0000-0000-000000000040',
  'reserved',
  'local_dev_seed',
  now() - interval '30 minutes',
  200000,
  50000,
  'USD',
  'not_invited',
  'LOCAL DEV ONLY reserved example. No payment ledger rows are seeded.',
  '{"local_dev_only": true, "seed": "local_core_workflow", "no_payment_rows_seeded": true}'::jsonb
) on conflict (id) do update set
  external_reference = excluded.external_reference,
  buyer_id = excluded.buyer_id,
  family_id = excluded.family_id,
  puppy_id = excluded.puppy_id,
  application_id = excluded.application_id,
  status = excluded.status,
  sale_type = excluded.sale_type,
  reserved_at = excluded.reserved_at,
  contract_total_cents = excluded.contract_total_cents,
  deposit_required_cents = excluded.deposit_required_cents,
  currency = excluded.currency,
  portal_access_status = excluded.portal_access_status,
  notes = excluded.notes,
  metadata = excluded.metadata;

insert into public.core_events (
  id, event_type, event_at, summary, family_id, buyer_id, application_id, puppy_id,
  reservation_id, related_table, related_id, source, details, created_by_profile_id
) values
  (
    '70000000-0000-0000-0000-000000000090',
    'local_workflow_seeded',
    now(),
    'Local Core workflow seed helper populated fake dashboard data.',
    '70000000-0000-0000-0000-000000000010',
    '70000000-0000-0000-0000-000000000020',
    null,
    null,
    null,
    'local_seed',
    '70000000-0000-0000-0000-000000000090',
    'seed-local-core-workflow',
    '{"local_dev_only": true, "no_live_integrations": true}'::jsonb,
    '70000000-0000-0000-0000-000000000001'
  ),
  (
    '70000000-0000-0000-0000-000000000091',
    'reservation_created',
    now() - interval '30 minutes',
    'Local seed reservation example created without payment ledger rows.',
    '70000000-0000-0000-0000-000000000010',
    '70000000-0000-0000-0000-000000000020',
    '70000000-0000-0000-0000-000000000040',
    '70000000-0000-0000-0000-000000000071',
    '70000000-0000-0000-0000-000000000080',
    'core_reservations',
    '70000000-0000-0000-0000-000000000080',
    'seed-local-core-workflow',
    '{"local_dev_only": true, "no_payment_rows_seeded": true}'::jsonb,
    '70000000-0000-0000-0000-000000000001'
  )
on conflict (id) do update set
  event_type = excluded.event_type,
  event_at = excluded.event_at,
  summary = excluded.summary,
  family_id = excluded.family_id,
  buyer_id = excluded.buyer_id,
  application_id = excluded.application_id,
  puppy_id = excluded.puppy_id,
  reservation_id = excluded.reservation_id,
  related_table = excluded.related_table,
  related_id = excluded.related_id,
  source = excluded.source,
  details = excluded.details,
  created_by_profile_id = excluded.created_by_profile_id;

insert into public.core_audit_log (
  id, actor_type, actor_profile_id, actor_identifier, source, action, entity_table,
  entity_id, old_data, new_data, request_context, outcome
) values
  (
    '70000000-0000-0000-0000-0000000000a0',
    'profile',
    '70000000-0000-0000-0000-000000000001',
    'Local Approval Test Admin',
    'seed-local-core-workflow',
    'seed_local_core_workflow',
    'local_seed',
    '70000000-0000-0000-0000-000000000090',
    null,
    '{"local_dev_only": true, "seeded_objects": ["profile", "buyer", "family", "applications", "application_sections", "dogs", "litter", "puppies", "reservation_example"]}'::jsonb,
    '{"no_production_data": true, "no_live_integrations": true}'::jsonb,
    'success'
  ),
  (
    '70000000-0000-0000-0000-0000000000a1',
    'profile',
    '70000000-0000-0000-0000-000000000001',
    'Local Approval Test Admin',
    'seed-local-core-workflow',
    'seed_reservation_example',
    'core_reservations',
    '70000000-0000-0000-0000-000000000080',
    null,
    '{"reservation_id": "70000000-0000-0000-0000-000000000080", "local_dev_only": true, "no_payment_rows_seeded": true}'::jsonb,
    '{"no_production_data": true, "no_live_integrations": true}'::jsonb,
    'success'
  )
on conflict (id) do update set
  actor_type = excluded.actor_type,
  actor_profile_id = excluded.actor_profile_id,
  actor_identifier = excluded.actor_identifier,
  source = excluded.source,
  action = excluded.action,
  entity_table = excluded.entity_table,
  entity_id = excluded.entity_id,
  old_data = excluded.old_data,
  new_data = excluded.new_data,
  request_context = excluded.request_context,
  outcome = excluded.outcome;

commit;

select
  'local_core_workflow_seeded' as result,
  (select count(*) from public.core_profiles where metadata->>'local_dev_only' = 'true' and id::text like '70000000-%') as local_profiles,
  (select count(*) from public.core_applications where metadata->>'local_dev_only' = 'true' and id::text like '70000000-%') as local_applications,
  (select count(*) from public.core_puppies where metadata->>'local_dev_only' = 'true' and id::text like '70000000-%') as local_puppies,
  (select count(*) from public.core_reservations where metadata->>'local_dev_only' = 'true' and id::text like '70000000-%') as local_reservations;
