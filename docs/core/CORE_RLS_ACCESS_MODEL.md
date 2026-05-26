# Core V1 RLS And Access Model

## Status

Core V1 establishes canonical tables and read models, but it does not enable production Row Level Security (RLS) policies yet. This is intentional: authenticated identities, family membership onboarding, backend integration paths, and public-safe fields must be agreed before policies can be safely enforced.

Until RLS is implemented and tested, do not expose these `public` schema tables or views to browser/client access in a live Supabase project. Server-side service-role access must also remain limited to explicitly approved tools and integrations.

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

This table is the proposed policy direction, not implemented RLS.

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

## Future Helper Functions

Policy implementation may need stable security-definer helper functions after identity and access rules are finalized:

| Function | Intended purpose |
| --- | --- |
| `is_admin()` | Confirm the authenticated profile has owner/admin authority. |
| `is_staff()` | Confirm the authenticated profile is authorized operational staff. |
| `is_family_member(family_id)` | Confirm the caller belongs to the requested family. |
| `can_view_puppy(puppy_id)` | Confirm the caller may view a puppy through staff access, reservation/family linkage, partner assignment, or later public publication. |
| `is_conversation_participant(conversation_id)` | Confirm access to a communication thread without exposing unrelated conversations. |

Any helper function implementation must guard against recursive policy evaluation, use the authenticated user-to-profile mapping consistently, and be tested for cross-family isolation.

## Minimal Implementation Recommendation

Do not enable partial RLS merely to appear secure. The next security task should define identity mapping, service-role/server boundaries, and read/write policy tests, then enable RLS together with complete deny-by-default policies for a small initial table surface. Until then, Core V1 remains a local/development schema baseline only.
