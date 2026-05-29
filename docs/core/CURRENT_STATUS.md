# Cherolee Core Current Status

## Purpose

This document records what is actually present in the Core repository now. It is a checkpoint for continuing the local/development workflow safely; it is not a production-readiness statement.

## Repository Source Of Truth

Active repository:

```text
rawillia9801/core1
```

Active local working folder:

```text
C:/Users/rawil/core1
```

Active branch:

```text
main
```

The duplicate OneDrive checkout is not the working repository for Core tasks.

## Current Implemented And Locally Verified Workflow

Core now contains a local/development workflow foundation for:

```text
fake application intake
  -> review application details
  -> approve application
  -> create reservation for an available puppy
  -> show reserved puppy and ledger-derived balance
  -> record a deposit or payment
  -> refresh and show the reduced ledger-derived balance
  -> cancel a reservation with optional explicit puppy release
  -> show cancellation activity
  -> show financial ledger and adjustment activity read-only
```

This was verified locally after repopulating the reset database with the local workflow seed helper. A fake reservation with a `$2,000.00` contract balance accepted a local/development `$500.00` deposit entry through the dashboard, and the Reservation Workflow Status panel refreshed to show the ledger-derived balance due reduced to `$1,500.00`.

Each write step is deliberately narrow. The application does not directly insert arbitrary transaction data from the browser. Server-side actions call controlled database functions that validate the operation and write operational/audit records.

## Completed Foundation

### Canonical Database Baseline

The repository includes additive Supabase migrations for the Core V1 canonical model: buyers, families, applications and response sections, dogs, litters, puppies, reservations, financial records, documents, communications foundations, operational events, audit records, integration events, and future controlled-tool foundations.

The schema remains migration-friendly: canonical relationships are nullable where incomplete imports may eventually require reconciliation, and legacy tables have not been deleted or treated as the new system of record.

### Financial Ledger Semantics

The financial ledger correction is implemented:

- `core_financial_ledger.amount_cents` is a non-negative money magnitude.
- `entry_type` describes the activity, such as `deposit` or `payment`.
- `balance_effect` explicitly states whether an entry increases, decreases, or does not change the amount owed.
- `core_payment_balance_view` calculates balances from reservation contract totals and posted ledger effects.

Deposits and payments reduce amount owed through `balance_effect = 'decrease'`. Fees, refunds, chargebacks, credits, and adjustments are not exposed through the current local/development payment action.

The controlled financial adjustment RPC is now implemented separately from deposit/payment recording. `core_record_financial_adjustment` supports local/development ledger exception rows for:

- `credit`
- `refund`
- `chargeback`
- `fee`
- `admin_fee`
- `transport_fee`
- `finance_charge`
- neutral `adjustment`

The function maps `balance_effect` internally. Credit decreases balance; refund, chargeback, fees, transport fee, and finance charge increase balance; neutral adjustment does not affect balance. It inserts additive ledger rows only and does not edit or delete prior ledger entries.

Refunds and chargebacks in this foundation are internal Core ledger records only. They do not move money, contact a payment processor, send email, create receipts, or generate documents. Stronger reconciliation and idempotency remain required before live payment operations.

### Go-Home Model And Read Rules

Core implements the go-home cardinality and precedence foundation:

- A family may have multiple puppy reservations.
- Each reservation can have zero or one current go-home detail.
- Multiple reservation details can share an optional `core_go_home_groups` appointment.
- Group rows own shared trip/appointment data.
- Detail rows own puppy-specific readiness, checklist state, notes, and explicitly marked exceptions.
- `core_go_home_effective_view` resolves the effective current appointment read model.

No go-home write workflow or history table has been added.

### Phone Lookup Ambiguity Safety

The phone lookup read model can distinguish a single match from ambiguous matches. When more than one active match exists for a normalized phone number, sensitive buyer, puppy, payment, and go-home detail is suppressed and staff routing/verification is indicated.

This is read-model safety only. It is not a Twilio connection or a verification workflow.

## Application Intake And Review

### Intake Mapping And Database Intake

The repository contains documented Zoho application field mapping and controlled database intake support for:

- Zoho API-name shaped application payloads.
- Zoho report/PDF-label shaped application payloads.

The intake path writes Core buyer/family/application/application-section context along with audit/event records through controlled database logic. Rollback-safe SQL tests exist for both supported fake payload shapes.

