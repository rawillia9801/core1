# Cherolee Core Complete Implementation Checklist

## Purpose

This checklist tracks the full Core path from local foundation work to staff-only staging, internal production use, and customer-facing launch.

It should be updated whenever work lands in the repository. It is intentionally broader than the current sprint so the remaining live-readiness work is visible.

## Status Legend

| Mark | Meaning |
| --- | --- |
| `[x]` | Completed and committed. |
| `[~]` | In progress or partially completed. |
| `[ ]` | Not started. |
| `[deferred]` | Intentionally postponed. |
| `[blocked]` | Waiting on a decision, credential, export, or owner approval. |

## Phase Summary

| Phase | Goal | Status | Rough Distance |
| --- | --- | --- | --- |
| Phase 1 | Local/dev workflow proof | `[~]` Underway | Days |
| Phase 2 | Staff-only staging with selected real data | `[ ]` Not started | 1-2 weeks after Phase 1 basics |
| Phase 3 | Production internal staff use | `[ ]` Not started | 3-6 weeks after security/import work |
| Phase 4 | Customer-facing Core | `[ ]` Not started | 2-4+ months depending on portal/docs/payments/signatures |

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
- [x] `npm run lint` passes.

### 1.2 Financial Foundation

- [x] `core_financial_ledger.balance_effect` added.
- [x] `amount_cents` corrected to non-negative magnitude semantics.
- [x] `entry_type` retained as descriptive classification.
- [x] `core_payment_balance_view` updated to calculate balance using `balance_effect`.
- [x] Smoke tests cover deposit, payment, credit, fee, admin fee, transport fee, finance charge, refund, chargeback, neutral adjustment, invalid balance effect, and negative amount rejection.
- [x] Financial balance remains reservation/ledger-derived and is not copied onto buyers.
- [x] Controlled `core_record_reservation_payment` database RPC added for posted local/dev deposits and payments.
- [x] Rollback-safe payment recording test covers decreasing balance, event/audit writes, input rejection, and duplicate external-reference rejection.
- [x] Guarded local/development dashboard action added for the controlled payment RPC.
- [x] Payment action accepts dollar input and converts it server-side to integer cents before calling the RPC.
- [x] Payment action permits only `deposit` and `payment`; it does not expose refunds, fees, chargebacks, credits, or adjustments.
- [x] Payment action refreshes the dashboard so ledger-derived balance is shown after a successful local/dev record.
- [x] Payment dashboard action verified locally with fake seeded data: a `$500.00` deposit reduced visible balance from `$2,000.00` to `$1,500.00`.
- [x] Controlled `core_record_financial_adjustment` database RPC added for local/dev credits, refunds, chargebacks, fees, finance charges, and neutral adjustments.
- [x] Financial adjustment rollback-safe SQL test added.
- [x] Adjustment RPC maps `balance_effect` internally and keeps deposit/payment recording separate.
- [x] Read-only Financial Ledger Activity panel added for deposits, payments, credits, refunds, chargebacks, fees, finance charges, and neutral adjustments.
- [x] Ledger activity panel distinguishes money received, balance-reducing credit, internal ledger exception, balance-increasing charge, and neutral adjustment rows.
- [ ] Add further payment recording validation before any staff-facing use.
- [x] Define local/development refund/chargeback ledger workflow before live payment operations.
- [ ] Add dashboard UI for creating financial adjustments only after staff authorization boundaries are designed.
- [ ] Define live payment processor reconciliation and idempotency before live refund/chargeback operations.
- [ ] Connect payment processor only after ledger write rules and security are complete.

### 1.3 Go-Home Foundation

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
- [ ] Add local/dev go-home update action only after reservation flow is stable.
- [ ] Add staff-facing go-home checklist workflow.
- [ ] Add go-home communication/document handoff rules.

### 1.4 Phone Lookup Safety

- [x] `core_phone_lookup_matches_view` added for distinct phone contact matches.
- [x] `core_phone_lookup_summary_view` added for match count and ambiguity decision.
- [x] `core_phone_lookup_view` updated to redact sensitive context for ambiguous phone numbers.
- [x] Ambiguous phone matches require verification and recommend staff routing.
- [x] Smoke tests cover single phone match, duplicate buyer/family phone match, and family-linked profile phone match.
- [ ] Design actual verification workflow.
- [ ] Build server-side phone lookup endpoint.
- [ ] Add staff routing behavior for ambiguous matches.
- [ ] Connect Twilio only after endpoint and verification workflow are tested.

### 1.5 Application Intake Foundation

