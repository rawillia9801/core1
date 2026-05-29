-- Local/development helper for mapping a Supabase Auth user to a Core staff profile.
--
-- This is not a migration and must not be used for production data import.
-- It does not create an auth user or store a password. Create the local Auth
-- user in Supabase Studio first, then pass its auth.users.id as auth_user_id.

\set ON_ERROR_STOP on

\if :{?auth_user_id}
\else
  \echo 'Missing required psql variable: auth_user_id'
  \echo 'Usage: cat scripts/map-local-staff-auth-user.sql | docker exec -i supabase_db_core1 psql -U postgres -d postgres -v ON_ERROR_STOP=1 -v auth_user_id="<auth-user-uuid>"'
  \quit 1
\endif

\if :{?staff_email}
\else
  \set staff_email 'local.staff@example.invalid'
\endif

\if :{?staff_display_name}
\else
  \set staff_display_name 'Local Staff Auth User'
\endif

\if :{?staff_role}
\else
  \set staff_role 'owner'
\endif

create temp table core_local_staff_auth_input as
select
  :'auth_user_id'::uuid as auth_user_id,
  :'staff_email'::text as staff_email,
  :'staff_display_name'::text as staff_display_name,
  lower(btrim(:'staff_role'::text)) as staff_role;

do $$
declare
  v_auth_user_id uuid;
  v_staff_email text;
  v_staff_display_name text;
  v_staff_role text;
begin
  select
    auth_user_id,
    staff_email,
    staff_display_name,
    staff_role
  into
    v_auth_user_id,
    v_staff_email,
    v_staff_display_name,
    v_staff_role
  from core_local_staff_auth_input;

  if v_staff_role not in ('owner', 'admin', 'staff') then
    raise exception 'staff_role must be owner, admin, or staff';
  end if;

  insert into public.core_profiles (
    id,
    auth_user_id,
    display_name,
    email,
    role,
    status,
    metadata
  )
  values (
    '70000000-0000-0000-0000-000000000001',
    v_auth_user_id,
    v_staff_display_name,
    v_staff_email,
    v_staff_role,
    'active',
    jsonb_build_object(
      'local_dev_only', true,
      'mapped_by', 'scripts/map-local-staff-auth-user.sql'
    )
  )
  on conflict (id) do update
  set
    auth_user_id = excluded.auth_user_id,
    display_name = excluded.display_name,
    email = excluded.email,
    role = excluded.role,
    status = 'active',
    metadata = public.core_profiles.metadata || excluded.metadata,
    updated_at = now();
end;
$$;

drop table core_local_staff_auth_input;

select
  id,
  auth_user_id,
  display_name,
  email,
  role,
  status
from public.core_profiles
where id = '70000000-0000-0000-0000-000000000001';
