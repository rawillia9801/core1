# Core Staging Readiness Checklist

## Status Note

- Current as of this documentation pass after the internal manual application and puppy save production bug fix.
- This file remains the gate before staging selected real Core data or expanding customer-facing behavior.
- `CURRENT_STATUS.md` owns current implementation state; this file owns staging/production readiness gates.

## Purpose

This checklist is the final gate before putting selected real records, public application submissions, or SMTP behavior through a staging-style verification pass.

It is not a full production launch checklist. It applies to small, owner-approved, controlled verification slices only.

Zoho One remains cancelled and historical reference only. Zoho must not be used as an import source, export source, dry-run source, compatibility path, sync source, writeback target, or dependency for staging.

## Current Customer-Facing Scope Now Present

The following public routes now exist and must be included in staging/production checks:

- `/apply`
- `/apply/received`
- `/embed/application`
- `/embed/application/received`

The embedded form is intended for the Southwest Virginia Chihuahua public website. It must not expose internal Core branding, staff wording, admin wording, private IDs, private data, or owner/operator-only workflow information.

The application submit action can create Core application records and can attempt SMTP receipt emails when SMTP env vars are configured.

## Environment Readiness

- [ ] Production/staging environment variables are reviewed outside the repository.
- [ ] `NEXT_PUBLIC_SUPABASE_URL` is set correctly.
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set correctly.
- [ ] `SUPABASE_URL` is set correctly.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set server-side only.
- [ ] `.env.local` is not committed.
- [ ] No secrets appear in Git, docs, chat, screenshots, browser code, or client bundles.
- [ ] Vercel project points to the correct GitHub repo and branch.
- [ ] Public routes deploy from `rawillia9801/core1` on `main`.
- [ ] Local/dev duplicate folders are not used as source of truth.

## Public Application Form Readiness

- [ ] `/embed/application` renders without Core/admin/staff/internal wording.
- [ ] `/embed/application` visually matches Southwest Virginia Chihuahua public site style closely enough for iframe use.
- [ ] Embedded iframe height is sufficient for the full form and terms.
- [ ] The form includes Applicant Info fields from the PDF.
- [ ] The form includes Puppy Preferences fields from the PDF.
- [ ] The form includes Lifestyle & Home fields from the PDF.
- [ ] The form includes Payment & Agreement fields from the PDF.
- [ ] The form includes Terms and Conditions text.
- [ ] The form includes Applicant Declarations.
- [ ] The form includes typed signature.
- [ ] Required fields are verified.
- [ ] Required Terms checkbox is verified.
- [ ] Required Declarations checkbox is verified.
- [ ] Submission redirects to an embedded-friendly received page.
- [ ] Failed/invalid submission behavior is reviewed.

## Public Application Data Write Readiness

- [ ] Submission creates a buyer record.
- [ ] Submission creates a family record.
- [ ] Submission links the buyer to the family.
- [ ] Submission creates an application record.
- [ ] Submission stores application sections:
  - `applicant_info`
  - `puppy_preferences`
  - `lifestyle_home`
  - `payment_agreement`
- [ ] Submission creates a Core event.
- [ ] No reservation is created automatically.
- [ ] No puppy is assigned automatically.
- [ ] No approval/denial/waitlist decision happens automatically.
- [ ] No payment is recorded automatically.
- [ ] No document package is generated automatically.
- [ ] No portal account is created automatically.

## SMTP Application Receipt Readiness

SMTP application receipt behavior is now conditional and must be treated as live side-effect behavior when configured.

Required SMTP env vars:

```text
SMTP_HOST
SMTP_PORT
SMTP_SECURE
SMTP_USER
SMTP_PASS
SMTP_FROM
APPLICATION_EMAIL_TO
```

Checks:

