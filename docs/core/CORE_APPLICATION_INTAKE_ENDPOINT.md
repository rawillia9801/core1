# Historical Application Intake Endpoint
## Status Note

- Current as of this pass: historical/reference only.
- Reflects cancelled Zoho-shaped local experiment history, not active code direction or a future import path.
- Central current truth: `CURRENT_STATUS.md`; Core-native intake direction lives in `CORE_NATIVE_APPLICATION_ENTRY_PLAN.md`.


## Purpose

This document is historical reference for a cancelled Zoho-shaped local intake experiment. It is not an active Core path.

Zoho One has been cancelled. This endpoint must not be treated as an import source, bridge, compatibility workflow, dry-run import helper, sync target, writeback target, dependency check, future dependency, or planned operational workflow.

Endpoint:

```text
POST /api/intake/zoho-application
```

The endpoint calls:

```text
public.core_ingest_zoho_application(p_payload jsonb, p_actor_profile_id uuid)
```

## Current Scope

No current Core work should build on this endpoint.

Historical tests used fake Zoho-shaped API-name or report/PDF-label payloads only to understand old data shape.

It does not:

- Connect live Zoho.
- Import production data.
- Approve applications.
- Create reservations.
- Send email.
- Invite customers to a portal.
- Enable RLS.
- Expose application records through GET.

## Historical Local Endpoint Test

The guarded local/development endpoint was previously tested with a fake Zoho-shaped report-label payload. This is historical only and should not be used as the active intake lane.

Verified response characteristics:

```text
ok: true
application_status: received
section_count: 7
```

The successful local response also returned generated Core IDs for:

- buyer
- family
- application
- event
- audit log

Important: this endpoint test writes records to the local development database. Unlike the SQL smoke tests, the endpoint request is not wrapped in a rollback transaction. Use fake data only and reset or clean the local database when needed.

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

### Local Helper Script

From Git Bash, with the local development app running, use the fake-payload helper:

```bash
./scripts/test-local-intake-endpoint.sh
```

The script posted fake report-label data only to `http://localhost:3000/api/intake/zoho-application` using external reference `LOCAL-SCRIPT-ENDPOINT-TEST-001`. Do not extend this into active Zoho tooling.

```bash
CORE_INTAKE_SECRET=your-local-test-secret ./scripts/test-local-intake-endpoint.sh
```

The script does not contain or read a Supabase service role key, and it does not connect to live Zoho. Endpoint tests write fake records to the local development database. Do not use this as an active import or dry-run import pattern.

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

## Local Data Cleanup

Because endpoint tests write to the local development database, use one of these cleanup options when needed:

```bash
supabase db reset --local
```

or delete the specific fake endpoint-test records manually in local development only after reviewing related buyer, family, application, section, event, and audit rows.

Do not create production cleanup scripts from local test data patterns.

## Production Safety Notes

Do not use this endpoint with live Zoho. Do not build live Zoho webhook handling, Zoho sync, Zoho dry-run imports, Zoho writeback, Zoho compatibility workflows, or Zoho dependency checks.

Future application intake should be Core-native unless a separate owner-approved non-Zoho source is explicitly defined.
