-- Cherolee Core go-home checklist item smoke test.
--
-- TEST DATA ONLY: these records are fictional and are rolled back at the end.
-- Run only against a local/development database after all Core V1 migrations.

\set ON_ERROR_STOP on

begin;

insert into public.core_profiles (
  id, display_name, email, role, status, metadata
) values (
  '75000000-0000-0000-0000-000000000001',
  'Go Home Checklist Test Owner',
  'go.home.checklist.owner@example.invalid',
  'owner',
  'active',
  '{"test_only": true}'::jsonb
);

insert into public.core_families (
  id, name, status, metadata
) values (
  '75000000-0000-0000-0000-000000000010',
  'Go Home Checklist Test Family',
  'active',
  '{"test_only": true}'::jsonb
);

insert into public.core_buyers (
  id, first_name, last_name, email, email_normalized, approval_status, source, metadata
) values (
  '75000000-0000-0000-0000-000000000020',
  'Checklist',
  'Buyer',
  'go.home.checklist.buyer@example.invalid',
  'go.home.checklist.buyer@example.invalid',
  'approved_for_test',
  'core_go_home_checklist_items_test',
  '{"test_only": true}'::jsonb
);

insert into public.core_puppies (
  id, name, sex, status, public_listing_status, metadata
) values (
  '75000000-0000-0000-0000-000000000030',
  'Checklist Puppy',
  'female',
  'reserved_for_test',
  'private',
  '{"test_only": true}'::jsonb
);

insert into public.core_applications (
  id, family_id, buyer_id, external_reference, status, submitted_at, source, metadata
) values (
  '75000000-0000-0000-0000-000000000040',
  '75000000-0000-0000-0000-000000000010',
  '75000000-0000-0000-0000-000000000020',
  'TEST-GO-HOME-CHECKLIST-APPLICATION-001',
  'approved_for_test',
  now(),
  'core_go_home_checklist_items_test',
  '{"test_only": true}'::jsonb
);

insert into public.core_reservations (
  id, external_reference, buyer_id, family_id, puppy_id, application_id, status,
  sale_type, reserved_at, contract_total_cents, deposit_required_cents, currency,
  portal_access_status, notes, metadata
) values (
  '75000000-0000-0000-0000-000000000050',
  'TEST-GO-HOME-CHECKLIST-RESERVATION-001',
  '75000000-0000-0000-0000-000000000020',
  '75000000-0000-0000-0000-000000000010',
  '75000000-0000-0000-0000-000000000030',
  '75000000-0000-0000-0000-000000000040',
  'reserved',
  'test_adoption',
  now(),
  220000,
  50000,
  'USD',
  'test_only',
  'TEST ONLY reservation for go-home checklist.',
  '{"test_only": true}'::jsonb
);

select public.core_upsert_go_home_checklist_item(
  '75000000-0000-0000-0000-000000000050',
  '75000000-0000-0000-0000-000000000001',
  'food_sample',
  'Pack food sample',
  'in_progress',
  'TEST ONLY food sample note.'
) as checklist_item_id;

do $$
declare
  v_detail_id uuid;
begin
  select id into v_detail_id
  from public.core_go_home_details
  where reservation_id = '75000000-0000-0000-0000-000000000050';

  if v_detail_id is null then
    raise exception 'Expected checklist item RPC to create a go-home detail when one does not exist.';
  end if;

  if not exists (
    select 1
    from public.core_go_home_checklist_items
    where reservation_id = '75000000-0000-0000-0000-000000000050'
      and go_home_detail_id = v_detail_id
      and item_key = 'food_sample'
      and label = 'Pack food sample'
      and status = 'in_progress'
      and notes = 'TEST ONLY food sample note.'
      and completed_at is null
      and completed_by_profile_id is null
      and metadata ->> 'external_side_effects' = 'false'
  ) then
    raise exception 'Expected checklist item to be created with in-progress status and no external side effects.';
  end if;

  if not exists (
    select 1
    from public.core_go_home_details
    where id = v_detail_id
      and checklist_status = 'in_progress'
  ) then
    raise exception 'Expected parent go-home detail checklist_status to become in_progress.';
  end if;

  if not exists (
    select 1
    from public.core_events
    where event_type = 'go_home_checklist_item_updated'
      and reservation_id = '75000000-0000-0000-0000-000000000050'
      and related_table = 'core_go_home_checklist_items'
      and created_by_profile_id = '75000000-0000-0000-0000-000000000001'
      and details ->> 'item_key' = 'food_sample'
      and details ->> 'external_side_effects' = 'false'
  ) then
    raise exception 'Expected go-home checklist event with no external side effects.';
  end if;

  if not exists (
    select 1
    from public.core_audit_log
    where action = 'upsert_go_home_checklist_item'
      and entity_table = 'core_go_home_checklist_items'
      and actor_profile_id = '75000000-0000-0000-0000-000000000001'
      and request_context ->> 'item_key' = 'food_sample'
      and request_context ->> 'external_side_effects' = 'false'
  ) then
    raise exception 'Expected audit log for controlled go-home checklist item update.';
  end if;
end;
$$;

select public.core_upsert_go_home_checklist_item(
  '75000000-0000-0000-0000-000000000050',
  '75000000-0000-0000-0000-000000000001',
  'food_sample',
  'Pack food sample',
  'complete',
  'TEST ONLY packed and labeled.'
) as updated_checklist_item_id;

do $$
declare
  v_detail_id uuid;
begin
  select id into v_detail_id
  from public.core_go_home_details
  where reservation_id = '75000000-0000-0000-0000-000000000050';

  if (select count(*) from public.core_go_home_checklist_items where go_home_detail_id = v_detail_id and item_key = 'food_sample') <> 1 then
    raise exception 'Expected checklist item upsert to preserve one item per detail/key.';
  end if;

  if not exists (
    select 1
    from public.core_go_home_checklist_items
    where go_home_detail_id = v_detail_id
      and item_key = 'food_sample'
      and status = 'complete'
      and notes = 'TEST ONLY packed and labeled.'
      and completed_at is not null
      and completed_by_profile_id = '75000000-0000-0000-0000-000000000001'
  ) then
    raise exception 'Expected checklist item to update to complete with completion metadata.';
  end if;

  if not exists (
    select 1
    from public.core_go_home_details
    where id = v_detail_id
      and checklist_status = 'complete'
  ) then
    raise exception 'Expected parent go-home detail checklist_status to become complete when all items are complete.';
  end if;
end;
$$;

do $$
begin
  perform public.core_upsert_go_home_checklist_item(
    '75000000-0000-0000-0000-000000000050',
    '75000000-0000-0000-0000-000000000001',
    'food_sample',
    'Pack food sample',
    'bad_status',
    null
  );

  raise exception 'Expected invalid checklist status to be rejected.';
exception
  when others then
    if sqlerrm <> 'invalid checklist item status' then
      raise exception 'Expected invalid checklist item status, got: %', sqlerrm;
    end if;
end;
$$;

rollback;
