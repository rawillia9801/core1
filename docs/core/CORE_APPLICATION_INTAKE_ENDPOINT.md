# Core Application Intake Endpoint

## Purpose

The guarded intake endpoint is the first app-layer bridge between Zoho-shaped application payloads and the Core database intake function.

Endpoint:

```text
POST /api/intake/zoho-application
```

The endpoint calls:

```text
public.core_ingest_zoho_application(p_payload jsonb, p_actor_profile_id uuid)
```

## Current Scope

This endpoint is for local/development validation first.

It can accept either:

- Zoho API-name payloads, or
- Zoho report/PDF-label payloads.

It does not:

- Connect live Zoho automatically.
- Import production data by itself.
- Approve applications.
- Create reservations.
- Send email.
- Invite customers to a portal.
- Enable RLS.
- Expose application records through GET.

## Required Environment Variables

```text
CORE_INTAKE_SECRET=replace-with-local-test-secret
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=local-service-role-key
CORE_INTAKE_ACTOR_PROFILE_ID=optional-profile-uuid
```

`CORE_INTAKE_SECRET` is required. Requests must include it using either:

```text
x-core-intake-secret: <secret>
```

or:

```text
Authorization: Bearer <secret>
```

`SUPABASE_SERVICE_ROLE_KEY` must be server-side only. Do not expose it in client components, browser code, screenshots, or public logs.

## Local Test Example

Start the app:

```bash
npm run dev
```

Example request:

```bash
curl -X POST http://localhost:3000/api/intake/zoho-application \
  -H "content-type: application/json" \
  -H "x-core-intake-secret: replace-with-local-test-secret" \
  -d '{
    "Form": "Puppy Application",
    "Southwest Virginia Chihuahua Application ID": "LOCAL-REPORT-TEST-001",
    "First and Last Name": "Local Report Applicant",
    "Email Address": "local.report.applicant@example.invalid",
    "Phone Number": "+1 (276) 555-0701",
    "Preferred Contact Method": "Email",
    "Preferred Coat Type": "No Preference",
    "Preferred Gender": "No Preference",
    "Color Preference": "Gold",
    "Interest Type": "Current Puppy",
    "Do You Have Other Pets?": "No",
    "Payment Preference": "Deposit and remainder due at meet",
    "Terms and Conditions": "Agreed",
    "CRM Status": "New Record - Record added"
  }'
```

Expected response shape:

```json
{
  "ok": true,
  "result": [
    {
      "buyer_id": "...",
      "family_id": "...",
      "application_id": "...",
      "application_status": "received",
      "section_count": 7,
      "event_id": "...",
      "audit_log_id": "..."
    }
  ]
}
```

## Failure Behavior

Missing or wrong secret returns `401`.

Non-object JSON returns `400`.

Database/function errors return a non-200 response with a generic intake failure message.

## Production Safety Notes

Before using this endpoint with live Zoho:

1. Confirm the exact Zoho webhook payload shape.
2. Confirm the secret delivery mechanism.
3. Add rate limiting or deployment-level protection.
4. Verify RLS/access model and service role boundaries.
5. Decide whether imported historical approved applications should remain historical or call the formal approval workflow.
6. Add monitoring for failed intake attempts.
7. Add a dead-letter/retry strategy for webhook failures.

Do not connect the live Zoho form directly until a test payload has been posted successfully in local/dev.
