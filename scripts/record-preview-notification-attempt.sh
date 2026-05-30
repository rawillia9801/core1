#!/usr/bin/env bash
set -euo pipefail

DB_CONTAINER="${DB_CONTAINER:-supabase_db_core1}"
DB_NAME="${DB_NAME:-postgres}"
DB_USER="${DB_USER:-postgres}"
PROVIDER="${EMAIL_PROVIDER:-disabled}"

case "$PROVIDER" in
  disabled|preview|smtp|resend) ;;
  *)
    echo "Unsupported EMAIL_PROVIDER for preview attempt logging: $PROVIDER" >&2
    exit 1
    ;;
esac

docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -v provider="$PROVIDER" <<'SQL'
with latest_notification as (
  select
    n.id,
    n.template_id,
    n.family_id,
    n.buyer_id,
    n.payload,
    lower(:'provider') as provider
  from public.core_notifications n
  where n.channel = 'email'
    and n.status = 'queued'
    and n.sent_at is null
    and nullif(trim(n.payload ->> 'recipient_email'), '') is not null
  order by n.created_at desc
  limit 1
), prepared_attempt as (
  select
    id as notification_id,
    template_id,
    provider,
    case when provider = 'preview' then 'previewed' else 'blocked' end as status,
    payload ->> 'recipient_email' as recipient_email,
    coalesce(nullif(trim(payload ->> 'subject'), ''), 'Notification preview') as subject,
    concat_ws(
      ':',
      'notification-attempt-preview',
      id::text,
      coalesce(template_id::text, 'no-template-id'),
      coalesce(nullif(trim(payload ->> 'template_key'), ''), 'no-template-key'),
      provider
    ) as idempotency_key,
    payload
  from latest_notification
), inserted_attempt as (
  insert into public.core_notification_delivery_attempts (
    notification_id,
    template_id,
    provider,
    channel,
    status,
    recipient_email,
    subject,
    idempotency_key,
    completed_at,
    request_payload,
    response_payload,
    metadata
  )
  select
    notification_id,
    template_id,
    provider,
    'email',
    status,
    recipient_email,
    subject,
    idempotency_key,
    now(),
    jsonb_build_object(
      'notification_id', notification_id,
      'template_id', template_id,
      'template_key', payload ->> 'template_key',
      'provider_requested', provider,
      'preview_only', true,
      'send_enabled', false
    ),
    jsonb_build_object(
      'sent', false,
      'message_id', null,
      'provider', provider,
      'status', status,
      'reason', case
        when provider = 'preview' then 'Preview attempt logged without sending.'
        else 'Delivery blocked; provider is not connected or sending is disabled.'
      end
    ),
    jsonb_build_object(
      'created_by', 'scripts/record-preview-notification-attempt.sh',
      'email_sending_connected', false,
      'hostinger_smtp_connected', false,
      'resend_connected', false
    )
  from prepared_attempt
  on conflict (idempotency_key) where idempotency_key is not null
  do update set updated_at = now()
  returning id, notification_id, provider, status, recipient_email, idempotency_key
)
select
  'NO EMAIL SENT' as safety_status,
  id as attempt_id,
  notification_id,
  provider,
  status,
  recipient_email,
  idempotency_key,
  false as sent
from inserted_attempt;
SQL
