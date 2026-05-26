# Core Application Intake Mapping

## Purpose

This document maps the current Zoho Puppy Application fields into the Core V1 data model. It is a planning and implementation guide for a later import/webhook endpoint.

This mapping is based on the Zoho Applications module field list provided from the live Zoho setup.

## Current Source

Current form source:

```text
Zoho Forms / Zoho CRM Puppy Application
```

Known public form URL reference:

```text
https://forms.swvachihuahua.com/southwestvirginiachihuahua/form/PuppyApplication/formperma/MxCOxyG77E3yShC2GCnwbjiMu1z3vqR8Gql1nug9gTY
```

The URL is a reference only. Core should not depend on screen scraping this form. A later integration should use an approved Zoho webhook, Zoho API export, or controlled CSV/import process.

## Core Intake Targets

A Zoho application can map into several Core tables:

| Core Target | Purpose |
| --- | --- |
| `core_applications` | Application header/status/source/review metadata. |
| `core_application_sections` | Flexible application answers grouped by topic. |
| `core_buyers` | Applicant/contact identity. |
| `core_families` | Household/family grouping. |
| `core_family_members` | Relationship between buyer/profile and household. |
| `core_events` | Operational timeline event such as application received. |
| `core_audit_log` | Accountability for future validated imports or write actions. |
| `core_notifications` | Optional queued email/message records; no sending by default. |

## Field Mapping

| Zoho Field Label | Zoho API Name | Zoho Type | Core Target | Mapping Notes |
| --- | --- | --- | --- | --- |
| Applicant Name | `Applicant_Name` | Single Line | `core_buyers.first_name`, `core_buyers.last_name`, `core_applications.metadata` | Split only if safe; preserve original full value in metadata. |
| Application Approved Email Sent | `Application_Approved_Email_Sent` | Boolean | `core_applications.metadata`, optional `core_notifications` | Historical flag only; does not prove Core sent email. |
| Application ID | `Application_ID` | Auto Number | `core_applications.external_reference` | Preserve Zoho auto-number for dedupe/import trace. |
| Application Image | `Record_Image` | Application Image | `core_applications.metadata` | Do not import file/image until storage rules exist. |
| Application Name | `Name` | Single Line | `core_applications.metadata`, display/search field later | Preserve exact Zoho value. |
| Application Owner | `Owner` | Lookup | `core_applications.metadata` | Map to Core profile only after staff identity mapping exists. |
| Application Received Email Sent | `Application_Received_Email_Sent` | Boolean | `core_applications.metadata`, optional `core_notifications` | Historical flag only. |
| Application Review Status | `Application_Review_Status` | Pick List | `core_applications.status` | Needs controlled status normalization. |
| Approval Notes | `Approval_Notes` | Multi Line | `core_applications.decision_notes` or `core_application_sections` | Use decision_notes only for final review notes; preserve raw text. |
| Approved Date | `Approved_Date` | Date | `core_applications.reviewed_at` | If status is approved, convert date to timestamp carefully. |
| Budget Range | `Budget_Range` | Pick List | `core_application_sections` | Preference/application answer, not buyer master data. |
| Buyer | `Created_Buyers` | Lookup | `core_applications.buyer_id`, `core_buyers.external_reference` | Requires Zoho buyer-to-Core buyer matching. |
| Color Preference | `Color_Preference` | Multiselect | `core_buyer_preferences` or `core_application_sections` | Prefer application_sections until preference model is finalized. |
| Connected To | `Connected_To__s` | MultiModuleLookup | `core_applications.metadata` | Preserve raw relationship links. Do not resolve automatically yet. |
| Created By | `Created_By` | Single Line | `core_applications.metadata` | Historical source metadata. |
| Declarations Signed | `Declarations_Signed` | Multi Line | `core_application_sections` | Store as declaration/application answer. |
| Desired Adoption Date | `Desired_Adoption_Date` | Date | `core_application_sections` | Preference/application answer. |
| E-Signature File | `E_Signature_File` | File Upload | `core_documents` later, metadata for now | Do not import file until storage/document rules exist. |
| Email | `Email` | Email | `core_buyers.email`, `core_buyers.email_normalized` | Normalize for matching; preserve original. |
| Email Opt Out | `Email_Opt_Out` | Boolean | `core_buyers.metadata`, future communication preferences | Do not send if true. |
| Follow-Up Date | `Follow_Up_Date` | Date | `core_applications.metadata`, future task/notification | Could become a staff task later. |
| Follow-Up Needed | `Follow_Up_Needed` | Boolean | `core_applications.metadata`, future task/notification | Do not auto-message yet. |
| Has Other Pets | `Has_Other_Pets` | Boolean | `core_application_sections` | Household/fit answer. |
| Interest Type | `Interest_Type` | Pick List | `core_application_sections` | Application answer. |
| Linked Deal | `Linked_Deal` | Lookup | `core_applications.metadata` | Preserve Zoho link; map to Core reservation only after migration review. |
| Modified By | `Modified_By` | Single Line | `core_applications.metadata` | Historical source metadata. |
| Other Pets Details | `Other_Pets_Details` | Multi Line | `core_application_sections` | Household/fit answer. |
| Phone | `Phone` | Phone | `core_buyers.phone`, `core_buyers.phone_normalized` | Normalize for phone lookup safety. |
| Preferred Coat Type | `Preferred_Coat_Type` | Pick List | `core_application_sections` or future preferences | Application answer first. |
| Preferred Gender | `Preferred_Gender` | Pick List | `core_application_sections` or future preferences | Application answer first. |
| Review Notes | `Review_Notes` | Multi Line | `core_applications.metadata`, `core_application_sections` | Internal review notes; not customer-visible by default. |
| Secondary Email | `Secondary_Email` | Email | `core_buyers.metadata` or future related contact | Do not overwrite primary email. |
| Source Form | `Source_Form` | Pick List | `core_applications.source` | Use as source identifier. |
| Status | `Status` | Pick List | `core_applications.status` | Needs normalization with Application Review Status. |
| Tag | `Tag` | Single Line | `core_applications.metadata` | Preserve raw tags. |