### Guarded Local/Development Endpoint

A guarded Next.js endpoint exists at `src/app/api/intake/zoho-application/route.ts`. It is intended for local/development testing with fake payloads only. A local helper script exists for posting fake report-label data without pasting a long request command or embedding any private key.

This endpoint does not establish a live Zoho integration.

### Dashboard Application Read Surface

The dashboard reads local Core application data server-side and displays:

- Received application summaries.
- Latest application detail sections from `core_application_sections`.
- Readable grouped response values for review.

This supplies visibility for the local intake and approval workflow without exposing browser-side database writes.

## Controlled Local/Development Write Workflow

### Application Approval

The database function `core_approve_application` is implemented and tested. The local/development dashboard approval action:

- Calls the database RPC server-side.
- Uses the authenticated staff profile ID as the RPC actor.
- Updates approved application/buyer state through the controlled function.
- Writes operational event and audit records through the RPC.
- Keeps notification queuing disabled in the dashboard action.
- Sends no email and creates no reservation automatically.

Approval remains separate from reservation creation.

### Reservation Creation

The database function `core_create_reservation` and its rollback-safe SQL test are implemented. The dashboard now includes a local/development reservation creation action for approved applications with buyer/family context.

The reservation action:

- Selects an available puppy candidate.
- Accepts contract total and optional required deposit as human-entered dollar amounts.
- Converts dollars to integer cents on the server before calling the RPC.
- Calls `core_create_reservation` server-side.
- Relies on both read filtering and database validation to avoid assigning an already actively reserved puppy.
- Refreshes dashboard data after success.

The Reservation Workflow Status panel then shows recent reservation context, buyer/application/puppy information, puppy status, contract/deposit values, and ledger-derived balance due.

### Deposit And Payment Recording

The database function `core_record_reservation_payment` is implemented and covered by a rollback-safe SQL test. It is intentionally restricted to posted `deposit` and `payment` entries.

The function:

- Requires an existing eligible reservation and valid actor profile.
- Derives `buyer_id` from the reservation.
- Accepts only `deposit` or `payment`.
- Requires a positive cent amount.
- Forces `status = 'posted'`.
- Forces `balance_effect = 'decrease'`.
- Creates `core_events` and `core_audit_log` records.
- Rejects an accidental repeated posted payment when the same reservation, entry type, amount, and supplied external reference match.

The dashboard includes a local/development-only deposit/payment form on eligible reservation cards. It accepts:

- Transaction type: deposit or payment only.
- Amount received in dollars.
- Optional payment method.
- Optional external reference.
- Optional notes.

The server action converts dollar input to integer cents and calls `core_record_reservation_payment`; it does not directly insert financial ledger rows. After success, the existing reservation read panel refreshes and shows the updated ledger-derived balance.

This records local Core ledger activity only. It does not verify that external funds were transferred and does not connect a payment processor.

### Financial Adjustment Foundation And Visibility

The database function `core_record_financial_adjustment` is implemented and covered by a rollback-safe SQL test. It is intentionally separate from `core_record_reservation_payment`.

The dashboard now includes a read-only Financial Ledger Activity panel. It reads ledger rows server-side and shows recent:

- deposit
- payment
- credit
- refund
- chargeback
- fee
- admin_fee
- transport_fee
- finance_charge
- neutral adjustment

The panel distinguishes ledger rows as money received, balance-reducing credit, internal ledger exception, balance-increasing charge, or neutral adjustment. It shows safe ledger context such as amount, balance effect, reservation short ID, buyer/email, puppy, external reference, related ledger ID, status, timestamp, and reason/description without displaying raw JSON.

Event and audit activity remains separate in the Reservation Activity / Audit panel. No dashboard UI exists yet for creating financial adjustments, refunds, fees, chargebacks, credits, or neutral adjustments.

### Reservation Cancellation

The database function `core_cancel_reservation` is implemented and covered by a rollback-safe SQL test. The local/development dashboard includes a guarded cancellation action for eligible `reserved` or `pending` reservations.

Cancellation:

- does not create refunds
- does not edit ledger rows
- does not delete reservations
- does not delete puppies
- can release a puppy only when explicitly requested
- writes cancellation event/audit rows
- writes puppy-release event/audit rows only when puppy status changes

## Tests And Validation Present

The repository includes rollback-safe SQL tests for:

