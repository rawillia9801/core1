# Cherolee Core OS Manual Reference

## Status

Reference document for Codex and developer work. This file captures the controlling business and technical direction from the owner-facing Cherolee Core OS Manual and is updated after the Production Action Workflow + Reliability Layer work.

This is not a replacement for implementation docs. It explains what Core is, what it must eventually do, and the real-world assumptions that must control build decisions.

## Document Overview

- Business: Southwest Virginia Chihuahua / Cherolee
- System name: Cherolee Core OS
- System type: governed operational and environmental intelligence platform
- Core database: Supabase / PostgreSQL
- Core frontend: Next.js App Router on Vercel
- Public website: Southwest Virginia Chihuahua website with embeddable application iframe
- Email / SMTP: SMTP application receipt path now exists conditionally when server-side SMTP env vars are configured
- Phone / voice: Twilio remains future/usage-based and not connected in Core

## What Core OS Is

Cherolee Core OS is the central operating system for Southwest Virginia Chihuahua and related Cherolee operations. It is the brain of the business, not just a website, dashboard, puppy portal, or chatbot.

Core exists because the business cannot safely depend on memory, scattered messages, spreadsheets, phone calls, screenshots, and disconnected apps. Core replaces that fragmentation with one governed system that knows:

- what is true
- what is allowed
- what is blocked
- what needs to happen next
- what must be recorded permanently
- what must remain owner-approved

Core is the authority behind every internal screen. Public forms and customer surfaces may submit or request information, but Core rules decide how records are stored, reviewed, blocked, or advanced.

## What Core Is Not

Core is not:

- just a website
- just a dashboard
- just a puppy portal
- a chatbot that makes decisions on its own
- a replacement for the owner
- finished when screens exist
- allowed to silently make buyer, money, document, or puppy decisions

Screens only matter if they read and write the correct source of truth.

## Full Capability Map

| Capability | What It Does | Current State |
| --- | --- | --- |
| Owner Command Center | Daily priorities, blockers, alerts, metrics, and next actions in one cockpit. | Internal command center and controlled action command center exist. |
| Application Management | Receive, review, approve, deny, waitlist, and convert applicants with audit trail. | Private entry, public/embedded intake, application review, classified action outcomes, and internal matching decision-support exist; review validation/hardening still needed. |
| Buyer & Family CRM | Track households, history, preferences, puppies, payments, and conversations. | Buyer/Family 360 workspaces exist internally. |
| Waitlist Management | Capture timing, preferences, fee status, priority, renewal, and expiration. | Internal matching/waitlist readiness view exists; dedicated write workflow still future. |
| Dog Records | Sire/dam profiles, registry, DNA status, health notes, retirement, and pedigree. | Internal dog profile and document vault exist. |
| Litter & Puppy Tracking | Lifecycle from planned litter to placed puppy, with weights and milestones. | Internal kennel, litter, puppy, neonatal and media workflows exist. |
| Payments & Financing | Ledger truth, payment plans, deposits, refunds, reminders. | Internal ledger/payment plan readiness exists; no processor. |
| Document Management | Deposit agreements, bills of sale, health guarantees, financing addenda, transport agreements. | Internal Document Command Center and metadata detail route exist; no generation/signature provider. |
| Automated Email / SMTP | Application confirmations, approval notices, reminders, owner alerts. | Conditional SMTP only for application receipt owner/customer alerts. Broader email remains blocked. |
| Communications Hub | Facebook, email, website chat, SMS, portal messages, calls. | Metadata/readiness/preview only. |
| Phone & Voice / Twilio | Caller lookup, voice menu, summaries, escalation. | Phone lookup safety exists; Twilio not connected. |
| Customer Portal | Puppy updates, documents, payments, messages, resources. | Not implemented. |
| Kennel Monitoring | Temperature, humidity, motion, camera status, distress alerts. | Not connected; planning only. |
| Smart Home Control | Lights, plugs, displays, speakers, alerts through Home Assistant. | Not connected; planning only. |
| AI Assistant | Read, summarize, draft, propose, and match under guardrails. | Proposed-action review foundation is connected to `/staff/actions`; AI providers blocked. |
| Core Nervous System | Health signals, dependencies, incidents, recovery. | Future. |
| CoreFace / Presence | Visual expression of system state. | Future. |
| Reporting | Revenue, receivables, placements, response time, kennel health, build status. | Partial internal summaries exist. |

## Architecture Rule

Core is layered authority. No interface defines truth.

Layer order:

