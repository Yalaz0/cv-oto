"use client";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
// Session cookies are HttpOnly. The browser never authenticates directly with
// Supabase; all user operations use same-origin server actions/routes.
// This unauthenticated client is only for explicitly public Supabase resources.
export function createPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Public configuration missing");
  return createSupabaseClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
