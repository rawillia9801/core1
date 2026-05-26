# Core Read-Only Dashboard Plan

## Purpose

The first dashboard milestone is a read-only shell. It gives the Core project a visible operating-center shape without connecting production systems or exposing write behavior.

## Current Scope

This dashboard shell is intentionally static and uses placeholder data that mirrors the Core read models already verified by smoke tests.

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

## Next Step After This Shell

The next step is not write tools. The next step is deciding how to load read-only data safely:

1. Server-side read-only Supabase access pattern.
2. Environment variable strategy.
3. RLS/access policy plan.
4. Dashboard view coverage review.
5. Only then replace placeholder data with controlled read-only data.
