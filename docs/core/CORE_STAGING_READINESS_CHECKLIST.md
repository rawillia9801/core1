# Core Staging Readiness Checklist

## Status Note

- Current as of this documentation pass after the SMTP Email Delivery / Template / Notification Test Center.
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
- `/portal`
- `/portal/mypuppy`
- `/portal/application`
- `/portal/reservation`
- `/portal/documents`
- `/portal/payments`
- `/portal/go-home`
- `/portal/messages`
- `/portal/updates`
- `/portal/resources`

The embedded form is intended for the Southwest Virginia Chihuahua public website. It must not expose internal Core branding, staff wording, admin wording, private IDs, private data, or owner/operator-only workflow information.

The application submit action can create Core application records and can attempt SMTP receipt emails when SMTP env vars are configured.

The portal routes are readiness placeholders only until secure customer account linking and access-policy work are complete. They must not query or expose private buyer, family, application, reservation, document, payment, go-home, message, staff, audit, storage, service-role, or provider details while unlinked.

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

## Internal Email / Notification Test Center Readiness

- [ ] `/staff/email`, `/staff/email/test`, `/staff/email/templates`, `/staff/email/notifications`, and `/staff/email/logs` are protected and redirect cleanly when unauthenticated.
- [ ] SMTP readiness shows configured/missing status only and never displays SMTP password values, service-role keys, raw env dumps, or provider credentials.
- [ ] Owner/admin SMTP test action sends exactly one typed-recipient test email and does not send on page load.
- [ ] SMTP test failures are classified as config_missing, invalid_recipient, unauthorized, smtp_auth_failed, smtp_connection_failed, smtp_rejected, or send_failed without raw provider credential output.
- [ ] Template preview pages use customer-safe Southwest Virginia Chihuahua language and do not send emails from preview cards.
- [ ] Notification/log views reuse existing `core_notifications`, `core_message_templates`, and `core_notification_delivery_attempts`; no duplicate queue/log table is introduced.
- [ ] Communications, actions, proposed-actions, application, buyer/family, reservation, document, payment, and go-home pages link back to email readiness without triggering customer sends.

## Buyer Portal Placeholder Readiness

- [ ] `/portal` renders without staff/admin/internal wording or private data.
- [ ] `/portal/mypuppy` renders a safe no-puppy-assigned/unlinked state.
- [ ] `/portal/application` renders only customer-safe application placeholder status while unlinked.
- [ ] `/portal/reservation` renders only customer-safe reservation placeholder status while unlinked.
- [ ] `/portal/documents` renders only customer-safe document placeholder status while unlinked.
- [ ] `/portal/payments` renders only customer-safe read-only payment placeholder status while unlinked.
- [ ] `/portal/go-home` renders customer-safe schedule/checklist placeholder content while unlinked.
- [ ] `/portal/messages`, `/portal/updates`, and `/portal/resources` render without private message history or staff links.
- [ ] Portal pages show that portal account linking is required before private records can display.
- [ ] Portal pages do not query all customers client-side or expose raw database, service-role, storage, audit, provider, internal blocker, private note, or proposed-action details.
- [blocked] Private portal record display remains blocked until secure customer identity lookup, RLS/access policy review, and customer account linking are implemented.

## Internal Portal Bridge Readiness

- [ ] `/staff/portal` is protected and redirects cleanly when unauthenticated.
- [ ] `/staff/portal/buyers`, `/staff/portal/puppies`, `/staff/portal/documents`, `/staff/portal/payments`, `/staff/portal/messages`, `/staff/portal/updates`, and `/staff/portal/resources` are protected and redirect cleanly when unauthenticated.
- [ ] Portal bridge reads existing buyer/puppy portal tables where available and does not create a second portal data model.
- [ ] Missing links display as `Portal link not established` or `Core record not connected to portal record`.
- [ ] Portal bridge does not create portal accounts, invite emails, customer messages, payment links, document generation, signature requests, storage URLs, or customer-visible changes.
- [ ] Buyer/family/application/reservation/puppy/detail and documents/payments/go-home/actions/command pages show compact Portal Readiness panels without exposing private portal data to public routes.

