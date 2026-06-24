"use server";

import { redirect } from "next/navigation";
import { createSupabaseAuthServerClient } from "@/lib/supabase-auth-server";
import { sanitizeRedirectPath } from "@/lib/supabase-auth-config";

export type LoginFormState = {
  error?: string;
  email?: string;
};

export async function signInWithPasswordAction(
  _state: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const nextPath = sanitizeRedirectPath(formData.get("next"));

  if (!email || !password) {
    return {
      email,
      error: "Enter both email and password.",
    };
  }

  const supabase = await createSupabaseAuthServerClient();

  if (!supabase) {
    return {
      email,
      error: "Supabase Auth is not configured yet.",
    };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      email,
      error: "Invalid email or password.",
    };
  }

  redirect(nextPath);
}
