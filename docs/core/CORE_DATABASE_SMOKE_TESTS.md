# Core V1 Database Smoke Tests

## Purpose

The Core V1 smoke test verifies that the canonical schema and read views support a small, coherent transaction story without importing real records. It creates only obvious test-only records inside a database transaction and finishes with `rollback`, leaving the database unchanged.

Test script:

```text
supabase/tests/core_v1_smoke_tests.sql
```

## Test-Only Scenario

The test uses:

- Admin profile: `Test Admin`
- Buyer profile and buyer: `Sarah Test Buyer`
- Family: `Sarah Test Buyer Family`
- Ambiguity buyer/family: `Alex Test Duplicate Phone` and `Alex Test Duplicate Phone Family`, sharing Sarah's test normalized phone only after the unambiguous assertion.
- Ambiguity profile/family: `Taylor Test Profile Match` linked to `Taylor Test Profile Family`, sharing the same test normalized phone without a buyer record.
- Dam: `Ember Test Dam`
- Sire: `Rambo Test Sire`
- Puppies: `Luna Test Puppy` and `Nova Test Puppy`
- One application and two reservations for the same buyer/family.
- One shared go-home group with one current detail for each reservation.
- Posted decreases: a `$500.00` deposit, `$250.00` payment, and `$100.00` credit.
- Posted increases: a `$50.00` fee, `$25.00` admin fee, `$75.00` transport fee, `$30.00` finance charge, `$120.00` refund, and `$80.00` chargeback.
- A `$99.99` neutral adjustment that is retained as activity but does not affect the balance.
- A test call, operational event, audit record, and integration event.

The reservation contract total is `200000` cents. Decreases total `85000` cents; increases total `38000` cents; neutral activity totals `9999` cents. The expected calculated balance is `153000` cents:

```text
200000 - 85000 + 38000 = 153000
```

## Run Locally

Start local Supabase and apply all current local migrations:

```bash
supabase start
supabase db reset --local
```

Run the current rollback-safe SQL validation scripts from Git Bash:

```bash
cat supabase/tests/core_v1_smoke_tests.sql | docker exec -i supabase_db_core1 psql -U postgres -d postgres -v ON_ERROR_STOP=1
cat supabase/tests/core_go_home_effective_view_tests.sql | docker exec -i supabase_db_core1 psql -U postgres -d postgres -v ON_ERROR_STOP=1
cat supabase/tests/core_application_approval_write_tool_tests.sql | docker exec -i supabase_db_core1 psql -U postgres -d postgres -v ON_ERROR_STOP=1
cat supabase/tests/core_create_reservation_write_tool_tests.sql | docker exec -i supabase_db_core1 psql -U postgres -d postgres -v ON_ERROR_STOP=1
cat supabase/tests/core_record_reservation_payment_tests.sql | docker exec -i supabase_db_core1 psql -U postgres -d postgres -v ON_ERROR_STOP=1
cat supabase/tests/core_cancel_reservation_tests.sql | docker exec -i supabase_db_core1 psql -U postgres -d postgres -v ON_ERROR_STOP=1
cat supabase/tests/core_zoho_application_intake_tests.sql | docker exec -i supabase_db_core1 psql -U postgres -d postgres -v ON_ERROR_STOP=1
cat supabase/tests/core_zoho_application_report_label_tests.sql | docker exec -i supabase_db_core1 psql -U postgres -d postgres -v ON_ERROR_STOP=1
npm run lint
```

The SQL validation scripts use fake data and are intended to roll their database changes back at the end.

## Local Workflow Seed Helper

For dashboard testing after a local reset, use the local-only workflow seed helper:

```bash
./scripts/seed-local-core-workflow.sh
```

Equivalent direct SQL command:

```bash
cat scripts/seed-local-core-workflow.sql | docker exec -i supabase_db_core1 psql -U postgres -d postgres -v ON_ERROR_STOP=1
```

This helper differs from the rollback-safe smoke tests: it intentionally commits fake local/dev records so the dashboard has applications, application sections, puppies, one reserved example, and event/audit context to display after `supabase db reset --local`. It is not loaded by migrations, uses only `LOCAL-*` references and `example.invalid` contact data, marks records with `local_dev_only`, creates no payment/ledger rows, and is safe to rerun because it uses deterministic UUIDs with upsert/update behavior.

## Additional Validation Coverage

| Test Script | Purpose |
| --- | --- |
| `core_go_home_effective_view_tests.sql` | Validates resolved group defaults, explicit individual override behavior, and ungrouped go-home appointment values. |
| `core_application_approval_write_tool_tests.sql` | Validates controlled approval updates plus event/audit records and queued-notification behavior without sending anything. |
| `core_create_reservation_write_tool_tests.sql` | Validates controlled reservation creation, puppy status transition, event/audit records, and duplicate active reservation rejection. |
| `core_record_reservation_payment_tests.sql` | Validates controlled posted deposits/payments, decreasing balance semantics, event/audit records, and duplicate-reference rejection without connecting payments. |
| `core_cancel_reservation_tests.sql` | Validates controlled reservation cancellation, explicit puppy release behavior, ledger preservation, event/audit records, and rejection of unsafe cancellation inputs. |
| `core_zoho_application_intake_tests.sql` | Validates fake Zoho API-name payload intake into Core without a live Zoho connection. |
| `core_zoho_application_report_label_tests.sql` | Validates fake report/PDF-label payload compatibility without a live Zoho connection. |

## What The Checks Prove

