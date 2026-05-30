# Core Project Review And Completion Estimate

## Purpose

This document is a non-drifting checkpoint that summarizes where Core is now, what is proven, what is still blocked, and the estimated time remaining by milestone.

It should be read alongside:

- `docs/core/CURRENT_STATUS.md`
- `docs/core/IMPLEMENTATION_CHECKLIST.md`
- `docs/core/CORE_EMAIL_TEMPLATE_PREVIEW_PLAN.md`
- `docs/core/CORE_STAFF_AUTH_PLAN.md`
- `docs/core/CORE_STAGING_READINESS_CHECKLIST.md`

## Current Position

Core has moved past the original Zoho-dependent intake assumption for private/manual staff application entry.

The proven local workflow is:

```text
Core-native application entry
  -> application review
  -> application approval
  -> reservation creation
  -> deposit/payment ledger entry
  -> visible ledger-derived balance reduction
```

The safe communication workflow is also underway:

```text
Core-native application entry
  -> queue application_received notification
  -> preview in /staff/notifications
  -> seeded draft templates visible
  -> disabled/preview provider boundary exists
  -> delivery-attempt logging foundation added
```

No email is being sent.

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
- The template seed migration/test passed locally for all 9 draft preview-only templates.
- Disabled/preview provider module passes lint locally.

## Recently Added But Not Yet Locally Verified

The delivery-attempt foundation has been added to GitHub:

- `supabase/migrations/20260526300000_core_notification_delivery_attempts.sql`
- `supabase/tests/core_notification_delivery_attempts_tests.sql`

This foundation adds `core_notification_delivery_attempts` as a future provider-attempt log table.

It does not send email, connect Hostinger SMTP, connect Resend, add credentials, add a send worker, or mark notifications as sent.

Next local validation should be:

```bash
cat supabase/migrations/20260526300000_core_notification_delivery_attempts.sql | docker exec -i supabase_db_core1 psql -U postgres -d postgres -v ON_ERROR_STOP=1
cat supabase/tests/core_notification_delivery_attempts_tests.sql | docker exec -i supabase_db_core1 psql -U postgres -d postgres -v ON_ERROR_STOP=1
npm run lint
```

Do not run `supabase db reset --local` for this validation.

## Still Not Connected

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

## Non-Drift Lane

The current lane is communications foundation only:

```text
queue-only notifications
  -> seeded draft templates
  -> preview page
  -> disabled/preview provider boundary
  -> delivery-attempt log table
  -> preview/blocked attempt logging workflow
  -> test-send-to-owner later
  -> Hostinger SMTP later, disabled by default
```

Do not jump to live SMTP, customer emails, public forms, portal, documents, or payment processor until the safety gates are complete.

## Recommended Next 5 Tasks

1. **Locally verify delivery-attempt foundation**
   - Pull latest GitHub changes.
   - Apply only `20260526300000_core_notification_delivery_attempts.sql`.
   - Run only `core_notification_delivery_attempts_tests.sql`.
   - Run `npm run lint`.
   - Update checkpoint docs after it passes.

2. **Add preview/blocked attempt logging workflow**
   - Add a server-side function/helper that can record `previewed` or `blocked` attempts.
   - Do not send email.
   - Do not update `core_notifications.sent_at`.
   - Do not connect SMTP/Resend.

3. **Show delivery attempts on `/staff/notifications`**
   - Owner/admin only.
   - Read-only.
   - Show recent blocked/previewed attempt rows under each notification or in a separate section.
   - No send buttons.

4. **Define staff-approved vs automatic communication rules**
   - Decide which future notifications may ever send automatically.
   - Keep payment, cancellation, document, and go-home communication staff-reviewed until templates and safety language are approved.

5. **Only after the above: test-send-to-owner design**
   - Still no customer sends.
   - Hostinger SMTP can be considered later behind disabled-by-default env gates.

## Estimate To Internal Local Completion

This means a local/staff-only Core that can handle application intake, approval, reservation, ledger payments, notification preview, and safe provider foundations, without live integrations.

Estimated remaining time: **1 to 2 weeks** of focused work.

Main remaining items:

- Delivery-attempt verification and display.
- Preview/blocked attempt logging helper.
- Staff-approved communication rules.
- Some authorization cleanup and unauthorized-role verification.
- Basic go-home workflow decision or first controlled go-home update action.

## Estimate To Staff-Only Staging

This means protected staging app hosting, separate staging Supabase project/database, mapped staff auth, selected-real-data readiness, and no live side effects.

Estimated remaining time after local completion: **2 to 4 weeks**.

Main remaining items:

- Staging environment setup.
- Staging Supabase project/database.
- Staff Auth mapping in staging.
- RLS design/tests or continued server-only boundary decision for staging.
- Selected real application field review.
- Owner-approved limited import.
- Verification that no emails/messages/payments/documents are triggered.

## Estimate To Internal Production Staff Use

This means Core can be used internally for real operations by the owner/admin with restricted staff roles, but still not customer-facing.

Estimated remaining time after staging: **4 to 8 weeks**.

Main remaining items:

- RLS/security hardening.
- Production deployment process.
- Real-field visibility review.
- Real application workflow confidence.
- Financial correction UI with strict authorization, if needed.
- Go-home workflow implementation.
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
- Production support processes.

## Best Current Estimate Overall

From today, assuming focused progress and no major redesign:

```text
Local internal foundation:        1-2 weeks
Staff-only staging:              3-6 weeks total
Internal production staff use:   2-3 months total
Customer-facing Core:            4-6+ months total
```

The biggest schedule risks are:

- RLS/security design.
- Real data field sensitivity.
- Payment processor/reconciliation complexity.
- Document/signature workflow.
- Customer portal access rules.
- Email deliverability and compliance.
- Scope drift into UI polish or unrelated integrations.

## Current Recommended Direction

Stay on this exact order:

```text
1. Verify delivery-attempt foundation locally.
2. Add preview/blocked attempt logging helper.
3. Show attempt logs in /staff/notifications.
4. Define staff-approved versus automatic notification rules.
5. Then consider test-send-to-owner only.
```

Do not connect Hostinger SMTP yet.
