-- Cherolee Core V1 phone lookup ambiguity safety correction.
--
-- Business rule:
--   * A normalized phone value can identify more than one buyer/family.
--   * A single contact match may expose the existing read context through a
--     future validated server-side lookup flow.
--   * Multiple contact matches must not automatically disclose puppy, payment,
--     or go-home context; verification or staff routing is required.
--
-- Migration caution:
--   * These are read models only. No webhook, Twilio routing, verification
--     workflow, RLS policy, credentials, or production data is included.
--   * "Match" means a distinct buyer contact or a family-linked profile that
--     is not already represented by its linked buyer. Families do not yet have
--     their own phone columns in Core V1.

-- One row per distinct contact match and normalized phone. This server/admin-
-- oriented matching surface intentionally contains identifiers only, not
-- sensitive transaction context; a profile linked to a buyer deduplicates into
-- that buyer rather than creating a false second match.
create or replace view public.core_phone_lookup_matches_view as
with contact_candidates as (
  select
    phone_source.normalized_phone,
    'buyer:' || b.id::text as match_key,
    b.id as buyer_id,
    null::uuid as profile_id,
    fm.family_id,
    phone_source.phone_type
  from public.core_buyers b
  cross join lateral (
    values
      (b.phone_normalized, 'primary'::text),
      (b.alternate_phone_normalized, 'alternate'::text)
  ) phone_source(normalized_phone, phone_type)
  left join public.core_family_members fm on fm.buyer_id = b.id
  where phone_source.normalized_phone is not null

  union all

  select
    p.phone_normalized,
    case
      when fm.buyer_id is not null then 'buyer:' || fm.buyer_id::text
      else 'profile:' || p.id::text
    end as match_key,
    fm.buyer_id,
    p.id as profile_id,
    fm.family_id,
    'profile'::text as phone_type
  from public.core_profiles p
  join public.core_family_members fm on fm.profile_id = p.id
  where p.phone_normalized is not null
)
select
  normalized_phone,
  (array_agg(buyer_id) filter (where buyer_id is not null))[1] as buyer_id,
  array_remove(array_agg(distinct profile_id), null) as matched_profile_ids,
  min(phone_type) as phone_type,
  array_remove(array_agg(distinct family_id), null) as matched_family_ids
from contact_candidates
group by normalized_phone, match_key;

comment on view public.core_phone_lookup_matches_view is
  'Server/admin-oriented phone matching surface with one row per normalized phone and distinct buyer or unpaired family profile; it excludes payment, puppy, and go-home context.';

-- One safe routing decision row per normalized phone value. Matched IDs are
-- retained for future authorized server/staff handling, not public disclosure.
create or replace view public.core_phone_lookup_summary_view as
select
  m.normalized_phone,
  count(*)::integer as match_count,
  count(*) > 1 as is_ambiguous,
  array_remove(array_agg(m.buyer_id order by m.buyer_id), null) as matched_buyer_ids,
  array(
    select distinct profile_values.profile_id
    from public.core_phone_lookup_matches_view related_matches
    cross join lateral unnest(related_matches.matched_profile_ids) profile_values(profile_id)
    where related_matches.normalized_phone = m.normalized_phone
    order by profile_values.profile_id
  ) as matched_profile_ids,
  array(
    select distinct family_values.family_id
    from public.core_phone_lookup_matches_view related_matches
    cross join lateral unnest(related_matches.matched_family_ids) family_values(family_id)
    where related_matches.normalized_phone = m.normalized_phone
    order by family_values.family_id
  ) as matched_family_ids,
  case
    when count(*) = 1 then max(coalesce(nullif(concat_ws(' ', b.first_name, b.last_name), ''), p.display_name))
    else null
  end as safe_display_name,
  count(*) > 1 as verification_required,
  count(*) > 1 as staff_routing_recommended
from public.core_phone_lookup_matches_view m
left join public.core_buyers b on b.id = m.buyer_id
left join public.core_profiles p on p.id = (
  select profile_values.profile_id
  from unnest(m.matched_profile_ids) profile_values(profile_id)
  limit 1
)
group by m.normalized_phone;

comment on view public.core_phone_lookup_summary_view is
  'One-row-per-phone ambiguity decision surface. Ambiguous phones require verification/staff routing and do not expose customer transaction details.';

-- Preserve the original lookup columns for future single-match consumers and
-- append explicit ambiguity fields. For ambiguous values, context columns are
-- intentionally nulled so a lookup cannot disclose buyer, family, puppy,
-- payment, or go-home information before verification.
create or replace view public.core_phone_lookup_view as
select
  s.normalized_phone,
  case when not s.is_ambiguous then m.phone_type else null::text end as phone_type,
  case when not s.is_ambiguous then m.buyer_id else null::uuid end as buyer_id,
  case when not s.is_ambiguous then s.safe_display_name else null::text end as buyer_name,
  case when not s.is_ambiguous then b.email else null::text end as email,
  case when not s.is_ambiguous then b.approval_status else null::text end as approval_status,
  case when not s.is_ambiguous then bs.latest_application_status else null::text end as latest_application_status,
  case when not s.is_ambiguous then rs.family_id else null::uuid end as family_id,
  case when not s.is_ambiguous then rs.family_name else null::text end as family_name,
  case when not s.is_ambiguous then rs.reservation_id else null::uuid end as reservation_id,
  case when not s.is_ambiguous then rs.reservation_status else null::text end as reservation_status,
  case when not s.is_ambiguous then rs.puppy_id else null::uuid end as puppy_id,
  case when not s.is_ambiguous then rs.puppy_name else null::text end as puppy_name,
  case when not s.is_ambiguous then rs.balance_due_cents else null::integer end as balance_due_cents,
  case when not s.is_ambiguous then rs.currency else null::text end as currency,
  case when not s.is_ambiguous then rs.go_home_planned_at else null::timestamptz end as go_home_planned_at,
  case when not s.is_ambiguous then rs.go_home_status else null::text end as go_home_status,
  s.match_count,
  s.is_ambiguous,
  s.verification_required,
  s.staff_routing_recommended
from public.core_phone_lookup_summary_view s
left join public.core_phone_lookup_matches_view m
  on m.normalized_phone = s.normalized_phone
  and not s.is_ambiguous
left join public.core_buyers b on b.id = m.buyer_id
left join public.core_buyer_summary_view bs on bs.buyer_id = m.buyer_id
left join public.core_reservation_summary_view rs on rs.reservation_id = bs.current_reservation_id;

comment on view public.core_phone_lookup_view is
  'Safe future phone lookup surface: unambiguous matches may include context; ambiguous matches expose only ambiguity/routing status until verified.';
