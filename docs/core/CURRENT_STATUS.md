# Cherolee Core Current Status

## Status Note

- Current as of this documentation pass after the Buyer Portal / My Puppy Portal readiness foundation.
- This file is the primary current-state checkpoint for what is implemented, what is deployed, what is conditional, and what remains blocked.
- Active repository: `rawillia9801/core1`
- Active branch: `main`
- Active local working folder for this pass: `C:\Users\rawil\core1-ui-worktree`
- OneDrive worktrees/checkouts are not active work locations for this project.

## Current Direction

Cherolee Core OS is the active operating system and daily command layer for Southwest Virginia Chihuahua. It remains an owner/operator-first system. The technical `/staff` route naming can remain for now, but product language should use Owner Console, Operator Dashboard, Core Command Center, Core OS, Core Assistant, owner/operator, and command center framing.

Zoho One is cancelled and historical reference only. Zoho must not be treated as an import source, migration source, bridge, compatibility workflow, sync target, writeback target, dry-run import lane, planned dependency, future dependency, or active operating workflow.

## Most Recent Implemented Work

### Buyer Portal / My Puppy Portal Readiness Foundation

Implemented and pushed:

- `/portal` was added as the customer-facing My Puppy Portal foundation.
- Customer-safe portal routes now exist for `/portal/mypuppy`, `/portal/application`, `/portal/reservation`, `/portal/documents`, `/portal/payments`, `/portal/go-home`, `/portal/messages`, `/portal/updates`, and `/portal/resources`.
- Portal navigation now covers Home, My Puppy, Application, Reservation, Documents, Payments, Go-Home, Messages, Updates, and Resources.
- Secure buyer account linking/RLS-backed customer identity lookup is not implemented yet, so portal pages do not query private Core records and show safe unlinked placeholder states.
- Portal pages consistently state that portal account linking is required before private records can display, and avoid staff/internal links, raw IDs, internal notes, audit details, service-role errors, private storage URLs, payment actions, document generation, or provider behavior.
- Internal buyer, family, reservation, and puppy detail pages now include compact portal readiness panels showing account link status, puppy assignment visibility, document readiness, and go-home readiness from already-loaded internal metadata.
- This pass did not add auth changes, portal account creation, invite emails, RLS/policy work, migrations, storage policies, media upload behavior, document generation, signing providers, SMTP changes, payment processors, Twilio/SMS/Facebook behavior, AI, public application behavior, or customer messaging.

### Core Intelligence / Readiness Rules / Proposed Action Engine

Implemented and pushed:

- `/staff/proposed-actions` was upgraded into the internal Core Intelligence / Readiness Rules / Proposed Actions workspace.
- The workspace keeps existing `core_proposed_actions` proposal records and review-state-only approve/reject controls intact.
- The workspace now also generates deterministic rule-based readiness rows from existing Core data only: applications, buyers, families, preferences, puppies, litters, dogs, reservations, documents, private media metadata, notifications, delivery attempts, financial ledger rows, weight logs, and events.
- Rule rows now show title, reason, priority, category, blockers, related-record links, suggested workspace, and review-only/action-available indicator.
- Rule categories cover applications, matching, reservations, payments, documents, media, communications, go-home, and kennel/care readiness.
- Compact Core Intelligence panels now appear on command, actions, proposed-actions, application list/detail, matching, reservation detail, payments, payment plans, documents, media, communications, go-home, go-home handoff, puppy detail, and litter detail pages.
- Navigation now labels `/staff/proposed-actions` as `Intelligence / Proposed Actions`.
- This pass did not add migrations, tables, AI/provider calls, automatic decision-making, automatic approvals/denials, puppy assignment, reservation creation, customer messaging, email/SMS/Facebook/Twilio behavior, payment movement, refunds, document generation, media upload behavior, public/customer-facing pages, auth changes, env changes, Supabase config changes, storage policy changes, signing providers, or local Supabase commands.

### Communications + Notification Command Center

Implemented and pushed:

