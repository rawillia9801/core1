-- Local/development helper for changing the deterministic Core staff profile
-- access state during staff-auth authorization testing.
--
-- This is not a migration and must not be used for production data import.
-- It does not create Auth users, store passwords, or require secrets in the file.

\set ON_ERROR_STOP on

\if :{?profile_id}
\else
  \set profile_id '70000000-0000-0000-0000-000000000001'
\endif

\if :{?staff_role}
\else
  \set staff_role 'owner'
\endif

\if :{?staff_status}
\else
  \set staff_status 'active'
\endif

\if :{?auth_user_id}
\else
  \set auth_user_id ''
\endif

\if :{?clear_auth_user_id}
\else
  \set clear_auth_user_id 'false'
\endif

create temp table core_local_staff_access_input as
select
  :'profile_id'::uuid as profile_id,
  nullif(:'auth_user_id'::text, '')::uuid as auth_user_id,
  lower(btrim(:'staff_role'::text)) as staff_role,
  lower(btrim(:'staff_status'::text)) as staff_status,
  lower(btrim(:'clear_auth_user_id'::text)) in ('1', 'true', 'yes', 'on') as clear_auth_user_id;

do $$
declare
  v_profile_id uuid;
  v_auth_user_id uuid;
  v_staff_role text;
  v_staff_status text;
  v_clear_auth_user_id boolean;
begin
  select
    profile_id,
    auth_user_id,
    staff_role,
    staff_status,
    clear_auth_user_id
  into
    v_profile_id,
    v_auth_user_id,
    v_staff_role,
    v_staff_status,
    v_clear_auth_user_id
  from core_local_staff_access_input;

  if v_staff_role not in ('owner', 'admin', 'staff') then
    raise exception 'staff_role must be owner, admin, or staff';
  end if;

  if v_staff_status not in ('active', 'inactive') then
    raise exception 'staff_status must be active or inactive';
  end if;

  update public.core_profiles
  set
    auth_user_id = case
      when v_clear_auth_user_id then null
      when v_auth_user_id is not null then v_auth_user_id
      else auth_user_id
    end,
    role = v_staff_role,
    status = v_staff_status,
    metadata = metadata || jsonb_build_object(
      'local_dev_only', true,
      'access_test_state', jsonb_build_object(
        'role', v_staff_role,
        'status', v_staff_status,
        'auth_user_id_cleared', v_clear_auth_user_id
      )
    ),
    updated_at = now()
  where id = v_profile_id;

  if not found then
    raise exception 'core_profiles row % was not found. Run scripts/map-local-staff-auth-user.sql first.', v_profile_id;
  end if;
end;
$$;

drop table core_local_staff_access_input;

select
  id,
  auth_user_id,
  display_name,
  email,
  role,
  status
from public.core_profiles
where id = :'profile_id'::uuid;
