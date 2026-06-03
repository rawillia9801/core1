# Cherolee Core Complete Implementation Checklist
## Status Note

- Current as of this pass: primary checklist source of truth.
- Reflects complete/incomplete Core work across local/dev, staging, production, customer-facing, assistant, and future nervous-system phases.
- Central current truth: this file plus `CURRENT_STATUS.md`.


## Purpose

This checklist is the steering document for Core. It tracks the work from local/development proof, to owner/operator staging, to internal production use, and then customer-facing launch.

Core is the operating system and daily command layer for a one-person owner-operated business. Cristy is the owner/operator and final authority. Future helpers are optional later users only if needed. The existing `/staff` routes can remain as technical route names for now, but planning language should frame the product as an Owner Console, Operator Dashboard, Core Command Center, Core OS, and Core Assistant rather than as a staff-team dashboard.

It must be updated when work lands so the project does not drift.

## Status Legend

| Mark | Meaning |
| --- | --- |
| `[x]` | Completed and committed. |
| `[~]` | In progress or partially completed. |
| `[ ]` | Not started. |
| `[deferred]` | Intentionally postponed. |
| `[blocked]` | Waiting on a decision, credential, export, verification, or owner approval. |

## Current Non-Drift Lane

Current active lane:

```text
Core-native owner/operator operating system foundation
  -> application/reservation/payment workflow verified
  -> preview-only communication safety verified
  -> go-home detail update verified
  -> go-home checklist verified and wired
  -> reservation detail readiness workflow added
  -> kennel add/edit/archive browser-tested
  -> buyers/families/events read-only workspaces verified
  -> Phone Lookup Safety read-only workspace added
  -> Documents read-only workspace added
  -> Document readiness metadata workflow added
  -> Messages read-only workspace added
  -> Kennel Logs read-only workspace added
  -> Core Command Console planning doc added
  -> Core Command Console read-only shell added
  -> Proposed Action Approval Model planning doc added
  -> Proposed Action Queue review-state foundation added
  -> then continue Core-native owner/operator workflows only
```

Core is the active system. Zoho One is cancelled and is not part of the active lineup. Any Zoho-shaped files, tests, screenshots, PDFs, field names, or old notes are historical reference only. They are not an import path, migration source, bridge, compatibility workflow, dry-run import lane, sync source, writeback target, dependency check, planned dependency, or future operating workflow.

Communication safety lane status:

```text
queue-only notifications                          done
seeded draft templates                            done
owner/admin preview page                          done
disabled/preview provider boundary                done
delivery-attempt log table verification            done
preview/blocked attempt logging workflow           done
show attempt logs in /staff/notifications          done
owner/operator-approved vs automatic communication rules    done
warm customer-facing template copy                 done and locally verified
test-send-to-owner                                 later, not started
Hostinger SMTP                                     later, disabled by default
```

Do not jump to live SMTP, customer emails, public forms, portal, documents, payment processor, AI write capability, or polish-only work until the matching safety gates are complete.

## Phase Summary

| Phase | Goal | Status | Rough Distance |
| --- | --- | --- | --- |
| Phase 1 | Local/dev workflow proof | `[~]` Underway | Core owner/operator workflows expanding safely |
| Phase 2 | Owner/operator staging with selected Core records | `[ ]` Not started | 3-6 weeks total from stable local checkpoint |
| Phase 3 | Production owner/operator use | `[ ]` Not started | 2-3 months total from current checkpoint |
| Phase 4A | Minimal customer-facing application path | `[ ]` Not started | About 2 months if tightly scoped |
| Phase 4B | Full customer-facing Core replacement | `[ ]` Not started | 4-6+ months total |

## Phase 0 — Repository And Guardrails

