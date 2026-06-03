-- Cherolee Core first-wave RLS foundation tests.
--
-- TEST DATA ONLY: these records are fictional and are rolled back at the end.
-- Run only against a local/development database after all Core migrations.

\set ON_ERROR_STOP on

begin;

do $$
begin
  if public.core_current_profile_id() is not null then
    raise exception 'Expected no current profile without auth context.';
  end if;

  if public.core_current_profile_role() is not null then
    raise exception 'Expected no current profile role without auth context.';
  end if;

  if public.core_current_profile_is_owner_admin() is not false then
    raise exception 'Expected owner/admin helper to be false without auth context.';
  end if;

  if public.core_current_profile_is_staff_or_above() is not false then
    raise exception 'Expected staff-or-above helper to be false without auth context.';
  end if;
end
$$;

insert into public.core_profiles (
  id, auth_user_id, display_name, email, role, status, metadata
) values
(
  '53000000-0000-0000-0000-000000000001',
  '53000000-0000-0000-0000-000000000101',
  'RLS Test Owner',
  'rls.owner@example.invalid',
  'owner',
  'active',
  '{"test_only": true, "rls_test": true}'::jsonb
),
(
  '53000000-0000-0000-0000-000000000002',
  '53000000-0000-0000-0000-000000000102',
  'RLS Test Staff',
  'rls.staff@example.invalid',
  'staff',
  'active',
  '{"test_only": true, "rls_test": true}'::jsonb
),
(
  '53000000-0000-0000-0000-000000000003',
  '53000000-0000-0000-0000-000000000103',
  'RLS Test Inactive',
  'rls.inactive@example.invalid',
  'admin',
  'inactive',
  '{"test_only": true, "rls_test": true}'::jsonb
);

insert into public.core_families (
  id, name, status, notes, metadata
) values (
  '53000000-0000-0000-0000-000000000010',
  'RLS Test Family',
  'active',
  'TEST ONLY family for RLS validation.',
  '{"test_only": true, "rls_test": true}'::jsonb
);

insert into public.core_buyers (
  id, first_name, last_name, email, email_normalized, phone, phone_normalized,
  approval_status, source, notes, metadata
) values (
  '53000000-0000-0000-0000-000000000020',
  'RLS',
  'Buyer',
  'rls.buyer@example.invalid',
  'rls.buyer@example.invalid',
  '+12765555300',
  '+12765555300',
  'pending',
  'core_rls_foundation_test',
  'TEST ONLY buyer for RLS validation.',
  '{"test_only": true, "rls_test": true}'::jsonb
);

insert into public.core_family_members (
  id, family_id, buyer_id, relationship, is_primary_contact, portal_access_status, metadata
) values (
  '53000000-0000-0000-0000-000000000030',
  '53000000-0000-0000-0000-000000000010',
  '53000000-0000-0000-0000-000000000020',
  'test_primary_contact',
  true,
  'test_only',
  '{"test_only": true, "rls_test": true}'::jsonb
);

insert into public.core_applications (
  id, family_id, buyer_id, external_reference, status, submitted_at, source, metadata
) values (
  '53000000-0000-0000-0000-000000000040',
  '53000000-0000-0000-0000-000000000010',
  '53000000-0000-0000-0000-000000000020',
  'RLS-APPLICATION-TEST-001',
  'received',
  now(),
  'core_rls_foundation_test',
  '{"test_only": true, "rls_test": true}'::jsonb
);

insert into public.core_application_sections (
  id, application_id, section_key, section_label, status, responses
) values (
  '53000000-0000-0000-0000-000000000050',
  '53000000-0000-0000-0000-000000000040',
  'rls_test_section',
  'RLS Test Section',
  'received',
  '{"Housing": "Owner occupied"}'::jsonb
);

insert into public.core_reservations (
  id, external_reference, buyer_id, family_id, application_id, status,
  contract_total_cents, deposit_required_cents, currency, notes, metadata
) values (
  '53000000-0000-0000-0000-000000000060',
  'RLS-RESERVATION-TEST-001',
  '53000000-0000-0000-0000-000000000020',
  '53000000-0000-0000-0000-000000000010',
  '53000000-0000-0000-0000-000000000040',
  'pending',
  200000,
  50000,
  'USD',
  'TEST ONLY reservation for RLS validation.',
  '{"test_only": true, "rls_test": true}'::jsonb
);

