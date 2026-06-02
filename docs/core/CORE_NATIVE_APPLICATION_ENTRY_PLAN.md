# Core Native Application Entry Plan

## Purpose

Core does not rely on Zoho for puppy application intake. Zoho One has been cancelled; Zoho is historical reference only.

This plan defines the first Core-native application entry path:

- Build private staff/owner application entry first.
- Add a future public application form later.
- Treat Zoho-shaped intake artifacts as historical cancelled-direction leftovers only.
- Do not connect email sending, Zoho tooling, customer portal access, documents, payments, or public intake yet.

The first private route is implemented:

```text
/staff/applications/new
```

The future public route is:

```text
/apply
```

## Current Intake Foundation

The existing database function is:

```text
public.core_ingest_zoho_application(p_payload jsonb, p_actor_profile_id uuid)
```

It currently:

- Accepts Zoho API-name payloads.
- Accepts Zoho report/PDF-label payloads.
- Creates or updates `core_buyers`.
- Creates or updates `core_families`.
- Creates `core_family_members` for applicant/family linkage.
- Creates or updates `core_applications`.
- Creates `core_application_sections`.
- Writes a `core_events` application import record.
- Writes a `core_audit_log` intake record.
- Returns `buyer_id`, `family_id`, `application_id`, `application_status`, `section_count`, `event_id`, and `audit_log_id`.

Core-generic behavior already present:

- Applicant contact normalization.
- Buyer/family/application creation.
- Flexible section storage.
- Status normalization.
- Event and audit records.
- Rollback-safe testability.

Historical Zoho-specific behavior still present:

- Source field names such as `Application_ID`, `Applicant_Name`, `Application_Review_Status`, and report labels.
- Source metadata keys that preserve Zoho values.
- Source labels such as `zoho_puppy_application_intake`.
- Dedupe logic tied to Zoho application IDs.
- Compatibility assumptions for exported Zoho forms and reports.

Do not keep extending `core_ingest_zoho_application`. It is not the main future intake path, not an import/compatibility function for active work, and not a dependency. Old Zoho-shaped values may be historical reference only.

## Recommended First Route

The protected staff route exists:

```text
/staff/applications/new
```

Initial access:

- Protected by the existing staff auth boundary.
- Owner/admin only at first unless the owner approves staff entry.
- No public access.
- No customer portal account creation.
- No email sending.
- No Zoho writeback.
- No documents, signatures, payments, or reservations.

This route creates a received application that can then flow through the existing review, approval, reservation, payment, cancellation, activity, and read-scope workflows.

## Minimum Viable Application Fields

The first private entry form should stay small.

Recommended fields:

- Applicant full name.
- Email.
- Phone.
- Preferred contact method.
- Interest type.
- Coat preference.
- Gender preference.
- Color preference.
- Other pets / household basics.
- Readiness notes.
- Payment preference text only.
- Terms acknowledgement.
- Optional staff notes.

Do not include:

- File uploads.
- Signatures.
- Payment collection.
- Documents.
- Portal invitation.
- Automatic reservation creation.
- Automatic approval.
- Email sending.

## Validation Rules

Server-side validation should require:

- Applicant full name.
- At least one contact method: email or phone.
- Valid email format when email is supplied.
- Normalized phone when phone is supplied.
- Bounded string lengths for all free-text fields.
- Allowed values for controlled preferences.
- Terms acknowledgement before submission.

Server-side validation should reject:

- Files or document payloads.
- Payment card data.
- Payment processor references.
- Portal account creation requests.
- Unbounded JSON sections.
- Unknown section keys unless explicitly allowed.

Money must not be collected through this workflow. Payment preference is text context only and must not create a ledger row.

## Recommended Database RPC

The Core-native database RPC now exists for the private owner/operator path rather than using the Zoho-shaped function.

Recommended name:

```text
public.core_create_application_manual
```

Alternative future public-oriented name:

```text
public.core_submit_application
```

Design-level signature:

```text
public.core_create_application_manual(
  p_actor_profile_id uuid,
  p_applicant_full_name text,
  p_email text default null,
  p_phone text default null,
  p_preferred_contact_method text default null,
  p_interest_type text default null,
  p_coat_preference text default null,
  p_gender_preference text default null,
  p_color_preference text default null,
  p_household_notes text default null,
  p_readiness_notes text default null,
  p_payment_preference text default null,
  p_terms_acknowledged boolean default false,
  p_staff_notes text default null
)
```

Implemented behavior:

