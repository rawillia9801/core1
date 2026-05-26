-- Cherolee Core V1 canonical schema baseline.
--
-- Migration caution:
--   * This migration creates new `core_` objects only.
--   * It does not read, update, delete, rename, or drop any legacy/source table.
--   * It does not wire production integrations or import production data.
--   * Nullable foreign keys intentionally allow incomplete records to be reconciled later.

create extension if not exists pgcrypto;

-- Keep editable Core record timestamps consistent without introducing application writes.
create or replace function public.core_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Identity and customer context ------------------------------------------------

-- Internal/authenticated profile context. Authorization and RLS policies are deferred.
create table if not exists public.core_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid,
  display_name text,
  email text,
  phone text,
  phone_normalized text,
  role text not null default 'staff',
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.core_profiles is 'Internal or authenticated-user profile context for Cherolee Core; RLS is a later security task.';

-- A household grouping for contacts, portal access, applications, and reservations.
create table if not exists public.core_families (
  id uuid primary key default gen_random_uuid(),
  name text,
  status text not null default 'active',
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.core_families is 'Canonical household/family group; may be partially populated during an approved later migration.';

-- A buyer is a person/customer contact, never the source of transaction balances.
create table if not exists public.core_buyers (
  id uuid primary key default gen_random_uuid(),
  external_reference text,
  first_name text,
  last_name text,
  preferred_name text,
  email text,
  email_normalized text,
  phone text,
  phone_normalized text,
  alternate_phone text,
  alternate_phone_normalized text,
  street_address text,
  city text,
  state text,
  postal_code text,
  approval_status text not null default 'pending',
  source text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.core_buyers is 'Canonical person/customer record; financial amounts belong on reservations and ledger records, never here.';

-- Links known people or profiles to household context while allowing unresolved imports.
create table if not exists public.core_family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.core_families(id) on delete set null,
  buyer_id uuid references public.core_buyers(id) on delete set null,
  profile_id uuid references public.core_profiles(id) on delete set null,
  relationship text,
  is_primary_contact boolean not null default false,
  portal_access_status text not null default 'not_invited',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.core_family_members is 'Membership relationship between a family and optional buyer/login profile.';

-- Application records can arrive before the family or buyer has been fully matched.
create table if not exists public.core_applications (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.core_families(id) on delete set null,
  buyer_id uuid references public.core_buyers(id) on delete set null,
  external_reference text,
  status text not null default 'received',
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by_profile_id uuid references public.core_profiles(id) on delete set null,
  decision_notes text,
  source text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.core_applications is 'Prospective buyer/family application header; no automatic approval behavior is enabled.';

-- Sectioned answers preserve flexible application forms without forcing false completeness.
create table if not exists public.core_application_sections (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references public.core_applications(id) on delete set null,
  section_key text,
  section_label text,
  status text not null default 'received',
  responses jsonb not null default '{}'::jsonb,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.core_application_sections is 'Flexible section responses and review context belonging to a Core application.';

-- Non-transactional preferences for a prospective or existing buyer.
create table if not exists public.core_buyer_preferences (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid references public.core_buyers(id) on delete set null,
  preferred_sex text,
  preferred_colors text[],
  preferred_coat_types text[],
  desired_timing text,
  preference_notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.core_buyer_preferences is 'Buyer puppy preferences only; price, deposit, and plan data are deliberately excluded.';

-- Dogs, litters, puppies, and care history ------------------------------------

-- Adult/breeding dog records used to relate dams and sires to litters.
create table if not exists public.core_dogs (
  id uuid primary key default gen_random_uuid(),
  external_reference text,
  registered_name text,
  call_name text,
  sex text,
  color text,
  coat_type text,
  birth_at timestamptz,
  status text not null default 'active',
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.core_dogs is 'Canonical adult/breeding dog record used for litter parent links.';

-- A litter is a birth group; dam, sire, and dates can be completed as facts become known.
create table if not exists public.core_litters (
  id uuid primary key default gen_random_uuid(),
  external_reference text,
  litter_name text,
  dam_id uuid references public.core_dogs(id) on delete set null,
  sire_id uuid references public.core_dogs(id) on delete set null,
  expected_birth_at timestamptz,
  birth_at timestamptz,
  total_puppies integer,
  female_count integer,
  male_count integer,
  status text not null default 'planned',
  details_pending boolean not null default false,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.core_litters is 'Canonical birth-group record; counts and parent links may be pending during reconciliation.';

-- An individual puppy record, distinct from a litter and from its future transaction.
create table if not exists public.core_puppies (
  id uuid primary key default gen_random_uuid(),
  external_reference text,
  litter_id uuid references public.core_litters(id) on delete set null,
  name text,
  collar_color text,
  sex text,
  color text,
  coat_type text,
  birth_at timestamptz,
  status text not null default 'unavailable',
  health_status text,
  public_listing_status text not null default 'private',
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.core_puppies is 'Canonical individual puppy; financial ownership is held through reservations and ledger rows.';

-- Puppy-specific care or status events; may later be surfaced into timeline workflows.
create table if not exists public.core_puppy_events (
  id uuid primary key default gen_random_uuid(),
  puppy_id uuid references public.core_puppies(id) on delete set null,
  event_type text not null,
  event_at timestamptz not null default now(),
  summary text,
  details jsonb not null default '{}'::jsonb,
  recorded_by_profile_id uuid references public.core_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.core_puppy_events is 'Puppy operational events, such as observation or status history; not automated medical conclusions.';

-- Timestamped observed weight measurements; grams is an exact storage unit.
create table if not exists public.core_weight_logs (
  id uuid primary key default gen_random_uuid(),
  puppy_id uuid references public.core_puppies(id) on delete set null,
  measured_at timestamptz not null default now(),
  weight_grams integer,
  notes text,
  recorded_by_profile_id uuid references public.core_profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.core_weight_logs is 'Observed puppy weight logs; stored as integer grams and retained as factual observations.';

-- Timestamped feeding observations for later controlled kennel workflows.
create table if not exists public.core_feeding_logs (
  id uuid primary key default gen_random_uuid(),
  puppy_id uuid references public.core_puppies(id) on delete set null,
  fed_at timestamptz not null default now(),
  feeding_type text,
  amount text,
  notes text,
  recorded_by_profile_id uuid references public.core_profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.core_feeding_logs is 'Observed puppy feeding logs; no automated treatment or health behavior is enabled.';

-- Timestamped medication observations or planned administrations.
create table if not exists public.core_medication_logs (
  id uuid primary key default gen_random_uuid(),
  puppy_id uuid references public.core_puppies(id) on delete set null,
  administered_at timestamptz,
  scheduled_at timestamptz,
  medication_name text,
  dosage text,
  administration_status text not null default 'recorded',
  notes text,
  recorded_by_profile_id uuid references public.core_profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.core_medication_logs is 'Puppy medication recordkeeping foundation; clinical or automated action is outside Core V1.';

-- Reservation and money records ------------------------------------------------

-- The official buyer/family plus puppy transaction, replacing ambiguous sales/adoption concepts.
create table if not exists public.core_reservations (
  id uuid primary key default gen_random_uuid(),
  external_reference text,
  buyer_id uuid references public.core_buyers(id) on delete set null,
  family_id uuid references public.core_families(id) on delete set null,
  puppy_id uuid references public.core_puppies(id) on delete set null,
  application_id uuid references public.core_applications(id) on delete set null,
  status text not null default 'pending',
  sale_type text,
  reserved_at timestamptz,
  contract_total_cents integer,
  deposit_required_cents integer,
  currency text not null default 'USD',
  portal_access_status text not null default 'not_invited',
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.core_reservations is 'Official buyer/family and puppy transaction; contract totals originate here, not on buyers.';

-- Pickup or delivery planning for one reservation; incomplete details are allowed.
create table if not exists public.core_go_home_details (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid references public.core_reservations(id) on delete set null,
  method text,
  status text not null default 'pending',
  planned_at timestamptz,
  completed_at timestamptz,
  location text,
  contact_notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.core_go_home_details is 'Reservation pickup/delivery and completion details, retained outside buyer records.';

-- Signed posted amounts are the official source of received/credited/refunded money activity.
create table if not exists public.core_financial_ledger (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid references public.core_reservations(id) on delete set null,
  buyer_id uuid references public.core_buyers(id) on delete set null,
  external_reference text,
  entry_type text not null,
  status text not null default 'pending',
  amount_cents integer not null,
  currency text not null default 'USD',
  occurred_at timestamptz not null default now(),
  payment_method text,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.core_financial_ledger is 'Official signed money ledger. Posted sums plus reservation contract totals calculate balances.';
comment on column public.core_financial_ledger.amount_cents is 'Signed amount: positive posted amounts reduce balance due; refunds/reversals/chargebacks are negative.';

-- Optional structured plan for paying one reservation contract.
create table if not exists public.core_financing_plans (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid references public.core_reservations(id) on delete set null,
  status text not null default 'draft',
  financed_amount_cents integer,
  finance_charge_cents integer,
  currency text not null default 'USD',
  starts_at timestamptz,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.core_financing_plans is 'Optional financing/payment-plan definition belonging to a reservation.';

-- Individual expected installments associated with a financing plan.
create table if not exists public.core_financing_installments (
  id uuid primary key default gen_random_uuid(),
  financing_plan_id uuid references public.core_financing_plans(id) on delete set null,
  ledger_entry_id uuid references public.core_financial_ledger(id) on delete set null,
  sequence_number integer,
  due_at timestamptz,
  paid_at timestamptz,
  amount_cents integer,
  currency text not null default 'USD',
  status text not null default 'scheduled',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.core_financing_installments is 'Scheduled/fulfilled installments for a reservation financing plan.';

-- Issued receipt record linked where known to a transaction and/or ledger entry.
create table if not exists public.core_receipts (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid references public.core_reservations(id) on delete set null,
  ledger_entry_id uuid references public.core_financial_ledger(id) on delete set null,
  buyer_id uuid references public.core_buyers(id) on delete set null,
  receipt_number text,
  status text not null default 'draft',
  issued_at timestamptz,
  amount_cents integer,
  currency text not null default 'USD',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.core_receipts is 'Receipt metadata for financial activity; not a payment-processor integration.';

-- Documents and communications -------------------------------------------------

-- A document container connected to whichever canonical business context is known.
create table if not exists public.core_documents (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.core_families(id) on delete set null,
  buyer_id uuid references public.core_buyers(id) on delete set null,
  puppy_id uuid references public.core_puppies(id) on delete set null,
  reservation_id uuid references public.core_reservations(id) on delete set null,
  document_type text,
  title text,
  status text not null default 'draft',
  current_version_number integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.core_documents is 'Document metadata container; private file storage/security configuration is deferred.';

-- Version history and private storage pointer metadata for a document.
create table if not exists public.core_document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references public.core_documents(id) on delete set null,
  version_number integer,
  storage_path text,
  file_name text,
  mime_type text,
  file_size_bytes bigint,
  content_hash text,
  status text not null default 'draft',
  generated_at timestamptz,
  signed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.core_document_versions is 'Versioned document file metadata; no public file exposure or signature provider is enabled.';

-- Communication thread between the business and a known or not-yet-matched contact.
create table if not exists public.core_conversations (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid references public.core_buyers(id) on delete set null,
  family_id uuid references public.core_families(id) on delete set null,
  channel text,
  external_reference text,
  subject text,
  status text not null default 'open',
  last_message_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.core_conversations is 'Container for future email/SMS/contact history; not a live provider connection.';

-- Individual inbound or outbound communication message record.
create table if not exists public.core_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.core_conversations(id) on delete set null,
  buyer_id uuid references public.core_buyers(id) on delete set null,
  direction text,
  channel text,
  external_reference text,
  status text not null default 'recorded',
  from_address text,
  to_address text,
  body_text text,
  sent_at timestamptz,
  received_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.core_messages is 'Recorded message metadata/content foundation; no sending behavior is enabled.';

-- Phone call history and provider metadata, prepared for a future controlled lookup workflow.
create table if not exists public.core_phone_calls (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.core_conversations(id) on delete set null,
  buyer_id uuid references public.core_buyers(id) on delete set null,
  external_reference text,
  direction text,
  status text not null default 'recorded',
  from_phone text,
  from_phone_normalized text,
  to_phone text,
  to_phone_normalized text,
  started_at timestamptz,
  ended_at timestamptz,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.core_phone_calls is 'Phone call record foundation for later approved phone integration; no live routing is enabled.';

-- Reusable communication content; existence of a template never authorizes sending.
create table if not exists public.core_message_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text,
  name text,
  channel text,
  subject_template text,
  body_template text,
  status text not null default 'draft',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.core_message_templates is 'Draft/approved communication templates only; no automated sending authority.';

-- Controlled notification record, without a delivery integration in this baseline.
create table if not exists public.core_notifications (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.core_families(id) on delete set null,
  buyer_id uuid references public.core_buyers(id) on delete set null,
  template_id uuid references public.core_message_templates(id) on delete set null,
  notification_type text,
  channel text,
  status text not null default 'pending',
  scheduled_at timestamptz,
  sent_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.core_notifications is 'Notification tracking foundation; sending requires future approved server-side behavior.';

-- Timeline, audit, integrations, and controlled future tools ------------------

-- General business timeline notes/events, separate from write-accountability logs.
create table if not exists public.core_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  event_at timestamptz not null default now(),
  summary text,
  family_id uuid references public.core_families(id) on delete set null,
  buyer_id uuid references public.core_buyers(id) on delete set null,
  application_id uuid references public.core_applications(id) on delete set null,
  puppy_id uuid references public.core_puppies(id) on delete set null,
  reservation_id uuid references public.core_reservations(id) on delete set null,
  related_table text,
  related_id uuid,
  source text,
  details jsonb not null default '{}'::jsonb,
  created_by_profile_id uuid references public.core_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.core_events is 'Operational event/note timeline; distinct from the audit history of write actions.';

-- Append-oriented accountability record for every future validated server-side write.
create table if not exists public.core_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_type text,
  actor_profile_id uuid references public.core_profiles(id) on delete set null,
  actor_identifier text,
  source text,
  action text not null,
  entity_table text not null,
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  request_context jsonb not null default '{}'::jsonb,
  outcome text not null default 'success',
  error_message text,
  created_at timestamptz not null default now()
);
comment on table public.core_audit_log is 'Append-oriented audit ledger required for every future validated server-side write action.';

-- Persist external events before processing so integrations can be idempotent and observable.
create table if not exists public.core_integration_events (
  id uuid primary key default gen_random_uuid(),
  source_system text not null,
  direction text not null default 'inbound',
  external_event_id text,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'received',
  attempts integer not null default 0,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  next_retry_at timestamptz,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.core_integration_events is 'Inbound/outbound integration-event ledger; store an event before future processing and deduplicate by provider ID.';

-- Future assistant thread container only; it has no database-write authority in Core V1.
create table if not exists public.core_threads (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.core_families(id) on delete set null,
  buyer_id uuid references public.core_buyers(id) on delete set null,
  title text,
  status text not null default 'open',
  created_by_profile_id uuid references public.core_profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.core_threads is 'Future Core Chat thread metadata only; chat implementation and direct database writes are not enabled.';

-- Stored messages for a future assistant thread.
create table if not exists public.core_thread_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid references public.core_threads(id) on delete set null,
  role text,
  content text,
  structured_content jsonb not null default '{}'::jsonb,
  created_by_profile_id uuid references public.core_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.core_thread_messages is 'Future Core Chat message storage; no autonomous execution is included.';

-- A future validated tool's recorded invocation and result, not an implementation of that tool.
create table if not exists public.core_tool_runs (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid references public.core_threads(id) on delete set null,
  requested_by_profile_id uuid references public.core_profiles(id) on delete set null,
  tool_name text,
  action text,
  status text not null default 'requested',
  input_payload jsonb not null default '{}'::jsonb,
  output_payload jsonb,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.core_tool_runs is 'Future validated tool execution ledger; tools must audit completed write actions separately.';

-- Sensitive or ambiguous proposed actions awaiting human approval/validation.
create table if not exists public.core_pending_actions (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid references public.core_threads(id) on delete set null,
  tool_run_id uuid references public.core_tool_runs(id) on delete set null,
  requested_by_profile_id uuid references public.core_profiles(id) on delete set null,
  reviewed_by_profile_id uuid references public.core_profiles(id) on delete set null,
  action_type text not null,
  status text not null default 'pending',
  proposed_payload jsonb not null default '{}'::jsonb,
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  resolution_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.core_pending_actions is 'Future approval queue for sensitive tool actions; this baseline does not execute actions.';

-- Updated-at triggers ---------------------------------------------------------

create trigger core_profiles_set_updated_at before update on public.core_profiles
for each row execute function public.core_set_updated_at();
create trigger core_families_set_updated_at before update on public.core_families
for each row execute function public.core_set_updated_at();
create trigger core_buyers_set_updated_at before update on public.core_buyers
for each row execute function public.core_set_updated_at();
create trigger core_family_members_set_updated_at before update on public.core_family_members
for each row execute function public.core_set_updated_at();
create trigger core_applications_set_updated_at before update on public.core_applications
for each row execute function public.core_set_updated_at();
create trigger core_application_sections_set_updated_at before update on public.core_application_sections
for each row execute function public.core_set_updated_at();
create trigger core_buyer_preferences_set_updated_at before update on public.core_buyer_preferences
for each row execute function public.core_set_updated_at();
create trigger core_dogs_set_updated_at before update on public.core_dogs
for each row execute function public.core_set_updated_at();
create trigger core_litters_set_updated_at before update on public.core_litters
for each row execute function public.core_set_updated_at();
create trigger core_puppies_set_updated_at before update on public.core_puppies
for each row execute function public.core_set_updated_at();
create trigger core_puppy_events_set_updated_at before update on public.core_puppy_events
for each row execute function public.core_set_updated_at();
create trigger core_weight_logs_set_updated_at before update on public.core_weight_logs
for each row execute function public.core_set_updated_at();
create trigger core_feeding_logs_set_updated_at before update on public.core_feeding_logs
for each row execute function public.core_set_updated_at();
create trigger core_medication_logs_set_updated_at before update on public.core_medication_logs
for each row execute function public.core_set_updated_at();
create trigger core_reservations_set_updated_at before update on public.core_reservations
for each row execute function public.core_set_updated_at();
create trigger core_go_home_details_set_updated_at before update on public.core_go_home_details
for each row execute function public.core_set_updated_at();
create trigger core_financial_ledger_set_updated_at before update on public.core_financial_ledger
for each row execute function public.core_set_updated_at();
create trigger core_financing_plans_set_updated_at before update on public.core_financing_plans
for each row execute function public.core_set_updated_at();
create trigger core_financing_installments_set_updated_at before update on public.core_financing_installments
for each row execute function public.core_set_updated_at();
create trigger core_receipts_set_updated_at before update on public.core_receipts
for each row execute function public.core_set_updated_at();
create trigger core_documents_set_updated_at before update on public.core_documents
for each row execute function public.core_set_updated_at();
create trigger core_document_versions_set_updated_at before update on public.core_document_versions
for each row execute function public.core_set_updated_at();
create trigger core_conversations_set_updated_at before update on public.core_conversations
for each row execute function public.core_set_updated_at();
create trigger core_messages_set_updated_at before update on public.core_messages
for each row execute function public.core_set_updated_at();
create trigger core_phone_calls_set_updated_at before update on public.core_phone_calls
for each row execute function public.core_set_updated_at();
create trigger core_message_templates_set_updated_at before update on public.core_message_templates
for each row execute function public.core_set_updated_at();
create trigger core_notifications_set_updated_at before update on public.core_notifications
for each row execute function public.core_set_updated_at();
create trigger core_events_set_updated_at before update on public.core_events
for each row execute function public.core_set_updated_at();
create trigger core_integration_events_set_updated_at before update on public.core_integration_events
for each row execute function public.core_set_updated_at();
create trigger core_threads_set_updated_at before update on public.core_threads
for each row execute function public.core_set_updated_at();
create trigger core_thread_messages_set_updated_at before update on public.core_thread_messages
for each row execute function public.core_set_updated_at();
create trigger core_tool_runs_set_updated_at before update on public.core_tool_runs
for each row execute function public.core_set_updated_at();
create trigger core_pending_actions_set_updated_at before update on public.core_pending_actions
for each row execute function public.core_set_updated_at();

-- Lookup and operational indexes ----------------------------------------------

create index if not exists core_profiles_phone_normalized_idx on public.core_profiles (phone_normalized);
create index if not exists core_profiles_created_at_idx on public.core_profiles (created_at);
create index if not exists core_families_created_at_idx on public.core_families (created_at);
create index if not exists core_buyers_email_normalized_idx on public.core_buyers (email_normalized);
create index if not exists core_buyers_phone_normalized_idx on public.core_buyers (phone_normalized);
create index if not exists core_buyers_alternate_phone_normalized_idx on public.core_buyers (alternate_phone_normalized);
create index if not exists core_buyers_created_at_idx on public.core_buyers (created_at);
create index if not exists core_family_members_family_id_idx on public.core_family_members (family_id);
create index if not exists core_family_members_buyer_id_idx on public.core_family_members (buyer_id);
create index if not exists core_applications_buyer_id_idx on public.core_applications (buyer_id);
create index if not exists core_applications_family_id_idx on public.core_applications (family_id);
create index if not exists core_applications_status_created_at_idx on public.core_applications (status, created_at);
create index if not exists core_application_sections_application_id_idx on public.core_application_sections (application_id);
create index if not exists core_buyer_preferences_buyer_id_idx on public.core_buyer_preferences (buyer_id);
create index if not exists core_litters_dam_id_idx on public.core_litters (dam_id);
create index if not exists core_litters_sire_id_idx on public.core_litters (sire_id);
create index if not exists core_litters_created_at_idx on public.core_litters (created_at);
create index if not exists core_puppies_litter_id_idx on public.core_puppies (litter_id);
create index if not exists core_puppies_status_idx on public.core_puppies (status);
create index if not exists core_puppies_created_at_idx on public.core_puppies (created_at);
create index if not exists core_puppy_events_puppy_event_at_idx on public.core_puppy_events (puppy_id, event_at desc);
create index if not exists core_weight_logs_puppy_measured_at_idx on public.core_weight_logs (puppy_id, measured_at desc);
create index if not exists core_feeding_logs_puppy_fed_at_idx on public.core_feeding_logs (puppy_id, fed_at desc);
create index if not exists core_medication_logs_puppy_administered_at_idx on public.core_medication_logs (puppy_id, administered_at desc);
create index if not exists core_reservations_buyer_id_idx on public.core_reservations (buyer_id);
create index if not exists core_reservations_puppy_id_idx on public.core_reservations (puppy_id);
create index if not exists core_reservations_family_id_idx on public.core_reservations (family_id);
create index if not exists core_reservations_status_created_at_idx on public.core_reservations (status, created_at);
create index if not exists core_go_home_reservation_id_idx on public.core_go_home_details (reservation_id);
create index if not exists core_go_home_planned_at_idx on public.core_go_home_details (planned_at);
create index if not exists core_financial_ledger_reservation_id_idx on public.core_financial_ledger (reservation_id);
create index if not exists core_financial_ledger_buyer_id_idx on public.core_financial_ledger (buyer_id);
create index if not exists core_financial_ledger_status_occurred_at_idx on public.core_financial_ledger (status, occurred_at);
create index if not exists core_financing_plans_reservation_id_idx on public.core_financing_plans (reservation_id);
create index if not exists core_financing_installments_plan_id_idx on public.core_financing_installments (financing_plan_id);
create index if not exists core_receipts_reservation_id_idx on public.core_receipts (reservation_id);
create index if not exists core_documents_reservation_id_idx on public.core_documents (reservation_id);
create index if not exists core_document_versions_document_id_idx on public.core_document_versions (document_id);
create index if not exists core_conversations_buyer_id_idx on public.core_conversations (buyer_id);
create index if not exists core_messages_conversation_created_at_idx on public.core_messages (conversation_id, created_at desc);
create index if not exists core_phone_calls_from_phone_idx on public.core_phone_calls (from_phone_normalized);
create index if not exists core_phone_calls_to_phone_idx on public.core_phone_calls (to_phone_normalized);
create index if not exists core_notifications_status_scheduled_at_idx on public.core_notifications (status, scheduled_at);
create index if not exists core_events_event_at_idx on public.core_events (event_at desc);
create index if not exists core_events_buyer_id_idx on public.core_events (buyer_id);
create index if not exists core_events_puppy_id_idx on public.core_events (puppy_id);
create index if not exists core_audit_log_entity_idx on public.core_audit_log (entity_table, entity_id);
create index if not exists core_audit_log_created_at_idx on public.core_audit_log (created_at desc);
create index if not exists core_integration_events_source_created_at_idx on public.core_integration_events (source_system, created_at desc);
create index if not exists core_integration_events_status_created_at_idx on public.core_integration_events (status, created_at);
create unique index if not exists core_integration_events_source_external_id_uidx
  on public.core_integration_events (source_system, external_event_id)
  where external_event_id is not null;
create index if not exists core_threads_created_at_idx on public.core_threads (created_at desc);
create index if not exists core_thread_messages_thread_id_idx on public.core_thread_messages (thread_id, created_at);
create index if not exists core_tool_runs_thread_id_idx on public.core_tool_runs (thread_id, created_at);
create index if not exists core_pending_actions_status_created_at_idx on public.core_pending_actions (status, created_at);

-- Read-friendly views ---------------------------------------------------------

-- Calculate transaction balance from reservation contract totals and posted signed ledger activity.
create or replace view public.core_payment_balance_view as
select
  r.id as reservation_id,
  r.buyer_id,
  r.puppy_id,
  r.status as reservation_status,
  r.currency,
  r.contract_total_cents,
  r.deposit_required_cents,
  coalesce(sum(l.amount_cents) filter (where l.status = 'posted'), 0)::integer as posted_ledger_total_cents,
  case
    when r.contract_total_cents is null then null
    else r.contract_total_cents - coalesce(sum(l.amount_cents) filter (where l.status = 'posted'), 0)::integer
  end as balance_due_cents,
  max(l.occurred_at) filter (where l.status = 'posted') as last_posted_payment_at
from public.core_reservations r
left join public.core_financial_ledger l on l.reservation_id = r.id
group by r.id, r.buyer_id, r.puppy_id, r.status, r.currency, r.contract_total_cents, r.deposit_required_cents;
comment on view public.core_payment_balance_view is 'Reservation balances calculated from contract totals and posted signed ledger activity; never copied onto buyers.';

-- One row per reservation with contact, puppy, go-home, and calculated money context.
create or replace view public.core_reservation_summary_view as
select
  r.id as reservation_id,
  r.status as reservation_status,
  r.reserved_at,
  r.buyer_id,
  concat_ws(' ', b.first_name, b.last_name) as buyer_name,
  b.email as buyer_email,
  b.phone as buyer_phone,
  b.phone_normalized as buyer_phone_normalized,
  r.family_id,
  f.name as family_name,
  r.puppy_id,
  p.name as puppy_name,
  p.collar_color as puppy_collar_color,
  p.status as puppy_status,
  r.application_id,
  pb.contract_total_cents,
  pb.deposit_required_cents,
  pb.posted_ledger_total_cents,
  pb.balance_due_cents,
  pb.currency,
  gh.planned_at as go_home_planned_at,
  gh.method as go_home_method,
  gh.status as go_home_status,
  r.created_at,
  r.updated_at
from public.core_reservations r
left join public.core_buyers b on b.id = r.buyer_id
left join public.core_families f on f.id = r.family_id
left join public.core_puppies p on p.id = r.puppy_id
left join public.core_payment_balance_view pb on pb.reservation_id = r.id
left join lateral (
  select d.planned_at, d.method, d.status
  from public.core_go_home_details d
  where d.reservation_id = r.id
  order by d.planned_at nulls last, d.created_at desc
  limit 1
) gh on true;
comment on view public.core_reservation_summary_view is 'Reservation read model with buyer, puppy, fulfillment, and calculated payment context.';

-- One row per buyer with aggregate application/reservation context and latest relevant transaction.
create or replace view public.core_buyer_summary_view as
select
  b.id as buyer_id,
  concat_ws(' ', b.first_name, b.last_name) as buyer_name,
  b.first_name,
  b.last_name,
  b.email,
  b.email_normalized,
  b.phone,
  b.phone_normalized,
  b.approval_status,
  coalesce(a.application_count, 0)::integer as application_count,
  a.latest_application_status,
  coalesce(r.reservation_count, 0)::integer as reservation_count,
  r.open_balance_cents,
  latest.reservation_id as current_reservation_id,
  latest.reservation_status as current_reservation_status,
  latest.puppy_id as current_puppy_id,
  latest.puppy_name as current_puppy_name,
  latest.go_home_planned_at,
  b.created_at,
  b.updated_at
from public.core_buyers b
left join lateral (
  select
    count(*)::integer as application_count,
    (array_agg(app.status order by app.created_at desc))[1] as latest_application_status
  from public.core_applications app
  where app.buyer_id = b.id
) a on true
left join lateral (
  select
    count(*)::integer as reservation_count,
    sum(pb.balance_due_cents) filter (
      where rs.status not in ('cancelled', 'void') and pb.balance_due_cents is not null
    )::integer as open_balance_cents
  from public.core_reservations rs
  left join public.core_payment_balance_view pb on pb.reservation_id = rs.id
  where rs.buyer_id = b.id
) r on true
left join lateral (
  select s.reservation_id, s.reservation_status, s.puppy_id, s.puppy_name, s.go_home_planned_at
  from public.core_reservation_summary_view s
  where s.buyer_id = b.id and s.reservation_status not in ('cancelled', 'void')
  order by s.created_at desc
  limit 1
) latest on true;
comment on view public.core_buyer_summary_view is 'Buyer read model with applications and reservation-derived context; buyers do not own financial totals.';

-- One row per puppy with litter and latest reservation context.
create or replace view public.core_puppy_summary_view as
select
  p.id as puppy_id,
  p.name as puppy_name,
  p.collar_color,
  p.sex,
  p.color,
  p.coat_type,
  p.birth_at,
  p.status as puppy_status,
  p.health_status,
  p.public_listing_status,
  p.litter_id,
  l.litter_name,
  l.birth_at as litter_birth_at,
  latest.reservation_id,
  latest.reservation_status,
  latest.buyer_id,
  latest.buyer_name,
  latest.contract_total_cents,
  latest.posted_ledger_total_cents,
  latest.balance_due_cents,
  latest.go_home_planned_at,
  p.created_at,
  p.updated_at
from public.core_puppies p
left join public.core_litters l on l.id = p.litter_id
left join lateral (
  select s.*
  from public.core_reservation_summary_view s
  where s.puppy_id = p.id and s.reservation_status not in ('cancelled', 'void')
  order by s.created_at desc
  limit 1
) latest on true;
comment on view public.core_puppy_summary_view is 'Puppy read model with litter and current reservation-derived payment/go-home context.';

-- Future phone provider read surface only; caller ambiguity and access rules must be handled server-side.
create or replace view public.core_phone_lookup_view as
select
  phone_source.normalized_phone,
  phone_source.phone_type,
  b.id as buyer_id,
  concat_ws(' ', b.first_name, b.last_name) as buyer_name,
  b.email,
  b.approval_status,
  bs.latest_application_status,
  rs.family_id,
  rs.family_name,
  rs.reservation_id,
  rs.reservation_status,
  rs.puppy_id,
  rs.puppy_name,
  rs.balance_due_cents,
  rs.currency,
  rs.go_home_planned_at,
  rs.go_home_status
from public.core_buyers b
cross join lateral (
  values (b.phone_normalized, 'primary'::text), (b.alternate_phone_normalized, 'alternate'::text)
) phone_source(normalized_phone, phone_type)
left join public.core_buyer_summary_view bs on bs.buyer_id = b.id
left join public.core_reservation_summary_view rs on rs.reservation_id = bs.current_reservation_id
where phone_source.normalized_phone is not null;
comment on view public.core_phone_lookup_view is 'Read-only future phone lookup surface; does not enable Twilio routing, messaging, or automatic disclosure.';

-- Today-oriented operations feed for a future read-only dashboard.
create or replace view public.core_dashboard_today_view as
select
  'application'::text as item_type,
  a.id as item_id,
  coalesce(a.submitted_at, a.created_at) as occurs_at,
  a.status,
  concat_ws(' - ', 'Application', coalesce(concat_ws(' ', b.first_name, b.last_name), 'Unmatched applicant')) as summary,
  a.buyer_id,
  null::uuid as puppy_id,
  null::uuid as reservation_id,
  jsonb_build_object('application_id', a.id, 'source', a.source) as details
from public.core_applications a
left join public.core_buyers b on b.id = a.buyer_id
where coalesce(a.submitted_at, a.created_at) >= date_trunc('day', now())
  and coalesce(a.submitted_at, a.created_at) < date_trunc('day', now()) + interval '1 day'
union all
select
  'go_home'::text as item_type,
  gh.id as item_id,
  gh.planned_at as occurs_at,
  gh.status,
  concat_ws(' - ', coalesce(p.name, 'Unassigned puppy'), coalesce(concat_ws(' ', b.first_name, b.last_name), 'Unassigned buyer')) as summary,
  r.buyer_id,
  r.puppy_id,
  r.id as reservation_id,
  jsonb_build_object('method', gh.method, 'location', gh.location) as details
from public.core_go_home_details gh
left join public.core_reservations r on r.id = gh.reservation_id
left join public.core_buyers b on b.id = r.buyer_id
left join public.core_puppies p on p.id = r.puppy_id
where gh.planned_at >= date_trunc('day', now())
  and gh.planned_at < date_trunc('day', now()) + interval '1 day'
union all
select
  'financial_ledger'::text,
  fl.id,
  fl.occurred_at,
  fl.status,
  concat_ws(' - ', fl.entry_type, concat(fl.amount_cents, ' cents')),
  fl.buyer_id,
  r.puppy_id,
  fl.reservation_id,
  jsonb_build_object('amount_cents', fl.amount_cents, 'currency', fl.currency)
from public.core_financial_ledger fl
left join public.core_reservations r on r.id = fl.reservation_id
where fl.occurred_at >= date_trunc('day', now())
  and fl.occurred_at < date_trunc('day', now()) + interval '1 day'
union all
select
  'document'::text,
  d.id,
  d.created_at,
  d.status,
  coalesce(d.title, d.document_type, 'Document'),
  d.buyer_id,
  d.puppy_id,
  d.reservation_id,
  jsonb_build_object('document_type', d.document_type)
from public.core_documents d
where d.created_at >= date_trunc('day', now())
  and d.created_at < date_trunc('day', now()) + interval '1 day'
union all
select
  'notification'::text,
  n.id,
  n.scheduled_at,
  n.status,
  coalesce(n.notification_type, 'Scheduled notification'),
  n.buyer_id,
  null::uuid,
  null::uuid,
  jsonb_build_object('channel', n.channel)
from public.core_notifications n
where n.scheduled_at >= date_trunc('day', now())
  and n.scheduled_at < date_trunc('day', now()) + interval '1 day'
union all
select
  'puppy_event'::text,
  pe.id,
  pe.event_at,
  pe.event_type,
  coalesce(pe.summary, pe.event_type),
  null::uuid,
  pe.puppy_id,
  null::uuid,
  pe.details
from public.core_puppy_events pe
where pe.event_at >= date_trunc('day', now())
  and pe.event_at < date_trunc('day', now()) + interval '1 day'
union all
select
  'phone_call'::text,
  pc.id,
  coalesce(pc.started_at, pc.created_at),
  pc.status,
  concat_ws(' - ', 'Phone call', pc.direction),
  pc.buyer_id,
  null::uuid,
  null::uuid,
  jsonb_build_object('from_phone_normalized', pc.from_phone_normalized, 'to_phone_normalized', pc.to_phone_normalized)
from public.core_phone_calls pc
where coalesce(pc.started_at, pc.created_at) >= date_trunc('day', now())
  and coalesce(pc.started_at, pc.created_at) < date_trunc('day', now()) + interval '1 day'
union all
select
  'integration_attention'::text,
  ie.id,
  coalesce(ie.next_retry_at, ie.created_at),
  ie.status,
  concat_ws(' - ', ie.source_system, ie.event_type),
  null::uuid,
  null::uuid,
  null::uuid,
  jsonb_build_object('attempts', ie.attempts, 'error_message', ie.error_message)
from public.core_integration_events ie
where ie.status in ('failed', 'retry_pending')
  and coalesce(ie.next_retry_at, ie.created_at) < date_trunc('day', now()) + interval '1 day';
comment on view public.core_dashboard_today_view is 'Read-only feed for today''s applications, fulfillment, finances, documents, notifications, calls, puppy events, and integration attention.';
