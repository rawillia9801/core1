import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function cleanUrl(value: string) {
  return value.trim().replace(/\/$/, "");
}

function isHostedSupabaseUrl(value: string | undefined) {
  if (!value) return false;

  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.toLowerCase();

    return (
      parsed.protocol === "https:" &&
      hostname.endsWith(".supabase.co") &&
      hostname !== "localhost" &&
      hostname !== "127.0.0.1" &&
      hostname !== "0.0.0.0"
    );
  } catch {
    return false;
  }
}

function getHostedSupabaseUrl() {
  const candidates = [
    process.env.SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  ];

  const hostedUrl = candidates.find(isHostedSupabaseUrl);

  if (!hostedUrl) {
    throw new Error("Hosted Supabase URL is not configured. Set SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL to the hosted project URL.");
  }

  return cleanUrl(hostedUrl);
}

function getSupabaseAuthConfig() {
  const supabaseUrl = getHostedSupabaseUrl();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured.");
  }

  return { supabaseUrl, anonKey };
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