insert into public.core_financial_ledger (
  id, reservation_id, buyer_id, external_reference, entry_type, status,
  amount_cents, currency, description, metadata, balance_effect
) values (
  '53000000-0000-0000-0000-000000000070',
  '53000000-0000-0000-0000-000000000060',
  '53000000-0000-0000-0000-000000000020',
  'RLS-LEDGER-TEST-001',
  'deposit',
  'posted',
  50000,
  'USD',
  'TEST ONLY ledger row for RLS validation.',
  '{"test_only": true, "rls_test": true}'::jsonb,
  'decrease'
);

insert into public.core_events (
  id, event_type, summary, family_id, buyer_id, application_id, reservation_id,
  related_table, related_id, source, details, created_by_profile_id
) values (
  '53000000-0000-0000-0000-000000000080',
  'rls_test_event',
  'TEST ONLY event for RLS validation.',
  '53000000-0000-0000-0000-000000000010',
  '53000000-0000-0000-0000-000000000020',
  '53000000-0000-0000-0000-000000000040',
  '53000000-0000-0000-0000-000000000060',
  'core_applications',
  '53000000-0000-0000-0000-000000000040',
  'core_rls_foundation_test',
  '{"test_only": true, "rls_test": true}'::jsonb,
  '53000000-0000-0000-0000-000000000001'
);

insert into public.core_audit_log (
  id, actor_type, actor_profile_id, actor_identifier, source, action,
  entity_table, entity_id, request_context, outcome
) values (
  '53000000-0000-0000-0000-000000000090',
  'staff_profile',
  '53000000-0000-0000-0000-000000000001',
  'RLS Test Owner',
  'core_rls_foundation_test',
  'rls_test_action',
  'core_applications',
  '53000000-0000-0000-0000-000000000040',
  '{"test_only": true, "rls_test": true}'::jsonb,
  'success'
);

insert into public.core_proposed_actions (
  id, action_type, title, summary, risk_level, status, proposed_by_profile_id,
  source, target_table, target_id, proposed_change, metadata
) values (
  '53000000-0000-0000-0000-0000000000a0',
  'rls_test_action',
  'RLS Test Proposed Action',
  'TEST ONLY proposed action for RLS validation.',
  'low',
  'needs_review',
  '53000000-0000-0000-0000-000000000001',
  'core_rls_foundation_test',
  'core_applications',
  '53000000-0000-0000-0000-000000000040',
  '{"external_side_effects": false}'::jsonb,
  '{"test_only": true, "rls_test": true}'::jsonb
);

-- Owner/admin internal profile can identify itself and read first-wave rows,
-- including sensitive owner/admin-only surfaces.
set local role authenticated;
select set_config('request.jwt.claim.sub', '53000000-0000-0000-0000-000000000101', true);

do $$
begin
  if public.core_current_profile_id() <> '53000000-0000-0000-0000-000000000001'::uuid then
    raise exception 'Expected owner helper to return owner profile id.';
  end if;

  if public.core_current_profile_role() <> 'owner' then
    raise exception 'Expected owner helper to return owner role.';
  end if;

  if public.core_current_profile_is_owner_admin() is not true then
    raise exception 'Expected owner/admin helper true for owner.';
  end if;

  if (select count(*) from public.core_profiles where id in (
    '53000000-0000-0000-0000-000000000001',
    '53000000-0000-0000-0000-000000000002',
    '53000000-0000-0000-0000-000000000003'
  )) <> 3 then
    raise exception 'Expected owner to read all test profiles.';
  end if;

  if (select count(*) from public.core_applications where id = '53000000-0000-0000-0000-000000000040') <> 1 then
    raise exception 'Expected owner to read test application.';
  end if;

  if (select count(*) from public.core_application_sections where id = '53000000-0000-0000-0000-000000000050') <> 1 then
    raise exception 'Expected owner to read application section.';
  end if;

  if (select count(*) from public.core_financial_ledger where id = '53000000-0000-0000-0000-000000000070') <> 1 then
    raise exception 'Expected owner to read sensitive ledger row.';
  end if;

  if (select count(*) from public.core_events where id = '53000000-0000-0000-0000-000000000080') <> 1 then
    raise exception 'Expected owner to read event row.';
  end if;

  if (select count(*) from public.core_audit_log where id = '53000000-0000-0000-0000-000000000090') <> 1 then
    raise exception 'Expected owner to read audit row.';
  end if;

  if (select count(*) from public.core_proposed_actions where id = '53000000-0000-0000-0000-0000000000a0') <> 1 then
    raise exception 'Expected owner to read proposed action row.';
  end if;

  begin
    insert into public.core_applications (external_reference, status)
    values ('RLS-DIRECT-WRITE-SHOULD-FAIL', 'received');
    raise exception 'Expected direct authenticated insert to be blocked.';
  exception
    when insufficient_privilege then
      null;
  end;

  begin
    update public.core_applications
    set status = 'needs_review'
    where id = '53000000-0000-0000-0000-000000000040';
    raise exception 'Expected direct authenticated update to be blocked.';
  exception
    when insufficient_privilege then
      null;
  end;

  begin
    delete from public.core_applications
    where id = '53000000-0000-0000-0000-000000000040';
    raise exception 'Expected direct authenticated delete to be blocked.';
  exception
    when insufficient_privilege then
      null;
  end;
