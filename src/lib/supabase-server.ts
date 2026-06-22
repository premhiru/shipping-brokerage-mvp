import { createClient } from "@supabase/supabase-js";

export function getSupabaseServerConfig() {
  return {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseSecretKey: process.env.SUPABASE_SECRET_KEY,
  };
}

export function createSupabaseServerClient() {
  const { supabaseUrl, supabaseSecretKey } = getSupabaseServerConfig();

  if (!supabaseUrl || !supabaseSecretKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseSecretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}
