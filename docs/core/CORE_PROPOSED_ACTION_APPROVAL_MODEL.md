# Core Proposed Action Approval Model

## Purpose

This document defines the approval bridge between read-only Core assistance, future proposed actions, and controlled Core action execution. Core is intended to become the operating system and daily command layer for Cristy's owner-operated business and kennel, but not a reckless autonomous actor.

It locks the autonomy safety model for proposed-action work. The current database/read-only review foundation may store and display proposal records, but approval still does not execute underlying business changes.

The intended path is:

```text
Read/summarize
  -> propose exact action
  -> Cristy or an explicitly authorized owner/admin approves
  -> controlled RPC/server action writes
  -> event/audit rows recorded
  -> no silent writes
```

## Non-Negotiable Rules

- AI cannot write directly to the database.
- AI cannot send emails.
- AI cannot send SMS.
- AI cannot move payments.
- AI cannot generate documents.
- AI cannot request signatures.
- AI cannot publish puppies or public website listings.
- AI cannot modify records without owner/admin approval.
- Core may create or prepare proposed actions only through approved, validated workflows.
- All writes must go through controlled server actions or database RPCs.
- Every execution must write event/audit rows.
- Technical role limitations must be enforced server-side.
- There must be no generic arbitrary SQL or generic write endpoint.
- There must be no direct AI database credentials.

## Proposed Action Lifecycle

Suggested states:

- `drafted`: Action is being prepared and is not ready for review.
- `needs_review`: Action is ready for owner/admin review.
- `approved`: Owner/admin approved the proposed action.
- `rejected`: Owner/admin rejected the proposed action.
- `expired`: Action was not reviewed or executed within its allowed window.
- `executed`: Approved action executed through a controlled server action/RPC.
- `failed`: Execution failed after approval.
- `cancelled`: Proposed action was withdrawn before execution.

## Proposed Action Types

Future examples only:

- `update_dog`
- `update_litter`
- `update_puppy`
- `approve_application`
- `create_reservation`
- `record_payment`
- `update_go_home_detail`
- `draft_customer_message`
- `draft_document_package`
- `queue_notification_preview`
- `website_listing_draft`

These names do not authorize implementation. Each action type needs validation, permissions, and execution rules before it can be built.

## Required Proposed Action Fields

Conceptual fields:

- `id`
- `action_type`
- `title`
- `summary`
- `risk_level`
- `proposed_by_type`
- `proposed_by_profile_id`
- `source`
- `target_table`
- `target_id`
- `before_snapshot`
- `proposed_change`
- `validation_status`
- `approval_status`
- `approved_by_profile_id`
- `approved_at`
- `executed_by`
- `executed_at`
- `execution_result`
- `expires_at`
- `metadata`

The eventual schema should avoid storing secrets or raw provider credentials. Snapshots should include only the data needed to make the decision auditable.

## Risk Levels

- `low`: Read-only summary, internal note draft, or non-operational plan.
- `medium`: Internal record update that does not touch money, external systems, customer communications, documents, signatures, or public listings.
- `high`: Financial, customer communication, document/signature, listing, public visibility, or customer-impacting action.
- `blocked`: External send/payment/publish behavior before integrations and approval gates are explicitly approved.

## Approval Rules

- Owner/admin can approve proposed actions.
- Future helper/staff-role users may draft certain actions later if needed but cannot approve sensitive actions.
- Payment, document, customer communication, and public listing actions need stricter gates.
- Some actions may require a preview-only stage before approval.
- High-risk actions may require more detailed confirmation language.
- Blocked actions cannot be approved until the matching integration/workflow is explicitly implemented and verified.

## Execution Rules

- Approved executable actions, when separately implemented, must execute through existing controlled RPCs or server actions.
- Validation must re-run at execution time.
- The target record should be rechecked before execution to avoid stale changes.
- No generic database write function is allowed.
- No arbitrary SQL is allowed.
- No direct AI database credentials are allowed.
- Execution must preserve role checks and owner/operator auth boundaries.
- External side effects must be explicit and blocked until their provider workflow is approved.

## Audit And Event Requirements

Future event/action names should include:

- `proposed_action_created`
- `proposed_action_approved`
- `proposed_action_rejected`
- `proposed_action_executed`
- `proposed_action_failed`

Requirements:

- Link to the target entity when one exists.
- Preserve before/after snapshots where appropriate.
- Store validation outcome.
- Store approval identity and timestamp.
- Store execution result.
- Store `external_side_effects` flag.
- Write `core_events` for operational timeline visibility.
- Write `core_audit_log` for accountability.

## Future Approval Queue UI Requirements

The future approval queue must show:

- Exact change preview.
- Before/after values.
- Risk level.
- Target entity and current status.
- Who or what proposed the action.
- What external systems would be touched.
- Whether external side effects are blocked or allowed.
- Confirmation language.
- Explicit approval button.
- Rejection control.
- Optional or required rejection reason depending on action type.

The UI must not hide important side effects behind vague summaries.

## First Implementation Milestone Later

When implementation is approved, the first milestone should be:

1. Database schema for proposed actions.
2. Read-only approval queue.
3. Manual draft action creation by owner/operator only.
4. No AI provider connected.
5. No execution behavior yet.

This staged approach proves storage, review, visibility, and permissions before any AI-assisted or executable workflow exists.

## Explicitly Out Of Scope For Now

- Autonomous writes.
- External sending.
- Payment movement.
- Customer portal actions.
- Public listing publishing.
- AI provider/API integration.
- Executable approval buttons.
- Execution engine.
- Generic write tools.

## Current Status

The proposed-action database and read-only owner/admin review workspace exist for proposal/review records. Approval records do not execute business changes. No AI provider calls, autonomous write tools, external sending, payment movement, document/signature generation, public publishing, or customer-facing side effects have been implemented.
