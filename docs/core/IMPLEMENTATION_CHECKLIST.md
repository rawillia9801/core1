# Cherolee Core Complete Implementation Checklist

## Purpose

This checklist is the steering document for Core. It tracks the work from local/development proof, to staff-only staging, to internal production use, and then customer-facing launch.

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
Core-native staff operating system foundation
  -> application/reservation/payment workflow verified
  -> preview-only communication safety verified
  -> go-home detail update verified
  -> go-home checklist SQL test next
  -> wire go-home checklist into /staff/go-home next
  -> then continue Core-native staff workflows only
```

Core is the active system. Zoho One is cancelled and is not part of the active lineup. Any Zoho-shaped intake or documentation is legacy/import compatibility only, not a live dependency, bridge, writeback target, or planned operating workflow.

Communication safety lane status:

```text
queue-only notifications                          done
seeded draft templates                            done
owner/admin preview page                          done
disabled/preview provider boundary                done
delivery-attempt log table verification            done
preview/blocked attempt logging workflow           done
show attempt logs in /staff/notifications          done
staff-approved vs automatic communication rules    done
warm customer-facing template copy                 done and locally verified
test-send-to-owner                                 later, not started
Hostinger SMTP                                     later, disabled by default
```

Do not jump to live SMTP, customer emails, public forms, portal, documents, payment processor, AI write capability, or polish-only work until the matching safety gates are complete.

## Phase Summary

| Phase | Goal | Status | Rough Distance |
| --- | --- | --- | --- |
| Phase 1 | Local/dev workflow proof | `[~]` Underway | Core staff workflows expanding safely |
| Phase 2 | Staff-only staging with selected real data | `[ ]` Not started | 3-6 weeks total from stable local checkpoint |
| Phase 3 | Production internal staff use | `[ ]` Not started | 2-3 months total from current checkpoint |
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

- [x] Legacy Zoho-shaped application field mapping documentation exists for compatibility/import reference only.
- [x] `core_ingest_zoho_application` exists for Zoho-shaped compatibility/import/dry-run support only.
- [x] Zoho-shaped intake tests exist as compatibility tests only.
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
- [~] Go-home checklist item RPC/table added; SQL test and UI wiring are next.
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

### 1.5 Staff Workspace And Dashboard Foundation

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
- [x] Dedicated `/staff/payments` page added for local payment entry and ledger activity.
- [x] Dedicated `/staff/notifications` page added for communication preview, rules, templates, and attempt logs.
- [x] Dedicated `/staff/go-home` page added for go-home detail review and owner/admin controlled updates.
- [x] Shared staff sidebar layout added with ready routes linked and future routes visible but disabled.
- [x] Duplicate top workspace navigation removed; left sidebar is the desktop navigation.
- [x] Staff profile lookup and `requireStaffProfile()` are request-memoized to reduce duplicate layout/page auth reads while preserving server-action checks.
- [ ] Add approved read-only data coverage for litter context within reservation workflow views.
- [ ] Add proper loading/empty/error states for all read panels.
- [ ] Reduce repeated dashboard data reads if `/staff` or child route performance remains slow after `.next` cache clearing.
- [ ] Replace temporary/local-only data assumptions before staging.

### 1.6 Communications Workflow

- [x] Define Core email template and preview plan: `docs/core/CORE_EMAIL_TEMPLATE_PREVIEW_PLAN.md`.
- [x] Add controlled notification queue database foundation: `core_queue_notification`.
- [x] Add rollback-safe notification queue SQL test.
- [x] Add owner/admin notification or email preview UI before sending: `/staff/notifications`.
- [x] Queue preview-only `application_received` notification after Core-native staff application entry when applicant email exists.
- [x] Manually verify Core-native staff application entry queues an `application_received` preview record and leaves `sent_at` null.
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
- [x] Define staff-approved versus automatic communication rules in `src/lib/email/communication-rules.ts`.
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
- [~] `core_go_home_checklist_items` table and `core_upsert_go_home_checklist_item(...)` added; SQL test and UI wiring are next.
- [ ] Add go-home communication/document handoff rules.

### 1.8 Phone Lookup Safety

- [x] `core_phone_lookup_matches_view` added for distinct phone contact matches.
- [x] `core_phone_lookup_summary_view` added for match count and ambiguity decision.
- [x] `core_phone_lookup_view` updated to redact sensitive context for ambiguous phone numbers.
- [x] Ambiguous phone matches require verification and recommend staff routing.
- [x] Smoke tests cover single phone match, duplicate buyer/family phone match, and family-linked profile phone match.
- [ ] Design actual verification workflow.
- [ ] Build server-side phone lookup endpoint.
- [ ] Add staff routing behavior for ambiguous matches.
- [blocked] Connect Twilio only after endpoint and verification workflow are tested.

## Phase 2 — Staff-Only Staging With Selected Real Data

### 2.1 Authentication And Access Boundary

- [x] Staff authentication and access-boundary planning document added: `docs/core/CORE_STAFF_AUTH_PLAN.md`.
- [x] Supabase Auth packages added for the staff auth foundation.
- [x] Minimal staff login page added.
- [x] Protected `/staff` route added with active staff profile requirement.
- [x] Root `/` route changed to a non-sensitive landing page.
- [~] Staff profile lookup maps Supabase Auth user to `core_profiles.auth_user_id`; it currently uses service role server-side as a transitional bridge until RLS exists.
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
- [ ] Add a staging environment separate from local dev.
- [ ] Add environment variable documentation for staging without committing secrets.
- [ ] Add deployment checklist for staging.

### 2.2 RLS And Security

- [ ] Implement admin/staff access policies.
- [ ] Implement buyer/family portal access policies later, not before portal design.
- [ ] Implement public/anonymous access boundaries.
- [ ] Implement service-role-only operation rules.
- [ ] Add RLS policy tests.
- [ ] Verify no sensitive tables/views are exposed to live clients before policies exist.
- [ ] Review all read models for sensitive data leakage.
- [ ] Review all server actions for authorization and audit coverage.

### 2.3 Selected Real Data Import/Display

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
- [ ] Run local/dev dry-run import with one owner-approved local JSON payload stored outside the repository.
- [blocked] Run staging import with owner-approved limited records only after exact records, field review, fields, staging environment plan, environment, import method, verification checklist, readiness checklist, and rollback plan are approved.
- [ ] Verify received applications display correctly in staging.
- [ ] Verify application details display correctly in staging.
- [ ] Verify no emails/messages/payments are triggered by import.

## Phase 3 — Production Internal Staff Use

- [ ] Use Core to review real applications internally.
- [ ] Use Core to approve applications internally.
- [ ] Add decline/needs-follow-up action only after approval flow is stable.
- [ ] Add internal notes/follow-up workflow.
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
- [ ] Staff review path after public application submission.
- [ ] Basic application-received notification queue.
- [ ] Staff-approved or preview-only email confirmation rules.
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
- [ ] Define what must route to staff.
- [ ] Keep sensitive decisions staff-approved.

Estimated target for full replacement: 4-6+ months total from current checkpoint.

## Still Not Connected Live

- [ ] Production RLS is not enabled.
- [ ] Zoho is not connected live and is not part of the active lineup.
- [ ] Twilio is not connected live.
- [ ] Email is not sending.
- [ ] Hostinger SMTP is not connected.
- [ ] Payments are not connected to a payment processor.
- [ ] No production data import has occurred.
- [ ] Document generation is not implemented.
- [ ] Signature provider integration is not implemented.
- [ ] Customer portal is not implemented.
- [ ] Public website replacement is not implemented.
- [ ] Kennel logging write tools are not implemented.
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

Next focused validation needed:

```bash
cat supabase/migrations/20260526350000_core_go_home_checklist_items.sql | docker exec -i supabase_db_core1 psql -U postgres -d postgres -v ON_ERROR_STOP=1
cat supabase/tests/core_go_home_checklist_items_tests.sql | docker exec -i supabase_db_core1 psql -U postgres -d postgres -v ON_ERROR_STOP=1
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
2. [ ] Apply and verify go-home checklist migration/test locally.
3. [ ] Wire go-home checklist item controls into `/staff/go-home`.
4. [ ] Run `npm run lint` after UI/server-action changes.
5. [ ] Browser-check `/staff/go-home` and save a checklist item.
6. [ ] Continue Core-native staff workflows only.

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
