-- Cherolee Core kennel create-record smoke test.
--
-- TEST DATA ONLY: these records are fictional and are rolled back at the end.
-- Run only against a local/development database after all Core migrations.

\set ON_ERROR_STOP on

begin;

insert into public.core_profiles (
  id, display_name, email, role, status, metadata
) values (
  '76000000-0000-0000-0000-000000000001',
  'Kennel Create Test Owner',
  'kennel.create.owner@example.invalid',
  'owner',
  'active',
  '{"test_only": true}'::jsonb
);

select public.core_create_dog(
  '76000000-0000-0000-0000-000000000001',
  'Test Dam',
  'Registered Test Dam',
  'female',
  'cream',
  'long',
  timestamp with time zone '2022-01-01 12:00:00+00',
  'active',
  'TEST-DAM-001',
  'TEST ONLY dam note.'
) as dam_id \gset

select public.core_create_dog(
  '76000000-0000-0000-0000-000000000001',
  'Test Sire',
  'Registered Test Sire',
  'male',
  'black tri',
  'smooth',
  timestamp with time zone '2021-01-01 12:00:00+00',
  'active',
  'TEST-SIRE-001',
  'TEST ONLY sire note.'
) as sire_id \gset

select public.core_create_litter(
  '76000000-0000-0000-0000-000000000001',
  'Test Litter 001',
  :'dam_id',
  :'sire_id',
  timestamp with time zone '2026-07-01 12:00:00+00',
  null,
  2,
  1,
  1,
  'expected',
  false,
  'TEST-LITTER-001',
  'TEST ONLY litter note.'
) as litter_id \gset

select public.core_create_puppy(
  '76000000-0000-0000-0000-000000000001',
  :'litter_id',
  'Test Puppy',
  'Pink Collar',
  'female',
  'cream',
  'long',
  null,
  'available',
  'observed healthy for test',
  'private',
  'TEST-PUPPY-001',
  'TEST ONLY puppy note.'
) as puppy_id \gset

do $$
begin
  if not exists (
    select 1 from public.core_dogs
    where id = :'dam_id'
      and call_name = 'Test Dam'
      and sex = 'female'
      and metadata ->> 'external_side_effects' = 'false'
  ) then
    raise exception 'Expected dam dog record to be created with no external side effects.';
  end if;

  if not exists (
    select 1 from public.core_dogs
    where id = :'sire_id'
      and call_name = 'Test Sire'
      and sex = 'male'
      and metadata ->> 'external_side_effects' = 'false'
  ) then
    raise exception 'Expected sire dog record to be created with no external side effects.';
  end if;

  if not exists (
    select 1 from public.core_litters
    where id = :'litter_id'
      and dam_id = :'dam_id'
      and sire_id = :'sire_id'
      and litter_name = 'Test Litter 001'
      and status = 'expected'
      and metadata ->> 'external_side_effects' = 'false'
  ) then
    raise exception 'Expected litter record to be created and linked to sire/dam with no external side effects.';
  end if;

  if not exists (
    select 1 from public.core_puppies
    where id = :'puppy_id'
      and litter_id = :'litter_id'
      and name = 'Test Puppy'
      and status = 'available'
      and public_listing_status = 'private'
      and metadata ->> 'external_side_effects' = 'false'
  ) then
    raise exception 'Expected puppy record to be created and linked to litter with no external side effects.';
  end if;

  if (select count(*) from public.core_events where event_type in ('dog_created', 'litter_created', 'puppy_created') and created_by_profile_id = '76000000-0000-0000-0000-000000000001') <> 4 then
    raise exception 'Expected dog, litter, and puppy create events.';
  end if;

  if (select count(*) from public.core_audit_log where action in ('create_dog', 'create_litter', 'create_puppy') and actor_profile_id = '76000000-0000-0000-0000-000000000001') <> 4 then
    raise exception 'Expected dog, litter, and puppy create audit rows.';
  end if;
end;
$$;

do $$
begin
  perform public.core_create_dog(
    '76000000-0000-0000-0000-000000000001',
    'Bad Dog',
    null,
    'dragon',
    null,
    null,
    null,
    'active',
    null,
    null
  );

  raise exception 'Expected invalid dog sex to be rejected.';
exception
  when others then
    if sqlerrm <> 'invalid dog sex' then
      raise exception 'Expected invalid dog sex, got: %', sqlerrm;
    end if;
end;
$$;

do $$
begin
  perform public.core_create_litter(
    '76000000-0000-0000-0000-000000000001',
    'Bad Litter',
    :'dam_id',
    :'dam_id',
    null,
    null,
    null,
    null,
    null,
    'planned',
    false,
    null,
    null
  );

  raise exception 'Expected same dam/sire litter to be rejected.';
exception
  when others then
    if sqlerrm <> 'dam and sire cannot be the same dog' then
      raise exception 'Expected same dam/sire rejection, got: %', sqlerrm;
    end if;
end;
$$;

do $$
begin
  perform public.core_create_puppy(
    '76000000-0000-0000-0000-000000000001',
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    'available',
    null,
    'private',
    null,
    null
  );

  raise exception 'Expected puppy without identifier to be rejected.';
exception
  when others then
    if sqlerrm <> 'puppy identifier is required' then
      raise exception 'Expected puppy identifier rejection, got: %', sqlerrm;
    end if;
end;
$$;

rollback;