- [x] Repository initialized and pushed to GitHub.
- [x] Correct active repository identified as `rawillia9801/core1` on `main`.
- [x] Wrong duplicate checkout at `C:/Users/rawil/OneDrive/Documents/core1` identified and excluded from active work.
- [x] Next.js TypeScript app scaffold added.
- [x] Supabase project structure added.
- [x] `AGENTS.md` added with Core scope and guardrails.
- [x] `README.md` added with setup, quality checks, migration notes, and deferred work.
- [x] `docs/core/` documentation folder added.
- [x] Canonical checkpoint docs added and updated.
- [x] `.env.local` confirmed ignored by Git.
- [x] `next-env.d.ts` identified as generated/local noise when auto-touched.
- [x] Local-only intake endpoint verification script added for fake payload testing without embedding secrets.
- [ ] Add a short contributor note explaining the correct local path and wrong OneDrive path.

## Phase 1 — Local/Development Workflow Proof

### 1.1 Database Baseline And Smoke Tests

- [x] Core V1 baseline migration added.
- [x] Canonical `core_` table baseline added.
- [x] Buyers modeled as people/contact records, not transactions.
- [x] Families modeled as household/customer groups.
- [x] Reservations modeled as buyer/family plus one puppy transaction.
- [x] Puppies and litters modeled separately.
- [x] Documents and document versions represented as metadata foundations.
- [x] Conversations, messages, calls, templates, and notifications represented as communication foundations.
- [x] Events and audit logs represented separately.
- [x] Integration events represented for future inbound/outbound provider records.
- [x] Future tool-safety tables represented without enabling AI writes.
- [x] Main transaction-wrapped smoke test exists.
- [x] Main smoke test passes and rolls back.
- [x] `npm run lint` passes from prior local checks.

### 1.2 Application Intake Foundation

- [x] Historical Zoho-shaped application notes exist only to understand old data shape. They must not drive new tooling.
- [x] Existing Zoho-shaped intake artifacts are cancelled-direction leftovers and must not be extended, used as an active import path, treated as compatibility workflow, or used for future dependency checks.
- [x] Zoho-shaped intake tests are historical leftovers only; do not add or run Zoho-based validation as the active Core path.
- [x] Core-native private application entry plan added: `docs/core/CORE_NATIVE_APPLICATION_ENTRY_PLAN.md`.
- [x] Core-native manual application RPC added: `core_create_application_manual`.
- [x] Core-native manual application rollback-safe SQL test added.
- [x] Private `/staff/applications/new` owner/admin entry form added.
- [x] Private manual application server action calls `core_create_application_manual`.
- [x] Private Core-native application entry manually verified end-to-end with fake local data.
- [x] Verified Core-native application entry can flow through approval, reservation creation, and deposit/payment ledger balance decrease.
- [x] Guarded local/development application intake endpoint added.
- [x] Guarded local/development endpoint tested with fake report-label payload.
- [x] Intake creates buyer, family, application, application sections, event, and audit records.
- [x] Local-only endpoint verification script added using fake report-label data.
- [ ] Define failed-intake retry/dead-letter behavior for Core-native intake.
- [ ] Define duplicate application handling for repeated Core-native submissions.

### 1.3 Controlled Local/Dev Write Foundations

- [x] Application approval write function added: `core_approve_application`.
- [x] Application approval rollback-safe SQL test added.
- [x] Local/development dashboard approval action added.
- [x] Dashboard approval action calls `core_approve_application` server-side.
- [x] Dashboard approval action uses the authenticated staff profile actor.
- [x] Dashboard approval action writes event/audit through the database function.
- [x] Dashboard approval action sends no email and creates no reservation automatically.
- [x] Reservation creation write function added: `core_create_reservation`.
- [x] Reservation creation rollback-safe SQL test added.
- [x] Controlled local/development reservation creation action added.
- [x] Reservation action converts entered dollar amounts to integer cents server-side before calling `core_create_reservation`.
- [x] Available puppy read filtering and database-function validation prevent duplicate active reservation creation through the controlled workflow.
- [x] Local/dev reservation creation verified through the seeded workflow and dashboard read panel.
- [x] Controlled local/development deposit/payment dashboard action calls `core_record_reservation_payment`.
- [x] Deposit/payment action records only validated `deposit` or `payment` activity and refreshes ledger-derived balance display.
- [x] Local/dev deposit/payment form verified with fake seeded data.
- [x] Controlled financial adjustment database RPC added for local/dev ledger exceptions without dashboard UI.
- [x] Read-only financial adjustment/ledger exception visibility added to dashboard.
- [x] Controlled reservation cancellation database RPC added: `core_cancel_reservation`.
- [x] Reservation cancellation rollback-safe SQL test added.
- [x] Cancellation preserves ledger rows and does not imply refunds, fees, chargebacks, documents, or messages.
- [x] Puppy release on cancellation is explicit and protected when another active reservation exists.
- [x] Controlled go-home detail update RPC added: `core_update_go_home_detail`.
- [x] Controlled go-home detail update rollback-safe SQL test added.
- [x] `/staff/go-home` owner/admin go-home detail form added.
- [x] Go-home detail update manually verified locally: form save created one effective read-model row and triggered no external systems.
- [x] Go-home checklist item RPC/table added, tested, and wired into `/staff/go-home`.
- [ ] Define broader server-side write-tool authorization/error pattern.
- [ ] Add low-risk kennel tools only after application/reservation/payment/go-home flow is stable.
- [ ] Prevent direct AI/database writes.

