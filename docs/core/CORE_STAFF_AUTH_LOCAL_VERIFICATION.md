# Core Staff Auth Local Verification

## Purpose

This document explains how to verify the local/development staff auth foundation added in commit `bd5c019`.

It is local/dev only. Do not use production data, production credentials, real customer emails, live Zoho, Twilio, payment processor, email sending, documents, Home Assistant, or cameras.

## What Exists

- `/login` provides a minimal staff email/password sign-in page.
- `/staff` requires a Supabase Auth session and an active staff `core_profiles` row.
- `/` is non-sensitive and does not display Core dashboard data.
- `requireStaffProfile()` maps `auth.users.id` to `core_profiles.auth_user_id`.
- Because RLS is not enabled yet, the profile lookup uses the service role server-side as a transitional bridge.
- Existing dashboard write actions now use the authenticated staff profile ID as the RPC actor.

## Required Local Environment Variables

Set these in `.env.local` for local verification. Do not commit `.env.local`, paste secret values into docs, or paste service role keys into chat.

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

For local Supabase, get the URL, anon key, and service role key from:

```bash
supabase status
```

Use local/dev values only.

`CORE_APPROVAL_ACTOR_PROFILE_ID` is no longer required for the staff dashboard approval, reservation, payment, or cancellation actions. Those actions use the authenticated mapped staff profile.

## Create A Local Supabase Auth User

1. Start local Supabase if it is not running:

```bash
supabase start
```

2. Open local Supabase Studio. The local Studio URL is shown by `supabase status`.

3. Go to Authentication -> Users.

4. Add a local test staff user with a fake/local email, such as an `example.invalid` address.

5. Set a local-only password. Do not put the password in docs, Git, or chat.

6. Copy the created user's UUID from the Auth user record. This is the `auth.users.id` value.

## Map The Auth User To A Core Staff Profile

Run the helper from Git Bash, replacing the UUID with the local Auth user UUID:

```bash
cat scripts/map-local-staff-auth-user.sql | docker exec -i supabase_db_core1 psql -U postgres -d postgres -v ON_ERROR_STOP=1 -v auth_user_id="PASTE-LOCAL-AUTH-USER-UUID-HERE" -v staff_email="local.staff@example.invalid" -v staff_display_name="Local Staff Auth User" -v staff_role="owner"
```

The helper upserts the deterministic local staff profile:

```text
70000000-0000-0000-0000-000000000001
```

It marks the profile active, assigns the requested staff role, and stores `local_dev_only = true` in metadata. It does not create an Auth user and does not store a password.

Allowed local staff roles:

- `owner`
- `admin`
- `staff`

## Confirm `/staff` Is Blocked When Logged Out

1. Start the app:

```bash
npm run dev
```

2. Open:

```text
http://localhost:3000/staff
```

Expected result when logged out:

```text
/login?next=/staff
```

The dashboard should not render while logged out.

## Confirm `/staff` Loads When Logged In

1. Open:

```text
http://localhost:3000/login
```

2. Sign in with the local Auth test user created above.

3. After sign-in, `/staff` should load.

Expected visible indicators:

- The blue staff workspace banner appears.
- The banner says the user is signed in and shows the mapped staff role.
- Dashboard data renders below the banner.
- The page still warns that selected real data remains blocked until action actor mapping and authorization are verified.

## Confirm Unauthorized Users Are Blocked

To test an authenticated user without a Core staff profile:

1. Create a second local Auth user in Supabase Studio.
2. Do not map it to `core_profiles.auth_user_id`.
3. Sign in as that user.
4. Open `/staff`.

Expected result:

```text
/login?error=unauthorized
```

## Current Constraints

- RLS is not enabled.
- Staff profile lookup uses the service role server-side as a transitional bridge.
- Dashboard approval, reservation, deposit/payment, and cancellation actions use the authenticated staff profile as the RPC actor.
- Per-action role checks are implemented for the current dashboard actions.
- Selected real-data staging remains blocked.

## Next Recommended Task

Manually verify the authenticated staff actions, then design RLS and selected-real-data staging checks. Do not import selected real data until owner-approved staging boundaries are verified.
