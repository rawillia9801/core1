-- Cherolee Core V1 email template seed foundation.
--
-- Business rule:
--   * These are preview/draft template records only.
--   * Template existence never authorizes sending.
--   * This migration does not connect Hostinger SMTP, Resend, or any provider.
--   * No email is sent by this migration.

with template_seed (
  id,
  template_key,
  name,
  channel,
  subject_template,
  body_template,
  status,
  metadata
) as (
  values
    (
      '63000000-0000-0000-0000-000000000001'::uuid,
      'application_received',
      'Application received',
      'email',
      'Application received - Southwest Virginia Chihuahua',
      'Hi {{applicant_name}},

We received your puppy application for Southwest Virginia Chihuahua. We will review it and follow up with next steps.

This message is a preview template only until email sending is explicitly enabled.',
      'draft',
      '{"preview_only": true, "send_enabled": false, "provider_connected": false, "owner_admin_approval_required": true, "category": "transactional", "merge_fields": ["applicant_name", "application_id", "business_name"]}'::jsonb
    ),
    (
      '63000000-0000-0000-0000-000000000002'::uuid,
      'application_approved',
      'Application approved',
      'email',
      'Your puppy application has been approved',
      'Hi {{applicant_name}},

Your puppy application has been approved. We will follow up with available next steps for reservation and go-home planning.

This message is a preview template only until email sending is explicitly enabled.',
      'draft',
      '{"preview_only": true, "send_enabled": false, "provider_connected": false, "owner_admin_approval_required": true, "category": "transactional", "merge_fields": ["applicant_name", "application_id", "business_name"]}'::jsonb
    ),
    (
      '63000000-0000-0000-0000-000000000003'::uuid,
      'reservation_created',
      'Reservation created',
      'email',
      'Puppy reservation created',
      'Hi {{buyer_name}},

A puppy reservation has been created in Core. Please review the reservation details and next steps provided by Southwest Virginia Chihuahua.

This message is a preview template only until email sending is explicitly enabled.',
      'draft',
      '{"preview_only": true, "send_enabled": false, "provider_connected": false, "owner_admin_approval_required": true, "category": "transactional", "merge_fields": ["buyer_name", "reservation_id", "puppy_name", "business_name"]}'::jsonb
    ),
    (
      '63000000-0000-0000-0000-000000000004'::uuid,
      'payment_received',
      'Payment received',
      'email',
      'Payment received',
      'Hi {{buyer_name}},

Core recorded a payment for your puppy reservation. This message reflects Core ledger activity only and does not confirm processor settlement unless a payment processor workflow is later connected and verified.

This message is a preview template only until email sending is explicitly enabled.',
      'draft',
      '{"preview_only": true, "send_enabled": false, "provider_connected": false, "owner_admin_approval_required": true, "category": "transactional", "merge_fields": ["buyer_name", "reservation_id", "amount", "balance_due", "business_name"]}'::jsonb
    ),
    (
      '63000000-0000-0000-0000-000000000005'::uuid,
      'payment_reminder',
      'Payment reminder',
      'email',
      'Payment reminder',
      'Hi {{buyer_name}},

This is a reminder about the balance or payment schedule for your puppy reservation. Please review your current agreement or contact Southwest Virginia Chihuahua with questions.

This message is a preview template only until email sending is explicitly enabled.',
      'draft',
      '{"preview_only": true, "send_enabled": false, "provider_connected": false, "owner_admin_approval_required": true, "category": "transactional", "merge_fields": ["buyer_name", "reservation_id", "amount_due", "due_date", "business_name"]}'::jsonb
    ),
    (
      '63000000-0000-0000-0000-000000000006'::uuid,
      'reservation_cancelled',
      'Reservation cancelled',
      'email',
      'Reservation update',
      'Hi {{buyer_name}},

Your reservation status has been updated to cancelled. This notice does not imply a refund. Refunds or credits require a separate reviewed workflow.

This message is a preview template only until email sending is explicitly enabled.',
      'draft',
      '{"preview_only": true, "send_enabled": false, "provider_connected": false, "owner_admin_approval_required": true, "category": "transactional", "merge_fields": ["buyer_name", "reservation_id", "cancellation_reason", "business_name"], "safety_note": "Cancellation template must not imply refund."}'::jsonb
    ),
    (
      '63000000-0000-0000-0000-000000000007'::uuid,
      'go_home_reminder',
      'Go-home reminder',
      'email',
      'Go-home reminder',
      'Hi {{buyer_name}},

This is a reminder about your puppy go-home appointment or preparation steps. Please review the details provided by Southwest Virginia Chihuahua.

This message is a preview template only until email sending is explicitly enabled.',
      'draft',
      '{"preview_only": true, "send_enabled": false, "provider_connected": false, "owner_admin_approval_required": true, "category": "transactional", "merge_fields": ["buyer_name", "reservation_id", "go_home_at", "meeting_location", "business_name"]}'::jsonb
    ),
    (
      '63000000-0000-0000-0000-000000000008'::uuid,
      'document_ready',
      'Document ready',
      'email',
      'Document ready for review',
      'Hi {{buyer_name}},

A document is ready for review. Please follow the instructions provided by Southwest Virginia Chihuahua.

This message is a preview template only until email sending is explicitly enabled.',
      'draft',
      '{"preview_only": true, "send_enabled": false, "provider_connected": false, "owner_admin_approval_required": true, "category": "transactional", "merge_fields": ["buyer_name", "document_title", "document_type", "business_name"]}'::jsonb
    ),
    (
      '63000000-0000-0000-0000-000000000009'::uuid,
      'staff_alert',
      'Staff alert',
      'email',
      'Core staff alert',
      'Core generated an internal staff alert.

Alert type: {{alert_type}}
Context: {{alert_context}}

This message is a preview template only until email sending is explicitly enabled.',
      'draft',
      '{"preview_only": true, "send_enabled": false, "provider_connected": false, "owner_admin_approval_required": true, "category": "internal", "merge_fields": ["alert_type", "alert_context", "business_name"]}'::jsonb
    )
)
update public.core_message_templates mt
set
  name = ts.name,
  channel = ts.channel,
  subject_template = ts.subject_template,
  body_template = ts.body_template,
  status = ts.status,
  metadata = ts.metadata || jsonb_build_object(
    'seeded_by', '20260526290000_core_email_template_seed',
    'updated_by_migration', true
  ),
  updated_at = now()