### 1.4 Financial Foundation

- [x] `core_financial_ledger.balance_effect` added.
- [x] `amount_cents` corrected to non-negative magnitude semantics.
- [x] `entry_type` retained as descriptive classification.
- [x] `core_payment_balance_view` updated to calculate balance using `balance_effect`.
- [x] Financial balance remains reservation/ledger-derived and is not copied onto buyers.
- [x] Controlled `core_record_reservation_payment` database RPC added for posted local/dev deposits and payments.
- [x] Rollback-safe payment recording test covers decreasing balance, event/audit writes, input rejection, and duplicate external-reference rejection.
- [x] Payment dashboard action verified locally with fake seeded data: a `$500.00` deposit reduced visible balance from `$2,000.00` to `$1,500.00`.
- [x] Controlled `core_record_financial_adjustment` database RPC added for local/dev credits, refunds, chargebacks, fees, finance charges, and neutral adjustments.
- [x] Financial adjustment rollback-safe SQL test added.
- [x] Adjustment RPC maps `balance_effect` internally and keeps deposit/payment recording separate.
- [x] Read-only Financial Ledger Activity panel added for deposits, payments, credits, refunds, chargebacks, fees, finance charges, and neutral adjustments.
- [x] Ledger panel labels refunds/chargebacks as internal ledger records rather than processor movement.
- [x] Dedicated `/staff/payments` page added for local ledger entry and read-only ledger review.
- [ ] Add further payment recording validation before any staff-facing use.
- [ ] Add dashboard UI for creating financial adjustments only after staff authorization boundaries are designed.
- [ ] Define live payment processor reconciliation and idempotency before live refund/chargeback operations.
- [blocked] Connect payment processor only after ledger write rules and security are complete.

### 1.5 Owner/Operator Workspace And Dashboard Foundation

