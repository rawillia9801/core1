begin;

insert into public.core_profiles (
  id,
  display_name,
  email,
  role,
  status,
  metadata
) values (
  '73000000-0000-0000-0000-000000000001'::uuid,
  'Local Proposed Action Owner',
  'proposed.action.owner@example.invalid',
  'owner',
  'active',
  '{"test": true}'::jsonb
) on conflict (id) do update
set display_name = excluded.display_name,
    email = excluded.email,
    role = excluded.role,
    status = excluded.status,
    metadata = excluded.metadata;

create temp table proposed_action_create_result as
select *
from public.core_create_proposed_action(
  '73000000-0000-0000-0000-000000000001'::uuid,
  'update_puppy',
  'Review puppy status proposal',
  'Rollback-safe proposed action test only.',
  'medium',
  'core_puppies',
  '73000000-0000-0000-0000-000000000101'::uuid,
  '{"status": "available"}'::jsonb,
  '{"status": "hold", "reason": "manual review"}'::jsonb,
  'rollback_test',
  now() + interval '7 days'
);

do $$
declare
  v_action_id uuid;
begin
  select proposed_action_id
  into v_action_id
  from proposed_action_create_result;

  if v_action_id is null then
    raise exception 'create proposed action did not return an id';
  end if;

  if not exists (
    select 1
    from public.core_proposed_actions
    where id = v_action_id
      and status = 'needs_review'
      and action_type = 'update_puppy'
      and risk_level = 'medium'
      and metadata @> '{"external_side_effects": false}'::jsonb
  ) then
    raise exception 'created proposed action row was not stored with expected review state and metadata';
  end if;

  if not exists (
    select 1
    from public.core_events
    where related_table = 'core_proposed_actions'
      and related_id = v_action_id
      and event_type = 'proposed_action_created'
      and source = 'core_create_proposed_action'
      and details @> '{"external_side_effects": false}'::jsonb
  ) then
    raise exception 'proposed_action_created event was not written';
  end if;

  if not exists (
    select 1
    from public.core_audit_log
    where entity_table = 'core_proposed_actions'
      and entity_id = v_action_id
      and action = 'proposed_action_created'
      and source = 'core_create_proposed_action'
      and request_context @> '{"external_side_effects": false}'::jsonb
  ) then
    raise exception 'proposed_action_created audit row was not written';
  end if;
end $$;

create temp table proposed_action_approve_result as
select *
from public.core_approve_proposed_action(
  (select proposed_action_id from proposed_action_create_result),
  '73000000-0000-0000-0000-000000000001'::uuid
);

do $$
declare
  v_action_id uuid;
begin
  select proposed_action_id
  into v_action_id
  from proposed_action_create_result;

  if not exists (
    select 1
    from public.core_proposed_actions
    where id = v_action_id
      and status = 'approved'
      and approved_by_profile_id = '73000000-0000-0000-0000-000000000001'::uuid
      and approved_at is not null
      and execution_status = 'not_executable'
  ) then
    raise exception 'approved proposed action row did not have expected approval state';
  end if;

  if not exists (
    select 1
    from public.core_events
    where related_table = 'core_proposed_actions'
      and related_id = v_action_id
      and event_type = 'proposed_action_approved'
      and source = 'core_approve_proposed_action'
  ) then
    raise exception 'proposed_action_approved event was not written';
  end if;

  if not exists (
    select 1
    from public.core_audit_log
    where entity_table = 'core_proposed_actions'
      and entity_id = v_action_id
      and action = 'proposed_action_approved'
      and source = 'core_approve_proposed_action'
  ) then
    raise exception 'proposed_action_approved audit row was not written';
  end if;
end $$;

create temp table proposed_action_reject_source as
select *
from public.core_create_proposed_action(
  '73000000-0000-0000-0000-000000000001'::uuid,
  'draft_customer_message',
  'Review draft message proposal',
  'Rollback-safe rejection test only.',
  'low',
  'core_buyers',
  '73000000-0000-0000-0000-000000000202'::uuid,
  '{}'::jsonb,
  '{"draft_only": true}'::jsonb,
  'rollback_test',
  null
);

create temp table proposed_action_reject_result as
select *
from public.core_reject_proposed_action(
  (select proposed_action_id from proposed_action_reject_source),
  '73000000-0000-0000-0000-000000000001'::uuid,
  'Not ready for review.'
);

do $$
declare
  v_action_id uuid;
begin
  select proposed_action_id
  into v_action_id
  from proposed_action_reject_source;

  if not exists (
    select 1
    from public.core_proposed_actions
    where id = v_action_id
      and status = 'rejected'
      and rejected_by_profile_id = '73000000-0000-0000-0000-000000000001'::uuid
      and rejected_at is not null
      and rejection_reason = 'Not ready for review.'
  ) then
    raise exception 'rejected proposed action row did not have expected rejection state';
  end if;

  if not exists (
    select 1
    from public.core_events
    where related_table = 'core_proposed_actions'
      and related_id = v_action_id
      and event_type = 'proposed_action_rejected'
      and source = 'core_reject_proposed_action'
  ) then
    raise exception 'proposed_action_rejected event was not written';
  end if;

  if not exists (
    select 1
    from public.core_audit_log
    where entity_table = 'core_proposed_actions'
      and entity_id = v_action_id
      and action = 'proposed_action_rejected'
      and source = 'core_reject_proposed_action'
  ) then
    raise exception 'proposed_action_rejected audit row was not written';
  end if;
end $$;

do $$
begin
  perform public.core_create_proposed_action(
    '73000000-0000-0000-0000-000000000001'::uuid,
    'send_customer_email',
    'Invalid immediate send proposal',
    'This should be rejected because it requests an immediate send.',
    'high',
    'core_buyers',
    '73000000-0000-0000-0000-000000000303'::uuid,
    '{}'::jsonb,
    '{"send_email_now": true}'::jsonb,
    'rollback_test',
    null
  );

  raise exception 'immediate external side-effect proposal was not rejected';
exception
  when others then
    if sqlerrm = 'immediate external side-effect proposal was not rejected' then
      raise;
    end if;
end $$;

do $$
begin
  perform public.core_approve_proposed_action(
    (select proposed_action_id from proposed_action_reject_source),
    '73000000-0000-0000-0000-000000000001'::uuid
  );

  raise exception 'rejected proposed action was approved';
exception
  when others then
    if sqlerrm = 'rejected proposed action was approved' then
      raise;
    end if;
end $$;

select
  (select count(*) from public.core_proposed_actions where source = 'rollback_test') as proposed_action_check,
  (select count(*) from public.core_events where related_table = 'core_proposed_actions') as event_check,
  (select count(*) from public.core_audit_log where entity_table = 'core_proposed_actions') as audit_check;

rollback;
