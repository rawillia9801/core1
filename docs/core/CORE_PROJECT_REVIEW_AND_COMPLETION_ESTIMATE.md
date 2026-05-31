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

Core is now a Core-native staff operating system foundation. Zoho One is no longer part of the active lineup.

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

- Staff login works locally.
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
- Dogs, Litters, and Puppies are enabled in the staff sidebar.

## Recently Added / In Progress

The kennel record management loop is currently active.

Recently added:

- Visible Add Dog button on `/staff/dogs`.
- Visible Add Litter button on `/staff/litters`.
- Visible Add Puppy button on `/staff/puppies`.
- Owner/admin-only kennel edit/archive server actions in `src/app/staff/kennel-manage-actions.ts`.
- Dog record Edit links on `/staff/dogs`.
- Litter record Edit links on `/staff/litters`.
- Puppy record Edit links on `/staff/puppies`.
- Dog edit page foundation at `/staff/dogs/[dogId]/edit`.

Still in progress:

- Complete browser verification for Add Dog, Add Litter, and Add Puppy.
- Complete edit/archive pages for litters and puppies.
- Browser-verify edit/archive behavior for dogs, litters, and puppies.
- Ensure edit/archive actions write sufficient event/audit records before staging.

Current delete behavior is intentionally archive-style, not hard deletion:

```text
Dog delete    -> mark inactive
Litter delete -> mark archived
Puppy delete  -> mark unavailable and hidden
```

This avoids accidentally destroying linked history.

## Known Cleanup

- `/staff/go-home/page.tsx` still has one known unused variable warning for `unscheduledGoHomes` until that line is removed locally.
- Because that warning exists, `npm run lint` will continue to report one warning until cleanup.

## Still Not Connected

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
- Public website publishing from Core.
- Home Assistant, cameras, smart mirror, and automations.

## Non-Drift Lane

The current lane is Core-native staff workflow completion:

```text
finish kennel add/edit/archive loop
  -> browser-verify dog/litter/puppy creates
  -> browser-verify dog/litter/puppy edits/archive actions
  -> clean known go-home lint warning
  -> update checkpoint docs
  -> continue staff-only Core workflows
```

Do not jump to live SMTP, customer emails, public forms, portal, documents, payment processor, public website publishing, AI write capability, or unrelated integrations until the matching safety gates are complete.

## Recommended Next 7 Tasks

1. **Finish kennel edit/archive pages**
   - Complete `/staff/litters/[litterId]/edit`.
   - Complete `/staff/puppies/[puppyId]/edit`.
   - Confirm `/staff/dogs/[dogId]/edit` opens and saves.

2. **Browser-save real local kennel records**
   - Add one real local dog through `/staff/dogs/new`.
   - Add one real local litter through `/staff/litters/new`.
   - Add one real local puppy through `/staff/puppies/new`.
   - Confirm each row appears on its matching page.

3. **Browser-verify edit/archive behavior**
   - Edit one dog.
   - Edit one litter.
   - Edit one puppy.
   - Mark one record inactive/archived/hidden only after confirming the safe archive behavior.

4. **Add audit/event coverage for kennel updates**
   - Create actions already write event/audit rows through RPCs.
   - Edit/archive actions currently use guarded table patching and should gain explicit event/audit logging before staging.

5. **Clean known lint warning**
   - Remove the unused `unscheduledGoHomes` line from `src/app/staff/go-home/page.tsx`.
   - Run `npm run lint`.

6. **Update checkpoint docs after browser verification**
   - Update `CURRENT_STATUS.md`.
   - Update `IMPLEMENTATION_CHECKLIST.md` or add a smaller checkpoint if the connector blocks a large replacement.

7. **Continue staff-only workflows only**
   - Likely next candidates after kennel management are Buyers/Families or go-home handoff rules.

## Estimate To Internal Local Completion

This means a local/staff-only Core that can handle application intake, approval, reservation, ledger payments, notification preview, go-home planning, go-home checklist items, and basic kennel record management, without live integrations.

Estimated remaining time: **1 to 2 weeks** of focused work.

Main remaining items:

- Finish litter/puppy edit/archive pages.
- Browser-verify kennel create/edit/archive paths.
- Add explicit event/audit logging for kennel update/archive actions before staging.
- Clean known lint warning.
- Finish unauthorized-role verification for current actions.
- Add a few missing staff workspace surfaces such as Buyers/Families or event/audit review if needed before staging.

## Estimate To Staff-Only Staging

This means protected staging app hosting, separate staging Supabase project/database, mapped staff auth, selected-real-data readiness, and no live side effects.

Estimated remaining time after local completion: **2 to 4 weeks**.

Main remaining items:

- Staging environment setup.
- Staging Supabase project/database.
- Staff Auth mapping in staging.
- RLS design/tests or continued server-only boundary decision for staging.
- Selected real application and kennel field review.
- Owner-approved limited import or manual entry of selected real records.
- Verification that no emails/messages/payments/documents/public website updates are triggered.

## Estimate To Internal Production Staff Use

This means Core can be used internally for real operations by the owner/admin with restricted staff roles, but still not customer-facing.

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
Local internal foundation:        in progress; about 1-2 focused weeks to stabilize current staff workflows
Staff-only staging:              3-6 weeks total from stable local checkpoint
Internal production staff use:   2-3 months total from current checkpoint
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
1. Finish kennel edit/archive pages.
2. Browser-save real local dog/litter/puppy records.
3. Browser-verify edit/archive behavior.
4. Add explicit audit/event logging for edit/archive actions before staging.
5. Clean the known go-home lint warning.
6. Update docs after verification.
7. Continue Core-native staff workflows only.
```

Do not connect Hostinger SMTP yet.
