# Core Selected Real Data Staging Plan

## Purpose

This plan defines the first controlled selected-real-data staging test for Cherolee Core.

The goal is deliberately small:

- Prove Core can display a tiny amount of owner-approved real application context safely.
- Verify staff authentication, role-based read scopes, and server-side read boundaries with real-shaped data.
- Confirm no live side effects occur.

This is not a bulk migration, production cutover, live Zoho connection, payment workflow, customer portal launch, or production-readiness claim.

## Recommended First Data Slice

Start with one or two real application records only.

Do not include:

- Bulk Zoho exports.
- Payment processor data.
- Financial ledger history.
- Documents, signatures, contracts, guarantees, or receipts.
- Customer portal records.
- Twilio, SMS, phone-call, message, or notification records.
- Go-home operational records unless explicitly needed for the chosen tiny test.

The first slice should answer one question: can Core safely display selected real application/review context to the right staff roles?

## Data Sources

Allowed first sources:

- Manual export of one or two owner-approved application records.
- Controlled Zoho export of the same tiny owner-approved application set.

Not allowed yet:

- Automatic live Zoho webhook delivery.
- Recurring Zoho sync.
- Full module export.
- Production writeback to Zoho.
- Any integration that can contact customers or alter live records.

Every selected record must be approved by the owner before staging import.

## Redaction And Sensitivity Review

Use `docs/core/CORE_SELECTED_REAL_DATA_FIELD_REVIEW_TEMPLATE.md` before importing selected records.

Before importing selected records, review the exported application fields.

Classify fields into:

- Staff-visible operational review fields.
- Owner/admin-only sensitive fields.
- Fields that should not be imported for the first staging test.

Pay close attention to:

- Household details.
- Personal background answers.
- Addresses and phone numbers.
- References to children, schedules, medical, employment, or financial context.
- Any free-text answer that may contain unexpected private data.

Staff-visible application details should not be assumed safe merely because the local fake-data dashboard can render application sections.

If a field is not needed to prove the first staging test, leave it out.

## Import Method

Recommended sequence:

1. Run a local dry run first with the exact selected payload shape.
2. Review local results in `/staff` as owner/admin and staff.
3. Confirm sensitive fields are not visible to staff unless approved.
4. Only after owner approval, run the same controlled import in staging.

Preferred implementation path:

- Use the existing Core intake/database function if compatible with the selected payload shape.
- Keep import as a controlled one-time staging operation.
- Write audit/event rows only as expected by the intake path.

Do not:

- Load real records through normal migrations.
- Add staging seed files containing real data.
- Commit real payloads, exports, customer details, or secrets to the repository.
- Write back to production Zoho.
- Send email, SMS, payment requests, documents, or notifications.

## Environment Requirements

The staging environment must be separate from local development.

Required before staging import:

- Protected `/staff` route works in staging.
- Supabase Auth works for staging staff users.
- `core_profiles.auth_user_id` mappings exist for the approved staging users.
- Owner/admin profile access is verified.
- Staff restricted-read behavior is verified.
- Secrets are stored only in environment configuration, not in Git, docs, chat, screenshots, or client code.
- Service-role usage remains server-side only.

RLS is still deferred for this specific bridge, but it is required before broader live/client exposure.

## Safety Requirements

The first staging test must keep all live side effects off:

- Email off.
- Twilio off.
- Payment processor off.
- Document generation off.
- Signature provider off.
- Customer portal off.
- Public website replacement off.
- No external notifications.
- No automatic approvals.
- No automatic reservations.
- No automatic payments, refunds, fees, chargebacks, or credits.
- No production Zoho writeback.

The staging test is read/display verification plus controlled import only.

## Verification Checklist

After local dry run and again after approved staging import:

- Selected application appears in the Received Applications panel.
- Application sections display correctly.
- Owner/admin can see the expected full dashboard.
- Staff can see operational application/reservation basics only.
- Staff cannot see financial ledger activity.
- Staff cannot see full audit/activity rows.
- Staff cannot see phone lookup safety/ambiguity details.
- Staff cannot see the general event feed.
- Staff-visible application answers match the approved field review.
- Audit/event rows are created only as expected by the controlled import path.
- No email was sent.
- No SMS or Twilio action occurred.
- No payment processor action occurred.
- No document/signature action occurred.
- No customer portal visibility occurred.
- No production Zoho record was modified.

## Rollback Plan

Because this is staging-only:

- Staging data can be deleted or the staging database can be reset.
- No production data should be modified.
- No customer contact should be triggered.
- No external provider state should need cleanup.

Before import, record:

- Which records were selected.
- Which environment received them.
- Which import method was used.
- Who approved the staging slice.

If anything unexpected appears or any side effect occurs, stop the staging test and do not add more records.

## Go / No-Go Criteria

Before any import, complete `docs/core/CORE_STAGING_READINESS_CHECKLIST.md`.

Go to the next tiny staging slice only if:

- Owner approved the exact selected records.
- Staff auth works in staging.
- Owner/admin full read visibility works as expected.
- Staff restricted read visibility works as expected.
- Application details render correctly.
- Staff-visible fields were reviewed and approved.
- No live side effects occurred.
- Rollback/reset path is understood.

Block moving forward if:

- Any unapproved sensitive field appears to staff.
- Any live email, SMS, payment, document, or portal behavior triggers.
- Staff access can bypass read-scope restrictions.
- Audit/event records are missing or unexpected.
- The import method requires storing real payloads in Git.
- The selected data scope is unclear or not owner-approved.

## Current Status

This plan exists as a staging safety checkpoint.

No selected real data has been imported yet.

Staging import remains blocked until the owner approves:

- The exact records.
- The exact fields.
- The completed field review.
- The staging environment.
- The import method.
- The verification checklist.
- The staging readiness checklist.
