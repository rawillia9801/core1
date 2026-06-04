-- Strengthen the reservation cancellation email template safety language.
--
-- Business rule:
--   * Template existence never authorizes sending.
--   * This repair does not connect SMTP, Resend, Twilio, Facebook, AI, or any provider.
--   * The cancellation notice does not process refunds, credits, fees, or payment movement.

update public.core_message_templates
set
  body_template = 'Hi {{buyer_name}},

We are writing to confirm that your puppy reservation status has been updated to cancelled.

Reason noted: {{cancellation_reason}}

This message is only a reservation status notice. It does not imply a refund. It does not imply that a refund has been issued or approved. Any refund, credit, fee, or payment adjustment requires separate owner review and a separate confirmed action. No payment movement occurs from this cancellation notice itself.

If you believe this cancellation was made in error, or if there is anything we should review, please contact us so we can look into it.

This message is a preview template only until email sending is explicitly enabled.',
  metadata = metadata
    || jsonb_build_object(
      'preview_only', true,
      'send_enabled', false,
      'provider_connected', false,
      'owner_admin_approval_required', true,
      'safety_note', 'Cancellation template must not imply refund or payment movement. Refunds, credits, fees, and payment adjustments require separate owner review and action.',
      'safety_repaired_by', '20260526410000_core_email_template_reservation_cancelled_safety_repair'
    ),
  updated_at = now()
where template_key = 'reservation_cancelled'
  and channel = 'email';