end
$$;

reset role;

-- Staff can identify itself and read operational records, but not owner/admin
-- sensitive ledger, events, audit, or proposed-action rows.
set local role authenticated;
select set_config('request.jwt.claim.sub', '53000000-0000-0000-0000-000000000102', true);

do $$
begin
  if public.core_current_profile_id() <> '53000000-0000-0000-0000-000000000002'::uuid then
    raise exception 'Expected staff helper to return staff profile id.';
  end if;

  if public.core_current_profile_role() <> 'staff' then
    raise exception 'Expected staff helper to return staff role.';
  end if;

  if public.core_current_profile_is_staff_or_above() is not true then
    raise exception 'Expected staff-or-above helper true for staff.';
  end if;

  if public.core_current_profile_is_owner_admin() is not false then
    raise exception 'Expected owner/admin helper false for staff.';
  end if;

  if (select count(*) from public.core_profiles where id in (
    '53000000-0000-0000-0000-000000000001',
    '53000000-0000-0000-0000-000000000002',
    '53000000-0000-0000-0000-000000000003'
  )) <> 1 then
    raise exception 'Expected staff to read only its own active profile.';
  end if;

  if (select count(*) from public.core_buyers where id = '53000000-0000-0000-0000-000000000020') <> 1 then
    raise exception 'Expected staff to read operational buyer row.';
  end if;

  if (select count(*) from public.core_families where id = '53000000-0000-0000-0000-000000000010') <> 1 then
    raise exception 'Expected staff to read operational family row.';
  end if;

  if (select count(*) from public.core_reservations where id = '53000000-0000-0000-0000-000000000060') <> 1 then
    raise exception 'Expected staff to read operational reservation row.';
  end if;

  if (select count(*) from public.core_financial_ledger where id = '53000000-0000-0000-0000-000000000070') <> 0 then
    raise exception 'Expected staff to be denied sensitive ledger rows.';
  end if;

  if (select count(*) from public.core_events where id = '53000000-0000-0000-0000-000000000080') <> 0 then
    raise exception 'Expected staff to be denied general event rows.';
  end if;

  if (select count(*) from public.core_audit_log where id = '53000000-0000-0000-0000-000000000090') <> 0 then
    raise exception 'Expected staff to be denied audit rows.';
  end if;

  if (select count(*) from public.core_proposed_actions where id = '53000000-0000-0000-0000-0000000000a0') <> 0 then
    raise exception 'Expected staff to be denied proposed action rows.';
  end if;
end
$$;

reset role;

-- Inactive or unmapped auth contexts return null/false and cannot read rows.
set local role authenticated;
select set_config('request.jwt.claim.sub', '53000000-0000-0000-0000-000000000103', true);

do $$
begin
  if public.core_current_profile_id() is not null then
    raise exception 'Expected inactive mapped profile to be ignored.';
  end if;

  if public.core_current_profile_is_staff_or_above() is not false then
    raise exception 'Expected inactive mapped profile to be denied.';
  end if;

  if (select count(*) from public.core_applications where id = '53000000-0000-0000-0000-000000000040') <> 0 then
    raise exception 'Expected inactive mapped profile to read no application rows.';
  end if;
end
$$;

reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '53000000-0000-0000-0000-000000000199', true);

do $$
begin
  if public.core_current_profile_id() is not null then
    raise exception 'Expected unmapped auth context to have no current profile.';
  end if;

  if (select count(*) from public.core_buyers where id = '53000000-0000-0000-0000-000000000020') <> 0 then
    raise exception 'Expected unmapped auth context to read no buyer rows.';
  end if;
end
$$;

reset role;

select
  'core_rls_foundation' as validated_area,
  (select relrowsecurity from pg_class where oid = 'public.core_applications'::regclass) as applications_rls_enabled,
  (select relrowsecurity from pg_class where oid = 'public.core_audit_log'::regclass) as audit_rls_enabled,
  (select count(*) from pg_policies where schemaname = 'public' and tablename in (
    'core_profiles',
    'core_families',
    'core_buyers',
    'core_family_members',
    'core_applications',
    'core_application_sections',
    'core_reservations',
    'core_financial_ledger',
    'core_events',
    'core_audit_log',
    'core_proposed_actions'
  )) as policy_count;

rollback;
