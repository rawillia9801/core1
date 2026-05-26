-- Cherolee Core V1 database smoke tests.
--
-- TEST DATA ONLY: these records are fictional and are rolled back at the end.
-- Run only against a local/development database after the Core V1 baseline migration.
-- This script must not be used as a production seed or production import mechanism.

\set ON_ERROR_STOP on

begin;

-- Fixed UUIDs make the test readable and keep every relationship explicit.
insert into public.core_profiles (
  id, display_name, email, phone, phone_normalized, role, status, metadata
) values
  ('10000000-0000-0000-0000-000000000001', 'Test Admin', 'admin.test@example.invalid', '+12765550100', '+12765550100', 'admin', 'active', '{"test_only": true}'::jsonb),
  ('10000000-0000-0000-0000-000000000002', 'Sarah Test Buyer', 'sarah.test.buyer@example.invalid', '+12765550101', '+12765550101', 'buyer', 'active', '{"test_only": true}'::jsonb);

insert into public.core_families (
  id, name, status, notes, metadata
) values (
  '10000000-0000-0000-0000-000000000010',
  'Sarah Test Buyer Family',
  'active',
  'TEST ONLY family record for Core V1 smoke validation.',
  '{"test_only": true}'::jsonb
);

insert into public.core_buyers (
  id, first_name, last_name, preferred_name, email, email_normalized,
  phone, phone_normalized, approval_status, source, notes, metadata
) values (
  '10000000-0000-0000-0000-000000000020',
  'Sarah',
  'Test Buyer',
  'Sarah',
  'sarah.test.buyer@example.invalid',
  'sarah.test.buyer@example.invalid',
  '+12765550101',
  '+12765550101',
  'approved_for_test',
  'core_v1_smoke_test',
  'TEST ONLY buyer record for Core V1 smoke validation.',
  '{"test_only": true}'::jsonb
);

insert into public.core_family_members (
  id, family_id, buyer_id, profile_id, relationship, is_primary_contact, portal_access_status, metadata
) values (
  '10000000-0000-0000-0000-000000000030',
  '10000000-0000-0000-0000-000000000010',
  '10000000-0000-0000-0000-000000000020',
  '10000000-0000-0000-0000-000000000002',
  'primary_buyer',
  true,
  'test_only',
  '{"test_only": true}'::jsonb
);

insert into public.core_applications (
  id, family_id, buyer_id, external_reference, status, submitted_at, source, metadata
) values (
  '10000000-0000-0000-0000-000000000040',
  '10000000-0000-0000-0000-000000000010',
  '10000000-0000-0000-0000-000000000020',
  'TEST-APPLICATION-001',
  'approved_for_test',
  now(),
  'core_v1_smoke_test',
  '{"test_only": true}'::jsonb
);

insert into public.core_dogs (
  id, call_name, sex, color, status, notes, metadata
) values
  ('10000000-0000-0000-0000-000000000050', 'Ember Test Dam', 'female', 'cream', 'active', 'TEST ONLY dam.', '{"test_only": true}'::jsonb),
  ('10000000-0000-0000-0000-000000000051', 'Rambo Test Sire', 'male', 'chocolate', 'active', 'TEST ONLY sire.', '{"test_only": true}'::jsonb);

insert into public.core_litters (
  id, litter_name, dam_id, sire_id, birth_at, total_puppies, female_count, male_count,
  status, details_pending, notes, metadata
) values (
  '10000000-0000-0000-0000-000000000060',
  'Ember and Rambo Test Litter',
  '10000000-0000-0000-0000-000000000050',
  '10000000-0000-0000-0000-000000000051',
  now() - interval '8 weeks',
  2,
  2,
  0,
  'available_for_test',
  false,
  'TEST ONLY litter record.',
  '{"test_only": true}'::jsonb
);

