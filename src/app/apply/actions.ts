"use server";

import { redirect } from "next/navigation";
import { getSmtpConfig, sendSmtpMail } from "@/lib/core/smtp-mailer";

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

type CreatedApplication = {
  buyerId: string;
  familyId: string;
  applicationId: string;
};

function getRestConfig() {
  const supabaseUrl = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing Supabase server write configuration.");
  return { restUrl: `${supabaseUrl}/rest/v1`, serviceRoleKey };
}

function headers(serviceRoleKey: string, prefer = "return=representation") {
  return {
    apikey: serviceRoleKey,
    authorization: `Bearer ${serviceRoleKey}`,
    "content-type": "application/json",
    prefer,
  };
}

function readText(formData: FormData, field: string, maxLength: number, required = false) {
  const value = String(formData.get(field) ?? "").trim();
  if (required && !value) throw new Error(`${field} is required`);
  if (value.length > maxLength) throw new Error(`${field} exceeds ${maxLength} characters`);
  return value || null;
}

function normalizePhone(value: string | null) {
  const normalized = value?.replace(/[^0-9+]/g, "") ?? "";
  return normalized || null;
}

function splitName(fullName: string) {
  const firstName = fullName.split(/\s+/)[0] ?? fullName;
  const lastName = fullName.slice(firstName.length).trim() || null;
  return { firstName, lastName };
}

