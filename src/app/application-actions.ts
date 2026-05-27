"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const APPROVABLE_STATUSES = new Set(["received", "needs_review"]);
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ApplicationStatusRow = {
  status: string | null;
};

function logApprovalFailure(reason: string, details?: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "production") {
    console.error("[core approval]", reason, details ?? {});
  }
}

function getLocalApprovalConfig() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Approval actions are disabled outside local/development use.");
  }

  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const actorProfileId = process.env.CORE_APPROVAL_ACTOR_PROFILE_ID;

  if (!supabaseUrl || !serviceRoleKey || !actorProfileId || !UUID_PATTERN.test(actorProfileId)) {
    logApprovalFailure("missing or invalid local approval configuration", {
      hasSupabaseUrl: Boolean(supabaseUrl),
      hasServiceRoleKey: Boolean(serviceRoleKey),
      hasValidActorProfileId: Boolean(actorProfileId && UUID_PATTERN.test(actorProfileId)),
    });
    throw new Error("Local approval configuration is incomplete.");
  }

  return {
    restUrl: `${supabaseUrl}/rest/v1`,
    serviceRoleKey,
    actorProfileId,
  };
}

function serverHeaders(serviceRoleKey: string) {
  return {
    apikey: serviceRoleKey,
    authorization: `Bearer ${serviceRoleKey}`,
    "content-type": "application/json",
  };
}

export async function approveApplication(formData: FormData) {
  const applicationId = String(formData.get("applicationId") ?? "").trim();
  const decisionNotes = String(formData.get("decisionNotes") ?? "").trim().slice(0, 1000);
  let outcome = "error";

  if (!UUID_PATTERN.test(applicationId)) {
    logApprovalFailure("invalid application id submitted", { applicationId });
  } else {
    try {
      const { restUrl, serviceRoleKey, actorProfileId } = getLocalApprovalConfig();
      const applicationResponse = await fetch(
        `${restUrl}/core_applications?select=status&id=eq.${applicationId}`,
        {
          headers: serverHeaders(serviceRoleKey),
          cache: "no-store",
        },
      );

      if (!applicationResponse.ok) {
        const responseBody = await applicationResponse.text().catch(() => "");
        logApprovalFailure("application status lookup failed", {
          applicationId,
          httpStatus: applicationResponse.status,
          responseBody,
        });
      } else {
        const applicationRows = (await applicationResponse.json()) as ApplicationStatusRow[];
        const applicationRow = applicationRows[0];
        const status = applicationRow?.status?.toLowerCase();

        if (!applicationRow) {
          logApprovalFailure("application status lookup returned no row", { applicationId });
          outcome = "error";
        } else if (!status || !APPROVABLE_STATUSES.has(status)) {
          logApprovalFailure("application is not eligible for approval", {
            applicationId,
            status: applicationRow.status,
          });
          outcome = "not_eligible";
        } else {
          const approvalResponse = await fetch(`${restUrl}/rpc/core_approve_application`, {
            method: "POST",
            headers: serverHeaders(serviceRoleKey),
            body: JSON.stringify({
              p_application_id: applicationId,
              p_actor_profile_id: actorProfileId,
              p_decision_notes: decisionNotes || null,
              p_queue_notification: false,
            }),
            cache: "no-store",
          });

          if (approvalResponse.ok) {
            revalidatePath("/");
            outcome = "success";
          } else {
            const responseBody = await approvalResponse.text().catch(() => "");
            logApprovalFailure("approval RPC failed", {
              applicationId,
              httpStatus: approvalResponse.status,
              responseBody,
            });
          }
        }
      }
    } catch (error) {
      logApprovalFailure("approval action threw an error", {
        applicationId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      outcome = "error";
    }
  }

  redirect(`/?approval=${outcome}`);
}