insert into public.core_puppies (
  id, litter_id, name, collar_color, sex, color, coat_type, birth_at,
  status, health_status, public_listing_status, notes, metadata
) values
  (
    '10000000-0000-0000-0000-000000000070',
    '10000000-0000-0000-0000-000000000060',
    'Luna Test Puppy',
    'Purple',
    'female',
    'cream',
    'long',
    now() - interval '8 weeks',
    'reserved_for_test',
    'test_only',
    'private',
    'TEST ONLY puppy record.',
    '{"test_only": true}'::jsonb
  ),
  (
    '10000000-0000-0000-0000-000000000071',
    '10000000-0000-0000-0000-000000000060',
    'Nova Test Puppy',
    'Pink',
    'female',
    'cream',
    'smooth',
    now() - interval '8 weeks',
    'reserved_for_test',
    'test_only',
    'private',
    'TEST ONLY second puppy record.',
    '{"test_only": true}'::jsonb
  );

insert into public.core_reservations (
  id, external_reference, buyer_id, family_id, puppy_id, application_id, status,
  sale_type, reserved_at, contract_total_cents, deposit_required_cents, currency,
  portal_access_status, notes, metadata, created_at
) values
  (
    '10000000-0000-0000-0000-000000000080',
    'TEST-RESERVATION-001',
    '10000000-0000-0000-0000-000000000020',
    '10000000-0000-0000-0000-000000000010',
    '10000000-0000-0000-0000-000000000070',
    '10000000-0000-0000-0000-000000000040',
    'reserved_for_test',
    'test_adoption',
    now(),
    200000,
    50000,
    'USD',
    'test_only',
    'TEST ONLY Luna reservation record.',
    '{"test_only": true}'::jsonb,
    now()
  ),
  (
    '10000000-0000-0000-0000-000000000081',
    'TEST-RESERVATION-002',
    '10000000-0000-0000-0000-000000000020',
    '10000000-0000-0000-0000-000000000010',
    '10000000-0000-0000-0000-000000000071',
    '10000000-0000-0000-0000-000000000040',
    'reserved_for_test',
    'test_adoption',
    now(),
    null,
    null,
    'USD',
    'test_only',
    'TEST ONLY Nova reservation record with pending contract amounts.',
    '{"test_only": true}'::jsonb,
    now() - interval '1 minute'
  );

insert into public.core_go_home_groups (
  id, family_id, buyer_id, pickup_delivery_type, scheduled_at, window_start,
  window_end, address_line_1, city, state, postal_code, contact_phone, status, notes
) values (
  '10000000-0000-0000-0000-000000000082',
  '10000000-0000-0000-0000-000000000010',
  '10000000-0000-0000-0000-000000000020',
  'pickup',
  now(),
  now(),
  now() + interval '1 hour',
  '100 Test Lane',
  'Testville',
  'VA',
  '00000',
  '+12765550101',
  'scheduled_for_test',
  'TEST ONLY shared pickup group for two puppies.'
);

insert into public.core_go_home_details (
  id, reservation_id, go_home_group_id, status,
  individual_notes, checklist_status, balance_cleared_status, metadata
) values
  (
    '10000000-0000-0000-0000-000000000083',
    '10000000-0000-0000-0000-000000000080',
    '10000000-0000-0000-0000-000000000082',
    'scheduled_for_test',
    'TEST ONLY Luna individual go-home detail.',
    'pending_for_test',
    'pending_financial_review_for_test',
    '{"test_only": true}'::jsonb
  ),
  (
    '10000000-0000-0000-0000-000000000084',
    '10000000-0000-0000-0000-000000000081',
    '10000000-0000-0000-0000-000000000082',
    'scheduled_for_test',
    'TEST ONLY Nova individual go-home detail.',
    'pending_for_test',
    'pending_financial_review_for_test',
    '{"test_only": true}'::jsonb
  );

do $$
declare
  invalid_default_override_rejected boolean := false;
  missing_override_reason_rejected boolean := false;
  group_default_count integer;