from template_seed ts
where mt.id = ts.id;

with template_seed (
  id,
  template_key,
  name,
  channel,
  subject_template,
  body_template,
  status,
  metadata
) as (
  values
    ('63000000-0000-0000-0000-000000000001'::uuid, 'application_received', 'Application received', 'email', 'Application received - Southwest Virginia Chihuahua', 'Hi {{applicant_name}},

We received your puppy application for Southwest Virginia Chihuahua. We will review it and follow up with next steps.

This message is a preview template only until email sending is explicitly enabled.', 'draft', '{"preview_only": true, "send_enabled": false, "provider_connected": false, "owner_admin_approval_required": true, "category": "transactional", "merge_fields": ["applicant_name", "application_id", "business_name"], "seeded_by": "20260526290000_core_email_template_seed"}'::jsonb),
    ('63000000-0000-0000-0000-000000000002'::uuid, 'application_approved', 'Application approved', 'email', 'Your puppy application has been approved', 'Hi {{applicant_name}},

Your puppy application has been approved. We will follow up with available next steps for reservation and go-home planning.

This message is a preview template only until email sending is explicitly enabled.', 'draft', '{"preview_only": true, "send_enabled": false, "provider_connected": false, "owner_admin_approval_required": true, "category": "transactional", "merge_fields": ["applicant_name", "application_id", "business_name"], "seeded_by": "20260526290000_core_email_template_seed"}'::jsonb),
    ('63000000-0000-0000-0000-000000000003'::uuid, 'reservation_created', 'Reservation created', 'email', 'Puppy reservation created', 'Hi {{buyer_name}},

A puppy reservation has been created in Core. Please review the reservation details and next steps provided by Southwest Virginia Chihuahua.

This message is a preview template only until email sending is explicitly enabled.', 'draft', '{"preview_only": true, "send_enabled": false, "provider_connected": false, "owner_admin_approval_required": true, "category": "transactional", "merge_fields": ["buyer_name", "reservation_id", "puppy_name", "business_name"], "seeded_by": "20260526290000_core_email_template_seed"}'::jsonb),
    ('63000000-0000-0000-0000-000000000004'::uuid, 'payment_received', 'Payment received', 'email', 'Payment received', 'Hi {{buyer_name}},

Core recorded a payment for your puppy reservation. This message reflects Core ledger activity only and does not confirm processor settlement unless a payment processor workflow is later connected and verified.

This message is a preview template only until email sending is explicitly enabled.', 'draft', '{"preview_only": true, "send_enabled": false, "provider_connected": false, "owner_admin_approval_required": true, "category": "transactional", "merge_fields": ["buyer_name", "reservation_id", "amount", "balance_due", "business_name"], "seeded_by": "20260526290000_core_email_template_seed"}'::jsonb),
    ('63000000-0000-0000-0000-000000000005'::uuid, 'payment_reminder', 'Payment reminder', 'email', 'Payment reminder', 'Hi {{buyer_name}},

This is a reminder about the balance or payment schedule for your puppy reservation. Please review your current agreement or contact Southwest Virginia Chihuahua with questions.

This message is a preview template only until email sending is explicitly enabled.', 'draft', '{"preview_only": true, "send_enabled": false, "provider_connected": false, "owner_admin_approval_required": true, "category": "transactional", "merge_fields": ["buyer_name", "reservation_id", "amount_due", "due_date", "business_name"], "seeded_by": "20260526290000_core_email_template_seed"}'::jsonb),
    ('63000000-0000-0000-0000-000000000006'::uuid, 'reservation_cancelled', 'Reservation cancelled', 'email', 'Reservation update', 'Hi {{buyer_name}},

Your reservation status has been updated to cancelled. This notice does not imply a refund. Refunds or credits require a separate reviewed workflow.

This message is a preview template only until email sending is explicitly enabled.', 'draft', '{"preview_only": true, "send_enabled": false, "provider_connected": false, "owner_admin_approval_required": true, "category": "transactional", "merge_fields": ["buyer_name", "reservation_id", "cancellation_reason", "business_name"], "safety_note": "Cancellation template must not imply refund.", "seeded_by": "20260526290000_core_email_template_seed"}'::jsonb),
    ('63000000-0000-0000-0000-000000000007'::uuid, 'go_home_reminder', 'Go-home reminder', 'email', 'Go-home reminder', 'Hi {{buyer_name}},

This is a reminder about your puppy go-home appointment or preparation steps. Please review the details provided by Southwest Virginia Chihuahua.

This message is a preview template only until email sending is explicitly enabled.', 'draft', '{"preview_only": true, "send_enabled": false, "provider_connected": false, "owner_admin_approval_required": true, "category": "transactional", "merge_fields": ["buyer_name", "reservation_id", "go_home_at", "meeting_location", "business_name"], "seeded_by": "20260526290000_core_email_template_seed"}'::jsonb),
    ('63000000-0000-0000-0000-000000000008'::uuid, 'document_ready', 'Document ready', 'email', 'Document ready for review', 'Hi {{buyer_name}},

A document is ready for review. Please follow the instructions provided by Southwest Virginia Chihuahua.

This message is a preview template only until email sending is explicitly enabled.', 'draft', '{"preview_only": true, "send_enabled": false, "provider_connected": false, "owner_admin_approval_required": true, "category": "transactional", "merge_fields": ["buyer_name", "document_title", "document_type", "business_name"], "seeded_by": "20260526290000_core_email_template_seed"}'::jsonb),
    ('63000000-0000-0000-0000-000000000009'::uuid, 'staff_alert', 'Staff alert', 'email', 'Core staff alert', 'Core generated an internal staff alert.

Alert type: {{alert_type}}
Context: {{alert_context}}

This message is a preview template only until email sending is explicitly enabled.', 'draft', '{"preview_only": true, "send_enabled": false, "provider_connected": false, "owner_admin_approval_required": true, "category": "internal", "merge_fields": ["alert_type", "alert_context", "business_name"], "seeded_by": "20260526290000_core_email_template_seed"}'::jsonb)
)
insert into public.core_message_templates (
  id,
  template_key,
  name,
  channel,
  subject_template,
  body_template,
  status,
  metadata
)
select
  ts.id,
  ts.template_key,
  ts.name,
  ts.channel,
  ts.subject_template,
  ts.body_template,
  ts.status,
  ts.metadata
from template_seed ts
where not exists (
  select 1
  from public.core_message_templates mt
  where mt.id = ts.id
);

comment on table public.core_message_templates is
  'Draft/approved communication templates only; no automated sending authority. Initial Core email templates are seeded as preview-only draft records.';
