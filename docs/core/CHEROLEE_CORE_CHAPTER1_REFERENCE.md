# Cherolee Core OS Chapter 1 Reference

## Status

Reference document for Codex and developer work. This file captures the controlling Chapter 1 alignment review and initial-build developer reference provided in June 2026.

This document should be read before starting work that touches Core architecture, build order, application review, auth, RLS, email preview, route structure, controlled RPCs, or owner/operator workflow.

## Document Overview

- Document: Cherolee Core OS - Chapter 1: Initial Build, Architecture & Alignment Review
- Repository: `rawillia9801/core1` on branch `main`
- Local path: `C:\Users\rawil\core1`
- Stack: Next.js App Router, TypeScript, Supabase/PostgreSQL, Vercel
- Auth: Supabase Auth mapped to `core_profiles`
- Current phase: Phase 1 - Internal Foundation, in progress and nearing completion
- Docs reviewed in source document: 27 repository planning/reference documents from `docs/core/`
- Alignment status: aligned, with specific urgent notes

## Alignment Verdict

The project is aligned with the master Core OS vision. The architecture, safety model, build order, and governance philosophy are on the correct track.

Confirmed correct:

- Core-native owner/operator workflow is the correct build lane.
- Zoho is cancelled and treated as historical reference only.
- Governed command flow is consistently applied: validate, write, event, audit.
- No AI writes, no autonomous sends, and no unsafe execution.
- Internal-first, governed-second, customer-facing-later build order matches the master vision.
- Email is preview-only with no live SMTP connected.
- Core Nervous System and CoreFace are deferred to later phases.

## Urgent And High-Priority Risks

### 1. CORE_BUILD_ORDER.md Conflict Markers

Chapter 1 reported unresolved merge conflict markers in `CORE_BUILD_ORDER.md` as the most urgent housekeeping issue. Before building, Codex must check for:

```text
<<<<<<<
=======
>>>>>>>
```

If present, resolve into one authoritative build order aligned with the master manual.

### 2. RLS Is The Biggest Production Risk

Row Level Security is the biggest unresolved blocker between local/dev and production or customer-facing use. The current server-side/service-role pattern is transitional and must not be treated as production-ready customer access.

RLS must be a first-class build task before staging real customer-facing records or portal access.

### 3. Application Detail Page Is The Most Overdue Feature

The highest daily-use feature gap is:

```text
/staff/applications/[applicationId]
```

The application list and application creation exist, and approval foundation exists, but the detailed owner review page is the next most important workflow. It must show answers, duplicates, prior conversations/context where available, desired puppy, references, blockers, and review actions.

### 4. Proposed Action Execution Is Undefined

The proposed action storage and review-state foundation exists. Approval must remain review-state only until a safe execution engine is designed. Do not make proposed action approval execute business changes without a separate approved design.

### 5. CURRENT_STATUS.md Must Stay Current

`CURRENT_STATUS.md` is the central current-truth document. It must be updated after meaningful implementation changes so docs do not drift from repo state.

### 6. Smart Home Hardware Not Yet Purchased

Smart kennel monitoring requires hardware that has not been purchased or installed. Planning can happen in parallel, but software must not pretend sensors/devices exist until they do.

### 7. Hostinger SMTP Variables Should Be Documented Before Connection

Email remains preview-only. Hostinger SMTP should not be connected until preview, approval, staging override, send logging, and test-send rules are implemented. Environment variable names should be documented before connection.

## Recommended Immediate Actions

Priority order from Chapter 1:

| Priority | Action | Reason |
| --- | --- | --- |
| 1 | Resolve merge conflict in `CORE_BUILD_ORDER.md` if still present. | Build order cannot be trusted if conflict markers exist. |
| 2 | Build `/staff/applications/[applicationId]` detail page. | Most overdue daily-use workflow gap. |
| 3 | Begin RLS design and policy tests. | Biggest blocker to production/customer-facing use. |
| 4 | Add `.env.example` SMTP/email variable names with no secrets. | Prevents future Hostinger SMTP configuration from being forgotten. |
| 5 | Update `CURRENT_STATUS.md` after every meaningful implementation change. | Central truth must stay current. |
| 6 | Design proposed-action execution engine before assistant execution. | Required before AI-assisted workflows can safely execute. |
| 7 | Order smart kennel hardware when ready. | Hardware has lead time. |
| 8 | Verify unauthorized-role boundaries for current owner/admin-only actions. | Restricted actions need explicit tests. |

## Document-By-Document Review Summary

Chapter 1 reviewed 27 docs and marked the overall documentation set aligned, with one urgent fix if still present.

