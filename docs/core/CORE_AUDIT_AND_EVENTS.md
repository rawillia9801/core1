# Core Audit And Integration Events

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

## Integration Event Rule

Each inbound webhook or outbound sync event must be persisted before processing. Processing should be idempotent using the source system and external event ID when one exists.

Integration events record source, direction, external event ID, event type, payload, processing status, attempts, retry timing, timestamps, and error detail. Credentials and secret values do not belong in stored payload metadata.

## Future Write Safety

AI/chat must never write directly to Postgres. A later workflow may only request validated server-side tools that enforce authorization, validate input, record audit results, and return structured outcomes. Sensitive or ambiguous actions should remain pending until explicitly approved.

## Deferred Work

Authentication, authorization/RLS design, webhook endpoints, tool implementation, retries, retention/redaction policy, production integration credentials, and monitoring are deliberately deferred.
