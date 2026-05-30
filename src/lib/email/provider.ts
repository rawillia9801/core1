export type EmailProviderName = "disabled" | "preview" | "smtp" | "resend";

export type EmailProviderStatus = "blocked" | "previewed";

export type EmailProviderMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string | null;
  notificationId?: string | null;
  templateKey?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
};

export type EmailProviderResult = {
  provider: EmailProviderName;
  status: EmailProviderStatus;
  sent: false;
  messageId: null;
  reason: string;
  preview: {
    to: string;
    subject: string;
    text: string;
    html: string | null;
    notificationId: string | null;
    templateKey: string | null;
  };
};

const SUPPORTED_PROVIDERS = new Set<EmailProviderName>([
  "disabled",
  "preview",
  "smtp",
  "resend",
]);

function normalizeProvider(value: string | undefined): EmailProviderName {
  const normalized = value?.trim().toLowerCase();

  if (normalized && SUPPORTED_PROVIDERS.has(normalized as EmailProviderName)) {
    return normalized as EmailProviderName;
  }

  return "disabled";
}

function isEnabled(value: string | undefined) {
  return value?.trim().toLowerCase() === "true";
}

function requireNonEmpty(value: string, label: string) {
  if (!value.trim()) {
    throw new Error(`${label} is required for email provider preview.`);
  }
}

function createPreview(
  message: EmailProviderMessage,
): EmailProviderResult["preview"] {
  return {
    to: message.to.trim(),
    subject: message.subject.trim(),
    text: message.text.trim(),
    html: message.html?.trim() || null,
    notificationId: message.notificationId?.trim() || null,
    templateKey: message.templateKey?.trim() || null,
  };
}

export function getConfiguredEmailProvider() {
  const provider = normalizeProvider(process.env.EMAIL_PROVIDER);
  const sendEnabled = isEnabled(process.env.EMAIL_SEND_ENABLED);
  const previewOnly = process.env.EMAIL_PREVIEW_ONLY
    ? isEnabled(process.env.EMAIL_PREVIEW_ONLY)
    : true;

  return {
    provider,
    sendEnabled,
    previewOnly,
    canAttemptDelivery: false,
    reason:
      "Email delivery is intentionally disabled. Core currently supports disabled/preview behavior only.",
  };
}

export async function sendEmailThroughConfiguredProvider(
  message: EmailProviderMessage,
): Promise<EmailProviderResult> {
  requireNonEmpty(message.to, "Recipient email");
  requireNonEmpty(message.subject, "Email subject");
  requireNonEmpty(message.text, "Email text body");

  const config = getConfiguredEmailProvider();
  const preview = createPreview(message);

  if (config.provider === "preview") {
    return {
      provider: "preview",
      status: "previewed",
      sent: false,
      messageId: null,
      reason:
        "Preview provider rendered the message without sending. No SMTP, Resend, or delivery worker is connected.",
      preview,
    };
  }

  if (config.provider === "smtp" || config.provider === "resend") {
    return {
      provider: config.provider,
      status: "blocked",
      sent: false,
      messageId: null,
      reason:
        "Requested provider is not implemented or enabled. This foundation refuses delivery until explicit SMTP/Resend tasks add approved send logging, credentials, and test-send rules.",
      preview,
    };
  }

  return {
    provider: "disabled",
    status: "blocked",
    sent: false,
    messageId: null,
    reason:
      "Disabled provider refused delivery. This is the default safety behavior for local, staging, and unfinished email workflows.",
    preview,
  };
}
