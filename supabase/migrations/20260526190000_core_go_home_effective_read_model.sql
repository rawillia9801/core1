-- Cherolee Core V1 go-home effective read model.
--
-- Business rule:
--   * core_go_home_groups owns shared pickup/delivery appointment data.
--   * core_go_home_details owns individual reservation/puppy readiness and optional explicit exceptions.
--   * Read surfaces should not guess between group/default fields and detail override fields.
--   * This migration creates read models only. It does not create UI, write tools, RLS, integrations,
--     production credentials, production data, or a go-home history table.

create or replace view public.core_go_home_effective_view as
select
  d.id as go_home_detail_id,
  d.go_home_group_id,
  d.reservation_id,
  coalesce(r.family_id, g.family_id) as family_id,
  coalesce(r.buyer_id, g.buyer_id) as buyer_id,
  r.puppy_id,
  (d.go_home_group_id is not null) as is_grouped,
  d.has_individual_override,
  d.override_reason,
  case
    when d.go_home_group_id is not null then g.pickup_delivery_type
    else d.method
  end as effective_pickup_delivery_type,
  case
    when d.go_home_group_id is not null and d.has_individual_override and d.individual_scheduled_at is not null then d.individual_scheduled_at
    when d.go_home_group_id is not null then g.scheduled_at
    else d.planned_at
  end as effective_scheduled_at,
  case
    when d.go_home_group_id is not null and d.has_individual_override and d.individual_window_start is not null then d.individual_window_start
    when d.go_home_group_id is not null then g.window_start
    else null::timestamptz
  end as effective_window_start,
  case
    when d.go_home_group_id is not null and d.has_individual_override and d.individual_window_end is not null then d.individual_window_end
    when d.go_home_group_id is not null then g.window_end
    else null::timestamptz
  end as effective_window_end,
  case when d.go_home_group_id is not null then g.address_line_1 else null::text end as effective_address_line_1,
  case when d.go_home_group_id is not null then g.address_line_2 else null::text end as effective_address_line_2,
  case when d.go_home_group_id is not null then g.city else null::text end as effective_city,
  case when d.go_home_group_id is not null then g.state else null::text end as effective_state,
  case when d.go_home_group_id is not null then g.postal_code else null::text end as effective_postal_code,
  case when d.go_home_group_id is not null then g.contact_phone else null::text end as effective_contact_phone,
  case
    when d.go_home_group_id is not null and d.has_individual_override and d.individual_location_notes is not null then d.individual_location_notes
    when d.go_home_group_id is not null then concat_ws(', ', nullif(g.address_line_1, ''), nullif(g.address_line_2, ''), nullif(g.city, ''), nullif(g.state, ''), nullif(g.postal_code, ''))
    else d.location
  end as effective_location_text,
  case
    when d.go_home_group_id is not null then g.status
    else d.status
  end as effective_status,
  g.status as group_status,
  d.status as detail_status,
  d.individual_notes,
  d.checklist_status,
  d.balance_cleared_status,
  d.contact_notes,
  g.notes as group_notes,
  d.completed_at,
  d.created_at,
  d.updated_at,
  case
    when d.go_home_group_id is not null and d.has_individual_override then 'individual_override'
    when d.go_home_group_id is not null then 'group_default'
    else 'ungrouped_detail'
  end as source_of_schedule
from public.core_go_home_details d
left join public.core_reservations r on r.id = d.reservation_id
left join public.core_go_home_groups g on g.id = d.go_home_group_id;

comment on view public.core_go_home_effective_view is
  'One row per go-home detail with resolved appointment values. Use this read model for dashboards, portal, phone lookup, and go-home screens.';

-- Update reservation summary to read resolved go-home values while preserving the original column order.
create or replace view public.core_reservation_summary_view as
select
  r.id as reservation_id,
  r.status as reservation_status,
  r.reserved_at,
  r.buyer_id,
  concat_ws(' ', b.first_name, b.last_name) as buyer_name,
  b.email as buyer_email,
  b.phone as buyer_phone,
  b.phone_normalized as buyer_phone_normalized,
  r.family_id,
  f.name as family_name,
  r.puppy_id,
  p.name as puppy_name,
  p.collar_color as puppy_collar_color,
  p.status as puppy_status,
  r.application_id,
  pb.contract_total_cents,
  pb.deposit_required_cents,
  pb.posted_ledger_total_cents,
  pb.balance_due_cents,
  pb.currency,
  gh.effective_scheduled_at as go_home_planned_at,
  gh.effective_pickup_delivery_type as go_home_method,
  gh.effective_status as go_home_status,
  r.created_at,
  r.updated_at,
  gh.go_home_detail_id,
  gh.go_home_group_id,
  gh.is_grouped as go_home_is_grouped,
  gh.has_individual_override as go_home_has_individual_override,
  gh.source_of_schedule as go_home_source_of_schedule,
  gh.effective_window_start as go_home_window_start,
  gh.effective_window_end as go_home_window_end,
  gh.effective_location_text as go_home_location_text,
  gh.detail_status as go_home_detail_status,
  gh.checklist_status as go_home_checklist_status,
  gh.balance_cleared_status as go_home_balance_cleared_status
