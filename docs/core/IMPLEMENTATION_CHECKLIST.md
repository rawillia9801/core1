# Cherolee Core Complete Implementation Checklist

## Status Note

- Current as of this documentation pass after the Buyer Portal / My Puppy Portal readiness foundation.
- Central current truth: this file plus `docs/core/CURRENT_STATUS.md`.
- This checklist tracks actual completed work, partially complete work, blocked work, and next work. It must be updated whenever implementation changes land.

## Status Legend

| Mark | Meaning |
| --- | --- |
| `[x]` | Completed and committed. |
| `[~]` | Implemented or underway but needs validation/hardening. |
| `[ ]` | Not started. |
| `[blocked]` | Blocked until owner approval, credentials, design, validation, or security work is complete. |
| `[deferred]` | Intentionally postponed. |

## Current Non-Drift Lane

```text
Core-native owner/operator operating system foundation
  -> private application/reservation/payment workflow
  -> kennel/litter/puppy/dog operational workspaces
  -> buyer/family 360 workspaces
  -> internal matching / waitlist decision-support review
  -> document/message/payment/go-home readiness workspaces
  -> controlled action command center and proposed-action review foundation
  -> communications / notification / follow-up command center
  -> deterministic Core intelligence / readiness rules / proposed action engine
  -> buyer portal / my puppy portal readiness foundation with unlinked safe states
  -> public/embedded website application intake
  -> conditional SMTP receipt alerts for application intake
  -> next: verify public application submissions, SMTP logging, duplicate handling, and internal application detail visibility
```

## Hard Boundaries

- Zoho One is cancelled and historical only.
- Existing `/staff` route names are technical names; product language should remain owner/operator/Core Command Center language.
- Public website/application pages must not expose internal Core/admin/staff wording.
- Buyer portal pages must stay placeholder/customer-safe until secure account linking and access policies exist.
- No payment processor is connected.
- No portal account is created from application submission.
- No application approval, denial, waitlist decision, reservation, puppy assignment, or payment happens automatically.
- No document generation/signature provider is connected.
- No SMS/Twilio/Facebook/AI/smart-home/camera behavior is connected.
- SMTP application receipt email is the only currently implemented live external side-effect path, and it runs only when server-side SMTP environment variables are configured.

## Phase 0 — Repository And Guardrails

- [x] Active repo confirmed as `rawillia9801/core1` on `main`.
- [x] Correct local path is `C:\Users\rawil\core1`.
- [x] Active UI worktree path is `C:\Users\rawil\core1-ui-worktree`.
- [x] OneDrive worktrees/checkouts are excluded from active work.
- [x] Next.js App Router / TypeScript scaffold exists.
- [x] Supabase project structure exists.
- [x] Canonical docs live under `docs/core/`.
- [x] `.env.local` remains ignored by Git.
- [x] Service-role keys and SMTP secrets must remain server-side only.

## Phase 1 — Internal Owner/Operator Foundation

### Database And Core Model

- [x] Core V1 canonical model exists for buyers, families, applications, application sections, dogs, litters, puppies, reservations, ledger, receipts, documents, communications, notifications, events, audit logs, integration events, and future tool-safety foundations.
- [x] Buyers are people/contact records, not transactions.
- [x] Families are household/customer groups.
- [x] Reservations are buyer/family plus one puppy transaction.
- [x] Ledger-derived financial truth is the financial source of truth.
- [x] Events and audit logs are separate foundations.
- [x] Proposed action review records exist; approval does not execute business changes.

### Application Intake And Review

