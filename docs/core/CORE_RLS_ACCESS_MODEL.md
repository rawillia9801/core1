# Core V1 RLS And Access Model
## Status Note

- Current as of this pass: first-wave RLS foundation implemented locally.
- Reflects implemented internal helper functions and first-wave policies plus remaining blocked production/customer access work.
- Central current truth: `CURRENT_STATUS.md` and this file for planned access rules.


## Status

Core V1 now has a first-wave internal Row Level Security (RLS) foundation for the clearest and highest-risk owner/operator tables. This is not full production/customer access security. It is a deny-by-default foundation for authenticated internal profile checks and accidental anonymous/customer exposure prevention.

Server-side service-role access remains a transitional backend pattern for existing owner/operator pages and controlled RPCs. It bypasses RLS by design and must receive a future production review before selected real-data staging or live production use.

No customer-facing RLS policies are active. No public/anonymous Core table access is active.

## Roles

### Owner / Admin

Business owner or explicitly authorized administrator.

- Read: all Core operational records, subject to document/secrets handling.
- Write: business records through validated server-side workflows.
- Sensitive actions: approvals, pricing/contract decisions, refunds, customer communications, data migrations, and access management require explicit approved tooling and audit records.
- No direct client-side blanket database mutation access should be assumed.

### Staff

Authorized operational staff supporting buyers, puppies, reservations, and kennel records.

- Read: operational buyer/family/application, dog/litter/puppy, reservation, approved financial summary, document metadata, communication, and kennel/event context needed for work.
- Write: limited operational records through validated server-side workflows, such as notes or approved kennel logs.
- Restricted: refunding, contract total changes, integration configuration, access/role administration, destructive cleanup, and bulk migrations.

### Buyer / Family

Authenticated customer or household participant tied to a `core_family_members` record.

- Read later: their own family-facing application state, reservation/puppy information, approved go-home details, approved payment balance/receipt context, approved private documents, and their own conversation context.
- Write later: narrowly scoped portal submissions or message requests through validated endpoints.
- Never read: unrelated families, internal notes, audit logs, integration payloads, staff-only metadata, or global operational views.

### Future Transport Partner

External fulfillment partner, not included in Core V1 application behavior.

- Read later: only explicitly assigned go-home/delivery details and minimum needed contact context.
- Write later: assignment status or delivery checkpoints through controlled workflows.
- Never read: application review, broad financial history, audit logs, unrelated customer records, or documents outside assignment needs.

### Future Vet Partner

External care partner, not included in Core V1 application behavior.

- Read later: only assigned puppy identity and approved health/care documentation needed for the engagement.
- Write later: approved records/documents through controlled upload or review flows.
- Never read: buyer finances, broad customer contact history, internal audit/integration records, or unrelated puppies.

### Public / Anonymous

Unauthenticated website visitor or external public consumer.

- Read later: only a separate public-safe published listing/read model if created and explicitly approved.
- Write: none directly to Core business tables.
- Core V1 provides no anonymous-readable table or view and no public puppy listing schema.

## Table Group Access Direction

This table remains the broad direction. The first implemented wave is listed below it.

| Table group | Owner/Admin | Staff | Buyer/Family | Future Partners | Public |
| --- | --- | --- | --- | --- | --- |
| Profiles and role membership | Full approved management | Own profile / limited lookup | Own profile only | Own partner identity only | None |
| Families, buyers, applications | Read/write via tools | Operational read; scoped writes | Own family/application subset | Minimum assigned context only | None |
| Dogs, litters, puppies | Read/write via tools | Operational read/write via tools | Reserved/approved puppy subset | Assigned puppy subset | Separate published view only later |
| Reservations and go-home details | Read/write via tools | Operational read; approved updates | Own reservation/go-home subset | Assigned delivery subset only | None |
| Financial ledger, plans, receipts | Read/write through sensitive tools | Approved read; restricted writes | Own approved balance/receipts | None | None |
| Documents and versions | Read/write through secure tools | Approved operational scope | Own approved documents | Assigned approved documents only | None |
| Conversations, messages, calls, notifications | Read/write through communication tools | Scoped operational access | Own participant context later | None unless assigned | None |
| Puppy care logs and events | Read/write through tools | Operational read/write through tools | Approved puppy-facing subset later | Vet assignment subset later | None |
| `core_events` | Full operational access | Scoped operational access | Only explicitly family-visible events later | None unless assigned | None |
| `core_audit_log`, `core_integration_events` | Restricted administrative read | Limited troubleshooting read later | None | None | None |
| Threads, tool runs, pending actions | Administrative/tool-service scope | Only assigned workflows later | None unless separate user-safe design | None | None |

