type IntakeSuccess = {
  ok: true;
  result: unknown;
};

type IntakeFailure = {
  ok: false;
  error: string;
};

const INTAKE_SECRET_HEADER = "x-core-intake-secret";

function jsonResponse(body: IntakeSuccess | IntakeFailure, status: number) {
  return Response.json(body, { status });
}

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value;
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim();
}

function getProvidedSecret(request: Request) {
  return request.headers.get(INTAKE_SECRET_HEADER) ?? getBearerToken(request);
}

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const expectedSecret = getRequiredEnv("CORE_INTAKE_SECRET");
    const providedSecret = getProvidedSecret(request);

    if (!providedSecret || providedSecret !== expectedSecret) {
      return jsonResponse({ ok: false, error: "Unauthorized intake request" }, 401);
    }

    const supabaseUrl = getRequiredEnv("SUPABASE_URL").replace(/\/$/, "");
    const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const actorProfileId = process.env.CORE_INTAKE_ACTOR_PROFILE_ID || null;

    const payload = (await request.json()) as unknown;

    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return jsonResponse({ ok: false, error: "Request body must be a JSON object" }, 400);
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/core_ingest_zoho_application`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        p_payload: payload,
        p_actor_profile_id: actorProfileId,
      }),
    });

    const result = (await response.json().catch(() => null)) as unknown;

    if (!response.ok) {
      return jsonResponse(
        {
          ok: false,
          error: "Core application intake failed",
        },
        response.status,
      );
    }

    return jsonResponse({ ok: true, result }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown intake error";

    return jsonResponse({ ok: false, error: message }, 500);
  }
}

export function GET() {
  return jsonResponse(
    {
      ok: false,
      error: "Use POST with a guarded Zoho application payload. This endpoint does not expose application data.",
    },
    405,
  );
}
