# Historical Application Field Reference

## Purpose

This document is historical reference for old Zoho Puppy Application field shapes. It is not a planning guide for a later import, webhook, bridge, compatibility workflow, sync, writeback, or dependency.

Zoho One has been cancelled. Zoho must not be treated as an import source, migration source, bridge, compatibility workflow, dry-run import lane, sync target, writeback target, planned dependency, future dependency, or active part of Core.

## Historical Source

Current form source:

```text
Zoho Forms / Zoho CRM Puppy Application
```

Known public form URL reference:

```text
https://forms.swvachihuahua.com/southwestvirginiachihuahua/form/PuppyApplication/formperma/MxCOxyG77E3yShC2GCnwbjiMu1z3vqR8Gql1nug9gTY
```

The URL is a historical reference only. Core should not depend on screen scraping this form, Zoho webhooks, Zoho APIs, Zoho exports, Zoho imports, or Zoho-shaped compatibility workflows.

## Core Reference Targets

Old application information may help understand the kinds of data Core-native application records should capture:

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

| Historical Field Label | Historical API Name | Historical Type | Possible Core Concept | Notes |
| --- | --- | --- | --- | --- |
| Applicant Name | `Applicant_Name` | Single Line | `core_buyers.first_name`, `core_buyers.last_name`, `core_applications.metadata` | Split only if safe; preserve original full value in metadata. |
| Application Approved Email Sent | `Application_Approved_Email_Sent` | Boolean | `core_applications.metadata`, optional `core_notifications` | Historical flag only; does not prove Core sent email. |
| Application ID | `Application_ID` | Auto Number | `core_applications.external_reference` | Historical reference only; do not build Zoho dedupe/import tooling. |
| Application Image | `Record_Image` | Application Image | `core_applications.metadata` | Do not import file/image until storage rules exist. |
| Application Name | `Name` | Single Line | `core_applications.metadata`, display/search field later | Preserve exact Zoho value. |
| Application Owner | `Owner` | Lookup | `core_applications.metadata` | Map to Core profile only after staff identity mapping exists. |
| Application Received Email Sent | `Application_Received_Email_Sent` | Boolean | `core_applications.metadata`, optional `core_notifications` | Historical flag only. |
| Application Review Status | `Application_Review_Status` | Pick List | `core_applications.status` | Needs controlled status normalization. |
| Approval Notes | `Approval_Notes` | Multi Line | `core_applications.decision_notes` or `core_application_sections` | Use decision_notes only for final review notes; preserve raw text. |
| Approved Date | `Approved_Date` | Date | `core_applications.reviewed_at` | If status is approved, convert date to timestamp carefully. |
| Budget Range | `Budget_Range` | Pick List | `core_application_sections` | Preference/application answer, not buyer master data. |
| Buyer | `Created_Buyers` | Lookup | `core_applications.buyer_id`, `core_buyers.external_reference` | Historical relationship hint only; do not build Zoho buyer matching. |
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
| Linked Deal | `Linked_Deal` | Lookup | `core_applications.metadata` | Historical relationship hint only; do not build Zoho reservation mapping. |
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

Historical Zoho records had both `Application_Review_Status` and `Status`. Core should not blindly treat old external statuses as authoritative.

Suggested normalized `core_applications.status` values:

| Core Status | Meaning |
| --- | --- |
| `received` | Application was submitted into Core and has not been reviewed. |
| `needs_review` | Owner/operator review or follow-up is required. |
| `approved` | Application has been approved by a controlled Core workflow. |
| `declined` | Application was declined. |
| `withdrawn` | Applicant withdrew or became inactive. |
| `archived` | Historical or inactive record not part of active workflow. |

Raw historical status fields may be kept only as owner-approved reference metadata if manually entered into Core. Do not build a Zoho import path.

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
| `historical_metadata` | Application ID, Application Name, Owner, Created By, Modified By, Connected To, Linked Deal, Status, Tag, email-sent flags. |

## Cancelled Intake Flow

Do not build a Zoho intake flow. The previous idea of receiving Zoho webhook/API/export payloads is cancelled.

Future intake should be Core-native unless a separate non-Zoho source is explicitly approved.

## Dedupe Rules For Core-Native Records

Core still needs written rules for:

- Email match.
- Phone match.
- Family/household grouping.
- Duplicate application submissions.

## Not Automated Yet

This historical reference does not enable:

- Zoho webhook.
- Zoho API pull.
- Zoho import or dry-run import.
- Zoho sync or writeback.
- File import from Zoho.
- E-signature import from Zoho.
- Email sending.
- Automatic approval.
- Automatic reservation creation.
- Customer portal access.
- Production data import.

## Next Safe Implementation Step

Continue Core-native owner/operator application workflows. Do not create Zoho import functions, Zoho-shaped dry-run scripts, Zoho compatibility tests, Zoho sync, or Zoho writeback.
