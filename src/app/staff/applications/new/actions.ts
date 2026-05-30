"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaffProfile } from "@/lib/staff-auth";

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

type ManualApplicationOutcome =
  | "created"
  | "unauthorized"
  | "invalid_contact"
  | "invalid_terms"
  | "invalid_input"
  | "error";

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
      revalidatePath("/staff");
      revalidatePath("/staff/applications/new");
      outcome = "created";
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
