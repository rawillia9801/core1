# Core Project Review And Completion Estimate

## Purpose

This document is a non-drifting checkpoint that summarizes where Core is now, what is proven, what is still blocked, and the estimated time remaining by milestone.

It should be read alongside:

- `docs/core/CURRENT_STATUS.md`
- `docs/core/IMPLEMENTATION_CHECKLIST.md`
- `docs/core/KENNEL_FORMS_CHECKPOINT.md`
- `docs/core/CORE_EMAIL_TEMPLATE_PREVIEW_PLAN.md`
- `docs/core/CORE_STAFF_AUTH_PLAN.md`
- `docs/core/CORE_STAGING_READINESS_CHECKLIST.md`

## Current Position

Core is now a Core-native owner/operator operating system foundation. Zoho One is cancelled and must remain historical reference only, not an import source, migration lane, bridge, sync target, writeback target, compatibility workflow, dependency, or future operational path.

The proven local workflow is now broader than application intake:

```text
Core-native private application entry
  -> application review
  -> application approval
  -> reservation creation
  -> deposit/payment ledger entry
  -> visible ledger-derived balance reduction
  -> go-home detail update
  -> effective go-home read model display
  -> go-home checklist SQL/UI foundation
  -> dog/litter/puppy create RPC verification
  -> dog/litter/puppy create forms added
  -> dog/litter/puppy edit/archive browser-tested
  -> buyers/families/events read-only workspaces verified
  -> Phone Lookup Safety read-only workspace added
  -> Documents read-only workspace added
  -> Messages read-only workspace added
  -> Kennel Logs read-only workspace added
  -> Command Console plan added
  -> Command Console read-only shell added
  -> Proposed Action Approval Model plan added
```

The safe communications workflow remains preview-only:

```text
Core-native application entry
  -> queue application_received notification
  -> preview in /staff/notifications
  -> seeded draft templates visible
  -> disabled/preview provider boundary exists
  -> delivery-attempt logging foundation exists
  -> no customer email sending
```

No real email is being sent.

## Proven Locally

The following are implemented and have been manually or test verified in local/development:

- Owner/operator login works locally through the existing technical staff auth route.
- Active mapped owner profile can access `/staff`.
- Core-native private application entry works at `/staff/applications/new`.
- Core-native application entry does not require Zoho.
- Application approval works through controlled RPC/server action.
- Reservation creation works through controlled RPC/server action.
- Deposit/payment recording works through controlled RPC/server action.
- Ledger-derived balance decreases after a payment/deposit.
- `/staff/notifications` displays queued notification previews.
- Core-native application entry queues preview-only `application_received` notifications when applicant email exists.
- Seeded draft email templates display in `/staff/notifications`.
- Warm Southwest Virginia Chihuahua draft email templates were applied and tested locally.
- All 9 email templates remain draft, preview-only, send-disabled, and provider-disconnected.
- Disabled/preview provider module exists.
- Delivery-attempt logging foundation exists and has been verified locally.
- `/staff/go-home` exists.
- `core_update_go_home_detail(...)` was applied and verified locally.
- Go-home detail browser save was verified and displayed back through `core_go_home_effective_view`.
- `core_go_home_checklist_items` and `core_upsert_go_home_checklist_item(...)` were added.
- Go-home checklist SQL test passed locally.
- Go-home checklist controls were wired into `/staff/go-home`.
- `core_create_dog(...)`, `core_create_litter(...)`, and `core_create_puppy(...)` were applied.
- The self-contained v2 kennel create test passed locally with:
  - `dam_check = 1`
  - `sire_check = 1`
  - `litter_check = 1`
  - `puppy_check = 1`
  - `event_check = 4`
  - `audit_check = 4`
  - `ROLLBACK`
