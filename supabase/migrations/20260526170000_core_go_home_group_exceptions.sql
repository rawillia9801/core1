-- Cherolee Core V1 go-home shared appointment ownership correction.
--
-- Business rule:
--   * core_go_home_groups owns shared appointment scheduling and location data.
--   * core_go_home_details owns puppy-specific readiness, status, and notes.
--   * A grouped detail records scheduling/location differences only in explicit
--     override fields with a documented reason.
--
-- Migration caution:
--   * This migration changes only go-home detail validation semantics.
--   * Before applying to any non-empty Core environment, inspect grouped
--     details that already contain method, planned_at, or location values and
--     migrate any true exceptions into the explicit override fields.

alter table public.core_go_home_details
  add column has_individual_override boolean not null default false,
  add column override_reason text,
  add column individual_scheduled_at timestamptz,
  add column individual_window_start timestamptz,
  add column individual_window_end timestamptz,
  add column individual_location_notes text,
  add column balance_cleared_status text;

comment on table public.core_go_home_groups is
  'Shared pickup/delivery appointment source of truth for one or more reservation go-home details.';
comment on column public.core_go_home_groups.status is
  'Shared appointment/trip status for the grouped pickup or delivery event.';
comment on table public.core_go_home_details is
  'Current puppy-specific readiness/status/notes for one reservation; grouped appointment overrides require an explicit exception.';
comment on column public.core_go_home_details.status is
  'Individual reservation/puppy go-home readiness status, not the grouped appointment status.';
comment on column public.core_go_home_details.method is
  'Legacy/current appointment method usable for ungrouped details only; grouped appointment type belongs to core_go_home_groups.';
comment on column public.core_go_home_details.planned_at is
  'Legacy/current appointment timestamp usable for ungrouped details only; grouped appointment schedule belongs to core_go_home_groups.';
comment on column public.core_go_home_details.location is
  'Legacy/current appointment location usable for ungrouped details only; grouped appointment location belongs to core_go_home_groups.';
comment on column public.core_go_home_details.has_individual_override is
  'True only when a grouped reservation/puppy intentionally differs from the shared appointment.';
comment on column public.core_go_home_details.override_reason is
  'Required explanation when a grouped detail has an individual override.';
comment on column public.core_go_home_details.individual_scheduled_at is
  'Explicit individual appointment timestamp override; null when shared group defaults apply.';
comment on column public.core_go_home_details.individual_window_start is
  'Explicit individual appointment window start override; null when shared group defaults apply.';
comment on column public.core_go_home_details.individual_window_end is
  'Explicit individual appointment window end override; null when shared group defaults apply.';
comment on column public.core_go_home_details.individual_location_notes is
  'Explicit individual location/delivery override notes; null when shared group defaults apply.';
comment on column public.core_go_home_details.balance_cleared_status is
  'Individual operational readiness marker only; the financial ledger and balance view remain the source of truth for money owed.';

alter table public.core_go_home_details
  add constraint core_go_home_details_individual_override_check
  check (
    (
      has_individual_override = false
      and override_reason is null
      and individual_scheduled_at is null
      and individual_window_start is null
      and individual_window_end is null
      and individual_location_notes is null
    )
    or
    (
      go_home_group_id is not null
      and has_individual_override = true
      and nullif(btrim(override_reason), '') is not null
    )
  ),
  add constraint core_go_home_details_group_shared_fields_check
  check (
    go_home_group_id is null
    or (
      method is null
      and planned_at is null
      and location is null
    )
  );