- [x] Read-only dashboard plan and acceptance criteria documented.
- [x] Static dashboard shell added.
- [x] Dashboard reads local Supabase/Core data for foundation verification.
- [x] Placeholder and not-connected/empty-style shell states started.
- [x] Shell visibly states that production data and live integrations are not connected.
- [x] Received Applications panel reads local Core applications.
- [x] Latest Application Detail panel reads `core_application_sections` and displays grouped responses.
- [x] Phone Lookup Safety panel displays local ambiguity status.
- [x] Latest Events panel displays local event data.
- [x] Reservation Workflow Status panel displays recent local/development reservation context.
- [x] Reservation Workflow Status panel displays linked puppy identity and current puppy status.
- [x] Reservation Workflow Status panel displays ledger-derived payment balance.
- [x] Financial Ledger Activity panel displays ledger rows read-only.
- [x] Ledger panel labels refunds/chargebacks as internal ledger records rather than processor movement.
- [x] Go-home read panel consumes the effective go-home view.
- [x] Dedicated `/staff/applications` page added for application review, approval, and reservation creation.
- [x] Dedicated `/staff/reservations` page added for reservation review, payment entry, and guarded cancellation.
- [x] Dedicated `/staff/reservations/[reservationId]` page added for read-only reservation readiness detail with ledger-derived financial truth, document metadata, go-home readiness, checklist items, blockers, internal links, events, and audit history.
- [x] Dedicated `/staff/payments` page added for local payment entry and ledger activity.
- [x] Dedicated `/staff/notifications` page added for communication preview, rules, templates, and attempt logs.
- [x] Dedicated `/staff/go-home` page added for go-home detail review and owner/admin controlled updates.
- [x] Dedicated `/staff/buyers` page works as a read-only, real-data-only workspace with no external side effects.
- [x] Dedicated `/staff/families` page works as a read-only, real-data-only workspace with no external side effects.
- [x] Dedicated `/staff/events` page works as a read-only Events/Audit workspace with no external side effects.
- [x] Events is enabled in the staff sidebar.
- [x] Dedicated `/staff/phone-lookup` page added as a read-only owner/admin Phone Lookup Safety workspace.
- [x] Phone Lookup is enabled in the staff sidebar.
- [x] Dedicated `/staff/documents` page added as a read-only owner/admin document metadata inventory.
- [x] Documents is enabled in the staff sidebar.
- [x] Dedicated `/staff/messages` page added as a read-only owner/admin communications metadata workspace.
- [x] Messages is enabled in the staff sidebar.
- [x] Dedicated `/staff/kennel-logs` page added as a read-only owner/admin kennel history workspace.
- [x] Kennel Logs is enabled in the staff sidebar.
- [x] `/staff/messages` and `/staff/kennel-logs` selected columns cross-checked against migrations after implementation.
- [x] Dedicated `/staff/command` page added as a read-only Command Console shell.
- [x] Command is enabled in the staff sidebar.
- [x] Shared staff sidebar layout added with ready routes linked and future routes visible but disabled.
- [x] Duplicate top workspace navigation removed; left sidebar is the desktop navigation.
- [x] Staff profile lookup and `requireStaffProfile()` are request-memoized to reduce duplicate layout/page auth reads while preserving server-action checks.
- [x] Add approved read-only data coverage for litter context within reservation detail readiness view.
- [ ] Add proper loading/empty/error states for all read panels.
- [ ] Reduce repeated dashboard data reads if `/staff` or child route performance remains slow after `.next` cache clearing.
- [ ] Replace temporary/local-only data assumptions before staging.

### 1.6 Communications Workflow

- [x] Define Core email template and preview plan: `docs/core/CORE_EMAIL_TEMPLATE_PREVIEW_PLAN.md`.
- [x] Document local Supabase/Core and future email variable names in `.env.example` without secrets.
- [x] Add controlled notification queue database foundation: `core_queue_notification`.
- [x] Add rollback-safe notification queue SQL test.
- [x] Add owner/admin notification or email preview UI before sending: `/staff/notifications`.
- [x] Queue preview-only `application_received` notification after Core-native owner/operator application entry when applicant email exists.
- [x] Manually verify Core-native owner/operator application entry queues an `application_received` preview record and leaves `sent_at` null.
- [x] Add initial preview-only draft email template seed migration.
- [x] Add rollback-safe email template seed SQL test.
- [x] Apply template seed migration locally.
- [x] Verify template seed test locally: all 9 templates are draft, preview-only, send-disabled, and provider-disconnected.
- [x] Show seeded templates clearly in `/staff/notifications` alongside queued previews.
- [x] Add disabled/preview email provider foundation: `src/lib/email/provider.ts`.
- [x] Verify disabled/preview provider foundation with `npm run lint` locally.
- [x] Add delivery-attempt audit table foundation: `core_notification_delivery_attempts`.
- [x] Add rollback-safe delivery-attempt SQL test.
- [x] Verify delivery-attempt foundation locally with focused SQL test.
- [x] Add preview/blocked attempt logging script: `scripts/record-preview-notification-attempt.sh`.
- [x] Record a blocked preview attempt locally with `sent = false` and `NO EMAIL SENT` output.
- [x] Show delivery attempts in `/staff/notifications`.
- [x] Define owner/operator-approved versus automatic communication rules in `src/lib/email/communication-rules.ts`.
- [x] Remove Resend from the active provider/script direction; Hostinger SMTP is the only planned real email provider.
- [x] Add warm draft template migration with more complete Southwest Virginia Chihuahua customer copy and no customer-facing internal system name.
- [x] Add warm template smoke test covering draft/preview-only flags, no customer-facing internal system name, non-tiny bodies, unique IDs, and refund safety copy.
- [x] Warm template migration/test verified locally.
- [ ] Log all generated messages and staff/customer interactions.
- [ ] Design test-send-to-owner only after warm templates and preview/blocked delivery logs are verified.
- [blocked] Keep Hostinger SMTP disconnected until preview, override-recipient, send logging, and test-send rules are approved.
- [blocked] Keep customer email sending disabled.

