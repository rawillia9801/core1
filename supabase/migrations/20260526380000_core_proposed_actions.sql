-- Cherolee Core proposed action queue foundation.
--
-- Business rule:
--   * Proposed actions are proposal/review records only.
--   * Approval does not execute the underlying business action.
--   * Future execution must go through controlled RPC/server action paths.
--
-- Migration caution:
--   * This does not connect AI providers, execute business actions, send email/SMS,
--     move payments, generate documents, request signatures, publish listings,
--     enable RLS, or connect external systems.

create table if not exists public.core_proposed_actions (
  id uuid primary key default gen_random_uuid(),
  action_type text not null,
  title text not null,
  summary text,
  risk_level text not null default 'low',
  status text not null default 'draft',
  proposed_by_type text not null default 'staff_profile',
  proposed_by_profile_id uuid references public.core_profiles(id) on delete set null,
  source text not null default 'staff_manual',
  target_table text,
  target_id uuid,
  before_snapshot jsonb not null default '{}'::jsonb,
  proposed_change jsonb not null default '{}'::jsonb,
  validation_status text not null default 'not_validated',
  approved_by_profile_id uuid references public.core_profiles(id) on delete set null,
  approved_at timestamptz,
  rejected_by_profile_id uuid references public.core_profiles(id) on delete set null,
  rejected_at timestamptz,
  rejection_reason text,
  expires_at timestamptz,
  execution_status text not null default 'not_executable',
  executed_at timestamptz,
  execution_result jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint core_proposed_actions_risk_level_check
    check (risk_level in ('low', 'medium', 'high', 'blocked')),
  constraint core_proposed_actions_status_check
    check (status in ('draft', 'needs_review', 'approved', 'rejected', 'expired', 'cancelled')),
  constraint core_proposed_actions_validation_status_check
    check (validation_status in ('not_validated', 'valid', 'invalid', 'needs_review')),
  constraint core_proposed_actions_execution_status_check
    check (execution_status in ('not_executable', 'not_started', 'blocked', 'executed', 'failed')),
  constraint core_proposed_actions_action_type_not_blank
    check (length(btrim(action_type)) > 0),
  constraint core_proposed_actions_title_not_blank
    check (length(btrim(title)) > 0)
);

comment on table public.core_proposed_actions is
  'Proposal/review queue for future staff/AI-assisted actions. Approval records intent only; no business action execution is enabled.';

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'core_proposed_actions_set_updated_at'
      and tgrelid = 'public.core_proposed_actions'::regclass
  ) then
    execute 'create trigger core_proposed_actions_set_updated_at
      before update on public.core_proposed_actions
      for each row execute function public.core_set_updated_at()';
  end if;
end $$;

create index if not exists core_proposed_actions_status_created_at_idx
  on public.core_proposed_actions (status, created_at desc);
create index if not exists core_proposed_actions_risk_level_idx
  on public.core_proposed_actions (risk_level);
create index if not exists core_proposed_actions_target_idx
  on public.core_proposed_actions (target_table, target_id);
create index if not exists core_proposed_actions_proposed_by_idx
  on public.core_proposed_actions (proposed_by_profile_id);
create index if not exists core_proposed_actions_approved_by_idx
  on public.core_proposed_actions (approved_by_profile_id);

