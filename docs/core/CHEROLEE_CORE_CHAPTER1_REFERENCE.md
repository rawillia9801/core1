# Cherolee Core OS Chapter 1 Reference

## Status

Reference document for Codex and developer work. This file captures the controlling Chapter 1 alignment review and has been updated after the Production Action Workflow + Reliability Layer work landed.

Read this before work that touches Core architecture, build order, application review, auth, RLS, email, route structure, controlled RPCs, public application intake, or owner/operator workflow.

## Document Overview

- Document: Cherolee Core OS - Chapter 1: Initial Build, Architecture & Alignment Review
- Repository: `rawillia9801/core1` on branch `main`
- Local path: `C:\Users\rawil\core1`
- Stack: Next.js App Router, TypeScript, Supabase/PostgreSQL, Vercel
- Auth: Supabase Auth mapped to `core_profiles`
- Current phase: Phase 1 internal foundation with limited public application intake now present
- Alignment status: aligned, with customer-facing/public-write hardening and owner-approved matching review still active concerns

## Alignment Verdict

The project remains aligned with the master Core OS vision: Core is the governed source-of-truth operating system, not merely a dashboard, CRM, chatbot, public website, or portal.

Confirmed correct:

- Core-native owner/operator workflow remains the correct build lane.
- Zoho is cancelled and historical only.
- Governed command flow remains required: validate, write, event, audit where schema supports it.
- No AI writes, no autonomous decisions, and no unsafe execution.
- Public application intake can exist only as a narrow ingress path, not as a decision-making system.
- Public website language must not expose Core/admin/staff/internal system terms.

## Updated Implementation Reality

Since the original Chapter 1 review, these additional pieces have landed:

- `/staff/payment-plans` Payment Plan Command Center.
- `/staff/go-home/handoff` Go-Home Handoff Command.
- `/staff/reservations/[reservationId]/handoff` Reservation Handoff workspace.
- `/staff/puppies/[puppyId]/handoff` Puppy Handoff workspace.
- `/apply` and `/apply/received` public application routes.
- `/embed/application` and `/embed/application/received` iframe-friendly website application routes.
- Expanded website application form matching the uploaded PDF sections and terms/declarations.
- Conditional SMTP owner alert and customer receipt confirmation for application submissions.
- `/staff/matching` internal Puppy Assignment / Matchmaking / Waitlist Command Center.
- Compact matching/readiness context on related application, buyer, family, puppy, litter, and reservation detail pages.
- `/staff/actions` Controlled Action Command Center with existing-action and review-only queues.
- Classified operator-facing outcomes for application detail review, reservation/payment/go-home actions, kennel manage actions, and proposed-action review.

These additions do not change the Core authority model. Application submission creates records and acknowledgements only. Matching scores and action queues are advisory or operator-confirmed only. Core must not approve, deny, reserve, assign puppies, create payments, create documents, invite portal users, send messages, or make placement decisions automatically.

## Urgent And High-Priority Risks

### 1. RLS Is Still The Biggest Production Risk

Row Level Security and public-write boundaries remain the biggest unresolved blocker between safe public intake and broader customer-facing access. The public application submit path currently uses a server-side controlled action and service-role write pattern. That can be acceptable only as a narrow, server-side ingress surface and must not be expanded into customer portal behavior without RLS and policy review.

### 2. Public Application Submission Needs Validation

The embedded form now exists. It must be tested end-to-end:

- form renders cleanly in the public website iframe
- no Core/admin/staff/internal wording appears
- required fields and acknowledgements work
- submission creates expected buyer/family/application/sections/event records
- SMTP owner alert and customer confirmation work only when configured
- failed SMTP does not hide application write failures or create unmanaged duplicates

### 3. Internal Application Detail Review Must Show New Sections

The application review surface must clearly display the new public sections:

- applicant info
- puppy preferences
- lifestyle/home
- payment/agreement
- terms/declarations/signature metadata

If the current application detail route does not cleanly show those records, application detail review is still the next daily-use hardening task.

### 4. SMTP Send Logging Is Now Needed

SMTP application receipt behavior exists. Before any additional SMTP email types are added, Core needs durable send-attempt logging for owner/customer application receipt emails. This should record success/failure without exposing SMTP secrets.

### 5. Duplicate And Failed Intake Handling Is Needed

Public application submission introduces repeat-submission and partial-failure risk. Core needs explicit duplicate handling, failed-intake behavior, and retry/dead-letter review rules.

### 6. Controlled Action Execution Remains Bounded

The action command center may expose existing safe server actions and existing RPC-backed actions, but missing workflows stay review-only. The proposed action queue is review-state only. Approval must not execute business changes until a safe execution engine is separately designed.

### 7. Matching Must Stay Advisory Until Write Rules Exist

The internal matching center can help the owner compare applicant preferences, available puppies, waitlist status, documents, media, and reservation context. It must not become an assignment engine until explicit owner-approved write rules, audit requirements, and reservation workflow boundaries are designed.

### 8. Smart Home Hardware Not Yet Purchased

Smart kennel monitoring remains future work. Software must not pretend sensors or devices exist until hardware exists and owner-approved integration rules are ready.

## Recommended Immediate Actions

