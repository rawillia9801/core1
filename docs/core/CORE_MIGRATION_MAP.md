# Core Migration Map
## Status Note

- Current as of this pass: reference/planning document.
- Reflects canonical destination mapping and safe future migration principles; no production migration or Zoho import path is active.
- Central current truth: `CURRENT_STATUS.md`; this file owns future mapping constraints.


## Purpose

This document defines the safe shape of a later legacy-data migration effort. Core V1 creates canonical destinations only; it does not connect to or import production records.

## Canonical Destinations

| Business Concept | Canonical Destination | Possible Legacy Sources To Inventory |
| --- | --- | --- |
| Customer/person | `core_buyers` | Core-native records, `buyers`, `bp_buyers`; Zoho notes are historical reference only |
| Family/household | `core_families`, `core_family_members` | Portal household or contact associations |
| Application | `core_applications`, `core_application_sections` | Core-native application records; Zoho field notes are historical reference only |
| Adult dog/litter/puppy | `core_dogs`, `core_litters`, `core_puppies` | `dogs`, `litters`, `puppies`, `bp_*` variants |
| Official puppy transaction | `core_reservations` | Core-native reservation records after reconciliation |
| Money | `core_financial_ledger` | Payment, deposit, refund, ledger exports |
| Documents | `core_documents`, `core_document_versions` | Contract and file metadata systems |
| Communications | `core_conversations`, `core_messages`, `core_phone_calls` | Twilio/email/CRM communication exports |

Possible legacy source names are examples to inventory, not permission to read, alter, or import production data.

## Mapping Procedure For A Later Task

1. Inventory source objects, record counts, identifiers, timestamps, and ownership.
2. Define source precedence for duplicates and conflict resolution rules.
3. Define normalization rules for email, phone, statuses, amounts, and external identifiers.
4. Produce an owner-reviewed mapping report with unmatched, incomplete, and duplicate records.
5. Validate reservation-to-ledger reconciliation and sample balances with the owner.
6. Receive explicit approval before staging any production records in Core.
7. Import repeatably with audit/integration tracking and post-import validation.

## Migration Cautions

- Do not drop or overwrite legacy tables.
- Do not fabricate missing puppy, buyer, payment, or reservation links.
- Keep unresolved links nullable and report them for manual review.
- Do not treat buyer records as the owner of financial totals.
- Do not enable live notifications, payment actions, or portal exposure during import.

## Deferred Work

Actual source queries, credentials, production data movement, reconciliation scripts, rollback/hold procedures, and retirement decisions belong to later approved tasks.