- `/staff/dogs`, `/staff/litters`, and `/staff/puppies` read real Core rows only.
- `/staff/dogs/new`, `/staff/litters/new`, and `/staff/puppies/new` create real Core records through owner/admin-only server actions.
- Dogs, Litters, and Puppies are enabled in the existing technical sidebar.
- Dog, litter, and puppy edit/archive pages exist and have been browser-tested.
- Audited kennel update/archive SQL verification passed with `event_check = 6` and `audit_check = 6`.
- Obsolete broken kennel tests were removed.
- `/staff/buyers` works as a read-only, real-data-only workspace with no external side effects.
- `/staff/families` works as a read-only, real-data-only workspace with no external side effects.
- `/staff/events` works as a read-only Events/Audit workspace with no external side effects.
- Events is enabled in the existing technical sidebar.
- `/staff/phone-lookup` has been added as a read-only owner/admin Phone Lookup Safety workspace.
- Phone Lookup is enabled in the staff sidebar.
- `/staff/documents` has been added as a read-only owner/admin document metadata inventory.
- Documents is enabled in the staff sidebar.
- `/staff/messages` has been added as a read-only owner/admin communications metadata workspace.
- Messages is enabled in the existing technical sidebar.
- `/staff/kennel-logs` has been added as a read-only owner/admin kennel event/audit history workspace.
- Kennel Logs is enabled in the existing technical sidebar.
- `docs/core/CORE_COMMAND_CONSOLE_PLAN.md` exists as a planning document only; no AI console has been built.
- `/staff/messages` and `/staff/kennel-logs` schema references were cross-checked after implementation.
- `/staff/command` exists as a read-only Core Command Center shell only. It does not connect an AI provider or replace `/staff`.
- `docs/core/CORE_PROPOSED_ACTION_APPROVAL_MODEL.md` exists as the safety model for owner/operator-approved proposed actions.

## Recently Added / In Progress

The kennel record management loop is now verified locally.

Recently added:

- Visible Add Dog button on `/staff/dogs`.
- Visible Add Litter button on `/staff/litters`.
- Visible Add Puppy button on `/staff/puppies`.
- Owner/admin-only kennel edit/archive server actions in `src/app/staff/kennel-manage-actions.ts`.
- Dog record Edit links on `/staff/dogs`.
- Litter record Edit links on `/staff/litters`.
- Puppy record Edit links on `/staff/puppies`.
- Dog edit page foundation at `/staff/dogs/[dogId]/edit`.

Verified:

- Add Dog, Add Litter, and Add Puppy create real Core records.
- Dog, litter, and puppy edit/archive pages work.
- Kennel update/archive actions write event/audit rows.
- The focused audited kennel update/archive test passed with `event_check = 6` and `audit_check = 6`.
- Obsolete broken kennel tests were removed.

Current delete behavior is intentionally archive-style, not hard deletion:

```text
Dog delete    -> mark inactive
Litter delete -> mark archived
Puppy delete  -> mark unavailable and hidden
```

This avoids accidentally destroying linked history.

## Known Cleanup

- The known `/staff/go-home/page.tsx` unused variable warning was removed.

## Still Not Connected

The following remain intentionally disconnected:

- Hostinger SMTP.
- Resend.
- Any real email sending.
- Email send buttons.
- Automatic customer email delivery.
- Twilio.
- Zoho import, live webhook, bridge, compatibility workflow, writeback, dependency check, dry-run helper, or sync.
- Payment processor.
- Document generation/signature provider.
- Customer portal.
- Public `/apply`.
- Production data import.
- Public website publishing from Core.
- Home Assistant, cameras, smart mirror, and automations.

## Non-Drift Lane

The current lane is Core-native owner/operator workflow completion:

```text
checkpoint verified kennel/buyer/family/event workspaces
  -> Phone Lookup Safety read-only owner/admin workspace added
  -> Documents read-only owner/admin workspace added
  -> Messages read-only owner/admin workspace added
  -> Kennel Logs read-only owner/admin workspace added
  -> Command Console read-only shell added
  -> Proposed Action Approval Model plan added
  -> continue owner/operator Core workflows under existing technical routes
```

Do not jump to live SMTP, customer emails, public forms, portal, documents, payment processor, public website publishing, AI write capability, or unrelated integrations until the matching safety gates are complete.