- `/staff/communications` was added as the internal Communications / Follow-Ups Command Center.
- The communications center reads existing `core_conversations`, `core_messages`, `core_message_templates`, `core_notifications`, `core_notification_delivery_attempts`, `core_events`, applications, buyers, families, reservations, and document metadata.
- Readiness now shows open/unresolved communication metadata, queued/pending/sent notification counts, recent queued notifications, failed/blocked/skipped delivery attempts, missing-recipient/template attention states, template safety status, recent activity, and source-record links.
- Follow-up prompts now cover application review, applications without follow-up signal, approved applications without reservation, missing buyer contact detail, document signature/review, payment owner review, go-home communication readiness, matching follow-up, and reservation blockers.
- Compact communication/follow-up panels now appear on command, actions, application list/detail, buyer/family detail, matching, reservation detail, payments, payment plans, documents, go-home, go-home handoff, and puppy detail workspaces.
- `/staff/messages` and `/staff/notifications` now link back to the Communications Command Center; `/staff/notifications` handles read failures with sanitized classified warning text instead of raw REST/provider error bodies.
- This pass did not add migrations, tables, new send behavior, Twilio/SMS/Facebook behavior, AI, SMTP configuration, payment processors, customer portal behavior, customer-facing pages, storage policies, media uploads, document generation, signing providers, auth changes, env changes, Supabase config changes, or local Supabase commands.

### Production Action Workflow + Reliability Layer

Implemented and pushed:

- The Controlled Action Command Center was extended with buyer/family cleanup rows and litter gallery/media readiness rows, all using existing data and review-only links where no mutation support exists.
- Compact action panels now also appear on `/staff/actions`, `/staff/applications/new`, `/staff/puppies`, `/staff/litters`, and `/staff/litters/[litterId]`.
- Application detail review actions no longer have a production-only block; they use authenticated owner/admin checks and the existing server-side Core REST/RPC configuration path.
- Application detail review outcomes now classify invalid input, RPC failure, missing config, save failure, and unauthorized states without showing raw service-role/database errors on screen.
- Reservation, payment, cancellation, and go-home server actions now classify invalid input, not eligible, missing links, blocked, RPC failure, missing config, and save failure outcomes instead of falling back to generic `error` where the cause can be classified.
- Dog, litter, puppy, and proposed-action manage/review flows now return safer classified outcomes for config/RPC/save/input failures and show operator-facing messages.
- Dashboard, payment, go-home, application detail, dog, litter, puppy list, puppy detail, and proposed-action pages now show safer result messages for classified action outcomes.
- This pass did not add migrations, tables, new unsafe mutations, auth model changes, env changes, Supabase config changes, local Supabase commands, SMTP behavior changes, payment processor behavior, Twilio/SMS/Facebook behavior, AI, public application form changes, customer portal behavior, customer-facing page changes, storage policies, media upload behavior, document generation, or signing-provider behavior.

### Controlled Action Workflow Layer

Implemented and pushed:

- `/staff/actions` was added as the internal Action Command Center.
- The action center consolidates existing safe action entry points and review-only links across applications, matching, reservations, payments, payment plans, documents, media, go-home, handoff, puppy detail, and proposed actions.
- A shared compact `ActionPanel` now appears on key internal command/readiness pages to show next action, blocker count, action mode, and a link back into the controlled action queue.
- `/staff/proposed-actions` now connects visually and navigationally back to `/staff/actions`; proposed action approval remains review-state only and does not execute business changes.
- Action rows use existing server actions/RPC-backed workflows only where those already exist, including application review, reservation/payment/go-home/checklist workflows, kennel record actions, media actions, and proposed-action review records.
- Review-only areas remain review-only when no mutation support exists.
- This pass did not add new server actions, RPCs, migrations, auth changes, environment changes, Supabase config changes, storage policy changes, media upload behavior, document generation, signing providers, payment processor behavior, Twilio/SMS/Facebook behavior, AI behavior, public application behavior, customer portal behavior, or customer-facing pages.

### Internal Manual Application And Puppy Save Bug Fix

Implemented and pushed:

- `/staff/applications/new` manual application creation no longer has a blanket production block.
- Manual application creation still requires authenticated `requireStaffProfile()` access and remains restricted to owner/admin users.
- Manual application creation now uses the same server-side Core REST/RPC configuration path in production and development, with production-safe configuration wording.
- Manual application failures now redirect back to `/staff/applications/new` with specific operator outcomes instead of plain `/staff?application=error`.
- `/staff/applications` and `/staff/applications/new` now show safe messages for created, created-no-notification, created-notification-warning, unauthorized, invalid_contact, invalid_terms, invalid_input, existing_customer_needs_review, duplicate_customer_needs_review, save_failed, rpc_failed, and config_missing.
- `/staff/puppies` puppy create failures now classify configuration, authorization, invalid input, missing identifier, RPC missing/signature failure, missing/invalid litter, duplicate identifier, and save failure outcomes instead of showing generic `puppy=error`.
- The puppy create form/action contract was reviewed for field names, optional UUID/date/money handling, and allowed `sex`, `status`, and `publicListingStatus` values.
- This pass did not change RPCs, migrations, auth model, environment files, Supabase config, local Supabase, SMTP behavior, public application behavior, customer-facing pages, payments, Twilio/SMS/Facebook, AI, media uploads, document generation, or signing providers.

