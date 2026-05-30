# Cherolee Core Current Status

## Purpose

This document is the current steering checkpoint for Core. It records what is actually implemented, what has been verified, what is unverified, and what must remain blocked so the project does not drift.

Active repository:

```text
rawillia9801/core1
```

Active local working folder:

```text
C:/Users/rawil/core1
```

Active branch:

```text
main
```

The duplicate OneDrive checkout is not the working repository for Core tasks.

## Current Verified Local Workflow

Core has a verified local/development workflow:

```text
Core-native private application entry
  -> application review
  -> application approval
  -> reservation creation
  -> deposit/payment ledger entry
  -> visible ledger-derived balance reduction
```

Verified local behavior:

- `/login` works for the local mapped owner profile.
- `/staff` loads for the active owner profile.
- `/staff/applications/new` creates a Core-native application without Zoho.
- The application appears in `/staff`.
- The application can be approved.
- A reservation can be created from the approved application.
- Deposit/payment entries can be recorded through the controlled dashboard action.
- Ledger-derived balance decreases correctly after payment/deposit.
- Current dashboard write actions use authenticated staff profile actor context rather than static local actor env usage.

## Current Verified Communications Workflow

Core also has a verified preview-only communication foundation:

```text
Core-native application entry
  -> queue application_received notification
  -> preview in /staff/notifications
  -> seeded draft templates visible
  -> disabled/preview provider boundary exists
```

Verified local behavior:

- `core_queue_notification(...)` exists and queues notification rows.
- `/staff/notifications` exists and is owner/admin only.
- Staff-role users are blocked from the notification preview page.
- Creating a Core-native application with an applicant email queues a preview-only `application_received` notification.
- `/staff/notifications` displays the queued notification preview.
- The queued notification keeps `sent_at = null`.
- Seeded draft email templates display in `/staff/notifications`.
- The template seed migration was applied locally.
- The template seed rollback-safe SQL test passed locally for all 9 templates.
- All 9 templates are `draft`, `preview_only = true`, `send_enabled = false`, and `provider_connected = false`.
- The disabled/preview email provider foundation was pulled locally and `npm run lint` passed.

## Email Template Keys Verified

The current seeded email template keys are:

- `application_received`
- `application_approved`
- `reservation_created`
- `payment_received`
- `payment_reminder`
- `reservation_cancelled`
- `go_home_reminder`
- `document_ready`
- `staff_alert`

These are reusable draft template records only. Template existence never authorizes sending.

## Recently Added But Not Yet Verified Locally

The delivery-attempt foundation has been added to GitHub:

- `supabase/migrations/20260526300000_core_notification_delivery_attempts.sql`
- `supabase/tests/core_notification_delivery_attempts_tests.sql`

This adds the future audit/log table:

```text
core_notification_delivery_attempts
```

Current status of this piece:

- Added in GitHub.
- Not yet confirmed by local command output in chat.
- Does not send email.
- Does not connect Hostinger SMTP.
- Does not connect Resend.
- Does not add credentials.
- Does not add provider packages.
- Does not add send buttons.
- Does not mark notifications as sent.

The next local validation for this piece is:

```bash
cd /c/Users/rawil/core1
git pull
cat supabase/migrations/20260526300000_core_notification_delivery_attempts.sql | docker exec -i supabase_db_core1 psql -U postgres -d postgres -v ON_ERROR_STOP=1
cat supabase/tests/core_notification_delivery_attempts_tests.sql | docker exec -i supabase_db_core1 psql -U postgres -d postgres -v ON_ERROR_STOP=1
npm run lint
```

Do not run `supabase db reset --local` for this validation.

## Current Database Foundations

Implemented Core database foundations include:

- Core V1 canonical model for buyers, families, applications, application sections, dogs, litters, puppies, reservations, financial ledger, receipts, documents, communications, events, audit logs, integration events, and future tool-safety foundations.
- `core_create_application_manual(...)` for Core-native private application creation.
- `core_approve_application(...)` for controlled approval.
- `core_create_reservation(...)` for controlled reservation creation.
- `core_record_reservation_payment(...)` for posted deposit/payment entries only.
- `core_record_financial_adjustment(...)` for ledger-only local/dev credits, refunds, chargebacks, fees, finance charges, and neutral adjustments.
- `core_cancel_reservation(...)` for guarded cancellation with explicit puppy release behavior.
- `core_queue_notification(...)` for queue-only notifications.
- Email template seed records.
- Disabled/preview email provider module.
- Delivery-attempt table foundation added in GitHub, pending local verification.

## Current Auth And Access Boundary

Implemented staff auth/access pieces:

- Supabase Auth packages installed.
- `/login` provides staff email/password sign-in.
- `/staff` requires an authenticated Supabase user mapped to an active `core_profiles` staff profile.
- `/` is a non-sensitive landing page.
- Dashboard reads require authenticated active staff context before broad service-role reads run.
- Owner/admin users keep full current dashboard read surface.
- Staff users keep operational dashboard access but do not fetch or see financial ledger activity, full audit/activity rows, phone lookup safety, or the general event feed.
- Owner/admin/staff dashboard read scopes were manually verified locally with the role helper.

Still incomplete:

- RLS policies and policy tests.
- Staging/production security boundary.
- Admin/staff role assignment workflow.
- Real field visibility review before selected-real-data staging.

## Still Not Connected Live

The following remain intentionally disconnected:

- Hostinger SMTP.
- Resend.
- Any real email sending.
- Email send buttons.
- Automatic customer email delivery.
- Twilio.
- Zoho live webhook/writeback.
- Payment processor.
- Document generation/signature provider.
- Customer portal.
- Public `/apply`.
- Production data import.
- Home Assistant, cameras, smart mirror, and automations.

## Correct Non-Drift Lane

Current lane:

```text
queue-only notifications
  -> seeded draft templates
  -> owner/admin preview page
  -> disabled/preview provider boundary
  -> delivery-attempt log table verification
  -> preview/blocked attempt logging workflow
  -> show attempt logs in /staff/notifications
  -> define staff-approved vs automatic communication rules
  -> test-send-to-owner later
  -> Hostinger SMTP later, disabled by default
```

Do not jump to live SMTP, customer emails, public forms, portal, documents, payment processor, or UI polish until the safety gates are complete.

## Current Recommended Next Task

1. Locally verify the delivery-attempt foundation.
2. Checkpoint the verification in docs.
3. Then add preview/blocked attempt logging helper.

No live email work should happen yet.

## Time Estimate

This estimate is corrected to separate a minimal customer-facing step from a full customer-facing Core replacement.

```text
Local internal foundation:                  1-2 weeks
Staff-only staging:                        3-6 weeks total
Internal production staff use:             2-3 months total
Minimal customer-facing application path:  about 2 months if tightly scoped
Full customer-facing Core replacement:     4-6+ months total
```

The 2-month estimate applies only to a tightly scoped customer-facing path such as public application intake plus limited email/preview safety, not the full portal/documents/payments/signatures replacement.
