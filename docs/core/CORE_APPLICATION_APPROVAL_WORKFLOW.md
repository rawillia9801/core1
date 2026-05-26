# Core Application Approval Workflow

## Purpose

This workflow is the first controlled Core write foundation. It demonstrates how Core should make changes safely: through a validated function that updates canonical records and writes operational/audit records.

## Function

```text
public.core_approve_application(
  p_application_id uuid,
  p_actor_profile_id uuid,
  p_decision_notes text default null,
  p_queue_notification boolean default false
)
```

## What It Does

When successful, the function:

1. Locks and validates one `core_applications` row.
2. Rejects missing applications.
3. Rejects terminal statuses such as `approved`, `declined`, or `void`.
4. Validates the actor profile.
5. Updates the application to `approved`.
6. Sets `reviewed_at`, `reviewed_by_profile_id`, and `decision_notes`.
7. Updates the linked buyer `approval_status` to `approved` when a buyer is linked.
8. Inserts a `core_events` row with `event_type = application_approved`.
9. Inserts a `core_audit_log` row with old and new application/buyer data.
10. Optionally creates a queued `core_notifications` row.

## What It Does Not Do

This workflow does not:

- Send email.
- Connect to Zoho.
- Connect to Twilio.
- Import production data.
- Enable RLS.
- Build UI buttons.
- Approve applicants automatically.
- Create reservations.
- Change puppy assignments.
- Create payment records.

Queued notifications are records only. A later approved messaging/email workflow must decide how and when to send them.

## Why This Pattern Matters

Core should not become a set of random dashboard edits. Each important business action should use a named write path that:

- Validates input.
- Updates the correct canonical records.
- Writes an operational event.
- Writes an audit log.
- Optionally queues a later action without performing uncontrolled side effects.

## Smoke Test

The rollback-safe test is:

```text
supabase/tests/core_application_approval_write_tool_tests.sql
```

It verifies:

- Application status changes to `approved`.
- Linked buyer status changes to `approved`.
- Exactly one `application_approved` event is written.
- Exactly one approval audit log is written.
- A queued notification can be created without sending anything.
- A duplicate approval attempt is rejected.
- The transaction rolls back.

## Future UI Path

A later Applications page can call a server-side action that calls this function. That server action must still handle authentication, authorization, input validation, error formatting, and safe user feedback.

## Future Zoho Path

Zoho integration should not call this function blindly. A later Zoho import/sync task should map Zoho application records into Core and decide whether each imported status is a historical fact, a pending review, or an action requiring owner approval.
