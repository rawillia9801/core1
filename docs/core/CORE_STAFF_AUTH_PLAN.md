# Core Staff Auth And Access Boundary Plan

## Purpose

This document defines the recommended staff authentication and access-boundary plan for Core Phase 2. It is a planning checkpoint only.

Do not treat this as complete production security. The first staff auth foundation exists, but RLS, production authorization hardening, and selected-real-data staging are still blocked.

## Current Unsafe State

Core currently proves the local/development workflow, but it is not safe for staff staging or production use yet.

- The root route is now a non-sensitive landing page.
- The staff dashboard foundation is available at `/staff` and requires a Supabase Auth user mapped to an active staff `core_profiles` row.
- Server-side dashboard reads currently use the Supabase service-role key.
- Dashboard server actions for approval, reservation creation, deposit/payment recording, and reservation cancellation now use the authenticated staff profile ID as the RPC actor.
- Current dashboard actions have initial role checks, but the access model still needs manual verification before selected-real-data staging.
- RLS is deferred and is not production-ready for live client exposure.
- The dashboard actions are local/development-only workflow foundations.
- The guarded intake API is separately protected by a shared local/dev secret, not by a full live Zoho integration or staff auth model.

## Recommended Phase 2 Staff Auth Approach

Use Supabase Auth for the first staff authentication boundary.

Recommended identity mapping:

- `auth.users.id` maps to `core_profiles.auth_user_id`.
- Staff access requires a matching `core_profiles` row.
- `core_profiles.status` must be `active`.
- Initial allowed staff roles are `owner`, `admin`, and `staff`.
- Buyer/family portal authentication should remain separate and later. Do not mix customer portal access rules into the first staff dashboard boundary.

This keeps the first security step focused: authenticated internal staff only.

## Current Auth Foundation Implemented

The repository now includes the smallest staff auth foundation:

- Supabase Auth packages are installed: `@supabase/supabase-js` and `@supabase/ssr`.
- `src/lib/supabase/server.ts` creates a server-side Supabase Auth client using `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and request cookies.
- `src/lib/staff-auth.ts` provides `requireStaffProfile()`.
- `/login` provides a minimal staff email/password sign-in form.
- `/staff` requires an authenticated Supabase user and active staff `core_profiles` row before rendering the dashboard.
- `/` is intentionally non-sensitive and does not show Core dashboard data.

Because RLS policies are not enabled yet, `requireStaffProfile()` uses the service role server-side only to look up `core_profiles` by `auth_user_id`. This is transitional. It must not be copied into browser code, and it should be narrowed or replaced after RLS policies and server authorization tests exist.

The existing approval, reservation, deposit/payment, and cancellation actions now pass the authenticated staff profile ID to controlled RPCs. The service role is still used server-side for transitional RPC/read access until RLS and production authorization policies exist.

Local verification confirms staff login/profile mapping works and `core_audit_log.actor_profile_id` uses the authenticated staff profile ID `70000000-0000-0000-0000-000000000001` for at least approval and payment recording actions.

## Route And Access Structure

Recommended route shape:

- Keep staff dashboard behavior behind `/staff`.
- Add middleware or a server-side guard that blocks unauthenticated access before staff data is read.
- Keep the intake API separately guarded with integration-specific secret validation.
- Keep public website and customer portal routes separate future work.

The current dashboard should remain local/development-only until action actor mapping, authorization checks, and staging verification exist.

## Server-Side Authorization Pattern

Every server-side read path and write action should follow the same pattern:

1. Get the authenticated Supabase user from the current request/session.
2. Load the active `core_profiles` row by `auth_user_id`.
3. Reject if no active profile exists.
4. Verify the profile role is allowed for the requested action.
5. Pass the real `core_profiles.id` to database RPCs as the actor.
6. Log and return safe errors for unauthenticated or unauthorized requests.

The static `CORE_APPROVAL_ACTOR_PROFILE_ID` pattern is no longer used by the staff dashboard actions and should not be the staging or production actor model.

## Recommended Role Permissions

Initial role model:

- `owner`: all staff dashboard reads and all staff actions, including access management and sensitive financial workflows.
- `admin`: application approval, reservation creation, deposit/payment recording, reservation cancellation, and financial adjustments.
- `staff`: staff dashboard reads, application review, application approval, reservation creation, and possibly deposit/payment recording.

Before selected-real-data staging, consider making these actions admin/owner-only:

- Reservation cancellation.
- Financial adjustment, including refunds, chargebacks, fees, finance charges, credits, and neutral adjustments.
- Any action that affects customer-visible financial or go-home state.

## Service-Role Usage Direction

The service-role key must remain backend-only.

- Never expose the service-role key to the browser.
- Do not use the service-role key as a substitute for staff authorization.
- Reduce broad service-role reads before staging where practical.
- Document any temporary staging-only server-side service-role reads with an explicit reason and removal path.
- Integration endpoints should use separate secrets, signature validation, or provider-specific verification, not dashboard staff auth alone.

For Phase 2, server-side code may still need privileged database access, but each privileged path should first prove the request came from an authenticated and authorized staff profile.

## RLS Direction

RLS should be designed and tested deliberately after the staff auth boundary is in place.

Recommended direction:

- Deny by default for browser/client access.
- Add staff policies for internal dashboard reads and approved write paths.
- Add buyer/family policies later after the Puppy Portal access model is designed.
- Keep public/anonymous policies minimal and explicit.
- Add helper functions only when the access rules are stable.

Likely helper functions:

- `is_staff()`
- `is_admin()`
- `can_access_family(family_id)`
- `can_view_reservation(reservation_id)`
- `can_manage_financials()`

Do not enable partial RLS casually without rollback-safe policy tests and manual verification.

## Selected Real-Data Staging Prerequisites

Before importing or showing selected real data, all of the following should be true:

- Staff route is protected.
- Supabase Auth sign-in/sign-out works for staff.
- Authenticated users map to active `core_profiles` rows.
- Server-side reads reject unauthenticated users.
- Server actions use the real staff profile actor, not a static local/dev actor.
- Role checks exist before approval, reservation, payment, cancellation, and financial adjustment actions.
- Email, payment processor, Twilio, document generation, and other live side effects remain off.
- Selected-data import scope is approved.
- Staging environment variables are documented without secrets.
- Manual verification steps are written for the staging workflow.

Selected real-data staging remains blocked until these access boundaries exist.

## Minimal Implementation Order

Recommended implementation order:

1. Create a shared server-side auth/profile helper.
2. Add a protected staff route or route group.
3. Add staff login and sign-out paths.
4. Map the Supabase session user to `core_profiles.auth_user_id`.
5. Replace static actor env usage in server actions with the authenticated profile actor. Completed for approval, reservation creation, deposit/payment recording, and reservation cancellation.
6. Add role checks to dashboard reads and server actions. Initial checks are in place for current dashboard actions; broader read authorization and future actions still need review.
7. Add manual verification steps for unauthenticated, unauthorized, and authorized staff paths.
8. Plan RLS policy tests.
9. Only then plan selected-real-data staging.

## Risks And Open Decisions

- Supabase Auth is recommended, but the owner should confirm it before implementation.
- Final staff role definitions may need adjustment once real staff workflow expectations are reviewed.
- Financial adjustment and cancellation actions should likely be admin/owner-only for the first staging pass.
- Vercel password protection may still be useful as an extra staging gate, but it should not replace real app authorization.
- The exact selected real-data scope must be approved before import.
- Production RLS timing should be planned after staff auth and staging read/write paths are verified.
- Customer/family portal auth should remain a separate design task.

## Next Recommended Task

Continue the staff authentication boundary from this plan:

1. Verify unauthorized role behavior, especially staff cancellation with puppy release.
2. Review read authorization beyond the protected `/staff` route.
3. Design and test RLS policies.
4. Prepare selected-real-data staging only after access checks are reviewed.

Do not import selected real data until those pieces are working and manually verified.