1. Interface layer: owner console, public application form, buyer portal, Facebook, Twilio, smart display.
2. API / ingress layer: receives and normalizes inputs safely.
3. Command layer: turns intent into proposed or executable commands.
4. Policy / guardrail layer: checks permissions, risk, state, and preconditions.
5. Domain services: business logic for each area.
6. Data layer: Supabase/PostgreSQL records and storage metadata.
7. Nervous system: health, dependencies, incidents, recovery, presence state.
8. Automation layer: scheduled/event-driven work only inside rules.
9. AI layer: reads, summarizes, drafts, and proposes without bypassing rules.

Golden rule:

```text
No interface gets to make the final decision. The dashboard, public forms, portal, Facebook, Twilio, smart-home devices, and assistant surfaces all pass through Core authority. Every meaningful action creates a durable event or audit record where the schema supports it.
```

## Source Of Truth Domains

| Truth Domain | What It Stores | Rule |
| --- | --- | --- |
| Current State | Buyers, applications, puppies, litters, dogs, reservations. | Only updated after validation. |
| Financial Truth | Ledger transactions, payment plans, deposits, refunds, credits. | Balances derive from transactions, never typed manually. |
| Historical Truth | `core_events`. | Record of meaningful actions and submissions. |
| Communication Truth | Message threads, call sessions, notification attempts. | Contact history ties to people, applications, puppies, or unresolved leads. |
| Document Truth | Document packages, signatures, file metadata. | Not complete until signed/accepted evidence is recorded. |
| Genetic Truth | Dogs, DNA results, genetic traits, pairing reports. | AI cannot invent results; source file required. |
| Environmental Truth | Sensor readings, camera events, kennel alerts. | Raw readings preserved and interpreted into structured conditions. |
| System Health Truth | Components, health signals, incidents. | Core monitors reliability and degrades honestly. |

## Application / Buyer Lifecycle

The application workflow is the front door of the business. Core must support:

- received
- needs info
- under review
- approved
- denied
- waitlisted
- withdrawn
- expired

Current implementation now includes private owner/admin application entry, public/embedded website application intake, and an internal matching/waitlist command center for advisory placement review. The public/embedded form is designed for swvachihuahua.com and intentionally uses Southwest Virginia Chihuahua customer-facing language only.

The public application form currently captures:

- Applicant Info
- Puppy Preferences
- Lifestyle & Home
- Payment & Agreement
- Terms and Conditions acknowledgement
- Applicant Declarations acknowledgement
- Date-Time / typed signature

The review flow must show application answers, duplicate matches, prior conversations, desired puppy, references, payment plan interest, and blockers. The matching command center may score applicant/puppy fit from existing preference and puppy metadata, but those scores are decision-support only and must not approve, deny, waitlist, assign, reserve, message, charge, or generate documents automatically.

Denials are sensitive. Core may draft denial language, but it must never automatically deny based on AI judgment. Denial reason, reviewer, timestamp, and appeal notes must be preserved.

## Payments, Financing, And Documents

Financial truth is ledger-based. Every payment, deposit, fee, credit, refund, financing charge, transport fee, and adjustment is a ledger transaction. Balances are calculated from transactions, not typed into puppy or buyer records.

Current implementation includes internal payment ledger readiness and a Payment Plan Command Center. These are internal review tools only and do not move money, create payment links, process refunds, or contact providers.

Document state must be evidence-based. A document is complete only when Core has the correct party, puppy/reservation/payment terms, signed or accepted state, and audit event. Current internal UI reads existing `core_documents` and `core_document_versions` metadata for readiness and source-record navigation only.

Required document types include:

- Deposit Agreement
- Bill of Sale
- Health Guarantee
- Financing Addendum
- Transport Agreement
- Application Copy

Document generation, upload expansion, portal visibility, and signature provider integration remain blocked until explicitly approved.

## Automated Email And Communications

Hostinger SMTP is included with the paid Hostinger hosting plan, so no separate paid email provider is needed for normal current business volume.

Current implementation status:

- SMTP helper exists at `src/lib/core/smtp-mailer.ts`.
- Public application submission can attempt an owner alert and customer receipt confirmation when SMTP env vars are configured.
- Customer-facing application receipt email must contain no Core/admin/internal wording.
- Broader automated email remains blocked until send logging, test-send-to-owner, copy approval, and owner/operator approval rules are complete.

Core is intended eventually to send or draft emails for:

- application submitted
- application approved
- application denied
- application waitlisted
- reservation confirmed
- payment received
- payment reminder
- document ready for review
- go-home reminder
- puppy weekly update
- kennel alert escalation
- system health incident

Sensitive replies such as denial, legal, refund, complaint, or high-risk payment matters require owner approval.

All communication channels should eventually unify into one customer history:

- Facebook Messenger
- email through Hostinger SMTP
- website chat/form
- SMS through Twilio after opt-in
- phone through Twilio
- customer portal messages

## Smart Home And Kennel Monitoring

Kennel monitoring turns physical signals into structured operational awareness. Core must preserve raw evidence and classify conditions.

