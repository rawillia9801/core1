-- Cherolee Core V1 go-home cardinality correction.
--
-- Migration caution:
--   * This migration adds an optional shared pickup/delivery grouping and
--     enforces one current go-home detail per reservation.
--   * A family or buyer may have multiple reservations and puppies; each
--     reservation still represents exactly one puppy transaction.
--   * No go-home history table is created in Core V1. Changes to current
--     go-home details must later be captured through core_events and
--     core_audit_log.
--   * This migration creates no integrations, production data, or RLS policy.

-- Optional shared pickup/delivery event for one or more reservation details,
-- such as two puppies going home to the same family at the same appointment.
create table if not exists public.core_go_home_groups (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.core_families(id) on delete set null,
  buyer_id uuid references public.core_buyers(id) on delete set null,
  pickup_delivery_type text,
  scheduled_at timestamptz,
  window_start timestamptz,
  window_end timestamptz,
  address_line_1 text,
  address_line_2 text,
  city text,
  state text,
  postal_code text,
  contact_phone text,
  status text not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.core_go_home_groups is
  'Optional shared pickup/delivery event grouping one or more reservation go-home details for the same trip or appointment.';

create trigger core_go_home_groups_set_updated_at before update on public.core_go_home_groups
for each row execute function public.core_set_updated_at();

create index if not exists core_go_home_groups_family_id_idx on public.core_go_home_groups (family_id);
create index if not exists core_go_home_groups_buyer_id_idx on public.core_go_home_groups (buyer_id);
create index if not exists core_go_home_groups_scheduled_at_idx on public.core_go_home_groups (scheduled_at);

alter table public.core_go_home_details
  add column go_home_group_id uuid references public.core_go_home_groups(id) on delete set null,
  add column individual_notes text,
  add column checklist_status text;

comment on table public.core_go_home_details is
  'Current pickup/delivery detail for one reservation and its one puppy; optionally linked to a shared go-home group.';
comment on column public.core_go_home_details.go_home_group_id is
  'Optional shared pickup/delivery event connecting details from multiple reservations going home together.';
comment on column public.core_go_home_details.individual_notes is
  'Reservation- and puppy-specific notes for the current go-home arrangement.';
comment on column public.core_go_home_details.checklist_status is
  'Current checklist completion status for this reservation go-home detail.';

create index if not exists core_go_home_details_group_id_idx
  on public.core_go_home_details (go_home_group_id);

-- One reservation has zero or one current go-home detail. Core V1 change
-- history belongs in core_events and core_audit_log rather than duplicate rows.
-- Before applying this outside a fresh local/development schema, inspect any
-- existing Core details for duplicate non-null reservation_id values.
create unique index if not exists core_go_home_details_reservation_current_uidx
  on public.core_go_home_details (reservation_id)
  where reservation_id is not null;
