# Core Command Console Plan

## Purpose

The Core Command Console is the future primary interface for Cherolee Core. It should feel intelligent, alive, and futuristic while remaining safe, permissioned, and auditable.

The console is not a shortcut around Core's safety model. It is a staff interface that can help understand records, prepare work, and surface next actions. Any write-capable behavior must stay explicit, reviewed, and logged.

## Non-Negotiable Safety Model

The safety model is:

```text
AI understands request
  -> AI prepares proposed action
  -> AI shows exact changes
  -> owner/admin approves
  -> Core writes record through audited RPC/server action
  -> Core logs event and audit row
```

Rules:

- AI cannot silently change records.
- AI proposes actions; it does not execute them directly.
- Owner/admin approval is required for write execution.
- Writes must go through controlled RPCs or server actions.
- Every write must create `core_events` and `core_audit_log` rows.
- Staff role limitations must be enforced server-side.
- The browser UI cannot be the only enforcement boundary.
- Direct database writes from AI, chat, or browser code are prohibited.

## Allowed First Console Capabilities

The first Command Console milestone should be read-only.

Allowed read-only capabilities:

- Summarize applications.
- Summarize buyers and families.
- Summarize kennel status.
- Summarize go-home readiness.
- Summarize payments and ledger status for owner/admin only.
- Surface warnings, blockers, and next recommended staff actions.
- Link users to the existing staff workspaces for the actual review surface.

This first milestone should not connect an AI provider. It can be a designed shell that proves layout, safety indicators, and staff route protection before intelligence is connected.

## Later Controlled Action Capabilities

Later, after the approval model and proposed-action storage are designed, the console may draft controlled actions such as:

- Draft proposed dog, litter, or puppy changes.
- Draft application approval or decline notes.
- Draft payment reminder text without sending.
- Draft document package plans without generating documents.
- Draft customer messages without sending.
- Queue proposed actions for owner/admin approval.

These are drafts only until a permitted owner/admin approves the final action.

## Prohibited Until Later

The console must not do these until separate approved tasks design, implement, and verify the safety boundaries:

- Send emails.
- Send SMS.
- Move money.
- Publish puppy listings.
- Generate documents.
- Request signatures.
- Perform customer portal actions.
- Write directly to the database.
- Execute unsupervised AI operations.
- Call model providers from production workflows without an approved provider, logging, cost, privacy, and safety plan.

## Suggested UI Concept

The eventual UI can feel like a futuristic command console while preserving plain operational truth.

Suggested areas:

- Main chat/input panel.
- Live system status panels.
- Approval queue for proposed actions.
- Recent events/audit timeline.
- Safety boundary indicators.
- Role-aware sensitive panels.
- "No external systems connected" markers where appropriate.
- Clear proposed-change previews before any approval.

The console should complement existing staff workspaces first. It should not replace them until the read, proposal, approval, and audit model is proven.

## First Build Milestone

First milestone:

- Read-only console shell only.
- Staff-only route.
- No AI provider connected.
- No model API calls.
- No proposed-action writes.
- No external system integrations.
- No replacement of existing staff workspaces.
- Prefer no fake operational data. If static example text is ever used, it must be clearly labeled as non-operational mock UI copy.

The first shell should show the safety model and connect users to the existing read-only/workflow pages.

## Acceptance Criteria Before Implementation

Do not implement the Command Console until these are reviewed:

- RLS/security plan reviewed.
- Tool approval model designed.
- Proposed-action table/schema designed.
- Audit/event model confirmed.
- Owner/admin approval UI designed.
- Role limits defined for owner, admin, and staff.
- Sensitive read scopes confirmed.
- No external sending connected.
- No public/customer-facing behavior connected.
- No autonomous writes possible.

## Current Status

This is a planning document only. The Core Command Console is not built. No AI provider, model API call, proposed-action table, or AI write behavior has been added.