- [ ] SMTP env vars are configured only in Vercel/server environment, not Git.
- [ ] `SMTP_FROM` is a valid business sender.
- [ ] `APPLICATION_EMAIL_TO` is the owner/operator alert recipient.
- [ ] Owner alert email is received.
- [ ] Customer confirmation email is received.
- [ ] Customer confirmation copy contains no Core/admin/internal wording.
- [ ] Owner alert includes enough application detail to identify the applicant.
- [ ] SMTP failure does not create duplicate application records on retry without owner review.
- [ ] SMTP failure state is visible enough to investigate.
- [ ] Future send logging is added before expanding SMTP beyond application receipt.

## Staff Access Readiness

- [ ] `/staff` route is protected.
- [ ] `/login` works in deployed environment.
- [ ] Owner/admin login is verified.
- [ ] Staff/helper login is verified if used.
- [ ] Inactive mapped users are blocked.
- [ ] Unmapped Auth users are blocked.
- [ ] Role-based read scopes are verified.
- [ ] Staff/helper users cannot see owner/admin-only sensitive panels.
- [ ] Dashboard reads require authenticated profile context.
- [ ] Service-role read/write paths remain server-side only.

## Action Authorization Readiness

- [ ] Server actions use authenticated staff actor IDs where applicable.
- [ ] `/staff/applications/new` manual application creation works for authenticated owner/admin users in deployed production configuration.
- [ ] `/staff/applications/new` blocks staff/helper and unauthenticated users from creating manual applications.
- [ ] Manual application duplicate/existing-customer outcomes are operator-safe and do not expose raw database errors.
- [ ] `/staff/puppies/new` puppy creation works for authenticated owner/admin users in deployed production configuration.
- [ ] Puppy creation failure outcomes are operator-safe and do not expose raw database errors.
- [ ] Public application submission is restricted to the public application write surface only.
- [ ] Public application submission cannot write reservations, payments, documents, or portal users.
- [ ] Audit/event attribution is understood for public anonymous submissions.
- [ ] Owner/admin permissions are verified.
- [ ] Staff/helper restrictions are verified.
- [ ] Existing internal actions do not depend on deprecated static actor env variables.

## Data Scope Approval

- [ ] Exact real records are selected and approved by the owner before staging selected internal data.
- [ ] Public application test submissions use either test applicants or explicitly approved real submissions.
- [ ] Any real matching, assignment, or waitlist review records are explicitly owner-approved before inspection in `/staff/matching`.
- [ ] No bulk import is included.
- [ ] No payment processor records are included.
- [ ] No document/signature records are included unless explicitly approved.
- [ ] Any document metadata used in the internal Document Command Center is explicitly approved for owner/admin staging review before real records are inspected.
- [ ] No Twilio/Facebook/SMS records are included.
- [ ] No customer portal records are included.
- [ ] No Zoho modules, exports, or payloads are included.

## Field Sensitivity Review

- [ ] Field review template is completed for public application data.
- [ ] Staff-visible application fields are approved.
- [ ] Owner/admin-only fields are identified.
- [ ] Free-text answers are reviewed for unexpected sensitive content.
- [ ] Phone visibility is reviewed.
- [ ] Email visibility is reviewed.
- [ ] Signature/date-time storage is reviewed.
- [ ] Terms/declarations acknowledgement storage is reviewed.

## Side-Effect Lockout / Approval

Confirm all remain off unless explicitly approved:

- [ ] Payment processor.
- [ ] Refund/chargeback provider actions.
- [ ] Document generation.
- [ ] Signature provider.
- [ ] Document upload/storage policy changes.
- [ ] Public or portal document visibility.
- [ ] Customer portal.
- [ ] Public website replacement beyond embedding the application form.
- [ ] Twilio/SMS/calls.
- [ ] Facebook Messenger.
- [ ] Automation or AI writes.
- [ ] Home Assistant.
- [ ] Cameras.
- [ ] Smart mirror or display automations.
- [ ] Automatic approvals.
- [ ] Automatic denials.
- [ ] Automatic waitlist decisions.
- [ ] Automatic puppy assignments.
- [ ] Automatic reservations.
- [ ] Automatic payments, refunds, fees, chargebacks, or credits.