### Internal Puppy Assignment / Matchmaking / Waitlist Command Center

Implemented and pushed:

- `/staff/matching` was added as an internal decision-support command center for puppy matching, assignment review, and waitlist readiness.
- The matching center reads existing application, application section, buyer, family, buyer preference, puppy, litter, dog, reservation summary, document, media, and event metadata.
- Readiness now shows applicant preferences, waitlist candidates, available puppies, reservation-ready lanes, blockers, recent reserved activity, and suggested applicant/puppy fit scores.
- Matching labels are advisory only, including strong fit, possible fit, needs review, blocked, already reserved, missing preference data, and missing puppy data.
- Related application, buyer, family, puppy, litter, and reservation detail pages now surface compact matching/readiness context and links back to the Matching Command Center where existing data supports it.
- This pass did not approve or deny applications, assign puppies, create reservations, move money, send messages, generate documents, expose customer-facing matching, create AI/provider behavior, add migrations, or alter storage/auth/environment configuration.

### Internal Documents / Contracts Readiness Center

Implemented and pushed:

- `/staff/documents` was upgraded into an internal Document Command Center for owner/admin document and contract readiness.
- `/staff/documents/[documentId]` was added as a metadata-only document detail route.
- The document center reads existing `core_documents` and `core_document_versions` rows and shows total documents, missing document requirements, pending signature/review, signed/filed records, replaced/stale records, reservation blockers, and go-home blockers.
- Document readiness is derived only from existing metadata linked by reservation, buyer, family, or puppy IDs. Application context is inferred only through linked reservation/buyer/family context because `core_documents` does not own `application_id`.
- Related internal pages now surface compact document/readiness context or direct links where existing data supports it, including application detail, buyer/family 360, reservation detail, puppy detail, go-home/handoff, and payment-plan workflows.
- The navigation label now uses `Documents / Contracts`.
- This pass did not add document generation, file upload behavior, storage buckets, storage policies, migrations, public URLs, customer portal document visibility, signing-provider integration, email/SMS sending, payment behavior, or external-provider calls.

### Internal Media Management Center

Implemented and pushed:

- `/staff/media` was added as an internal Media Command Center for owner/operator media readiness across dogs, puppies, and litters.
- The media center reads existing `core_kennel_media` private metadata rows for dog and puppy photos, including primary image markers, uploaded timestamps, private file metadata, and short-lived signed preview URLs when server-side storage configuration is available.
- Media readiness now highlights dogs missing primary photos, puppies missing primary photos, puppies with no recent photo signal, records with media but no primary image, litters missing gallery signals, and recent private media activity.
- The current `core_kennel_media` table supports `dog` and `puppy` entity types only, so litter media readiness is derived from linked puppy photos and primary puppy image markers. No direct litter upload behavior was added.
- `/staff/dogs/[dogId]`, `/staff/puppies/[puppyId]`, and `/staff/litters` now include clearer internal media readiness summaries and links to the Media Command Center.
- `/staff/litters/[litterId]` was added as a read-only internal litter media readiness detail page using existing litter, dog, puppy, and private puppy media rows.
- Existing dog/puppy private upload and delete actions were left in place and reused only where they already existed. This pass did not create storage buckets, storage policies, migrations, upload behavior, public media URLs, public pages, customer portal media, or external integrations.

### Core Operator Shell Visual System

Implemented and pushed:

- The shared internal `/staff` shell was upgraded into a Core Command Center operator interface with grouped deep-navy navigation, a light top command bar, account/status area, compact mobile navigation, warm operational background, white panels, soft blue accents, amber attention accents, and tighter spacing.
- `src/app/staff/operator-ui.tsx` now includes reusable operator UI helpers for the shell, page headers, metrics, panels, tabs, status pills, alert panels, activity rows, quick actions, and summary grids.
- The upgraded visual system applies broadly across the internal operator workspace, including command, payment, payment-plan, go-home, handoff, application, buyer, family, reservation, and puppy readiness/detail surfaces through the shared shell and operator workspace styling.
- The `/staff` overview wording now uses `Core Operational Overview` and describes server-side Core operational reads without local/development source wording.
- Visible operator-facing wording was cleaned so current-product copy no longer refers to `LOCAL SUPABASE READ-ONLY`, `local Supabase`, `local Core data`, `local database`, `local server`, or `development database`.
- This was a visual system and operator wording pass only. It did not change auth, environment files, Supabase config, migrations, SMTP behavior, public application behavior, payment processor behavior, Twilio/SMS/Facebook, AI, customer portal behavior, customer-facing pages, server-action behavior, or external integrations.