begin
  select count(*)::integer into group_default_count
  from public.core_go_home_details
  where go_home_group_id = '10000000-0000-0000-0000-000000000082'
    and has_individual_override = false
    and override_reason is null
    and individual_scheduled_at is null
    and individual_location_notes is null
    and method is null
    and planned_at is null
    and location is null;

  if group_default_count <> 2 then
    raise exception 'Expected two grouped details using shared appointment defaults, got %.', group_default_count;
  end if;

  begin
    insert into public.core_go_home_details (
      go_home_group_id, status, has_individual_override, individual_scheduled_at, metadata
    ) values (
      '10000000-0000-0000-0000-000000000082',
      'invalid_override_for_test',
      false,
      now() + interval '1 hour',
      '{"test_only": true}'::jsonb
    );
  exception when check_violation then
    invalid_default_override_rejected := true;
  end;

  begin
    insert into public.core_go_home_details (
      go_home_group_id, status, has_individual_override, individual_location_notes, metadata
    ) values (
      '10000000-0000-0000-0000-000000000082',
      'invalid_override_for_test',
      true,
      'TEST ONLY different location without reason.',
      '{"test_only": true}'::jsonb
    );
  exception when check_violation then
    missing_override_reason_rejected := true;
  end;

  if not invalid_default_override_rejected then
    raise exception 'Expected grouped override data without an override marker to be rejected.';
  end if;

  if not missing_override_reason_rejected then
    raise exception 'Expected grouped override without a reason to be rejected.';
  end if;
end
$$;

update public.core_go_home_details
set
  has_individual_override = true,
  override_reason = 'TEST ONLY Nova requires a later individual pickup window.',
  individual_scheduled_at = now() + interval '2 hours',
  individual_window_start = now() + interval '2 hours',
  individual_window_end = now() + interval '3 hours',
  individual_location_notes = 'TEST ONLY pickup desk exception for Nova.'
where id = '10000000-0000-0000-0000-000000000084';

insert into public.core_financial_ledger (
  id, reservation_id, buyer_id, external_reference, entry_type, balance_effect, status, amount_cents,
  currency, occurred_at, payment_method, description, metadata
) values
  (
    '10000000-0000-0000-0000-000000000090',
    '10000000-0000-0000-0000-000000000080',
    '10000000-0000-0000-0000-000000000020',
    'TEST-LEDGER-DEPOSIT-001',
    'deposit',
    'decrease',
    'posted',
    50000,
    'USD',
    now(),
    'test_only',
    'TEST ONLY posted deposit.',
    '{"test_only": true}'::jsonb
  ),
  (
    '10000000-0000-0000-0000-000000000091',
    '10000000-0000-0000-0000-000000000080',
    '10000000-0000-0000-0000-000000000020',
    'TEST-LEDGER-PAYMENT-001',
    'payment',
    'decrease',
    'posted',
    25000,
    'USD',
    now(),
    'test_only',
    'TEST ONLY posted payment.',
    '{"test_only": true}'::jsonb
  ),
  (
    '10000000-0000-0000-0000-000000000092',
    '10000000-0000-0000-0000-000000000080',
    '10000000-0000-0000-0000-000000000020',
    'TEST-LEDGER-CREDIT-001',
    'credit',
    'decrease',
    'posted',
    10000,
    'USD',
    now(),
    'test_only',
    'TEST ONLY posted credit.',
    '{"test_only": true}'::jsonb
  ),
  (
    '10000000-0000-0000-0000-000000000093',
    '10000000-0000-0000-0000-000000000080',
    '10000000-0000-0000-0000-000000000020',
    'TEST-LEDGER-FEE-001',
    'fee',
    'increase',
    'posted',
    5000,
    'USD',
    now(),
    'test_only',
    'TEST ONLY posted fee.',
    '{"test_only": true}'::jsonb
  ),
  (
    '10000000-0000-0000-0000-000000000094',
    '10000000-0000-0000-0000-000000000080',
    '10000000-0000-0000-0000-000000000020',
    'TEST-LEDGER-ADMIN-FEE-001',
    'admin_fee',
    'increase',
    'posted',
    2500,
    'USD',
    now(),
    'test_only',
    'TEST ONLY posted admin fee.',
    '{"test_only": true}'::jsonb
  ),
  (
    '10000000-0000-0000-0000-000000000095',
    '10000000-0000-0000-0000-000000000080',
    '10000000-0000-0000-0000-000000000020',
    'TEST-LEDGER-TRANSPORT-FEE-001',
    'transport_fee',
    'increase',
    'posted',
    7500,
    'USD',
    now(),
    'test_only',
    'TEST ONLY posted transport fee.',
    '{"test_only": true}'::jsonb
  ),
  (
    '10000000-0000-0000-0000-000000000096',
    '10000000-0000-0000-0000-000000000080',
    '10000000-0000-0000-0000-000000000020',
    'TEST-LEDGER-FINANCE-CHARGE-001',
    'finance_charge',
    'increase',
    'posted',
    3000,
    'USD',
    now(),
    'test_only',
    'TEST ONLY posted finance charge.',
    '{"test_only": true}'::jsonb
  ),
  (
    '10000000-0000-0000-0000-000000000097',
    '10000000-0000-0000-0000-000000000080',
    '10000000-0000-0000-0000-000000000020',
    'TEST-LEDGER-REFUND-001',
    'refund',
    'increase',
    'posted',
    12000,
    'USD',
    now(),
    'test_only',
    'TEST ONLY posted refund.',
    '{"test_only": true}'::jsonb
  ),
  (
    '10000000-0000-0000-0000-000000000098',
    '10000000-0000-0000-0000-000000000080',
    '10000000-0000-0000-0000-000000000020',
    'TEST-LEDGER-CHARGEBACK-001',
    'chargeback',
    'increase',
    'posted',
    8000,
    'USD',
    now(),
    'test_only',
    'TEST ONLY posted chargeback.',
    '{"test_only": true}'::jsonb
  ),
  (
    '10000000-0000-0000-0000-000000000099',
    '10000000-0000-0000-0000-000000000080',
    '10000000-0000-0000-0000-000000000020',
    'TEST-LEDGER-ADJUSTMENT-NEUTRAL-001',
    'adjustment',
    'neutral',
    'posted',
    9999,
    'USD',
    now(),
    'test_only',
    'TEST ONLY neutral adjustment.',
    '{"test_only": true}'::jsonb
  );