- Core V1 schema/view smoke behavior.
- Go-home effective read behavior.
- Controlled application approval.
- Controlled reservation creation.
- Controlled deposit/payment recording.
- Controlled financial adjustment records.
- Controlled reservation cancellation.
- Zoho API-name shaped fake intake.
- Zoho report/PDF-label shaped fake intake.

The `core_record_reservation_payment_tests.sql` test verified that:

- A posted `$500.00` test deposit decreases a `$2,000.00` balance to `$1,500.00`.
- A posted `$250.00` test payment further decreases it to `$1,250.00`.
- Ledger rows use `balance_effect = 'decrease'`.
- Event and audit rows are created.
- Invalid entry type, zero/negative amount, missing reservation, missing actor, and duplicate supplied external reference are rejected.
- Test writes roll back.

`npm run lint` passed after the current dashboard deposit/payment action was added.

The dashboard payment form was also locally verified with seeded fake data: a `$500.00` deposit was recorded for the local seeded reservation and the visible balance due changed from `$2,000.00` to `$1,500.00`.

## Current Verified Commands

From Git Bash in the repository root:

```bash
supabase db reset --local
./scripts/seed-local-core-workflow.sh
cat supabase/tests/core_v1_smoke_tests.sql | docker exec -i supabase_db_core1 psql -U postgres -d postgres -v ON_ERROR_STOP=1
cat supabase/tests/core_go_home_effective_view_tests.sql | docker exec -i supabase_db_core1 psql -U postgres -d postgres -v ON_ERROR_STOP=1
cat supabase/tests/core_application_approval_write_tool_tests.sql | docker exec -i supabase_db_core1 psql -U postgres -d postgres -v ON_ERROR_STOP=1
cat supabase/tests/core_create_reservation_write_tool_tests.sql | docker exec -i supabase_db_core1 psql -U postgres -d postgres -v ON_ERROR_STOP=1
cat supabase/tests/core_record_reservation_payment_tests.sql | docker exec -i supabase_db_core1 psql -U postgres -d postgres -v ON_ERROR_STOP=1
cat supabase/tests/core_record_financial_adjustment_tests.sql | docker exec -i supabase_db_core1 psql -U postgres -d postgres -v ON_ERROR_STOP=1
cat supabase/tests/core_cancel_reservation_tests.sql | docker exec -i supabase_db_core1 psql -U postgres -d postgres -v ON_ERROR_STOP=1
cat supabase/tests/core_zoho_application_intake_tests.sql | docker exec -i supabase_db_core1 psql -U postgres -d postgres -v ON_ERROR_STOP=1
cat supabase/tests/core_zoho_application_report_label_tests.sql | docker exec -i supabase_db_core1 psql -U postgres -d postgres -v ON_ERROR_STOP=1
npm run lint
```

Do not rerun the full command list after every small change. Run the relevant validation once after code changes or when repository/database state is unclear.

## Local Workflow Seed Helper

The repository now includes a local/development seed helper:

```text
scripts/seed-local-core-workflow.sql
scripts/seed-local-core-workflow.sh
```

This helper is not a migration and is not run automatically by `supabase db reset --local`. It exists only to repopulate fake dashboard workflow data after a local reset.

It creates deterministic, rerunnable `LOCAL-*` records for:

- `Local Approval Test Admin` actor profile, using ID `70000000-0000-0000-0000-000000000001`.
- A fake local buyer/family with `example.invalid` contact data.
- One received fake application for approval testing.
- One approved fake application for reservation testing.
- Application sections for the Latest Application Detail panel.
- Fake dam, sire, litter, one available puppy, and one reserved example puppy.
- One reserved example reservation for the Reservation Workflow Status panel.
- Local-only event and audit rows describing the seed action.

The seed deliberately does not create payment/ledger rows. Use the dashboard deposit/payment form or `core_record_reservation_payment` test path to create ledger entries so balance changes remain part of the controlled payment workflow.

Run it from Git Bash after resetting local Supabase:

```bash
supabase db reset --local
./scripts/seed-local-core-workflow.sh
```

Or run the SQL directly:

```bash
cat scripts/seed-local-core-workflow.sql | docker exec -i supabase_db_core1 psql -U postgres -d postgres -v ON_ERROR_STOP=1
```

The helper does not read `.env.local`, does not require private keys, does not connect live services, and can be safely rerun against the local database because all seeded rows use deterministic UUIDs with upsert/update behavior.

