# AGENTS.md

## Project Purpose

Cherolee Core is the unified operating system for Southwest Virginia Chihuahua. It will consolidate records and workflows currently scattered across systems such as Zoho, Supabase, Twilio, email, portals, and future kennel integrations into one trustworthy system of record.

Develop this repository in small, reviewable tasks. Do not attempt to build the whole product in one pass.

## Core V1 Scope

Core V1 is the data and operating foundation:

- Canonical Supabase Postgres schema under the `core_` namespace.
- Buyer, family, application, dog, litter, puppy, reservation, money, document, messaging, kennel-log, event, audit, integration-event, and future tool-safety foundations.
- Dashboard-friendly read views.
- A phone lookup read view that can later support Twilio.
- Documentation in `docs/core/`.

## What Not To Build Yet

Do not implement these without a later explicit task and appropriate approvals:

- Full admin dashboard, Puppy Portal, or public website rebuild.
- Core Chat capable of direct writes or autonomous actions.
- Live payment processor, Twilio production routing, real email/SMS sending, or Zoho retirement.
- Automatic buyer approval, refunds, price changes, or waitlist overrides.
- Home Assistant device control, camera AI, smart mirror, voice control, or medical/health decisions from sensor data.

## Naming Conventions

- Prefix canonical Cherolee tables and views with `core_`.
- Use plural snake_case table names, for example `core_buyers` and `core_financial_ledger`.
- Treat generic or `bp_` tables as legacy/migration sources, not as new canonical targets.
- Prefer TypeScript for application code where applicable.
- Put SQL migrations in `supabase/migrations/`.
- Put Core architecture and operating docs in `docs/core/`.

## Canonical Ownership Rules

- A buyer is a person/customer record. A buyer does not own price, deposit, balance, or payment plan values.
- A litter is the birth group. A puppy is an individual puppy in a litter.
- A reservation is the official buyer plus puppy transaction and owns contract pricing/go-home context.
- The financial ledger is the official money record. Calculate balances from reservation totals and ledger entries.
- A `core_event` is an operational notes/event timeline record.
- A `core_audit_log` records every future write action.
- A `core_integration_event` stores inbound or outbound integration payloads before processing.

## Database Rules

- Use Supabase Postgres and UUID primary keys with `gen_random_uuid()`.
- Use `created_at timestamptz not null default now()` and `updated_at` for editable records.
- Use `amount_cents integer` for money and `currency text` where relevant; never use floating point money.
- Use `jsonb` for metadata, external payloads, and flexible structured data.
- Prefer text statuses for the baseline unless an established project enum convention is introduced later.
- Use nullable foreign keys when imported history may be incomplete.
- Add indexes for common lookups, especially phone, email, statuses, reservations, ledger records, integrations, and creation timestamps.
- Add non-destructive migrations only. Do not assume legacy records are complete or clean.
- Do not store credit card PAN or CVV.

## Audit And Integration Rules

- All future server-side write tools must validate input and append a `core_audit_log` entry describing actor, action, entity, old/new data where available, and request context where available.
- AI/chat may request validated server-side tools in the future; it must not write directly to the database.
- Store external webhook/sync events in `core_integration_events` before business processing.
- Integration processing must be idempotent and tolerate duplicate delivery.
- Never invent financial, puppy, buyer, or family facts to fill incomplete records.

## Safety Rules

- Never drop, rename, truncate, overwrite, or destructively modify legacy tables without explicit owner approval.
- Never wire production data, customer messaging, payments, portal visibility, devices, or automations without explicit owner approval.
- Do not migrate production records without a documented map, validation plan, and approval.
- Enforce private-data access server-side; do not depend only on browser filtering.
- Add RLS/policy work deliberately in a later security task once roles and access paths are defined.

## Testing Expectations

- Migrations must run cleanly on an empty Supabase/Postgres database.
- New views must be queryable after their migration is applied.
- Prefer a migration dry run or local database reset before claiming schema behavior.
- For future APIs/tools, validate inputs, return structured errors, audit writes, and test missing/partial records.
- For future UI, implement read-only workflows before write-enabled operations and include loading, empty, and error handling.

## Task Size

Keep work deliberately small. Good follow-up tasks include creating a migration validation harness, mapping a single legacy table family, adding a read-only buyer screen, or implementing one audited server-side tool. Avoid broad tasks such as replacing Zoho or building all of Core at once.

## Legacy Table Rule

Existing duplicates such as `buyers`, `bp_buyers`, `puppies`, `bp_puppies`, `litters`, `buyer_payments`, `bp_payments`, `buyer_ledger`, or `payments` are migration sources only unless the owner explicitly directs otherwise. Never delete legacy tables without explicit owner approval.

## Build Order

Follow `docs/core/CORE_BUILD_ORDER.md`. Core V1 begins with inventory and schema baseline; read-only usage comes before validated and audited write paths; integrations and smart-home concepts remain later phases.