insert into public.core_phone_calls (
  id, buyer_id, external_reference, direction, status, from_phone, from_phone_normalized,
  to_phone, to_phone_normalized, started_at, notes, metadata
) values (
  '10000000-0000-0000-0000-000000000100',
  '10000000-0000-0000-0000-000000000020',
  'TEST-CALL-001',
  'inbound',
  'completed_for_test',
  '+12765550101',
  '+12765550101',
  '+12765550999',
  '+12765550999',
  now(),
  'TEST ONLY phone call.',
  '{"test_only": true}'::jsonb
);

insert into public.core_events (
  id, event_type, event_at, summary, family_id, buyer_id, puppy_id, reservation_id,
  source, details, created_by_profile_id
) values (
  '10000000-0000-0000-0000-000000000110',
  'test_note',
  now(),
  'TEST ONLY operational event for Luna Test Puppy.',
  '10000000-0000-0000-0000-000000000010',
  '10000000-0000-0000-0000-000000000020',
  '10000000-0000-0000-0000-000000000070',
  '10000000-0000-0000-0000-000000000080',
  'core_v1_smoke_test',
  '{"test_only": true}'::jsonb,
  '10000000-0000-0000-0000-000000000001'
);

insert into public.core_audit_log (
  id, actor_type, actor_profile_id, actor_identifier, source, action,
  entity_table, entity_id, new_data, request_context, outcome
) values (
  '10000000-0000-0000-0000-000000000120',
  'profile',
  '10000000-0000-0000-0000-000000000001',
  'Test Admin',
  'core_v1_smoke_test',
  'create_test_event',
  'core_events',
  '10000000-0000-0000-0000-000000000110',
  '{"test_only": true, "summary": "TEST ONLY operational event for Luna Test Puppy."}'::jsonb,
  '{"test_only": true}'::jsonb,
  'success'
);

