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

Core is the active operating system, daily command layer, and future decision assistant for Southwest Virginia Chihuahua. This is currently a one-person owner-operated business: Cristy is the owner/operator and final authority. Future helpers may be added later only if needed, but the product direction should not pretend there is a staff team.

The existing `/staff` routes may remain as technical route names for now so the application does not break. Product language should increasingly use Owner Console, Operator Dashboard, Core Command Center, Core OS, Core Assistant, owner/operator, and command center framing where appropriate.

Zoho One has been cancelled. Zoho is historical reference only. Zoho must not be treated as an import source, migration source, bridge, compatibility workflow, sync target, writeback target, dry-run import lane, planned dependency, future dependency, or active part of Core.

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
  -> go-home checklist item SQL verification
  -> kennel dog/litter/puppy create RPC verification
  -> kennel dog/litter/puppy add/edit/archive browser verification
  -> buyers/families/events read-only owner/operator workspaces
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
- `core_go_home_checklist_items` migration and rollback-safe test were applied/verified locally.
- `core_create_dog(...)`, `core_create_litter(...)`, and `core_create_puppy(...)` were applied and verified locally through the self-contained v2 SQL test.
- The kennel create test confirmed dam, sire, litter, puppy, event, and audit records with rollback.
- `/staff/dogs`, `/staff/litters`, and `/staff/puppies` are built and browser-tested.
- Dog, litter, and puppy add forms create real Core records.
- Dog, litter, and puppy edit/archive pages are built and browser-tested.
- Kennel update/archive SQL verification passed with `event_check = 6` and `audit_check = 6`.
- Obsolete broken kennel tests were removed.
- `/staff/buyers` works as a read-only, real-data-only buyer workspace with no external side effects.
- `/staff/families` works as a read-only, real-data-only family workspace with no external side effects.
- `/staff/events` works as a read-only Events/Audit workspace with no external side effects.
- Events is enabled in the staff sidebar.
- `/staff/phone-lookup` has been added as a read-only owner/admin Phone Lookup Safety workspace using existing Core phone lookup views.
- Phone Lookup is enabled in the staff sidebar.
- `/staff/documents` has been added as a read-only owner/admin document metadata inventory using existing Core document tables.
- Documents is enabled in the staff sidebar.
- `/staff/messages` has been added as a read-only owner/admin communications metadata workspace using existing Core conversation, message, notification, and delivery-attempt tables.
- Messages is enabled in the staff sidebar.
- `/staff/kennel-logs` has been added as a read-only owner/admin kennel event/audit history workspace.
- Kennel Logs is enabled in the staff sidebar.
- `/staff/messages` and `/staff/kennel-logs` schema references were cross-checked against migrations after implementation.
- `/staff/command` has been added as a read-only Command Console shell. It does not replace `/staff`.
- `/staff/proposed-actions` has been added as a read-only owner/admin Proposed Action Queue review workspace. Approved proposed actions do not execute business changes.
- Local browser verification as a mapped owner confirmed `/staff/messages`, `/staff/kennel-logs`, `/staff/command`, and `/staff/proposed-actions` load after real `/login` sign-in.
- The verified pages remain read-only/review-only where intended and do not connect email, SMS, payments, documents, signatures, public website publishing, customer portal access, AI providers, or external provider calls.

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
- `/staff/go-home` shows go-home counts, scheduled status, readiness lane, upcoming records, checklist form, and checklist records.
- `core_update_go_home_detail(...)` creates or updates an ungrouped reservation go-home detail.
- The go-home update RPC writes `core_events` and `core_audit_log`.
- The go-home update RPC performs no email, SMS, document, payment, transport, or external integration action.
- `/staff/go-home` has an owner/admin-only Set Go-Home Detail form.
- Staff-role users can view the page but cannot update go-home details.
- `core_go_home_checklist_items` table foundation exists.
- `core_upsert_go_home_checklist_item(...)` controlled checklist item RPC exists.
- Go-home checklist rollback-safe SQL test passed locally.
- Go-home checklist UI is wired into `/staff/go-home`.

Known cleanup:

- The known go-home unused variable warning was removed.

## Current Kennel Records Workflow Status

Implemented and verified:

- `core_create_dog(...)` creates real Core dog records.
- `core_create_litter(...)` creates real Core litter records and can link sire/dam.
- `core_create_puppy(...)` creates real Core puppy records and can link to a litter.
- Kennel create RPCs write `core_events` and `core_audit_log`.
- Kennel create RPCs perform no customer messages, documents, payments, public website updates, or external integration actions.
- Self-contained v2 rollback-safe kennel create test passed locally with `dam_check = 1`, `sire_check = 1`, `litter_check = 1`, `puppy_check = 1`, `event_check = 4`, and `audit_check = 4`.
- `/staff/dogs` exists and reads real `core_dogs` records only.
- `/staff/dogs/new` exists and creates real dog records through `createDog` -> `core_create_dog(...)`.
- `/staff/litters` exists and reads real `core_litters`, `core_dogs`, and `core_puppies` records only.
- `/staff/litters/new` exists and creates real litter records through `createLitter` -> `core_create_litter(...)`.
- `/staff/puppies` exists and reads real `core_puppies` records only.
- `/staff/puppies/new` exists and creates real puppy records through `createPuppy` -> `core_create_puppy(...)`.
- Dogs, Litters, and Puppies are enabled in the staff sidebar.
- Kennel create actions are owner/admin only.
- Kennel add/edit/archive loop has been browser-tested.
- Kennel update/archive verification passed with `event_check = 6` and `audit_check = 6`.
- Obsolete broken kennel tests were removed.

