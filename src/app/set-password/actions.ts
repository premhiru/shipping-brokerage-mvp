"use server";

import { redirect } from "next/navigation";
import { createSupabaseAuthServerClient } from "@/lib/supabase-auth-server";

export type SetPasswordFormState = {
  error?: string;
};

export async function setPasswordAction(
  _state: SetPasswordFormState,
  formData: FormData,
): Promise<SetPasswordFormState> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const supabase = await createSupabaseAuthServerClient();

  if (!supabase) {
    return { error: "Supabase Auth is not configured yet." };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message || "Unable to set password." };
  }

  redirect("/dashboard");
}
