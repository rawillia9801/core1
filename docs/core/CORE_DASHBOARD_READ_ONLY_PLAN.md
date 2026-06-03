# Core Read-Only Dashboard Plan
## Status Note

- Current as of this pass: historical/partially superseded planning reference.
- The original static read-only shell milestone has been surpassed by authenticated local owner/operator workspaces, but its safety constraints still apply.
- Central current truth: `CURRENT_STATUS.md` and `IMPLEMENTATION_CHECKLIST.md`.


## Purpose

The first dashboard milestone is a read-only shell. It gives the Core project a visible operating-center shape without connecting production systems or exposing write behavior.

## Current Scope

This original dashboard shell milestone is historical. The current app has moved beyond the static placeholder shell into authenticated local owner/operator workspaces backed by Core reads and controlled local/dev server actions. Keep this document as a safety reference for the read-first principle; do not use it as the current route inventory.

The original shell was intentionally static and used placeholder data that mirrored the Core read models verified by smoke tests.

It is allowed to show:

- Dashboard overview cards.
- Upcoming go-home rows.
- Reservation rows.
- Phone lookup safety examples.
- Kennel notes.
- Build-gate reminders.

It is not allowed to:

- Write to the database.
- Connect to Supabase client-side.
- Enable RLS or auth.
- Import production data.
- Connect Zoho, Twilio, email, payment processors, Home Assistant, cameras, or smart mirror features.
- Generate or send customer documents.
- Expose customer-facing portal behavior.

## Read Models To Use Later

When the shell is wired to real read-only data, likely sources are:

| Dashboard Area | Preferred Read Source |
| --- | --- |
| Reservation list | `core_reservation_summary_view` |
| Buyer overview | `core_buyer_summary_view` |
| Puppy overview | `core_puppy_summary_view` |
| Balance cards | `core_payment_balance_view` and/or approved aggregate read view |
| Go-home cards | `core_go_home_effective_view` |
| Phone safety | `core_phone_lookup_view` and `core_phone_lookup_summary_view` |
| Today feed | `core_dashboard_today_view` |

## Acceptance Criteria For This Shell

- The app renders a dashboard-like layout instead of the placeholder landing page.
- The screen clearly labels itself as read-only.
- The screen clearly states that placeholder data is being used.
- Navigation includes the major future Core areas.
- Go-home rows demonstrate `group_default`, `individual_override`, and `ungrouped_detail` concepts.
- Phone lookup examples demonstrate unambiguous and ambiguous safety states.
- No Supabase client, environment variable, production credential, or integration is added.
- `npm run lint` passes.

## Superseded Next Step After This Shell

This next-step list was completed or superseded by later authenticated local workspaces and controlled local/dev actions. The current next tasks live in `CURRENT_STATUS.md` and `IMPLEMENTATION_CHECKLIST.md`.

The original next step was not write tools. It was deciding how to load read-only data safely:

1. Server-side read-only Supabase access pattern.
2. Environment variable strategy.
3. RLS/access policy plan.
4. Dashboard view coverage review.
5. Only then replace placeholder data with controlled read-only data.