- [x] Private owner/admin application entry exists at `/staff/applications/new`.
- [x] Core-native manual application creation RPC exists: `core_create_application_manual`.
- [x] Private application entry creates buyer, family, application, sections, events, and audit rows.
- [x] Private manual application creation is enabled for authenticated owner/admin users in production; the earlier blanket production block was removed.
- [x] Manual application failures now return specific operator-safe outcomes instead of redirecting to generic `/staff?application=error`.
- [x] Manual application result messages cover created, created-no-notification, created-notification-warning, unauthorized, invalid_contact, invalid_terms, invalid_input, existing_customer_needs_review, duplicate_customer_needs_review, save_failed, rpc_failed, and config_missing.
- [x] Application detail review actions are enabled for authenticated owner/admin production use through the existing server-side Core REST/RPC configuration path.
- [x] Application detail review failures classify invalid input, RPC failure, missing config, save failure, and unauthorized states without exposing raw service-role/database errors on screen.
- [x] Application approval RPC exists: `core_approve_application`.
- [x] Application list exists at `/staff/applications`.
- [x] `/staff/matching` exists as an internal Puppy Assignment / Matchmaking / Waitlist Command Center.
- [x] Matching reads existing application sections, buyer/family context, buyer preferences, puppy/litter/dog records, reservation summary rows, document metadata, private media metadata, and events for decision-support only.
- [x] Matching shows applicant preference fit, available puppy lanes, waitlist candidates, reservation-ready review, blockers, recent reserved activity, and source-record links without approving, denying, reserving, assigning, messaging, charging, generating documents, or calling providers.
- [x] Public `/apply` application route exists.
- [x] Public `/apply/received` confirmation route exists.
- [x] Embeddable `/embed/application` route exists for website iframe use.
- [x] Embeddable `/embed/application/received` route exists as the iframe-friendly received page.
- [x] Embedded form follows the uploaded PDF structure: Applicant Info, Puppy Preferences, Lifestyle & Home, Payment & Agreement, Terms, Applicant Declarations, Date-Time/Signature.
- [x] Embedded form was restyled to match the public Southwest Virginia Chihuahua website and no longer references Core publicly.
- [x] Public application action stores expanded fields into `core_application_sections` groups.
- [x] Public application action creates buyer, family, family member, application, application sections, and event rows.
- [x] Terms acknowledgement is required.
- [x] Applicant declarations acknowledgement is required.
- [x] Typed signature is required and must match the applicant name.
- [~] Public application submission is deployed, but end-to-end real submission validation remains required.
- [ ] Add duplicate application handling for repeated public submissions.
- [ ] Add dead-letter/retry handling for failed public application writes.
- [ ] Confirm internal application detail/review shows the new public sections cleanly.

### Reservations, Go-Home, And Handoff

- [x] Reservation creation RPC exists: `core_create_reservation`.
- [x] Reservation creation blocks duplicate active puppy reservations.
- [x] Reservation, payment, cancellation, and go-home actions classify invalid input, not eligible, missing links, blocked, RPC failure, missing config, and save failure outcomes where determinable.
- [x] `/staff/reservations` exists.
- [x] `/staff/reservations/[reservationId]` exists.
- [x] `/staff/reservations/[reservationId]/handoff` exists.
- [x] `core_update_go_home_detail(...)` exists.
- [x] `core_go_home_groups`, `core_go_home_details`, and `core_go_home_effective_view` exist.
- [x] `core_go_home_checklist_items` and `core_upsert_go_home_checklist_item(...)` exist.
- [x] `/staff/go-home` exists.
- [x] `/staff/go-home/handoff` exists.
- [x] `/staff/puppies/[puppyId]/handoff` exists.
- [x] Go-home/handoff pages are internal readiness only.
- [x] Go-home readiness and handoff surfaces were reorganized with compact command summaries, segmented section navigation, and shorter readiness/action sections while preserving controlled actions and safety boundaries.
- [ ] Add shared multi-puppy pickup/delivery workflow.
- [ ] Add go-home communication/document handoff rules.

### Payments And Payment Plans

- [x] `core_financial_ledger.balance_effect` exists.
- [x] `core_payment_balance_view` derives balances from ledger entries.
- [x] `core_record_reservation_payment(...)` records deposit/payment ledger rows.
- [x] `core_record_financial_adjustment(...)` exists for ledger-only adjustments.
- [x] `/staff/payments` exists as Payment Ledger & Account Readiness workspace.
- [x] `/staff/payment-plans` exists as Payment Plan Command Center.
- [x] Payment Plan Command Center reviews plan candidates, half-down target, estimated six-month payments, stale plans, open balances, registration holds, recent ledger rows, and linked buyer/family/puppy/reservation context.
- [x] Payment ledger and payment-plan pages were reorganized into easier-to-scan operator workspaces with compact summaries, segmented lanes, account/readiness navigation, and clearer adjustment/readiness review without moving money or calling providers.
- [x] Payment pages do not move money, create provider payment links, process refunds, send reminders, update portal visibility, or call payment providers.
- [ ] Add further payment recording validation before broad staff/helper use.
- [ ] Add financial adjustment UI only after authorization boundaries are hardened.
- [blocked] Connect payment processor only after ledger/security/reconciliation rules are complete.

### Kennel, Dog, Litter, Puppy Operations