## Suggested Core Status Normalization

Zoho has both `Application_Review_Status` and `Status`. Core should not blindly trust both as separate truth fields.

Suggested normalized `core_applications.status` values:

| Core Status | Meaning |
| --- | --- |
| `received` | Application was submitted/imported and has not been reviewed. |
| `needs_review` | Staff review or follow-up is required. |
| `approved` | Application has been approved by a controlled workflow or trusted historical import. |
| `declined` | Application was declined. |
| `withdrawn` | Applicant withdrew or became inactive. |
| `archived` | Historical/import-only record not part of active workflow. |

Raw Zoho status fields should still be preserved in `core_applications.metadata` during import.

## Application Sections

Most flexible form answers should go into `core_application_sections`, not new columns.

Suggested sections:

| Section Key | Fields |
| --- | --- |
| `applicant_contact` | Applicant Name, Email, Secondary Email, Phone, Email Opt Out. |
| `puppy_preferences` | Interest Type, Preferred Gender, Preferred Coat Type, Color Preference, Desired Adoption Date, Budget Range. |
| `household_fit` | Has Other Pets, Other Pets Details. |
| `declarations` | Declarations Signed, E-Signature File reference. |
| `review` | Application Review Status, Approval Notes, Approved Date, Follow-Up Needed, Follow-Up Date, Review Notes. |
| `zoho_metadata` | Application ID, Application Name, Owner, Created By, Modified By, Connected To, Linked Deal, Status, Tag, email-sent flags. |

## Future Intake Flow

A later approved intake workflow should follow this order:

1. Receive Zoho webhook/API/export payload.
2. Validate source and payload shape.
3. Normalize email and phone.
4. Match or create `core_buyers` using careful dedupe rules.
5. Match or create `core_families` when household data is available.
6. Create or update `core_applications` using Zoho `Application_ID` as external reference.
7. Store form answers in `core_application_sections`.
8. Write `core_events` with `event_type = application_received` or `application_imported`.
9. Write `core_audit_log` for the import/write action.
10. Optionally queue a received notification, without sending anything automatically.

## Dedupe Rules Needed Before Live Import

Before live imports, Core needs written rules for:

- Email match.
- Phone match.
- Buyer lookup from Zoho `Created_Buyers`.
- Family/household grouping.
- Duplicate application submissions.
- Conflicts between Zoho Status and Application Review Status.
- Whether a historical approved Zoho application should call the approval workflow or be imported as historical state.

## Not Automated Yet

This mapping does not enable:

- Live Zoho webhook.
- Live Zoho API pull.
- File import.
- E-signature import.
- Email sending.
- Automatic approval.
- Automatic reservation creation.
- Customer portal access.
- Production data import.

## Next Safe Implementation Step

Create a local-only import function or script for one fake Zoho application payload that writes:

- one buyer,
- one family,
- one application,
- application sections,
- one event,
- one audit log,

inside a rollback-safe smoke test.

Do not connect live Zoho until the fake-payload path is validated.