create or replace function public.core_create_proposed_action(
  p_actor_profile_id uuid,
  p_action_type text,
  p_title text,
  p_summary text default null,
  p_risk_level text default 'low',
  p_target_table text default null,
  p_target_id uuid default null,
  p_before_snapshot jsonb default '{}'::jsonb,
  p_proposed_change jsonb default '{}'::jsonb,
  p_source text default 'staff_manual',
  p_expires_at timestamptz default null
)
returns table (
  proposed_action_id uuid,
  action_type text,
  status text,
  risk_level text,
  event_id uuid,
  audit_log_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.core_profiles%rowtype;
  v_action public.core_proposed_actions%rowtype;
  v_event_id uuid;
  v_audit_log_id uuid;
  v_action_type text := lower(nullif(btrim(coalesce(p_action_type, '')), ''));
  v_title text := nullif(btrim(coalesce(p_title, '')), '');
  v_summary text := nullif(btrim(coalesce(p_summary, '')), '');
  v_risk_level text := lower(nullif(btrim(coalesce(p_risk_level, 'low')), ''));
  v_target_table text := nullif(btrim(coalesce(p_target_table, '')), '');
  v_source text := nullif(btrim(coalesce(p_source, 'staff_manual')), '');
  v_before_snapshot jsonb := coalesce(p_before_snapshot, '{}'::jsonb);
  v_proposed_change jsonb := coalesce(p_proposed_change, '{}'::jsonb);
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

  if v_actor.role not in ('owner', 'admin', 'staff') then
    raise exception 'actor profile % is not authorized to propose actions', p_actor_profile_id;
  end if;

  if v_action_type is null then
    raise exception 'action_type is required';
  end if;

  if v_title is null then
    raise exception 'title is required';
  end if;

  if v_risk_level not in ('low', 'medium', 'high', 'blocked') then
    raise exception 'risk_level is not allowed';
  end if;

  if jsonb_typeof(v_before_snapshot) <> 'object' then
    raise exception 'before_snapshot must be a JSON object';
  end if;

  if jsonb_typeof(v_proposed_change) <> 'object' then
    raise exception 'proposed_change must be a JSON object';
  end if;

  if length(v_action_type) > 100 then
    raise exception 'action_type must be 100 characters or fewer';
  end if;

  if length(v_title) > 200 then
    raise exception 'title must be 200 characters or fewer';
  end if;

  if length(coalesce(v_summary, '')) > 2000 then
    raise exception 'summary must be 2000 characters or fewer';
  end if;

  if length(coalesce(v_target_table, '')) > 100 then
    raise exception 'target_table must be 100 characters or fewer';
  end if;

  if length(coalesce(v_source, '')) > 100 then
    raise exception 'source must be 100 characters or fewer';
  end if;

  if v_proposed_change @> '{"send_now": true}'::jsonb
     or v_proposed_change @> '{"send_email_now": true}'::jsonb
     or v_proposed_change @> '{"send_sms_now": true}'::jsonb
     or v_proposed_change @> '{"move_money_now": true}'::jsonb
     or v_proposed_change @> '{"publish_now": true}'::jsonb
     or v_proposed_change @> '{"generate_document_now": true}'::jsonb
     or v_proposed_change @> '{"request_signature_now": true}'::jsonb
     or v_proposed_change @> '{"execute_now": true}'::jsonb
     or v_proposed_change @> '{"external_side_effects": true}'::jsonb then
    raise exception 'proposed actions cannot request immediate execution or external side effects';
  end if;

  insert into public.core_proposed_actions (
    action_type,
    title,
    summary,
    risk_level,
    status,
    proposed_by_type,
    proposed_by_profile_id,
    source,
    target_table,
    target_id,
    before_snapshot,
    proposed_change,
    validation_status,
    expires_at,
    execution_status,
    metadata
  ) values (
    v_action_type,
    v_title,
    v_summary,
    v_risk_level,
    'needs_review',
    'staff_profile',
    p_actor_profile_id,
    v_source,
    v_target_table,
    p_target_id,
    v_before_snapshot,
    v_proposed_change,
    'not_validated',
    p_expires_at,
    'not_executable',
    jsonb_build_object(
      'external_side_effects', false,
      'proposal_only', true,
      'business_action_executed', false,
      'created_by_tool', 'core_create_proposed_action'
    )
  ) returning * into v_action;

  insert into public.core_events (
    event_type,
    event_at,
    summary,
    related_table,
    related_id,
    source,
    details,
    created_by_profile_id
  ) values (
    'proposed_action_created',
    now(),
    concat('Proposed action created: ', v_action.title),
    'core_proposed_actions',
    v_action.id,
    'core_create_proposed_action',
    jsonb_build_object(
      'action_type', v_action.action_type,
      'risk_level', v_action.risk_level,
      'status', v_action.status,
      'target_table', v_action.target_table,
      'target_id', v_action.target_id,
      'external_side_effects', false
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
    'staff_profile',
    p_actor_profile_id,
    coalesce(v_actor.display_name, v_actor.email, p_actor_profile_id::text),
    'core_create_proposed_action',
    'proposed_action_created',
    'core_proposed_actions',
    v_action.id,
    null,
    to_jsonb(v_action),
    jsonb_build_object(
      'source_function', 'core_create_proposed_action',
      'external_side_effects', false
    ),
    'success'
  ) returning id into v_audit_log_id;

  proposed_action_id := v_action.id;
  action_type := v_action.action_type;
  status := v_action.status;
  risk_level := v_action.risk_level;
  event_id := v_event_id;
  audit_log_id := v_audit_log_id;
  return next;
end;
$$;

create or replace function public.core_approve_proposed_action(
  p_proposed_action_id uuid,
  p_actor_profile_id uuid
)
returns table (
  proposed_action_id uuid,
  status text,
  approved_by_profile_id uuid,
  approved_at timestamptz,
  event_id uuid,
  audit_log_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.core_profiles%rowtype;
  v_existing public.core_proposed_actions%rowtype;
  v_action public.core_proposed_actions%rowtype;
  v_event_id uuid;
  v_audit_log_id uuid;
begin
  if p_actor_profile_id is null then
    raise exception 'actor_profile_id is required';
  end if;

  if p_proposed_action_id is null then
    raise exception 'proposed_action_id is required';
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
    raise exception 'actor profile % is not authorized to approve proposed actions', p_actor_profile_id;
  end if;

  select *
  into v_existing
  from public.core_proposed_actions
  where id = p_proposed_action_id
  for update;

  if not found then
    raise exception 'proposed action % was not found', p_proposed_action_id;
  end if;

  if v_existing.status in ('approved', 'rejected', 'cancelled', 'expired') then
    raise exception 'proposed action % cannot be approved from status %', p_proposed_action_id, v_existing.status;
  end if;

  if v_existing.risk_level = 'blocked' then
    raise exception 'blocked proposed actions cannot be approved';
  end if;

  update public.core_proposed_actions
  set status = 'approved',
      approved_by_profile_id = p_actor_profile_id,
      approved_at = now(),
      execution_status = 'not_executable',
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'external_side_effects', false,
        'approval_only', true,
        'business_action_executed', false
      )
  where id = p_proposed_action_id
  returning * into v_action;

  insert into public.core_events (
    event_type,
    event_at,
    summary,
    related_table,
    related_id,
    source,
    details,
    created_by_profile_id
  ) values (
    'proposed_action_approved',
    now(),
    concat('Proposed action approved: ', v_action.title),
    'core_proposed_actions',
    v_action.id,
    'core_approve_proposed_action',
    jsonb_build_object(
      'action_type', v_action.action_type,
      'risk_level', v_action.risk_level,
      'status', v_action.status,
      'external_side_effects', false,
      'business_action_executed', false
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
    'staff_profile',
    p_actor_profile_id,
    coalesce(v_actor.display_name, v_actor.email, p_actor_profile_id::text),
    'core_approve_proposed_action',
    'proposed_action_approved',
    'core_proposed_actions',
    v_action.id,
    to_jsonb(v_existing),
    to_jsonb(v_action),
    jsonb_build_object(
      'source_function', 'core_approve_proposed_action',
      'external_side_effects', false,
      'business_action_executed', false
    ),
    'success'
  ) returning id into v_audit_log_id;

  proposed_action_id := v_action.id;
  status := v_action.status;
  approved_by_profile_id := v_action.approved_by_profile_id;
  approved_at := v_action.approved_at;
  event_id := v_event_id;
  audit_log_id := v_audit_log_id;
  return next;
end;
$$;

create or replace function public.core_reject_proposed_action(
  p_proposed_action_id uuid,
  p_actor_profile_id uuid,
  p_rejection_reason text default null
)
returns table (
  proposed_action_id uuid,
  status text,
  rejected_by_profile_id uuid,
  rejected_at timestamptz,
  event_id uuid,
  audit_log_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor public.core_profiles%rowtype;
  v_existing public.core_proposed_actions%rowtype;
  v_action public.core_proposed_actions%rowtype;
  v_event_id uuid;
  v_audit_log_id uuid;
  v_rejection_reason text := nullif(btrim(coalesce(p_rejection_reason, '')), '');
begin
  if p_actor_profile_id is null then
    raise exception 'actor_profile_id is required';
  end if;

  if p_proposed_action_id is null then
    raise exception 'proposed_action_id is required';
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
    raise exception 'actor profile % is not authorized to reject proposed actions', p_actor_profile_id;
  end if;

  if length(coalesce(v_rejection_reason, '')) > 1000 then
    raise exception 'rejection_reason must be 1000 characters or fewer';
  end if;

  select *
  into v_existing
  from public.core_proposed_actions
  where id = p_proposed_action_id
  for update;

  if not found then
    raise exception 'proposed action % was not found', p_proposed_action_id;
  end if;

  if v_existing.status in ('approved', 'rejected', 'cancelled', 'expired') then
    raise exception 'proposed action % cannot be rejected from status %', p_proposed_action_id, v_existing.status;
  end if;

  update public.core_proposed_actions
  set status = 'rejected',
      rejected_by_profile_id = p_actor_profile_id,
      rejected_at = now(),
      rejection_reason = v_rejection_reason,
      execution_status = 'not_executable',
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'external_side_effects', false,
        'business_action_executed', false
      )
  where id = p_proposed_action_id
  returning * into v_action;

  insert into public.core_events (
    event_type,
    event_at,
    summary,
    related_table,
    related_id,
    source,
    details,
    created_by_profile_id
  ) values (
    'proposed_action_rejected',
    now(),
    concat('Proposed action rejected: ', v_action.title),
    'core_proposed_actions',
    v_action.id,
    'core_reject_proposed_action',
    jsonb_build_object(
      'action_type', v_action.action_type,
      'risk_level', v_action.risk_level,
      'status', v_action.status,
      'external_side_effects', false,
      'business_action_executed', false
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
    'staff_profile',
    p_actor_profile_id,
    coalesce(v_actor.display_name, v_actor.email, p_actor_profile_id::text),
    'core_reject_proposed_action',
    'proposed_action_rejected',
    'core_proposed_actions',
    v_action.id,
    to_jsonb(v_existing),
    to_jsonb(v_action),
    jsonb_build_object(
      'source_function', 'core_reject_proposed_action',
      'external_side_effects', false,
      'business_action_executed', false
    ),
    'success'
  ) returning id into v_audit_log_id;

  proposed_action_id := v_action.id;
  status := v_action.status;
  rejected_by_profile_id := v_action.rejected_by_profile_id;
  rejected_at := v_action.rejected_at;
  event_id := v_event_id;
  audit_log_id := v_audit_log_id;
  return next;
end;
$$;

comment on function public.core_create_proposed_action(
  uuid,
  text,
  text,
  text,
  text,
  text,
  uuid,
  jsonb,
  jsonb,
  text,
  timestamptz
) is
  'Creates a proposed action review record plus event/audit rows only; no business action is executed.';

comment on function public.core_approve_proposed_action(uuid, uuid) is
  'Marks a proposed action approved plus event/audit rows only; approval does not execute the business action.';

comment on function public.core_reject_proposed_action(uuid, uuid, text) is
  'Marks a proposed action rejected plus event/audit rows only; no business action is executed.';