- [x] Dog, litter, and puppy create RPCs exist.
- [x] Puppy creation now classifies save failures for unauthorized, invalid_input, missing_identifier, rpc_missing_or_failed, config_missing, litter_not_found, invalid_litter, duplicate_identifier, and save_failed instead of generic `puppy=error`.
- [x] Dog, litter, and puppy manage result messages now cover classified authorization, input, config, RPC, and save failure outcomes.
- [x] Puppy create form/action alignment was reviewed for field names, optional UUID/date/money inputs, and allowed sex/status/public listing status values.
- [x] Dog, litter, and puppy list/new/edit/detail/archive routes exist where applicable.
- [x] Neonatal Litter Command workflow exists.
- [x] Expected Litters / Whelping Prep workflow exists.
- [x] Daily Puppy Weight / Neonatal Care Log workflow exists.
- [x] Individual Puppy Detail / Neonatal Growth Timeline exists.
- [x] Puppy detail supports factual weight add/correction and care observation add workflows.
- [x] Buyer/reservation assignment exists through reservation model.
- [x] Dog profile, dog health events, dog document vault, and dog private document upload exist.
- [x] Dog/puppy private media upload foundation exists.
- [x] `/staff/media` exists as an internal Media Command Center using existing `core_kennel_media` private dog/puppy photo metadata.
- [x] Media Command Center shows overall media readiness, dogs missing primary photos, puppies missing primary photos, puppies with stale/no recent photos, records with media but no primary image, litter gallery readiness derived from linked puppy photos, recent private media activity, and links back to dog/puppy/litter records.
- [x] `/staff/dogs/[dogId]` and `/staff/puppies/[puppyId]` include media readiness summaries, primary-photo status, gallery counts, missing-media blockers, and links to the Media Command Center while preserving existing private upload/delete behavior.
- [x] `/staff/litters` includes litter media readiness derived from linked puppy media rows, dam/sire context, missing litter gallery signals, and missing puppy photo/primary blockers.
- [x] `/staff/litters/[litterId]` exists as a read-only internal litter media readiness detail page. Direct litter uploads remain unavailable because the current media table supports dog and puppy entity types only.
- [x] Puppy, litter, and reservation detail pages include compact matching/assignment context and links to `/staff/matching` without changing reservation or assignment behavior.
- [x] Kennel workflows remain internal only and do not diagnose animals, publish puppies, message customers, update a portal, process payments, generate documents, call AI/providers, or control devices.

### Buyer / Family / Relationship Workspaces

- [x] `/staff/buyers` exists.
- [x] `/staff/buyers/[buyerId]` exists as Buyer 360.
- [x] `/staff/buyers/new` and `/staff/buyers/[buyerId]/edit` exist.
- [x] `/staff/families` exists.
- [x] `/staff/families/[familyId]` exists as Family 360.
- [x] `/staff/families/new` and `/staff/families/[familyId]/edit` exist.
- [x] Buyer/family linking uses controlled membership RPC with event/audit rows.
- [x] Buyer/Family 360 remains internal visibility only.
- [x] Buyer/family/application workspaces were completed with command headers, compact summaries, segmented section navigation, blocker/attention panels, next-action guidance, and cross-links to related applications, buyers, families, reservations, puppies, payments, documents, go-home, events, and Command.
- [x] Application detail shows submitted application sections and linked applicant/contact/family/reservation/event/audit context clearly without auto-approval, customer messaging, payment processing, document generation, puppy publishing, portal behavior, or external-provider calls.
- [x] Application, buyer, and family detail pages include compact matching/readiness context and links to `/staff/matching` where existing data supports it.
- [x] Visible operator/customer-facing source wording no longer refers to local Supabase, local Core data, local database, local server, or development database.

### Document / Message / Notification Readiness