- [x] Zoho application field mapping documentation added.
- [x] `core_ingest_zoho_application` added for Zoho-shaped payloads.
- [x] Core-native private application entry plan added: `docs/core/CORE_NATIVE_APPLICATION_ENTRY_PLAN.md`.
- [x] Core-native manual application RPC added: `core_create_application_manual`.
- [x] Core-native manual application rollback-safe SQL test added.
- [x] Private `/staff/applications/new` owner/admin entry form added.
- [x] Private manual application server action calls `core_create_application_manual`.
- [x] Manual application entry sends no email, queues no notification, and performs no Zoho writeback.
- [x] Private Core-native application entry manually verified end-to-end with fake local data.
- [x] Verified Core-native application entry can flow through approval, reservation creation, and deposit/payment ledger balance decrease.
- [x] Zoho API-name intake rollback-safe SQL test added.
- [x] Zoho report/PDF-label intake compatibility added.
- [x] Zoho report/PDF-label rollback-safe SQL test added.
- [x] Guarded local/development application intake endpoint added.
- [x] Guarded local/development endpoint tested with fake report-label payload.
- [x] Endpoint test documented as writing local dev records rather than rolling back.
- [x] Intake creates buyer, family, application, application sections, event, and audit records.
- [x] Local-only endpoint verification script added using fake report-label data.
- [ ] Confirm exact live Zoho webhook/API payload before live connection.
- [ ] Define failed-intake retry/dead-letter behavior.
- [ ] Define duplicate application handling for repeated Zoho submissions.

### 1.6 Read-Only Dashboard Foundation

- [x] Read-only dashboard plan and acceptance criteria documented.
- [x] Static dashboard shell added.
- [x] Dashboard reads local Supabase/Core data for foundation verification.
- [x] Dashboard navigation sections started: dashboard, applications, buyers, families, dogs, litters, puppies, reservations, payments, go-home, documents, messages, phone lookup, kennel logs, events.
- [x] Placeholder and not-connected/empty-style shell states started.
- [x] Shell visibly states that production data and live integrations are not connected.
- [x] Received Applications panel reads local Core applications.
- [x] Latest Application Detail panel reads `core_application_sections` and displays grouped responses.
- [x] Phone Lookup Safety panel displays local ambiguity status.
- [x] Latest Events panel displays local event data.
- [x] Reservation Workflow Status panel displays recent local/development reservation context.
- [x] Reservation Workflow Status panel displays linked puppy identity and current puppy status.
- [ ] Add approved read-only data coverage for litter context within reservation workflow views.
- [x] Reservation Workflow Status panel displays ledger-derived payment balance.
- [x] Financial Ledger Activity panel displays ledger rows read-only.
- [x] Ledger panel labels refunds/chargebacks as internal ledger records rather than processor movement.
- [x] Go-home read panel consumes the effective go-home view.
- [ ] Add proper loading/empty/error states for all read panels.
- [ ] Replace temporary/local-only data assumptions before staging.

### 1.7 Controlled Local/Dev Write Foundations

- [x] Application approval write function added: `core_approve_application`.
- [x] Application approval rollback-safe SQL test added.
- [x] Local/development dashboard approval action added.
- [x] Dashboard approval action calls `core_approve_application` server-side.
- [x] Dashboard approval action uses the authenticated staff profile actor.
- [x] Dashboard approval action sets `p_queue_notification = false`.
- [x] Dashboard approval action verified locally in browser.
- [x] Dashboard approval action updates application and buyer approval status through the database function.
- [x] Dashboard approval action writes event/audit through the database function.
- [x] Dashboard approval action sends no email and creates no reservation.
- [x] Reservation creation write function added: `core_create_reservation`.
- [x] Reservation creation rollback-safe SQL test added.
- [x] Controlled local/development reservation creation action added.
- [x] Minimal reservation form supports approved application context, puppy selection, dollar contract/deposit input, sale type, and notes.
- [x] Reservation action converts entered dollar amounts to integer cents server-side before calling `core_create_reservation`.
- [x] Reservation creation result refreshes dashboard data and is visible in the read-only reservation panel.
- [x] Available puppy read filtering and database-function validation prevent duplicate active reservation creation through the controlled workflow.
- [x] Local/dev reservation creation verified through the seeded workflow and dashboard read panel.
- [x] Controlled local/development deposit/payment dashboard action calls `core_record_reservation_payment`.
- [x] Deposit/payment action records only validated `deposit` or `payment` activity and refreshes ledger-derived balance display.
- [x] Local/dev deposit/payment form verified with fake seeded data.
- [x] Controlled dashboard actions use server-side RPC calls rather than direct browser/database writes.
- [x] Controlled financial adjustment database RPC added for local/dev ledger exceptions without dashboard UI.
- [x] Read-only financial adjustment/ledger exception visibility added to dashboard.
- [x] Controlled reservation cancellation database RPC added: `core_cancel_reservation`.
- [x] Reservation cancellation rollback-safe SQL test added.
- [x] Cancellation preserves ledger rows and does not imply refunds, fees, chargebacks, documents, or messages.
- [x] Puppy release on cancellation is explicit and protected when another active reservation exists.
- [ ] Define broader server-side write-tool authorization/error pattern.
- [ ] Add low-risk kennel tools only after application/reservation/payment flow is stable.
- [ ] Prevent direct AI/database writes.

