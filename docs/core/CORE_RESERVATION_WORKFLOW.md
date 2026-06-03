# Core Reservation Workflow
## Status Note

- Current as of this pass: active technical reference.
- Reflects implemented local/dev reservation/payment/cancellation/ledger foundations; live payments, refunds, documents, portal visibility, and external messages remain blocked.
- Central current truth: `CURRENT_STATUS.md` and `IMPLEMENTATION_CHECKLIST.md`.


## Purpose

This workflow is the second controlled Core write foundation. It creates the official buyer/family plus puppy transaction after an application has been reviewed and a puppy is being reserved.

## Function

```text
public.core_create_reservation(
  p_buyer_id uuid,
  p_family_id uuid,
  p_puppy_id uuid,
  p_application_id uuid,
  p_actor_profile_id uuid,
  p_contract_total_cents integer,
  p_deposit_required_cents integer default null,
  p_sale_type text default null,
  p_notes text default null
)
```

## What It Does

When successful, the function:

1. Validates required buyer, family, puppy, actor, and contract total fields.
2. Validates that optional deposit amount is not negative.
3. Locks the buyer, family, puppy, and optional application rows.
4. Confirms the optional application belongs to the same buyer/family when those links exist.
5. Rejects the reservation if the puppy already has an active reservation.
6. Creates one `core_reservations` row with status `reserved`.
7. Sets `reserved_at`, contract total, deposit required, currency, sale type, notes, and portal status.
8. Updates the puppy status to `reserved`.
9. Writes a `core_events` row with `event_type = reservation_created`.
10. Writes a `core_audit_log` row containing the before/after puppy and reservation state.

## What It Does Not Do

This workflow does not:

- Record a payment.
- Create a ledger entry.
- Send a receipt.
- Send email.
- Connect to Zoho.
- Connect to Twilio.
- Invite the buyer to the portal.
- Generate a contract.
- Enable RLS.
- Build live customer-facing UI.

Payments, receipts, portal invitation, contract generation, and customer messaging are separate workflows.

## Current Internal Read Surface

The reservations list links to `/staff/reservations/[reservationId]` for internal Core readiness review.

That detail page is read-only. It summarizes buyer/family context, puppy/litter context, ledger-derived financial truth, document readiness metadata, go-home readiness, checklist items, deterministic blockers, internal links, event history, and audit history.

It does not call `core_create_reservation(...)`, payment RPCs, cancellation RPCs, email/SMS providers, document providers, portal invitation behavior, public listing updates, or external integrations.

Financial truth on the detail page remains derived from `core_financial_ledger` and `core_payment_balance_view`; it is not copied onto buyers or treated as processor activity.

## Active Reservation Rule

A puppy cannot be assigned to a second active reservation.

The duplicate check treats these statuses as inactive:

```text
cancelled
void
released
```

Any other reservation status for the same puppy blocks a new reservation.

## Smoke Test

The rollback-safe test is:

```text
supabase/tests/core_create_reservation_write_tool_tests.sql
```

It verifies:

- Reservation is created.
- Puppy status changes to `reserved`.
- Contract total and deposit required values are stored on the reservation.
- Portal access starts as `not_invited`.
- Exactly one reservation-created event is written.
- Exactly one reservation audit log is written.
- A duplicate active reservation attempt is rejected.
- The transaction rolls back.

## Current UI Path

The current Reservations and Applications pages can call server-side actions that call this function where already implemented. Those server actions must still handle authentication, authorization, validation, error display, and safe user feedback.

The reservation detail readiness page does not add a write path.

## Future Payment Path

After a reservation is created, payment/deposit handling should call a separate financial workflow that writes to `core_financial_ledger` using explicit `balance_effect` rules. Reservation creation must not silently create payment records.