insert into public.core_integration_events (
  id, source_system, direction, external_event_id, event_type, payload,
  status, attempts, received_at, metadata
) values (
  '10000000-0000-0000-0000-000000000130',
  'core_v1_smoke_provider',
  'inbound',
  'TEST-INTEGRATION-EVENT-001',
  'test.received',
  '{"test_only": true}'::jsonb,
  'received',
  0,
  now(),
  '{"test_only": true}'::jsonb
);

do $$
declare
  duplicate_detail_rejected boolean := false;
begin
  begin
    insert into public.core_go_home_details (
      reservation_id, go_home_group_id, status, individual_notes, metadata
    ) values (
      '10000000-0000-0000-0000-000000000080',
      '10000000-0000-0000-0000-000000000082',
      'duplicate_for_test',
      'TEST ONLY duplicate detail expected to fail.',
      '{"test_only": true}'::jsonb
    );
  exception when unique_violation then
    duplicate_detail_rejected := true;
  end;

  if not duplicate_detail_rejected then
    raise exception 'Expected second current go-home detail for one reservation to be rejected.';
  end if;
end
$$;

do $$
declare
  invalid_effect_rejected boolean := false;
  negative_amount_rejected boolean := false;
begin
  begin
    insert into public.core_financial_ledger (
      reservation_id, buyer_id, entry_type, balance_effect, status, amount_cents, currency, metadata
    ) values (
      '10000000-0000-0000-0000-000000000080',
      '10000000-0000-0000-0000-000000000020',
      'invalid_effect_test',
      'unknown',
      'posted',
      100,
      'USD',
      '{"test_only": true}'::jsonb
    );
  exception when check_violation then
    invalid_effect_rejected := true;
  end;

  begin
    insert into public.core_financial_ledger (
      reservation_id, buyer_id, entry_type, balance_effect, status, amount_cents, currency, metadata
    ) values (
      '10000000-0000-0000-0000-000000000080',
      '10000000-0000-0000-0000-000000000020',
      'negative_amount_test',
      'decrease',
      'posted',
      -100,
      'USD',
      '{"test_only": true}'::jsonb
    );
  exception when check_violation then
    negative_amount_rejected := true;
  end;

  if not invalid_effect_rejected then
    raise exception 'Expected an invalid ledger balance_effect to be rejected.';
  end if;

  if not negative_amount_rejected then
    raise exception 'Expected a negative post-correction ledger amount to be rejected.';
  end if;
end
$$;

do $$
declare
  duplicate_rejected boolean := false;
begin
  begin
    insert into public.core_integration_events (
      source_system, direction, external_event_id, event_type, payload, status, metadata
    ) values (
      'core_v1_smoke_provider',
      'inbound',
      'TEST-INTEGRATION-EVENT-001',
      'test.duplicate',
      '{"test_only": true}'::jsonb,
      'received',
      '{"test_only": true}'::jsonb
    );
  exception when unique_violation then
    duplicate_rejected := true;
  end;

  if not duplicate_rejected then
    raise exception 'Expected duplicate integration event to be rejected.';
  end if;
end
$$;

do $$
declare
  value_integer integer;