### 1.7 Go-Home Foundation

- [x] `core_go_home_groups` added as optional shared pickup/delivery event.
- [x] `core_go_home_details` remains reservation-level current detail.
- [x] One current go-home detail per reservation enforced.
- [x] Multiple reservation details can share one go-home group.
- [x] Explicit individual override fields added.
- [x] Grouped rows use group defaults unless `has_individual_override = true`.
- [x] Override fields are rejected when the override flag is false.
- [x] `override_reason` is required when the override flag is true.
- [x] `balance_cleared_status` documented as operational readiness only.
- [x] `core_go_home_effective_view` added.
- [x] Effective read model test covers `group_default`, `individual_override`, and `ungrouped_detail`.
- [x] Local/dev go-home update action added after reservation flow stabilized.
- [x] `core_update_go_home_detail(...)` added and tested.
- [x] `/staff/go-home` enabled in navigation.
- [x] `/staff/go-home` owner/admin Set Go-Home Detail form added.
- [x] Manual browser save verified a visible effective go-home row.
- [x] `core_go_home_checklist_items` table and `core_upsert_go_home_checklist_item(...)` added, tested, and wired into `/staff/go-home`.
- [ ] Add go-home communication/document handoff rules.

### 1.8 Phone Lookup Safety

- [x] `core_phone_lookup_matches_view` added for distinct phone contact matches.
- [x] `core_phone_lookup_summary_view` added for match count and ambiguity decision.
- [x] `core_phone_lookup_view` updated to redact sensitive context for ambiguous phone numbers.
- [x] Ambiguous phone matches require verification and recommend staff routing.
- [x] Smoke tests cover single phone match, duplicate buyer/family phone match, and family-linked profile phone match.
- [x] Build read-only owner/admin `/staff/phone-lookup` safety workspace from existing Core views.
- [x] Staff role is restricted from phone lookup details.
- [ ] Design actual verification workflow.
- [ ] Build server-side phone lookup endpoint.
- [ ] Add staff routing behavior for ambiguous matches.
- [blocked] Connect Twilio only after endpoint and verification workflow are tested.

### 1.9 Documents Read-Only Workspace

- [x] `core_documents` and `core_document_versions` schema confirmed in the Core baseline.
- [x] `/staff/documents` added as a read-only owner/admin workspace.
- [x] Documents sidebar link enabled after the page was built.
- [x] Page reads existing Core document metadata and document version metadata only.
- [x] Page does not generate documents, request signatures, upload files, expose portal links, send email, or call external providers.
- [x] Staff role is restricted from document inventory details.
- [x] `/staff/documents` enhanced into internal Document Readiness with metadata counts, grouped document records, reservation requirement checks, and document-related go-home blockers.
- [x] Document readiness remains metadata-only and does not add document generation, signing providers, upload/storage writes, downloads, email/SMS, customer portal delivery, or external provider calls.
- [x] Browser-check `/staff/documents` as owner/admin.
- [ ] Design future document generation/signature/upload/storage rules only after explicit approval.

### 1.10 Messages Read-Only Workspace

