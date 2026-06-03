# Cherolee Core OS Manual Reference

## Status

Reference document for Codex and developer work. This file captures the controlling business and technical direction from the owner-facing Cherolee Core OS Manual provided in June 2026.

This is not a replacement for implementation docs. It is the business/partner reference that explains what Core is, what it must eventually do, and the real-world assumptions that must control build decisions.

## Document Overview

- Business: Southwest Virginia Chihuahua / Cherolee
- System name: Cherolee Core OS
- Document purpose: plain-English business and technical manual for partner review
- System type: governed operational and environmental intelligence platform
- Web hosting: Hostinger, paid for 3 years, no additional monthly cost for current hosting
- Email / SMTP: Hostinger SMTP included, no additional email provider cost for normal current business use
- Core database: Supabase / PostgreSQL
- Core frontend: Vercel, free tier at current scale
- Phone / voice: Twilio, usage-based

## What Core OS Is

Cherolee Core OS is the central operating system for Southwest Virginia Chihuahua and related Cherolee operations. It is the brain of the business, not just a website, dashboard, or puppy portal.

Core exists because the business cannot safely depend on memory, Facebook messages, scattered notes, spreadsheets, phone calls, and separate apps that do not share truth. Core replaces that fragmentation with one governed system that knows:

- what is true
- what is allowed
- what is blocked
- what needs to happen next
- what must be recorded permanently
- what must remain owner-approved

Core is the authority behind every screen. Customer interactions, payments, documents, kennel sensors, and business decisions must pass through Core rules instead of living as disconnected notes or guesses.

## What Core Is Not

Core is not:

- just a website
- just a dashboard
- just a puppy portal
- a chatbot that makes decisions on its own
- a replacement for the owner
- finished when screens exist
- a one-week build

Screens only matter if they read and write the correct source of truth.

## Full Capability Map

Core is designed to support these capability areas:

| Capability | What It Does |
| --- | --- |
| Owner Command Center | Daily priorities, blockers, alerts, metrics, and next actions in one cockpit. |
| Application Management | Receive, review, approve, deny, waitlist, and convert applicants with full audit trail. |
| Buyer & Family CRM | Track households, history, preferences, puppies, payments, and conversations. |
| Waitlist Management | Capture timing, preferences, fee status, priority, renewal, and expiration. |
| Dog Records | Sire/dam profiles, registry, DNA status, health notes, retirement, and pedigree. |
| Litter & Puppy Tracking | Full lifecycle from planned litter to placed puppy, with weights and milestones. |
| Payments & Financing | Ledger-based financial truth, payment plans, deposits, refunds, and reminders. |
| Document Management | Deposit agreements, bills of sale, health guarantees, financing addenda, transport agreements. |
| Automated Email / SMTP | Application confirmations, approval notices, payment reminders, go-home notices, weekly updates, and owner alerts. |
| Communications Hub | Facebook, email, website chat, SMS, portal messages, and phone calls unified into one customer history. |
| Phone & Voice / Twilio | Caller lookup, voice menu, call summaries, and sensitive-topic escalation. |
| Customer Portal | Buyer-specific puppy updates, documents, payments, messages, and resources. |
| Kennel Monitoring | Temperature, humidity, motion, presence, camera status, and distress alerts. |
| Smart Home Control | Lights, plugs, displays, speakers, and alerts through Home Assistant. |
| AI Assistant | Read, summarize, draft, propose, and match under strict guardrails. |
| Core Nervous System | Monitor Core itself, detect failures, degrade honestly, and propose recovery. |
| CoreFace / Presence | Visual expression of real system state on dashboard, TV, tablet, or display. |
| Reporting | Revenue, receivables, placements, response time, kennel health, and build status. |

## Architecture Rule

Core is layered authority. No interface defines truth.

Layer order:

1. Interface layer: owner console, buyer portal, Facebook, Twilio, smart display.
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
No interface gets to make the final decision. The dashboard, portal, Facebook, Twilio, smart-home devices, and assistant surfaces all pass through Core authority. Every meaningful action creates an immutable event record.
```

## Source Of Truth Domains

Core maintains separate truth domains:

| Truth Domain | What It Stores | Rule |
| --- | --- | --- |
| Current State | Buyers, applications, puppies, litters, dogs, reservations. | Only updated after validation. |
| Financial Truth | Ledger transactions, payment plans, invoices, refunds, credits. | Balances derive from transactions, never typed manually. |
| Historical Truth | `core_events`. | Immutable record of meaningful action. |
| Communication Truth | Message threads, call sessions, transcripts. | Every contact ties to a person, application, puppy, or unresolved lead. |
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

The review flow must show application answers, duplicate matches, prior conversations, desired puppy, references, payment plan interest, and blockers. Owner actions include approve, deny, waitlist, request more information, or hold for review.

Denials are sensitive. Core may draft denial language, but it must never automatically deny based on AI judgment. Denial reason, reviewer, timestamp, and appeal notes must be preserved.

## Payments, Financing, And Documents

Financial truth is ledger-based. Every payment, deposit, fee, credit, refund, financing charge, transport fee, and adjustment is a ledger transaction. Balances are calculated from transactions, not typed into puppy or buyer records.

Document state must be evidence-based. A document is complete only when Core has the correct party, puppy/reservation/payment terms, signed or accepted state, and audit event.

Required document types include:

- Deposit Agreement
- Bill of Sale
- Health Guarantee
- Financing Addendum
- Transport Agreement
- Application Copy

## Automated Email And Communications

Hostinger SMTP is already included with the paid Hostinger hosting plan. At the current stage, this means no separate paid email provider is needed for normal business volume.

Core is intended to send or draft emails for:

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
- 0 active portal users.
- Hostinger hosting already paid for 3 years.
- Hostinger SMTP included.
- Vercel can remain free tier at current scale.
- Supabase can remain free tier at current scale.
- Twilio is usage-based.
- AI is $0 until connected and used.
- Local NVR can keep camera storage at $0 monthly unless optional cloud backup is chosen.

The manual's grounded current-scale cost view:

- Hostinger web hosting: $0 additional monthly.
- Hostinger SMTP: $0 additional monthly.
- Supabase free tier at current scale: $0.
- Vercel free tier at current scale: $0.
- Twilio phone number: approximately $1.15/month.
- Twilio inbound voice: usage-based; example 100 minutes/month is under $1 in usage.
- Twilio outbound voice: usage-based; example 50 minutes/month is under $1 in usage.
- Twilio SMS if used: usage-based and opt-in only.
- AI provider: $0 until connected, then usage-based.
- Camera cloud storage: optional, local NVR can be $0.
- Home Assistant Cloud: optional.

## Recommended Build Order For Early Value

1. Finish Phase 1: stable internal dashboard with trusted records.
2. Complete Phase 2: full application/approval/buyer workflow.
3. Configure Hostinger SMTP only after preview/approval/send logging rules are ready.
4. Complete Phase 3: ledger payments and document tracking.
5. Purchase/install kennel hardware in parallel with Phase 3-4 if desired.
6. Complete Phase 4: communication hub preview and drafts.
7. Complete Phase 5: portal integration.
8. Complete Phase 6: smart kennel monitoring.
9. Build Phase 7/8: nervous system, assistant, CoreFace.