SMTP application receipt emails are the only current live external side-effect path, and only when SMTP env vars are configured.

## Internal Save Action Readiness

- [ ] Manual application creation does not redirect to plain `/staff?application=error`.
- [ ] Manual application creation returns a specific outcome for invalid contact, missing terms, invalid input, duplicate/existing customer review, RPC failure, save failure, and missing Core server action configuration.
- [ ] Manual application creation still calls only the controlled `core_create_application_manual` RPC and does not create reservations, payments, documents, portal accounts, public listings, or external-provider side effects.
- [ ] Puppy creation does not redirect to generic `puppy=error` when a failure can be classified.
- [ ] Puppy creation returns a specific outcome for invalid input, missing identifier, RPC missing/failure, missing Core server action configuration, missing/invalid litter, duplicate identifier, and save failure.
- [ ] Puppy creation still calls only the controlled `core_create_puppy` RPC and does not publish puppies, process payments, create documents, message customers, update portal visibility, or call external providers.

## Verification After Public Application Submission

- [ ] Application appears in `/staff/applications`.
- [ ] Application detail view shows submitted sections clearly.
- [ ] `/staff/matching` can read the submitted puppy preference section for owner/operator review only.
- [ ] Buyer/family records are created and link correctly.
- [ ] Event row exists for application receipt.
- [ ] Owner/admin can review the submitted answers.
- [ ] Staff/helper roles see only approved operational data.
- [ ] No payment processor action occurred.
- [ ] No document/signature action occurred.
- [ ] No portal visibility occurred.
- [ ] No public puppy listing behavior changed.
- [ ] No automatic approval/denial/waitlist decision occurred.
- [ ] No automatic matching score changed a record, created a reservation, sent a message, moved money, generated a document, or called an external provider.

## Internal Matching / Waitlist Readiness

- [ ] `/staff/matching` is accessible only through protected internal owner/operator access.
- [ ] Matching recommendations are visually presented as advisory decision-support, not final decisions.
- [ ] Available puppy, applicant, waitlist, reservation-ready, blocker, and recent activity lanes are reviewed against known records.
- [ ] Detail links return to the correct application, buyer, family, puppy, litter, and reservation records where present.
- [ ] Missing preference data and missing puppy data are clearly flagged instead of guessed.
- [ ] Matching review does not approve or deny applications.
- [ ] Matching review does not assign puppies or create reservations.
- [ ] Matching review does not send email, SMS, portal messages, Facebook messages, or Twilio events.
- [ ] Matching review does not create payment, document, upload, signature, AI, or provider side effects.

## Rollback Plan

- [ ] Test application records can be deleted or archived safely.
- [ ] Duplicate test buyer/family records are identifiable.
- [ ] SMTP test recipient(s) are known.
- [ ] No production records are modified outside the intended test submission.
- [ ] No payment is triggered.
- [ ] No document/signature is triggered.
- [ ] No portal account is created.
- [ ] Rollback approach is approved before wider public use.

## Go / No-Go Decision

Go only if:

- [ ] Public application writes only the intended Core records.
- [ ] Embedded application contains no Core/internal/admin wording.
- [ ] Terms/declarations/signature are captured.
- [ ] SMTP behavior is approved and configured intentionally.
- [ ] Owner alert and customer confirmation are verified.
- [ ] Internal review path can see the application cleanly.
- [ ] Rollback path is clear.

No-go if:

- [ ] Any secret appears in Git, docs, chat, screenshots, browser output, or client code.
- [ ] Public form can create reservations, payments, documents, portal accounts, or approval decisions.
- [ ] SMTP sends unapproved copy or exposes internal language.
- [ ] Submitted answers do not appear in the internal review path.
- [ ] Customer-facing route exposes internal Core data.

## Current Status

The public/embedded application form is implemented and deployed from GitHub/Vercel. Staging-style verification of real submissions, SMTP receipt behavior, duplicate handling, send logging, and internal application detail review visibility remains required before treating the workflow as fully production-hardened.
