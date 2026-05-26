# Cherolee Core

Cherolee Core is the future unified operating system for Southwest Virginia Chihuahua. Core V1 establishes a clean canonical data model for buyers, families, applications, dogs, litters, puppies, reservations, financial records, documents, communications, operational logs, audit records, and integration events.

This repository currently contains foundation work only: a Next.js TypeScript placeholder app, Core documentation, and non-destructive Supabase SQL migrations.

## Technology

- Next.js App Router with TypeScript
- React
- Tailwind CSS
- Supabase Postgres migrations in `supabase/migrations/`

## Local Setup

Prerequisites: Node.js 20.9 or later and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the placeholder foundation page.

Quality checks:

```bash
npm run lint
npm run build
```

## Supabase Migrations

Install the Supabase CLI using the method appropriate for your environment, then link only to an approved local or development project. This repository does not include production credentials.

For a local Supabase environment:

```bash
supabase start
supabase db reset
```

For an already linked, explicitly approved development project:

```bash
supabase db push
```

Review migrations before applying them anywhere beyond local development. The baseline is located in `supabase/migrations/20260526140000_core_v1_baseline.sql`.

## Documentation

- `docs/core/CORE_V1_SCHEMA.md`: canonical table ownership, relationships, and views.
- `docs/core/CORE_BUILD_ORDER.md`: phased delivery and intentional boundaries.
- `docs/core/CORE_MIGRATION_MAP.md`: later legacy-data mapping procedure.
- `docs/core/CORE_PHONE_LOOKUP.md`: eventual phone lookup surface and safety requirements.
- `docs/core/CORE_AUDIT_AND_EVENTS.md`: audit and integration event rules.

## Intentionally Not Built Yet

This foundation does not include a full admin dashboard, Puppy Portal, live Supabase configuration, production data import, Zoho retirement, Twilio routing, customer messaging, payment processing, automatic approvals/refunds/pricing changes, AI write tools, Home Assistant, camera analysis, or smart mirror features.

Legacy data must not be deleted or migrated into Core without a reviewed mapping plan and explicit owner approval.
# core1