- [x] `/staff/documents` exists as owner/admin document readiness workspace.
- [x] `/staff/documents` now functions as an internal Document Command Center using existing `core_documents` and `core_document_versions` metadata.
- [x] `/staff/documents/[documentId]` exists as a metadata-only internal document detail route with linked reservation, buyer, family, and puppy context where recorded.
- [x] Document readiness shows total documents, missing requirements, pending signature/review, signed/filed records, replaced/stale records, reservation blockers, go-home blockers, version metadata, relationship links, and no-record-found empty states.
- [x] Application detail, buyer/family 360, reservation detail, puppy detail, go-home/handoff, and payment-plan workspaces include compact document readiness, counts, or links where existing data supports them.
- [x] Document readiness remains internal visibility only and does not generate documents, request signatures, upload files, create buckets/policies, expose public URLs, update portal visibility, send messages, process payments, or call external providers.
- [x] `/staff/messages` exists as owner/admin communications readiness workspace.
- [x] `/staff/notifications` exists as notification preview/templates/attempt-log workspace.
- [x] `/staff/communications` exists as the internal Communications / Follow-Ups Command Center.
- [x] Communications Command Center reads existing `core_conversations`, `core_messages`, `core_message_templates`, `core_notifications`, `core_notification_delivery_attempts`, `core_events`, applications, buyers, families, reservations, and document metadata.
- [x] Communications readiness shows open/unresolved metadata, queued/pending/sent notification states, recent queued notifications, failed/blocked/skipped attempt states, missing recipient/template review states, template safety, recent activity, and source-record links.
- [x] Communications follow-up prompts cover application review, missing follow-up signal, approved-without-reservation review, buyer/family contact gaps, document signature/review, payment owner review, go-home communication readiness, matching review, and reservation blockers.
- [x] Compact communication/follow-up panels appear on command, actions, application list/detail, buyer/family detail, matching, reservation detail, payments, payment plans, documents, go-home, go-home handoff, and puppy detail pages.
- [x] `/staff/messages` and `/staff/notifications` link back to the Communications Command Center, with notification read failures classified without raw REST/provider error text on screen.
- [x] Notification queue and template foundations exist.
- [x] Delivery attempt logging foundation exists.
- [x] Warm draft customer-facing template copy exists.
- [x] Internal communications readiness remains preview/readiness-only.
- [x] SMTP application receipt helper exists at `src/lib/core/smtp-mailer.ts`.
- [x] Public application submission attempts owner/customer SMTP receipt emails only when server-side SMTP env vars are configured.
- [~] SMTP application receipt is implemented but send logging for each SMTP attempt still needs to be added.
- [ ] Add send logging for SMTP owner/customer receipt attempts.
- [ ] Add test-send-to-owner workflow before expanding SMTP beyond application receipt.
- [blocked] Keep denial/approval/payment/go-home/customer-update emails blocked until approval, logging, and copy rules are complete.

### Command, Events, Proposed Actions

- [x] Shared `/staff` operator shell upgraded with grouped deep-navy navigation, light command top bar, account/status area, compact mobile navigation, warm operational background, white panels, soft blue accents, amber attention accents, tighter spacing, and modern command-system hierarchy.
- [x] Shared operator UI helpers now cover shell, page headers, metric cards, panels, section tabs, status pills, alert panels, activity rows, quick actions, and summary grids without adding a third-party UI library.
- [x] `/staff/command` exists as read-only Core OS Command Center.
- [x] `/staff/command` was reorganized into a segmented command center with Today, Neonatal, Buyers/Families, Payments, Communications, Events/Audit, Proposed Actions, and System lanes while remaining read-only.
- [x] `/staff/actions` exists as the Controlled Action Command Center.
- [x] `/staff/actions` consolidates existing safe action entry points and review-only links across application review, matching, reservation readiness, payment ledger review, payment plans, documents, media, go-home, handoff, puppy detail, and proposed-action review.
- [x] `/staff/actions` also shows buyer/family cleanup rows and litter gallery/media readiness rows using existing data only.
- [x] Shared compact Action panels link major internal command/readiness pages back to `/staff/actions` with next-action, blocker, mode, and safety-boundary context, including command, actions, application list/new/detail, matching, reservation detail, payments, payment plans, documents, media, go-home, handoff, puppies, puppy detail, litters, and litter detail.
- [x] `/staff/proposed-actions` exists as owner/admin proposal queue.
- [x] `/staff/proposed-actions` is upgraded as the Core Intelligence / Readiness Rules / Proposed Actions workspace.
- [x] `/staff/proposed-actions` is visually/navigationally connected to `/staff/actions`, `/staff/command`, `/staff/matching`, `/staff/communications`, `/staff/documents`, and `/staff/media`.
- [x] `/staff/proposed-actions` displays persisted `core_proposed_actions` proposal records and deterministic dynamic readiness rows derived from existing Core data only.
- [x] Readiness rows include reason, priority, category, related-record links, blocker count, suggested workspace, and review-only/action-available indicator.
- [x] Rule categories cover application/buyer/family, matching, reservation, payment, document, media, communication, go-home/handoff, and kennel/care readiness.
- [x] Compact Core Intelligence panels appear on command, actions, proposed-actions, application list/detail, matching, reservation detail, payments, payment plans, documents, media, communications, go-home, go-home handoff, puppy detail, and litter detail pages.
- [x] `/staff/events` exists as read-only Events/Audit workspace.
- [x] `/staff/kennel-logs` exists as read-only kennel event/audit history workspace.
- [x] Proposed action approval remains review-state only and does not execute business changes.
- [x] Proposed-action review flows classify invalid input, RPC failure, missing config, save failure, and unauthorized outcomes.
- [x] Controlled action workflow did not add new mutation workflows, RPCs, migrations, auth changes, env changes, storage policies, provider calls, media upload behavior, document generation, signing behavior, customer portal behavior, or customer-facing pages.
- [x] Operator visual system pass applies broadly to command, payments, payment plans, go-home, go-home handoff, applications, application detail, buyers, buyer detail, families, family detail, reservation detail, reservation handoff, puppy detail, puppy handoff, and the main overview/readiness workspaces while preserving existing behavior.
- [x] Visible operator-facing source wording now uses Core operational language such as `Core Operational Overview` and no longer refers to `LOCAL SUPABASE READ-ONLY`, `local Supabase`, `local Core data`, `local database`, `local server`, or `development database`.
- [x] Long internal review/readiness pages now share compact operator workspace styling with command headers, summary rows, segmented navigation, subtler panels, and reduced card density; no auth, env, Supabase config, migrations, SMTP behavior, public form behavior, payment processor, Twilio/SMS/Facebook, AI, portal, server-action, or external-integration behavior changed.
- [blocked] AI provider calls and AI execution remain blocked.

