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

function readCheckbox(formData: FormData, field: string) {
  return formData.get(field) === "on";
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

function redirectTarget(formData: FormData, outcome: string) {
  const requested = String(formData.get("returnTo") ?? "/apply/received").trim();
  const safePath = requested.startsWith("/embed/application/received") ? "/embed/application/received" : "/apply/received";
  return `${safePath}?status=${encodeURIComponent(outcome)}`;
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

function readApplicationPayload(formData: FormData) {
  const payload = {
    applicantFullName: readText(formData, "applicantFullName", 200, true) as string,
    email: readText(formData, "email", 320, true) as string,
    phone: readText(formData, "phone", 50),
    streetAddress: readText(formData, "streetAddress", 200),
    city: readText(formData, "city", 100),
    state: readText(formData, "state", 80, true) as string,
    postalCode: readText(formData, "postalCode", 30),
    preferredContactMethod: readText(formData, "preferredContactMethod", 60),
    preferredCoatType: readText(formData, "preferredCoatType", 100),
    preferredGender: readText(formData, "preferredGender", 100),
    colorPreference: readText(formData, "colorPreference", 200),
    desiredAdoptionDate: readText(formData, "desiredAdoptionDate", 40),
    interestType: readText(formData, "interestType", 100),
    otherPets: readText(formData, "otherPets", 100),
    petDetails: readText(formData, "petDetails", 1500),
    ownedChihuahuaBefore: readText(formData, "ownedChihuahuaBefore", 20),
    homeType: readText(formData, "homeType", 100),
    fencedYard: readText(formData, "fencedYard", 20),
    workStatus: readText(formData, "workStatus", 100),
    puppyCaregiver: readText(formData, "puppyCaregiver", 300),
    childrenAtHome: readText(formData, "childrenAtHome", 1000),
    paymentPreference: readText(formData, "paymentPreference", 200),
    howHeard: readText(formData, "howHeard", 200),
    readyDeposit: readText(formData, "readyDeposit", 20),
    questions: readText(formData, "questions", 2000),
    signature: readText(formData, "signature", 200, true) as string,
    signedAt: readText(formData, "signedAt", 80),
    termsAcknowledged: readCheckbox(formData, "termsAcknowledged"),
    declarationsAcknowledged: readCheckbox(formData, "declarationsAcknowledged"),
  };

  if (!EMAIL_PATTERN.test(payload.email)) throw new Error("invalid email");
  if (!payload.termsAcknowledged) throw new Error("terms required");
  if (!payload.declarationsAcknowledged) throw new Error("declarations required");
  if (payload.signature.toLowerCase() !== payload.applicantFullName.toLowerCase()) {
    throw new Error("signature must match applicant name");
  }

  return payload;
}

async function createApplication(formData: FormData): Promise<CreatedApplication> {
  const payload = readApplicationPayload(formData);
  const { restUrl, serviceRoleKey } = getRestConfig();
  const { firstName, lastName } = splitName(payload.applicantFullName);

  const buyer = await insertRow<{ id: string }>(restUrl, serviceRoleKey, "core_buyers", {
    first_name: firstName,
    last_name: lastName,
    email: payload.email,
    email_normalized: payload.email.toLowerCase(),
    phone: payload.phone,
    phone_normalized: normalizePhone(payload.phone),
    street_address: payload.streetAddress,
    city: payload.city,
    state: payload.state,
    postal_code: payload.postalCode,
    approval_status: "pending",
    source: "website_customer_application",
    metadata: {
      applicant_name_raw: payload.applicantFullName,
      submitted_from: "website_embed_application",
      preferred_contact_method: payload.preferredContactMethod,
    },
  });

  const family = await insertRow<{ id: string }>(restUrl, serviceRoleKey, "core_families", {
    name: `${payload.applicantFullName} Family`,
    status: "active",
    notes: "Created from website puppy application form.",
    metadata: { source: "website_customer_application" },
  });

  await insertSilent(restUrl, serviceRoleKey, "core_family_members", {
    family_id: family.id,
    buyer_id: buyer.id,
    relationship: "applicant",
    is_primary_contact: true,
    portal_access_status: "not_invited",
    metadata: { source: "website_customer_application" },
  });

  const application = await insertRow<{ id: string }>(restUrl, serviceRoleKey, "core_applications", {
    family_id: family.id,
    buyer_id: buyer.id,
    status: "received",
    submitted_at: new Date().toISOString(),
    source: "website_customer_application",
    metadata: {
      terms_acknowledged: payload.termsAcknowledged,
      declarations_acknowledged: payload.declarationsAcknowledged,
      applicant_full_name: payload.applicantFullName,
      signed_at: payload.signedAt,
      signature: payload.signature,
    },
  });

  await insertSilent(restUrl, serviceRoleKey, "core_application_sections", {
    application_id: application.id,
    section_key: "applicant_info",
    section_label: "Section 1: Applicant Info",
    status: "received",
    responses: {
      applicantFullName: payload.applicantFullName,
      email: payload.email,
      phone: payload.phone,
      streetAddress: payload.streetAddress,
      city: payload.city,
      state: payload.state,
      postalCode: payload.postalCode,
      preferredContactMethod: payload.preferredContactMethod,
    },
  });

  await insertSilent(restUrl, serviceRoleKey, "core_application_sections", {
    application_id: application.id,
    section_key: "puppy_preferences",
    section_label: "Puppy Preferences",
    status: "received",
    responses: {
      preferredCoatType: payload.preferredCoatType,
      preferredGender: payload.preferredGender,
      colorPreference: payload.colorPreference,
      desiredAdoptionDate: payload.desiredAdoptionDate,
      interestType: payload.interestType,
    },
  });

  await insertSilent(restUrl, serviceRoleKey, "core_application_sections", {
    application_id: application.id,
    section_key: "lifestyle_home",
    section_label: "Lifestyle & Home",
    status: "received",
    responses: {
      otherPets: payload.otherPets,
      petDetails: payload.petDetails,
      ownedChihuahuaBefore: payload.ownedChihuahuaBefore,
      homeType: payload.homeType,
      fencedYard: payload.fencedYard,
      workStatus: payload.workStatus,
      puppyCaregiver: payload.puppyCaregiver,
      childrenAtHome: payload.childrenAtHome,
    },
  });

  await insertSilent(restUrl, serviceRoleKey, "core_application_sections", {
    application_id: application.id,
    section_key: "payment_agreement",
    section_label: "Payment & Agreement",
    status: "received",
    responses: {
      paymentPreference: payload.paymentPreference,
      howHeard: payload.howHeard,
      readyDeposit: payload.readyDeposit,
      questions: payload.questions,
      termsAcknowledged: payload.termsAcknowledged,
      declarationsAcknowledged: payload.declarationsAcknowledged,
      signedAt: payload.signedAt,
      signature: payload.signature,
    },
  });

  await insertSilent(restUrl, serviceRoleKey, "core_events", {
    event_type: "public_application_received",
    event_at: new Date().toISOString(),
    summary: `Website puppy application received from ${payload.applicantFullName}`,
    source: "website_application_form",
    buyer_id: buyer.id,
    family_id: family.id,
    application_id: application.id,
    related_table: "core_applications",
    related_id: application.id,
    details: { email: payload.email, phone: payload.phone, smtp_attempted_after_insert: true },
  });

  return { buyerId: buyer.id, familyId: family.id, applicationId: application.id };
}

function applicationEmailText(formData: FormData, applicationId: string) {
  const payload = readApplicationPayload(formData);
  return `New puppy application received\n\nApplication ID: ${applicationId}\nName: ${payload.applicantFullName}\nEmail: ${payload.email}\nPhone: ${payload.phone || "Not provided"}\nState: ${payload.state}\nPreferred Contact: ${payload.preferredContactMethod || "Not provided"}\nInterest Type: ${payload.interestType || "Not provided"}\nCoat: ${payload.preferredCoatType || "Not provided"}\nGender: ${payload.preferredGender || "Not provided"}\nColor: ${payload.colorPreference || "Not provided"}\nDesired Adoption Date: ${payload.desiredAdoptionDate || "Not provided"}\nOther Pets: ${payload.otherPets || "Not provided"}\nOwned Chihuahua Before: ${payload.ownedChihuahuaBefore || "Not provided"}\nHome Type: ${payload.homeType || "Not provided"}\nFenced Yard: ${payload.fencedYard || "Not provided"}\nWork Status: ${payload.workStatus || "Not provided"}\nPuppy Caregiver: ${payload.puppyCaregiver || "Not provided"}\nPayment Preference: ${payload.paymentPreference || "Not provided"}\nHow Heard: ${payload.howHeard || "Not provided"}\nReady Deposit: ${payload.readyDeposit || "Not provided"}\nQuestions: ${payload.questions || "None"}\nSignature: ${payload.signature}\nSigned At: ${payload.signedAt || "Not provided"}`;
}

async function sendApplicationEmails(formData: FormData, applicationId: string) {
  const config = getSmtpConfig();
  if (!config) return "email_not_configured";

  const payload = readApplicationPayload(formData);
  const customerText = `Hi ${payload.applicantFullName},\n\nWe received your puppy application for Southwest Virginia Chihuahua.\n\nWe will review your application and follow up as soon as possible.\n\nApplication ID: ${applicationId}\n\nThank you,\nSouthwest Virginia Chihuahua`;

  await sendSmtpMail(config, {
    to: config.ownerTo,
    subject: "New puppy application received",
    text: applicationEmailText(formData, applicationId),
    replyTo: payload.email,
  });

  await sendSmtpMail(config, {
    to: payload.email,
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
      console.error("[website customer application]", error);
    }
    outcome = error instanceof Error && error.message.toLowerCase().includes("smtp") ? "email_warning" : "error";
  }

  redirect(redirectTarget(formData, outcome));
}