## Phase 2 — Staff-Only Staging With Selected Real Data

### 2.1 Authentication And Access Boundary

- [x] Staff authentication and access-boundary planning document added: `docs/core/CORE_STAFF_AUTH_PLAN.md`.
- [x] Supabase Auth packages added for the staff auth foundation.
- [x] Minimal staff login page added.
- [x] Protected `/staff` route added with active staff profile requirement.
- [x] Root `/` route changed to a non-sensitive landing page.
- [~] Staff profile lookup maps Supabase Auth user to `core_profiles.auth_user_id`; it currently uses service role server-side as a transitional bridge until RLS exists.
- [~] Separate local/dev service-role usage from staging/production access patterns.
- [ ] Add admin/staff role assignment flow.
- [x] Add per-action server-side authorization checks for current dashboard actions.
- [x] Replace static local/development actor env usage with authenticated staff profile actors for approval, reservation creation, deposit/payment recording, and cancellation.
- [x] Map `auth.users.id` to active `core_profiles.auth_user_id` staff profiles for staff route access.
- [x] Locally verify staff login and active profile mapping.
- [x] Locally verify `core_audit_log.actor_profile_id` uses the authenticated staff profile for approval and payment recording.
- [x] Add local/dev helper for switching mapped staff profile role/status during authorization testing.
- [x] Require authenticated active staff context before staff dashboard service-role reads run.
- [x] Add role-based dashboard read filtering for staff versus owner/admin.
- [x] Restrict staff users from fetching/seeing financial ledger activity, full audit/activity rows, phone lookup details, and the general event feed.
- [x] Manually verify owner/admin/staff dashboard read scopes with the local role helper.
- [x] Restore the local mapped profile to `owner` active after read-scope verification.
- [ ] Verify unauthorized role behavior, especially staff cancellation with puppy release.
- [x] Add read authorization review beyond the protected `/staff` route for the current staff dashboard panels.
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
- [ ] Export one or a few real Zoho application records safely.
- [blocked] Redact or handle sensitive fields during development review using the field review template before any import.
- [ ] Validate field shapes against `core_ingest_zoho_application`.
- [ ] Run local/dev dry-run import with one owner-approved local JSON payload stored outside the repository.
- [blocked] Run staging import with owner-approved limited records only after exact records, field review, fields, staging environment plan, environment, import method, verification checklist, readiness checklist, and rollback plan are approved.
- [ ] Verify received applications display correctly in staging.
- [ ] Verify application details display correctly in staging.
- [ ] Verify no emails/messages/payments are triggered by import.

### 2.4 Duplicate And Source Precedence

- [ ] Inventory existing Zoho modules and field mappings beyond applications.
- [ ] Inventory existing Supabase duplicate tables.
- [ ] Define source precedence for buyers, families, puppies, reservations, payments, documents, and go-home data.
- [ ] Create migration map with duplicate detection.
- [ ] Define matching rules for email, phone, Zoho IDs, buyer IDs, family IDs, and puppy/reservation records.
- [ ] Define manual review workflow for ambiguous duplicates.
- [ ] Dry-run import into local/dev only.
- [ ] Review migration results manually.

## Phase 3 — Production Internal Staff Use

### 3.1 Internal Application Workflow

- [ ] Use Core to review real applications internally.
- [ ] Use Core to approve applications internally.
- [ ] Add decline/needs-follow-up action only after approval flow is stable.
- [ ] Add internal notes/follow-up workflow.
- [ ] Add staff activity/audit review surface.
- [ ] Decide if approved applications should update Zoho during transition or remain Core-only.

### 3.2 Internal Reservation Workflow

