"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const APPROVABLE_STATUSES = new Set(["received", "needs_review"]);
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ApplicationStatusRow = {
  status: string | null;
};

function getLocalApprovalConfig() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Approval actions are disabled outside local/development use.");
  }

  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const actorProfileId = process.env.CORE_APPROVAL_ACTOR_PROFILE_ID;

  if (!supabaseUrl || !serviceRoleKey || !actorProfileId || !UUID_PATTERN.test(actorProfileId)) {
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

  if (UUID_PATTERN.test(applicationId)) {
    try {
      const { restUrl, serviceRoleKey, actorProfileId } = getLocalApprovalConfig();
      const applicationResponse = await fetch(
        `${restUrl}/core_applications?select=status&id=eq.${applicationId}`,
        {
          headers: serverHeaders(serviceRoleKey),
          cache: "no-store",
        },
      );

      if (applicationResponse.ok) {
        const applicationRows = (await applicationResponse.json()) as ApplicationStatusRow[];
        const status = applicationRows[0]?.status?.toLowerCase();

        if (!status || !APPROVABLE_STATUSES.has(status)) {
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
          }
        }
      }
    } catch {
      outcome = "error";
    }
  }

  redirect(`/?approval=${outcome}`);
}