- [x] `core_conversations`, `core_messages`, `core_notifications`, and `core_notification_delivery_attempts` schema confirmed.
- [x] `/staff/messages` added as a read-only owner/admin workspace.
- [x] Messages sidebar link enabled after the page was built.
- [x] Page reads existing Core communication, notification, and delivery-attempt metadata only.
- [x] Page does not send email, send SMS, create replies, create notifications, write messages, or call external providers.
- [x] Staff role is restricted from message inventory details.
- [x] Browser-check `/staff/messages` as owner/admin after real local `/login` sign-in.

### 1.11 Kennel Logs Read-Only Workspace

- [x] Kennel event types and audit actions confirmed from existing Core migrations.
- [x] `/staff/kennel-logs` added as a read-only owner/admin workspace.
- [x] Kennel Logs sidebar link enabled after the page was built.
- [x] Page reads existing Core kennel `core_events` and `core_audit_log` rows only.
- [x] Page does not edit, archive, publish listings, send messages, generate documents, move payments, or call external systems.
- [x] Staff role is restricted from kennel history details.
- [x] Browser-check `/staff/kennel-logs` as owner/admin after real local `/login` sign-in.

### 1.12 Future Core Command Console

- [x] Command Console planning document added: `docs/core/CORE_COMMAND_CONSOLE_PLAN.md`.
- [x] Read-only `/staff/command` shell added with no AI provider, no execution writes, no autonomous action records, and no external systems.
- [x] Proposed Action Approval Model planning document added: `docs/core/CORE_PROPOSED_ACTION_APPROVAL_MODEL.md`.
- [x] Build read-only Command Console shell only after approval.
- [x] Browser-check `/staff/command` as owner/admin after real local `/login` sign-in.
- [x] Browser-check `/staff/proposed-actions` as owner/admin after real local `/login` sign-in; review/approval state does not execute business changes.
- [x] Proposed Action Queue can create, approve, and reject proposal review records only.
- [ ] Design proposed-action execution only after a separate approval task defines exact action types, validation, role gates, and event/audit requirements.
- [blocked] AI provider calls, model integrations, autonomous actions, and AI write tools remain blocked.

## Phase 2 — Owner/Operator Staging With Selected Core Records

### 2.1 Authentication And Access Boundary

- [x] Staff authentication and access-boundary planning document added: `docs/core/CORE_STAFF_AUTH_PLAN.md`.
- [x] Supabase Auth packages added for the staff auth foundation.
- [x] Minimal staff login page added.
- [x] Protected `/staff` route added with active staff profile requirement.
- [x] Root `/` route changed to a non-sensitive landing page.
- [~] Staff profile lookup maps Supabase Auth user to `core_profiles.auth_user_id`; it currently uses service role server-side as a transitional bridge until production service-role boundaries are reviewed.
- [~] Separate local/dev service-role usage from staging/production access patterns.
- [x] Add per-action server-side authorization checks for current dashboard actions.
- [x] Replace static local/development actor env usage with authenticated staff profile actors for approval, reservation creation, deposit/payment recording, cancellation, and go-home detail update.
- [x] Map `auth.users.id` to active `core_profiles.auth_user_id` staff profiles for staff route access.
- [x] Locally verify staff login and active profile mapping.
- [x] Locally verify `core_audit_log.actor_profile_id` uses the authenticated staff profile for approval and payment recording.
- [x] Add local/dev helper for switching mapped staff profile role/status during authorization testing.
- [x] Require authenticated active staff context before staff dashboard service-role reads run.
- [x] Add role-based dashboard read filtering for staff versus owner/admin.
- [x] Restrict staff users from fetching/seeing financial ledger activity, full audit/activity rows, phone lookup details, and the general event feed.
- [x] Manually verify owner/admin/staff dashboard read scopes with the local role helper.
- [x] Restore the local mapped profile to `owner` active after read-scope verification.
- [x] Request-memoize staff auth/profile lookup to reduce duplicate layout/page reads while keeping server actions independently authorized.
- [ ] Add admin/staff role assignment flow.
- [ ] Verify unauthorized role behavior, especially staff cancellation with puppy release and go-home updates.
- [ ] Verify unauthorized role behavior for application detail review actions.
- [ ] Add a staging environment separate from local dev.
- [ ] Add environment variable documentation for staging without committing secrets.
- [ ] Add deployment checklist for staging.

