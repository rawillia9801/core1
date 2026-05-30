# Core Email Template Preview Plan

## Purpose

Core needs a safe email template and preview workflow before any SMTP or provider sending is connected.

This plan defines how Core should manage transactional email templates, queued notification previews, approval rules, and future provider handoff. It does not approve email sending, connect Hostinger SMTP, connect Resend, add provider keys, or enable automatic customer notifications.

## Current Foundation

Core already has communication foundations:

- `core_message_templates` stores draft or approved communication templates.
- `core_notifications` stores queued/tracked notification records.
- `core_queue_notification(...)` creates queue-only notification rows with status `queued`.
- Queue records can include recipient, template key, subject preview, body preview, related application/reservation/ledger context, and metadata.
- Queueing writes `core_events` and `core_audit_log`.
- Core-native staff application entry now queues `application_received` preview records when the applicant email is present.
- Local verification confirmed the queued preview appears in `/staff/notifications` and `sent_at` remains null.
- Initial email template seed records now exist as preview-only draft records for the approved transactional template keys.
- The owner/admin notification preview page now shows seeded email templates alongside queued notification previews.
- A disabled/preview email provider foundation now exists in `src/lib/email/provider.ts`.

Nothing currently sends email. No SMTP provider, Resend provider, send worker, provider package, provider key, delivery-attempt table, or send button is connected.

## Template Keys

Initial transactional template keys align with the queue allowlist:

- `application_received`
- `application_approved`
- `reservation_created`
- `payment_received`
- `payment_reminder`
- `reservation_cancelled`
- `go_home_reminder`
- `document_ready`
- `staff_alert`

These keys should stay transactional and operational. Marketing-style emails require separate consent, preference, and unsubscribe planning.

## Template Seed Foundation

The migration `20260526290000_core_email_template_seed.sql` seeds initial `email` channel template records for the template keys above.

These seeded templates are intentionally conservative:

- `status = 'draft'`
- `metadata.preview_only = true`
- `metadata.send_enabled = false`
- `metadata.provider_connected = false`
- `metadata.owner_admin_approval_required = true`

The seed foundation does not connect a provider, send email, approve customer delivery, or create send attempts. It only provides reusable template records that can later be rendered and previewed.

The rollback-safe test `core_email_template_seed_tests.sql` verifies that seeded templates exist, remain draft/preview-only/send-disabled/provider-disconnected, include subject/body text, and that the cancellation template includes refund-safety language.

## Template Fields

Templates include, or continue to model, at least:

- `template_key`
- `channel`
- `subject_template`
- `body_template`
- active or draft status
- owner/admin approval status through metadata for now
- version metadata if needed later

Template versioning can remain lightweight at first. If templates begin changing frequently or audited customer communication becomes important, add explicit immutable versions later rather than overwriting historical send context.

## Preview Workflow

The first preview UI now exists and is owner/admin only:

```text
/staff/notifications
```

The preview surface:

- Show seeded email templates.
- Show queued notifications.
- Show notification type and status.
- Show recipient email and any staging override recipient.
- Show rendered subject.
- Show rendered body preview.
- Show source event/context, such as application, reservation, buyer, family, or ledger entry.
- Show whether the notification came from fake seed data, dry-run import, staging data, or real approved workflow data when that context exists.
- Show event/audit links or short IDs when useful.
- Avoid raw JSON blobs by summarizing safe fields.
- Provide no send button initially.

Preview should prove that templates and merge data are understandable before any provider can deliver email.

## Disabled And Preview Provider Foundation

The internal provider module now exists at:

```text
src/lib/email/provider.ts
```

This is a safety foundation only. It defines the provider boundary and refuses delivery by default.

Supported provider names are modeled as:

- `disabled`
- `preview`
- `smtp`
- `resend`

Current behavior:

- `disabled` refuses delivery and returns a blocked result.
- `preview` renders/returns a preview result without sending.
- `smtp` is recognized but blocked because SMTP delivery is not implemented or enabled.
- `resend` is recognized but blocked because Resend delivery is not implemented or enabled.

The provider foundation does not read or require SMTP credentials, does not import provider packages, does not create delivery attempts, does not add a send worker, and does not update notification status.

## Safety Rules

Core email safety rules should be conservative:

- No emails from fake seed data.
- No emails from dry-run imports.
- No emails from staging unless explicitly enabled.
- Staging must require an override recipient before any send.
- Customer emails are disabled by default.
- Payment templates must be owner/admin approved before sending.
- Cancellation templates must be owner/admin approved before sending.
- Cancellation notices must not imply a refund unless a separate refund workflow has actually run.
- Payment received notices must reflect ledger records only and must not imply processor settlement unless processor reconciliation exists.
- Every send attempt must be logged.
- Duplicate send protection is required before real sends.
- Failed sends must be visible to staff.
- Provider secrets must never be committed or displayed.

## Hostinger SMTP Later

Hostinger SMTP can be the first real delivery provider, but only behind the provider abstraction.

Future SMTP configuration should use environment variables only. Do not commit or document values.

Expected variable names:

- `EMAIL_PROVIDER`
- `EMAIL_SEND_ENABLED`
- `EMAIL_PREVIEW_ONLY`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_FROM_ADDRESS`
- `SMTP_REPLY_TO_ADDRESS`
- `EMAIL_TEST_RECIPIENT`
- `EMAIL_STAGING_OVERRIDE_RECIPIENT`

The default should remain:

```text
EMAIL_SEND_ENABLED=false
EMAIL_PREVIEW_ONLY=true
```

SMTP sending should not be added until preview, approval, staging override, and send logging are implemented.

## Provider Abstraction

Future provider code should use the small internal interface instead of spreading SMTP or Resend logic across actions.

Recommended providers:

- `disabled`: refuses all sends and is the default safety provider. Foundation added.
- `preview`: renders and logs/previews output without delivery. Foundation added.
- `smtp`: sends through Hostinger SMTP or another SMTP server when explicitly enabled. Blocked.
- `resend`: optional later provider if Core outgrows SMTP or needs better delivery tooling. Blocked.

Application, approval, reservation, payment, cancellation, go-home, and document workflows should queue notifications first. They should not send directly from form actions.

## Recommended Implementation Order

1. Confirm queue-only notification RPC exists. Done.
2. Add this template and preview plan. Done.
3. Add owner/admin notification preview UI with no sending. Done.
4. Add initial draft/preview-only template seed foundation. Done.
5. Show seeded templates alongside queued previews. Done.
6. Add disabled/preview provider behavior. Done.
7. Add send-attempt/delivery logging design and/or table if needed before any delivery.
8. Add SMTP provider configuration while keeping `EMAIL_SEND_ENABLED=false`.
9. Add test-send-to-owner only.
10. Enable selected transactional sends one workflow at a time after owner approval.

## Still Blocked

The following remain blocked until later explicit tasks:

- Hostinger SMTP connection.
- SMTP credentials.
- Resend or any other email provider package.
- Customer email sending.
- Automatic action-triggered sends.
- Staging sends without override recipient.
- Payment emails before receipt and reconciliation language is approved.
- Cancellation emails that imply refund.
- Public `/apply` confirmation emails.
- Customer portal messages.
- Marketing/bulk email.
