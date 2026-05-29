# Core Staging Readiness Checklist

## Purpose

This checklist is the final gate before importing any selected real data into a Core staging environment.

It is not a production launch checklist. It applies only to a tiny, owner-approved selected-real-data staging test, currently limited to one or two real application records.

Do not import selected real data until every required item below is satisfied or explicitly marked not applicable by the owner.

## Environment Readiness

- [ ] Separate staging environment is identified.
- [ ] Staging URL is known.
- [ ] Staging database is separate from local/development.
- [ ] Staging environment variables are configured outside the repository.
- [ ] Secrets are not committed to Git, docs, chat, screenshots, or client code.
- [ ] Service role key remains server-only.
- [ ] Anon key is used only where appropriate.
- [ ] `.env.local` is not committed.
- [ ] Local/dev duplicate folders are not used as the staging source of truth.

## Staff Access Readiness

- [ ] `/staff` route is protected.
- [ ] `/login` works in staging.
- [ ] Owner/admin login is verified.
- [ ] Staff login is verified.
- [ ] Inactive mapped users are blocked.
- [ ] Unmapped Auth users are blocked.
- [ ] Role-based read scopes are verified.
- [ ] Staff cannot see owner/admin-only sensitive panels.
- [ ] Dashboard reads require authenticated staff context.
- [ ] Service-role read paths remain server-side only.

## Action Authorization Readiness

- [ ] Dashboard actions use authenticated staff actor IDs.
- [ ] Audit actor attribution is verified.
- [ ] Owner/admin permissions are verified.
- [ ] Staff permissions are verified.
- [ ] Staff is blocked from cancellation with puppy release.
- [ ] Staff dashboard actions do not depend on `CORE_APPROVAL_ACTOR_PROFILE_ID`.
- [ ] Existing actions remain local/development or staging-only until production authorization is approved.

## Data Scope Approval

- [ ] Exact real records are selected and approved by the owner.
- [ ] First staging slice is limited to one or two application records only.
- [ ] No bulk import is included.
- [ ] No payment processor records are included.
- [ ] No financial ledger history is included.
- [ ] No document/signature records are included.
- [ ] No message/Twilio records are included.
- [ ] No customer portal records are included.
- [ ] No unrelated Zoho modules are included.

## Field Sensitivity Review

- [ ] Application fields are reviewed before import.
- [ ] Staff-visible fields are approved.
- [ ] Owner/admin-only fields are identified.
- [ ] Unnecessary private fields are excluded where possible.
- [ ] Phone visibility is reviewed.
- [ ] Email visibility is reviewed.
- [ ] Free-text answers are reviewed for unexpected sensitive content.
- [ ] Staff-visible application sections are confirmed safe for the selected records.

## Import Method Readiness

- [ ] Local dry run is completed first.
- [ ] Staging import method is chosen.
- [ ] Existing intake function compatibility is confirmed.
- [ ] No seed-through-migration is used.
- [ ] No real payload is committed to Git.
- [ ] No live Zoho webhook is connected.
- [ ] No recurring Zoho sync is connected.
- [ ] No production writeback is enabled.
- [ ] Expected audit/event rows for the import path are understood.

## Side-Effect Lockout

Confirm all remain off:

- [ ] Email sending.
- [ ] Twilio/SMS/calls.
- [ ] Payment processor.
- [ ] Document generation.
- [ ] Signature provider.
- [ ] Customer portal.
- [ ] Public website replacement.
- [ ] Automation or AI writes.
- [ ] Home Assistant.
- [ ] Cameras.
- [ ] Smart mirror or display automations.
- [ ] External notifications.
- [ ] Automatic approvals.
- [ ] Automatic reservations.
- [ ] Automatic payments, refunds, fees, chargebacks, or credits.

## Verification After Import

- [ ] Selected application appears in `/staff`.
- [ ] Application sections display correctly.
- [ ] Owner/admin can see expected full dashboard data.
- [ ] Staff role sees only approved operational data.
- [ ] Staff cannot see financial ledger activity.
- [ ] Staff cannot see full audit/activity rows.
- [ ] Staff cannot see phone lookup safety/ambiguity details.
- [ ] Staff cannot see the general event feed.
- [ ] Event/audit rows are expected only.
- [ ] No email was sent.
- [ ] No SMS/Twilio action occurred.
- [ ] No payment processor action occurred.
- [ ] No document/signature action occurred.
- [ ] No customer portal visibility occurred.
- [ ] No public website behavior changed.
- [ ] No production Zoho record was modified.

## Rollback Plan

- [ ] Staging records can be deleted or reset.
- [ ] Staging database reset path is understood.
- [ ] No production records are modified.
- [ ] No customer is contacted.
- [ ] No payment is triggered.
- [ ] No document/signature is triggered.
- [ ] No message/SMS/email is triggered.
- [ ] Rollback approach is approved by the owner before import.

## Go / No-Go Decision

Required approvals before import:

- [ ] Owner approves exact records.
- [ ] Owner approves exact fields.
- [ ] Owner approves staging environment.
- [ ] Owner approves import method.
- [ ] Owner approves verification checklist.
- [ ] Owner approves rollback plan.

Go only if:

- [ ] Staff auth and role read scopes are verified.
- [ ] Sensitive panels remain owner/admin only.
- [ ] Staff-visible application fields are reviewed.
- [ ] Live side effects are confirmed off.
- [ ] Import method does not require committing real data.
- [ ] Rollback path is clear.

No-go if:

- [ ] Any selected record is not explicitly approved.
- [ ] Any selected field has unclear visibility.
- [ ] Staging database separation is unclear.
- [ ] Any live integration is connected unexpectedly.
- [ ] Any required secret appears in Git, docs, chat, screenshots, or client code.

## Hard Stop Conditions

Stop immediately if:

- `/staff` is reachable without login.
- Inactive or unmapped users can access `/staff`.
- Staff can see restricted financial, audit/activity, phone lookup, or general event-feed data.
- Selected records are not owner-approved.
- Staging database is not separate from local/development and production.
- Secrets appear in the repository or browser code.
- Any live integration tries to send, charge, generate, notify, sync, or write back.
- Any customer is contacted.
- Any production record is modified.
- Any real payload must be committed to proceed.

## Current Status

This checklist exists as a documentation gate.

No selected real data has been imported yet.

Selected-real-data import remains blocked until this checklist is satisfied and owner-approved.