### 2.2 RLS And Security

- [x] Add first-wave internal RLS helper functions.
- [x] Enable first-wave RLS on internal profile, application, buyer/family, reservation, ledger, event/audit, and proposed-action tables.
- [x] Add first-wave admin/staff read policies for the tested table surface.
- [ ] Finish remaining admin/staff RLS table coverage.
- [ ] Implement buyer/family portal access policies later, not before portal design.
- [ ] Implement public/anonymous access boundaries.
- [~] Implement service-role-only operation rules.
- [x] Add first-wave RLS policy tests.
- [~] Verify no sensitive tables/views are exposed to live clients before policies exist.
- [ ] Review all read models for sensitive data leakage.
- [ ] Review all server actions for authorization and audit coverage.

### 2.3 Selected Real Data Display

- [x] Define what selected real data means for first staging test.
- [x] Add selected real-data staging plan: `docs/core/CORE_SELECTED_REAL_DATA_STAGING_PLAN.md`.
- [x] Add staging readiness checklist: `docs/core/CORE_STAGING_READINESS_CHECKLIST.md`.
- [x] Add first staging environment setup plan: `docs/core/CORE_FIRST_STAGING_ENVIRONMENT_PLAN.md`.
- [x] Add selected real-data field review template: `docs/core/CORE_SELECTED_REAL_DATA_FIELD_REVIEW_TEMPLATE.md`.
- [x] Add rollback-only selected application dry-run intake helper.
- [x] Decide first real data should be one or two owner-approved real application records only.
- [ ] Use owner-approved Core-native records for staging when ready.
- [blocked] Redact or handle sensitive fields during development review using the field review template before any import.
- [ ] Validate field shapes against Core intake path chosen for staging.
- [ ] Enter or stage owner-approved Core-native records through approved Core workflows when ready.
- [blocked] Stage selected real records only after exact records, field review, fields, staging environment plan, environment, verification checklist, readiness checklist, and rollback plan are approved.
- [x] Add local owner/admin application detail review workflow.
- [x] Add local owner/admin application approve, decline, needs-info, and internal-note review actions.
- [ ] Verify received applications display correctly in staging.
- [ ] Verify application details display correctly in staging.
- [ ] Verify no emails/messages/payments are triggered by selected record setup.

## Phase 3 — Production Owner/Operator Use

- [ ] Use Core to review real applications internally.
- [ ] Use Core to approve applications internally.
- [x] Add local decline/needs-follow-up application review actions for owner/admin only.
- [x] Add local internal application review note workflow.
- [ ] Add staff activity/audit review surface.
- [ ] Verify reservation creation with real-like data in staging.
- [ ] Add staff-reviewed financial adjustment UI only after authorization boundaries exist.
- [x] Add controlled go-home group/detail update action foundation locally.
- [~] Add go-home readiness checklist workflow foundation locally.
- [ ] Add balance clearance workflow display without copying financial truth.
- [ ] Add shared multi-puppy pickup/delivery workflow.
- [ ] Add go-home event/audit review.
- [ ] Decide module-by-module cutover order.

## Phase 4A — Minimal Customer-Facing Application Path

This is the tighter estimate track. It is not the full portal replacement.

- [ ] Public `/apply` route.
- [ ] Public application submission into Core-native intake.
- [ ] Owner/operator review path after public application submission.
- [ ] Basic application-received notification queue.
- [ ] Owner/operator-approved or preview-only email confirmation rules.
- [ ] Minimal public privacy/terms visibility.
- [ ] Customer-facing RLS/public write boundary tests.

Estimated target if tightly scoped and no major security redesign is required: about 2 months.

## Phase 4B — Full Customer-Facing Core Replacement

This is the larger portal/documents/payments/signatures track.