Key zones:

- Whelping / Nursery Zone: critical priority.
- Puppy Play / Weaning Zone: high priority.
- Adult Dog Zone: high priority.
- Incubator / Brooder Zone: critical priority.
- Utility / Equipment Zone: medium priority.

Temperature and humidity states:

- normal
- watch
- warning
- critical
- sensor stale
- conflicting sensors

Motion/presence/distress signals must be used carefully. Core does not diagnose medical conditions. It may alert that a possible distress condition exists, list evidence, and recommend a physical check or veterinarian contact.

Home Assistant is the recommended local-first bridge. Core evaluates events with business and kennel context. Core can send approved commands only for low-risk actions such as lights, displays, and notifications. Heat sources, locks, pumps, incubators, and critical equipment remain restricted.

## Hardware Reference

Starter and full hardware costs are one-time purchases. Monthly hardware-related costs are separate.

Hardware categories:

- Home Assistant hub / controller
- mini PC alternative
- Zigbee/Thread adapter
- Ethernet switch/network gear
- temperature/humidity sensors
- mmWave presence sensors
- PIR motion sensors
- door/contact sensors
- leak/water sensors
- smart plugs with power monitoring
- smart bulbs/LED strips
- local/RTSP cameras
- NVR/local storage
- smart TV/monitor/tablet/speaker display surfaces

Planning ranges from the manual:

- Starter setup: approximately $535 to $1,080 one-time.
- Full system: approximately $1,080 to $2,750 one-time.

## Core Nervous System And CoreFace

The Core Nervous System detects issues before the owner discovers them manually. It senses, interprets, contains, heals, escalates, and resolves.

CoreFace is not decoration. It is the visible expression of real system state.

Presence states include:

- healthy
- partial
- degraded
- critical
- recovering

## AI Guardrails

AI may read, summarize, draft, classify, match, and propose. AI may not silently change records, send high-risk messages without approval, guarantee genetic outcomes, diagnose animals, or perform risky repairs without governed approval.

Risk levels:

- read-only
- low
- medium
- high
- critical

High and critical actions require owner approval or manual owner action.

## Build Timeline From Manual

Core becomes useful before it is complete. Timeline is phased:

| Phase | Goal | Estimated Time |
| --- | --- | --- |
| Phase 1 Internal Foundation | Stable owner/operator internal dashboard and trusted workflows. | In progress + weeks to harden. |
| Phase 2 Applications & Buyer Lifecycle | Full detail/review/denial/waitlist/reservation handoff. | 2-4 weeks. |
| Phase 3 Payments, Documents & Go-Home | Ledger confidence, document tracking, go-home blockers. | 3-6 weeks. |
| Phase 4 Communications Preview | Facebook/email/SMS/voice context and draft/approval workflows. | 4-8 weeks. |
| Phase 5 Portal Integration | Existing portal reads Core truth and submits safe requests. | 4-8 weeks. |
| Phase 6 Smart Kennel Monitoring | Home Assistant, zones, sensors, camera status, alerts. | 4-10 weeks plus hardware install. |
| Phase 7 Core Nervous System | Health signals, dependencies, incidents, recovery proposals, presence state. | 6-12 weeks. |
| Phase 8 Assistant, Voice & CoreFace | Assistant proposes actions, voice/display surfaces, controlled execution. | 8-16+ weeks. |

## Monthly Operating Cost Assumptions

Current scale assumptions:

- Approximately 30 customers.
- Hostinger hosting already paid for 3 years.
- Hostinger SMTP included.
- Vercel can remain free tier at current scale.
- Supabase can remain free tier at current scale.
- Twilio is usage-based.
- AI is $0 until connected and used.
- Local NVR can keep camera storage at $0 monthly unless optional cloud backup is chosen.

The grounded current-scale cost view:

- Hostinger web hosting: $0 additional monthly.
- Hostinger SMTP: $0 additional monthly.
- Supabase free tier at current scale: $0.
- Vercel free tier at current scale: $0.
- Twilio phone number and usage: usage-based.
- AI provider: $0 until connected, then usage-based.
- Camera cloud storage: optional, local NVR can be $0.
- Home Assistant Cloud: optional.

## Recommended Build Order For Early Value

1. Validate public/embedded application submission end-to-end.
2. Ensure internal application review displays new public application sections clearly.
3. Add SMTP send-attempt logging for public application receipt owner/customer emails.
4. Add duplicate application handling and failed-intake/dead-letter behavior.
5. Continue RLS/security hardening before broader customer-facing access.
6. Complete Phase 3 ledger/document/go-home hardening.
7. Expand communications beyond application receipt only after logging, approval, and test-send rules are complete.
8. Portal, AI, Twilio/Facebook, smart kennel, CoreFace, and voice remain later phases.
