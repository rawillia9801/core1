# Core Build Order

## Guardrail

Cherolee Core should be built in small, verifiable phases. Core is the operating system and daily command layer for Cristy's owner-operated business and kennel. Each phase depends on a trustworthy canonical model and explicit owner approval before any production data movement or sensitive action.

Current steering shortcut:

```text
docs/core/CORE_CURRENT_BUILD_DIRECTION.md
```

Use that document before starting a Codex task so completed verification work is not repeated and the next build lane stays focused.

## Mandatory Path Rule

All local build work must use:

```text
C:/Users/rawil/core1
```

Expected branch and remote:

```text
branch: main
remote: https://github.com/rawillia9801/core1.git
```

Never use:

```text
C:/Users/rawil/OneDrive/Documents/core1
```

## Current Build Lane

The active lane is Core-native owner/operator workflow expansion. Do not waste a build task merely checking that already-built route pages exist.

Next useful build lanes, in order:

1. Applications review detail workflow.
2. Proposed Actions usability workflow, if the create/approve/reject UI is not present on GitHub `main`.
3. Internal notes and follow-up workflow.
4. Documents/messages safe internal workflow expansion.
5. RLS/security hardening before staging or customer-facing access.

Each lane must remain internal, audited, and free of external side effects until separately approved.

## Phase 0: Inventory And Freeze

- Inventory existing Supabase, document, payment, and communication records that may inform Core-native modeling.
- Treat Zoho files, screenshots, PDFs, field names, and old notes as historical reference only. Zoho is not an import source, migration source, bridge, dependency, sync target, writeback target, or future workflow.
- Identify legacy duplicates and determine which non-Zoho records may supply owner-approved reference data.
- Freeze destructive cleanup: do not delete, rename, truncate, or repurpose existing tables.
- Document production access, privacy requirements, and migration approval points.

## Phase 1: Core Schema Baseline

- Establish canonical `core_` tables and read-friendly views.
- Establish audit and integration event ledgers.
- Establish schema documentation and development instructions.
- Validate migrations on a clean local/dev database.

No production records are wired by this baseline.

## Phase 2: Read-Only Owner/Operator Dashboard

- Build operational reads backed by canonical views.
- Include empty/error/loading states and privacy-conscious server access.
- Use test data or owner-approved Core-native records only after a validation task.
- Do not add broad write actions while read models are still settling.

Most route-specific read-only workspaces now exist. Do not repeat implementation/verification of `/staff/documents`, `/staff/messages`, `/staff/kennel-logs`, `/staff/events`, `/staff/phone-lookup`, `/staff/buyers`, or `/staff/families` as a standalone build task.

## Phase 3: First Write Tools

- Implement one validated server-side tool at a time.
- Require authorization, input validation, structured errors, and `core_audit_log` entries.
- Ensure AI/chat cannot issue direct database writes.
- Start with low-risk manual workflows only after approval.

Current preferred write-tool build target:

```text
Applications review detail workflow: /staff/applications/[applicationId]
```

That workflow should remain internal only: approve/decline/needs-follow-up status, internal notes where supported, and event/audit rows. It must not send customer messages, generate documents, create payments, publish listings, or call external systems.

## Phase 4: Core Phone Lookup

- Confirm phone normalization and duplicate-resolution policy.
- Use `core_phone_lookup_view` as the read model for lookup.
- Only connect Twilio or live routing after testing and explicit approval.
- Keep customer communications controlled and auditable.

## Phase 5: Applications Into Core

- Build Core-native application intake and review paths.
- Review incomplete/duplicate contacts from Core-native records or owner-approved historical reference.
- Add application review workflows incrementally.
- Do not automatically approve prospective buyers.

Current next application build step:

```text
Application detail page + controlled internal review actions.
```

## Phase 6: Payments And Documents

- Map contracts, payment history, document metadata, and reconciliation rules.
- Validate ledger-derived balances before exposing operational totals.
- Add document privacy/storage controls.
- Do not connect live processors, issue refunds, or change pricing automatically.

Documents may expand into metadata-only internal review workflows later. They must not generate, upload, sign, send, expose portal links, or call external providers until explicitly approved.

## Phase 7: Core Chat

- Add read-oriented conversational assistance and explicit validated tools.
- Log tool requests, executions, pending approvals, and all completed writes.
- Require confirmation for sensitive action categories.
- Do not permit free-form AI database mutations.

The Command Console may guide the owner/operator to existing pages and proposal review records. It must not submit AI commands, execute writes, or call model providers until a separate approved safety lane exists.

## Phase 8: Kennel Logging

- Add controlled workflows for puppy events, weights, feeding, and medications.
- Preserve factual observations and avoid inferred medical conclusions.
- Keep action history auditable.

## Phase 9: Home Assistant Bridge

- Design a narrow, approval-aware integration boundary.
- Let Home Assistant own device execution while Core owns intent, policy, and audit context.
- Do not enable sensitive device control without explicit approval.

## Phase 10: Camera And Smart Mirror Later

- Consider camera event sources, displays, and mirror experiences only after foundational workflows are stable.
- Treat camera information as observational input, not health or medical authority.
- Require separate privacy, security, and operational approvals before implementation.

## Not Yet

This baseline does not build a full customer portal, website replacement, live AI operator, live payments, Zoho tooling, production Twilio routing, automated customer decisions, refunds, price changes, Home Assistant control, camera AI, or smart mirror experience.
