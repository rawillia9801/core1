-- Cherolee Core first-wave Row Level Security foundation.
--
-- Business rule:
--   * This is an internal owner/operator RLS foundation only.
--   * It prepares authenticated internal access checks and blocks accidental
--     anonymous/customer reads.
--   * It does not add customer portal access, public listings, provider calls,
--     live messaging, live payments, document generation, or AI execution.
--
-- Service-role server reads/RPCs remain transitional backend paths and should
-- be reviewed before production use.

create or replace function public.core_current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from public.core_profiles p
  where p.auth_user_id = auth.uid()
    and p.status = 'active'
  limit 1
$$;

create or replace function public.core_current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.core_profiles p
  where p.auth_user_id = auth.uid()
    and p.status = 'active'
  limit 1
$$;

create or replace function public.core_current_profile_is_owner_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.core_current_profile_role() in ('owner', 'admin'), false)
$$;

create or replace function public.core_current_profile_is_staff_or_above()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.core_current_profile_role() in ('owner', 'admin', 'staff'), false)
$$;

create or replace function public.core_can_read_sensitive_owner_data()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.core_current_profile_is_owner_admin()
$$;

comment on function public.core_current_profile_id() is
  'Returns the active core_profiles.id mapped to auth.uid(), or null when no active internal profile exists.';
comment on function public.core_current_profile_role() is
  'Returns the active internal core_profiles.role mapped to auth.uid(), or null when unavailable.';
comment on function public.core_current_profile_is_owner_admin() is
  'True only for active owner/admin internal profiles mapped to auth.uid().';
comment on function public.core_current_profile_is_staff_or_above() is
  'True only for active owner/admin/staff internal profiles mapped to auth.uid().';
comment on function public.core_can_read_sensitive_owner_data() is
  'True only for active owner/admin internal profiles; used for sensitive owner/operator data policies.';

revoke all on function public.core_current_profile_id() from public;
revoke all on function public.core_current_profile_role() from public;
revoke all on function public.core_current_profile_is_owner_admin() from public;
revoke all on function public.core_current_profile_is_staff_or_above() from public;
revoke all on function public.core_can_read_sensitive_owner_data() from public;

grant execute on function public.core_current_profile_id() to authenticated;
grant execute on function public.core_current_profile_role() to authenticated;
grant execute on function public.core_current_profile_is_owner_admin() to authenticated;
grant execute on function public.core_current_profile_is_staff_or_above() to authenticated;
grant execute on function public.core_can_read_sensitive_owner_data() to authenticated;

-- First-wave table surface. These are the internal identity, application,
-- buyer/family, reservation, financial, event/audit, and proposal tables that
-- are clearest and testable today. Service-role backend access still bypasses
-- RLS, so app server workflows continue to run while direct client access is
-- denied unless an authenticated internal profile policy allows it.

alter table public.core_profiles enable row level security;
alter table public.core_families enable row level security;
alter table public.core_buyers enable row level security;
alter table public.core_family_members enable row level security;
alter table public.core_applications enable row level security;
alter table public.core_application_sections enable row level security;
alter table public.core_reservations enable row level security;
alter table public.core_financial_ledger enable row level security;
alter table public.core_events enable row level security;
alter table public.core_audit_log enable row level security;
alter table public.core_proposed_actions enable row level security;

revoke all on table
  public.core_profiles,
  public.core_families,
  public.core_buyers,
  public.core_family_members,
  public.core_applications,
  public.core_application_sections,
  public.core_reservations,
  public.core_financial_ledger,
  public.core_events,
  public.core_audit_log,
  public.core_proposed_actions
from anon;

revoke all on table
  public.core_profiles,
  public.core_families,
  public.core_buyers,
  public.core_family_members,
  public.core_applications,
  public.core_application_sections,
  public.core_reservations,
  public.core_financial_ledger,
  public.core_events,
  public.core_audit_log,
  public.core_proposed_actions
from authenticated;

grant select on table
  public.core_profiles,
  public.core_families,
  public.core_buyers,
  public.core_family_members,
  public.core_applications,
  public.core_application_sections,
  public.core_reservations,
  public.core_financial_ledger,
  public.core_events,
  public.core_audit_log,
  public.core_proposed_actions
to authenticated;

-- Profile access -------------------------------------------------------------

drop policy if exists core_profiles_owner_admin_select on public.core_profiles;
create policy core_profiles_owner_admin_select
on public.core_profiles
for select
to authenticated
using (public.core_current_profile_is_owner_admin());

drop policy if exists core_profiles_staff_select_self on public.core_profiles;
create policy core_profiles_staff_select_self
on public.core_profiles
for select
to authenticated
using (
  id = public.core_current_profile_id()
  and status = 'active'
);

drop policy if exists core_profiles_owner_admin_insert on public.core_profiles;
create policy core_profiles_owner_admin_insert
on public.core_profiles
for insert
to authenticated
with check (public.core_current_profile_is_owner_admin());

drop policy if exists core_profiles_owner_admin_update on public.core_profiles;
create policy core_profiles_owner_admin_update
on public.core_profiles
for update
to authenticated
using (public.core_current_profile_is_owner_admin())
with check (public.core_current_profile_is_owner_admin());

-- Operational application/customer/transaction reads -------------------------

drop policy if exists core_families_staff_select on public.core_families;
create policy core_families_staff_select
on public.core_families
for select
to authenticated
using (public.core_current_profile_is_staff_or_above());

