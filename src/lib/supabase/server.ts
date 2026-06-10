import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function assertHostedSupabaseUrl(rawUrl: string) {
  let parsed: URL;

  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Supabase Auth URL is invalid.");
  }

  const hostname = parsed.hostname.toLowerCase();
  const isLocalSupabase =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname.endsWith(".local");

  if (isLocalSupabase) {
    throw new Error("Local Supabase is not allowed for this Core environment. Use the hosted Supabase project URL.");
  }

  return rawUrl.replace(/\/$/, "");
}

function getSupabaseAuthConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error("Supabase Auth environment variables are not configured.");
  }

  return { supabaseUrl: assertHostedSupabaseUrl(supabaseUrl), anonKey };
}

export async function createSupabaseServerClient() {
  const { supabaseUrl, anonKey } = getSupabaseAuthConfig();
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot set cookies. Server Actions and Route Handlers can.
        }
      },
    },
  });
}
