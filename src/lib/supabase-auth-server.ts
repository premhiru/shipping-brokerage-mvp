import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getSupabaseAuthConfig, sanitizeRedirectPath } from "@/lib/supabase-auth-config";

export async function createSupabaseAuthServerClient() {
  const { supabaseUrl, supabaseAuthKey } = getSupabaseAuthConfig();

  if (!supabaseUrl || !supabaseAuthKey) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAuthKey, {
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
          // Server Components cannot always write cookies; Proxy refreshes them.
        }
      },
    },
  });
}

export const getCurrentUser = cache(async () => {
  const supabase = await createSupabaseAuthServerClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser();

  if (error) {
    return null;
  }

  return data.user;
});

export async function requireCurrentUser(nextPath?: string) {
  const user = await getCurrentUser();

  if (!user) {
    const loginUrl = nextPath ? `/login?next=${encodeURIComponent(sanitizeRedirectPath(nextPath))}` : "/login";
    redirect(loginUrl);
  }

  return user;
}
