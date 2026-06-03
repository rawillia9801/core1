# Core Build Order
## Status Note

- Current as of this pass: active steering document.
- Reflects current staged Core OS vision: internal Core first, governed Core second, customer-facing Core later, then assistant/nervous-system/smart-kennel layers.
- Central current truth: this file owns build sequence; `CURRENT_STATUS.md` owns implemented state.


## Guardrail

Cherolee Core should be built in small, verifiable phases. Core is the operating system and daily command layer for Cristy's owner-operated business and kennel. Each phase depends on a trustworthy canonical model and explicit owner approval before any production data movement or sensitive action.

## Phase 0: Inventory And Freeze

- Inventory existing Supabase, document, payment, and communication records that may inform Core-native modeling.
- Treat Zoho files, screenshots, PDFs, field names, and old notes as historical reference only. Zoho is not an import source, migration source, bridge, dependency, sync target, writeback target, or future workflow.
- Identify legacy duplicates and determine which non-Zoho records may supply owner-approved reference data.
- Freeze destructive cleanup: do not delete, rename, truncate, or repurpose existing tables.
- Document production access, privacy requirements, and migration approval points.

## Phase 1: Internal Core Foundation

- Establish canonical `core_` tables and read-friendly views.
- Establish audit and integration event ledgers.
- Establish schema documentation and development instructions.
- Validate migrations on a clean local/dev database.
- Build owner/operator-only local workflows for applications, reservations, ledger entries, go-home planning, kennel records, read-only workspaces, notification preview, command shell, and proposed-action review.

Current local/main work is in this phase. It remains internal/local/dev focused; no production records, customer-facing routes, live providers, or device automations are wired.

## Phase 2: Governed Owner/Operator Core

- Harden authenticated owner/operator access, staging environment boundaries, RLS or approved server-only access rules, field visibility, and selected-real-data gates.
- Keep service-role use server-side and deliberate until RLS/security work is complete.
- Use one or two owner-approved Core-native records only after the staging checklist is satisfied.
- Add controlled write paths one at a time with validation, authorization, structured errors, events, and audit records.

## Phase 3: Internal Production Owner/Operator Core

- Move stable owner/operator workflows into production use for Cristy only.
- Continue to make interfaces request/display truth from Core; do not let dashboards, chat, portals, or provider state define truth.
- Keep financial balances derived from reservation contract totals and immutable-style ledger entries.
- Keep proposed actions review-only unless a separate approved execution workflow exists.

## Phase 4: Customer-Facing Core

- Add minimal public application intake only after access rules, validation, privacy language, and safety checks exist.
- Add customer portal, documents, signatures, payment visibility, customer messaging, and public website publishing only after internal Core is stable.
- Keep customer-facing automation blocked until owner/operator review, field visibility, RLS/security, and rollback rules are proven.

## Phase 5: Assistant Core

- Add read-oriented assistant behavior only after internal records are stable.
- AI is an interface/helper, not authority.
- AI may prepare summaries and proposed actions but must not write directly, send messages, move money, publish listings, control devices, or decide buyer/puppy outcomes.
- Proposed-action execution requires a separately approved controlled RPC/server-action path with event/audit records.

## Phase 6: Core Nervous System

- Add system health signals, dependency status, incidents, recovery playbooks, degraded-state awareness, and presence state as a major future layer.
- Treat nervous-system signals as operational awareness, not uncontrolled authority.
- Keep recovery/action playbooks governed, auditable, and owner/operator-controlled.

## Phase 7: Smart Kennel, Smart Home, CoreFace, And Physical-World Layers

- Consider kennel monitoring, camera event sources, voice, CoreFace, displays, mirror experiences, and Home Assistant only after foundational workflows and governance are stable.
- Smart-home and kennel monitoring must be safety-bounded, auditable, and limited to approved intent/action paths.
- Camera and sensor information is observational input, not medical or health authority.
- Require separate privacy, security, and operational approvals before implementation.

## Not Yet

This baseline does not build a full customer portal, website replacement, AI console, live payments, Zoho tooling, production Twilio routing, automated customer decisions, refunds, price changes, Home Assistant control, camera AI, or smart mirror experience.
