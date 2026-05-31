-- Warm Southwest Virginia Chihuahua email template refresh.
--
-- Business rule:
--   * These remain draft/preview-only template records.
--   * Template existence never authorizes sending.
--   * Hostinger SMTP remains disconnected.
--   * No email is sent by this migration.
--   * Customer-facing template copy must not mention the internal operator/system name.

with template_seed (
  old_id,
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
      '70000001-1001-4001-8001-000000000001'::uuid,
      'application_received',
      'Application received',
      'email',
      'Your puppy application has been received',
      'Tiny hearts. Lifelong love.

Hi {{applicant_name}},

We received your puppy application with Southwest Virginia Chihuahua.

Thank you for taking the time to share your information with us. Choosing the right puppy and the right family is personal to us, so we review every application carefully and look at household fit, timing, puppy availability, and long-term placement needs before moving forward.

Application Details
Applicant: {{applicant_name}}
Email: {{applicant_email}}
Application ID: {{application_id}}

What happens next?

- We will review your application and contact you if anything else is needed.
- If approved, we will follow up with puppy availability, reservation details, and next steps.
- You can use your puppy portal for updates, documents, payment details, and messages as your puppy moves forward.

If anything on your application needs to be changed, you can reply to this email or contact us directly. We are happy to help.

With care,
Southwest Virginia Chihuahua

Southwest Virginia Chihuahua
Smart Chihuahua Care

This email was sent because an application was submitted using your contact information.',
      'draft',
      '{"preview_only": true, "send_enabled": false, "provider_connected": false, "owner_admin_approval_required": true, "category": "transactional", "merge_fields": ["applicant_name", "applicant_email", "application_id", "business_name"], "seeded_by": "20260526330000_warm_email_templates", "style_reference": "warm_puppy_application_received_card"}'::jsonb
    ),
    (
      '63000000-0000-0000-0000-000000000002'::uuid,
      '70000002-1002-4002-8002-000000000002'::uuid,
      'application_approved',
      'Application approved',
      'email',
      'Your puppy application has been approved',
      'Hi {{applicant_name}},

We are happy to let you know that your puppy application has been approved.

This means we can move forward with discussing available puppies, timing, reservation details, and the next steps that make the most sense for your family. Approval does not automatically reserve a puppy, but it does let us continue the process with you in a more direct way.

We will follow up with the information needed for reservation planning, including any puppy availability, deposit or payment details, and go-home expectations. Please keep an eye out for the next message from us.

Thank you again for your interest in Southwest Virginia Chihuahua.

Warmly,
Southwest Virginia Chihuahua',
      'draft',
      '{"preview_only": true, "send_enabled": false, "provider_connected": false, "owner_admin_approval_required": true, "category": "transactional", "merge_fields": ["applicant_name", "application_id", "business_name"], "seeded_by": "20260526330000_warm_email_templates"}'::jsonb
    ),
    (
      '63000000-0000-0000-0000-000000000003'::uuid,
      '70000003-1003-4003-8003-000000000003'::uuid,
      'reservation_created',
      'Reservation created',
      'email',
      'Your puppy reservation has been created',
      'Hi {{buyer_name}},

Your puppy reservation has been created for {{puppy_name}}.

We are excited to continue helping you prepare for your puppy. Your reservation details will guide the next steps, including payment expectations, document preparation, puppy updates, and go-home planning.

Please review the reservation information carefully when it is provided. If anything looks incorrect, or if your timing or contact information has changed, please let us know as soon as possible so we can keep everything accurate.

Thank you for choosing Southwest Virginia Chihuahua. We know this is an important decision, and we appreciate the opportunity to be part of it.

Warmly,
Southwest Virginia Chihuahua',
      'draft',
      '{"preview_only": true, "send_enabled": false, "provider_connected": false, "owner_admin_approval_required": true, "category": "transactional", "merge_fields": ["buyer_name", "reservation_id", "puppy_name", "business_name"], "seeded_by": "20260526330000_warm_email_templates"}'::jsonb
    ),
    (
      '63000000-0000-0000-0000-000000000004'::uuid,
      '70000004-1004-4004-8004-000000000004'::uuid,
      'payment_received',
      'Payment received',
      'email',
      'We received your puppy payment',
      'Hi {{buyer_name}},

Thank you. We have recorded a payment of {{amount}} toward your puppy reservation.

Your current recorded balance is {{balance_due}}. Please keep this message with your puppy records, and let us know if you believe any payment detail needs to be reviewed.

This notice is meant to confirm the payment information recorded by Southwest Virginia Chihuahua. If the payment was made through a separate payment service, final settlement is still subject to that provider successfully processing the payment.

We appreciate you and are excited to continue preparing for your puppy.

Warmly,
Southwest Virginia Chihuahua',
      'draft',
      '{"preview_only": true, "send_enabled": false, "provider_connected": false, "owner_admin_approval_required": true, "category": "transactional", "merge_fields": ["buyer_name", "reservation_id", "amount", "balance_due", "business_name"], "seeded_by": "20260526330000_warm_email_templates"}'::jsonb
    ),
    (
      '63000000-0000-0000-0000-000000000005'::uuid,
      '70000005-1005-4005-8005-000000000005'::uuid,
      'payment_reminder',
      'Payment reminder',
      'email',
      'Friendly puppy payment reminder',
      'Hi {{buyer_name}},

This is a friendly reminder that a payment may be due for your puppy reservation.

Amount due: {{amount_due}}
Due date: {{due_date}}

Please review your agreement and payment schedule. If you have already taken care of this, thank you. If you have a question, need us to review the balance, or believe something does not look right, please reach out before making another payment.

We want the process to stay clear and organized for everyone, especially as we get closer to go-home planning.

Warmly,
Southwest Virginia Chihuahua',
      'draft',
      '{"preview_only": true, "send_enabled": false, "provider_connected": false, "owner_admin_approval_required": true, "category": "transactional", "merge_fields": ["buyer_name", "reservation_id", "amount_due", "due_date", "business_name"], "seeded_by": "20260526330000_warm_email_templates"}'::jsonb
    ),
    (
      '63000000-0000-0000-0000-000000000006'::uuid,
      '70000006-1006-4006-8006-000000000006'::uuid,
      'reservation_cancelled',
      'Reservation cancelled',
      'email',
      'Reservation status update',
      'Hi {{buyer_name}},

We are writing to confirm that your puppy reservation status has been updated to cancelled.

Reason noted: {{cancellation_reason}}

This message is only a reservation status notice. It does not imply that a refund has been issued or approved. Any refund, credit, fee, or balance adjustment must be reviewed separately and confirmed in writing.

If you believe this cancellation was made in error, or if there is anything we should review, please contact us so we can look into it.

Warmly,
Southwest Virginia Chihuahua',
      'draft',
      '{"preview_only": true, "send_enabled": false, "provider_connected": false, "owner_admin_approval_required": true, "category": "transactional", "merge_fields": ["buyer_name", "reservation_id", "cancellation_reason", "business_name"], "safety_note": "Cancellation template must not imply refund.", "seeded_by": "20260526330000_warm_email_templates"}'::jsonb
    ),
    (
      '63000000-0000-0000-0000-000000000007'::uuid,
      '70000007-1007-4007-8007-000000000007'::uuid,
      'go_home_reminder',
      'Go-home reminder',
      'email',
      'Getting ready for puppy go-home day',
      'Hi {{buyer_name}},

Puppy go-home day is getting closer, and we want to help make the transition as smooth as possible.

Current go-home time: {{go_home_at}}
Meeting location: {{meeting_location}}

Before go-home, please review any remaining balance, document, supply, feeding, and scheduling details that have been provided. If your plans have changed or you need help preparing, please reach out so we can help clarify the next steps.

We are excited for you and want your puppy to have the safest, most comfortable transition possible.

Warmly,
Southwest Virginia Chihuahua',
      'draft',
      '{"preview_only": true, "send_enabled": false, "provider_connected": false, "owner_admin_approval_required": true, "category": "transactional", "merge_fields": ["buyer_name", "reservation_id", "go_home_at", "meeting_location", "business_name"], "seeded_by": "20260526330000_warm_email_templates"}'::jsonb
    ),
    (
      '63000000-0000-0000-0000-000000000008'::uuid,
      '70000008-1008-4008-8008-000000000008'::uuid,
      'document_ready',
      'Document ready',
      'email',
      'Your puppy document is ready for review',
      'Hi {{buyer_name}},

A puppy document is ready for your review.

Document: {{document_title}}
Type: {{document_type}}

Please take time to review it carefully. If a signature, confirmation, or follow-up step is needed, we will include those instructions with the document. If anything appears incorrect, please let us know before signing or relying on the document.

Thank you for helping us keep your puppy records organized and accurate.

Warmly,
Southwest Virginia Chihuahua',
      'draft',
      '{"preview_only": true, "send_enabled": false, "provider_connected": false, "owner_admin_approval_required": true, "category": "transactional", "merge_fields": ["buyer_name", "document_title", "document_type", "business_name"], "seeded_by": "20260526330000_warm_email_templates"}'::jsonb
    ),
    (
      '63000000-0000-0000-0000-000000000009'::uuid,
      '70000009-1009-4009-8009-000000000009'::uuid,
      'staff_alert',
      'Staff alert',
      'email',
      'Staff alert: {{alert_type}}',
      'Staff alert

Alert type: {{alert_type}}
Context: {{alert_context}}

Please review this item in the staff workspace and take any needed follow-up action. This alert is internal only and should not be sent to a customer.',
      'draft',
      '{"preview_only": true, "send_enabled": false, "provider_connected": false, "owner_admin_approval_required": true, "category": "internal", "merge_fields": ["alert_type", "alert_context", "business_name"], "seeded_by": "20260526330000_warm_email_templates"}'::jsonb
    )
), inserted_templates as (
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
    id,
    template_key,
    name,
    channel,
    subject_template,
    body_template,
    status,
    metadata
  from template_seed
  on conflict (id) do update set
    template_key = excluded.template_key,
    name = excluded.name,
    channel = excluded.channel,
    subject_template = excluded.subject_template,
    body_template = excluded.body_template,
    status = excluded.status,
    metadata = excluded.metadata,
    updated_at = now()
  returning id
), updated_notifications as (
  update public.core_notifications n
  set template_id = ts.id,
      updated_at = now()
  from template_seed ts
  where n.template_id = ts.old_id
  returning n.id
), updated_attempts as (
  update public.core_notification_delivery_attempts a
  set template_id = ts.id,
      updated_at = now()
  from template_seed ts
  where a.template_id = ts.old_id
  returning a.id
), removed_old_templates as (
  delete from public.core_message_templates mt
  using template_seed ts
  where mt.id = ts.old_id
    and mt.id <> ts.id
  returning mt.id
)
select
  (select count(*) from inserted_templates) as templates_upserted,
  (select count(*) from updated_notifications) as notifications_relinked,
  (select count(*) from updated_attempts) as attempts_relinked,
  (select count(*) from removed_old_templates) as old_templates_removed;