| Check | Expected result |
| --- | --- |
| Family membership joins | `Sarah Test Buyer` is linked to a family and buyer profile through `core_family_members`. |
| Litter parent joins | The test litter resolves to `Ember Test Dam` and `Rambo Test Sire`. |
| Puppy/litter join | `Luna Test Puppy` belongs to the test litter. |
| Reservation joins | Two reservations resolve the same buyer/family and application, each with its own puppy. |
| Go-home group | Both reservation details may link to one shared test pickup/delivery group. |
| Current go-home detail cardinality | A second go-home detail for the same reservation is rejected. |
| Shared appointment ownership | A grouped detail cannot silently duplicate or override group appointment fields. |
| Explicit appointment exception | A grouped detail can override appointment fields only with an exception flag and reason. |
| Payment balance view | Posted activity magnitude is `132999` cents and effect-calculated balance due is `153000` cents. |
| Ledger effects | Deposit, payment, and credit are `decrease`; fees, finance charge, refund, and chargeback are `increase`; neutral adjustment contributes zero. |
| Ledger constraints | Invalid `balance_effect` values and negative post-correction `amount_cents` values are rejected. |
| Phone lookup view | Normalized phone `+12765550101` finds `Sarah Test Buyer` and her reservation context. |
| Ambiguous phone lookup | A second buyer/family plus a family-linked profile using `+12765550101` make lookup ambiguous and suppress buyer, puppy, payment, and go-home context. |
| Phone routing flags | Ambiguous lookup requires verification and recommends staff routing. |
| Buyer summary view | Buyer context includes one application, one reservation, Luna, and calculated balance. |
| Puppy summary view | Puppy context includes its litter, buyer/reservation, and calculated balance. |
| Reservation summary view | Transaction context contains buyer, puppy, totals, and calculated balance. |
| Dashboard-today view | Today's application, ledger entries, and phone call continue to appear as feed items; grouped appointment display behavior is deferred. |
| Integration event deduplication | A second record for the same `source_system` and `external_event_id` raises a unique violation and is not retained. |
| Audit log | A labeled test write-action record can be stored. |
| Operational events | A labeled test operational note/event can be stored. |

## Reading Results

Successful execution ends with summary query output and:

```text
ROLLBACK
```

Any failed assertion raises an exception and causes `psql` to exit unsuccessfully when `ON_ERROR_STOP=1` is used.

Failures generally mean:

- A table or relationship changed without updating dependent views/tests.
- Balance-effect conventions or posted-ledger filtering changed.
- Phone normalization/view columns no longer match the intended future lookup contract.
- Dashboard feed coverage or deduplication indexing changed.

## Financial Ledger Rule

`entry_type` answers: "What kind of transaction is this?"

`balance_effect` answers: "How does this affect the amount owed?"

`amount_cents` stores a non-negative magnitude. Posted rows calculate balance according to `balance_effect`:

- `decrease` subtracts `amount_cents` from amount owed.
- `increase` adds `amount_cents` to amount owed.
- `neutral` has zero balance impact.

The follow-up ledger migration backfills recognized existing Core entry types using these rules. Any pre-correction entry type that is not recognized, including an adjustment without prior direction, is marked `neutral` for explicit review rather than changing a balance silently.

There is no default `balance_effect` for future inserts; validated financial write tools must always provide it explicitly.

`core_record_reservation_payment(...)` is intentionally narrow: it records only posted `deposit` and `payment` entries and always writes `balance_effect = 'decrease'`. Its rollback-safe test proves a `$500.00` deposit lowers a `$2,000.00` reservation balance to `$1,500.00`, then a `$250.00` payment lowers it to `$1,250.00`; it also rejects `fee`, zero/negative amounts, missing reservation/actor records, and a repeated external reference for an otherwise identical posted deposit.

## Reservation Cancellation Rule

`core_cancel_reservation(...)` is intentionally narrow: it cancels only active `reserved` or `pending` reservations, requires a valid actor and cancellation reason, preserves transaction history, and writes event/audit records. It does not delete reservations or puppies, does not edit ledger rows, does not record refunds or fees, and does not send documents or messages.

The rollback-safe cancellation test proves cancellation without puppy release leaves the puppy status unchanged and preserves a posted deposit ledger row. It also proves explicit puppy release can move the linked puppy to `available`, that release event/audit rows are only created when the puppy status changes, and that a puppy is not released when another active reservation exists for that puppy. Missing reason, missing reservation, missing actor, invalid release status, and already-cancelled reservations are rejected.

## Go-Home Cardinality Rule

A buyer/family may have multiple puppies and therefore multiple reservations. Each reservation represents one puppy transaction and can have zero or one current `core_go_home_details` row. When multiple puppies go home together, their separate reservation details can point to the same optional `core_go_home_groups` event.

`core_go_home_groups` owns shared appointment schedule, pickup/delivery type, address, and contact phone. `core_go_home_details` owns puppy-specific readiness/checklist status, balance-clearance workflow state, and notes. Its `balance_cleared_status` never replaces the ledger-derived financial balance. A grouped detail may provide different appointment data only through explicit `individual_*` fields when `has_individual_override` is true and `override_reason` is provided. Existing detail `method`, `planned_at`, and `location` values are retained for ungrouped details only.

The smoke test proves that two details for two different reservations can share one group, that a silent grouped appointment override is rejected, that an explicitly explained exception is allowed, and that a second current detail for the same reservation is rejected. Core V1 uses `core_events` and `core_audit_log` for change history rather than additional historical go-home detail rows.

## Removing Test Data

Normal execution requires no cleanup because the script always rolls back its transaction. If someone deliberately removes the final `rollback` while experimenting locally, discard local test data by rebuilding the local database:

```bash
supabase db reset
```

Never run test cleanup or this smoke-test scenario against production data.
