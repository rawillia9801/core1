# Core V1 Canonical Schema

## Purpose

Core V1 defines a new canonical Supabase Postgres model for Cherolee Core. It does not import production records, replace existing workflows, or delete any existing table. Zoho is historical reference only and is not a migration source, import source, bridge, compatibility path, sync target, writeback target, or planned dependency.

The initial SQL baseline lives in `supabase/migrations/20260526140000_core_v1_baseline.sql`. Required Core V1 corrections and controlled write foundations live in the subsequent migrations, including `20260526150000_core_financial_ledger_balance_effect.sql`, `20260526240000_core_record_reservation_payment_write_tool.sql`, `20260526250000_core_cancel_reservation_write_tool.sql`, and `20260526260000_core_record_financial_adjustment_write_tool.sql`.

## Modeling Rules

- Buyers represent people/customer contacts, not transactions.
- Families group people who may share applications, reservations, documents, and portal access.
- Puppies are individual dogs; litters are their birth groups.
- Reservations represent the official buyer plus puppy transaction.
- Reservation contract totals plus financial ledger entries determine payment balance.
- Events store operational timeline activity; audit logs store write accountability.
- Integration events are received or created before external payload processing.
- Records are intentionally nullable where imports or early operational facts may be incomplete.

## Canonical Tables

| Table | Purpose |
| --- | --- |
| `core_profiles` | Internal or authenticated-user profile metadata and role context. |
| `core_families` | Household/customer family group for portal and operational context. |
| `core_family_members` | Links profiles and/or buyers to a family with a relationship role. |
| `core_applications` | Application submitted by a family or prospective buyer. |
| `core_application_sections` | Flexible section-level application responses and review state. |
| `core_buyers` | Canonical person/customer contact record. |
| `core_buyer_preferences` | Desired puppy traits, timing, and preference metadata. |
| `core_dogs` | Breeding/adult dog records, including potential dams and sires. |
| `core_litters` | Birth-group record linked optionally to dam and sire. |
| `core_puppies` | Individual puppy, optionally belonging to a litter. |
| `core_reservations` | Official buyer/family and puppy transaction with contract totals. |
| `core_go_home_details` | Current pickup/delivery/go-home detail for one reservation and its puppy. |
| `core_go_home_groups` | Optional shared pickup/delivery event grouping multiple reservation details. |
| `core_financial_ledger` | Official immutable-style money activity source for a reservation/buyer. |
| `core_financing_plans` | Optional payment plan for a reservation. |
| `core_financing_installments` | Scheduled or fulfilled installment rows for a financing plan. |
| `core_receipts` | Receipt metadata issued from ledger/reservation activity. |
| `core_documents` | Document record linked to relevant family/buyer/reservation/puppy. |
| `core_document_versions` | Stored versions, hashes, status, and signature metadata for a document. |
| `core_conversations` | Conversation container for communication with a buyer/family. |
| `core_messages` | Inbound/outbound messages belonging to a conversation. |
| `core_phone_calls` | Phone interaction records and Twilio-ready metadata. |
| `core_message_templates` | Reusable communication templates, not automatic sends. |
| `core_notifications` | Notification records awaiting or tracking controlled delivery. |
| `core_puppy_events` | Puppy-specific operational timeline events. |
| `core_weight_logs` | Timestamped puppy weight observations. |
| `core_feeding_logs` | Timestamped feeding observations. |
| `core_medication_logs` | Timestamped administered/planned medication observations. |
| `core_events` | General operational timeline across entities. |
| `core_audit_log` | Append-only intent for future validated write action records. |
| `core_integration_events` | Inbound/outbound external event ledger and processing state. |
| `core_threads` | Future Core Chat thread container; no direct-write behavior. |
| `core_thread_messages` | Messages within a future Core Chat thread. |
| `core_tool_runs` | Future validated tool execution record and outcome. |
| `core_pending_actions` | Proposed actions requiring validation/approval before execution. |

## Major Relationships

| From | To | Relationship |
| --- | --- | --- |
| `core_family_members` | `core_families`, `core_profiles`, `core_buyers` | A family member can be connected to a login profile, buyer contact, or both. |
| `core_applications` | `core_families`, `core_buyers` | Applications can be accepted before every association is known. |
| `core_application_sections` | `core_applications` | Application response data is sectioned and flexible. |
| `core_litters` | `core_dogs` | Dam and sire links remain optional for incomplete imports. |
| `core_puppies` | `core_litters` | A puppy usually belongs to one litter, but imports may resolve this later. |
| `core_reservations` | `core_buyers`, `core_families`, `core_puppies`, `core_applications` | Transaction record tying customer and puppy context together. |
| `core_go_home_details` | `core_reservations`, `core_go_home_groups` | Each reservation has zero or one current fulfillment/pickup detail, optionally grouped with others. |
| `core_go_home_groups` | `core_families`, `core_buyers` | A shared pickup/delivery event may contain details for multiple reservations. |
| `core_financial_ledger` | `core_reservations`, `core_buyers` | Money records can be captured while incomplete links are reconciled. |
| `core_financing_plans` | `core_reservations` | Optional structured schedule for the transaction. |
| `core_documents` | Core business records | Documents may attach to whichever canonical context is known. |
| Communication tables | `core_buyers`, `core_families`, `core_conversations` | Contact history supports future phone/message lookup. |
| Operational log tables | `core_puppies`, `core_events` | Puppy care records also support timeline/event presentation later. |
| Safety tables | Business records and external systems | Audit, integration, tool, and pending-action tables support controlled future operations. |