| Priority | Action | Reason |
| --- | --- | --- |
| 1 | Validate `/embed/application` in the public website iframe. | It is now customer-facing. |
| 2 | Validate submitted application records internally. | Public submission must create the expected Core truth. |
| 3 | Verify SMTP receipt alerts. | Email is now a conditional live side effect. |
| 4 | Add SMTP send-attempt logging. | Needed before expanding email. |
| 5 | Add duplicate/failed intake handling. | Public intake needs safety and cleanup rules. |
| 6 | Confirm application detail displays expanded sections. | Owner review must be usable. |
| 7 | Validate `/staff/matching` against owner-approved records only. | Matching guidance must stay advisory and fact-based. |
| 8 | Continue RLS/security hardening. | Biggest production/customer-facing risk. |
| 9 | Keep proposed action execution blocked. | Prevents accidental automated business changes. |

## Document-By-Document Review Summary

| Document | Current Status | Notes |
| --- | --- | --- |
| `CURRENT_STATUS.md` | Updated | Central current-state truth after internal matching/waitlist decision-support work. |
| `IMPLEMENTATION_CHECKLIST.md` | Updated | Checklist now reflects public/embedded application, SMTP receipt, handoff, payment plan, media, and document readiness work. |
| `CORE_BUILD_ORDER.md` | Needs refresh when next build plan changes | Build order should now put public form validation, SMTP logging, duplicate handling, and application detail review at top. |
| `CORE_STAGING_READINESS_CHECKLIST.md` | Updated | Now includes public application, SMTP receipt, and internal matching/waitlist readiness gates. |
| `CHEROLEE_CORE_OS_MANUAL_REFERENCE.md` | Updated | Manual reference now reflects internal matching/waitlist decision-support plus blocked automated assignment behavior. |
| `CHEROLEE_CORE_CHAPTER1_REFERENCE.md` | Updated | This file now reflects the current post-matching reality. |
| `CORE_PROJECT_REVIEW_AND_COMPLETION_ESTIMATE.md` | Needs refresh when estimates are next reviewed | Should recognize Phase 4A has begun but remains unverified/hardening. |
| `CODEX_TASK_RUNBOOK.md` | Needs path correction only if missing docs are referenced | It currently points to this Chapter 1 reference under `docs/core/`. |

## Chapter 1 Scope

Chapter 1 still covers the internal foundation, but the project has now crossed into a narrow Phase 4A surface: public application intake. Developers must treat that surface as sensitive because it writes real Core records and may send confirmation email when SMTP env vars are configured.

A developer should now be able to:

- Use the correct repo and branch.
- Understand the owner/operator internal foundation.
- Understand public application intake is narrow and non-decision-making.
- Understand internal matching is advisory decision-support only.
- Keep public website language separate from Core/internal language.
- Preserve event/audit/write patterns where possible.
- Avoid expanding SMTP beyond application receipt until send logging and approval rules exist.
- Avoid expanding customer-facing behavior before RLS/security hardening.

## Development Environment

Required tools remain:

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

## Environment Variables

Server/client Supabase values must stay out of Git. SMTP secrets must stay server-side.

Current relevant deployed variables include:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SMTP_HOST
SMTP_PORT
SMTP_SECURE
SMTP_USER
SMTP_PASS
SMTP_FROM
APPLICATION_EMAIL_TO
```

Do not commit real values.

## Route Map Highlights

Public/customer-facing:

| Route | Purpose | Boundary |
| --- | --- | --- |
| `/apply` | Public puppy application page. | Application submission only. |
| `/apply/received` | Public received page. | No private data. |
| `/embed/application` | Iframe-friendly website application form. | No Core/internal wording. |
| `/embed/application/received` | Iframe-friendly received page. | No private data. |

Internal owner/operator:

| Route | Purpose |
| --- | --- |
| `/staff` | Main owner/operator command dashboard. |
| `/staff/applications` | Application list and review entry. |
| `/staff/applications/new` | Private owner/admin application entry. |
| `/staff/matching` | Internal matching, assignment, and waitlist decision-support. |
| `/staff/payment-plans` | Payment plan command center. |
| `/staff/go-home/handoff` | Go-home handoff command. |
| `/staff/reservations/[reservationId]/handoff` | Reservation handoff detail. |
| `/staff/puppies/[puppyId]/handoff` | Puppy handoff detail. |
| `/staff/command` | Read-only Core OS Command Center. |
| `/staff/proposed-actions` | Proposed action review-state queue. |

## Controlled Write Rule

Every important business action must use a controlled server/RPC path. Public application submission is a narrow server-side ingress path that writes only application-related records. It must not become a general direct table-write pattern for broader public/customer features.

## Current Do-Not-Build Without Separate Approval

- public portal
- portal login/access
- public puppy publishing from Core
- payment processor integration
- payment links
- refunds/chargebacks through providers
- document generation
- signature provider integration
- SMS/Twilio/Facebook messaging
- AI write tools
- proposed-action execution engine
- automatic matching or puppy assignment engine
- smart kennel integrations
- Home Assistant/cameras/CoreFace

## Final Chapter 1 Direction

Core is still aligned. The next work must not drift into more surface area. Validate and harden what now exists:

```text
public application intake
  -> internal review visibility
  -> SMTP send logging
  -> duplicate/failed intake handling
  -> RLS/public-write boundary tests
```

Only after that should broader customer-facing or communication behavior expand.
