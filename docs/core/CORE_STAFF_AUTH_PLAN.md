# Core Owner/Operator Auth And Access Boundary Plan
## Status Note

- Current as of this pass: active auth/access planning reference.
- Reflects current owner/operator auth direction and transitional staff-route internals; production RLS and staging access boundaries are incomplete.
- Central current truth: `CURRENT_STATUS.md` and `IMPLEMENTATION_CHECKLIST.md`.


## Purpose

This document defines the recommended owner/operator authentication and access-boundary plan for Core Phase 2. The existing code still uses `staff` route and role names as technical internals, but the real-world primary user is Cristy as owner/operator and final authority. It is a planning checkpoint only.

Do not treat this as complete production security. The first internal auth foundation exists, but RLS, production authorization hardening, and selected-real-data staging are still blocked.

## Current Unsafe State

Core currently proves the local/development workflow, but it is not safe for staff staging or production use yet.

- The root route is now a non-sensitive landing page.
- The owner/operator dashboard foundation is available under the existing technical `/staff` route and requires a Supabase Auth user mapped to an active internal `core_profiles` row.
- Server-side dashboard reads currently use the Supabase service-role key, but the dashboard read model now requires an authenticated active staff profile context before broad service-role reads run.
- Role-based read filtering is now in place for the internal dashboard: owner/admin keep the full current read surface, while future-helper/staff users receive operational read panels only.
- Dashboard server actions for approval, reservation creation, deposit/payment recording, and reservation cancellation now use the authenticated staff profile ID as the RPC actor.
- Current dashboard actions have initial role checks, but the access model still needs manual verification before selected-real-data staging.
- RLS is deferred and is not production-ready for live client exposure.
- The dashboard actions are local/development-only workflow foundations.
- The historical guarded intake API was separately protected by a shared local/dev secret. It is not part of an active Zoho integration or owner/operator auth path.

## Recommended Phase 2 Owner/Operator Auth Approach

Use Supabase Auth for the first internal owner/operator authentication boundary.

Recommended identity mapping:

- `auth.users.id` maps to `core_profiles.auth_user_id`.
- Staff access requires a matching `core_profiles` row.
- `core_profiles.status` must be `active`.
- Initial allowed staff roles are `owner`, `admin`, and `staff`.
- Buyer/family portal authentication should remain separate and later. Do not mix customer portal access rules into the first owner/operator dashboard boundary.

This keeps the first security step focused: authenticated internal owner/operator use, with future-helper roles only if explicitly needed.

## Current Auth Foundation Implemented

The repository now includes the smallest internal auth foundation:

- Supabase Auth packages are installed: `@supabase/supabase-js` and `@supabase/ssr`.
- `src/lib/supabase/server.ts` creates a server-side Supabase Auth client using `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and request cookies.
- `src/lib/staff-auth.ts` provides `requireStaffProfile()`.
- `/login` provides a minimal staff email/password sign-in form.
- `/staff` requires an authenticated Supabase user and active staff `core_profiles` row before rendering the dashboard.
- `/` is intentionally non-sensitive and does not show Core dashboard data.

Because RLS policies are not enabled yet, `requireStaffProfile()` uses the service role server-side only to look up `core_profiles` by `auth_user_id`. This is transitional. It must not be copied into browser code, and it should be narrowed or replaced after RLS policies and server authorization tests exist.

The existing approval, reservation, deposit/payment, and cancellation actions now pass the authenticated internal profile ID to controlled RPCs. The dashboard read model also requires the authenticated internal profile before service-role reads run. Owner/admin users can see the full current dashboard. Future-helper/staff users do not fetch or see sensitive financial ledger activity, full audit/activity rows, phone lookup details, or the general event feed. The service role is still used server-side for transitional RPC/read access until RLS and production authorization policies exist.

Local verification confirms staff login/profile mapping works and `core_audit_log.actor_profile_id` uses the authenticated staff profile ID `70000000-0000-0000-0000-000000000001` for at least approval and payment recording actions.

`scripts/set-local-staff-profile-access.sql` can be used in local/dev to switch the deterministic mapped staff profile between `owner`, `admin`, `staff`, `active`, `inactive`, and temporarily unmapped states for authorization testing. It does not create Auth users or store passwords.

Manual read-scope verification confirms:

- `owner` active sees the full dashboard.
- `admin` active sees the full dashboard.
- `staff` active sees operational panels only.
- `staff` active sees owner/admin restriction notes for financial ledger activity, full audit/activity, phone lookup safety, and the general event feed.
- The staff role does not fetch or display those sensitive datasets.
- The local mapped profile was restored to `owner` active after verification.

## Route And Access Structure

Recommended route shape:

- Keep owner/operator dashboard behavior behind the existing technical `/staff` route.
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

The static `CORE_APPROVAL_ACTOR_PROFILE_ID` pattern is no longer used by the internal dashboard actions and should not be the staging or production actor model.

## Recommended Role Permissions

Initial role model:

- `owner`: all owner/operator dashboard reads and all internal actions, including access management and sensitive financial workflows.
- `admin`: all current owner/operator dashboard reads, application approval, reservation creation, deposit/payment recording, reservation cancellation, and financial adjustments.
- `staff`: operational dashboard reads, application review, application approval, reservation creation, and deposit/payment recording. Staff cannot see sensitive financial ledger activity, full audit/activity rows, phone lookup details, or the general event feed during the Phase 2 bridge.

Before selected-real-data staging, consider making these actions admin/owner-only:

- Reservation cancellation.
- Financial adjustment, including refunds, chargebacks, fees, finance charges, credits, and neutral adjustments.
- Any action that affects customer-visible financial or go-home state.

## Service-Role Usage Direction

The service-role key must remain backend-only.

- Never expose the service-role key to the browser.
- Do not use the service-role key as a substitute for staff authorization.
- Reduce broad service-role reads before staging where practical. Current staff role filtering avoids fetching owner/admin-only financial, audit, phone lookup, and general event-feed datasets for staff users.
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
- The owner/operator dashboard read model requires authenticated internal profile context before service-role reads run.
- Dashboard read filtering prevents future-helper/staff users from fetching owner/admin-only financial ledger activity, audit/activity rows, phone lookup details, and the general event feed.
- Owner/admin and staff read-scope behavior has been manually verified locally.
- Server actions use the real staff profile actor, not a static local/dev actor.
- Role checks exist before approval, reservation, payment, cancellation, and financial adjustment actions.
- Email, payment processor, Twilio, document generation, and other live side effects remain off.
- Selected-real-data staging scope is approved.
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
6. Add role checks to dashboard reads and server actions. Current dashboard reads require active staff context before service-role access, and staff read scope is limited to operational panels. Future actions and RLS still need review.
7. Add manual verification steps for unauthenticated, unauthorized, and authorized staff paths.
8. Plan RLS policy tests.
9. Only then plan selected-real-data staging.

## Risks And Open Decisions

- Supabase Auth is recommended, but the owner should confirm it before implementation.
- Final future-helper/staff role definitions may need adjustment once real owner/operator workflow expectations are reviewed.
- Financial adjustment and cancellation actions should likely be admin/owner-only for the first staging pass.
- Owner/operator-visible application details should be reviewed against owner-approved Core-native field content before selected-real-data staging.
- Vercel password protection may still be useful as an extra staging gate, but it should not replace real app authorization.
- The exact selected real-data scope must be approved before staging.
- Production RLS timing should be planned after internal auth and staging read/write paths are verified.
- Customer/family portal auth should remain a separate design task.

## Next Recommended Task

Continue the owner/operator authentication boundary from this plan:

1. Verify unauthorized role behavior, especially staff cancellation with puppy release.
2. Review owner-approved application fields before exposing application details in selected staging.
3. Design and test RLS policies.
4. Prepare selected-real-data staging only after access checks are reviewed and owner-approved.

Do not stage selected real data until those pieces are working and manually verified.