## Financial Source Of Truth

`core_reservations.contract_total_cents` is the contractual total. `core_financial_ledger.amount_cents` is a non-negative money magnitude. Each ledger row records both:

- `entry_type`: What kind of transaction is this?
- `balance_effect`: How does this affect the amount owed?

Allowed `balance_effect` values are `increase`, `decrease`, and `neutral`:

| Balance effect | Meaning | Examples |
| --- | --- | --- |
| `decrease` | Reduces amount owed | `deposit`, `payment`, `credit` |
| `increase` | Adds to amount owed | `fee`, `admin_fee`, `transport_fee`, `finance_charge`, `refund`, `chargeback` |
| `neutral` | Does not affect balance | An informational or explicitly neutral `adjustment` |

Adjustments must be assigned an explicit `balance_effect`; their entry type alone never determines the effect. The balance view calculates posted entries as:

```text
balance_due_cents =
  contract_total_cents
  + sum(posted increase amount_cents)
  - sum(posted decrease amount_cents)
```

Deposits, payments, refunds, credits, fees, and adjustments must never be treated as fields owned by `core_buyers`.

The financial correction migration assigns no `balance_effect` default for future inserts: each new ledger write must state its effect explicitly. For any pre-correction local/development rows, recognized entry types are backfilled according to the table above and unrecognized rows are conservatively marked `neutral` for review.

`core_record_reservation_payment(...)` is the first controlled financial write RPC. It accepts only `deposit` or `payment`, requires a positive cent amount and a valid actor/reservation, derives `buyer_id` from the reservation, and inserts a `posted` ledger entry with `balance_effect = 'decrease'`. The caller cannot select a different status or balance effect. It also writes `core_events` and `core_audit_log` records.

When an external reference is supplied, this RPC rejects a repeated posted row for the same reservation, entry type, amount, and external reference while holding the reservation row lock. This is local/development accidental-repeat protection, not a completed payment-processor idempotency or reconciliation design.

`core_record_financial_adjustment(...)` is separate from deposit/payment recording. It supports controlled local/development financial exceptions only: `credit`, `refund`, `chargeback`, `fee`, `admin_fee`, `transport_fee`, `finance_charge`, and neutral `adjustment`. It inserts additive posted ledger rows, maps `balance_effect` internally, writes event/audit rows, and never edits or deletes prior ledger rows.

The adjustment RPC maps `credit` to `decrease`; `refund`, `chargeback`, `fee`, `admin_fee`, `transport_fee`, and `finance_charge` to `increase`; and `adjustment` to `neutral`. Neutral adjustment currently permits a zero-cent informational row because the ledger constraint allows non-negative amounts. All balance-changing adjustment types require a positive cent amount.

Refunds and chargebacks recorded through this function are internal ledger records only. They do not contact a payment processor, move money, send receipts, send email, or create documents. Stronger idempotency, reconciliation, and processor webhook behavior remain later work. Function-level duplicate detection rejects the same posted reservation, entry type, amount, and external reference when an external reference is supplied.

## Reservation Cancellation Rule

`core_cancel_reservation(...)` is the controlled Core V1 cancellation foundation. It accepts only active `reserved` or `pending` reservations, requires a valid actor profile and cancellation reason, and updates the reservation status to `cancelled`.

Cancellation preserves `reserved_at`, `contract_total_cents`, `deposit_required_cents`, and all `core_financial_ledger` rows. It does not imply a refund, payment correction, fee, chargeback, document, customer message, or payment-processor action. Those remain separate future workflows.

Puppy release is explicit. If `p_release_puppy = false`, the linked puppy status is not changed. If `p_release_puppy = true`, the function may set the linked puppy to `available`, `unavailable`, or `hold`, but only when no other active reservation exists for that puppy. If another active reservation exists, the cancellation still records normally and the puppy remains unchanged.

The function writes a `reservation_cancelled` `core_events` row and `cancel_reservation` `core_audit_log` row. It writes `puppy_released` event/audit rows only when the puppy status actually changes.

## Core-Native Application Entry

`core_create_application_manual(...)` is the Core-native owner/operator manual application creation foundation. It is the active intake direction.