- [x] Create reservations from approved applications in local/dev.
- [ ] Verify reservation creation with real-like data in staging.
- [x] Show buyer/application/puppy/reservation linkage in the local/development read panel.
- [x] Show puppy status after reservation in the local/development read panel.
- [x] Prevent duplicate active reservation for one puppy through controlled local/development workflow validation.
- [ ] Add reservation cancellation/change workflow.
- [x] Add reservation audit/event display.

### 3.3 Payment And Ledger Workflow

- [x] Display reservation balance from ledger-derived reservation/payment read models in local/development dashboard.
- [x] Add controlled local/development ledger/payment entry action for deposits and payments only.
- [x] Verify local/development deposit/payment form reduces visible balance through the ledger-derived read model.
- [x] Add controlled database foundation for local/development credits, refunds, chargebacks, fees, finance charges, and neutral adjustments.
- [x] Show local/development financial ledger and adjustment activity read-only.
- [ ] Add receipt metadata foundation.
- [ ] Add payment method tracking rules.
- [x] Add local/development refund/chargeback handling rules as ledger-only records.
- [ ] Add staff review and creation UI for payment corrections.
- [ ] Connect payment processor only after internal ledger flow is stable.

### 3.4 Go-Home Workflow

- [ ] Display effective go-home appointment data from `core_go_home_effective_view`.
- [ ] Add controlled go-home group/detail update action.
- [ ] Add go-home readiness checklist workflow.
- [ ] Add balance clearance workflow display without copying financial truth.
- [ ] Add shared multi-puppy pickup/delivery workflow.
- [ ] Add go-home event/audit review.

### 3.5 Communications Workflow

- [x] Define Core email template and preview plan: `docs/core/CORE_EMAIL_TEMPLATE_PREVIEW_PLAN.md`.
- [ ] Define what Core may send automatically versus staff-approved.
- [x] Add controlled notification queue database foundation: `core_queue_notification`.
- [x] Add rollback-safe notification queue SQL test.
- [ ] Add owner/admin notification or email preview UI before sending.
- [ ] Add notification queue review UI before sending.
- [ ] Add email provider integration only after template and approval rules are defined.
- [ ] Keep Hostinger SMTP disconnected until preview, override-recipient, send logging, and test-send rules are approved.
- [ ] Keep Twilio disconnected until phone verification/routing is built.
- [ ] Log all generated messages and staff/customer interactions.

### 3.6 Zoho Cutover Planning

- [ ] Keep current Zoho workflow in place during Core internal testing.
- [ ] Decide module-by-module cutover order.
- [ ] Decide whether Zoho remains source of truth during transition.
- [ ] Decide which Core actions write back to Zoho, if any.
- [ ] Define rollback plan if Core staging/internal workflow fails.
- [ ] Import production data only after owner approval.
- [ ] Retire Zoho modules only after Core workflow replacement is proven.

## Phase 4 — Customer-Facing Core

### 4.1 Puppy Portal

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

### 4.2 Document Generation

- [ ] Inventory document requirements: contract, health guarantee, bill of sale, payment agreement, receipts, vaccine/health records, care guides, pupdate packets.
- [ ] Design template records, merge fields, generation runs, versioning, and approval gates.
- [ ] Define which document types require staff approval before sending.
- [ ] Define storage and signed URL rules.
- [ ] Define customer visibility rules in the future Puppy Portal.
- [ ] Build document generation service.
- [ ] Integrate signature provider only after provider choice and approval.
- [ ] Add document event/audit trail.

### 4.3 Payments For Customers

- [ ] Decide payment processor.
- [ ] Define payment request/invoice workflow.
- [ ] Define customer payment visibility.
- [ ] Define receipt generation workflow.
- [ ] Define refunds/chargebacks and reconciliation process.
- [ ] Add payment processor integration only after ledger/security rules are complete.

### 4.4 Public Website Replacement

- [ ] Define website route list.
- [ ] Define available puppies/litters display rules.
- [ ] Define application form workflow.
- [ ] Define contact/inquiry workflow.
- [ ] Define public puppy/litter data visibility rules.
- [ ] Build website replacement only after Core read/write flows are stable enough.

### 4.5 Customer Communications

- [ ] Define customer portal message/conversation workflow.
- [ ] Define website chat/customer inquiry workflow.
- [ ] Define email reply workflow.
- [ ] Define Facebook/Messenger workflow later.
- [ ] Define what Core may answer automatically.
- [ ] Define what must route to staff.
- [ ] Keep sensitive decisions staff-approved.

## Kennel Core Track