begin
  if not exists (
    select 1
    from public.core_family_members fm
    join public.core_families f on f.id = fm.family_id
    join public.core_buyers b on b.id = fm.buyer_id
    join public.core_profiles p on p.id = fm.profile_id
    where f.name = 'Sarah Test Buyer Family'
      and concat_ws(' ', b.first_name, b.last_name) = 'Sarah Test Buyer'
      and p.display_name = 'Sarah Test Buyer'
  ) then
    raise exception 'Family, buyer, and buyer profile relationship validation failed.';
  end if;

  if not exists (
    select 1
    from public.core_litters l
    join public.core_dogs dam on dam.id = l.dam_id
    join public.core_dogs sire on sire.id = l.sire_id
    where l.id = '10000000-0000-0000-0000-000000000060'
      and dam.call_name = 'Ember Test Dam'
      and sire.call_name = 'Rambo Test Sire'
  ) then
    raise exception 'Litter dam/sire relationship validation failed.';
  end if;

  if not exists (
    select 1
    from public.core_puppies p
    join public.core_litters l on l.id = p.litter_id
    where p.name = 'Luna Test Puppy' and l.litter_name = 'Ember and Rambo Test Litter'
  ) then
    raise exception 'Puppy/litter relationship validation failed.';
  end if;

  select count(*)::integer into value_integer
  from public.core_puppies p
  where p.litter_id = '10000000-0000-0000-0000-000000000060'
    and p.name in ('Luna Test Puppy', 'Nova Test Puppy');
  if value_integer <> 2 then
    raise exception 'Expected two test puppies in one litter, got %.', value_integer;
  end if;

  select count(*)::integer into value_integer
  from public.core_reservations r
  join public.core_buyers b on b.id = r.buyer_id
  join public.core_families f on f.id = r.family_id
  join public.core_puppies p on p.id = r.puppy_id
  join public.core_applications a on a.id = r.application_id
  where r.buyer_id = '10000000-0000-0000-0000-000000000020'
    and r.family_id = '10000000-0000-0000-0000-000000000010'
    and r.puppy_id in (
      '10000000-0000-0000-0000-000000000070',
      '10000000-0000-0000-0000-000000000071'
    );
  if value_integer <> 2 then
    raise exception 'Expected two reservation transactions for the test family, got %.', value_integer;
  end if;

  select count(*)::integer into value_integer
  from public.core_go_home_details d
  join public.core_go_home_groups g on g.id = d.go_home_group_id
  where d.go_home_group_id = '10000000-0000-0000-0000-000000000082'
    and d.reservation_id in (
      '10000000-0000-0000-0000-000000000080',
      '10000000-0000-0000-0000-000000000081'
    )
    and g.notes = 'TEST ONLY shared pickup group for two puppies.';
  if value_integer <> 2 then
    raise exception 'Expected two reservation go-home details in one shared group, got %.', value_integer;
  end if;

  if not exists (
    select 1
    from public.core_go_home_details
    where id = '10000000-0000-0000-0000-000000000084'
      and go_home_group_id = '10000000-0000-0000-0000-000000000082'
      and has_individual_override = true
      and nullif(btrim(override_reason), '') is not null
      and individual_scheduled_at is not null
      and individual_location_notes is not null
      and method is null
      and planned_at is null
      and location is null
  ) then
    raise exception 'Expected Nova test detail to contain a documented individual group exception.';
  end if;

  if not exists (
    select 1
    from public.core_reservations r
    join public.core_buyers b on b.id = r.buyer_id
    join public.core_families f on f.id = r.family_id
    join public.core_puppies p on p.id = r.puppy_id
    join public.core_applications a on a.id = r.application_id
    where r.id = '10000000-0000-0000-0000-000000000080'
  ) then
    raise exception 'Reservation context relationship validation failed.';
  end if;

  if not exists (
    select 1
    from public.core_payment_balance_view
    where reservation_id = '10000000-0000-0000-0000-000000000080'
      and posted_ledger_total_cents = 132999
      and balance_due_cents = 153000
  ) then
    raise exception 'Payment balance view validation failed.';
  end if;

  if exists (
    select 1
    from (
      values
        ('deposit'::text, 'decrease'::text, 50000),
        ('payment', 'decrease', 25000),
        ('credit', 'decrease', 10000),
        ('fee', 'increase', 5000),
        ('admin_fee', 'increase', 2500),
        ('transport_fee', 'increase', 7500),
        ('finance_charge', 'increase', 3000),
        ('refund', 'increase', 12000),
        ('chargeback', 'increase', 8000),
        ('adjustment', 'neutral', 9999)
    ) as expected(entry_type, balance_effect, amount_cents)
    left join public.core_financial_ledger l
      on l.reservation_id = '10000000-0000-0000-0000-000000000080'
      and l.entry_type = expected.entry_type
      and l.balance_effect = expected.balance_effect
      and l.amount_cents = expected.amount_cents
      and l.status = 'posted'
    where l.id is null
  ) then
    raise exception 'Financial ledger balance-effect classification validation failed.';
  end if;

  if not exists (
    select 1
    from public.core_phone_lookup_view
    where normalized_phone = '+12765550101'
      and buyer_name = 'Sarah Test Buyer'
      and puppy_name = 'Luna Test Puppy'
      and balance_due_cents = 153000
      and match_count = 1
      and is_ambiguous = false
      and verification_required = false
      and staff_routing_recommended = false
  ) then
    raise exception 'Unambiguous phone lookup view validation failed.';
  end if;

  if not exists (
    select 1
    from public.core_buyer_summary_view
    where buyer_id = '10000000-0000-0000-0000-000000000020'
      and application_count = 1
      and reservation_count = 2
      and current_puppy_name = 'Luna Test Puppy'
      and open_balance_cents = 153000
  ) then
    raise exception 'Buyer summary view validation failed.';
  end if;

  if not exists (
    select 1
    from public.core_puppy_summary_view
    where puppy_id = '10000000-0000-0000-0000-000000000070'
      and litter_name = 'Ember and Rambo Test Litter'
      and buyer_name = 'Sarah Test Buyer'
      and balance_due_cents = 153000
  ) then
    raise exception 'Puppy summary view validation failed.';
  end if;

  if not exists (
    select 1
    from public.core_reservation_summary_view
    where reservation_id = '10000000-0000-0000-0000-000000000080'
      and buyer_name = 'Sarah Test Buyer'
      and puppy_name = 'Luna Test Puppy'
      and contract_total_cents = 200000
      and balance_due_cents = 153000
  ) then
    raise exception 'Reservation summary view validation failed.';
  end if;

  select count(*)::integer into value_integer
  from public.core_dashboard_today_view
  where item_type in ('application', 'financial_ledger', 'phone_call');
  if value_integer < 4 then
    raise exception 'Dashboard today validation failed; expected at least 4 useful test items, got %.', value_integer;
  end if;

  select count(*)::integer into value_integer
  from public.core_integration_events
  where source_system = 'core_v1_smoke_provider'
    and external_event_id = 'TEST-INTEGRATION-EVENT-001';
  if value_integer <> 1 then
    raise exception 'Integration deduplication validation failed; expected one retained event, got %.', value_integer;
  end if;

  if not exists (
    select 1
    from public.core_audit_log
    where id = '10000000-0000-0000-0000-000000000120'
      and action = 'create_test_event'
      and outcome = 'success'
  ) then
    raise exception 'Audit log storage validation failed.';
  end if;

  if not exists (
    select 1
    from public.core_events
    where id = '10000000-0000-0000-0000-000000000110'
      and event_type = 'test_note'
  ) then
    raise exception 'Operational event storage validation failed.';
  end if;
