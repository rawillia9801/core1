begin;

insert into public.core_profiles (
  id,
  display_name,
  email,
  role,
  status
) values
  ('88000000-0000-0000-0000-000000000001', 'Weight Test Owner', 'weight-owner@example.invalid', 'owner', 'active'),
  ('88000000-0000-0000-0000-000000000002', 'Weight Test Admin', 'weight-admin@example.invalid', 'admin', 'active'),
  ('88000000-0000-0000-0000-000000000003', 'Weight Test Staff', 'weight-staff@example.invalid', 'staff', 'active'),
  ('88000000-0000-0000-0000-000000000004', 'Weight Test Inactive Owner', 'weight-inactive@example.invalid', 'owner', 'inactive');

insert into public.core_dogs (
  id,
  call_name,
  sex,
  status,
  metadata
) values
  ('88000000-0000-0000-0000-000000000010', 'Weight Test Dam', 'female', 'active', '{"test_only": true}'::jsonb),
  ('88000000-0000-0000-0000-000000000011', 'Weight Test Sire', 'male', 'active', '{"test_only": true}'::jsonb);

insert into public.core_litters (
  id,
  litter_name,
  dam_id,
  sire_id,
  birth_at,
  status,
  metadata
) values (
  '88000000-0000-0000-0000-000000000020',
  'Weight Test Litter',
  '88000000-0000-0000-0000-000000000010',
  '88000000-0000-0000-0000-000000000011',
  now(),
  'born',
  '{"test_only": true}'::jsonb
);

insert into public.core_puppies (
  id,
  external_reference,
  litter_id,
  name,
  status,
  public_listing_status,
  metadata
) values (
  '88000000-0000-0000-0000-000000000030',
  'WEIGHT-TEST-PUPPY',
  '88000000-0000-0000-0000-000000000020',
  'Weight Test Puppy',
  'unavailable',
  'private',
  '{"test_only": true}'::jsonb
);

create temporary table puppy_weight_result as
select *
from public.core_record_puppy_weight_log(
  '88000000-0000-0000-0000-000000000001',
  '88000000-0000-0000-0000-000000000030',
  142,
  now(),
  'TEST ONLY observed daily weight.'
);

select 'weight_log_created' as check_name, count(*) as matching_rows
from public.core_weight_logs
where puppy_id = '88000000-0000-0000-0000-000000000030'
  and weight_grams = 142
  and metadata ->> 'external_side_effects' = 'false'
  and metadata ->> 'observation_only' = 'true';

select 'weight_event_created' as check_name, count(*) as matching_rows
from public.core_events
where event_type = 'puppy_weight_recorded'
  and puppy_id = '88000000-0000-0000-0000-000000000030'
  and source = 'core_record_puppy_weight_log'
  and details ->> 'external_side_effects' = 'false';

select 'weight_audit_created' as check_name, count(*) as matching_rows
from public.core_audit_log
where action = 'record_puppy_weight_log'
  and entity_table = 'core_weight_logs'
  and request_context ->> 'external_side_effects' = 'false';

do $$
begin
  perform public.core_record_puppy_weight_log(
    '88000000-0000-0000-0000-000000000001',
    '88000000-0000-0000-0000-000000000030',
    0,
    now(),
    'TEST ONLY invalid zero weight.'
  );
  raise exception 'invalid zero weight was not rejected';
exception
  when others then
    if sqlerrm = 'invalid zero weight was not rejected' then
      raise;
    end if;
end;
$$;

do $$
begin
  perform public.core_record_puppy_weight_log(
    '88000000-0000-0000-0000-000000000001',
    '88000000-0000-0000-0000-000000009999',
    142,
    now(),
    'TEST ONLY missing puppy.'
  );
  raise exception 'missing puppy was not rejected';
exception
  when others then
    if sqlerrm = 'missing puppy was not rejected' then
      raise;
    end if;
end;
$$;

do $$
begin
  perform public.core_record_puppy_weight_log(
    '88000000-0000-0000-0000-000000000003',
    '88000000-0000-0000-0000-000000000030',
    142,
    now(),
    'TEST ONLY unauthorized staff.'
  );
  raise exception 'staff actor was not rejected';
exception
  when others then
    if sqlerrm = 'staff actor was not rejected' then
      raise;
    end if;
end;
$$;

do $$
begin
  perform public.core_record_puppy_weight_log(
    '88000000-0000-0000-0000-000000000004',
    '88000000-0000-0000-0000-000000000030',
    142,
    now(),
    'TEST ONLY inactive owner.'
  );
  raise exception 'inactive actor was not rejected';
exception
  when others then
    if sqlerrm = 'inactive actor was not rejected' then
      raise;
    end if;
end;
$$;

create temporary table puppy_observation_result as
select *
from public.core_record_puppy_care_observation(
  '88000000-0000-0000-0000-000000000002',
  '88000000-0000-0000-0000-000000000030',
  'nursing_observed',
  now(),
  'TEST ONLY factual nursing observation.'
);

select 'observation_event_created' as check_name, count(*) as matching_rows
from public.core_puppy_events
where puppy_id = '88000000-0000-0000-0000-000000000030'
  and event_type = 'nursing_observed'
  and details ->> 'external_side_effects' = 'false'
  and details ->> 'observation_only' = 'true';

select 'observation_audit_created' as check_name, count(*) as matching_rows
from public.core_audit_log
where action = 'record_puppy_care_observation'
  and entity_table = 'core_puppy_events'
  and request_context ->> 'external_side_effects' = 'false';

do $$
begin
  perform public.core_record_puppy_care_observation(
    '88000000-0000-0000-0000-000000000001',
    '88000000-0000-0000-0000-000000000030',
    'diagnosis',
    now(),
    'TEST ONLY invalid observation type.'
  );
  raise exception 'invalid observation type was not rejected';
exception
  when others then
    if sqlerrm = 'invalid observation type was not rejected' then
      raise;
    end if;
end;
$$;

select
  'core_puppy_weight_log_tests' as validated_area,
  (select count(*) from puppy_weight_result) as weight_result_count,
  (select count(*) from puppy_observation_result) as observation_result_count;

rollback;
