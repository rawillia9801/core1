-- Cherolee Core internal application review detail actions.
--
-- Business rule:
--   * Application review changes must remain internal Core actions.
--   * These functions update only application review/status fields and write
--     operational event/audit records.
--   * They do not send messages, queue notifications, create reservations,
--     generate documents, move money, publish listings, or call providers.

create or replace function public.core_decline_application(
  p_application_id uuid,
  p_actor_profile_id uuid,
  p_decision_notes text
)
returns table (
  application_id uuid,
  application_status text,
  event_id uuid,
  audit_log_id uuid
)
language plpgsql
security invoker
as $$
declare
  v_application_old public.core_applications%rowtype;
  v_application_new public.core_applications%rowtype;
  v_actor public.core_profiles%rowtype;
  v_notes text;
  v_event_id uuid;
  v_audit_log_id uuid;
begin
  if p_application_id is null then
    raise exception 'application_id is required';
  end if;

  if p_actor_profile_id is null then
    raise exception 'actor_profile_id is required';
  end if;

  v_notes := nullif(trim(coalesce(p_decision_notes, '')), '');
  if v_notes is null then
    raise exception 'decision_notes is required';
  end if;

  if length(v_notes) > 2000 then
    raise exception 'decision_notes must be 2000 characters or fewer';
  end if;

  select *
  into v_actor
  from public.core_profiles
  where id = p_actor_profile_id;

  if not found then
    raise exception 'actor profile % was not found', p_actor_profile_id;
  end if;

  if v_actor.status <> 'active' or v_actor.role not in ('owner', 'admin') then
    raise exception 'actor profile % is not authorized for application review', p_actor_profile_id;
  end if;

  select *
  into v_application_old
  from public.core_applications
  where id = p_application_id
  for update;

  if not found then
    raise exception 'application % was not found', p_application_id;
  end if;

  if v_application_old.status in ('approved', 'declined', 'void', 'archived') then
    raise exception 'application % is already in terminal status %', p_application_id, v_application_old.status;
  end if;

  update public.core_applications
  set
    status = 'declined',
    reviewed_at = now(),
    reviewed_by_profile_id = p_actor_profile_id,
    decision_notes = v_notes
  where id = p_application_id
  returning * into v_application_new;

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
    'application_declined',
    now(),
    concat('Application declined by ', coalesce(v_actor.display_name, v_actor.email, 'owner/admin')),
    v_application_new.family_id,
    v_application_new.buyer_id,
    v_application_new.id,
    'core_applications',
    v_application_new.id,
    'core_decline_application',
    jsonb_build_object(
      'decision_notes_provided', true,
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
    'profile',
    p_actor_profile_id,
    coalesce(v_actor.display_name, v_actor.email, 'core_decline_application'),
    'core_decline_application',
    'decline_application',
    'core_applications',
    v_application_new.id,
    to_jsonb(v_application_old),
    to_jsonb(v_application_new),
    jsonb_build_object(
      'decision_notes_provided', true,
      'external_side_effects', false,
      'email_sent', false,
      'sms_sent', false,
      'document_generated', false,
      'reservation_created', false,
      'payment_moved', false
    ),
    'success'
  ) returning id into v_audit_log_id;

  application_id := v_application_new.id;
  application_status := v_application_new.status;
  event_id := v_event_id;
  audit_log_id := v_audit_log_id;
  return next;
end;
$$;

create or replace function public.core_mark_application_needs_info(
  p_application_id uuid,
  p_actor_profile_id uuid,
  p_decision_notes text
)
returns table (
  application_id uuid,
  application_status text,
  event_id uuid,
  audit_log_id uuid
)
language plpgsql
security invoker
as $$
declare
  v_application_old public.core_applications%rowtype;
  v_application_new public.core_applications%rowtype;
  v_actor public.core_profiles%rowtype;
  v_notes text;
  v_event_id uuid;
  v_audit_log_id uuid;
