# Core Audit And Integration Events
## Status Note

- Current as of this pass: active technical reference.
- Reflects current canonical event/audit/integration/proposed-action foundations and future safety rules; no uncontrolled AI writes or live integrations are enabled.
- Central current truth: `CURRENT_STATUS.md` and `IMPLEMENTATION_CHECKLIST.md`.


## Purpose

Core V1 establishes ledgers for operational history and future safe integrations:

- `core_events` records operational notes and business timeline activity.
- `core_audit_log` records future writes and who or what performed them.
- `core_integration_events` records inbound/outbound external events before processing.
- `core_tool_runs` and `core_pending_actions` reserve a controlled path for future validated tooling.

No tool execution, webhook processing, or AI action is enabled by this baseline.

## Operational Events

`core_events` is the human-operational timeline. Events can be associated with a buyer, family, application, puppy, reservation, or another referenced entity, and can carry structured metadata without overwriting source records.

Examples include a note, status observation, appointment marker, or integration processing summary.

## Audit Log Rule

Every future server-side write action must create an audit entry. An audit record should capture:

- Actor type and optional actor identity.
- Source/tool name and action.
- Entity table and identifier.
- Previous and resulting values when available.
- Request metadata such as IP address, user agent, correlation ID, and structured context where appropriate.
- Success or failure outcome.

Audit entries must be treated as append-only accountability records; sensitive values must not be unnecessarily copied into them.

### Financial Write Audit Context

Any future write affecting `core_financial_ledger` must audit both `entry_type` and `balance_effect`. `entry_type` identifies what kind of financial transaction was recorded, while `balance_effect` identifies whether its non-negative `amount_cents` increases, decreases, or does not affect the amount owed. Refunds, fees, chargebacks, credits, and adjustments must not be inferred from amount sign alone.

`core_record_reservation_payment(...)` is the controlled Core V1 deposit/payment write foundation. It permits only posted `deposit` and `payment` entries, forces `balance_effect = 'decrease'`, derives the buyer from the reservation, and creates both an operational event and audit entry. It does not prove external funds were collected and does not support refunds, fees, chargebacks, or live processor reconciliation.

`core_record_financial_adjustment(...)` is the separate controlled Core V1 adjustment foundation for `credit`, `refund`, `chargeback`, `fee`, `admin_fee`, `transport_fee`, `finance_charge`, and neutral `adjustment`. It maps `balance_effect` internally, records a required reason, inserts a new posted ledger row, and creates both an operational event and audit entry. It must not be treated as payment-processor execution; refunds and chargebacks remain internal ledger records until later reconciliation work is designed.

Financial correction work must remain additive. Prior ledger rows are not edited or deleted. If an adjustment relates to a prior ledger row, the controlled function records that relation in metadata for local/development use; stronger first-class reconciliation fields and indexes are deferred until live payment integration design.

### Core-Native Application Entry Audit Context

`core_create_application_manual(...)` is the controlled Core-native owner/admin application creation foundation. It creates or reuses buyer/family context, creates a received application, stores grouped application section responses, writes an `application_created_manual` operational event, and writes a `create_application_manual` audit row.

The historical Zoho-shaped intake RPC does not send email, queue notifications, create reservations, create payments, create documents, invite portal users, or write back to Zoho. Zoho-shaped intake is cancelled-direction history only and must not be extended into an active import, compatibility, sync, dry-run, or writeback path.

### Notification Queue Audit Context

`core_queue_notification(...)` is the controlled Core V1 notification queue foundation. It creates a `core_notifications` row with status `queued`, records recipient/template/preview/context in the payload, writes a `notification_queued` operational event, and writes a `queue_notification` audit row.

This RPC is queue-only. It does not connect Resend or any email provider, send email, create provider delivery attempts, store provider message IDs, mark delivery success, or retry delivery. Future application, approval, payment, reservation, cancellation, go-home, and document workflows may queue notifications only after template, preview, recipient override, and send-safety rules are approved.

### Reservation Cancellation Audit Context

`core_cancel_reservation(...)` is the controlled Core V1 cancellation foundation. It changes an eligible `reserved` or `pending` reservation to `cancelled`, records a required cancellation reason, and creates both a `reservation_cancelled` operational event and a `cancel_reservation` audit entry.

Cancellation does not delete the reservation, delete the puppy, edit ledger rows, create refunds, create fees, send messages, or create documents. If puppy release is explicitly requested and no other active reservation exists for the puppy, the function changes puppy status to an allowed release status and writes separate `puppy_released` event/audit records. If another active reservation exists, the cancellation still records but the puppy remains unchanged.

## Integration Event Rule

Each inbound webhook or outbound sync event must be persisted before processing. Processing should be idempotent using the source system and external event ID when one exists.

Integration events record source, direction, external event ID, event type, payload, processing status, attempts, retry timing, timestamps, and error detail. Credentials and secret values do not belong in stored payload metadata.

## Future Write Safety

AI/chat must never write directly to Postgres. A later workflow may only request validated server-side tools that enforce authorization, validate input, record audit results, and return structured outcomes. Sensitive or ambiguous actions should remain pending until explicitly approved.

## Deferred Work

Authentication, authorization/RLS design, webhook endpoints, tool implementation, retries, retention/redaction policy, production integration credentials, and monitoring are deliberately deferred.
