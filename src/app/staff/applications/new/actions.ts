"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaffProfile } from "@/lib/staff-auth";

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

type ManualApplicationOutcome =
  | "created"
  | "created-no-notification"
  | "created-notification-warning"
  | "unauthorized"
  | "invalid_contact"
  | "invalid_terms"
  | "invalid_input"
  | "error";

type ManualApplicationRpcResult = {
  buyer_id: string | null;
  family_id: string | null;
  application_id: string | null;
  application_status: string | null;
  section_count: number | null;
  event_id: string | null;
  audit_log_id: string | null;
};

function logManualApplicationFailure(reason: string, details?: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "production") {
    console.error("[core manual application]", reason, details ?? {});
  }
}

function isRedirectError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

function getManualApplicationConfig() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Manual application entry is disabled until staging/production authorization is approved.");
  }

  const supabaseUrl = (
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  )?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    logManualApplicationFailure("missing local/development manual application configuration", {
      hasSupabaseUrl: Boolean(supabaseUrl),
      hasServiceRoleKey: Boolean(serviceRoleKey),
    });
    throw new Error("Local/development manual application configuration is incomplete.");
  }

  return {
    restUrl: `${supabaseUrl}/rest/v1`,
    serviceRoleKey,
  };
}

function serverHeaders(serviceRoleKey: string) {
  return {
    apikey: serviceRoleKey,
    authorization: `Bearer ${serviceRoleKey}`,
    "content-type": "application/json",
  };
}

function readBoundedText(formData: FormData, field: string, maxLength: number) {
  const value = String(formData.get(field) ?? "").trim();

  if (!value) {
    return { valid: true, value: null };
  }

  if (value.length > maxLength) {
    return { valid: false, value: null };
  }

  return { valid: true, value };
}

function readAllowedText(formData: FormData, field: string, allowed: Set<string>, maxLength = 100) {
  const value = String(formData.get(field) ?? "").trim();

  if (!value) {
    return { valid: true, value: null };
  }

  if (value.length > maxLength || !allowed.has(value.toLowerCase())) {
    return { valid: false, value: null };
  }

  return { valid: true, value };
}

async function queueApplicationReceivedNotification({
  restUrl,
  serviceRoleKey,
  staffProfileId,
  recipientEmail,
  buyerId,
  familyId,
  applicationId,
  applicantFullName,
}: {
  restUrl: string;
  serviceRoleKey: string;
  staffProfileId: string;
  recipientEmail: string;
  buyerId: string | null;
  familyId: string | null;
  applicationId: string | null;
  applicantFullName: string;
}) {
  const notificationResponse = await fetch(`${restUrl}/rpc/core_queue_notification`, {
    method: "POST",
    headers: serverHeaders(serviceRoleKey),
    body: JSON.stringify({
      p_actor_profile_id: staffProfileId,
      p_notification_type: "application_received",
      p_channel: "email",
      p_recipient_email: recipientEmail,
      p_buyer_id: buyerId,
      p_family_id: familyId,
      p_application_id: applicationId,
      p_template_key: "application_received",
      p_subject: "Application received - Southwest Virginia Chihuahua",
      p_body_preview: "We received your puppy application and will review it soon.",
      p_metadata: {
        source: "core_manual_staff_entry",
        applicant_full_name: applicantFullName,
        preview_only: true,
        email_sending_connected: false,
      },
    }),
    cache: "no-store",
  });

  if (!notificationResponse.ok) {
    const responseBody = await notificationResponse.text().catch(() => "");
    logManualApplicationFailure("application_received notification queue failed after application creation", {
      applicationId,
      httpStatus: notificationResponse.status,
      responseBody,
    });

    return false;
  }

  return true;
}

