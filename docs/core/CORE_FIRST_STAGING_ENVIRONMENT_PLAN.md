# Core First Staging Environment Plan
## Status Note

- Current as of this pass: blocked planning document.
- Reflects future selected-real-data staging setup only; no staging environment, production launch, or live integration is complete.
- Central current truth: `CORE_STAGING_READINESS_CHECKLIST.md`, `CURRENT_STATUS.md`, and `IMPLEMENTATION_CHECKLIST.md`.


## Purpose

This plan describes the first selected-real-data staging environment for Cherolee Core.

This is not a feature-building task, UI task, production launch, live integration setup, Zoho task, or real-data import task. It is a concrete setup plan for a safe staging environment that can later receive one or two owner-approved Core-native real application records after all gates are satisfied.

No selected real data should be staged until the staging environment, readiness checklist, exact records, exact fields, Core-native setup method, verification checklist, and rollback plan are owner-approved.

## Recommended Staging Environment Shape

Recommended first shape:

- App hosting: Vercel staging or preview deployment from the Core repository.
- Database/Auth: a separate Supabase project for staging.
- Staff access: Supabase Auth with mapped `core_profiles.auth_user_id` rows.
- Data scope: no real data by default.

Vercel is a good fit for the first staging environment because the app is a Next.js project and can use environment-scoped variables without committing secrets. If another deployment target is chosen, it must provide equivalent private environment-variable storage, HTTPS, deployment rollback, and access-control review.

Staging must not share the local/development database because local resets, fake seed helpers, and experimental records are normal in development. Staging must also not use production data by default because the first goal is to verify access boundaries, not perform a migration.

## Required Staging Services

The first staging environment needs only:

- App hosting.
- Separate Supabase project/database.
- Supabase Auth enabled.
- Staff Auth users created for approved test users.
- `core_profiles.auth_user_id` mappings for those staff users.
- Environment variables configured in the hosting environment.

Do not enable live integrations:

- No Zoho workflow of any kind.
- No Twilio.
- No email sending.
- No payment processor.
- No document generation.
- No signatures.
- No customer portal.
- No public website replacement.
- No automations or AI writes.
- No Home Assistant or cameras.

## Required Environment Variables

Configure these in the staging hosting environment. List names only in docs; never commit values.

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
CORE_INTAKE_SECRET
```

`CORE_INTAKE_SECRET` is not part of the active staging lane unless a separate non-Zoho guarded intake test is explicitly approved. It must not be used for Zoho webhook traffic.

Rules:

- `SUPABASE_SERVICE_ROLE_KEY` is server-only.
- Secrets must live in hosting environment settings, not in Git.
- `.env.local` must not be committed.
- Do not paste secret values into docs, chat, screenshots, or issue comments.
- Browser/client code must not receive the service-role key.

## Deployment Safety Rules

Before staging receives any real data:

- `/staff` must require login.
- `/login` must work.
- `/` must remain non-sensitive.
- Dashboard reads must require authenticated staff context.
- Owner/admin sensitive panel access must remain owner/admin only.
- Staff restricted-read behavior must remain active.
- There must be no public dashboard exposure.
- The staging URL should not be advertised publicly.

Optional extra guard:

- Use deployment-level protection, such as Vercel preview protection, as an additional staging gate. This must not replace app-level staff authentication.

## Database Setup Plan

1. Create a separate staging Supabase project.
2. Apply the current Core migrations to the staging database.
3. Do not load fake local workflow data through migrations.
4. Do not run `scripts/seed-local-core-workflow.sh` in staging unless explicitly approved and clearly fake.
5. Do not commit staging seed files containing real data.
6. Create staging staff Auth users manually or through approved admin steps.
7. Map staging Auth user IDs to `core_profiles.auth_user_id`.
8. Verify `owner`, `admin`, and `staff` roles.
9. Verify inactive and unmapped users are blocked.

The staging database should begin empty except for schema, explicitly created staff profiles, and any clearly approved staging verification records.

## Integration Lockout

These must remain off:

- Live Zoho webhook.
- Recurring Zoho sync.
- Twilio/SMS/calls.
- Email sending.
- Payment processor.
- Document generation.
- Signature provider.
- Customer portal.
- Public website replacement.
- Automations or AI writes.
- Home Assistant.
- Cameras.
- Smart mirror/display automations.
- Production writeback to any external system.

## First Staging Verification Steps Before Real Data

Before staging even one selected real application:

1. Deploy the app to the staging target.
2. Configure staging environment variables in hosting settings.
3. Apply migrations to the staging Supabase database.
4. Create and map at least one owner/admin staff profile.
5. Create and map one staff profile if staff-read-scope verification is part of the test.
6. Verify `/staff` redirects when logged out.
7. Verify `/login` works.
8. Verify owner/admin sees the full dashboard.
9. Verify staff sees the restricted operational dashboard.
10. Verify staff cannot see financial ledger activity, full audit/activity rows, phone lookup safety, or the general event feed.
11. If dashboard actions are tested with fake data, verify audit actor attribution uses the authenticated staff profile.
12. Confirm no live side effects occur.

Use fake data only for this pre-real-data verification.

## First Real-Data Dry-Run Plan

Sequence:

1. Run a local dry run first with the exact selected payload shape.
2. Use one or two owner-approved real application records only.
3. Exclude payments, documents, messages, Twilio records, customer portal records, and unrelated modules.
4. Review field sensitivity before staging.
5. Confirm owner/admin-only fields.
6. Confirm staff-visible fields.
7. Review results locally as owner/admin before staff visibility.
8. Only after approval, repeat the controlled Core-native setup in staging.

Do not connect a live Zoho webhook. Do not use Zoho export, sync, writeback, import, or dry-run import as the staging path.

## Rollback Plan

If anything is wrong:

- Delete staging records or reset the staging database.
- Remove or rotate staging environment variables if exposure is suspected.
- Disable the staging deployment if route exposure appears.
- Stop any selected-record staging workflow immediately.
- Confirm no customer contact occurred.
- Confirm no payment, document, message, or notification was triggered.
- Confirm no production record or Zoho record was modified.

Rollback must be owner-approved before first selected-record staging.

## Go / No-Go Checklist

Required approvals before first selected-real-data staging:

- [ ] Owner approves the staging environment.
- [ ] Owner approves exact selected records.
- [ ] Owner approves exact selected fields.
- [ ] Owner approves staff-visible fields.
- [ ] Owner approves owner/admin-only fields.
- [ ] Owner approves Core-native staging method.
- [ ] Owner approves readiness checklist.
- [ ] Owner approves verification checklist.
- [ ] Owner approves rollback plan.

Hard blockers:

- [ ] Staging database is not separate.
- [ ] `/staff` is reachable without login.
- [ ] Staff can see restricted sensitive panels.
- [ ] Secrets are in Git, docs, chat, screenshots, or client code.
- [ ] Zoho/Twilio/email/payment/document/customer portal behavior is enabled.
- [ ] Selected records or fields are not owner-approved.
- [ ] Import method requires committing real data.
- [ ] RLS is being treated as complete when it is still deferred.

## What Remains Deferred

- RLS implementation and policy tests.
- Zoho integration.
- Twilio integration.
- Email sending.
- Payment processor.
- Documents and signatures.
- Customer portal.
- Public website replacement.
- Broader real-data migration.
- Production launch.

## Current Status

This plan exists as a staging setup guide.

No deployment has been performed by this plan.

No selected real data has been staged.

Selected-real-data staging remains blocked until the staging environment and readiness checklist are satisfied and owner-approved.