| Document | Status | Notes |
| --- | --- | --- |
| `CURRENT_STATUS.md` | Aligned | Central truth document; keep updated. |
| `CORE_BUILD_ORDER.md` | Fix if needed | Check for merge conflict markers and resolve if present. |
| `CORE_V1_SCHEMA.md` | Aligned | Canonical schema and financial truth model are sound. |
| `CORE_PROJECT_REVIEW_AND_COMPLETION_ESTIMATE.md` | Aligned | Timeline and major risks are realistic if kept updated. |
| `CORE_STAFF_AUTH_PLAN.md` | Aligned | Supabase Auth to `core_profiles` mapping is correct. |
| `CORE_STAGING_READINESS_CHECKLIST.md` | Aligned | Conservative hard-stop gates are appropriate. |
| `CORE_APPLICATION_APPROVAL_WORKFLOW.md` | Aligned | Governed write pattern and denial guardrails are correct. |
| `CORE_APPLICATION_INTAKE_ENDPOINT.md` | Aligned | Core-native intake active; Zoho-shaped function is history. |
| `CORE_APPLICATION_INTAKE_MAPPING.md` | Aligned | Zoho field names are historical reference only. |
| `CORE_NATIVE_APPLICATION_ENTRY_PLAN.md` | Aligned | `/staff/applications/new` exists; detail page is next. |
| `CORE_RESERVATION_WORKFLOW.md` | Aligned | Double-reservation prevention and separated payment workflow are correct. |
| `CORE_AUDIT_AND_EVENTS.md` | Aligned | Append-only audit model is correct. |
| `CORE_PROPOSED_ACTION_APPROVAL_MODEL.md` | Aligned | Safety rules are correct; execution engine out of scope. |
| `CORE_COMMAND_CONSOLE_PLAN.md` | Aligned | Read-only shell; no AI provider connected. |
| `CORE_EMAIL_TEMPLATE_PREVIEW_PLAN.md` | Aligned | Preview-only foundation; Hostinger SMTP deferred. |
| `CORE_RLS_ACCESS_MODEL.md` | Aligned / Not implemented | Policy direction correct; implementation still needed. |
| `CORE_PHONE_LOOKUP.md` | Aligned | Read-only, no live Twilio. |
| `CORE_FIRST_STAGING_ENVIRONMENT_PLAN.md` | Aligned | Vercel + separate Supabase project is correct. |
| `CORE_SELECTED_REAL_DATA_STAGING_PLAN.md` | Aligned | Conservative selected-record staging only after gates. |
| `CORE_SELECTED_REAL_DATA_FIELD_REVIEW_TEMPLATE.md` | Aligned | Field sensitivity review template is useful. |
| `CORE_MIGRATION_MAP.md` | Aligned | Canonical destinations defined; Zoho excluded. |
| `CORE_DASHBOARD_READ_ONLY_PLAN.md` | Aligned | Read-only workspaces implemented. |
| `CORE_GO_HOME_EFFECTIVE_READ_MODEL.md` | Aligned | Cardinality and override logic are sound. |
| `CORE_STAFF_AUTH_LOCAL_VERIFICATION.md` | Aligned | Local role-switch testing is local/dev only. |
| `KENNEL_FORMS_CHECKPOINT.md` | Aligned | Kennel create/edit/archive loop verified. |
| `CORE_DATABASE_SMOKE_TESTS.md` | Aligned | Rollback-safe test pattern is correct. |
| `IMPLEMENTATION_CHECKLIST.md` | Aligned | Comprehensive tracking; must stay current. |

## Chapter 1 Scope

Chapter 1 covers the Phase 1 Internal Foundation. A developer should be able to:

- Set up local development.
- Understand repo structure.
- Apply migrations to a clean local Supabase database.
- Run the application locally.
- Sign in as owner/operator.
- Create a Core-native application.
- Approve it.
- Create a reservation.
- Record a payment.
- Verify ledger-derived balance reduction.
- Understand the governed write pattern.
- Run rollback-safe SQL tests.
- Understand what is intentionally blocked.

## Development Environment

Required tools:

- Node.js 18.x or 20.x LTS
- npm 9.x or later
- Git
- Supabase CLI
- Docker Desktop
- VS Code recommended
- PowerShell or Git Bash

Correct working directory:

```text
C:\Users\rawil\core1
```

Never use:

```text
C:\Users\rawil\OneDrive\Documents\core1
```

## Required Environment Variables

Local `.env.local` requires:

```text
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local-anon-key>
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=<local-service-role-key>
CORE_INTAKE_SECRET=<local-dev-secret>
EMAIL_PROVIDER=disabled
EMAIL_SEND_ENABLED=false
EMAIL_PREVIEW_ONLY=true
```

Future SMTP variable names, no values:

```text
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM_ADDRESS=
SMTP_REPLY_TO_ADDRESS=
EMAIL_TEST_RECIPIENT=
EMAIL_STAGING_OVERRIDE_RECIPIENT=
```

## Route Map

Technical routes under `/staff` remain owner/operator routes for now.