No kennel staff page creates customer messages, documents, payments, public website updates, or external integration actions.

## Current Buyer, Family, And Event Workspace Status

Implemented and verified:

- `/staff/buyers` works.
- `/staff/families` works.
- `/staff/events` works.
- Events is enabled in the staff sidebar.
- Buyers and Families are read-only, real-data-only staff workspaces.
- Events/Audit is read-only.
- These pages perform no external side effects: no Zoho, Twilio, email, payment, document, portal, public website, or customer-contact action.
- Owner/admin audit visibility remains restricted.

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
- `core_go_home_checklist_items` and `core_upsert_go_home_checklist_item(...)` for operational go-home checklist items.
- `core_create_dog(...)`, `core_create_litter(...)`, and `core_create_puppy(...)` for real owner/admin kennel record creation.
- `core_proposed_actions` plus `core_create_proposed_action(...)`, `core_approve_proposed_action(...)`, and `core_reject_proposed_action(...)` for proposal/review records only. Approval does not execute the underlying business action.

## Current Auth And Access Boundary

Implemented owner/operator auth/access pieces:

- Supabase Auth packages installed.
- `/login` provides owner/operator email/password sign-in through the existing technical staff-auth route.
- `/staff` requires an authenticated Supabase user mapped to an active `core_profiles` profile.
- `/` is a non-sensitive landing page.
- Dashboard reads require authenticated active staff context before broad service-role reads run.
- Owner/admin users keep full current dashboard read surface.
- Future helper/staff-role users keep operational dashboard access but do not fetch or see financial ledger activity, full audit/activity rows, phone lookup safety, or the general event feed.
- `/staff/phone-lookup` is restricted to owner/admin; staff-role users see a restricted message and do not fetch phone lookup rows.
- `/staff/documents` is restricted to owner/admin; staff-role users see a restricted message and do not fetch document rows.
- `/staff/messages` is restricted to owner/admin; staff-role users see a restricted message and do not fetch communication rows.
- `/staff/kennel-logs` is restricted to owner/admin; staff-role users see a restricted message and do not fetch kennel history rows.
- `/staff/proposed-actions` is restricted to owner/admin; staff-role users see a restricted message and do not fetch proposal rows.
- `/staff/command` uses role-aware reads; owner/admin can see audit/financial/phone-sensitive summaries while staff does not fetch restricted audit or phone lookup rows.
- Owner/admin/staff dashboard read scopes were manually verified locally with the role helper.
- Go-home detail updates are owner/admin only.
- Go-home checklist updates are allowed for operational staff.
- Dog, litter, and puppy create actions are owner/admin only.

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
- Zoho in any active form, including live webhook, writeback, sync, import, dry-run import, compatibility workflow, or planned dependency.
- Payment processor.
- Document generation/signature provider.
- Customer portal.
- Public `/apply`.
- Production data import.
- Public website publishing from Core.
- Home Assistant, cameras, smart mirror, and automations.

## Correct Non-Drift Lane

Current active lane:

```text
Core-native owner/operator operating system foundation
  -> application/reservation/payment workflow verified
  -> preview-only communication safety verified
  -> go-home detail update verified
  -> go-home checklist SQL/UI wired
  -> kennel dog/litter/puppy create RPCs verified
  -> kennel create forms added
  -> kennel add/edit/archive browser-tested
  -> buyers/families/events read-only owner/operator workspaces verified
  -> Phone Lookup Safety read-only workspace added
  -> Documents read-only workspace added
  -> Messages read-only workspace added
  -> Kennel Logs read-only workspace added
  -> Core Command Console planning doc added
  -> Core Command Console read-only shell added
  -> Proposed Action Approval Model planning doc added
  -> Proposed Action Queue foundation added for proposal/review only
```

Do not jump to live SMTP, customer emails, public forms, portal, documents, payment processor, AI write capability, public website publishing, Zoho tooling, or polish-only work until the relevant safety gates are complete.

## Current Recommended Next Task

1. Continue safe owner/operator workflow verification under existing `/staff` routes.
2. Browser-check `/staff/documents` as owner/admin.
3. Keep the Command Console and Proposed Actions review surfaces read-only until a later approved proposed-action execution task exists.
4. Run `npm run lint` after any implementation changes.

## Future Command Console Planning

`docs/core/CORE_COMMAND_CONSOLE_PLAN.md` exists as a planning document for a future intelligent Core Command Console. It does not mark the console as a live AI operator. No AI provider, model API call, autonomous action, business action execution, or AI write behavior has been added.

`/staff/command` now exists as a read-only shell only. It uses existing Core reads, shows a disabled planning input, summarizes real Core records, and clearly marks AI provider, writes, external systems, and action queues as off.

`docs/core/CORE_PROPOSED_ACTION_APPROVAL_MODEL.md` exists as planning for a future proposed-action lifecycle. The database and read-only staff review foundation now exists, but it is proposal/review only. No AI provider, API, autonomous write, business action execution, external side effect, or approval UI button behavior has been added.

## Time Estimate

This estimate separates a minimal customer-facing step from a full customer-facing Core replacement.

```text
Local internal foundation:                  in progress
Owner/operator staging:                   3-6 weeks total from a stable local checkpoint
Internal production staff use:             2-3 months total from current checkpoint
Minimal customer-facing application path:  about 2 months if tightly scoped
Full customer-facing Core replacement:     4-6+ months total
```

The 2-month estimate applies only to a tightly scoped customer-facing path such as public application intake plus limited email/preview safety, not the full portal/documents/payments/signatures replacement.
