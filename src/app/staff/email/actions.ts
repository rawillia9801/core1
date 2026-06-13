"use server";

import { redirect } from "next/navigation";
import { getSmtpDeliveryConfig, sendSmtpMail } from "@/lib/core/smtp-mailer";
import { requireStaffProfile } from "@/lib/staff-auth";

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

type TestOutcome =
  | "sent"
  | "config_missing"
  | "invalid_recipient"
  | "unauthorized"
  | "smtp_auth_failed"
  | "smtp_connection_failed"
  | "smtp_rejected"
  | "send_failed";

function getRestConfig() {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return supabaseUrl && serviceRoleKey ? { restUrl: `${supabaseUrl}/rest/v1`, serviceRoleKey } : null;
}

function classifySmtpError(error: unknown): TestOutcome {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (message.includes("auth") || message.includes("535") || message.includes("authentication")) return "smtp_auth_failed";
  if (message.includes("connect") || message.includes("timeout") || message.includes("econn") || message.includes("enotfound") || message.includes("tls")) return "smtp_connection_failed";
  if (message.includes("rcpt") || message.includes("recipient") || message.includes("rejected") || message.includes("550") || message.includes("554")) return "smtp_rejected";
  return "send_failed";
}

async function logAttempt(outcome: TestOutcome, recipient: string, subject: string) {
  const config = getRestConfig();
  if (!config) return;
  const status = outcome === "sent" ? "sent" : outcome === "config_missing" || outcome === "invalid_recipient" || outcome === "unauthorized" ? "skipped" : "failed";
  await fetch(`${config.restUrl}/core_notification_delivery_attempts`, {
    method: "POST",
    headers: {
      apikey: config.serviceRoleKey,
      authorization: `Bearer ${config.serviceRoleKey}`,
      "content-type": "application/json",
      prefer: "return=minimal",
    },
    body: JSON.stringify({
      provider: "smtp",
      channel: "email",
      status,
      recipient_email: EMAIL_PATTERN.test(recipient) ? recipient : null,
      subject,
      idempotency_key: `smtp-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      completed_at: new Date().toISOString(),
      error_message: outcome === "sent" ? null : outcome,
      request_payload: { source: "staff_email_test", subject },
      response_payload: { outcome },
      metadata: { test_send: true, safe_result: outcome },
    }),
    cache: "no-store",
  }).catch(() => undefined);
}

export async function sendSmtpTestEmail(formData: FormData) {
  const subject = "Core SMTP Test - Southwest Virginia Chihuahua";
  let outcome: TestOutcome = "send_failed";
  const recipient = String(formData.get("recipient") ?? "").trim();
  const staff = await requireStaffProfile();

  if (staff.role !== "owner" && staff.role !== "admin") {
    outcome = "unauthorized";
    await logAttempt(outcome, recipient, subject);
    redirect(`/staff/email/test?email=${outcome}`);
  }

  if (!EMAIL_PATTERN.test(recipient)) {
    outcome = "invalid_recipient";
    await logAttempt(outcome, recipient, subject);
    redirect(`/staff/email/test?email=${outcome}`);
  }

  const config = getSmtpDeliveryConfig();
  if (!config) {
    outcome = "config_missing";
    await logAttempt(outcome, recipient, subject);
    redirect(`/staff/email/test?email=${outcome}`);
  }

  try {
    await sendSmtpMail(config, {
      to: recipient,
      subject,
      text: `This is a one-time SMTP test email from Cherolee Core using the configured SMTP sender (${config.from}).\n\nNo customer workflow, template automation, payment reminder, document notice, portal update, SMS, Facebook message, or provider action was triggered.`,
      replyTo: process.env.SMTP_REPLY_TO || null,
    });

    outcome = "sent";
    await logAttempt(outcome, recipient, subject);
  } catch (error) {
    outcome = classifySmtpError(error);
    await logAttempt(outcome, recipient, subject);
  }

  redirect(`/staff/email/test?email=${outcome}`);
}