### Public / Embeddable Puppy Application

Implemented and pushed:

- `/apply`
- `/apply/received`
- `/embed/application`
- `/embed/application/received`
- `src/app/apply/actions.ts`
- `src/lib/core/smtp-mailer.ts`

The embedded application form is designed for use inside the public Southwest Virginia Chihuahua website and makes no customer-facing reference to Core. It follows the uploaded PDF application structure:

- Applicant Info
- Puppy Preferences
- Lifestyle & Home
- Payment & Agreement
- Terms and Conditions
- Applicant Declarations
- Date-Time / Signature

The embedded form styling was changed to better match the public website: cream/warm gradient, serif heading, rounded white card, black/gold accents, and Southwest Virginia Chihuahua branding only.

The application submit action now captures the expanded PDF-style fields and stores structured responses into Core application sections:

- `applicant_info`
- `puppy_preferences`
- `lifestyle_home`
- `payment_agreement`

The submit path creates:

- `core_buyers`
- `core_families`
- `core_family_members`
- `core_applications`
- `core_application_sections`
- `core_events`

The form requires:

- applicant name
- email
- state
- Terms acknowledgement
- Applicant Declarations acknowledgement
- typed signature matching the applicant name

### SMTP Application Alerts

Implemented as conditional server-side SMTP behavior through `src/lib/core/smtp-mailer.ts` and the application submit action.

SMTP is attempted only when these server-side environment variables are configured:

```text
SMTP_HOST
SMTP_PORT
SMTP_SECURE
SMTP_USER
SMTP_PASS
SMTP_FROM
APPLICATION_EMAIL_TO
```

When configured, the application submit action attempts to send:

- an owner/operator alert email containing the application details
- a customer confirmation email acknowledging receipt

This is not a payment processor, portal invitation, automatic approval, document generation, SMS, Twilio, Facebook, or AI action.

### Payment Plan Command Center

Implemented and pushed:

- `/staff/payment-plans`

This workspace provides internal owner/admin review of:

- payment plan candidates
- half-down target estimates
- estimated six-month payment amounts
- open balances
- stale payment review
- deposit / half-down blockers
- registration hold review
- paid / clear lane
- watch / standard balance lane
- recent ledger rows
- buyer/family/puppy/reservation links

It is internal ledger/readiness only. It does not move money, create payment links, process refunds, send reminders, update customer portal visibility, or call a payment provider.

### Go-Home And Puppy Handoff Workspaces

Implemented and pushed:

- `/staff/go-home/handoff`
- `/staff/reservations/[reservationId]/handoff`
- `/staff/puppies/[puppyId]/handoff`

These pages provide internal handoff readiness around reservation, puppy, payment, document, checklist, schedule, and location context. They use existing Core data and controlled actions only. They do not send messages, process payments, generate documents, release registration papers, publish puppies, update the customer portal, or call outside providers.

### Internal Owner/Operator UI Organization

Implemented and pushed:

- Major long internal owner/operator pages were reorganized visually with stronger command headers, compact summary strips, sticky segmented section navigation, smaller panels, and reduced card density.
- Updated surfaces include the Command Center, payments, payment plans, go-home readiness, go-home handoff, reservation readiness, reservation handoff, puppy handoff, and other long internal review/readiness pages through the shared operator workspace styling.
- This was a UI organization pass only. It did not change auth, environment configuration, Supabase config, local storage, migrations, SMTP behavior, public application behavior, payment processor behavior, Twilio/SMS/Facebook, AI, portal accounts, server actions, or external integrations.

### Buyer / Family / Application Workspace Completion

Implemented and pushed:

- `/staff/applications`, `/staff/applications/[applicationId]`, `/staff/buyers`, `/staff/buyers/[buyerId]`, `/staff/families`, and `/staff/families/[familyId]` were completed as easier-to-scan internal owner/operator workspaces.
- Application detail now surfaces applicant identity/contact/address, family and buyer links, submitted answer sections, review status, blockers, next action guidance, reservation links, event context, and audit context without changing review action boundaries.
- Buyer and family workspaces now use command headers, compact summary strips, segmented navigation, attention flags, and stronger links across applications, buyers, families, reservations, payments, documents, go-home, events, and Command.
- Visible operator/customer-facing source wording no longer refers to local Supabase/local Core data/local database/local server/development database.
- This was a UI/readability and wording pass only. It did not change auth, database schema, migrations, environment files, Supabase config, local storage, SMTP behavior, public application behavior, payment processor behavior, Twilio/SMS/Facebook, AI, customer pages, server actions, or external integrations.

## Current Operational Workflow

