# Core Build Order

## Guardrail

Cherolee Core should be built in small, verifiable phases. Each phase depends on a trustworthy canonical model and explicit owner approval before any production data movement or sensitive action.

## Phase 0: Inventory And Freeze

- Inventory existing Supabase, Zoho, Twilio, document, and payment sources.
- Identify legacy duplicates and determine which systems may supply migration data.
- Freeze destructive cleanup: do not delete, rename, truncate, or repurpose existing tables.
- Document production access, privacy requirements, and migration approval points.

## Phase 1: Core Schema Baseline

- Establish canonical `core_` tables and read-friendly views.
- Establish audit and integration event ledgers.
- Establish schema documentation and development instructions.
- Validate migrations on a clean local/dev database.

Current task ends in this phase. No production records are wired by this baseline.

## Phase 2: Read-Only Dashboard

- Build simple operational reads backed by canonical views.
- Include empty/error/loading states and privacy-conscious server access.
- Use test or approved imported data only after a mapping and validation task.
- Do not add broad write actions while read models are still settling.

## Phase 3: First Write Tools

- Implement one validated server-side tool at a time.
- Require authorization, input validation, structured errors, and `core_audit_log` entries.
- Ensure AI/chat cannot issue direct database writes.
- Start with low-risk manual workflows only after approval.

## Phase 4: Core Phone Lookup

- Confirm phone normalization and duplicate-resolution policy.
- Use `core_phone_lookup_view` as the read model for lookup.
- Only connect Twilio or live routing after testing and explicit approval.
- Keep customer communications controlled and auditable.

## Phase 5: Applications Into Core

- Map application sources and review incomplete/duplicate contacts.
- Import only through an approved, repeatable migration procedure.
- Add application review workflows incrementally.
- Do not automatically approve prospective buyers.

## Phase 6: Payments And Documents

- Map contracts, payment history, document metadata, and reconciliation rules.
- Validate ledger-derived balances before exposing operational totals.
- Add document privacy/storage controls.
- Do not connect live processors, issue refunds, or change pricing automatically.

## Phase 7: Core Chat

- Add read-oriented conversational assistance and explicit validated tools.
- Log tool requests, executions, pending approvals, and all completed writes.
- Require confirmation for sensitive action categories.
- Do not permit free-form AI database mutations.

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

This baseline does not build a full admin dashboard, Puppy Portal, website replacement, AI console, live payments, Zoho retirement, production Twilio routing, automated customer decisions, refunds, price changes, Home Assistant control, camera AI, or smart mirror experience.
