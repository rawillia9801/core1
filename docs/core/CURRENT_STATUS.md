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

## Current Direction

Core is the active operating system for Southwest Virginia Chihuahua. Zoho One is no longer part of the active build lineup.

Zoho-related code or documentation may remain only as legacy/import compatibility or historical reference. It is not a bridge, dependency, planned sync target, or live workflow.

## Current Verified Local Workflow

Core has a verified local/development workflow:

```text
Core-native private application entry
  -> application review
  -> application approval
  -> reservation creation
  -> deposit/payment ledger entry
  -> visible ledger-derived balance reduction
  -> go-home detail update
  -> effective go-home read model display
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
- `/staff/go-home` loads and displays the Go-Home workspace.
- Owner/admin can save a go-home detail through `/staff/go-home`.
- The saved go-home detail appears back through `core_go_home_effective_view`.
- The go-home update path was locally verified with migration, rollback-safe SQL test, lint, browser load, form save, and visible saved row.

## Current Verified Communications Workflow

Core has a verified preview-only communication foundation:

```text
Core-native application entry
  -> queue application_received notification
  -> preview in /staff/notifications
  -> seeded draft templates visible
  -> disabled/preview provider boundary exists
  -> blocked preview attempt logging exists
```

Verified local behavior:

- `core_queue_notification(...)` exists and queues notification rows.
- `/staff/notifications` exists and is owner/admin only.
- Staff-role users are blocked from the notification preview page.
- Creating a Core-native application with an applicant email queues a preview-only `application_received` notification.
- `/staff/notifications` displays queued notification previews.
- Queued notifications keep `sent_at = null`.
- Seeded draft email templates display in `/staff/notifications`.
- Warm Southwest Virginia Chihuahua email templates were applied locally.
- Warm template rollback-safe SQL test passed locally for all 9 templates.
- All 9 templates are `draft`, `preview_only = true`, `send_enabled = false`, and `provider_connected = false`.
- The disabled/preview email provider foundation exists and lint passes.
- `core_notification_delivery_attempts` exists and is used for blocked preview attempt logging.
- `/staff/notifications` displays delivery attempts.

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

## Current Go-Home Workflow Status

Implemented and verified:

- `core_go_home_groups` for optional shared pickup/delivery appointments.
- `core_go_home_details` for reservation-level current go-home detail.
- One current go-home detail per reservation is enforced.
- `core_go_home_effective_view` resolves group defaults, individual overrides, and ungrouped detail records.
- `/staff/go-home` is enabled in the staff sidebar.
- `/staff/go-home` shows go-home counts, scheduled/unscheduled status, readiness lane, and upcoming records.
- `core_update_go_home_detail(...)` creates or updates an ungrouped reservation go-home detail.
- The go-home update RPC writes `core_events` and `core_audit_log`.
- The go-home update RPC performs no email, SMS, document, payment, transport, or external integration action.
- `/staff/go-home` has an owner/admin-only Set Go-Home Detail form.
- Staff-role users can view the page but cannot update go-home details.

Added but pending local verification:

- `core_go_home_checklist_items` table foundation.
- `core_upsert_go_home_checklist_item(...)` controlled checklist item RPC.

The next task is to add and verify the rollback-safe SQL test for go-home checklist items, then wire checklist item controls into `/staff/go-home`.

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
- `core_notification_delivery_attempts` for blocked/preview delivery logging.
- `core_update_go_home_detail(...)` for controlled go-home detail updates.
- `core_go_home_checklist_items` and `core_upsert_go_home_checklist_item(...)` added in GitHub, pending local test and UI wiring.

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
- Go-home detail updates are owner/admin only.

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
- Zoho live webhook/writeback or sync.
- Payment processor.
- Document generation/signature provider.
- Customer portal.
- Public `/apply`.
- Production data import.
- Home Assistant, cameras, smart mirror, and automations.

## Correct Non-Drift Lane

Current active lane:

```text
Core-native staff operating system foundation
  -> application/reservation/payment workflow verified
  -> preview-only communication safety verified
  -> go-home detail update verified
  -> go-home checklist SQL test next
  -> wire go-home checklist into /staff/go-home next
  -> then continue Core-native staff workflows only
```

Do not jump to live SMTP, customer emails, public forms, portal, documents, payment processor, AI write capability, or UI polish until the relevant safety gates are complete.

## Current Recommended Next Task

1. Add rollback-safe SQL test for `core_upsert_go_home_checklist_item(...)`.
2. Apply and verify `20260526350000_core_go_home_checklist_items.sql` locally.
3. Run the new go-home checklist test locally.
4. Wire checklist item controls into `/staff/go-home`.
5. Run `npm run lint`.

## Time Estimate

This estimate separates a minimal customer-facing step from a full customer-facing Core replacement.

```text
Local internal foundation:                  in progress
Staff-only staging:                        3-6 weeks total from a stable local checkpoint
Internal production staff use:             2-3 months total from current checkpoint
Minimal customer-facing application path:  about 2 months if tightly scoped
Full customer-facing Core replacement:     4-6+ months total
```

The 2-month estimate applies only to a tightly scoped customer-facing path such as public application intake plus limited email/preview safety, not the full portal/documents/payments/signatures replacement.