## Internal Breeding / Kennel Care Readiness

- [ ] `/staff/breeding` is protected and redirects cleanly when unauthenticated.
- [ ] `/staff/breeding/dogs`, `/staff/breeding/pairings`, `/staff/breeding/pregnancies`, `/staff/breeding/whelping`, `/staff/breeding/litters`, `/staff/breeding/puppy-care`, `/staff/breeding/calendar`, `/staff/breeding/tasks`, and `/staff/breeding/alerts` are protected and redirect cleanly when unauthenticated.
- [ ] Breeding/care pages read existing Core and legacy breeding/care tables only and tolerate missing legacy tables with operator-safe warnings.
- [ ] Puppy growth/care readiness uses existing puppy, litter, weight, feeding, medication, event, and private media rows only.
- [ ] Breeding/care pages do not create schema, automate breeding decisions, diagnose animals, publish puppies, update customer portal visibility, message customers, process payments, generate documents, call AI/providers, connect Twilio/SMS/Facebook, or control kennel devices.
- [ ] Command, actions, proposed-actions, dog, litter, puppy, media, and go-home pages show compact Breeding / Care panels linking back to the protected command center.

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

## Internal Communications Readiness

- [ ] `/staff/communications` is protected and redirects cleanly when unauthenticated.
- [ ] `/staff/messages` and `/staff/notifications` remain protected and link back to `/staff/communications`.
- [ ] Queued, pending, sent, failed, skipped, missing recipient, missing template, config missing, and review-required states display as operator-safe classifications.
- [ ] Notification and delivery attempt views do not expose SMTP credentials, service-role errors, raw provider request bodies, or raw provider response bodies.
- [ ] Follow-up prompts remain owner/operator review prompts only.
- [ ] No email, SMS, Facebook, portal message, phone call, document link, payment reminder, or provider request can be sent from the communications center.

## Action Authorization Readiness

- [ ] Server actions use authenticated staff actor IDs where applicable.
- [ ] `/staff/actions` is protected and accessible only through authenticated internal owner/operator access.
- [ ] `/staff/proposed-actions` is protected and redirects cleanly when unauthenticated.
- [ ] `/staff/proposed-actions` shows deterministic readiness rules from existing data only and does not require AI or new tables.
- [ ] Readiness rule rows show why they appear, priority, category, blockers, related links, and next workspace.
- [ ] Core Intelligence panels on major internal pages remain compact and link to `/staff/proposed-actions`.
- [ ] `/staff/actions` shows only existing action entry points or review-only links; it does not invent new mutation workflows.
- [ ] `/staff/actions` includes application review, matching/assignment, buyer/family cleanup, reservation, document, payment, go-home, media, litter media, blocked, recent, and proposed-action review lanes without automatic execution.
- [ ] Action panels on command, actions, application list/new/detail, matching, reservation, payment, payment-plan, document, media, go-home, handoff, puppy list/detail, litter list/detail, and proposed-action pages link to the correct controlled action lane.
- [ ] Proposed action approval remains review-state only and does not execute business changes.
- [ ] Controlled action links do not trigger email, SMS, Facebook, Twilio, payment processor, document generation, signing provider, portal visibility, public listing, AI, or storage-policy side effects.
- [ ] Application detail review actions classify invalid input, RPC failure, missing config, save failure, and unauthorized outcomes without showing raw database/service-role errors.
- [ ] Reservation, payment, cancellation, and go-home actions classify invalid input, not eligible, missing links, blocked, RPC failure, missing config, and save failure outcomes where determinable.
- [ ] Dog, litter, puppy, and proposed-action manage/review flows show safe operator messages for classified config/RPC/save/input outcomes.
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