Current implemented workflow now includes:

```text
private owner/operator application entry
  -> application review
  -> internal matching / waitlist decision-support review
  -> approval / reservation creation
  -> deposit/payment ledger recording
  -> ledger-derived balance review
  -> payment plan command review
  -> document/contract readiness review
  -> reservation readiness review
  -> go-home detail update
  -> go-home checklist review
  -> go-home handoff command
  -> reservation handoff detail
  -> puppy handoff detail
  -> website/embedded public application intake
  -> conditional SMTP application receipt alerts
```

## Current Public-Facing State

Public-facing behavior now exists in a limited and specific way:

- `/apply` is a public application form.
- `/embed/application` is an iframe-friendly public application form for the Southwest Virginia Chihuahua website.
- The customer-facing embedded form uses public website language only and avoids Core references.
- The form does not approve applicants, reserve puppies, process payments, create customer portal access, generate documents, or publish listings.
- SMTP confirmation is conditional on server-side SMTP env configuration.

## Current Internal Owner/Operator State

Internal owner/operator routes include, among others:

- `/staff`
- `/staff/command`
- `/staff/proposed-actions`
- `/staff/applications`
- `/staff/applications/new`
- `/staff/applications/[applicationId]` when present in repo state
- `/staff/buyers`
- `/staff/buyers/[buyerId]`
- `/staff/families`
- `/staff/families/[familyId]`
- `/staff/matching`
- `/staff/dogs`
- `/staff/dogs/[dogId]`
- `/staff/litters`
- `/staff/puppies`
- `/staff/puppies/[puppyId]`
- `/staff/puppies/[puppyId]/handoff`
- `/staff/reservations`
- `/staff/reservations/[reservationId]`
- `/staff/reservations/[reservationId]/handoff`
- `/staff/payments`
- `/staff/payment-plans`
- `/staff/go-home`
- `/staff/go-home/handoff`
- `/staff/documents`
- `/staff/documents/[documentId]`
- `/staff/messages`
- `/staff/notifications`
- `/staff/phone-lookup`
- `/staff/kennel-logs`
- `/staff/events`

Internal pages remain owner/operator visibility and controlled workflow surfaces unless explicitly documented otherwise.

## Current Database Foundations

Implemented Core database foundations include:

- buyers
- families
- family members
- applications
- application sections
- dogs
- litters
- puppies
- reservations
- financial ledger
- payment balance view
- receipts
- documents
- document versions
- conversations/messages/phone-call foundations
- notifications/templates/delivery attempt foundations
- go-home groups/details/effective view/checklist items
- events
- audit log
- proposed actions
- private kennel media foundations
- dog document foundations

## Auth And Access Boundary

Implemented owner/operator auth/access pieces:

- Supabase Auth is used for owner/operator login.
- `/staff` requires an authenticated user mapped to an active Core profile.
- `/` and `/login` expose no private Core data.
- Protected internal routes redirect to login rather than exposing private data.
- Owner/admin roles have the current broad internal workflow surface.
- More restrictive helper/staff-role visibility remains a continuing hardening track.

## Current Communication Boundary

Communication is now split into two categories:

1. Internal preview/readiness communication foundation:
   - notification queue
   - templates
   - preview rules
   - delivery-attempt metadata
   - communications readiness workspace

2. Public application receipt SMTP:
   - conditional SMTP application owner alert
   - conditional SMTP customer receipt confirmation
   - no automatic approval or follow-up decisions

No SMS, Twilio, Facebook Messenger, portal messaging, AI-generated replies, payment reminders, denial letters, approval emails, or go-home notices are live unless explicitly added later under approved rules.

## Current Blocked / Not Yet

Still blocked or not implemented unless separately approved:

- full customer portal
- portal account invitation
- payment processor connection
- payment links
- live refunds / chargebacks / fees through a provider
- document generation
- signature provider connection
- automatic registration release
- public puppy publishing from Core
- Twilio/SMS/calls
- Facebook Messenger integration
- AI write actions
- AI buyer decisions
- smart kennel device integration
- Home Assistant control
- cameras / smart mirror / CoreFace
- automatic approvals, denials, reservations, payments, or customer decisions

## Current Next Best Work

Next useful work should stay tight and non-drifting:

1. Validate deployed application form submissions end-to-end.
2. Add owner/admin internal review visibility for public application fields if the existing application detail view does not show the new sections cleanly.
3. Add send logging for SMTP application receipt attempts so every attempted owner/customer email is recorded in Core metadata.
4. Add duplicate application handling and dead-letter/retry behavior for public application submission failures.
5. Continue RLS/security hardening before broader customer-facing access.