from public.core_reservations r
left join public.core_buyers b on b.id = r.buyer_id
left join public.core_families f on f.id = r.family_id
left join public.core_puppies p on p.id = r.puppy_id
left join public.core_payment_balance_view pb on pb.reservation_id = r.id
left join lateral (
  select e.*
  from public.core_go_home_effective_view e
  where e.reservation_id = r.id
  order by e.effective_scheduled_at nulls last, e.created_at desc
  limit 1
) gh on true;

comment on view public.core_reservation_summary_view is
  'Reservation read model with buyer, puppy, effective go-home appointment, and calculated payment context.';

-- Preserve buyer summary shape while its latest reservation now inherits effective go-home values from reservation summary.
create or replace view public.core_buyer_summary_view as
select
  b.id as buyer_id,
  concat_ws(' ', b.first_name, b.last_name) as buyer_name,
  b.first_name,
  b.last_name,
  b.email,
  b.email_normalized,
  b.phone,
  b.phone_normalized,
  b.approval_status,
  coalesce(a.application_count, 0)::integer as application_count,
  a.latest_application_status,
  coalesce(r.reservation_count, 0)::integer as reservation_count,
  r.open_balance_cents,
  latest.reservation_id as current_reservation_id,
  latest.reservation_status as current_reservation_status,
  latest.puppy_id as current_puppy_id,
  latest.puppy_name as current_puppy_name,
  latest.go_home_planned_at,
  b.created_at,
  b.updated_at,
  latest.go_home_source_of_schedule,
  latest.go_home_location_text,
  latest.go_home_detail_status,
  latest.go_home_checklist_status,
  latest.go_home_balance_cleared_status
from public.core_buyers b
left join lateral (
  select
    count(*)::integer as application_count,
    (array_agg(app.status order by app.created_at desc))[1] as latest_application_status
  from public.core_applications app
  where app.buyer_id = b.id
) a on true
left join lateral (
  select
    count(*)::integer as reservation_count,
    sum(pb.balance_due_cents) filter (
      where rs.status not in ('cancelled', 'void') and pb.balance_due_cents is not null
    )::integer as open_balance_cents
  from public.core_reservations rs
  left join public.core_payment_balance_view pb on pb.reservation_id = rs.id
  where rs.buyer_id = b.id
) r on true
left join lateral (
  select
    s.reservation_id,
    s.reservation_status,
    s.puppy_id,
    s.puppy_name,
    s.go_home_planned_at,
    s.go_home_source_of_schedule,
    s.go_home_location_text,
    s.go_home_detail_status,
    s.go_home_checklist_status,
    s.go_home_balance_cleared_status
  from public.core_reservation_summary_view s
  where s.buyer_id = b.id and s.reservation_status not in ('cancelled', 'void')
  order by s.created_at desc
  limit 1
) latest on true;

comment on view public.core_buyer_summary_view is
  'Buyer read model with applications and reservation-derived context; buyers do not own financial totals.';

-- Preserve puppy summary shape while adding effective go-home context at the end.
create or replace view public.core_puppy_summary_view as
select
  p.id as puppy_id,
  p.name as puppy_name,
  p.collar_color,
  p.sex,
  p.color,
  p.coat_type,
  p.birth_at,
  p.status as puppy_status,
  p.health_status,
  p.public_listing_status,
  p.litter_id,
  l.litter_name,
  l.birth_at as litter_birth_at,
  latest.reservation_id,
  latest.reservation_status,
  latest.buyer_id,
  latest.buyer_name,
  latest.contract_total_cents,
  latest.posted_ledger_total_cents,
  latest.balance_due_cents,
  latest.go_home_planned_at,
  p.created_at,
  p.updated_at,
  latest.go_home_source_of_schedule,
  latest.go_home_location_text,
  latest.go_home_detail_status,
  latest.go_home_checklist_status,
  latest.go_home_balance_cleared_status
from public.core_puppies p
left join public.core_litters l on l.id = p.litter_id
left join lateral (
  select s.*
  from public.core_reservation_summary_view s
  where s.puppy_id = p.id and s.reservation_status not in ('cancelled', 'void')
  order by s.created_at desc
  limit 1
) latest on true;

comment on view public.core_puppy_summary_view is
  'Puppy read model with litter and current reservation-derived payment/effective go-home context.';