drop policy if exists core_buyers_staff_select on public.core_buyers;
create policy core_buyers_staff_select
on public.core_buyers
for select
to authenticated
using (public.core_current_profile_is_staff_or_above());

drop policy if exists core_family_members_staff_select on public.core_family_members;
create policy core_family_members_staff_select
on public.core_family_members
for select
to authenticated
using (public.core_current_profile_is_staff_or_above());

drop policy if exists core_applications_staff_select on public.core_applications;
create policy core_applications_staff_select
on public.core_applications
for select
to authenticated
using (public.core_current_profile_is_staff_or_above());

drop policy if exists core_application_sections_staff_select on public.core_application_sections;
create policy core_application_sections_staff_select
on public.core_application_sections
for select
to authenticated
using (public.core_current_profile_is_staff_or_above());

drop policy if exists core_reservations_staff_select on public.core_reservations;
create policy core_reservations_staff_select
on public.core_reservations
for select
to authenticated
using (public.core_current_profile_is_staff_or_above());

-- Sensitive owner/admin reads ------------------------------------------------

drop policy if exists core_financial_ledger_owner_admin_select on public.core_financial_ledger;
create policy core_financial_ledger_owner_admin_select
on public.core_financial_ledger
for select
to authenticated
using (public.core_can_read_sensitive_owner_data());

drop policy if exists core_events_owner_admin_select on public.core_events;
create policy core_events_owner_admin_select
on public.core_events
for select
to authenticated
using (public.core_can_read_sensitive_owner_data());

drop policy if exists core_audit_log_owner_admin_select on public.core_audit_log;
create policy core_audit_log_owner_admin_select
on public.core_audit_log
for select
to authenticated
using (public.core_can_read_sensitive_owner_data());

drop policy if exists core_proposed_actions_owner_admin_select on public.core_proposed_actions;
create policy core_proposed_actions_owner_admin_select
on public.core_proposed_actions
for select
to authenticated
using (public.core_current_profile_is_owner_admin());

-- Direct write policies exist only for owner/admin internal profiles, but table
-- write privileges are not granted to authenticated clients in this first wave.
-- Current writes must continue through service-role server actions and
-- controlled RPCs that validate actor profile IDs and write event/audit rows.

drop policy if exists core_families_owner_admin_write on public.core_families;
create policy core_families_owner_admin_write
on public.core_families
for all
to authenticated
using (public.core_current_profile_is_owner_admin())
with check (public.core_current_profile_is_owner_admin());

drop policy if exists core_buyers_owner_admin_write on public.core_buyers;
create policy core_buyers_owner_admin_write
on public.core_buyers
for all
to authenticated
using (public.core_current_profile_is_owner_admin())
with check (public.core_current_profile_is_owner_admin());

drop policy if exists core_family_members_owner_admin_write on public.core_family_members;
create policy core_family_members_owner_admin_write
on public.core_family_members
for all
to authenticated
using (public.core_current_profile_is_owner_admin())
with check (public.core_current_profile_is_owner_admin());

drop policy if exists core_applications_owner_admin_write on public.core_applications;
create policy core_applications_owner_admin_write
on public.core_applications
for all
to authenticated
using (public.core_current_profile_is_owner_admin())
with check (public.core_current_profile_is_owner_admin());

drop policy if exists core_application_sections_owner_admin_write on public.core_application_sections;
create policy core_application_sections_owner_admin_write
on public.core_application_sections
for all
to authenticated
using (public.core_current_profile_is_owner_admin())
with check (public.core_current_profile_is_owner_admin());

drop policy if exists core_reservations_owner_admin_write on public.core_reservations;
create policy core_reservations_owner_admin_write
on public.core_reservations
for all
to authenticated
using (public.core_current_profile_is_owner_admin())
with check (public.core_current_profile_is_owner_admin());

drop policy if exists core_financial_ledger_owner_admin_write on public.core_financial_ledger;
create policy core_financial_ledger_owner_admin_write
on public.core_financial_ledger
for all
to authenticated
using (public.core_current_profile_is_owner_admin())
with check (public.core_current_profile_is_owner_admin());

drop policy if exists core_events_owner_admin_insert on public.core_events;
create policy core_events_owner_admin_insert
on public.core_events
for insert
to authenticated
with check (public.core_current_profile_is_owner_admin());

drop policy if exists core_audit_log_owner_admin_insert on public.core_audit_log;
create policy core_audit_log_owner_admin_insert
on public.core_audit_log
for insert
to authenticated
with check (public.core_current_profile_is_owner_admin());

drop policy if exists core_proposed_actions_owner_admin_write on public.core_proposed_actions;
create policy core_proposed_actions_owner_admin_write
on public.core_proposed_actions
for all
to authenticated
using (public.core_current_profile_is_owner_admin())
with check (public.core_current_profile_is_owner_admin());

comment on table public.core_profiles is
  'Internal profile context. First-wave RLS: owner/admin read all; staff reads own active profile; no anonymous/customer access.';
comment on table public.core_applications is
  'Prospective buyer/family application header. First-wave RLS allows authenticated internal staff-or-above reads only; writes remain controlled.';
comment on table public.core_application_sections is
  'Application answer sections. First-wave RLS allows authenticated internal staff-or-above reads only; writes remain controlled.';
comment on table public.core_audit_log is
  'Append-oriented audit ledger. First-wave RLS allows owner/admin reads only; writes remain controlled backend/RPC activity.';
