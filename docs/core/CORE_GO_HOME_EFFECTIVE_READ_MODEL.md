# Core Go-Home Effective Read Model
## Status Note

- Current as of this pass: active technical reference.
- Reflects implemented local/dev go-home read/write foundation and effective read model; no documents, messages, transport, payments, or external integrations are triggered.
- Central current truth: `CURRENT_STATUS.md` and this file for go-home read model behavior.


## Purpose

`core_go_home_effective_view` is the preferred read source for go-home appointment data in Core V1.

Raw storage tables remain separate:

- `core_go_home_groups` stores shared pickup/delivery appointment data.
- `core_go_home_details` stores one reservation-level go-home detail, puppy-specific readiness, checklist state, notes, and explicit exceptions.

Owner/operator dashboards, portal screens, phone lookup, and future go-home screens should read resolved appointment values from `core_go_home_effective_view` instead of choosing between raw group/detail fields themselves.

## Source Rules

For grouped details:

- Group fields provide the default pickup/delivery type, scheduled time, window, address, contact phone, and shared trip status.
- If `has_individual_override = true`, individual override fields may replace the scheduled time/window/location note where provided.
- `override_reason` explains why that reservation differs from the shared group.

For ungrouped details:

- Existing detail-level `method`, `planned_at`, `location`, and `status` fields remain the appointment source.

## Schedule Source Values

`source_of_schedule` identifies where the effective appointment values came from:

| Value | Meaning |
| --- | --- |
| `group_default` | The reservation detail uses the shared group appointment. |
| `individual_override` | The reservation detail is grouped but has an explicit documented exception. |
| `ungrouped_detail` | The reservation detail is not linked to a group and uses its own legacy/current appointment fields. |

## Financial Boundary

`balance_cleared_status` is operational readiness only. It can help the owner/operator decide whether a puppy is ready to go home, but it never replaces financial truth.

Financial truth remains:

- `core_financial_ledger`
- `core_payment_balance_view`

## Updated Read Surfaces

The effective read model feeds the go-home fields used by:

- `core_reservation_summary_view`
- `core_buyer_summary_view`
- `core_puppy_summary_view`
- `core_dashboard_today_view`
- `/staff/reservations/[reservationId]`

`core_phone_lookup_view` already reads reservation context through the reservation/buyer summaries. Ambiguous phone lookups still redact buyer, puppy, payment, and go-home context until a later owner/operator verification workflow is built.

## Not Built Here

The reservation detail page reads the effective model for internal readiness only. It does not schedule transport, send reminders, create documents, change payment state, update public listings, or contact customers.

This read-model foundation does not build:

- customer-facing UI
- additional write tools beyond the separately documented go-home detail/checklist foundations
- go-home history tables
- production RLS
- Twilio integration
- Zoho tooling, which is cancelled and historical-reference only
- customer messaging
- Home Assistant/camera/smart mirror features
- production data staging or migration