export async function createManualApplication(formData: FormData) {
  let outcome: ManualApplicationOutcome = "error";

  try {
    const staff = await requireStaffProfile();

    if (staff.role !== "owner" && staff.role !== "admin") {
      logManualApplicationFailure("staff profile is not authorized for manual application creation", {
        staffProfileId: staff.id,
        staffRole: staff.role,
      });
      redirect("/staff/applications/new?application=unauthorized");
    }

    const applicantFullName = readBoundedText(formData, "applicantFullName", 200);
    const email = readBoundedText(formData, "email", 320);
    const phone = readBoundedText(formData, "phone", 50);
    const preferredContactMethod = readAllowedText(
      formData,
      "preferredContactMethod",
      new Set(["email", "phone", "text", "sms", "no preference"]),
    );
    const interestType = readBoundedText(formData, "interestType", 100);
    const preferredCoatType = readAllowedText(
      formData,
      "preferredCoatType",
      new Set(["smooth coat", "long coat", "no preference", "undecided"]),
    );
    const preferredGender = readAllowedText(
      formData,
      "preferredGender",
      new Set(["male", "female", "no preference", "undecided"]),
    );
    const colorPreference = readBoundedText(formData, "colorPreference", 200);
    const otherPets = readBoundedText(formData, "otherPets", 1000);
    const householdNotes = readBoundedText(formData, "householdNotes", 2000);
    const readinessNotes = readBoundedText(formData, "readinessNotes", 2000);
    const paymentPreference = readBoundedText(formData, "paymentPreference", 1000);
    const staffNotes = readBoundedText(formData, "staffNotes", 2000);
    const termsAcknowledged = formData.get("termsAcknowledged") === "on";

    const allTextFields = [
      applicantFullName,
      email,
      phone,
      preferredContactMethod,
      interestType,
      preferredCoatType,
      preferredGender,
      colorPreference,
      otherPets,
      householdNotes,
      readinessNotes,
      paymentPreference,
      staffNotes,
    ];

    if (allTextFields.some((field) => !field.valid)) {
      logManualApplicationFailure("bounded manual application input exceeded maximum length or allowed values", {
        staffProfileId: staff.id,
      });
      redirect("/staff/applications/new?application=invalid_input");
    }

    if (!applicantFullName.value || (!email.value && !phone.value)) {
      logManualApplicationFailure("manual application missing required applicant/contact fields", {
        staffProfileId: staff.id,
        hasApplicantFullName: Boolean(applicantFullName.value),
        hasEmail: Boolean(email.value),
        hasPhone: Boolean(phone.value),
      });
      redirect("/staff/applications/new?application=invalid_contact");
    }

    if (email.value && !EMAIL_PATTERN.test(email.value)) {
      logManualApplicationFailure("manual application email failed format validation", {
        staffProfileId: staff.id,
      });
      redirect("/staff/applications/new?application=invalid_contact");
    }

    if (!termsAcknowledged) {
      logManualApplicationFailure("manual application terms were not acknowledged", {
        staffProfileId: staff.id,
      });
      redirect("/staff/applications/new?application=invalid_terms");
    }

    const { restUrl, serviceRoleKey } = getManualApplicationConfig();
    const rpcResponse = await fetch(`${restUrl}/rpc/core_create_application_manual`, {
      method: "POST",
      headers: serverHeaders(serviceRoleKey),
      body: JSON.stringify({
        p_actor_profile_id: staff.id,
        p_applicant_full_name: applicantFullName.value,
        p_email: email.value,
        p_phone: phone.value,
        p_preferred_contact_method: preferredContactMethod.value,
        p_interest_type: interestType.value,
        p_preferred_coat_type: preferredCoatType.value,
        p_preferred_gender: preferredGender.value,
        p_color_preference: colorPreference.value,
        p_other_pets: otherPets.value,
        p_household_notes: householdNotes.value,
        p_readiness_notes: readinessNotes.value,
        p_payment_preference: paymentPreference.value,
        p_terms_acknowledged: termsAcknowledged,
        p_staff_notes: staffNotes.value,
        p_source: "core_manual_staff_entry",
      }),
      cache: "no-store",
    });

    if (rpcResponse.ok) {
      const rpcRows = (await rpcResponse.json().catch(() => [])) as ManualApplicationRpcResult[];
      const createdApplication = rpcRows[0] ?? null;
      let notificationQueued = true;
      let notificationSkipped = false;

      if (email.value) {
        notificationQueued = await queueApplicationReceivedNotification({
          restUrl,
          serviceRoleKey,
          staffProfileId: staff.id,
          recipientEmail: email.value,
          buyerId: createdApplication?.buyer_id ?? null,
          familyId: createdApplication?.family_id ?? null,
          applicationId: createdApplication?.application_id ?? null,
          applicantFullName: applicantFullName.value,
        });
      } else {
        notificationSkipped = true;
      }

      revalidatePath("/staff");
      revalidatePath("/staff/notifications");
      revalidatePath("/staff/applications/new");
      outcome = notificationSkipped
        ? "created-no-notification"
        : notificationQueued
          ? "created"
          : "created-notification-warning";
    } else {
      const responseBody = await rpcResponse.text().catch(() => "");
      logManualApplicationFailure("manual application RPC failed", {
        httpStatus: rpcResponse.status,
        responseBody,
      });
      outcome = "error";
    }
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    logManualApplicationFailure("manual application action threw an error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    outcome = "error";
  }

  redirect(`/staff?application=${outcome}`);
}