The function creates or updates the buyer, reuses an existing family membership when available, creates a family/member link when needed, creates one `core_applications` row with status `received`, creates grouped `core_application_sections`, and writes `core_events` plus `core_audit_log`.

Only active `owner` and `admin` profiles can call this RPC. Staff-created UI remains a later task at `/staff/applications/new`; public `/apply` remains deferred.

This function does not approve applications, create reservations, collect payments, create ledger rows, queue or send email, create documents, invite portal users, or write back to any external system.

Zoho-shaped `core_ingest_zoho_application(...)` is a cancelled-direction historical artifact only. Do not extend it, build tests around it, or use it as an active import/dry-run/compatibility path.

## Notification Queue Foundation

`core_queue_notification(...)` is the controlled notification queue foundation for future transactional email workflows.

It creates `core_notifications` rows with status `queued`, stores recipient/template/preview/context in the notification payload, and writes `core_events` plus `core_audit_log`.

Only the `email` channel is allowed in this first foundation. The RPC requires an active actor profile and a valid recipient email address. Notification types are allowlisted for application, reservation, payment, cancellation, go-home, document, and staff alert workflows.

This function does not send email, connect Resend or any provider, write provider IDs, mark anything delivered, create provider delivery attempts, or expose customer portal messaging. Future actions may queue notifications only after templates and safety rules are approved.

## Go-Home Cardinality

- A buyer or family may have many puppies and many reservations.
- Each `core_reservations` row represents one buyer/family plus one puppy transaction.
- Each reservation has zero or one current `core_go_home_details` row.
- A `core_go_home_groups` row optionally represents one shared pickup/delivery event; multiple reservation details may link to the same group when puppies go home together.
- For grouped details, `core_go_home_groups` is the source of truth for shared appointment schedule, pickup/delivery type, address, contact phone, and shared trip status.
- `core_go_home_details` is the source of truth for puppy-specific readiness/status, checklist status, balance-clearance workflow state, and individual notes. `balance_cleared_status` is operational context only; financial truth remains ledger-derived.
- A grouped detail may differ from shared appointment data only through `has_individual_override = true` with an `override_reason` and the applicable `individual_scheduled_at`, `individual_window_start`, `individual_window_end`, or `individual_location_notes` values.
- Existing `method`, `planned_at`, and `location` fields remain available for ungrouped details only; they stay empty on grouped details so they cannot silently conflict with the shared group.
- Core V1 does not retain go-home change history as duplicate detail rows. Future detail changes must be recorded through `core_events` and `core_audit_log`.
- Because incomplete migration records remain allowed, a detail with an unresolved/null reservation link is not subject to the one-per-reservation uniqueness rule until it is matched.

## Views

| View | Purpose |
| --- | --- |
| `core_payment_balance_view` | One row per reservation, with posted activity magnitude and a balance calculated through explicit `balance_effect`. |
| `core_reservation_summary_view` | Reservation detail with buyer, puppy, family, go-home, and calculated payment context. |
| `core_buyer_summary_view` | Buyer-level overview of applications, reservations, puppies, and open balance. |
| `core_puppy_summary_view` | Puppy-level operational summary including litter, current reservation, and balance context. |
| `core_phone_lookup_view` | Normalized phone matching surface for future Twilio/Core lookup, with customer and active reservation context. |
| `core_phone_lookup_matches_view` | Server/staff-oriented distinct buyer or family-linked profile match rows for normalized phone ambiguity counting, without transaction context. |
| `core_phone_lookup_summary_view` | One safe routing/verification row per normalized phone, including ambiguity status and matched IDs for authorized server/staff use. |
| `core_dashboard_today_view` | Dated operational activity feed for today's applications, go-home appointments, ledger activity, documents, calls, notifications, puppy events, and integration failures. |

`core_phone_lookup_view` is read-only infrastructure only. When a normalized phone has more than one buyer match, it marks the result ambiguous and suppresses buyer/family/application/reservation/puppy/payment/go-home context until a later authorized verification or staff-routing process succeeds. It does not enable Twilio routing or send messages.

## Legacy Migration Notes

- This baseline creates only `core_` canonical objects and does not drop or alter legacy tables.
- Existing tables such as `buyers`, `bp_buyers`, `puppies`, `bp_puppies`, `litters`, or payment tables are not assumed authoritative.
- Zoho-derived objects are historical reference only and are not migration sources.
- A later owner-approved data review task should define source precedence, normalization rules, duplicates, validation checks, rollback/hold steps, and owner approval before any production records are staged in Core.
- Nullable relationships are deliberate so incomplete source records can be staged without fabricating relationships.

## Deliberately Deferred

RLS policies, authenticated UI, live webhook handlers, live phone routing, payment processor connections, AI/tool writes, imports, automatic communications, and smart-home/camera integrations are outside this baseline.