## Still Not Connected Live

- Zoho is not connected live.
- Twilio is not connected live.
- Email is not sending.
- A payment processor is not connected.
- Refunds and chargebacks are internal Core ledger records only; no processor money movement is connected.
- Financial adjustment dashboard creation UI is not implemented.
- Document generation and signature handling are not implemented.
- No production data import has happened.
- RLS is not enabled for live client exposure.
- Dashboard actions are local/development-only server-side foundations, not authenticated production staff workflows.
- Customer portal and public website replacement are not implemented.
- Kennel logging write tools are not implemented.
- Home Assistant, cameras, and smart mirror work are not connected.

## Staff Auth And Access Boundary

`docs/core/CORE_STAFF_AUTH_PLAN.md` now defines the recommended Phase 2 staff authentication and server-side authorization plan.

The first staff auth foundation is implemented:

- Supabase Auth packages are installed.
- `/login` provides a minimal staff email/password sign-in path.
- `/staff` requires an authenticated Supabase user mapped to an active `core_profiles` staff profile.
- `/` is now a non-sensitive landing page and does not display Core dashboard data.
- The staff profile lookup uses the service role server-side as a transitional bridge until RLS policies exist.
- The staff dashboard read model now requires authenticated active staff profile context before broad service-role reads run.
- Role-based dashboard read filtering is implemented. Owner/admin users keep the full current dashboard read surface. Staff users keep operational read access but do not fetch or see financial ledger activity, full audit/activity rows, phone lookup details, or the general event feed.

Dashboard approval, reservation creation, deposit/payment recording, and reservation cancellation actions now require the authenticated staff session and pass the mapped `core_profiles.id` as the RPC actor. Initial role checks are in place: owner/admin can perform all current dashboard actions; staff can approve, create reservations, and record deposits/payments, but cannot release a puppy during cancellation.

Local verification confirms `/login` works, `/staff` loads for the mapped active staff profile, and `core_audit_log` now records `actor_profile_id = 70000000-0000-0000-0000-000000000001` for at least:

- `approve_application`
- `record_reservation_payment`

Role-based read-scope behavior has also been manually verified locally using `scripts/set-local-staff-profile-access.sql`:

- `owner` active sees the full dashboard.
- `admin` active sees the full dashboard.
- `staff` active sees the operational dashboard only.
- `staff` active sees owner/admin restriction notes for sensitive panels.
- `staff` active does not fetch or display financial ledger activity, full audit/activity, phone lookup safety, or the general event feed.
- The local profile was restored to `owner` active after verification.

This is not a complete staging/production security boundary yet. Service-role reads are still transitional server-side reads, staff-visible application detail fields still need review against real Zoho content, RLS policy work remains incomplete, and selected-real-data staging remains blocked until scope is planned and approved.

## Remaining Work Before Staging Or Production

Before any staff-facing staging or production use, Core still needs deliberate security and workflow decisions:

- Unauthorized-role verification, especially staff cancellation with puppy release.
- Future authenticated actor and role checks for any new financial adjustment/go-home/kennel actions.
- Review of real Zoho application fields before staff-visible application details are used with selected real data.
- Owner approval of the selected-real-data staging plan, exact records, exact fields, staging environment, and import method.
- RLS policies and policy tests.
- Financial adjustment/refund/fee/chargeback dashboard controls, after authorization boundaries are designed.
- A reviewed approach to stronger payment idempotency before processor integration.
- Limited, owner-approved staging/import planning.
- Production-safe integration and deployment handling.

## Next Recommended Task

Review real Zoho application fields before staff-visible application details are used with selected real data, then owner-approve the exact first staging records and environment described in `docs/core/CORE_SELECTED_REAL_DATA_STAGING_PLAN.md`. Do not use production data, connect a payment processor, or expose customer/staff workflows until access control and staging boundaries are implemented and verified.

## Selected Real-Data Staging Plan

`docs/core/CORE_SELECTED_REAL_DATA_STAGING_PLAN.md` now defines the first safe staging plan for a tiny selected real-data test.

The plan recommends one or two owner-approved real application records only, with no bulk import, no live Zoho webhook, no payment data, no documents/signatures, no customer portal records, no Twilio/message records, and no live side effects.

No selected real data has been imported yet. Staging import remains blocked until the owner approves the exact records, exact fields, staging environment, import method, and verification checklist.