## Recommended Next 7 Tasks

1. **Browser-check Messages and Kennel Logs**
   - Confirm `/staff/messages` loads for owner/admin.
   - Confirm `/staff/kennel-logs` loads for owner/admin.
   - Confirm staff role sees only the restricted message.
   - Confirm no sends, replies, writes, public publishing, customer messages, or external provider behavior exists.

2. **Browser-check Command Console**
   - Confirm `/staff/command` loads for owner/admin.
   - Confirm the input is disabled/planning-only.
   - Confirm no AI provider, autonomous action, proposed-action records, or direct database write behavior is connected.

3. **Review Proposed Action Approval Model**
   - Confirm future writes use proposed action, owner/admin approval, controlled RPC/server action execution, and event/audit logging.

4. **Continue owner/operator workflows only**
   - Keep all new pages authenticated, read-first, real-data-only, and side-effect free unless a later explicit write task is approved.

## Estimate To Internal Local Completion

This means a local owner/operator Core OS that can handle application intake, approval, reservation, ledger payments, notification preview, go-home planning, go-home checklist items, and basic kennel record management, without live integrations.

Estimated remaining time: **1 to 2 weeks** of focused work.

Main remaining items:

- Browser-check Messages, Kennel Logs, and Command read-only workspaces.
- Review Proposed Action Approval Model.
- Finish unauthorized-role verification for current actions.
- Keep owner/admin audit visibility restricted.

## Estimate To Owner/Operator Staging

This means protected staging app hosting, separate staging Supabase project/database, mapped owner/operator auth, selected-real-data readiness, and no live side effects.

Estimated remaining time after local completion: **2 to 4 weeks**.

Main remaining items:

- Staging environment setup.
- Staging Supabase project/database.
- Owner/operator auth mapping in staging.
- RLS design/tests or continued server-only boundary decision for staging.
- Selected real application and kennel field review.
- Owner-approved limited import or manual entry of selected real records.
- Verification that no emails/messages/payments/documents/public website updates are triggered.

## Estimate To Internal Production Owner/Operator Use

This means Core can be used internally for real operations by Cristy as owner/operator, with future helper roles only if needed, but still not customer-facing.

Estimated remaining time after staging: **4 to 8 weeks**.

Main remaining items:

- RLS/security hardening.
- Production deployment process.
- Real-field visibility review.
- Real application workflow confidence.
- Kennel record edit/audit confidence.
- Financial correction UI with strict authorization, if needed.
- Go-home workflow hardening.
- Communication approval workflow.
- Operational backups/rollback planning.

## Estimate To Customer-Facing Core

This means public application intake, customer portal, documents, signatures, customer payment visibility, customer messaging, and possibly email sending.

Estimated remaining time after internal production is stable: **2 to 4+ months**.

Main remaining items:

- Public `/apply`.
- Puppy portal.
- Documents and signature workflow.
- Payment processor integration.
- Customer email sending rules.
- Customer-facing RLS and visibility tests.
- Public website publishing rules, if Core will control puppy listings later.
- Production support processes.

## Best Current Estimate Overall

From the current checkpoint, assuming focused progress and no major redesign:

```text
Local internal foundation:        in progress; about 1-2 focused weeks to stabilize current owner/operator workflows
Owner/operator staging:           3-6 weeks total from stable local checkpoint
Internal production Core OS use:  2-3 months total from current checkpoint
Customer-facing Core:            4-6+ months total
```

The biggest schedule risks are:

- RLS/security design.
- Real data field sensitivity.
- Payment processor/reconciliation complexity.
- Document/signature workflow.
- Customer portal access rules.
- Email deliverability and compliance.
- Public website publishing safety.
- Scope drift into UI polish or unrelated integrations.

## Current Recommended Direction

Stay on this exact order:

```text
1. Browser-check Messages, Kennel Logs, and Command as read-only owner/admin workspaces.
2. Review the Proposed Action Approval Model before implementation.
3. Continue Core-native owner/operator workflows only.
```

Do not connect Hostinger SMTP yet.