end
$$;

insert into public.core_families (
  id, name, status, notes, metadata
) values (
  '10000000-0000-0000-0000-000000000140',
  'Alex Test Duplicate Phone Family',
  'active',
  'TEST ONLY second family sharing a normalized phone for ambiguity validation.',
  '{"test_only": true}'::jsonb
);

insert into public.core_buyers (
  id, first_name, last_name, email, email_normalized, phone, phone_normalized,
  approval_status, source, notes, metadata
) values (
  '10000000-0000-0000-0000-000000000141',
  'Alex',
  'Test Duplicate Phone',
  'alex.test.duplicate@example.invalid',
  'alex.test.duplicate@example.invalid',
  '+12765550101',
  '+12765550101',
  'pending_for_test',
  'core_v1_smoke_test',
  'TEST ONLY second buyer sharing a normalized phone.',
  '{"test_only": true}'::jsonb
);

insert into public.core_family_members (
  id, family_id, buyer_id, relationship, is_primary_contact, portal_access_status, metadata
) values (
  '10000000-0000-0000-0000-000000000142',
  '10000000-0000-0000-0000-000000000140',
  '10000000-0000-0000-0000-000000000141',
  'primary_buyer',
  true,
  'test_only',
  '{"test_only": true}'::jsonb
);

insert into public.core_profiles (
  id, display_name, email, phone, phone_normalized, role, status, metadata
) values (
  '10000000-0000-0000-0000-000000000143',
  'Taylor Test Profile Match',
  'taylor.test.profile@example.invalid',
  '+12765550101',
  '+12765550101',
  'buyer',
  'active',
  '{"test_only": true}'::jsonb
);