- Validate required fields.
- Validate actor profile for staff-created entry.
- Create or update buyer.
- Create or update family.
- Create one `core_applications` row with status `received`.
- Create application sections for contact, preferences, household/readiness, payment preference, terms, and staff notes.
- Write `core_events`.
- Write `core_audit_log`.
- Return `buyer_id`, `family_id`, `application_id`, `status`, `section_count`, `event_id`, and `audit_log_id`.
- Reuse an existing buyer by normalized email or phone when a safe match already exists.

The function should not:

- Approve the application.
- Create a reservation.
- Create a ledger row.
- Queue or send email.
- Create documents.
- Write to Zoho.

## Server Action Flow

The future server action should:

1. Require an authenticated staff profile.
2. Require owner/admin role initially.
3. Validate form fields server-side.
4. Call `core_create_application_manual`.
5. Pass the authenticated staff profile ID as `p_actor_profile_id`.
6. Revalidate `/staff`.
7. Redirect to a concise success/error result.

It should not:

- Send email.
- Queue notification until notification queue rules exist.
- Build Zoho import, sync, bridge, compatibility, dependency-check, or writeback tooling.
- Import production data.
- Create customer portal access.

## Future Public Apply Route

The public route should be designed later:

```text
/apply
```

Later requirements:

- Spam protection.
- Rate limiting.
- Privacy and consent text.
- Safe duplicate detection.
- Confirmation screen.
- Abuse logging.
- No account required at first.
- No customer portal creation at submission time.
- Notification queue before any customer email.
- Owner/admin review before approval.

Public intake should probably call a related Core-native RPC, such as `core_submit_application`, with `actor_type = public` or system context. It should not reuse owner/operator-only actor assumptions.

## Relationship To Email Notifications

Application creation may eventually create an `application_received` notification request.

Do not send email directly from the application form action.

Recommended sequence:

1. Create application.
2. Write event/audit.
3. Later, optionally queue a notification record.
4. Later, preview rendered email content.
5. Later, send only through an approved provider workflow.

Email sending remains blocked until notification queue behavior, template approval, preview handling, environment flags, and provider safety rules are designed.

Resend or another provider should not be connected as part of Core-native application entry.

## Tests Needed Later

The first rollback-safe SQL test exists at:

```text
supabase/tests/core_create_application_manual_tests.sql
```

It validates:

- Required field validation.
- Email-only contact path.
- Existing buyer/family matching behavior.
- Section count and section content.
- Event and audit creation.
- Invalid actor rejection.
- Terms acknowledgement rejection.
- Owner/admin-only actor restriction.
- No email/notification side effect.
- No Zoho dependency, import path, compatibility path, sync, or writeback.

Manual or app-level checklist:

- Owner/admin can open the private form.
- Staff role is blocked unless approved.
- Successful entry appears in the application dashboard.
- Application detail sections are readable.
- Fake local Core-native entry can move through approval, reservation creation, and deposit/payment recording.
- Ledger-derived balance decreases after the recorded deposit/payment.
- No email is sent.
- No reservation/payment/document/customer portal record is created.

## Implementation Order

Recommended order:

1. Add database RPC migration and rollback-safe SQL test for `core_create_application_manual`. Done.
2. Add private `/staff/applications/new` form and server action. Done.
3. Confirm read visibility in the existing owner/operator dashboard under `/staff`. Done.
4. Manually verify Core-native application entry through approval, reservation creation, and deposit/payment ledger balance decrease. Done with fake local data.
5. Design notification queue/email preview behavior or continue controlled go-home workflow.
6. Add local/staging email preview only.
7. Add public `/apply` later.
8. Add email provider integration later.

## Still Blocked

The following remain blocked until later explicit tasks:

- Public `/apply`.
- Email sending.
- Resend or any email provider connection.
- Zoho connection, import, sync, bridge, compatibility path, dependency check, or writeback.
- Real-data import.
- Customer portal.
- Documents/signatures.
- Payment processor.
- Automatic application approval.
- Automatic reservation creation.
- RLS/live client exposure.

## Current Status

The database RPC foundation is implemented and tested.

The private `/staff/applications/new` UI and server action are implemented for owner/admin staff users. It calls `core_create_application_manual`, redirects back to `/staff?application=created` on success, and does not send email, queue notifications, call Zoho, create payments, create documents, or create portal access.

The private Core-native application workflow has been manually verified end-to-end with fake local data:

- Create Core-native application in `/staff/applications/new`.
- Confirm the application appears in `/staff`.
- Approve the application.
- Create a reservation from that application.
- Record a deposit/payment.
- Confirm the ledger-derived balance decreases.

This proves manual application entry no longer requires Zoho for the local owner/operator workflow. It does not prove public intake, email sending, payment processor integration, documents, customer portal behavior, or production readiness.

Zoho-shaped intake is historical only and must not be used for compatibility, import, dry-run support, dependency checks, or new Core-native application intake.
