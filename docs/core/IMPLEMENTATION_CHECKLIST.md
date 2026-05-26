# Cherolee Core Implementation Checklist

## Purpose

This checklist tracks what is completed, what is next, what is blocked, and what is intentionally deferred. It should be updated as work lands in the repository.

## Status Legend

| Mark | Meaning |
| --- | --- |
| `[x]` | Completed and committed. |
| `[~]` | In progress or partially completed. |
| `[ ]` | Not started. |
| `[deferred]` | Intentionally postponed. |
| `[blocked]` | Waiting on a decision, credential, export, or owner approval. |

## Foundation Completed

- [x] Repository initialized and pushed to GitHub.
- [x] Next.js TypeScript app scaffold added.
- [x] Placeholder Core foundation page renders locally.
- [x] `AGENTS.md` added with Core scope and guardrails.
- [x] `README.md` added with setup, quality checks, migration notes, and deferred work.
- [x] `docs/core/` documentation folder added.
- [x] Supabase project structure added.
- [x] Core V1 baseline migration added.
- [x] Core V1 transaction-wrapped smoke test added.
- [x] Main smoke test passes and rolls back.
- [x] `npm run lint` passes.

## Database / Source Of Truth Completed

- [x] Canonical `core_` table baseline added.
- [x] Buyers modeled as people/contact records, not transactions.
- [x] Families modeled as household/customer groups.
- [x] Reservations modeled as the official buyer/family plus puppy transaction.
- [x] Puppies and litters modeled separately.
- [x] Documents and document versions represented as metadata foundations.
- [x] Conversations, messages, calls, templates, and notifications represented as communication foundations.
- [x] Events and audit logs represented separately.
- [x] Integration events represented for future inbound/outbound provider records.
- [x] Future tool-safety tables represented without enabling AI writes.

## Financial Foundation Completed

- [x] `core_financial_ledger.balance_effect` added.
- [x] `amount_cents` corrected to non-negative magnitude semantics.
- [x] `entry_type` retained as descriptive classification.
- [x] `core_payment_balance_view` updated to calculate balance using `balance_effect`.
- [x] Smoke tests cover deposit, payment, credit, fee, admin fee, transport fee, finance charge, refund, chargeback, neutral adjustment, invalid balance effect, and negative amount rejection.
- [x] Financial balance remains reservation/ledger-derived and is not copied onto buyers.

## Go-Home Foundation Completed

- [x] `core_go_home_groups` added as optional shared pickup/delivery event.
- [x] `core_go_home_details` remains reservation-level current detail.
- [x] One current go-home detail per reservation enforced.
- [x] Multiple reservation details can share one go-home group.
- [x] Explicit individual override fields added.
- [x] Grouped rows use group defaults unless `has_individual_override = true`.
- [x] Override fields are rejected when the override flag is false.
- [x] `override_reason` is required when the override flag is true.
- [x] `balance_cleared_status` documented as operational readiness only.
- [x] `core_go_home_effective_view` added.
- [x] Effective read model test covers `group_default`, `individual_override`, and `ungrouped_detail`.

## Phone Lookup Foundation Completed

- [x] `core_phone_lookup_matches_view` added for distinct phone contact matches.
- [x] `core_phone_lookup_summary_view` added for match count and ambiguity decision.
- [x] `core_phone_lookup_view` updated to redact sensitive context for ambiguous phone numbers.
- [x] Ambiguous phone matches require verification and recommend staff routing.
- [x] Smoke tests cover single phone match, duplicate buyer/family phone match, and family-linked profile phone match.
- [ ] Design actual verification workflow.
- [ ] Build server-side phone lookup endpoint.
- [ ] Connect Twilio to Core lookup.

## Read-Only Dashboard Next

- [ ] Define dashboard screen list and acceptance criteria.
- [ ] Confirm dashboard read models are sufficient.
- [ ] Add missing read-only dashboard views if needed without new tables unless explicitly approved.
- [ ] Build read-only admin dashboard shell.
- [ ] Add dashboard navigation sections: overview, applications, buyers, families, dogs, litters, puppies, reservations, payments, go-home, documents, messages, phone lookup, kennel logs, events.
- [ ] Add loading, empty, and error states.
- [ ] Add privacy-safe presentation rules.
- [ ] Keep all dashboard actions read-only until write tools are approved.

## RLS / Security Still To Do

