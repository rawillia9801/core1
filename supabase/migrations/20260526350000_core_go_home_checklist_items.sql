-- Cherolee Core go-home checklist item workflow foundation.
--
-- Business rule:
--   * Checklist items are internal Core records tied to a reservation go-home detail.
--   * Saving checklist items does not send customer messages, generate documents,
--     clear balances, charge payments, contact transport, or touch external systems.
--   * Financial balance remains ledger-derived; checklist status is operational only.

create table if not exists public.core_go_home_checklist_items (
  id uuid primary key default gen_random_uuid(),
  go_home_detail_id uuid references public.core_go_home_details(id) on delete cascade,
  reservation_id uuid references public.core_reservations(id) on delete cascade,
  item_key text not null,
  label text not null,
  status text not null default 'not_started',
  notes text,
  completed_at timestamptz,
  completed_by_profile_id uuid references public.core_profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint core_go_home_checklist_items_status_check check (
    status in ('not_started', 'in_progress', 'needs_review', 'complete', 'not_applicable')
  ),
  constraint core_go_home_checklist_items_key_check check (nullif(btrim(item_key), '') is not null),
  constraint core_go_home_checklist_items_label_check check (nullif(btrim(label), '') is not null)
);

comment on table public.core_go_home_checklist_items is
  'Internal operational checklist items for reservation go-home readiness. No external side effects are authorized by these records.';
comment on column public.core_go_home_checklist_items.status is
  'Operational item status only. Does not imply legal, financial, medical, or customer-facing completion.';

create trigger core_go_home_checklist_items_set_updated_at before update on public.core_go_home_checklist_items
for each row execute function public.core_set_updated_at();

create index if not exists core_go_home_checklist_items_detail_id_idx
  on public.core_go_home_checklist_items (go_home_detail_id);

create index if not exists core_go_home_checklist_items_reservation_id_idx
  on public.core_go_home_checklist_items (reservation_id);

create unique index if not exists core_go_home_checklist_items_detail_key_uidx
  on public.core_go_home_checklist_items (go_home_detail_id, item_key)
  where go_home_detail_id is not null;

create or replace function public.core_upsert_go_home_checklist_item(
  p_reservation_id uuid,
  p_actor_profile_id uuid,
  p_item_key text,
  p_label text,
  p_status text,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation public.core_reservations%rowtype;
  v_detail_id uuid;
  v_item_id uuid;
  v_item_key text := lower(nullif(btrim(coalesce(p_item_key, '')), ''));
  v_label text := nullif(btrim(coalesce(p_label, '')), '');
  v_status text := lower(nullif(btrim(coalesce(p_status, '')), ''));
  v_notes text := nullif(btrim(coalesce(p_notes, '')), '');
  v_existing public.core_go_home_checklist_items%rowtype;
  v_new_data jsonb;
begin
  if p_actor_profile_id is null then
    raise exception 'actor profile is required';
  end if;

  if v_item_key is null then
    raise exception 'checklist item key is required';
  end if;

  if v_label is null then
    raise exception 'checklist item label is required';
  end if;

  if v_status is null or v_status not in ('not_started', 'in_progress', 'needs_review', 'complete', 'not_applicable') then
    raise exception 'invalid checklist item status';
  end if;

  select * into v_reservation
  from public.core_reservations
  where id = p_reservation_id;

  if not found then
    raise exception 'reservation not found';
  end if;

  if lower(coalesce(v_reservation.status, '')) in ('cancelled', 'void', 'released') then
    raise exception 'reservation is not eligible for go-home checklist updates';
  end if;

  select id into v_detail_id
  from public.core_go_home_details
  where reservation_id = p_reservation_id
  limit 1;

  if v_detail_id is null then
    insert into public.core_go_home_details (
      reservation_id,
      status,
      checklist_status,
      metadata
    ) values (
      p_reservation_id,
      'pending',
      'in_progress',
      jsonb_build_object(
        'created_by_tool', 'core_upsert_go_home_checklist_item',
        'created_by_profile_id', p_actor_profile_id,
        'external_side_effects', false
      )
    )
    returning id into v_detail_id;
  end if;

  select * into v_existing
  from public.core_go_home_checklist_items
  where go_home_detail_id = v_detail_id
    and item_key = v_item_key;

  if found then
    update public.core_go_home_checklist_items
    set
      reservation_id = p_reservation_id,
      label = v_label,
      status = v_status,
      notes = v_notes,
      completed_at = case when v_status = 'complete' then coalesce(completed_at, now()) else null end,
      completed_by_profile_id = case when v_status = 'complete' then coalesce(completed_by_profile_id, p_actor_profile_id) else null end,
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'last_updated_by_tool', 'core_upsert_go_home_checklist_item',
        'last_updated_by_profile_id', p_actor_profile_id,
        'external_side_effects', false
      )
    where id = v_existing.id
    returning id into v_item_id;
  else
    insert into public.core_go_home_checklist_items (
      go_home_detail_id,
      reservation_id,
      item_key,
      label,
      status,
      notes,
      completed_at,
      completed_by_profile_id,
      metadata
    ) values (
      v_detail_id,
      p_reservation_id,
      v_item_key,
      v_label,
      v_status,
      v_notes,
      case when v_status = 'complete' then now() else null end,
      case when v_status = 'complete' then p_actor_profile_id else null end,
      jsonb_build_object(
        'created_by_tool', 'core_upsert_go_home_checklist_item',
        'created_by_profile_id', p_actor_profile_id,
        'external_side_effects', false
      )
    )
    returning id into v_item_id;
  end if;

  update public.core_go_home_details d
  set checklist_status = case
    when exists (
      select 1
      from public.core_go_home_checklist_items i
      where i.go_home_detail_id = v_detail_id
        and i.status in ('not_started', 'in_progress', 'needs_review')
    ) then 'in_progress'
    when exists (
      select 1
      from public.core_go_home_checklist_items i
      where i.go_home_detail_id = v_detail_id
        and i.status = 'complete'
    ) then 'complete'
    else d.checklist_status
  end
  where d.id = v_detail_id;

  select to_jsonb(i) into v_new_data
  from public.core_go_home_checklist_items i
  where i.id = v_item_id;

  insert into public.core_events (
    event_type,
    summary,
    family_id,
    buyer_id,
    puppy_id,
    reservation_id,
    related_table,
    related_id,
    source,
    details,
    created_by_profile_id
  ) values (
    'go_home_checklist_item_updated',
    'Go-home checklist item updated through controlled staff workflow',
    v_reservation.family_id,
    v_reservation.buyer_id,
    v_reservation.puppy_id,
    v_reservation.id,
    'core_go_home_checklist_items',
    v_item_id,
    'core_upsert_go_home_checklist_item',
    jsonb_build_object(
      'item_key', v_item_key,
      'label', v_label,
      'status', v_status,
      'external_side_effects', false
    ),
    p_actor_profile_id
  );

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
    p_actor_profile_id::text,
    'core_upsert_go_home_checklist_item',
    'upsert_go_home_checklist_item',
    'core_go_home_checklist_items',
    v_item_id,
    case when v_existing.id is null then null else to_jsonb(v_existing) end,
    v_new_data,
    jsonb_build_object(
      'reservation_id', p_reservation_id,
      'go_home_detail_id', v_detail_id,
      'item_key', v_item_key,
      'external_side_effects', false
    ),
    'success'
  );

  return v_item_id;
end;
$$;

comment on function public.core_upsert_go_home_checklist_item(uuid, uuid, text, text, text, text) is
  'Controlled internal go-home checklist item upsert. Creates a go-home detail when needed and performs no external side effects.';