## First-Wave Implemented RLS

Migration:

```text
supabase/migrations/20260526400000_core_rls_foundation.sql
```

Helper functions:

| Function | Current behavior |
| --- | --- |
| `core_current_profile_id()` | Returns the active `core_profiles.id` mapped to `auth.uid()`, or null. |
| `core_current_profile_role()` | Returns the active mapped internal role, or null. |
| `core_current_profile_is_owner_admin()` | True for active `owner` or `admin`. |
| `core_current_profile_is_staff_or_above()` | True for active `owner`, `admin`, or `staff`. |
| `core_can_read_sensitive_owner_data()` | True for active `owner` or `admin`; used by sensitive read policies. |

Tables with RLS enabled in the first wave:

| Table | First-wave direct authenticated access |
| --- | --- |
| `core_profiles` | Owner/admin can read all profiles; staff can read only its own active profile. |
| `core_families` | Owner/admin/staff can read operational family rows. |
| `core_buyers` | Owner/admin/staff can read operational buyer rows. |
| `core_family_members` | Owner/admin/staff can read operational family-member rows. |
| `core_applications` | Owner/admin/staff can read application rows. |
| `core_application_sections` | Owner/admin/staff can read application answer sections. |
| `core_reservations` | Owner/admin/staff can read operational reservation rows. |
| `core_financial_ledger` | Owner/admin can read; staff is denied direct sensitive ledger rows. |
| `core_events` | Owner/admin can read; staff is denied the general event feed. |
| `core_audit_log` | Owner/admin can read; staff is denied direct audit rows. |
| `core_proposed_actions` | Owner/admin can read; staff is denied proposal rows. |

Authenticated direct table writes are not granted in this first wave. Write policies exist for owner/admin internal profiles where appropriate, but table privileges grant only `select` to `authenticated`; existing writes must continue through backend service-role server actions and controlled RPCs that validate actor profile IDs and write event/audit records.

Anonymous access is explicitly revoked for the first-wave tables. Buyer/family, portal, partner, and public policies remain blocked until separately designed and tested.

## Service-Role-Only Actions

These operations should require validated server-side code using service-role credentials or an equivalently privileged backend path, never direct browser writes:

- Writing `core_audit_log` and ingesting/processing `core_integration_events`.
- Financial ledger entries, contract totals, financing changes, receipts, refunds, chargebacks, credits, and pricing decisions.
- Application approval/denial and any customer eligibility decision.
- Document storage/version publication or access grants.
- Sending communications or recording provider webhooks.
- Creating tool runs, processing pending actions, or executing any future AI-requested action.
- Migration/import operations and legacy reconciliation.
- Role/membership administration or other privileged access changes.

All approved write tools must validate authorization and payloads, and append an audit record.

## Deferred Helper Functions

Later policy waves may need additional stable helper functions after customer/partner access rules are finalized:

| Function | Intended purpose |
| --- | --- |
| `is_admin()` | Confirm the authenticated profile has owner/admin authority. |
| `is_staff()` | Confirm the authenticated profile is authorized operational staff. |
| `is_family_member(family_id)` | Confirm the caller belongs to the requested family. |
| `can_view_puppy(puppy_id)` | Confirm the caller may view a puppy through staff access, reservation/family linkage, partner assignment, or later public publication. |
| `is_conversation_participant(conversation_id)` | Confirm access to a communication thread without exposing unrelated conversations. |

Any helper function implementation must guard against recursive policy evaluation, use the authenticated user-to-profile mapping consistently, and be tested for cross-family isolation.

## Remaining Security Work

The next security tasks should finish remaining table coverage and policy tests, then review service-role server access before staging or production. Customer-facing access remains blocked until portal identity, family membership, field visibility, document visibility, and public-safe read models are explicitly designed and tested.
