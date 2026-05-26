# Cherolee Core Current Status

## Purpose

This file is the current checkpoint for the Core V1 foundation work. It exists so future work starts from verified repository state instead of scattered chat history.

## Current Source Of Truth

The active repository is:

```text
rawillia9801/core1
```

The active branch is:

```text
main
```

This repository is the current implementation source of truth for Core V1 foundation work. Older PDFs, chat notes, and plans are reference material only unless their contents are pulled into this repository.

## Verified Foundation

The following foundation items are present in the repository and have been locally verified:

- Next.js TypeScript placeholder app exists and renders locally.
- Supabase local database containers can run for the project.
- Core V1 baseline migration applies locally.
- Financial ledger `balance_effect` correction applies locally.
- Go-home group/cardinality correction applies locally.
- Go-home explicit override/precedence correction applies locally.
- Phone lookup ambiguity read model applies locally.
- Go-home effective read model applies locally.
- `supabase/tests/core_v1_smoke_tests.sql` passes and rolls back.
- `supabase/tests/core_go_home_effective_view_tests.sql` passes and rolls back.
- `npm run lint` passes.

## Current Verified Commands

From Git Bash in the repository root:

```bash
supabase db reset --local
cat supabase/tests/core_v1_smoke_tests.sql | docker exec -i supabase_db_core1 psql -U postgres -d postgres -v ON_ERROR_STOP=1
cat supabase/tests/core_go_home_effective_view_tests.sql | docker exec -i supabase_db_core1 psql -U postgres -d postgres -v ON_ERROR_STOP=1
npm run lint
```

If `supabase db reset --local` applies migrations and then returns a post-reset 502 while restarting services, check the database container with:

```bash
docker ps --format "table {{.Names}}\t{{.Status}}"
```

If `supabase_db_core1` is healthy, run the smoke tests instead of repeatedly resetting.

## Completed Core V1 Foundation Work

### Project Foundation

- `AGENTS.md` defines project purpose, scope, and guardrails.
- `README.md` defines local setup, quality checks, documentation, and intentionally deferred work.
- `docs/core/` contains canonical Core documentation.
- `supabase/migrations/` contains additive SQL migrations.
- `supabase/tests/` contains transaction-wrapped test scripts.

### Canonical Schema Baseline

The baseline migration creates the initial Core V1 canonical object family, including buyers, families, applications, dogs, litters, puppies, reservations, financial records, documents, communications, events, audit logs, integration events, and future tool-safety foundations.

### Financial Ledger Correction

`core_financial_ledger` now separates:

- `entry_type`: what kind of transaction occurred.
- `balance_effect`: how the transaction affects amount owed.
- `amount_cents`: non-negative magnitude.

`core_payment_balance_view` calculates balances from reservation contract totals and posted ledger entries using explicit `balance_effect` rules.

### Go-Home Model Correction

Core now supports:

- One buyer/family with multiple puppies.
- One reservation per puppy transaction.
- Zero or one current go-home detail per reservation.
- Optional shared `core_go_home_groups` for multiple puppies going home together.
- Explicit individual override fields for grouped details.
- `core_go_home_effective_view` for resolved go-home appointment values.

### Phone Lookup Safety

Phone lookup now supports ambiguity detection. Ambiguous phone matches must not automatically expose buyer, puppy, payment, or go-home context. Ambiguous matches require verification or staff routing before sensitive details are disclosed.

## What Is Not Production Ready

The repository is still foundation work only. It is not a finished CRM, portal, payment system, or phone system.

Not yet production-ready:

- RLS policies are not enabled for live client exposure.
- No production data has been imported.
- No live Zoho, Twilio, email, payment, Home Assistant, camera, or smart mirror integrations are connected.
- No authenticated admin dashboard has been built.
- No Puppy Portal has been built.
- No customer-facing website replacement has been built.
- No write tools have been approved or exposed.
- No live document generation or signature workflow exists.

## Next Recommended Work

The next safe milestone is read-only visibility:

1. Add dashboard-specific read model documentation and acceptance gates.
2. Build a read-only admin dashboard shell against existing read models or temporary safe mock data.
3. Keep all writes, RLS, integrations, imports, and customer-facing behavior deferred until the read-only dashboard is stable.

## Hard Rule Going Forward

Do not create new tables unless the task explicitly names them and explains why they belong in the Core model.

Do not connect production integrations or import live records without a written, reviewed migration or integration plan.