- [ ] Weight logging workflow.
- [ ] Feeding logging workflow.
- [ ] Medication logging workflow.
- [ ] Puppy event/milestone workflow.
- [ ] Litter milestone workflow.
- [ ] Whelping mode later.
- [ ] Overnight summary later.
- [ ] Avoid medical inference or automated treatment decisions.

## Deferred Integrations

- [deferred] Home Assistant bridge.
- [deferred] Camera analysis.
- [deferred] Smart mirror/display.
- [deferred] RF button flows.
- [deferred] Advanced automation.

## Still Not Connected Live

- [ ] Production RLS is not enabled.
- [ ] Staff authentication is partially implemented; RLS, real-field review for staff-visible application details, and manual staging verification remain incomplete.
- [ ] Zoho is not connected live.
- [ ] Twilio is not connected live.
- [ ] Email is not sending.
- [ ] Payments are not connected to a payment processor.
- [ ] No production data import has occurred.
- [ ] Document generation is not implemented.
- [ ] Signature provider integration is not implemented.
- [ ] Customer portal is not implemented.
- [ ] Public website replacement is not implemented.
- [ ] Kennel logging write tools are not implemented.
- [ ] Production-authenticated dashboard actions are not implemented.

## Current Verified Commands

From Git Bash in the repository root:

```bash
supabase db reset --local
./scripts/seed-local-core-workflow.sh
cat supabase/tests/core_v1_smoke_tests.sql | docker exec -i supabase_db_core1 psql -U postgres -d postgres -v ON_ERROR_STOP=1
cat supabase/tests/core_go_home_effective_view_tests.sql | docker exec -i supabase_db_core1 psql -U postgres -d postgres -v ON_ERROR_STOP=1
cat supabase/tests/core_application_approval_write_tool_tests.sql | docker exec -i supabase_db_core1 psql -U postgres -d postgres -v ON_ERROR_STOP=1
cat supabase/tests/core_create_reservation_write_tool_tests.sql | docker exec -i supabase_db_core1 psql -U postgres -d postgres -v ON_ERROR_STOP=1
cat supabase/tests/core_record_reservation_payment_tests.sql | docker exec -i supabase_db_core1 psql -U postgres -d postgres -v ON_ERROR_STOP=1
cat supabase/tests/core_record_financial_adjustment_tests.sql | docker exec -i supabase_db_core1 psql -U postgres -d postgres -v ON_ERROR_STOP=1
cat supabase/tests/core_cancel_reservation_tests.sql | docker exec -i supabase_db_core1 psql -U postgres -d postgres -v ON_ERROR_STOP=1
cat supabase/tests/core_create_application_manual_tests.sql | docker exec -i supabase_db_core1 psql -U postgres -d postgres -v ON_ERROR_STOP=1
cat supabase/tests/core_queue_notification_tests.sql | docker exec -i supabase_db_core1 psql -U postgres -d postgres -v ON_ERROR_STOP=1
cat supabase/tests/core_zoho_application_intake_tests.sql | docker exec -i supabase_db_core1 psql -U postgres -d postgres -v ON_ERROR_STOP=1
cat supabase/tests/core_zoho_application_report_label_tests.sql | docker exec -i supabase_db_core1 psql -U postgres -d postgres -v ON_ERROR_STOP=1
npm run lint
```

Do not rerun all commands after every small change. Run the relevant validation once after code changes or when repo state is unclear.

## Immediate Next Ordered Tasks

1. [ ] Verify unauthorized role behavior, especially staff cancellation with puppy release.
2. [ ] Add role checks for any future financial adjustment, go-home, or kennel actions before exposing them.
3. [ ] Review real Zoho application fields before staff-visible application details are used with selected real data.
4. [ ] Design and test RLS before any live client exposure.
5. [ ] Owner-approve exact selected-real-data records, field review, fields, first staging environment plan, staging environment, import method, readiness checklist, verification checklist, and rollback plan.
6. [ ] Define live payment processor reconciliation and idempotency before payment processor connection.
7. [ ] Add staff-reviewed financial adjustment UI only after authorization boundaries exist.
8. [ ] Prepare production-safe integration and deployment handling.

## Stop Conditions

Stop and review before continuing if any task attempts to:

- Create new tables not explicitly named in the task.
- Import production data.
- Enable RLS without policy tests.
- Connect Twilio, Zoho, email, payment processor, Home Assistant, cameras, or smart mirror.
- Build customer-facing behavior without access rules.
- Add AI write capability without tool-safety design.
- Change financial balance semantics.
- Change go-home cardinality or override semantics.
- Add dashboard polish that does not advance the real workflow.