-- Update the dashboard feed's go-home branch to read effective appointment values.
create or replace view public.core_dashboard_today_view as
select
  'application'::text as item_type,
  a.id as item_id,
  coalesce(a.submitted_at, a.created_at) as occurs_at,
  a.status,
  concat_ws(' - ', 'Application', coalesce(concat_ws(' ', b.first_name, b.last_name), 'Unmatched applicant')) as summary,
  a.buyer_id,
  null::uuid as puppy_id,
  null::uuid as reservation_id,
  jsonb_build_object('application_id', a.id, 'source', a.source) as details
from public.core_applications a
left join public.core_buyers b on b.id = a.buyer_id
where coalesce(a.submitted_at, a.created_at) >= date_trunc('day', now())
  and coalesce(a.submitted_at, a.created_at) < date_trunc('day', now()) + interval '1 day'
union all
select
  'go_home'::text as item_type,
  gh.go_home_detail_id as item_id,
  gh.effective_scheduled_at as occurs_at,
  gh.effective_status as status,
  concat_ws(' - ', coalesce(p.name, 'Unassigned puppy'), coalesce(concat_ws(' ', b.first_name, b.last_name), 'Unassigned buyer')) as summary,
  r.buyer_id,
  r.puppy_id,
  r.id as reservation_id,
  jsonb_build_object(
    'method', gh.effective_pickup_delivery_type,
    'location', gh.effective_location_text,
    'source_of_schedule', gh.source_of_schedule,
    'checklist_status', gh.checklist_status,
    'balance_cleared_status', gh.balance_cleared_status
  ) as details
from public.core_go_home_effective_view gh
left join public.core_reservations r on r.id = gh.reservation_id
left join public.core_buyers b on b.id = r.buyer_id
left join public.core_puppies p on p.id = r.puppy_id
where gh.effective_scheduled_at >= date_trunc('day', now())
  and gh.effective_scheduled_at < date_trunc('day', now()) + interval '1 day'
union all
select
  'financial_ledger'::text,
  fl.id,
  fl.occurred_at,
  fl.status,
  concat_ws(' - ', fl.entry_type, concat(fl.amount_cents, ' cents')),
  fl.buyer_id,
  r.puppy_id,
  fl.reservation_id,
  jsonb_build_object('amount_cents', fl.amount_cents, 'currency', fl.currency)
from public.core_financial_ledger fl
left join public.core_reservations r on r.id = fl.reservation_id
where fl.occurred_at >= date_trunc('day', now())
  and fl.occurred_at < date_trunc('day', now()) + interval '1 day'
union all
select
  'document'::text,
  d.id,
  d.created_at,
  d.status,
  coalesce(d.title, d.document_type, 'Document'),
  d.buyer_id,
  d.puppy_id,
  d.reservation_id,
  jsonb_build_object('document_type', d.document_type)
from public.core_documents d
where d.created_at >= date_trunc('day', now())
  and d.created_at < date_trunc('day', now()) + interval '1 day'
union all
select
  'notification'::text,
  n.id,
  n.scheduled_at,
  n.status,
  coalesce(n.notification_type, 'Scheduled notification'),
  n.buyer_id,
  null::uuid,
  null::uuid,
  jsonb_build_object('channel', n.channel)
from public.core_notifications n
where n.scheduled_at >= date_trunc('day', now())
  and n.scheduled_at < date_trunc('day', now()) + interval '1 day'
union all
select
  'puppy_event'::text,
  pe.id,
  pe.event_at,
  pe.event_type,
  coalesce(pe.summary, pe.event_type),
  null::uuid,
  pe.puppy_id,
  null::uuid,
  pe.details
from public.core_puppy_events pe
where pe.event_at >= date_trunc('day', now())
  and pe.event_at < date_trunc('day', now()) + interval '1 day'
union all
select
  'phone_call'::text,
  pc.id,
  coalesce(pc.started_at, pc.created_at),
  pc.status,
  concat_ws(' - ', 'Phone call', pc.direction),
  pc.buyer_id,
  null::uuid,
  null::uuid,
  jsonb_build_object('from_phone_normalized', pc.from_phone_normalized, 'to_phone_normalized', pc.to_phone_normalized)
from public.core_phone_calls pc
where coalesce(pc.started_at, pc.created_at) >= date_trunc('day', now())
  and coalesce(pc.started_at, pc.created_at) < date_trunc('day', now()) + interval '1 day'
union all
select
  'integration_attention'::text,
  ie.id,
  coalesce(ie.next_retry_at, ie.created_at),
  ie.status,
  concat_ws(' - ', ie.source_system, ie.event_type),
  null::uuid,
  null::uuid,
  null::uuid,
  jsonb_build_object('attempts', ie.attempts, 'error_message', ie.error_message)
from public.core_integration_events ie
where ie.status in ('failed', 'retry_pending')
  and coalesce(ie.next_retry_at, ie.created_at) < date_trunc('day', now()) + interval '1 day';

comment on view public.core_dashboard_today_view is
  'Read-only feed for today''s applications, effective go-home appointments, finances, documents, notifications, calls, puppy events, and integration attention.';