begin
  if p_application_id is null then
    raise exception 'application_id is required';
  end if;

  if p_actor_profile_id is null then
    raise exception 'actor_profile_id is required';
  end if;

  v_notes := nullif(trim(coalesce(p_decision_notes, '')), '');
  if v_notes is null then
    raise exception 'decision_notes is required';
  end if;

  if length(v_notes) > 2000 then
    raise exception 'decision_notes must be 2000 characters or fewer';
  end if;

  select *
  into v_actor
  from public.core_profiles
  where id = p_actor_profile_id;

  if not found then
    raise exception 'actor profile % was not found', p_actor_profile_id;
  end if;

  if v_actor.status <> 'active' or v_actor.role not in ('owner', 'admin') then
    raise exception 'actor profile % is not authorized for application review', p_actor_profile_id;
  end if;

  select *
  into v_application_old
  from public.core_applications
  where id = p_application_id
  for update;

  if not found then
    raise exception 'application % was not found', p_application_id;
  end if;

  if v_application_old.status in ('approved', 'declined', 'void', 'archived') then
    raise exception 'application % is already in terminal status %', p_application_id, v_application_old.status;
  end if;

  update public.core_applications
  set
    status = 'needs_info',
    reviewed_at = now(),
    reviewed_by_profile_id = p_actor_profile_id,
    decision_notes = v_notes
  where id = p_application_id
  returning * into v_application_new;

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
    'application_needs_info',
    now(),
    concat('Application marked needs-info by ', coalesce(v_actor.display_name, v_actor.email, 'owner/admin')),
    v_application_new.family_id,
    v_application_new.buyer_id,
    v_application_new.id,
    'core_applications',
    v_application_new.id,
    'core_mark_application_needs_info',
    jsonb_build_object(
      'decision_notes_provided', true,
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
    'profile',
    p_actor_profile_id,
    coalesce(v_actor.display_name, v_actor.email, 'core_mark_application_needs_info'),
    'core_mark_application_needs_info',
    'mark_application_needs_info',
    'core_applications',
    v_application_new.id,
    to_jsonb(v_application_old),
    to_jsonb(v_application_new),
    jsonb_build_object(
      'decision_notes_provided', true,
      'external_side_effects', false,
      'email_sent', false,
      'sms_sent', false,
      'document_generated', false,
      'reservation_created', false,
      'payment_moved', false
    ),
    'success'
  ) returning id into v_audit_log_id;

  application_id := v_application_new.id;
  application_status := v_application_new.status;
  event_id := v_event_id;
  audit_log_id := v_audit_log_id;
  return next;
end;
$$;

create or replace function public.core_add_application_review_note(
  p_application_id uuid,
  p_actor_profile_id uuid,
  p_review_note text
)
returns table (
  application_id uuid,
  application_status text,
  event_id uuid,
  audit_log_id uuid
)
language plpgsql
security invoker
as $$
declare
  v_application_old public.core_applications%rowtype;
  v_application_new public.core_applications%rowtype;
  v_actor public.core_profiles%rowtype;
  v_note text;
  v_combined_notes text;
  v_event_id uuid;
  v_audit_log_id uuid;
begin
  if p_application_id is null then
    raise exception 'application_id is required';
  end if;

  if p_actor_profile_id is null then
    raise exception 'actor_profile_id is required';
  end if;

  v_note := nullif(trim(coalesce(p_review_note, '')), '');
  if v_note is null then
    raise exception 'review_note is required';
  end if;

  if length(v_note) > 2000 then
    raise exception 'review_note must be 2000 characters or fewer';
  end if;

  select *
  into v_actor
  from public.core_profiles
  where id = p_actor_profile_id;

  if not found then
    raise exception 'actor profile % was not found', p_actor_profile_id;
  end if;

  if v_actor.status <> 'active' or v_actor.role not in ('owner', 'admin') then
    raise exception 'actor profile % is not authorized for application review', p_actor_profile_id;
  end if;

  select *
  into v_application_old
  from public.core_applications
  where id = p_application_id
  for update;

  if not found then
    raise exception 'application % was not found', p_application_id;
  end if;

  v_combined_notes := concat_ws(E'\n\n', nullif(v_application_old.decision_notes, ''), v_note);

  update public.core_applications
  set
    reviewed_at = coalesce(reviewed_at, now()),
    reviewed_by_profile_id = coalesce(reviewed_by_profile_id, p_actor_profile_id),
    decision_notes = v_combined_notes
  where id = p_application_id
  returning * into v_application_new;

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
    'application_review_note_added',
    now(),
    concat('Application review note added by ', coalesce(v_actor.display_name, v_actor.email, 'owner/admin')),
    v_application_new.family_id,
    v_application_new.buyer_id,
    v_application_new.id,
    'core_applications',
    v_application_new.id,
    'core_add_application_review_note',
    jsonb_build_object(
      'note_added', true,
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
    'profile',
    p_actor_profile_id,
    coalesce(v_actor.display_name, v_actor.email, 'core_add_application_review_note'),
    'core_add_application_review_note',
    'add_application_review_note',
    'core_applications',
    v_application_new.id,
    to_jsonb(v_application_old),
    to_jsonb(v_application_new),
    jsonb_build_object(
      'note_added', true,
      'external_side_effects', false,
      'email_sent', false,
      'sms_sent', false,
      'document_generated', false,
      'reservation_created', false,
      'payment_moved', false
    ),
    'success'
  ) returning id into v_audit_log_id;

  application_id := v_application_new.id;
  application_status := v_application_new.status;
  event_id := v_event_id;
  audit_log_id := v_audit_log_id;
  return next;
end;
$$;

comment on function public.core_decline_application(uuid, uuid, text) is
  'Internal application decline review action. Updates application review status and writes event/audit rows without external side effects.';

comment on function public.core_mark_application_needs_info(uuid, uuid, text) is
  'Internal application needs-info review action. Updates application review status and writes event/audit rows without external side effects.';

comment on function public.core_add_application_review_note(uuid, uuid, text) is
  'Internal application review note action. Updates application decision notes and writes event/audit rows without external side effects.';
