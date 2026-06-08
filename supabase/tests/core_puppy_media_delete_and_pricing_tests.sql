-- Cherolee Core puppy media delete and internal pricing metadata smoke test.
-- TEST DATA ONLY: fictional records are rolled back at the end.

\set ON_ERROR_STOP on

begin;

insert into public.core_profiles (
  id,
  display_name,
  email,
  role,
  status,
  metadata
) values
  ('8c000000-0000-0000-0000-000000000001', 'Puppy Pricing Test Owner', 'puppy-pricing-owner@example.invalid', 'owner', 'active', '{"test_only": true}'::jsonb),
  ('8c000000-0000-0000-0000-000000000002', 'Puppy Pricing Test Staff', 'puppy-pricing-staff@example.invalid', 'staff', 'active', '{"test_only": true}'::jsonb);

select public.core_create_dog(
  '8c000000-0000-0000-0000-000000000001',
  'Pricing Dam',
  'Registered Pricing Dam',
  'female',
  'black tan',
  'long',
  timestamp with time zone '2022-04-01 12:00:00+00',
  'active',
  'PRICING-DAM',
  'TEST ONLY pricing dam.'
) as dam_id \gset

select public.core_create_dog(
  '8c000000-0000-0000-0000-000000000001',
  'Pricing Sire',
  'Registered Pricing Sire',
  'male',
  'cream',
  'smooth',
  timestamp with time zone '2021-04-01 12:00:00+00',
  'active',
  'PRICING-SIRE',
  'TEST ONLY pricing sire.'
) as sire_id \gset

select public.core_create_litter(
  '8c000000-0000-0000-0000-000000000001',
  'Pricing Test Litter',
  :'dam_id',
  :'sire_id',
  timestamp with time zone '2026-01-01 12:00:00+00',
  timestamp with time zone '2026-01-02 12:00:00+00',
  1,
  null,
  null,
  'born',
  false,
  'PRICING-LITTER',
  'TEST ONLY pricing litter.'
) as litter_id \gset

select public.core_create_puppy(
  '8c000000-0000-0000-0000-000000000001',
  :'litter_id',
  'Pricing Puppy',
  'Gold',
  'male',
  'black and white',
  'long',
  timestamp with time zone '2026-01-02 12:00:00+00',
  'available',
  'normal',
  'private',
  'AKC',
  'PRICING-REG-001',
  200000,
  50000,
  25000,
  'PRICING-PUPPY',
  'TEST ONLY pricing puppy.'
) as puppy_id \gset

select public.core_update_puppy(
  :'puppy_id',
  '8c000000-0000-0000-0000-000000000001',
  :'litter_id',
  'Pricing Puppy',
  'Gold',
  'male',
  'black and white',
  'long',
  timestamp with time zone '2026-01-02 12:00:00+00',
  'available',
  'normal',
  'private',
  'CKC',
  'PRICING-REG-002',
  200000,
  50000,
  30000,
  'PRICING-PUPPY',
  'TEST ONLY pricing update.'
) as updated_puppy_id \gset

select public.core_record_kennel_media_metadata(
  '8c000000-0000-0000-0000-000000000001',
  'puppy',
  null,
  :'puppy_id',
  'kennel-media',
  'puppies/' || :'puppy_id' || '/photos/test-delete.jpg',
  'test-delete.jpg',
  'image/jpeg',
  234567,
  'TEST ONLY Delete Photo',
  'TEST ONLY private puppy photo to delete.',
  true
) as puppy_media_id \gset

select public.core_delete_kennel_media(
  :'puppy_media_id',
  '8c000000-0000-0000-0000-000000000001'
) as deleted_media_id \gset

select 'puppy_pricing_metadata_check' as check_name, count(*) as matching_rows
from public.core_puppies
where id = :'puppy_id'
  and metadata ->> 'registry' = 'CKC'
  and metadata ->> 'registration_number' = 'PRICING-REG-002'
  and metadata ->> 'price_cents' = '200000'
  and metadata ->> 'deposit_amount_cents' = '50000'
  and metadata ->> 'internal_cost_cents' = '30000'
  and metadata ->> 'payment_processed' = 'false'
  and metadata ->> 'public_publishing_enabled' = 'false'
  and metadata ->> 'customer_message_sent' = 'false'
  and metadata ->> 'external_side_effects' = 'false';

select 'puppy_media_delete_check' as check_name, count(*) as matching_rows
from public.core_kennel_media
where id = :'puppy_media_id';

select 'event_check' as check_name, count(*) as matching_rows
from public.core_events
where source in ('core_update_puppy', 'core_delete_kennel_media')
  and puppy_id = :'puppy_id'
  and details ->> 'external_side_effects' = 'false';

select 'audit_check' as check_name, count(*) as matching_rows
from public.core_audit_log
where source in ('core_update_puppy', 'core_delete_kennel_media')
  and outcome = 'success'
  and request_context ->> 'external_side_effects' = 'false';

do $$
begin
  perform public.core_update_puppy(
    (select id from public.core_puppies where external_reference = 'PRICING-PUPPY'),
    '8c000000-0000-0000-0000-000000000001',
    (select litter_id from public.core_puppies where external_reference = 'PRICING-PUPPY'),
    'Pricing Puppy',
    'Gold',
    'male',
    'black and white',
    'long',
    timestamp with time zone '2026-01-02 12:00:00+00',
    'available',
    'normal',
    'private',
    null,
    null,
    -1,
    50000,
    null,
    'PRICING-PUPPY',
    'TEST ONLY invalid price.'
  );
  raise exception 'negative price was not rejected';
exception
  when others then
    if sqlerrm = 'negative price was not rejected' then
      raise;
    end if;
end;
$$;

do $$
begin
  perform public.core_delete_kennel_media(
    gen_random_uuid(),
    '8c000000-0000-0000-0000-000000000002'
  );
  raise exception 'staff media delete was not rejected';
exception
  when others then
    if sqlerrm = 'staff media delete was not rejected' then
      raise;
    end if;
end;
$$;

select
  'core_puppy_media_delete_and_pricing_tests' as validated_area,
  :'puppy_id' as puppy_id,
  :'puppy_media_id' as deleted_media_id;

rollback;