- [ ] Implement admin/staff access policies.
- [ ] Implement buyer/family portal access policies.
- [ ] Implement public/anonymous access boundaries.
- [ ] Implement service-role-only operation rules.
- [ ] Add RLS policy tests.
- [ ] Verify no sensitive tables/views are exposed to live clients before policies exist.

## Write Tools Still To Do

- [ ] Define server-side write tool pattern.
- [ ] Require validation, authorization, audit logging, and structured errors.
- [ ] Add low-risk tools first, such as create operational event, record puppy weight, record feeding, record medication, update puppy status.
- [ ] Add payment recording only after ledger write rules are validated.
- [ ] Add go-home update tools only after dashboard/read behavior is stable.
- [ ] Prevent direct AI/database writes.

## Document Generation Still To Do

- [ ] Inventory existing document requirements: contract, health guarantee, bill of sale, payment agreement, receipts, vaccine/health records, care guides, pupdate packets.
- [ ] Design template records, merge fields, generation runs, versioning, and approval gates.
- [ ] Define which document types require staff approval before sending.
- [ ] Define storage and signed URL rules.
- [ ] Define customer visibility rules in the future Puppy Portal.
- [ ] Build document generation service later.
- [ ] Integrate signature provider later only after provider choice and approval.

## Customer Interaction Still To Do

- [ ] Define what Core may answer automatically.
- [ ] Define what must route to staff.
- [ ] Define customer portal message/conversation workflow.
- [ ] Define website chat/customer inquiry workflow.
- [ ] Define email reply workflow.
- [ ] Define Facebook/Messenger workflow later.
- [ ] Log all generated messages and interactions.
- [ ] Keep sensitive decisions staff-approved.

## Applications Still To Do

- [ ] Map current Zoho Forms/application fields to Core.
- [ ] Design application intake endpoint or import process.
- [ ] Define application status workflow.
- [ ] Define applicant email template workflow.
- [ ] Do not auto-approve applicants until workflow is reviewed.

## Zoho / Legacy Migration Still To Do

- [ ] Inventory Zoho modules and field mappings.
- [ ] Inventory existing Supabase duplicate tables.
- [ ] Define source precedence for buyers, families, puppies, reservations, payments, documents, and go-home data.
- [ ] Create migration map with duplicate detection.
- [ ] Dry-run import into local/dev only.
- [ ] Review migration results manually.
- [ ] Import production data only after owner approval.
- [ ] Retire Zoho modules only after Core workflow replacement is proven.

## Twilio Still To Do

- [ ] Keep current Twilio/Zoho lookup in place until Core phone lookup endpoint is built and tested.
- [ ] Build Core phone lookup API endpoint.
- [ ] Implement ambiguity handling and verification prompt/routing.
- [ ] Test with non-production Twilio flow or safe test number.
- [ ] Cut over only after owner approval.

## Puppy Portal Still To Do

- [ ] Define portal route list.
- [ ] Define family login/access model.
- [ ] Define portal dashboard.
- [ ] Define my puppy page.
- [ ] Define documents page.
- [ ] Define payments page.
- [ ] Define go-home page.
- [ ] Define messages page.
- [ ] Define resources/care-guide page.
- [ ] Build only after RLS and document visibility rules exist.

## Public Website Still To Do

- [ ] Define website route list.
- [ ] Define available puppies/litters display rules.
- [ ] Define application form workflow.
- [ ] Define contact/inquiry workflow.
- [ ] Build website replacement only after Core read/write flows are stable enough.

## Kennel Core Still To Do

- [ ] Weight logging workflow.
- [ ] Feeding logging workflow.
- [ ] Medication logging workflow.
- [ ] Puppy event/milestone workflow.
- [ ] Whelping mode later.
- [ ] Overnight summary later.
- [ ] Avoid medical inference or automated treatment decisions.

## Deferred Integrations

- [deferred] Home Assistant bridge.
- [deferred] Camera analysis.
- [deferred] Smart mirror/display.
- [deferred] RF button flows.
- [deferred] Advanced automation.

## Stop Conditions

Stop and review before continuing if any task attempts to:

- Create new tables not explicitly named in the task.
- Import production data.
- Enable RLS without policy tests.
- Connect Twilio, Zoho, email, payment, Home Assistant, cameras, or smart mirror.
- Build customer-facing behavior without access rules.
- Add AI write capability without tool-safety design.
- Change financial balance semantics.
- Change go-home cardinality or override semantics.

## Next Safe Task

Build a read-only dashboard plan and then a read-only dashboard shell. Do not add write actions yet.