| Route | Purpose | Access |
| --- | --- | --- |
| `/login` | Owner/operator sign-in. | Public non-sensitive. |
| `/staff` | Main dashboard / daily command center. | Owner/Admin/Staff. |
| `/staff/applications` | Application list. | Owner/Admin/Staff. |
| `/staff/applications/new` | Core-native application entry. | Owner/Admin. |
| `/staff/applications/[id]` | Application detail review. | Next build target; Owner/Admin. |
| `/staff/buyers` | Read-only buyer workspace. | Owner/Admin/Staff. |
| `/staff/families` | Read-only family workspace. | Owner/Admin/Staff. |
| `/staff/dogs` | Dog list/add/edit/archive. | Owner/Admin for writes. |
| `/staff/litters` | Litter list/add/edit/archive. | Owner/Admin for writes. |
| `/staff/puppies` | Puppy list/add/edit/archive. | Owner/Admin for writes. |
| `/staff/reservations` | Reservation workspace. | Owner/Admin/Staff. |
| `/staff/payments` | Payment workspace. | Owner/Admin/Staff. |
| `/staff/go-home` | Go-home detail and checklist. | Owner/Admin detail; Staff checklist. |
| `/staff/documents` | Read-only document metadata. | Owner/Admin. |
| `/staff/messages` | Read-only communications metadata. | Owner/Admin. |
| `/staff/notifications` | Email preview queue/templates. | Owner/Admin. |
| `/staff/phone-lookup` | Phone lookup safety. | Owner/Admin. |
| `/staff/kennel-logs` | Kennel event/audit history. | Owner/Admin. |
| `/staff/events` | Events/audit workspace. | Owner/Admin. |
| `/staff/command` | Read-only Command Console shell. | Owner/Admin. |
| `/staff/proposed-actions` | Proposal queue, review-state only. | Owner/Admin. |

## Controlled Write RPC Pattern

Every important business action must use a controlled PostgreSQL RPC.

Pattern:

```text
validate input
lock relevant rows
check preconditions
update canonical records
write core_events
write core_audit_log
return structured result
```

Do not bypass this pattern with direct table writes from server actions.

## Key RPCs

| RPC | What It Does | Key Rule |
| --- | --- | --- |
| `core_create_application_manual()` | Creates Core-native application. | No email/reservation/payment. |
| `core_approve_application()` | Approves application and updates buyer status. | Rejects terminal statuses; event/audit. |
| `core_create_reservation()` | Creates reservation and marks puppy reserved. | Blocks double-reservation. |
| `core_record_reservation_payment()` | Records deposit/payment. | Ledger decrease only for payment/deposit. |
| `core_record_financial_adjustment()` | Records credit/refund/fee/chargeback/adjustment. | Maps balance effect internally. |
| `core_cancel_reservation()` | Cancels reservation with optional puppy release. | No refund/email; preserves ledger. |
| `core_queue_notification()` | Queues notification record. | No sending. |
| `core_update_go_home_detail()` | Creates/updates go-home detail. | Owner/admin. |
| `core_upsert_go_home_checklist_item()` | Creates/updates checklist item. | Operational staff allowed. |
| `core_create_dog()` | Creates dog record. | Owner/admin; event/audit. |
| `core_create_litter()` | Creates litter record. | Owner/admin; event/audit. |
| `core_create_puppy()` | Creates puppy record. | Owner/admin; event/audit. |
| `core_update_dog/litter/puppy()` | Updates kennel records. | Owner/admin; archive style. |
| `core_create_proposed_action()` | Creates proposal record. | Owner/admin; no execution. |
| `core_approve_proposed_action()` | Approves review state only. | Does not execute business action. |
| `core_reject_proposed_action()` | Rejects review state. | Review-only. |

## Notification Queue / Email Preview Foundation

Current state:

- Notifications can be queued.
- Templates exist in draft/preview-only state.
- No email is sent.
- No provider is called.
- Hostinger SMTP is recognized as future configuration, not active delivery.

All nine template keys are draft/preview/send-disabled until later communications preview phase.

## Testing Strategy

Core uses rollback-safe SQL tests. Tests must run inside a transaction and end with `ROLLBACK`.

Test categories:

- schema smoke tests
- application approval tests
- reservation workflow tests
- financial ledger tests
- notification queue tests
- go-home tests
- kennel create/update/archive tests
- proposed action tests
- auth/role boundary tests

## What Remains Blocked

Blocked until later phases:

- live email sending
- Hostinger SMTP connection
- Twilio live voice/SMS
- Facebook Messenger webhook/send
- AI provider connection
- autonomous writes
- proposed action execution engine
- document generation/signature provider
- live payment processor
- customer-facing portal access to Core records
- smart-home/device/camera control
- Core Nervous System implementation
- CoreFace/voice/display presence

## Next Build Priorities

Immediate next build priority:

```text
/staff/applications/[applicationId]
```

Build an application detail/review page with internal review actions, event/audit rows, and no external side effects.

After that:

1. RLS design and tests.
2. `.env.example` with SMTP variable names only.
3. Proposed action execution engine design, not implementation.
4. Hostinger SMTP preview/test-send gate.
5. Smart kennel hardware planning.