insert into public.core_families (
  id, name, status, notes, metadata
) values (
  '10000000-0000-0000-0000-000000000144',
  'Taylor Test Profile Family',
  'active',
  'TEST ONLY profile-only family sharing a normalized phone.',
  '{"test_only": true}'::jsonb
);

insert into public.core_family_members (
  id, family_id, profile_id, relationship, is_primary_contact, portal_access_status, metadata
) values (
  '10000000-0000-0000-0000-000000000145',
  '10000000-0000-0000-0000-000000000144',
  '10000000-0000-0000-0000-000000000143',
  'primary_buyer',
  true,
  'test_only',
  '{"test_only": true}'::jsonb
);

do $$
begin
  if not exists (
    select 1
    from public.core_phone_lookup_summary_view
    where normalized_phone = '+12765550101'
      and match_count = 3
      and is_ambiguous = true
      and verification_required = true
      and staff_routing_recommended = true
      and safe_display_name is null
      and '10000000-0000-0000-0000-000000000020'::uuid = any(matched_buyer_ids)
      and '10000000-0000-0000-0000-000000000141'::uuid = any(matched_buyer_ids)
      and '10000000-0000-0000-0000-000000000143'::uuid = any(matched_profile_ids)
  ) then
    raise exception 'Ambiguous phone summary validation failed.';
  end if;

  if not exists (
    select 1
    from public.core_phone_lookup_view
    where normalized_phone = '+12765550101'
      and match_count = 3
      and is_ambiguous = true
      and verification_required = true
      and staff_routing_recommended = true
      and buyer_id is null
      and buyer_name is null
      and email is null
      and approval_status is null
      and latest_application_status is null
      and family_id is null
      and family_name is null
      and reservation_id is null
      and reservation_status is null
      and puppy_id is null
      and puppy_name is null
      and balance_due_cents is null
      and currency is null
      and go_home_planned_at is null
      and go_home_status is null
  ) then
    raise exception 'Ambiguous phone lookup redaction validation failed.';
  end if;
end
$$;

select
  'core_payment_balance_view' as validated_view,
  posted_ledger_total_cents,
  balance_due_cents
from public.core_payment_balance_view
where reservation_id = '10000000-0000-0000-0000-000000000080';

select
  'core_financial_ledger_effects' as validated_rule,
  entry_type,
  balance_effect,
  amount_cents,
  case balance_effect
    when 'increase' then amount_cents
    when 'decrease' then -amount_cents
    when 'neutral' then 0
  end as balance_delta_cents
from public.core_financial_ledger
where reservation_id = '10000000-0000-0000-0000-000000000080'
order by id;

select
  'core_go_home_group_cardinality' as validated_rule,
  g.id as go_home_group_id,
  count(d.id) as grouped_reservation_detail_count,
  count(d.id) filter (where d.has_individual_override) as explicit_override_count
from public.core_go_home_groups g
join public.core_go_home_details d on d.go_home_group_id = g.id
where g.id = '10000000-0000-0000-0000-000000000082'
group by g.id;

select
  'core_phone_lookup_view_ambiguous' as validated_view,
  normalized_phone,
  match_count,
  is_ambiguous,
  verification_required,
  staff_routing_recommended,
  buyer_name,
  puppy_name,
  balance_due_cents
from public.core_phone_lookup_view
where normalized_phone = '+12765550101';

select
  'core_dashboard_today_view' as validated_view,
  item_type,
  count(*) as item_count
from public.core_dashboard_today_view
group by item_type
order by item_type;

rollback;