async function insertRow<T>(restUrl: string, serviceRoleKey: string, table: string, body: Record<string, unknown>) {
  const response = await fetch(`${restUrl}/${table}`, {
    method: "POST",
    headers: headers(serviceRoleKey),
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`${table} insert failed: ${response.status}`);
  const rows = (await response.json()) as T[];
  return rows[0];
}

async function insertSilent(restUrl: string, serviceRoleKey: string, table: string, body: Record<string, unknown>) {
  const response = await fetch(`${restUrl}/${table}`, {
    method: "POST",
    headers: headers(serviceRoleKey, "return=minimal"),
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`${table} insert failed: ${response.status}`);
}

async function createApplication(formData: FormData): Promise<CreatedApplication> {
  const { restUrl, serviceRoleKey } = getRestConfig();
  const applicantFullName = readText(formData, "applicantFullName", 200, true) as string;
  const email = readText(formData, "email", 320, true) as string;
  const phone = readText(formData, "phone", 50);
  const streetAddress = readText(formData, "streetAddress", 200);
  const city = readText(formData, "city", 100);
  const state = readText(formData, "state", 80);
  const postalCode = readText(formData, "postalCode", 30);
  const preferredContactMethod = readText(formData, "preferredContactMethod", 60);
  const interestType = readText(formData, "interestType", 100);
  const preferredCoatType = readText(formData, "preferredCoatType", 100);
  const preferredGender = readText(formData, "preferredGender", 100);
  const colorPreference = readText(formData, "colorPreference", 200);
  const desiredTiming = readText(formData, "desiredTiming", 200);
  const householdNotes = readText(formData, "householdNotes", 2000);
  const otherPets = readText(formData, "otherPets", 1000);
  const readinessNotes = readText(formData, "readinessNotes", 2000);
  const vetReference = readText(formData, "vetReference", 1000);
  const paymentPreference = readText(formData, "paymentPreference", 1000);
  const transportPreference = readText(formData, "transportPreference", 1000);
  const additionalNotes = readText(formData, "additionalNotes", 2000);
  const termsAcknowledged = formData.get("termsAcknowledged") === "on";

  if (!EMAIL_PATTERN.test(email)) throw new Error("invalid email");
  if (!termsAcknowledged) throw new Error("terms required");

  const { firstName, lastName } = splitName(applicantFullName);
  const buyer = await insertRow<{ id: string }>(restUrl, serviceRoleKey, "core_buyers", {
    first_name: firstName,
    last_name: lastName,
    email,
    email_normalized: email.toLowerCase(),
    phone,
    phone_normalized: normalizePhone(phone),
    street_address: streetAddress,
    city,
    state,
    postal_code: postalCode,
    approval_status: "pending",
    source: "public_customer_application",
    metadata: { applicant_name_raw: applicantFullName, submitted_from: "public_apply_form" },
  });

  const family = await insertRow<{ id: string }>(restUrl, serviceRoleKey, "core_families", {
    name: `${applicantFullName} Family`,
    status: "active",
    notes: "Created from public customer application form.",
    metadata: { source: "public_customer_application" },
  });

  await insertSilent(restUrl, serviceRoleKey, "core_family_members", {
    family_id: family.id,
    buyer_id: buyer.id,
    relationship: "applicant",
    is_primary_contact: true,
    portal_access_status: "not_invited",
    metadata: { source: "public_customer_application" },
  });

  const application = await insertRow<{ id: string }>(restUrl, serviceRoleKey, "core_applications", {
    family_id: family.id,
    buyer_id: buyer.id,
    status: "received",
    submitted_at: new Date().toISOString(),
    source: "public_customer_application",
    metadata: { terms_acknowledged: true, applicant_full_name: applicantFullName },
  });

  await insertSilent(restUrl, serviceRoleKey, "core_application_sections", {
    application_id: application.id,
    section_key: "customer_application",
    section_label: "Customer Application",
    status: "received",
    responses: {
      applicantFullName,
      email,
      phone,
      streetAddress,
      city,
      state,
      postalCode,
      preferredContactMethod,
      interestType,
      preferredCoatType,
      preferredGender,
      colorPreference,
      desiredTiming,
      householdNotes,
      otherPets,
      readinessNotes,
      vetReference,
      paymentPreference,
      transportPreference,
      additionalNotes,
      termsAcknowledged,
    },
  });

  await insertSilent(restUrl, serviceRoleKey, "core_events", {
    event_type: "public_application_received",
    event_at: new Date().toISOString(),
    summary: `Public application received from ${applicantFullName}`,
    source: "public_apply_form",
    buyer_id: buyer.id,
    family_id: family.id,
    application_id: application.id,
    related_table: "core_applications",
    related_id: application.id,
    details: { email, phone, external_side_effects: "smtp_attempted_after_insert" },
  });

  return { buyerId: buyer.id, familyId: family.id, applicationId: application.id };
}

function applicationEmailText(formData: FormData, applicationId: string) {
  const name = String(formData.get("applicantFullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const interest = String(formData.get("interestType") ?? "").trim();
  const timing = String(formData.get("desiredTiming") ?? "").trim();
  const notes = String(formData.get("additionalNotes") ?? "").trim();

  return `New puppy application received\n\nApplication ID: ${applicationId}\nName: ${name}\nEmail: ${email}\nPhone: ${phone || "Not provided"}\nInterest: ${interest || "Not provided"}\nTiming: ${timing || "Not provided"}\nNotes: ${notes || "None"}`;
}

async function sendApplicationEmails(formData: FormData, applicationId: string) {
  const config = getSmtpConfig();
  if (!config) return "email_not_configured";

  const customerEmail = String(formData.get("email") ?? "").trim();
  const customerName = String(formData.get("applicantFullName") ?? "").trim();
  const ownerText = applicationEmailText(formData, applicationId);
  const customerText = `Hi ${customerName},\n\nWe received your puppy application for Southwest Virginia Chihuahua.\n\nWe will review it and follow up as soon as possible.\n\nApplication ID: ${applicationId}\n\nThank you,\nSouthwest Virginia Chihuahua`;

  await sendSmtpMail(config, {
    to: config.ownerTo,
    subject: "New puppy application received",
    text: ownerText,
    replyTo: customerEmail,
  });

  await sendSmtpMail(config, {
    to: customerEmail,
    subject: "We received your puppy application",
    text: customerText,
  });

  return "email_sent";
}

export async function submitCustomerApplication(formData: FormData) {
  let outcome = "error";
  try {
    const created = await createApplication(formData);
    outcome = await sendApplicationEmails(formData, created.applicationId);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[public customer application]", error);
    }
    outcome = error instanceof Error && error.message.includes("email") ? "email_warning" : "error";
  }

  redirect(`/apply/received?status=${encodeURIComponent(outcome)}`);
}