- [ ] Define portal route list.
- [ ] Define family login/access model.
- [ ] Define portal dashboard.
- [ ] Define my puppy page.
- [ ] Define documents page.
- [ ] Define payments page.
- [ ] Define go-home page.
- [ ] Define messages page.
- [ ] Define resources/care-guide page.
- [ ] Build only after RLS and document visibility rules exist.
- [ ] Inventory document requirements: contract, health guarantee, bill of sale, payment agreement, receipts, vaccine/health records, care guides, pupdate packets.
- [ ] Design document template records, merge fields, generation runs, versioning, and approval gates.
- [ ] Define storage and signed URL rules.
- [ ] Integrate signature provider only after provider choice and approval.
- [ ] Decide payment processor.
- [ ] Define payment request/invoice workflow.
- [ ] Define customer payment visibility.
- [ ] Define receipt generation workflow.
- [ ] Define refunds/chargebacks and reconciliation process.
- [ ] Add payment processor integration only after ledger/security rules are complete.
- [ ] Define customer portal message/conversation workflow.
- [ ] Define website chat/customer inquiry workflow.
- [ ] Define email reply workflow.
- [ ] Define what Core may answer automatically.
- [ ] Define what must route to Cristy or any future helper.
- [ ] Keep sensitive decisions owner/operator-approved.

Estimated target for full replacement: 4-6+ months total from current checkpoint.

## Still Not Connected Live

- [~] First-wave internal RLS is enabled locally; remaining table coverage, service-role review, staging policies, and customer-facing policies are incomplete.
- [ ] Zoho is historical reference only and is not connected, planned, imported from, synced with, written back to, or treated as a dependency.
- [ ] Twilio is not connected live.
- [ ] Email is not sending.
- [ ] Hostinger SMTP is not connected.
- [ ] Payments are not connected to a payment processor.
- [ ] No production data import has occurred.
- [ ] Document generation is not implemented.
- [ ] Signature provider integration is not implemented.
- [ ] Customer portal is not implemented.
- [ ] Public website replacement is not implemented.
- [ ] Kennel observation/log-entry write tools are not implemented.
- [ ] Production-authenticated dashboard actions are not implemented.

## Current Verified Commands

From Git Bash in the repository root, use focused validation only. Do not rerun everything after every small change.

Recently verified from user command output:

```bash
cat supabase/migrations/20260526330000_warm_email_templates.sql | docker exec -i supabase_db_core1 psql -U postgres -d postgres -v ON_ERROR_STOP=1
cat supabase/tests/warm_email_templates_tests.sql | docker exec -i supabase_db_core1 psql -U postgres -d postgres -v ON_ERROR_STOP=1
cat supabase/migrations/20260526340000_core_update_go_home_detail.sql | docker exec -i supabase_db_core1 psql -U postgres -d postgres -v ON_ERROR_STOP=1
cat supabase/tests/core_update_go_home_detail_tests.sql | docker exec -i supabase_db_core1 psql -U postgres -d postgres -v ON_ERROR_STOP=1
npm run lint
```

Next focused validation needed after implementation changes:

```bash
npm run lint
```

If Next.js throws `Unexpected end of JSON input` after cache compaction, clear only the local build cache:

```bash
rm -rf .next
npm run dev
```

Do not run `supabase db reset --local` for this validation.

## Immediate Next Ordered Tasks

1. [ ] Pull latest changes.
2. [x] Browser-check `/staff/messages` as owner/admin.
3. [x] Browser-check `/staff/kennel-logs` as owner/admin.
4. [x] Browser-check `/staff/command` and `/staff/proposed-actions` as owner/admin.
5. [ ] Run `npm run lint` after UI changes.
6. [x] Browser-check `/staff/documents` as owner/admin.
7. [ ] Keep proposed-action execution blocked until a separate approved implementation task.

## Stop Conditions

Stop and review before continuing if any task attempts to:

- Import production data.
- Enable RLS without policy tests.
- Connect Twilio, Zoho, Hostinger SMTP, email sending, payment processor, Home Assistant, cameras, or smart mirror.
- Build customer-facing behavior without access rules.
- Add AI write capability without tool-safety design.
- Change financial balance semantics.
- Change go-home cardinality or override semantics.
- Add dashboard polish that does not advance the real workflow.