## Phase 2 — Staging / Selected Records

- [x] Staging plan docs exist.
- [x] Staging readiness checklist exists and has been updated for public application + SMTP receipt behavior.
- [~] Public/embedded application route is deployed, but staging-style verification of a controlled test submission is still required.
- [ ] Verify public test submission creates expected Core records.
- [ ] Verify owner alert email and customer confirmation email when SMTP env vars are configured.
- [ ] Verify no unintended side effects occur.
- [ ] Verify internal owner/admin review visibility of public application submissions.
- [ ] Verify duplicate handling before wider use.

## Phase 3 — Production Owner/Operator Use

- [~] Core is usable for internal owner/operator workflows, but still requires validation and hardening before broad production dependence.
- [ ] Use Core to review real applications internally after submission validation.
- [ ] Use Core to approve/decline/waitlist real applications only after internal review visibility is confirmed.
- [ ] Add staff/helper unauthorized role verification for current sensitive actions.
- [ ] Add staff activity/audit review surface if still needed.
- [ ] Continue RLS/security hardening.

## Phase 4A — Minimal Customer-Facing Application Path

- [x] Public `/apply` route.
- [x] Public application submission into Core-native tables.
- [x] Embedded `/embed/application` route for the website.
- [x] Minimal public terms/declarations/signature visibility.
- [x] Conditional SMTP receipt confirmation and owner alert.
- [~] Owner/operator review path exists generally, but the new public application sections still need explicit review validation.
- [ ] Customer-facing RLS/public write boundary tests.
- [ ] Duplicate/retry/dead-letter behavior.
- [ ] Send logging for SMTP receipt attempts.

## Phase 4B — Full Customer-Facing Core Replacement

Still not complete:

- [~] Buyer portal / My Puppy Portal readiness foundation routes exist with safe unlinked placeholder states.
- [x] `/portal` customer-safe dashboard route exists.
- [x] `/portal/mypuppy`, `/portal/application`, `/portal/reservation`, `/portal/documents`, `/portal/payments`, `/portal/go-home`, `/portal/messages`, `/portal/updates`, and `/portal/resources` routes exist.
- [x] Portal pages do not query private Core records before secure account linking exists.
- [x] Internal buyer/family/reservation/puppy detail pages include portal-readiness panels from existing internal metadata.
- [ ] Full customer portal with secure private record display.
- [ ] Family login/access model.
- [blocked] My puppy private data display.
- [blocked] Documents private data display.
- [blocked] Payments private data display.
- [blocked] Go-home private data display.
- [blocked] Messages private data display.
- [x] Resources/care-guide placeholder page.
- [ ] Document generation/signature provider.
- [ ] Payment processor integration.
- [ ] Portal messaging.

## Still Not Connected Live

- [ ] Payment processor.
- [ ] Twilio/SMS/calls.
- [ ] Facebook Messenger.
- [ ] Document generation.
- [ ] Signature provider.
- [ ] Full customer portal.
- [ ] AI provider/write tools.
- [ ] Smart kennel hardware/device integration.
- [ ] Home Assistant / cameras / CoreFace.

SMTP application receipt email is implemented but conditional on environment configuration and limited to application receipt owner/customer alerts.

## Immediate Next Ordered Tasks

1. Validate protected `/staff/actions` and action-panel routes with real owner/admin access.
2. Validate deployed `/embed/application` submission end-to-end.
3. Verify internal owner/admin application review visibility for the expanded sections.
4. Add SMTP send-attempt logging for owner and customer receipt emails.
5. Add duplicate application handling.
6. Add public write/RLS boundary tests.
7. Continue RLS/security hardening before broader customer-facing access.
