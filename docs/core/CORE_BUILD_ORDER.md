# Core Build Order
## Status Note

- Current as of this pass: active steering document.
- Reflects current staged Core OS vision: internal foundation, applications/buyer lifecycle, payments/documents/go-home, communications preview, portal integration, smart kennel, nervous system, then assistant/voice/CoreFace.
- Central current truth: this file owns build sequence; `CURRENT_STATUS.md` owns implemented state.

## Guardrail

Cherolee Core should be built in small, verifiable phases. Core is the operating system and daily command layer for Cristy's owner-operated business and kennel. Each phase depends on a trustworthy canonical model and explicit owner approval before any production data movement or sensitive action.

The uploaded Core OS manual and Chapter 1 review define the same direction: Core is a governed operating system, not a dashboard, CRM, chatbot, portal, or smart-home gadget. Interfaces request or display truth; Core validates, records, blocks, proposes, or executes according to rules.

## Mandatory Path Rule

All local build work must use:

```text
C:\Users\rawil\core1
```

Expected branch and remote:

```text
branch: main
remote: https://github.com/rawillia9801/core1.git
```

Never use:

```text
C:\Users\rawil\OneDrive\Documents\core1
```

## Current Build Lane

The active lane is Core-native owner/operator workflow expansion. Do not waste a build task merely checking that already-built route pages exist.

Next useful build lanes, in order:

1. Applications review detail workflow: `/staff/applications/[applicationId]`.
2. Unauthorized-role verification for current owner/admin-only actions.
3. Internal notes and follow-up workflow.
4. RLS/security hardening before staging or customer-facing access.
5. Documents/messages safe internal workflow expansion after application review is useful.
6. Core Nervous System foundation after internal records and dependency boundaries are stable.
7. Customer-facing Core only after internal truth, RLS, and safety boundaries are reliable.
8. AI, voice, Twilio/Facebook, smart-home, camera, CoreFace, and physical-world automation only after governed proposal/execution rules are explicitly approved.

Each lane must remain internal, audited, and free of external side effects until separately approved.

## Phase 1: Internal Foundation

Status: in progress, with weeks of hardening remaining.

- Establish canonical `core_` tables and read-friendly views.
- Establish audit and integration event ledgers.
- Establish schema documentation and development instructions.
- Validate migrations on a clean local/dev database.
- Build owner/operator-only local workflows for applications, reservations, ledger entries, go-home planning, kennel records, read-only workspaces, notification preview, command shell, and proposed-action review.
- Keep all work internal/local/dev focused; no production records, customer-facing routes, live providers, or device automations are wired.

## Phase 2: Applications And Buyer Lifecycle

Target duration from the current foundation: 2-4 weeks.

- Build the overdue application detail/review workspace.
- Show applicant contact, family/buyer context, structured answers, review status, linked reservations, and linked event/audit history.
- Support controlled internal review actions such as approve, decline, needs-info, and internal notes only where schema/RPC support exists.
- Continue buyer/family relationship memory without making dashboards, portals, chat, or external provider records the source of truth.
- Do not automatically approve prospective buyers, send messages, create documents, move money, or create portal access from application review.

## Phase 3: Payments, Documents, And Go-Home

Target duration after Phase 2: 3-6 weeks.

- Harden ledger-derived payment views and internal payment recording.
- Design document metadata, generation, signature, storage, and visibility rules before any document provider is connected.
- Harden go-home detail/checklist workflows and shared pickup/delivery planning.
- Keep financial balances derived from reservation contract totals and immutable-style ledger entries.
- Do not connect live payment processors, issue provider refunds, generate/sign/send documents, or expose customer payment/document views until approved.

## Phase 4: Communications Preview

Target duration after Phase 3: 4-8 weeks.

- Expand preview-only communication workflows and owner/operator approval rules.
- Keep Hostinger SMTP deferred until preview, override-recipient, staging, send logging, and test-send rules exist.
- Treat Twilio, Facebook, SMS, and other channels as future integrations that must write integration events and audit context before any delivery behavior.
- Do not send customer messages automatically.

## Phase 5: Portal Integration

Target duration after Phase 4: 4-8 weeks.

- Add customer-facing application/portal behavior only after RLS, privacy, field visibility, and selected-real-data gates are proven.
- Ensure portal screens request/display Core truth and cannot define truth on their own.
- Keep customer-facing automation blocked until owner/operator review and rollback rules are proven.

## Phase 6: Smart Kennel Monitoring

Target duration after Phase 5 or in a separately approved parallel hardware track: 4-10 weeks plus hardware purchase/install.

- Add controlled workflows for puppy events, weights, feeding, medications, and care observations.
- Preserve factual observations and avoid inferred medical conclusions.
- Treat camera and sensor information as observational input, not health or medical authority.
- Require safety-bounded, auditable, owner/operator-approved paths for smart-home and kennel monitoring actions.

## Phase 7: Core Nervous System

Target duration after stable internal/customer foundations: 6-12 weeks.

- Add system components, dependency mapping, health signals, incidents, degraded-state awareness, recovery playbooks, and presence-state derivation.
- A degraded component must make dependent surfaces honest: partial, blocked, stale, or unsafe.
- Recovery may propose or perform only explicitly safe actions.
- Unsafe recovery must create a proposed action or owner-visible incident.

## Phase 8: Assistant, Voice, And CoreFace

Target duration after nervous-system foundations: 8-16+ weeks.

- Add read-oriented assistant behavior only after internal records are stable.
- AI is an interface/helper, not authority.
- AI may prepare summaries and proposed actions but must not write directly, send messages, move money, publish listings, control devices, or decide buyer/puppy outcomes.
- CoreFace and voice must reflect real system state and use the same governed approval model; they are not decorative shortcuts around Core authority.

## Not Yet

This baseline does not build a full customer portal, website replacement, live AI operator, live payments, Zoho tooling, production Twilio routing, automated customer decisions, refunds, price changes, Home Assistant control, camera AI, CoreFace, voice control, or smart mirror experience.
