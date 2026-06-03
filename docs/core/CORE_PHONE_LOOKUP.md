# Core Phone Lookup
## Status Note

- Current as of this pass: active technical reference.
- Reflects implemented local/dev phone lookup read models and owner/admin read-only workspace; Twilio, routing, verification automation, and public disclosure are not connected.
- Central current truth: `CURRENT_STATUS.md` and this file for lookup safety.


## Purpose

Core V1 provides database read models for identifying a buyer/family when a call or message arrives. It does not connect Twilio, route calls, perform verification, send messages, or reveal customer data publicly.

## Lookup Design

Phone numbers on `core_buyers` are stored with both the entered value and a normalized lookup value. Future validated ingestion should normalize phone values consistently, preferably to E.164 format where possible.

The views are:

- `core_phone_lookup_matches_view`: one row per distinct buyer or family-linked profile match for a normalized phone, with IDs for authorized owner/operator or server-side ambiguity handling and no puppy/payment/go-home context.
- `core_phone_lookup_summary_view`: one safe decision row per normalized phone, including `match_count`, `is_ambiguous`, `verification_required`, and `staff_routing_recommended`.
- `core_phone_lookup_view`: preserves the future single-match context read shape while exposing ambiguity status. It returns buyer/application/reservation/payment/go-home context only when one buyer match exists.

The read model intentionally uses nullable relationships because staged historical records or newly received customer records may be incomplete.

## Ambiguity Rule

- A match is a distinct `core_buyers` contact record using normalized primary/alternate phone data, or a family-linked `core_profiles` record not already represented by its linked buyer. A profile linked to its buyer and sharing that phone does not create a false extra match. `core_families` has no direct phone column in Core V1.
- When exactly one contact match exists, `core_phone_lookup_view` may return normal read context available for that buyer/profile to a future authorized server-side flow.
- When more than one contact match exists, `is_ambiguous`, `verification_required`, and `staff_routing_recommended` are true.
- For an ambiguous phone, `core_phone_lookup_view` returns null for buyer identity, family, application, reservation, puppy, balance, currency, and go-home context.
- Matched buyer/family IDs in the summary/match views are for future authorized owner/operator or server-side use only, not customer or public disclosure.

## Future Request Flow

```text
Approved phone provider webhook
-> persist payload as core_integration_events
-> validate and normalize caller phone
-> query core_phone_lookup_summary_view/core_phone_lookup_view
-> if ambiguous, route to Cristy or a future approved helper, or request approved additional verification
-> if unambiguous, return only approved lookup context
-> audit any later write action
```

## Ambiguity And Privacy Rules

- A phone match must not silently choose between duplicate contacts.
- Ambiguous results require verification or owner/operator routing before exposing transaction details.
- Phone providers and clients should receive only the minimum information approved for that workflow.
- Live routing and outbound/inbound messaging require separate approval and security work.

## Not Implemented

There is no webhook handler, Twilio credential, production routing, phone normalization service, customer message sending, or automatic action in Core V1.
