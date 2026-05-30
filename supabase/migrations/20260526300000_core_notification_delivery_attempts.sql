-- Cherolee Core V1 notification delivery-attempt foundation.
--
-- Business rule:
--   * This table records future provider delivery attempts and preview/blocked attempts.
--   * Table existence does not authorize delivery.
--   * This migration does not connect Hostinger SMTP, Resend, or any provider.
--   * This migration does not send email and does not update notification sent_at.

create table if not exists public.core_notification_delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid references public.core_notifications(id) on delete set null,
  template_id uuid references public.core_message_templates(id) on delete set null,
  provider text not null,
  channel text not null default 'email',
  status text not null default 'blocked',
  recipient_email text,
  recipient_phone text,
  subject text,
  idempotency_key text,
  external_message_id text,
  attempt_number integer not null default 1,
  attempted_at timestamptz not null default now(),
  completed_at timestamptz,
  error_message text,
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint core_notification_delivery_attempts_provider_check check (
    provider in ('disabled', 'preview', 'smtp', 'resend')
  ),
  constraint core_notification_delivery_attempts_channel_check check (
    channel in ('email')
  ),
  constraint core_notification_delivery_attempts_status_check check (
    status in ('blocked', 'previewed', 'pending', 'sent', 'failed', 'skipped')
  ),
  constraint core_notification_delivery_attempts_attempt_number_check check (attempt_number > 0),
  constraint core_notification_delivery_attempts_email_check check (
    recipient_email is null or recipient_email ~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$'
  )
);

create unique index if not exists core_notification_delivery_attempts_idempotency_key_uidx
  on public.core_notification_delivery_attempts(idempotency_key)
  where idempotency_key is not null;

create index if not exists core_notification_delivery_attempts_notification_idx
  on public.core_notification_delivery_attempts(notification_id, created_at desc);

create index if not exists core_notification_delivery_attempts_status_idx
  on public.core_notification_delivery_attempts(status, created_at desc);

create index if not exists core_notification_delivery_attempts_provider_idx
  on public.core_notification_delivery_attempts(provider, created_at desc);

comment on table public.core_notification_delivery_attempts is
  'Delivery-attempt audit foundation for future notification providers. Existence of this table does not authorize sending.';

comment on column public.core_notification_delivery_attempts.provider is
  'Provider boundary used for future delivery attempts: disabled, preview, smtp, or resend. SMTP/Resend remain blocked until explicit provider tasks.';

comment on column public.core_notification_delivery_attempts.status is
  'Attempt status. sent is reserved for future approved provider delivery; current foundations should only create blocked or previewed records.';

comment on column public.core_notification_delivery_attempts.idempotency_key is
  'Optional duplicate-protection key for future provider attempts and test-send workflows.';
