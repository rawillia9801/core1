# Core Selected Real Data Field Review Template
## Status Note

- Current as of this pass: blocked staging template.
- Reflects future owner-approved selected-real-data field review only; no production data import or selected-real-data staging has occurred.
- Central current truth: `CORE_STAGING_READINESS_CHECKLIST.md` and `CORE_SELECTED_REAL_DATA_STAGING_PLAN.md`.


## Purpose

Use this template before staging one or two real application records in Core staging.

The template helps decide:

- Which source fields are safe to import.
- Which fields are staff-visible.
- Which fields are owner/admin-only.
- Which fields should be excluded, deferred, transformed, or redacted.

This template does not approve bulk import, Zoho, live integrations, customer portal visibility, payment processing, document generation, or production use.

No selected real data should be imported until the exact records and exact fields are reviewed and owner-approved.

## Review Instructions

Review one source field at a time.

For each field:

1. Identify the source system and source field name.
2. Describe the field meaning in plain language.
3. Record only the example value category, not an actual private value.
4. Identify the Core destination table/field or application section.
5. State the business purpose for importing it.
6. Assign a sensitivity level.
7. Decide whether to import, exclude, defer, or transform.
8. Decide role visibility.
9. Note any redaction or transformation needed.
10. Require owner approval before selected-record staging.

If field meaning, sensitivity, or visibility is unclear, stop and do not import that field.

## Field Review Table Template

Copy this table for the selected application export.

| Source system | Source field name | Example value category, not actual private value | Core destination table/field or section | Business purpose | Sensitivity level | Import decision | Staff visibility | Redaction or transformation needed | Notes / owner approval |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Historical reference | Example: Applicant Name | Person name | `core_buyers` / application section | Identify applicant | Moderate | Stage through Core-native path | Owner/operator visible if approved | Normalize name fields | Owner approval required |
| Historical reference | Example: Household Notes | Free-text household details | Application section | Application review | High | Defer or transform | Owner/operator only by default | Remove unnecessary private details | Owner approval required |

Allowed sensitivity levels:

- `low`
- `moderate`
- `high`
- `restricted`

Allowed import decisions:

- `import`
- `exclude`
- `defer`
- `transform`

Allowed visibility decisions:

- `owner/admin only`
- `staff visible`
- `hidden`

## Suggested Sensitivity Categories

### Low

Examples:

- Application status.
- Preferred contact method.
- Puppy preference basics.
- Source/reference labels.
- Terms agreement status.

### Moderate

Examples:

- Applicant name.
- Email.
- Phone.
- General household/pet information.
- General application timing or preference answers.

### High

Examples:

- Address.
- Family or household details.
- Financial preference.
- Payment-plan interest.
- Detailed personal notes.
- Detailed schedule or work/life context.

### Restricted

Examples:

- Medical or disability details if present.
- Highly personal hardship information.
- Government IDs if ever present.
- Internal staff notes.
- Private financial details.
- Anything that could cause harm, embarrassment, or improper disclosure if shown too broadly.

## Recommended Default Visibility

### Owner/Admin Only By Default

Use owner/admin-only visibility for:

- Financial/payment preference fields.
- Sensitive household details.
- Private notes.
- Phone lookup details.
- Internal review notes.
- Cancellation or risk notes.
- Anything unclear.

### Staff Visible Only After Approval

Staff visibility may be approved for:

- Applicant name.
- Basic contact/email.
- Application status.
- Puppy preferences.
- Safe review answers needed for application handling.
- Non-sensitive application sections required for operational review.

### Excluded Or Deferred By Default

Exclude or defer:

- Unnecessary sensitive notes.
- Documents/signatures.
- Payment processor records.
- Message/SMS/call logs.
- Customer portal data.
- Anything not needed for the first staging test.

## First Staging Field Set Recommendation

Start with the smallest practical field set:

- Applicant name.
- Email.
- Phone, only if approved.
- Application status.
- Source/reference.
- Submitted date.
- Puppy preference basics.
- Terms agreement status.
- Selected non-sensitive application sections.

Explicitly defer:

- Documents.
- Signatures.
- Payments.
- Payment processor references.
- Messages.
- SMS/call logs.
- Internal notes.
- Highly sensitive household details unless owner-approved.

The first staging test should prove safe display and role boundaries, not maximum data coverage.

## Approval Checklist

Before import:

- [ ] Exact records are selected.
- [ ] Exact fields are reviewed.
- [ ] Staff-visible fields are approved.
- [ ] Owner/admin-only fields are identified.
- [ ] Excluded fields are documented.
- [ ] Fields requiring redaction/transformation are documented.
- [ ] Staging environment is verified.
- [ ] Rollback plan is ready.
- [ ] No side effects are enabled.
- [ ] Owner approval is recorded for the field set.

## Hard Stop Conditions

Stop if:

- Field meaning is unclear.
- Sensitive value is unnecessary.
- Staff visibility is uncertain.
- Owner approval is missing.
- Import would trigger live integration.
- Data source contains unexpected files, documents, payment records, message records, SMS logs, call logs, or unrelated modules.
- A real payload would need to be committed to Git.
- A secret appears in an export, screenshot, docs, chat, or client-side code.

## Current Status

This template exists as a planning and review tool.

No selected real data has been imported yet.

Real-data import remains blocked until exact records and exact fields are reviewed and owner-approved.
